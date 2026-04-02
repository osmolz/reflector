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

      <p className="mt-6 font-sans text-label uppercase tracking-wide text-text-secondary">
        Here are some questions I can answer:
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {prompts.map((prompt) => (
          <li key={prompt.text}>
            <button
              type="button"
              onClick={() => handleSelect(prompt.text)}
              disabled={disabled}
              className="w-full border border-border-subtle px-3 py-2.5 text-left font-sans text-body text-text-primary transition-colors hover:border-border hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40"
            >
              <span className="font-medium">{prompt.text}</span>
              <span className="mt-0.5 block font-sans text-label font-thin text-text-secondary">
                {prompt.description}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
