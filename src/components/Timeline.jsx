import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { ActivityEditForm } from './ActivityEditForm'
import { calculateGaps, formatTime } from '../utils/timelineUtils'
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

const HOUR_HEIGHT = 40
const DAY_START = 5
const DAY_END = 24

export function Timeline({ refreshKey = 0 }) {
  const { user } = useAuthStore()
  const [view, setView] = useState('day')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activities, setActivities] = useState([])
  const [gaps, setGaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingActivity, setEditingActivity] = useState(null)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [addToCalendarEntry, setAddToCalendarEntry] = useState(null)

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

      const timeEntriesOnly = displayActivities.filter((a) => a.type === 'time_entry')
      const calculatedGaps = calculateGaps(timeEntriesOnly)
      setGaps(calculatedGaps)
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

  const calculatePositionAndHeight = (activity) => {
    const start = new Date(activity.start_time)
    const startHour = start.getHours()
    const startMinute = start.getMinutes()

    const minutesSince5am = (startHour - DAY_START) * 60 + startMinute
    const top = (minutesSince5am / 60) * HOUR_HEIGHT

    const height = Math.max(22, (activity.duration_minutes / 60) * HOUR_HEIGHT)

    return { top, height }
  }

  const renderDayView = () => {
    const dayActivities = activities.filter((a) => {
      const aDate = new Date(a.start_time)
      return aDate.toDateString() === selectedDate.toDateString()
    })

    return (
      <div className="timeline-day-view">
        <div className="timeline-day-nav">
          <button className="timeline-nav-btn" onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}>
            ← Prev
          </button>
          <span className="timeline-day-label">{selectedDate.toDateString()}</span>
          <button className="timeline-nav-btn" onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}>
            Next →
          </button>
        </div>

        <div className="timeline-grid">
          <div className="timeline-hours">
            {Array.from({ length: 19 }).map((_, i) => {
              const hour = DAY_START + i
              return (
                <div key={i} className="timeline-hour" style={{ height: `${HOUR_HEIGHT}px` }}>
                  <span className="timeline-hour-label">{hour % 12 || 12}{hour >= 12 ? 'p' : 'a'}</span>
                </div>
              )
            })}
          </div>

          <div className="timeline-activities-container">
            {dayActivities.length === 0 ? (
              <div className="timeline-empty-day">No activities logged today</div>
            ) : (
              dayActivities.map((activity) => {
                const { top, height } = calculatePositionAndHeight(activity)
                const isCalendarEvent = activity.type === 'calendar_event'

                return (
                  <div
                    key={activity.id}
                    className={`timeline-activity ${isCalendarEvent ? 'calendar-event' : ''}`}
                    style={{ top: `${top}px`, height: `${height}px` }}
                    onClick={() => !isCalendarEvent && setEditingActivity(activity)}
                    role={isCalendarEvent ? undefined : 'button'}
                    tabIndex={isCalendarEvent ? undefined : 0}
                  >
                    <div className="timeline-activity-inner">
                      <span className="timeline-activity-time">{formatTime(activity.start_time)}</span>
                      <span className="timeline-activity-name">{activity.activity_name}</span>
                      {height > 35 && (
                        <span className="timeline-activity-duration">{activity.duration_minutes}m</span>
                      )}
                      {!isCalendarEvent && AddToCalendarModal && (
                        <button
                          className="timeline-add-cal-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAddToCalendarEntry(activity)
                          }}
                        >
                          +Cal
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {gaps.map((gap, i) => {
              const gapDate = new Date(gap.startTime)
              if (gapDate.toDateString() !== selectedDate.toDateString()) return null

              const minutesSince5am = (gap.startTime.getHours() - DAY_START) * 60 + gap.startTime.getMinutes()
              const top = (minutesSince5am / 60) * HOUR_HEIGHT
              const height = (gap.durationMinutes / 60) * HOUR_HEIGHT

              return (
                <div
                  key={`gap-${i}`}
                  className="timeline-gap-block"
                  style={{ top: `${top}px`, height: `${height}px` }}
                  title={`${gap.durationMinutes}m gap`}
                />
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const weekStart = new Date(selectedDate)
    weekStart.setDate(selectedDate.getDate() - selectedDate.getDay())

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
          <span className="timeline-week-label">
            {weekStart.toLocaleDateString()} – {weekDays[6].toLocaleDateString()}
          </span>
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
          <span className="timeline-month-label">{selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
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
      <div className="timeline-header">
        <div className="timeline-header-top">
          <h1 className="timeline-page-title">Timeline</h1>
          {SyncCalendarModal && (
            <button className="btn-sync-calendar" onClick={() => setSyncModalOpen(true)}>
              Sync with Google Calendar
            </button>
          )}
        </div>
      </div>

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
