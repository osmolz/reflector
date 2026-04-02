import type React from 'react'
import { greetingPrefixForHour, resolveWelcomePrompts } from './chatWelcome'

interface ChatWelcomePanelProps {
  displayName: string
  onSelectPrompt: (text: string) => void
  disabled?: boolean
  inputRef: React.RefObject<HTMLTextAreaElement | null>
}

export function ChatWelcomePanel({
  displayName,
  onSelectPrompt,
  disabled = false,
  inputRef,
}: ChatWelcomePanelProps) {
  const prefix = greetingPrefixForHour(new Date().getHours())
  const prompts = resolveWelcomePrompts()

  const handleSelect = (text: string) => {
    onSelectPrompt(text)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <section className="mx-auto mb-8 max-w-2xl border border-border bg-background px-4 py-5">
      <h2 className="font-serif text-h2 text-text-primary">
        {prefix}, {displayName}.
      </h2>
      <p className="mt-2 font-sans text-body text-text-secondary">What should we discuss today?</p>

      <p className="mt-5 font-sans text-label uppercase tracking-wide text-text-secondary">
        Here are some questions I can answer:
      </p>

      <div className="mt-3 space-y-2">
        {prompts.map((prompt) => (
          <button
            key={prompt.text}
            type="button"
            onClick={() => handleSelect(prompt.text)}
            disabled={disabled}
            className="w-full border border-border px-3 py-3 text-left transition-colors hover:border-border-strong hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
          >
            <div className="font-medium text-text-primary">{prompt.text}</div>
            <div className="mt-1 text-sm text-text-secondary">{prompt.description}</div>
          </button>
        ))}
      </div>
    </section>
  )
}
