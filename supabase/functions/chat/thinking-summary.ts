const MAX_LEN = 200

/** First sentence or first line of thinking, capped for UI persistence. */
export function extractFirstSentence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''

  const sentenceMatch = trimmed.match(/^[\s\S]+?[.!?](?=\s|$)/)
  let out = sentenceMatch ? sentenceMatch[0].trim() : trimmed.split(/\n/)[0].trim()

  if (out.length > MAX_LEN) {
    out = out.slice(0, MAX_LEN - 1).trimEnd() + '…'
  }
  return out
}
