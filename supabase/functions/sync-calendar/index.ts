import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") || "https://reflector-osmol.vercel.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// Google Calendar event schema - handles both timed (dateTime) and all-day (date) events
interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

// Helper function to return JSON responses with consistent formatting
function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // 1. Extract and validate Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // 2. Parse request body with error handling
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (parseError) {
      return jsonResponse({ error: "Invalid JSON in request body" }, 400);
    }

    const { dateMin, dateMax } = body;

    if (!dateMin || !dateMax) {
      return jsonResponse(
        { error: "Missing required fields: dateMin and dateMax" },
        400
      );
    }

    // 3. Validate that dateMin and dateMax are ISO 8601 strings
    if (typeof dateMin !== "string" || typeof dateMax !== "string") {
      return jsonResponse(
        { error: "dateMin and dateMax must be ISO 8601 strings" },
        400
      );
    }

    // 4. Create Supabase client and authenticate user
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing Supabase environment variables");
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Extract token from Authorization header (Bearer token)
    const token = authHeader.replace("Bearer ", "");

    // Get current user from token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Supabase auth error - status:", authError?.status);
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // 5. Get Google access token from user metadata
    const googleAccessToken = user.user_metadata?.google_access_token;
    if (!googleAccessToken) {
      return jsonResponse(
        { error: "Google Calendar not connected. Please authorize first." },
        401
      );
    }

    // 6. Fetch events from Google Calendar API
    const googleCalendarUrl = new URL(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    );
    googleCalendarUrl.searchParams.append("timeMin", dateMin);
    googleCalendarUrl.searchParams.append("timeMax", dateMax);

    const googleResponse = await fetch(googleCalendarUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${googleAccessToken}`,
      },
    });

    // Handle token expiration
    if (googleResponse.status === 401) {
      return jsonResponse(
        { error: "Token expired, please reconnect" },
        401
      );
    }

    if (!googleResponse.ok) {
      console.error("Google Calendar API error - status:", googleResponse.status);
      return jsonResponse(
        { error: `Google Calendar API error: ${googleResponse.status}` },
        500
      );
    }

    const calendarData = await googleResponse.json();
    const events: GoogleCalendarEvent[] = calendarData.items || [];

    // 7. Transform and upsert events - filter out malformed events
    const now = new Date().toISOString();
    const eventsToUpsert = events
      .map((event: GoogleCalendarEvent) => {
        // Validate event has required start/end times
        if (!event.start || (!event.start.dateTime && !event.start.date)) {
          console.warn("Skipping malformed event:", event.id);
          return null;
        }
        if (!event.end || (!event.end.dateTime && !event.end.date)) {
          console.warn("Skipping malformed event:", event.id);
          return null;
        }

        return {
          user_id: user.id,
          gcp_event_id: event.id,
          title: event.summary,
          description: event.description || null,
          start_time: event.start.dateTime || event.start.date,
          end_time: event.end.dateTime || event.end.date,
          calendar_id: "primary",
          synced_at: now,
        };
      })
      .filter(Boolean);

    if (eventsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("calendar_events")
        .upsert(eventsToUpsert, {
          onConflict: "gcp_event_id",
        });

      if (upsertError) {
        console.error("Supabase upsert error - status:", upsertError.status);
        return jsonResponse(
          { error: "Failed to sync calendar events" },
          500
        );
      }
    }

    // 8. Return success response
    return jsonResponse(
      {
        success: true,
        synced_count: eventsToUpsert.length,
        message: `Synced ${eventsToUpsert.length} calendar events`,
      },
      200
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync calendar error:", errorMessage);
    return jsonResponse({ error: errorMessage }, 500);
  }
});
