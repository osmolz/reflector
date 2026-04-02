export interface WelcomePrompt {
  text: string
  description: string
}

const WELCOME_TOPIC_STORAGE_KEY = 'chat-welcome-topics-v1'

const FALLBACK_WELCOME_PROMPTS: readonly WelcomePrompt[] = [
  {
    text: 'Where did my time go this week?',
    description: 'Calendar reality, focus blocks, and drift',
  },
  {
    text: 'What should I prioritize today?',
    description: 'Top outcomes, constraints, and trade-offs',
  },
  {
    text: 'Am I working from my values?',
    description: 'Values alignment, energy, and decisions',
  },
] as const

function ensureExactlyThree(prompts: readonly WelcomePrompt[], source: string): readonly WelcomePrompt[] {
  if (prompts.length !== 3) {
    throw new Error(`[chat-welcome] ${source} must return exactly 3 prompts, got ${prompts.length}`)
  }
  return prompts
}

export function getDisplayName(user: any): string {
  if (!user) return 'there'

  const fullName = String(user?.user_metadata?.full_name ?? '').trim()
  if (fullName) {
    const [first] = fullName.split(/\s+/)
    if (first) return first
  }

  const name = String(user?.user_metadata?.name ?? '').trim()
  if (name) return name

  const email = String(user?.email ?? '').trim()
  if (!email) return 'there'

  const localPart = email.split('@')[0] ?? ''
  const normalized = localPart.replace(/[._-]+/g, ' ').trim()
  if (!normalized) return 'there'

  return normalized
    .split(/\s+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(' ')
}

export function greetingPrefixForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function readRecentTopicsFromStorage(): string {
  if (typeof window === 'undefined') return ''
  try {
    return String(localStorage.getItem(WELCOME_TOPIC_STORAGE_KEY) ?? '')
  } catch {
    return ''
  }
}

export function writeRecentWelcomeTopicHint(text: string): void {
  if (typeof window === 'undefined') return
  const next = String(text || '').trim().toLowerCase()
  if (!next) return
  try {
    const previous = readRecentTopicsFromStorage()
    const combined = `${previous} ${next}`.trim()
    const trimmed = combined.slice(-1200)
    localStorage.setItem(WELCOME_TOPIC_STORAGE_KEY, trimmed)
  } catch {
    // Ignore storage failures; fallback prompts still work.
  }
}

export function resolveWelcomePrompts(): readonly WelcomePrompt[] {
  const recent = readRecentTopicsFromStorage()

  const timeSignals = /\b(time|calendar|week|hours|meeting|schedule|focus|deep work)\b/.test(recent)
  const prioritySignals = /\b(priority|priorities|important|urgent|tradeoff|decision|deadline)\b/.test(recent)
  const valuesSignals = /\b(value|values|purpose|meaning|alignment|intentional|regret)\b/.test(recent)

  if (!recent) {
    return ensureExactlyThree(FALLBACK_WELCOME_PROMPTS, 'fallback prompts')
  }

  const adaptive: WelcomePrompt[] = [
    timeSignals
      ? {
          text: 'What patterns are stealing my focus?',
          description: 'Interruptions, context switching, and time leakage',
        }
      : FALLBACK_WELCOME_PROMPTS[0],
    prioritySignals
      ? {
          text: 'What is the most important thing today?',
          description: 'Priority ranking, leverage, and execution risk',
        }
      : FALLBACK_WELCOME_PROMPTS[1],
    valuesSignals
      ? {
          text: 'Where am I out of alignment this week?',
          description: 'Stated values vs actual time allocation',
        }
      : FALLBACK_WELCOME_PROMPTS[2],
  ]

  return ensureExactlyThree(adaptive, 'adaptive prompts')
}
