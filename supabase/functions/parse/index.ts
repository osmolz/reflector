import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParseRequest {
  transcript: string;
}

interface Activity {
  activity: string;
  duration_minutes: number;
  start_time_inferred: string;
  category?: string;
  notes?: string;
}

const PARSE_PROMPT = `You are a helpful assistant that parses stream-of-consciousness speech about daily activities into a structured time-based log.

Given a transcript of someone describing their day, extract:
1. Each distinct activity mentioned
2. The estimated duration of each activity in minutes
3. The inferred start time (based on context clues like "I woke up at 7" or "then I...")
4. The activity category if clear (e.g., work, personal, exercise, food, etc.)

Return ONLY a valid JSON array. Do not include any text before or after the JSON.
Use this format exactly:
[
  {
    "activity": "activity name",
    "duration_minutes": <number>,
    "start_time_inferred": "HH:MM AM/PM",
    "category": "category name (optional)",
    "notes": "any ambiguities or uncertainties (optional)"
  }
]

Rules:
- If a time is mentioned explicitly (e.g., "at 7:30"), use that.
- If only relative times are given (e.g., "then I..."), infer from context.
- If duration is not explicit but implied, estimate reasonably.
- If an activity is ambiguous or split, create separate entries.
- Preserve the chronological order from the transcript.
- Always return valid JSON, even if uncertain. Use "notes" field to flag uncertainty.`;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { transcript } = (await req.json()) as ParseRequest;

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Transcript must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract Bearer token
    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with service role (for server-side verification)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Verify token and get user (to ensure authentication)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Claude API for parsing
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    });

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${PARSE_PROMPT}\n\nTranscript:\n${transcript}`,
        },
      ],
    });

    // Extract the text response
    const responseText = message.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');

    // Parse JSON from response
    let parsed: Activity[];
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      // Try to extract JSON from response (in case Claude adds extra text)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Claude did not return valid JSON.');
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    // Validate structure
    if (!Array.isArray(parsed)) {
      throw new Error('Expected an array of activities.');
    }

    for (const activity of parsed) {
      if (!activity.activity || typeof activity.duration_minutes !== 'number') {
        throw new Error('Invalid activity structure: missing required fields.');
      }
    }

    return new Response(
      JSON.stringify({
        activities: parsed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Parse API] Error:', error);

    // Handle Claude API errors specifically
    if (error.status === 429) {
      return new Response(
        JSON.stringify({
          error: 'API rate limit exceeded. Please try again in a moment.',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (error.status === 401) {
      return new Response(
        JSON.stringify({
          error: 'Claude API key invalid. Check your credentials.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (error.message && error.message.includes('Claude did not return valid JSON')) {
      return new Response(
        JSON.stringify({
          error: 'Claude parsing failed. Please try speaking more clearly.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: `Parsing failed: ${error.message || 'Unknown error'}`,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
