import type { IntentMatch } from './types.ts'

const SIMPLE_PATTERNS: Array<{ pattern: RegExp; handler: string; extractActivity?: (msg: string) => string | null }> = [
  {
    pattern: /how much time.*?(\w+)|(\w+).*?hours|time.*?(?:on|spent).*?(\w+)/i,
    handler: 'get_activity_summary',
    extractActivity: (msg) => {
      const match = msg.match(/(?:on|spent on|doing)\s+(\w+)/i)
      return match?.[1] ?? null
    },
  },
  {
    pattern: /today|my activities|what did i do|today's.*?log/i,
    handler: 'get_daily_log',
  },
  {
    pattern: /time breakdown|compare.*?time|trend|pattern/i,
    handler: 'get_time_breakdown',
  },
]

// Questions with these keywords require full reasoning, not fast-path
const ADVISORY_KEYWORDS = /\b(should|why|how\s+to|recommend|improve|strategy|suggest|better|best|help)\b/i

export function classifyIntent(message: string): IntentMatch | null {
  // If advisory keyword present, skip fast-path entirely
  if (ADVISORY_KEYWORDS.test(message)) {
    return null
  }

  // Try pattern matching
  for (const { pattern, handler, extractActivity } of SIMPLE_PATTERNS) {
    if (pattern.test(message)) {
      const params: Record<string, unknown> = {}

      // Extract activity if pattern has extractor
      if (extractActivity) {
        const activity = extractActivity(message)
        if (activity) {
          params.activity = activity
        }
      }

      // Default date range: last 7 days to today
      if (!params.startDate) {
        const end = new Date()
        const start = new Date(end)
        start.setDate(start.getDate() - 7)
        params.startDate = start.toISOString().split('T')[0]
        params.endDate = end.toISOString().split('T')[0]
      }

      return { handler, params }
    }
  }

  // No pattern match → fall through to full LLM loop
  return null
}
