import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

interface ChatRequest {
  question: string;
  sessionId?: string;
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

// UTF-8 safe string truncation (truncates to max bytes, not characters)
function truncateUtf8(str: string, maxBytes: number): string {
  const encoded = new TextEncoder().encode(str);
  if (encoded.length <= maxBytes) return str;
  const truncated = encoded.slice(0, maxBytes);
  return new TextDecoder('utf-8', { fatal: false }).decode(truncated) + '…';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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
    // Parse request body
    const { question, sessionId, dateRange } = (await req.json()) as ChatRequest;

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

    // Load conversation context if session_id provided
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (sessionId) {
      const { data: messages, error: contextError } = await supabase
        .from('chat_messages')
        .select('role, content, question, response')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (!contextError && messages && messages.length > 0) {
        conversationHistory = messages.map((msg: any) => ({
          role: (msg.role as 'user' | 'assistant') || (msg.question ? 'user' : 'assistant'),
          content: msg.content || msg.question || msg.response || '',
        }));
      }

      // Auto-set session title if null (use first 60 bytes of question)
      const { data: sessionData } = await supabase
        .from('chat_sessions')
        .select('title')
        .eq('id', sessionId)
        .single();

      if (sessionData && !sessionData.title) {
        const title = truncateUtf8(question, 60);
        supabase
          .from('chat_sessions')
          .update({ title })
          .eq('id', sessionId)
          .catch((err: any) => console.error('[Chat API] Error setting title:', err));
      }

      // Save user message before calling Claude
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        session_id: sessionId,
        role: 'user',
        content: question,
        question,
        response: null,
        created_at: new Date().toISOString(),
      });
    }

    // Call Claude API
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

    // Helper function to remove markdown artifacts
    const removeMarkdownArtifacts = (text: string): string => {
      const lines = text.split('\n');
      const cleaned = lines
        .filter((line) => {
          // Remove lines that are pure markdown structures
          const trimmed = line.trim();
          if (trimmed.startsWith('**') || trimmed.startsWith('__')) return false;
          if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) return false;
          if (trimmed.startsWith('|')) return false;
          return true;
        })
        .join('\n')
        .trim();
      return cleaned;
    };

    // Create a streaming response using Server-Sent Events (true pass-through streaming)
    const encoder = new TextEncoder();

    try {
      // Build messages array: conversation history + new question
      const messages = [
        ...conversationHistory,
        { role: 'user' as const, content: `${context}\n\nUser's question: ${question}` },
      ];

      // Start the stream and forward chunks immediately (no buffering)
      const stream = await anthropic.messages.stream({
        model: 'claude-opus-4-6',
        max_tokens: 512,
        system: `You are a candid, direct executive coach reviewing someone's time tracking data.

Your tone is warm but honest. You speak with insight and without flattery. When you see patterns in the data, name them directly.

Output format:
- Write in plain prose only. No bullet points, numbered lists, headers, bold text, italics, code blocks, or any markdown whatsoever.
- Keep responses to 1-2 paragraphs maximum.
- Be specific about numbers, durations, and categories from the data.
- End with one clear, actionable observation or question that prompts self-reflection.
- Never use the phrase "based on your data" or similar formal language. Speak as you would to a colleague.
- If something looks like wasted time, say so directly but with curiosity, not judgment.

Remember: this is a conversation with someone who wants to understand themselves better through their own time data. Be their thinking partner.`,
        messages: messages as any,
      });

      // Create ReadableStream that forwards chunks as they arrive
      const readable = new ReadableStream({
        async start(controller) {
          try {
            let fullResponse = '';

            // Forward chunks immediately as they arrive
            for await (const event of stream) {
              if (
                event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta'
              ) {
                const chunk = event.delta.text;
                fullResponse += chunk;

                const sseEvent = {
                  type: 'content_block_delta',
                  delta: {
                    type: 'text_delta',
                    text: chunk,
                  },
                };

                const data = `data: ${JSON.stringify(sseEvent)}\n\n`;
                controller.enqueue(encoder.encode(data));

                // Small delay between chunks to prevent network buffering all at once
                // This allows the client to receive chunks in separate packets for smooth streaming
                await new Promise(resolve => setTimeout(resolve, 5));
              }
            }

            // Emit completion event
            const completionEvent = { type: 'message_stop' };
            const finalData = `data: ${JSON.stringify(completionEvent)}\n\n`;
            controller.enqueue(encoder.encode(finalData));

            controller.close();

            // Clean markdown artifacts from full response
            const cleanedResponse = removeMarkdownArtifacts(fullResponse);

            // Validate response is not empty
            let finalResponse = cleanedResponse;
            if (!finalResponse || finalResponse.trim().length === 0) {
              finalResponse =
                'Claude could not generate a response. Please try again with a different question.';
            }

            // Save assistant message (fire and forget)
            if (sessionId) {
              supabase
                .from('chat_messages')
                .insert({
                  user_id: user.id,
                  session_id: sessionId,
                  role: 'assistant',
                  content: finalResponse,
                  question: null,
                  response: finalResponse,
                  created_at: new Date().toISOString(),
                })
                .catch((saveError: any) => {
                  console.error('[Chat API] Error saving assistant message:', saveError);
                });
            } else {
              // Backward compat: save without session_id
              supabase
                .from('chat_messages')
                .insert({
                  user_id: user.id,
                  question,
                  response: finalResponse,
                  created_at: new Date().toISOString(),
                })
                .catch((saveError: any) => {
                  console.error('[Chat API] Error saving chat message:', saveError);
                });
            }
          } catch (streamError: any) {
            console.error('[Chat API] Stream error:', streamError);
            controller.close();
          }
        },
      });

      return new Response(readable, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (streamCreationError: any) {
      console.error('[Chat API] Failed to create stream:', streamCreationError);
      return new Response(
        JSON.stringify({
          error: 'Failed to process question',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
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
