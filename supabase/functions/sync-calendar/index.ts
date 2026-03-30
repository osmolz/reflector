import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // 1. Extract and validate Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Parse request body
    const body = await req.json();
    const { dateMin, dateMax } = body;

    if (!dateMin || !dateMax) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: dateMin and dateMax",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Create Supabase client and authenticate user
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Get Google access token from user metadata
    const googleAccessToken = user.user_metadata?.google_access_token;
    if (!googleAccessToken) {
      return new Response(
        JSON.stringify({
          error:
            "Google Calendar not connected. Please authorize first.",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Fetch events from Google Calendar API
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
      return new Response(
        JSON.stringify({
          error: "Token expired, please reconnect",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!googleResponse.ok) {
      const errorData = await googleResponse.text();
      console.error(
        "Google Calendar API error:",
        googleResponse.status,
        errorData
      );
      return new Response(
        JSON.stringify({
          error: `Google Calendar API error: ${googleResponse.status}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const calendarData = await googleResponse.json();
    const events = calendarData.items || [];

    // 6. Transform and upsert events
    const now = new Date().toISOString();
    const eventsToUpsert = events.map((event: any) => ({
      user_id: user.id,
      gcp_event_id: event.id,
      title: event.summary,
      description: event.description || null,
      start_time: event.start.dateTime || event.start.date,
      end_time: event.end.dateTime || event.end.date,
      calendar_id: "primary",
      synced_at: now,
    }));

    if (eventsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("calendar_events")
        .upsert(eventsToUpsert, {
          onConflict: "gcp_event_id",
        });

      if (upsertError) {
        console.error("Supabase upsert error:", upsertError);
        return new Response(
          JSON.stringify({
            error: "Failed to sync calendar events",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 7. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        synced_count: eventsToUpsert.length,
        message: `Synced ${eventsToUpsert.length} calendar events`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Sync calendar error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
