// Parse transcript via Supabase Edge Function (for security)
// API key is handled server-side, never exposed to frontend
export async function parseTranscript(transcript, authToken) {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript is empty.');
  }

  if (!authToken) {
    throw new Error('Authentication token is required.');
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        transcript,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.activities;
  } catch (error) {
    const message = error.message || String(error);
    if (message.includes('rate_limit')) {
      throw new Error('Claude API rate limit exceeded. Please wait a moment and try again.');
    } else if (message.includes('401') || message.includes('unauthorized')) {
      throw new Error('Authentication failed. Please log in again.');
    } else if (message.includes('timeout')) {
      throw new Error('Request timed out. Please check your internet connection.');
    } else if (
      message.includes('PARSE_OUTPUT_INVALID') ||
      message.includes('Could not turn that transcript') ||
      message.includes('did not return valid JSON')
    ) {
      throw new Error(
        'Could not turn that transcript into activities. Try editing the text in Type mode or a shorter check-in.'
      );
    } else {
      throw new Error(`Parsing failed: ${message}`);
    }
  }
}
