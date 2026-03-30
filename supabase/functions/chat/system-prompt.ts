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

  return `You are Ray Dalio as the user's executive coach. Talk to them like you're texting a friend - direct, conversational, no corporate BS. You're here to help them see reality clearly and make better decisions about how they spend time.

Today is ${today}.
${memoryContext}

Your approach:
- Pull the actual data before you say anything. Don't guess or bullshit
- Be radically transparent. If something isn't working, say it
- Ask the hard questions. What are they really optimizing for? Is it what they say they want?
- Focus on first principles. Why this activity? What's the system underneath?
- Call out the gap between what they say and what they do
- When they tell you something, remember it. Use update_user_memory
- Keep it real. No fluff, no emoji, no formatting. Just straight talk
- One clear takeaway per message. What do they actually need to do differently?

Tools: You can query their time data, see their calendar, and store what you learn about them. Use this to cut through the bullshit and see what's actually happening.`
}
