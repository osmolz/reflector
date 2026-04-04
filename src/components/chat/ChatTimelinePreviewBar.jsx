import { useState, useCallback } from 'react'
import { ActivityReview } from '../ActivityReview'
import './ChatTimelinePreviewBar.css'

/** Strip leading "Note:" from parser notes for a cleaner date line. */
function dateLineFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return null
  const t = notes.trim()
  if (!t) return null
  return t.replace(/^note:\s*/i, '').trim()
}

function ActivityRow({ activity }) {
  const meta = [
    activity.start_time_inferred,
    activity.duration_minutes != null ? `${activity.duration_minutes}m` : null,
    activity.category || null,
  ].filter(Boolean)

  const dateLine = dateLineFromNotes(activity.notes)

  return (
    <div className="chat-timeline-preview-row">
      <div className="chat-timeline-preview-row-main">
        <span className="chat-timeline-preview-activity">{activity.activity}</span>
        <span className="chat-timeline-preview-meta">{meta.join(' · ')}</span>
        {dateLine ? <span className="chat-timeline-preview-date">{dateLine}</span> : null}
      </div>
    </div>
  )
}

export function ChatTimelinePreviewBar({ activities, onSave, onDiscard }) {
  const [editExpanded, setEditExpanded] = useState(false)
  const [collapsedSaveError, setCollapsedSaveError] = useState(null)

  const handleCollapsedSave = useCallback(async () => {
    setCollapsedSaveError(null)
    try {
      await onSave(activities)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setCollapsedSaveError(
        /404|not found/i.test(msg)
          ? 'Save service is unavailable (not deployed). Deploy the save-check-in edge function or try again later.'
          : msg || 'Could not save. Try again.',
      )
    }
  }, [activities, onSave])

  const handleReviewSave = useCallback(
    async (edited) => {
      await onSave(edited)
      setEditExpanded(false)
    },
    [onSave],
  )

  const handleReviewDiscard = useCallback(() => {
    setEditExpanded(false)
    onDiscard()
  }, [onDiscard])

  return (
    <div className="chat-timeline-preview-wrap">
      <div
        className="chat-timeline-preview-pill"
        role="region"
        aria-label="Timeline entry to confirm"
      >
        <div className="chat-timeline-preview-pill-rows">
          {activities.map((activity, index) => (
            <ActivityRow
              key={`${activity.activity}-${activity.start_time_inferred}-${index}`}
              activity={activity}
            />
          ))}
        </div>
        {!editExpanded ? (
          <div className="chat-timeline-preview-pill-actions">
            <button
              type="button"
              className="chat-timeline-preview-btn chat-timeline-preview-btn--primary"
              onClick={handleCollapsedSave}
              aria-label="Save to timeline"
            >
              Save
            </button>
            <button
              type="button"
              className="chat-timeline-preview-btn chat-timeline-preview-btn--quiet"
              onClick={() => {
                setCollapsedSaveError(null)
                onDiscard()
              }}
              aria-label="Discard timeline entry"
            >
              Discard
            </button>
          </div>
        ) : null}
      </div>

      {collapsedSaveError ? (
        <p className="chat-timeline-preview-error" role="alert">
          {collapsedSaveError}
        </p>
      ) : null}

      <button
        type="button"
        className="chat-timeline-preview-edit-toggle"
        onClick={() => {
          setCollapsedSaveError(null)
          setEditExpanded((e) => !e)
        }}
        aria-expanded={editExpanded}
      >
        {editExpanded ? 'Hide details' : 'Edit details'}
      </button>

      {editExpanded ? (
        <div className="chat-timeline-preview-expanded">
          <ActivityReview
            activities={activities}
            isLoading={false}
            onSave={handleReviewSave}
            onDiscard={handleReviewDiscard}
          />
        </div>
      ) : null}
    </div>
  )
}
