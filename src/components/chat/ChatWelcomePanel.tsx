import React from 'react'
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
    <section className="mx-auto mb-8 w-full max-w-[42rem] border border-[#e5e5e5] bg-[#f5f5f5] px-4 py-5">
      <h2 className="font-serif text-[20px] font-bold leading-[1.3] text-[#1a1a1a]">
        {prefix}, {displayName}.
      </h2>
      <p className="mt-2 font-sans text-[14px] font-normal leading-[1.6] text-[#737373]">
        What should we discuss today?
      </p>

      <p className="mt-6 font-sans text-[12px] font-[200] uppercase tracking-wide leading-[1.5] text-[#a6a6a6]">
        Here are some questions I can answer:
      </p>

      <ul className="mt-3 list-none p-0 m-0 flex flex-col gap-2">
        {prompts.map((prompt) => (
          <li key={prompt.text} className="list-none m-0 p-0">
            <button
              type="button"
              onClick={() => handleSelect(prompt.text)}
              disabled={disabled}
              className="w-full border border-[#e5e5e5] px-3 py-2.5 text-left font-sans text-[14px] font-normal leading-[1.6] text-[#1a1a1a] transition-colors hover:border-[#e5e5e5] hover:bg-[#f0f0f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a0644e] focus-visible:ring-offset-2 disabled:opacity-40"
            >
              <span className="font-medium">{prompt.text}</span>
              <span className="mt-0.5 block font-sans text-[12px] font-[200] leading-[1.5] text-[#a6a6a6]">
                {prompt.description}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
