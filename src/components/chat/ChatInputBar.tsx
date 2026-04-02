'use client'

import type { MutableRefObject } from 'react'
import { useCallback, useRef, useState } from 'react'

interface ChatInputBarProps {
  input: string
  onInputChange: (text: string) => void
  onSendMessage: (text: string) => void
  disabled: boolean
  placeholder: string
  currentModel: 'balanced' | 'fast'
  onModelChange: (model: 'balanced' | 'fast') => void
  imagePreview: string | null
  onAttachClick: () => void
  onImageRemove: () => void
  error: string | null
  composerTextareaRef?: MutableRefObject<HTMLTextAreaElement | null>
}

function AttachmentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-8.49 8.49a6 6 0 01-8.49-8.49l8.49-8.48a4 4 0 115.66 5.65l-8.48 8.49a2 2 0 11-2.83-2.83l7.78-7.78" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  )
}

export function ChatInputBar({
  input,
  onInputChange,
  onSendMessage,
  disabled,
  placeholder,
  currentModel,
  onModelChange,
  imagePreview,
  onAttachClick,
  onImageRemove,
  error,
  composerTextareaRef,
}: ChatInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const setTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node
      if (composerTextareaRef) composerTextareaRef.current = node
    },
    [composerTextareaRef],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 150) + 'px'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSendMessage(input)
    }
  }

  const modelLabel = currentModel === 'balanced' ? 'Balanced' : 'Fast'

  return (
    <div className="w-full shrink-0 border-t border-border-subtle/70 bg-surface-base px-4 pb-4 pt-3">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[18px] border border-border-subtle/60 bg-[rgba(160,100,78,0.08)] px-4 py-2.5 text-text-primary focus-within:ring-2 focus-within:ring-accent/70 focus-within:ring-offset-1 focus-within:ring-offset-surface-base">
          {imagePreview && (
            <div className="mb-2 flex items-center gap-2">
              <img src={imagePreview} alt="Attachment preview" className="h-12 w-12 rounded-lg border border-border-subtle object-cover" />
              <button onClick={onImageRemove} disabled={disabled} className="text-xs text-text-secondary hover:text-status-error transition-colors">
                Remove
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              onClick={onAttachClick}
              disabled={disabled}
              className="p-2 text-text-muted hover:text-text-secondary transition-colors rounded disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              aria-label="Attach image"
              title="Attach image"
            >
              <AttachmentIcon />
            </button>

            <textarea
              ref={setTextareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={placeholder}
              rows={1}
              className="flex-1 bg-transparent text-sm text-text-primary/90 placeholder:text-text-muted resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed font-serif"
              style={{ minHeight: '24px', maxHeight: '150px', overflowY: 'auto' }}
            />

            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={disabled}
                className="px-3 py-1 text-label font-normal text-text-muted bg-background/40 hover:text-text-secondary transition-colors rounded-full border border-border-subtle/60 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                {modelLabel}
              </button>

              {dropdownOpen && (
                <div className="absolute bottom-full right-0 mb-2 bg-background border border-border rounded shadow-lg w-48 z-50">
                  <button
                    onClick={() => {
                      onModelChange('balanced')
                      setDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      currentModel === 'balanced' ? 'bg-surface-hover text-accent' : 'text-text-primary hover:bg-surface-hover'
                    }`}
                  >
                    Balanced (Sonnet 4.6)
                  </button>
                  <button
                    onClick={() => {
                      onModelChange('fast')
                      setDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors border-t border-border ${
                      currentModel === 'fast' ? 'bg-surface-hover text-accent' : 'text-text-primary hover:bg-surface-hover'
                    }`}
                  >
                    Fast (Haiku 4.5)
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => onSendMessage(input)}
              disabled={disabled || (!input.trim() && !imagePreview)}
              className="p-2 text-text-muted hover:text-text-secondary transition-colors rounded disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              aria-label="Send message"
              title="Send message"
            >
              <SendIcon />
            </button>
          </div>

          {error && <p className="text-xs text-status-error mt-2">{error}</p>}
        </div>
      </div>
    </div>
  )
}
