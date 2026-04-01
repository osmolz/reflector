import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.80.0';
import { parseTranscriptToActivities } from '../_shared/parse-transcript-activities.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

interface ParseRequest {
  transcript: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const { transcript } = (await req.json()) as ParseRequest;

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Transcript must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      const decoded = JSON.parse(atob(parts[1]));
      if (!decoded.sub) {
        throw new Error('No user_id in token');
      }
    } catch (e) {
      console.error('Token decode error:', e);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured. Please set up environment variables.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropic = new Anthropic({
      apiKey,
    });

    const activities = await parseTranscriptToActivities(anthropic, transcript);

    return new Response(
      JSON.stringify({
        activities,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Parse API] Error:', error);

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

    const msg = error.message || '';

    if (msg.includes('PARSE_OUTPUT_INVALID')) {
      return new Response(
        JSON.stringify({
          error:
            'Could not turn that transcript into activities. Try editing the text in Type mode or a shorter check-in.',
          error_code: 'PARSE_OUTPUT_INVALID',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (msg.includes('Claude did not return valid JSON')) {
      return new Response(
        JSON.stringify({
          error:
            'Could not turn that transcript into activities. Try editing the text in Type mode or a shorter check-in.',
          error_code: 'PARSE_OUTPUT_INVALID',
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
