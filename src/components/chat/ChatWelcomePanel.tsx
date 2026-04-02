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
    <section className="mx-auto mb-8 max-w-2xl border border-border-subtle/80 bg-background/70 px-5 py-6">
      <h2 className="font-serif text-[2rem] font-semibold leading-[1.15] tracking-tight text-text-primary/95">
        {prefix}, {displayName}.
      </h2>
      <p className="mt-3 font-sans text-body text-text-secondary/85">What should we discuss today?</p>

      <p className="mt-6 font-sans text-[11px] font-light uppercase tracking-[0.08em] text-text-muted">
        Here are some questions I can answer:
      </p>

      <div className="mt-3 space-y-2.5">
        {prompts.map((prompt) => (
          <button
            key={prompt.text}
            type="button"
            onClick={() => handleSelect(prompt.text)}
            disabled={disabled}
            className="w-full border border-border-subtle/85 bg-transparent px-4 py-3 text-left transition-colors hover:border-border hover:bg-surface-hover/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40"
          >
            <div className="font-sans text-body font-medium text-text-primary/95">{prompt.text}</div>
            <div className="mt-1 font-sans text-[12px] font-light leading-relaxed text-text-muted">
              {prompt.description}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
