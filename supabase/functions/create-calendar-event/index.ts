import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") || "https://reflector-osmol.vercel.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// Request body interface for type safety
interface CreateEventRequest {
  title: string;
  start_time: string;
  end_time: string;
  time_entry_id?: string;
}

// Google Calendar event response schema
interface GoogleCalendarEventResponse {
  id: string;
  summary: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

// Helper function to return JSON responses with consistent formatting
function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Helper function to validate ISO 8601 datetime string
function isValidIso8601(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString === date.toISOString();
  } catch {
    return false;
  }
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
    } catch {
      return jsonResponse({ error: "Invalid JSON in request body" }, 400);
    }

    const { title, start_time, end_time } = body as CreateEventRequest;

    // 3. Validate required fields
    if (!title || !start_time || !end_time) {
      return jsonResponse(
        { error: "Missing required fields: title, start_time, and end_time" },
        400
      );
    }

    // 4. Validate field types
    if (typeof title !== "string") {
      return jsonResponse({ error: "title must be a string" }, 400);
    }

    if (typeof start_time !== "string" || typeof end_time !== "string") {
      return jsonResponse(
        { error: "start_time and end_time must be ISO 8601 strings" },
        400
      );
    }

    // 5. Validate ISO 8601 format
    if (!isValidIso8601(start_time)) {
      return jsonResponse({ error: "start_time must be a valid ISO 8601 string" }, 400);
    }

    if (!isValidIso8601(end_time)) {
      return jsonResponse({ error: "end_time must be a valid ISO 8601 string" }, 400);
    }

    // 6. Create Supabase client and authenticate user
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

    // 7. Get Google access token from user metadata
    const googleAccessToken = user.user_metadata?.google_access_token;
    if (!googleAccessToken) {
      return jsonResponse(
        { error: "Google Calendar not connected" },
        401
      );
    }

    // 8. Create event on Google Calendar API
    const googleEventPayload = {
      summary: title,
      start: { dateTime: start_time },
      end: { dateTime: end_time },
    };

    const googleResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEventPayload),
      }
    );

    // Handle token expiration
    if (googleResponse.status === 401) {
      return jsonResponse(
        { error: "Token expired, please reconnect" },
        401
      );
    }

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error("Google Calendar API error - status:", googleResponse.status, "body:", errorText);
      return jsonResponse(
        { error: `Google Calendar API error: ${googleResponse.status}` },
        500
      );
    }

    const googleEvent: GoogleCalendarEventResponse = await googleResponse.json();
    const gcpEventId = googleEvent.id;

    if (!gcpEventId) {
      console.error("Google Calendar response missing event ID");
      return jsonResponse(
        { error: "Failed to create calendar event" },
        500
      );
    }

    // 9. Store reference locally in calendar_events table
    const now = new Date().toISOString();
    const { error: insertError } = await supabase
      .from("calendar_events")
      .upsert(
        {
          user_id: user.id,
          gcp_event_id: gcpEventId,
          title,
          start_time,
          end_time,
          calendar_id: "primary",
          synced_at: now,
        },
        {
          onConflict: "gcp_event_id",
        }
      );

    if (insertError) {
      console.error("Supabase insert error - status:", insertError.status);
      return jsonResponse(
        { error: "Failed to store calendar event reference" },
        500
      );
    }

    // 10. Return success response
    return jsonResponse(
      {
        success: true,
        event_id: gcpEventId,
        message: "Event created successfully",
      },
      200
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Create calendar event error:", errorMessage);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
