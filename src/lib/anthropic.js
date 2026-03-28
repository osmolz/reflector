import Anthropic from '@anthropic-ai/sdk';

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

if (!apiKey) {
  console.warn('VITE_ANTHROPIC_API_KEY is not set in .env.local');
}

export const anthropic = new Anthropic({ apiKey });

export const PARSE_PROMPT = `You are a helpful assistant that parses stream-of-consciousness speech about daily activities into a structured time-based log.

Given a transcript of someone describing their day, extract:
1. Each distinct activity mentioned
2. The estimated duration of each activity in minutes
3. The inferred start time (based on context clues like "I woke up at 7" or "then I...")
4. The activity category if clear (e.g., work, personal, exercise, food, etc.)

Return ONLY a valid JSON array. Do not include any text before or after the JSON.
Use this format exactly:
[
  {
    "activity": "activity name",
    "duration_minutes": <number>,
    "start_time_inferred": "HH:MM AM/PM",
    "category": "category name (optional)",
    "notes": "any ambiguities or uncertainties (optional)"
  }
]

Rules:
- If a time is mentioned explicitly (e.g., "at 7:30"), use that.
- If only relative times are given (e.g., "then I..."), infer from context.
- If duration is not explicit but implied, estimate reasonably.
- If an activity is ambiguous or split, create separate entries.
- Preserve the chronological order from the transcript.
- Always return valid JSON, even if uncertain. Use "notes" field to flag uncertainty.`;

export async function parseTranscript(transcript) {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript is empty.');
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${PARSE_PROMPT}\n\nTranscript:\n${transcript}`,
        },
      ],
    });

    // Extract the text response
    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse JSON from response
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      // Try to extract JSON from response (in case Claude adds extra text)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Claude did not return valid JSON.');
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    // Validate structure
    if (!Array.isArray(parsed)) {
      throw new Error('Expected an array of activities.');
    }

    for (const activity of parsed) {
      if (!activity.activity || typeof activity.duration_minutes !== 'number') {
        throw new Error('Invalid activity structure: missing required fields.');
      }
    }

    return parsed;
  } catch (error) {
    const message = error.message || String(error);
    if (message.includes('rate_limit')) {
      throw new Error('Claude API rate limit exceeded. Please wait a moment and try again.');
    } else if (message.includes('401') || message.includes('unauthorized')) {
      throw new Error('Claude API key is invalid. Check your .env.local.');
    } else if (message.includes('timeout')) {
      throw new Error('Claude API request timed out. Please check your internet connection.');
    } else {
      throw new Error(`Parsing failed: ${message}`);
    }
  }
}
