/** Remove common markdown markers from a single stream chunk. */
export function stripMarkdownStreamDelta(delta: string): string {
  return delta.replace(/\*\*/g, '').replace(/__/g, '')
}

/**
 * Line-level cleanup on full assistant text before persistence (Phase 7-style guard).
 * Also strips remaining ** and simple *italic* spans.
 */
export function stripMarkdownArtifacts(text: string): string {
  const lines = text.split('\n')
  const cleaned = lines
    .filter((line) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('**') || trimmed.startsWith('__')) return false
      if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) return false
      if (trimmed.startsWith('|')) return false
      return true
    })
    .map((line) => line.replace(/^#{1,6}\s+/, ''))
    .join('\n')
    .trim()
  return cleaned
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/\*([^*\n]+)\*/g, '$1')
}
