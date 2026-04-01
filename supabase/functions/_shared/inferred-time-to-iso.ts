/** Matches VoiceCheckIn.jsx parseTimeString: "HH:MM AM/PM" → ISO for today's calendar date in local runtime. */
export function inferredTimeToIso(timeStr: string | undefined | null): string {
  if (!timeStr || typeof timeStr !== 'string') {
    return new Date().toISOString()
  }

  try {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (!match) return new Date().toISOString()

    let hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const period = match[3].toUpperCase()

    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0

    const now = new Date()
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0)
    return date.toISOString()
  } catch {
    return new Date().toISOString()
  }
}
