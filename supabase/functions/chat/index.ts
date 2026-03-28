import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  question: string;
  dateRange?: { days: number };
}

interface TimeEntry {
  id: string;
  user_id: string;
  activity_name: string;
  category: string;
  duration_minutes: number;
  start_time: string;
  check_in_id: string | null;
  created_at: string;
  updated_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { question, dateRange } = (await req.json()) as ChatRequest;

    if (!question || typeof question !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Question must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (question.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Question is too long (max 500 characters)' }),
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

    // Create Supabase client with service role (for server-side queries)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's time_entries for the date range
    // Default: last 30 days
    const days = dateRange?.days || 30;
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const { data: timeEntries, error: dbError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true }) as any;

    if (dbError) {
      console.error('[Chat API] Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch time entries' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle no time entries
    if (!timeEntries || timeEntries.length === 0) {
      const message =
        'No time entries found for the requested period. Start logging activities to enable analytics.';
      return new Response(
        JSON.stringify({
          question,
          response: message,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format time_entries for Claude context
    const formattedEntries = (timeEntries as TimeEntry[])
      .map(
        (entry) =>
          `${entry.activity_name} (${entry.duration_minutes} min, ${entry.category || 'uncategorized'}) at ${new Date(entry.start_time).toLocaleString()}`
      )
      .join('\n');

    const context = `
User's time entries for the last ${days} days:
${formattedEntries}

Please answer the user's question based on this data. Be specific with numbers, categories, and insights.
`.trim();

    // Call Claude API
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('VITE_ANTHROPIC_API_KEY'),
    });

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${context}\n\nUser's question: ${question}`,
        },
      ],
    });

    // Extract response text with validation
    let responseText = '';
    if (message.content && message.content.length > 0 && message.content[0].type === 'text') {
      responseText = message.content[0].text;
    } else {
      responseText = 'Claude returned an unexpected response. Please try again.';
    }

    // Validate response is not empty
    if (!responseText || responseText.trim().length === 0) {
      responseText = 'Claude could not generate a response. Please try again with a different question.';
    }

    // Save question + response to chat_messages table
    const { error: saveError } = await supabase.from('chat_messages').insert([
      {
        user_id: user.id,
        question,
        response: responseText,
        created_at: new Date().toISOString(),
      },
    ]);

    if (saveError) {
      console.error('[Chat API] Error saving chat message:', saveError);
      // Don't fail the response; message was generated even if save failed
    }

    return new Response(
      JSON.stringify({
        question,
        response: responseText,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Chat API] Error:', error);

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

    return new Response(
      JSON.stringify({
        error: 'Failed to process question',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
