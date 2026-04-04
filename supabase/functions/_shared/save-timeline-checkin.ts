import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { inferredTimeToIso, inferredTimeToIsoForZonedDay } from './inferred-time-to-iso.ts'
import { normalizeActivities } from './parse-transcript-activities.ts'

type SupabaseService = ReturnType<typeof createClient>

/**
 * Inserts check_ins and time_entries (same shape as former commit_timeline_activities).
 * @throws Error — empty/invalid activities (PARSE_OUTPUT_INVALID from normalizeActivities), or DB errors
 */
export type SaveTimelineCheckInOptions = {
  /** YYYY-MM-DD — calendar day used to interpret start_time_inferred (Log tab / user-local day). */
  logDateYmd?: string
  /** IANA zone, e.g. from Intl.DateTimeFormat().resolvedOptions().timeZone */
  clientTimeZone?: string
}

function resolveStartTime(
  timeStr: string,
  opts?: SaveTimelineCheckInOptions,
): string {
  if (opts?.logDateYmd && opts?.clientTimeZone) {
    return inferredTimeToIsoForZonedDay(timeStr, opts.logDateYmd, opts.clientTimeZone)
  }
  return inferredTimeToIso(timeStr)
}

export async function saveTimelineCheckIn(
  supabase: SupabaseService,
  userId: string,
  transcript: string,
  rawActivities: unknown[],
  opts?: SaveTimelineCheckInOptions,
): Promise<{ check_in_id: string; entries_created: number }> {
  const normalized = normalizeActivities(rawActivities)

  const now = new Date().toISOString()

  const { data: checkInData, error: checkInError } = await supabase
    .from('check_ins')
    .insert([
      {
        user_id: userId,
        transcript,
        parsed_activities: normalized,
        created_at: now,
      },
    ])
    .select('id')

  if (checkInError) {
    throw new Error(checkInError.message)
  }
  if (!checkInData?.[0]?.id) {
    throw new Error('Failed to create check-in record.')
  }

  const checkInId = checkInData[0].id as string

  const timeEntries = normalized.map((activity) => ({
    user_id: userId,
    activity_name: activity.activity,
    duration_minutes: activity.duration_minutes,
    category: activity.category ?? null,
    start_time: resolveStartTime(activity.start_time_inferred, opts),
    check_in_id: checkInId,
    created_at: now,
    updated_at: now,
  }))

  const { error: entriesError } = await supabase.from('time_entries').insert(timeEntries)

  if (entriesError) {
    throw new Error(entriesError.message)
  }

  return {
    check_in_id: checkInId,
    entries_created: normalized.length,
  }
}
