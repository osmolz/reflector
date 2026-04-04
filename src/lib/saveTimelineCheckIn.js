/**
 * Persist a check-in + time entries via the save-check-in edge function (same path as chat confirmation).
 * @param {string} authToken
 * @param {string} transcript
 * @param {unknown[]} activities
 * @param {{ logDateYmd?: string, clientTimeZone?: string }} [options]
 */
export async function saveTimelineCheckIn(authToken, transcript, activities, options = {}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('App misconfigured: missing Supabase URL or anon key')
  }

  const body = {
    transcript,
    activities,
  }
  if (options.logDateYmd) body.log_date_ymd = options.logDateYmd
  if (options.clientTimeZone) body.client_time_zone = options.clientTimeZone

  const res = await fetch(`${supabaseUrl}/functions/v1/save-check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || data.message || `Save failed (${res.status})`)
  }
  return data
}
