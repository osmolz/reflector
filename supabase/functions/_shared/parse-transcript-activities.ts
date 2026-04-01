import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.80.0'

export interface ParsedActivity {
  activity: string
  duration_minutes: number
  start_time_inferred: string
  category?: string
  notes?: string
}

export const PARSE_MODEL = 'claude-opus-4-6'

export const PARSE_PROMPT = `You parse stream-of-consciousness transcripts into a chronological daily activity log.

The transcript may be one long run-on sentence, poorly punctuated, or noisy speech-to-text (wrong words, missing capitals). Still extract every distinct activity you can infer, in order.

For each activity:
- activity: short label
- duration_minutes: a number (minutes); estimate if needed
- start_time_inferred: like "7:45 AM" from explicit times or reasonable inference from sequence
- category: optional (work, food, exercise, personal, etc.)
- notes: optional, for ambiguity or ASR uncertainty

You MUST call the tool submit_parsed_activities with the full list. Do not reply with plain text or markdown—only the tool call.`

export const SUBMIT_ACTIVITIES_TOOL = {
  name: 'submit_parsed_activities',
  description:
    'Submit all inferred activities from the transcript in chronological order. Every duration_minutes value must be a JSON number.',
  input_schema: {
    type: 'object',
    properties: {
      activities: {
        type: 'array',
        description: 'Activities from first to last in the transcript',
        items: {
          type: 'object',
          properties: {
            activity: { type: 'string', description: 'Short activity name' },
            duration_minutes: { type: 'number', description: 'Duration in minutes' },
            start_time_inferred: {
              type: 'string',
              description: 'e.g. "7:45 AM" — best inference from context',
            },
            category: { type: 'string', description: 'Optional category' },
            notes: { type: 'string', description: 'Optional uncertainty notes' },
          },
          required: ['activity', 'duration_minutes', 'start_time_inferred'],
        },
      },
    },
    required: ['activities'],
  },
}

function stripMarkdownCodeFences(text: string): string {
  const trimmed = text.trim()
  const fullFence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/im)
  if (fullFence) return fullFence[1].trim()
  const anyFence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (anyFence) return anyFence[1].trim()
  return trimmed
}

function extractBalancedArray(jsonish: string): string | null {
  const start = jsonish.indexOf('[')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < jsonish.length; i++) {
    const c = jsonish[i]
    if (escape) {
      escape = false
      continue
    }
    if (c === '\\' && inString) {
      escape = true
      continue
    }
    if (c === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (c === '[') depth++
    else if (c === ']') {
      depth--
      if (depth === 0) return jsonish.slice(start, i + 1)
    }
  }
  return null
}

function coerceDurationMinutes(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value)
  }
  if (typeof value === 'string') {
    const n = Number(String(value).replace(/,/g, '').trim())
    if (Number.isFinite(n) && n >= 0) return Math.round(n)
  }
  return null
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export function normalizeActivities(raw: unknown[]): ParsedActivity[] {
  const out: ParsedActivity[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    if (!isNonEmptyString(o.activity)) continue
    const dm = coerceDurationMinutes(o.duration_minutes)
    if (dm === null) continue
    const startTime =
      typeof o.start_time_inferred === 'string' && o.start_time_inferred.trim()
        ? o.start_time_inferred.trim()
        : '12:00 PM'
    const activity: ParsedActivity = {
      activity: o.activity.trim(),
      duration_minutes: dm,
      start_time_inferred: startTime,
    }
    if (typeof o.category === 'string' && o.category.trim()) {
      activity.category = o.category.trim()
    }
    if (typeof o.notes === 'string' && o.notes.trim()) {
      activity.notes = o.notes.trim()
    }
    out.push(activity)
  }
  if (out.length === 0) {
    throw new Error('PARSE_OUTPUT_INVALID: No valid activities after normalization.')
  }
  return out
}

function parseActivitiesFromText(responseText: string): ParsedActivity[] {
  const cleaned = stripMarkdownCodeFences(responseText)
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const slice = extractBalancedArray(cleaned)
    if (!slice) {
      throw new Error('PARSE_OUTPUT_INVALID: Claude did not return valid JSON.')
    }
    try {
      parsed = JSON.parse(slice)
    } catch {
      throw new Error('PARSE_OUTPUT_INVALID: Claude did not return valid JSON.')
    }
  }
  if (Array.isArray(parsed)) {
    return normalizeActivities(parsed)
  }
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { activities?: unknown[] }).activities)) {
    return normalizeActivities((parsed as { activities: unknown[] }).activities)
  }
  throw new Error('PARSE_OUTPUT_INVALID: Expected an array of activities.')
}

type MessageContentBlock = { type: string; name?: string; input?: unknown; text?: string }

function extractActivitiesFromMessage(message: { content: MessageContentBlock[] }): ParsedActivity[] {
  const blocks = message.content
  for (const block of blocks) {
    if (block.type === 'tool_use' && block.name === 'submit_parsed_activities' && block.input != null) {
      const input = block.input as { activities?: unknown[] }
      if (Array.isArray(input.activities)) {
        return normalizeActivities(input.activities)
      }
    }
  }
  const text = blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
  if (text.trim()) {
    return parseActivitiesFromText(text)
  }
  throw new Error('PARSE_OUTPUT_INVALID: No tool output or text from model.')
}

export async function parseTranscriptToActivities(
  anthropic: Anthropic,
  transcript: string,
): Promise<ParsedActivity[]> {
  const message = await anthropic.messages.create({
    model: PARSE_MODEL,
    max_tokens: 8192,
    tools: [SUBMIT_ACTIVITIES_TOOL] as any,
    tool_choice: { type: 'tool', name: 'submit_parsed_activities' },
    messages: [
      {
        role: 'user',
        content: `${PARSE_PROMPT}\n\nTranscript:\n${transcript}`,
      },
    ],
  })

  return extractActivitiesFromMessage(message as { content: MessageContentBlock[] })
}
