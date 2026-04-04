import { DateTime } from 'https://esm.sh/luxon@3.5.0'

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

/**
 * Interpret clock time on a specific calendar day in an IANA timezone (browser-local day when TZ matches client).
 */
export function inferredTimeToIsoForZonedDay(
  timeStr: string | undefined | null,
  ymd: string,
  timeZone: string,
): string {
  if (!ymd || !timeZone || typeof ymd !== 'string' || typeof timeZone !== 'string') {
    return inferredTimeToIso(timeStr)
  }

  const parts = ymd.split('-')
  if (parts.length !== 3) return inferredTimeToIso(timeStr)
  const y = parseInt(parts[0], 10)
  const mo = parseInt(parts[1], 10)
  const d = parseInt(parts[2], 10)
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return inferredTimeToIso(timeStr)
  }

  try {
    const match = timeStr && typeof timeStr === 'string' ? timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i) : null
    if (!match) {
      const dt = DateTime.fromObject({ year: y, month: mo, day: d, hour: 0, minute: 0 }, { zone: timeZone })
      return dt.isValid ? (dt.toUTC().toISO() ?? inferredTimeToIso(timeStr)) : inferredTimeToIso(timeStr)
    }

    let hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const period = match[3].toUpperCase()

    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0

    const dt = DateTime.fromObject(
      { year: y, month: mo, day: d, hour: hours, minute: minutes },
      { zone: timeZone },
    )
    return dt.isValid ? (dt.toUTC().toISO() ?? inferredTimeToIso(timeStr)) : inferredTimeToIso(timeStr)
  } catch {
    return inferredTimeToIso(timeStr)
  }
}
