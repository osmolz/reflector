import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.80.0'

import { classifyIntent } from './intent-classifier.ts'
import { TOOL_DEFINITIONS, executeTool } from './tools.ts'
import { buildSystemPrompt } from './system-prompt.ts'
import { loadConversationContext, saveMessage, maybeSetSessionTitle, createSession } from './memory.ts'
import type { SSEEvent } from './types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // [1] Auth: Validate JWT via getClaims
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    )

    // Verify token and extract user ID
    const { data, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !data || !data.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = data.claims.sub
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // [2] Parse request body
    const { message, sessionId: providedSessionId } = (await req.json()) as {
      message: string
      sessionId?: string
    }

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create session if not provided
    let sessionId = providedSessionId
    if (!sessionId) {
      sessionId = await createSession(supabase, userId)
    }

    // [3] Classify intent (fast-path check)
    const intent = classifyIntent(message)

    if (intent) {
      // FAST-PATH: Execute tool directly, return synchronous response
      const toolResult = await executeTool(supabase, userId, intent.handler, intent.params || {})

      // Fire-and-forget: save user message in background
      saveMessage(supabase, userId, 'user', message, sessionId)

      // Build assistant response
      const responseContent =
        toolResult.status === 'ok'
          ? JSON.stringify(toolResult.data)
          : toolResult.message || 'Unable to retrieve data'

      // Fire-and-forget: save assistant message in background
      saveMessage(supabase, userId, 'assistant', responseContent, sessionId)
      maybeSetSessionTitle(supabase, sessionId, message)

      return new Response(
        JSON.stringify({
          type: 'fast_path',
          result: toolResult,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // [4] If not fast-path, prepare for full LLM loop (defer to Part 2)
    // For now, return a placeholder
    return new Response(
      JSON.stringify({
        type: 'full_loop',
        message: 'Full LLM loop coming in Part 2',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('[chat] Error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
