import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.80.0'

import { classifyIntent } from './intent-classifier.ts'
import { TOOL_DEFINITIONS, executeTool } from './tools.ts'
import { buildSystemPrompt } from './system-prompt.ts'
import { stripMarkdownArtifacts, stripMarkdownStreamDelta } from './markdown.ts'
import { extractFirstSentence } from './thinking-summary.ts'
import { loadConversationContext, saveMessage, maybeSetSessionTitle, createSession } from './memory.ts'
import type { ParsedTimelineActivity, SSEEvent } from './types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Default = prior behavior (Balanced / Opus). Client may request Fast (Haiku). */
const DEFAULT_CHAT_MODEL = 'claude-opus-4-6'
const ALLOWED_CHAT_MODELS = new Set<string>(['claude-opus-4-6', 'claude-haiku-4-5-20251001'])
/** Extended thinking is not supported on Haiku; omit `thinking` for those models. */
const EXTENDED_THINKING_MODELS = new Set<string>(['claude-opus-4-6'])

function resolveChatModel(requested: unknown): string {
  if (typeof requested === 'string' && ALLOWED_CHAT_MODELS.has(requested)) {
    return requested
  }
  return DEFAULT_CHAT_MODEL
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
    // [1] Auth: validate user JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    )

    // Validate JWT via Auth API (more reliable in Deno than getClaims + JWKS alone)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)
    if (userError || !user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = user.id

    // [2] Parse request body
    const {
      message,
      sessionId: providedSessionId,
      model: requestedModel,
      clientNowIso,
      clientTimeZone,
    } = (await req.json()) as {
      message: string
      sessionId?: string
      model?: string
      clientNowIso?: string
      clientTimeZone?: string
    }

    const resolvedChatModel = resolveChatModel(requestedModel)
    const useExtendedThinking = EXTENDED_THINKING_MODELS.has(resolvedChatModel)

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

      // Save user message
      await saveMessage(supabase, userId, 'user', message, sessionId)

      // Build assistant response
      const responseContent =
        toolResult.status === 'ok'
          ? JSON.stringify(toolResult.data)
          : toolResult.message || 'Unable to retrieve data'

      // Save assistant message
      await saveMessage(supabase, userId, 'assistant', responseContent, sessionId)
      await maybeSetSessionTitle(supabase, sessionId, message)

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

    // [4] Load context and prepare for full LLM loop
    const { messages: contextMessages, userMemory, todayTimeEntries } = await loadConversationContext(supabase, userId, sessionId)

    // Save user message
    await saveMessage(supabase, userId, 'user', message, sessionId)

    const encoder = new TextEncoder()

    // Shared with ReadableStream.cancel when the client disconnects (e.g. switches away from Chat).
    const streamAccum = { finalText: '', fullThinking: '' }
    let assistantPersistDone = false
    let assistantSavePromise: Promise<void> | null = null

    async function persistAssistantReplyIfNeeded(): Promise<void> {
      if (assistantPersistDone) return
      if (!assistantSavePromise) {
        assistantSavePromise = (async () => {
          try {
            const persistedText = streamAccum.finalText ? stripMarkdownArtifacts(streamAccum.finalText) : ''
            const textToSave = persistedText || (streamAccum.finalText ? streamAccum.finalText.trim() : '')
            if (!textToSave) return
            const thinkingSummary = extractFirstSentence(streamAccum.fullThinking)
            await saveMessage(
              supabase,
              userId,
              'assistant',
              textToSave,
              sessionId,
              thinkingSummary || null,
            )
            await maybeSetSessionTitle(supabase, sessionId, message)
            assistantPersistDone = true
          } finally {
            assistantSavePromise = null
          }
        })()
      }
      await assistantSavePromise
    }

    function schedulePersistOnClientDisconnect(): void {
      const p = persistAssistantReplyIfNeeded()
      const edge = (globalThis as { EdgeRuntime?: { waitUntil: (q: Promise<unknown>) => void } }).EdgeRuntime
      if (edge?.waitUntil) {
        edge.waitUntil(p)
      } else {
        void p.catch((err) => console.error('[chat] Disconnect persistence failed:', err))
      }
    }

    // Create SSE stream response
    const readable = new ReadableStream({
      async start(controller) {
        function emit(event: SSEEvent) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }

        try {
          emit({ type: 'status', status: 'thinking' })

          const systemPrompt = buildSystemPrompt(
            userMemory,
            todayTimeEntries,
            clientNowIso,
            clientTimeZone,
          )
          const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

          let maxHops = 5
          let currentMessages = [...contextMessages, { role: 'user' as const, content: message }]

          // Set 55-second timeout (Vercel limit is 60s)
          const timeoutPromise = new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Stream timeout after 55 seconds')), 55000)
          )

          try {
            await Promise.race([
              (async () => {
                while (maxHops > 0) {
                  emit({ type: 'status', status: 'thinking' })

                  // Call Claude with streaming
                  const streamParams: Record<string, unknown> = {
                    model: resolvedChatModel,
                    max_tokens: 4096,
                    system: systemPrompt,
                    tools: TOOL_DEFINITIONS as any,
                    messages: currentMessages as any,
                  }
                  if (useExtendedThinking) {
                    streamParams.thinking = { type: 'enabled', budget_tokens: 2048 }
                  }
                  const stream = await anthropic.messages.stream(streamParams as any)

                  // Attach listeners BEFORE awaiting
                  stream.on('thinking', (delta: string) => {
                    streamAccum.fullThinking += delta
                    emit({ type: 'thinking', text: delta })
                  })

                  stream.on('text', (delta: string) => {
                    const cleaned = stripMarkdownStreamDelta(delta)
                    streamAccum.finalText += cleaned
                    emit({ type: 'text', text: cleaned })
                  })

                  // Wait for stream to complete
                  const response = await stream.finalMessage()

                  // Check if done reasoning
                  if (response.stop_reason === 'end_turn') {
                    break
                  }

                  // Process tool calls
                  const toolUseBlocks = response.content.filter((b: any) => b.type === 'tool_use')

                  // Execute tools in parallel with error handling
                  const toolResults = await Promise.all(
                    toolUseBlocks.map(async (block: any) => {
                      try {
                        const result = await executeTool(supabase, userId, block.name, block.input as Record<string, unknown>)

                        return {
                          type: 'tool_result',
                          tool_use_id: block.id,
                          content: JSON.stringify(result),
                        }
                      } catch (toolError) {
                        console.error(`[chat] Tool ${block.name} failed:`, toolError)

                        return {
                          type: 'tool_result',
                          tool_use_id: block.id,
                          content: JSON.stringify({
                            status: 'error',
                            message: `Tool execution failed: ${toolError instanceof Error ? toolError.message : String(toolError)}`,
                          }),
                        }
                      }
                    })
                  )

                  for (let i = 0; i < toolUseBlocks.length; i++) {
                    const block = toolUseBlocks[i]
                    const tr = toolResults[i]
                    if (tr.type !== 'tool_result') continue
                    let parsed: unknown
                    try {
                      parsed = JSON.parse(tr.content)
                    } catch {
                      continue
                    }
                    if (
                      typeof parsed !== 'object' ||
                      parsed === null ||
                      (parsed as { status?: string }).status !== 'ok'
                    ) {
                      continue
                    }
                    if (block.name !== 'preview_timeline_from_text') continue
                    const data = (parsed as { data?: { activities?: unknown } }).data
                    if (!data || !Array.isArray(data.activities) || data.activities.length === 0) {
                      continue
                    }
                    emit({
                      type: 'timeline_preview_pending',
                      source_text: typeof block.input?.text === 'string' ? block.input.text : '',
                      activities: data.activities as ParsedTimelineActivity[],
                    })
                  }

                  // Append to conversation and continue loop
                  currentMessages = [
                    ...currentMessages,
                    { role: 'assistant' as const, content: response.content as any },
                    { role: 'user' as const, content: toolResults as any },
                  ]

                  maxHops--
                }
              })(),
              timeoutPromise,
            ])
          } catch (timeoutErr) {
            if (timeoutErr instanceof Error && timeoutErr.message.includes('timeout')) {
              // Partial reply already streamed; no meta message to the user.
            } else {
              throw timeoutErr
            }
          }

          await persistAssistantReplyIfNeeded()

          const thinkingSummary = extractFirstSentence(streamAccum.fullThinking)
          emit({
            type: 'done',
            ...(thinkingSummary ? { thinkingSummary } : {}),
          })
        } catch (error) {
          console.error('[chat] Stream error:', error)
          emit({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        } finally {
          controller.close()
        }
      },

      cancel(_reason) {
        schedulePersistOnClientDisconnect()
      },
    })

    return new Response(readable, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
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
