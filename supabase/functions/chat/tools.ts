import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1'
import type { TimeEntry, ToolResult } from './types.ts'
import { updateUserMemory } from './memory.ts'

export const TOOL_DEFINITIONS = [
  {
    name: 'get_activity_summary',
    description: 'Query total time spent on an activity within a date range',
    input_schema: {
      type: 'object',
      properties: {
        activity: { type: 'string', description: 'Activity name (e.g., coding, exercise)' },
        start_date: { type: 'string', description: 'YYYY-MM-DD' },
        end_date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['activity', 'start_date', 'end_date'],
    },
  },
  {
    name: 'get_daily_log',
    description: 'Get all activities for a specific date',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['date'],
    },
  },
  {
    name: 'get_time_breakdown',
    description: 'Analyze time across categories and dates to find patterns',
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'YYYY-MM-DD' },
        end_date: { type: 'string', description: 'YYYY-MM-DD' },
        group_by: { type: 'string', enum: ['activity', 'category', 'day'] },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'update_user_memory',
    description: 'Save goals, preferences, or facts to memory',
    input_schema: {
      type: 'object',
      properties: {
        memory_type: { type: 'string', enum: ['goal', 'preference', 'fact'] },
        content: { type: 'string' },
      },
      required: ['memory_type', 'content'],
    },
  },
  {
    name: 'web_search',
    description: 'Search the web for information (optional feature)',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
]

async function getActivitySummary(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  activity: string,
  startDate: string,
  endDate: string,
): Promise<ToolResult> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('duration_minutes')
    .eq('user_id', userId)
    .ilike('activity_name', `%${activity}%`)
    .gte('start_time', `${startDate}T00:00:00`)
    .lte('start_time', `${endDate}T23:59:59`)

  if (error) {
    return { status: 'error', message: error.message }
  }

  if (!data || data.length === 0) {
    return {
      status: 'no_data',
      message: `No time entries found for "${activity}" between ${startDate} and ${endDate}`,
    }
  }

  const totalMinutes = data.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
  const hours = (totalMinutes / 60).toFixed(1)

  return {
    status: 'ok',
    data: {
      activity,
      total_minutes: totalMinutes,
      total_hours: parseFloat(hours),
      entries_count: data.length,
      average_minutes_per_entry: Math.round(totalMinutes / data.length),
    },
  }
}

async function getDailyLog(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  date: string,
): Promise<ToolResult> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('activity_name, category, duration_minutes, start_time')
    .eq('user_id', userId)
    .gte('start_time', `${date}T00:00:00`)
    .lte('start_time', `${date}T23:59:59`)
    .order('start_time', { ascending: true })

  if (error) {
    return { status: 'error', message: error.message }
  }

  if (!data || data.length === 0) {
    return {
      status: 'no_data',
      message: `No activities logged for ${date}`,
    }
  }

  const totalMinutes = data.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
  const activities = data.map((entry) => ({
    activity: entry.activity_name,
    category: entry.category,
    duration_minutes: entry.duration_minutes,
    start_time: entry.start_time,
  }))

  return {
    status: 'ok',
    data: {
      date,
      activities,
      total_minutes: totalMinutes,
      total_hours: (totalMinutes / 60).toFixed(1),
    },
  }
}

async function getTimeBreakdown(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  startDate: string,
  endDate: string,
  groupBy: string = 'activity',
): Promise<ToolResult> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('activity_name, category, duration_minutes, start_time')
    .eq('user_id', userId)
    .gte('start_time', `${startDate}T00:00:00`)
    .lte('start_time', `${endDate}T23:59:59`)

  if (error) {
    return { status: 'error', message: error.message }
  }

  if (!data || data.length === 0) {
    return {
      status: 'no_data',
      message: `No time entries found between ${startDate} and ${endDate}`,
    }
  }

  const breakdown: Record<string, number> = {}

  for (const entry of data) {
    const key =
      groupBy === 'activity'
        ? entry.activity_name
        : groupBy === 'category'
          ? entry.category || 'uncategorized'
          : new Date(entry.start_time).toISOString().split('T')[0]

    breakdown[key] = (breakdown[key] || 0) + (entry.duration_minutes || 0)
  }

  const sorted = Object.entries(breakdown)
    .map(([key, minutes]) => ({
      [groupBy]: key,
      minutes,
      hours: (minutes / 60).toFixed(1),
    }))
    .sort((a, b) => b.minutes - a.minutes)

  return {
    status: 'ok',
    data: {
      period: `${startDate} to ${endDate}`,
      group_by: groupBy,
      breakdown: sorted,
      total_minutes: Object.values(breakdown).reduce((a, b) => a + b, 0),
    },
  }
}

export async function executeTool(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  toolName: string,
  toolInput: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'get_activity_summary':
        return await getActivitySummary(
          supabase,
          userId,
          toolInput.activity as string,
          toolInput.start_date as string,
          toolInput.end_date as string,
        )

      case 'get_daily_log':
        return await getDailyLog(supabase, userId, toolInput.date as string)

      case 'get_time_breakdown':
        return await getTimeBreakdown(
          supabase,
          userId,
          toolInput.start_date as string,
          toolInput.end_date as string,
          (toolInput.group_by as string) || 'activity',
        )

      case 'update_user_memory':
        await updateUserMemory(
          supabase,
          userId,
          toolInput.memory_type as 'goal' | 'preference' | 'fact',
          toolInput.content as string,
        )
        return { status: 'ok', data: { message: 'Memory updated' } }

      case 'web_search':
        // TODO: Implement web search via Brave API or similar
        return {
          status: 'no_data',
          message: 'Web search not yet enabled. Coming soon.',
        }

      default:
        return { status: 'error', message: `Unknown tool: ${toolName}` }
    }
  } catch (error) {
    return {
      status: 'error',
      message: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
