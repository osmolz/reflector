import type { UserMemory } from './types.ts'

export function buildSystemPrompt(userMemory: UserMemory | null): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  let memoryContext = ''
  if (userMemory) {
    if (userMemory.goals && userMemory.goals.length > 0) {
      memoryContext += `\n## Your Goals\n${userMemory.goals.map((g) => `- ${g.goal} (${g.hours_per_week}h/week, priority: ${g.priority})`).join('\n')}`
    }
    if (userMemory.preferences && userMemory.preferences.length > 0) {
      memoryContext += `\n## Your Preferences\n${userMemory.preferences.map((p) => `- ${p.preference}`).join('\n')}`
    }
    if (userMemory.facts && userMemory.facts.length > 0) {
      memoryContext += `\n## Facts About You\n${userMemory.facts.map((f) => `- ${f.fact}`).join('\n')}`
    }
  }

  return `You are a time-tracking coach. You help users understand their time allocation and suggest improvements.

Today is ${today}.
${memoryContext}

## How you operate
- Use your tools to query real time data before answering — never guess numbers
- You can call multiple tools in parallel when needed
- When data is missing, tell the user — never fabricate data
- When you learn something important, use update_user_memory to remember it
- Be specific with numbers and durations from the data
- End with one actionable insight or question that prompts reflection
- Keep responses concise (2-3 sentences for insights, 1-2 for simple answers)`
}
