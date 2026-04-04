import React from 'react'
import { greetingPrefixForHour, resolveWelcomePrompts, type WelcomePrompt } from './chatWelcome'
import './ChatWelcomePanel.css'

interface ChatWelcomePanelProps {
  displayName: string
  onSelectPrompt: (prompt: WelcomePrompt) => void
  disabled?: boolean
  /** Textarea to focus after choosing a starter prompt */
  inputRef: { current: HTMLTextAreaElement | null }
}

export function ChatWelcomePanel({
  displayName,
  onSelectPrompt,
  disabled = false,
  inputRef,
}: ChatWelcomePanelProps) {
  const prefix = greetingPrefixForHour(new Date().getHours())
  const prompts = resolveWelcomePrompts()

  const handleSelect = (prompt: WelcomePrompt) => {
    onSelectPrompt(prompt)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <section className="chat-welcome-panel" aria-labelledby="chat-welcome-heading">
      <h2 id="chat-welcome-heading" className="chat-welcome-greeting">
        {prefix}, {displayName}.
      </h2>
      <p className="chat-welcome-lede">What should we discuss today?</p>

      <p className="chat-welcome-prompts-label">Here are some questions I can answer:</p>

      <ul className="chat-welcome-prompt-list">
        {prompts.map((prompt) => (
          <li key={prompt.id}>
            <button
              type="button"
              onClick={() => handleSelect(prompt)}
              disabled={disabled}
              className="chat-welcome-prompt-btn"
            >
              <span className="chat-welcome-prompt-title">{prompt.text}</span>
              <span className="chat-welcome-prompt-desc">{prompt.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
