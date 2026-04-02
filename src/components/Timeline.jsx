import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { ActivityEditForm } from './ActivityEditForm'
import {
  buildDayAgendaWithGaps,
  formatActivityTimeWindow,
  formatDate,
  formatDurationShort,
  formatTime,
} from '../utils/timelineUtils'
import './Timeline.css'

// Import calendar components dynamically only if available
let SyncCalendarModal = null
let AddToCalendarModal = null

const loadCalendarComponents = async () => {
  try {
    const sync = await import('./SyncCalendarModal')
    SyncCalendarModal = sync.SyncCalendarModal
  } catch (e) {
    // Calendar components not available
  }
  try {
    const add = await import('./AddToCalendarModal')
    AddToCalendarModal = add.AddToCalendarModal
  } catch (e) {
    // Calendar components not available
  }
}

loadCalendarComponents()

export function Timeline({ refreshKey = 0 }) {
  const { user } = useAuthStore()
  const [view, setView] = useState('day')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingActivity, setEditingActivity] = useState(null)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [addToCalendarEntry, setAddToCalendarEntry] = useState(null)

  const getWeekStart = (date) => {
    const start = new Date(date)
    start.setDate(date.getDate() - date.getDay())
    start.setHours(0, 0, 0, 0)
    return start
  }

  const formatWeekRangeLabel = (date) => {
    const weekStart = getWeekStart(date)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const sameYear = weekStart.getFullYear() === weekEnd.getFullYear()
    const sameMonth = sameYear && weekStart.getMonth() === weekEnd.getMonth()

    if (sameMonth) {
      return `${weekStart.toLocaleString('default', { month: 'long' })} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`
    }

    if (sameYear) {
      return `${weekStart.toLocaleString('default', { month: 'short' })} ${weekStart.getDate()} - ${weekEnd.toLocaleString('default', { month: 'short' })} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`
    }

    return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`
  }

  useEffect(() => {
    fetchActivities()
  }, [refreshKey, user, selectedDate, view])

  const fetchActivities = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let startDate, endDate

      if (view === 'day') {
        startDate = new Date(selectedDate)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(selectedDate)
        endDate.setHours(23, 59, 59, 999)
      } else if (view === 'week') {
        const weekStart = new Date(selectedDate)
        weekStart.setDate(selectedDate.getDate() - selectedDate.getDay())
        weekStart.setHours(0, 0, 0, 0)
        startDate = weekStart

        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)
        endDate = weekEnd
      } else {
        const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
        monthStart.setHours(0, 0, 0, 0)
        const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
        monthEnd.setHours(23, 59, 59, 999)
        startDate = monthStart
        endDate = monthEnd
      }

      const { data: timeEntriesData, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select('id, activity_name, duration_minutes, category, start_time, check_in_id, created_at, updated_at')
        .eq('user_id', user.id)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: true })

      if (timeEntriesError) throw timeEntriesError

      // Try to fetch calendar events, but continue if they're not available
      let calendarEventsData = []
      try {
        const { data, error: calendarEventsError } = await supabase
          .from('calendar_events')
          .select('id, gcp_event_id, user_id, title, description, start_time, end_time, calendar_id, synced_at, created_at, updated_at')
          .eq('user_id', user.id)
          .gte('start_time', startDate.toISOString())
          .lte('start_time', endDate.toISOString())
          .order('start_time', { ascending: true })

        if (!calendarEventsError && data) {
          calendarEventsData = data
        }
      } catch (err) {
        // Calendar events table might not exist or calendar integration not set up
        calendarEventsData = []
      }

      // Merge events if calendar utilities are available, otherwise just use time entries
      let merged
      try {
        const { mergeEvents: mergeEventsFn } = await import('../utils/calendarUtils')
        merged = mergeEventsFn(timeEntriesData || [], calendarEventsData)
      } catch (err) {
        // Calendar utilities not available, just use time entries with basic transformation
        merged = (timeEntriesData || []).map((e) => ({
          id: e.id,
          type: 'time_entry',
          title: e.activity_name,
          start_time: new Date(e.start_time),
          end_time: new Date(new Date(e.start_time).getTime() + e.duration_minutes * 60 * 1000),
          duration_minutes: e.duration_minutes,
          category: e.category,
        }))
      }

      const displayActivities = merged.map((event) => {
        if (event.type === 'time_entry') {
          return {
            id: event.id,
            activity_name: event.title,
            duration_minutes: event.duration_minutes,
            category: event.category,
            start_time: event.start_time.toISOString(),
            type: 'time_entry',
          }
        } else {
          return {
            id: event.id,
            activity_name: event.title,
            duration_minutes: Math.round((event.end_time.getTime() - event.start_time.getTime()) / (1000 * 60)),
            start_time: event.start_time.toISOString(),
            type: 'calendar_event',
            gcp_event_id: event.gcp_event_id,
          }
        }
      })

      setActivities(displayActivities)
    } catch (err) {
      setError(err.message || 'Failed to load timeline')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="timeline-wrapper">
        <p className="timeline-empty-message">Please log in to view your timeline.</p>
      </div>
    )
  }

  const currentPeriodLabel =
    view === 'day'
      ? formatDate(selectedDate)
      : view === 'week'
      ? formatWeekRangeLabel(selectedDate)
      : selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  const renderDayView = () => {
    const dayActivities = activities.filter((a) => {
      const aDate = new Date(a.start_time)
      return aDate.toDateString() === selectedDate.toDateString()
    })

    const agendaItems = buildDayAgendaWithGaps(dayActivities)

    return (
      <div className="timeline-day-view">
        <div className="timeline-day-nav">
          <button type="button" className="timeline-nav-btn" onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}>
            ← Prev
          </button>
          <button type="button" className="timeline-nav-btn" onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}>
            Next →
          </button>
        </div>

        {dayActivities.length === 0 ? (
          <p className="timeline-day-empty">No activities logged this day.</p>
        ) : (
          <section className="timeline-day-agenda" aria-label="Day schedule">
            {agendaItems.map((item) => {
              if (item.kind === 'gap') {
                return (
                  <div
                    key={`gap-${item.startTime.getTime()}`}
                    className="timeline-day-gap"
                  >
                    <div className="timeline-day-gap-window">
                      {formatTime(item.startTime)}–{formatTime(item.endTime)}
                    </div>
                    <div className="timeline-day-gap-body">
                      <span className="timeline-day-gap-label">Unaccounted time</span>
                      <span className="timeline-day-gap-duration">{formatDurationShort(item.durationMinutes)}</span>
                    </div>
                  </div>
                )
              }

              const activity = item.activity
              const isCalendarEvent = activity.type === 'calendar_event'
              const durLabel = formatDurationShort(activity.duration_minutes)

              return (
                <div
                  key={activity.id}
                  className={['timeline-day-row', isCalendarEvent && 'timeline-day-row--calendar'].filter(Boolean).join(' ')}
                  aria-label={isCalendarEvent ? undefined : `Edit entry: ${activity.activity_name}`}
                  onClick={() => !isCalendarEvent && setEditingActivity(activity)}
                  onKeyDown={(e) => {
                    if (isCalendarEvent) return
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setEditingActivity(activity)
                    }
                  }}
                  tabIndex={isCalendarEvent ? undefined : 0}
                >
                  <div className="timeline-day-window">{formatActivityTimeWindow(activity)}</div>
                  <div className="timeline-day-body">
                    <p className="timeline-day-title">{activity.activity_name}</p>
                    <div className="timeline-day-meta">
                      <span className="timeline-day-duration">{durLabel}</span>
                      {activity.category ? (
                        <span className="timeline-day-category">{activity.category}</span>
                      ) : null}
                      {isCalendarEvent ? <span className="timeline-day-source">Calendar</span> : null}
                    </div>
                    {!isCalendarEvent && AddToCalendarModal && (
                      <button
                        type="button"
                        className="timeline-day-cal-link"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAddToCalendarEntry(activity)
                        }}
                      >
                        Add to Google Calendar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </section>
        )}
      </div>
    )
  }

  const renderWeekView = () => {
    const weekStart = getWeekStart(selectedDate)

    const weekDays = Array.from({ length: 7 }).map((_, i) => {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + i)
      return day
    })

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    return (
      <div className="timeline-week-view">
        <div className="timeline-week-nav">
          <button className="timeline-nav-btn" onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 604800000))}>
            ← Prev Week
          </button>
          <button className="timeline-nav-btn" onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 604800000))}>
            Next Week →
          </button>
        </div>

        <div className="timeline-week-grid">
          {weekDays.map((day, dayIndex) => {
            const dayActivities = activities.filter((a) => {
              const aDate = new Date(a.start_time)
              return aDate.toDateString() === day.toDateString()
            })

            return (
              <div key={dayIndex} className="timeline-week-day">
                <div className="timeline-week-day-header">
                  <div className="timeline-week-day-name">{dayNames[dayIndex]}</div>
                  <div className="timeline-week-day-date">{day.getDate()}</div>
                </div>
                <div className="timeline-week-day-activities">
                  {dayActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`timeline-week-activity ${activity.type === 'calendar_event' ? 'calendar' : ''}`}
                      onClick={() => activity.type !== 'calendar_event' && setEditingActivity(activity)}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="timeline-week-activity-time">{formatTime(activity.start_time)}</span>
                      <span className="timeline-week-activity-name">{activity.activity_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(firstDay.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)
    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return (
      <div className="timeline-month-view">
        <div className="timeline-month-nav">
          <button className="timeline-nav-btn" onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}>
            ← Prev
          </button>
          <button className="timeline-nav-btn" onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}>
            Next →
          </button>
        </div>

        <div className="timeline-month-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="timeline-month-day-header">
              {day}
            </div>
          ))}
        </div>

        <div className="timeline-month-grid">
          {days.map((day, i) => {
            const dayActivities = activities.filter((a) => {
              const aDate = new Date(a.start_time)
              return aDate.toDateString() === day.toDateString()
            })

            return (
              <div
                key={i}
                className={`timeline-month-cell ${day.getMonth() !== selectedDate.getMonth() ? 'other-month' : ''}`}
                onClick={() => {
                  setSelectedDate(day)
                  setView('day')
                }}
              >
                <div className="timeline-month-cell-date">{day.getDate()}</div>
                {dayActivities.length > 0 && <div className="timeline-month-cell-count">{dayActivities.length}</div>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="timeline-wrapper">
      <div className="timeline-period-shell" aria-label="Timeline controls and current period">
        <div className="timeline-controls-row">
          <div className="timeline-view-toggle">
            <button className={`toggle-btn ${view === 'day' ? 'active' : ''}`} onClick={() => setView('day')}>
              Day
            </button>
            <button className={`toggle-btn ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>
              Week
            </button>
            <button className={`toggle-btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>
              Month
            </button>
          </div>

          <div className="timeline-header-actions">
            {SyncCalendarModal && (
              <button className="btn-sync-calendar" onClick={() => setSyncModalOpen(true)}>
                Sync with Google Calendar
              </button>
            )}
          </div>
        </div>

        <p className="timeline-current-period">{currentPeriodLabel}</p>
      </div>

      {loading && <p className="timeline-loading">Loading...</p>}
      {error && <div className="timeline-error">{error}</div>}

      {!loading && !error && (
        <>
          {view === 'day' && renderDayView()}
          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </>
      )}

      {editingActivity && (
        <ActivityEditForm
          activity={editingActivity}
          onClose={() => setEditingActivity(null)}
          onSave={() => {
            setEditingActivity(null)
            fetchActivities()
          }}
        />
      )}

      {SyncCalendarModal && (
        <SyncCalendarModal
          isOpen={syncModalOpen}
          onClose={() => setSyncModalOpen(false)}
          onSyncComplete={() => {
            setSyncModalOpen(false)
            fetchActivities()
          }}
        />
      )}

      {AddToCalendarModal && (
        <AddToCalendarModal
          isOpen={!!addToCalendarEntry}
          timeEntry={addToCalendarEntry}
          onClose={() => setAddToCalendarEntry(null)}
          onSuccess={() => {
            setAddToCalendarEntry(null)
            fetchActivities()
          }}
        />
      )}
    </div>
  )
}

export default Timeline
