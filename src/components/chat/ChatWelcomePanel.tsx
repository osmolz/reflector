import React from 'react'
import { greetingPrefixForHour, resolveWelcomePrompts, type WelcomePrompt } from './chatWelcome'

interface ChatWelcomePanelProps {
  displayName: string
  onSelectPrompt: (prompt: WelcomePrompt) => void
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

  const handleSelect = (prompt: WelcomePrompt) => {
    onSelectPrompt(prompt)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <section className="mx-auto mb-8 w-full max-w-[42rem] border border-[#e8e8e8] bg-[#f5f5f5] px-6 py-6">
      <h2 className="font-serif text-[20px] font-semibold leading-[1.3] text-[#1f1f1f]">
        {prefix}, {displayName}.
      </h2>
      <p className="mt-3 font-sans text-[14px] font-normal leading-[1.6] text-[#787878]">
        What should we discuss today?
      </p>

      <p className="mt-8 font-sans text-[12px] font-[200] uppercase tracking-[0.06em] leading-[1.5] text-[#b0b0b0]">
        Here are some questions I can answer:
      </p>

      <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
        {prompts.map((prompt) => (
          <li key={prompt.id} className="list-none m-0 p-0">
            <button
              type="button"
              onClick={() => handleSelect(prompt)}
              disabled={disabled}
              className="w-full border border-[#e8e8e8] px-4 py-3 text-left font-sans text-[14px] font-normal leading-[1.6] text-[#1f1f1f] transition-colors hover:border-[#e8e8e8] hover:bg-[#f4f4f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a0644e] focus-visible:ring-offset-2 disabled:opacity-40"
            >
              <span className="text-[14px] font-semibold">{prompt.text}</span>
              <span className="mt-1 block font-sans text-[12px] font-[200] leading-[1.5] text-[#b3b3b3]">
                {prompt.description}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
