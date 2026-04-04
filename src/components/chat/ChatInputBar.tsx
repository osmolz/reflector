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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-8.49 8.49a6 6 0 01-8.49-8.49l8.49-8.48a4 4 0 115.66 5.65l-8.48 8.49a2 2 0 11-2.83-2.83l7.78-7.78" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

  const handleModelSelect = (model: 'balanced' | 'fast') => {
    onModelChange(model)
    setDropdownOpen(false)
  }

  const modelLabel = currentModel === 'balanced' ? 'Balanced' : 'Fast'

  return (
    <div className="mb-0 w-full shrink-0 bg-[var(--bg-secondary)] px-4 pb-5 pt-3">
      <div className="mx-auto w-full max-w-[42rem]">
        <div className="rounded-[16px] border border-[rgba(160,100,78,0.70)] bg-[rgba(160,100,78,0.12)] px-4 py-3 text-[#1a1a1a] sm:px-5 sm:py-3.5">
          {imagePreview && (
            <div className="mb-2 flex items-center gap-2">
              <img src={imagePreview} alt="Attachment preview" className="h-12 w-12 rounded-lg border border-[#e5e5e5] object-cover" />
              <button onClick={onImageRemove} disabled={disabled} className="text-xs text-[#737373] hover:text-[#d32f2f] transition-colors">
                Remove
              </button>
            </div>
          )}

          <div className="flex min-h-[36px] items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onAttachClick}
              disabled={disabled}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#e8e8e8] bg-white text-[#737373] transition-colors hover:border-[#d4d4d4] hover:bg-[#fafafa] hover:text-[#525252] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Attach image"
              title="Attach image"
            >
              <AttachmentIcon />
            </button>

            <div className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-[#cfc8bf] bg-[rgba(255,255,255,0.55)] px-4 py-2.5">
              <textarea
                ref={setTextareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={placeholder}
                rows={1}
                className="w-full resize-none bg-transparent text-[14px] leading-[1.5] text-[#1a1a1a] placeholder:text-[rgba(26,26,26,0.45)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                style={{ minHeight: '26px', maxHeight: '150px', overflowY: 'auto', fontFamily: 'var(--font-serif)' }}
              />
            </div>

            <div className="relative flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={disabled}
                className="inline-flex h-7 shrink-0 items-center justify-center rounded-full border border-[#e8e8e8] bg-white px-2.5 text-[11px] font-medium leading-none text-[#737373] transition-colors hover:border-[#d4d4d4] hover:bg-[#fafafa] hover:text-[#525252] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {modelLabel}
              </button>

              {dropdownOpen && (
                <div className="absolute bottom-full right-0 z-50 mb-1.5 w-max rounded-md border border-[#e8e8e8] bg-white py-0.5 shadow-md">
                  <button
                    type="button"
                    onClick={() => handleModelSelect('balanced')}
                    className={`flex h-7 w-full items-center whitespace-nowrap px-2.5 text-left text-[11px] font-medium leading-none transition-colors ${
                      currentModel === 'balanced' ? 'bg-[#f0f0f0] text-[#a0644e]' : 'text-[#525252] hover:bg-[#fafafa]'
                    }`}
                  >
                    Balanced (Sonnet 4.6)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModelSelect('fast')}
                    className={`flex h-7 w-full items-center whitespace-nowrap border-t border-[#e5e5e5] px-2.5 text-left text-[11px] font-medium leading-none transition-colors ${
                      currentModel === 'fast' ? 'bg-[#f0f0f0] text-[#a0644e]' : 'text-[#525252] hover:bg-[#fafafa]'
                    }`}
                  >
                    Fast (Haiku 4.5)
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => onSendMessage(input)}
                disabled={disabled || (!input.trim() && !imagePreview)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e8e8e8] bg-white text-[#737373] transition-colors hover:border-[#d4d4d4] hover:bg-[#fafafa] hover:text-[#525252] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Send message"
                title="Send message"
              >
                <SendIcon />
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-status-error mt-2">{error}</p>}
        </div>
      </div>
    </div>
  )
}
