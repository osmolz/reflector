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

  const handleModelSelect = (model: 'balanced' | 'fast') => {
    onModelChange(model)
    setDropdownOpen(false)
  }

  const modelLabel = currentModel === 'balanced' ? 'Balanced' : 'Fast'

  return (
    <div className="w-full shrink-0 border-t border-[#e5e5e5] bg-[#f5f5f5] px-4 pb-5 pt-3">
      <div className="mx-auto w-full max-w-[42rem]">
        <div className="rounded-2xl border border-[rgba(160,100,78,0.65)] bg-[rgba(160,100,78,0.12)] px-4 py-3 text-[#1a1a1a]">
          {imagePreview && (
            <div className="mb-2 flex items-center gap-2">
              <img src={imagePreview} alt="Attachment preview" className="h-12 w-12 rounded-lg border border-[#e5e5e5] object-cover" />
              <button onClick={onImageRemove} disabled={disabled} className="text-xs text-[#737373] hover:text-[#d32f2f] transition-colors">
                Remove
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              onClick={onAttachClick}
              disabled={disabled}
              className="shrink-0 rounded p-2 text-[#737373] transition-colors hover:bg-[#f0f0f0] hover:text-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Attach image"
              title="Attach image"
            >
              <AttachmentIcon />
            </button>

            <div className="flex-1 border border-[#d7d0c7] bg-transparent px-3 py-1.5">
              <textarea
                ref={setTextareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={placeholder}
                rows={1}
                className="w-full resize-none bg-transparent font-serif text-sm leading-relaxed text-[#1a1a1a] placeholder:text-[rgba(26,26,26,0.6)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                style={{ minHeight: '24px', maxHeight: '150px', overflowY: 'auto' }}
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={disabled}
                className="shrink-0 rounded-full border border-[#e5e5e5] bg-[#f0f0f0] px-3 py-1 text-[12px] font-[200] leading-[1.5] text-[#737373] transition-colors hover:text-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {modelLabel}
              </button>

              {dropdownOpen && (
                <div className="absolute bottom-full right-0 z-50 mb-2 w-48 rounded border border-[#e5e5e5] bg-[#f5f5f5] shadow-lg">
                  <button
                    onClick={() => handleModelSelect('balanced')}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      currentModel === 'balanced' ? 'bg-[#f0f0f0] text-[#a0644e]' : 'text-[#1a1a1a] hover:bg-[#f0f0f0]'
                    }`}
                  >
                    Balanced (Sonnet 4.6)
                  </button>
                  <button
                    onClick={() => handleModelSelect('fast')}
                    className={`w-full border-t border-[#e5e5e5] px-4 py-2 text-left text-sm transition-colors ${
                      currentModel === 'fast' ? 'bg-[#f0f0f0] text-[#a0644e]' : 'text-[#1a1a1a] hover:bg-[#f0f0f0]'
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
              className="shrink-0 rounded p-2 text-[#737373] transition-colors hover:bg-[#f0f0f0] hover:text-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-30"
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
