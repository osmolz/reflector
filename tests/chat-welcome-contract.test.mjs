import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

test('chat welcome helper keeps exact 3-prompt invariant', async () => {
  const helperPath = resolve(__dirname, '../src/components/chat/chatWelcome.ts')
  const source = await readFile(helperPath, 'utf8')

  assert.match(
    source,
    /if \(prompts\.length !== 3\)/,
    'Expected explicit invariant guard that throws when prompt count is not exactly 3'
  )
  assert.match(
    source,
    /got \$\{prompts\.length\}/,
    'Expected error message to report prompt count mismatch'
  )
})

test('greeting boundaries are implemented as specified', async () => {
  const helperPath = resolve(__dirname, '../src/components/chat/chatWelcome.ts')
  const source = await readFile(helperPath, 'utf8')

  assert.match(source, /hour >= 5 && hour < 12/, 'Expected morning boundary 5 <= hour < 12')
  assert.match(source, /hour >= 12 && hour < 17/, 'Expected afternoon boundary 12 <= hour < 17')
  assert.match(source, /return 'Good evening'/, 'Expected evening fallback')
})

test('welcome prompt selection prefills and focuses without auto-send', async () => {
  const panelPath = resolve(__dirname, '../src/components/chat/ChatWelcomePanel.tsx')
  const panelSource = await readFile(panelPath, 'utf8')
  const chatPath = resolve(__dirname, '../src/components/Chat.tsx')
  const chatSource = await readFile(chatPath, 'utf8')

  assert.match(
    panelSource,
    /onSelectPrompt\(text\)/,
    'Expected prompt click to call onSelectPrompt with the prompt text'
  )
  assert.match(
    panelSource,
    /requestAnimationFrame\(\(\) => inputRef\.current\?\.focus\(\)\)/,
    'Expected prompt click to focus textarea on next animation frame'
  )
  assert.doesNotMatch(
    panelSource,
    /sendMessage\(/,
    'Prompt click must not auto-send a message'
  )
  assert.match(
    chatSource,
    /setInput\(text\)/,
    'Expected onSelectPrompt wiring to prefill composer input'
  )
})
