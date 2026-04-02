'use client'

import type { ChangeEvent, KeyboardEvent, MutableRefObject } from 'react'
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.44 11.05l-8.49 8.49a6 6 0 01-8.49-8.49l8.49-8.48a4 4 0 115.66 5.65l-8.48 8.49a2 2 0 11-2.83-2.83l7.78-7.78" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSendMessage(input)
    }
  }

  const modelLabel = currentModel === 'balanced' ? 'Balanced' : 'Fast'

  return (
    <div className="chat-composer-wrap">
      <div className="chat-composer-inner">
        <div className="chat-composer-box">
          {imagePreview ? (
            <div className="chat-image-preview-row">
              <img src={imagePreview} alt="Attachment preview" className="chat-image-preview" />
              <button type="button" onClick={onImageRemove} disabled={disabled} className="chat-image-preview-remove">
                Remove
              </button>
            </div>
          ) : null}

          <div className="chat-composer-row">
            <button
              type="button"
              onClick={onAttachClick}
              disabled={disabled}
              className="chat-composer-icon-button"
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
              className="chat-composer-input"
              style={{ minHeight: '24px', maxHeight: '150px', overflowY: 'auto' }}
            />

            <div className="chat-model-select">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={disabled}
                className="chat-model-pill chat-model-pill--trigger"
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
                aria-label={`Response speed: ${modelLabel}`}
              >
                {modelLabel}
              </button>

              {dropdownOpen ? (
                <div className="chat-model-dropdown" role="listbox" aria-label="Choose response speed">
                  <button
                    type="button"
                    onClick={() => {
                      onModelChange('balanced')
                      setDropdownOpen(false)
                    }}
                    className={`chat-model-option${currentModel === 'balanced' ? ' chat-model-option--selected' : ''}`}
                    role="option"
                    aria-selected={currentModel === 'balanced'}
                  >
                    Balanced (Sonnet 4.6)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onModelChange('fast')
                      setDropdownOpen(false)
                    }}
                    className={`chat-model-option${currentModel === 'fast' ? ' chat-model-option--selected' : ''}`}
                    role="option"
                    aria-selected={currentModel === 'fast'}
                  >
                    Fast (Haiku 4.5)
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => onSendMessage(input)}
              disabled={disabled || (!input.trim() && !imagePreview)}
              className="chat-composer-icon-button"
              aria-label="Send message"
              title="Send message"
            >
              <SendIcon />
            </button>
          </div>

          {error ? <p className="chat-composer-error">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}
