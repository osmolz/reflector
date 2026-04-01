/**
 * One-off: replace common emoji in console.log strings with ASCII tags.
 * Run: node scripts/strip-emojis-from-js.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const REPLACEMENTS = [
  ['🧪', '[TEST]'],
  ['✅', '[OK]'],
  ['❌', '[FAIL]'],
  ['⚠️', '[WARN]'],
  ['⚠', '[WARN]'],
  ['⏳', '...'],
  ['📋', '[log]'],
  ['🔴', '[ERR]'],
  ['✍️', '[input]'],
  ['✍', '[input]'],
  ['ℹ️', '[info]'],
  ['ℹ', '[info]'],
  ['✓', '[ok]'],
  ['ⓘ', '[i]'],
  ['🎉', '[done]'],
  ['💡', '[tip]'],
  ['🔍', '[find]'],
  ['📊', '[data]'],
  ['🚀', '[run]'],
  ['📝', '[note]'],
  ['🔘', '[btn]'],
  ['📏', '[dim]'],
  ['📦', '[box]'],
  ['📄', '[doc]'],
  ['🏠', '[home]'],
  ['💥', '[ERR]'],
  ['🎨', '[ui]'],
  ['📸', '[shot]'],
  ['📍', '[step]'],
  ['📥', '[in]'],
  ['🔓', '[auth]'],
  ['🟡', '[WARN]'],
  ['💬', '[chat]'],
  ['💾', '[save]'],
  ['⏱️', '[time]'],
  ['⏱', '[time]'],
  ['📈', '[sum]'],
  ['⚡', '[fast]'],
  ['🎯', '[tgt]'],
  ['🔄', '[sync]'],
  ['📌', '[pin]'],
  ['📤', '[out]'],
  ['🔎', '[find]'],
  ['🔐', '[lock]'],
  ['📡', '[net]'],
  ['🎤', '[mic]'],
  ['📅', '[cal]'],
  ['🏢', '[work]'],
  ['🎬', '[film]'],
  ['🤔', '[think]'],
  ['🔗', '[link]'],
  ['🐛', '[bug]'],
  ['✨', '[*]'],
  ['📞', '[tel]'],
  ['🟢', '[OK]'],
  ['📁', '[dir]'],
  ['🔧', '[fix]'],
  ['🚫', '[no]'],
  ['⏭️', '[next]'],
  ['⏭', '[next]'],
  ['☐', '[ ]'],
  ['❓', '[?]'],
  ['🔥', '[hot]'],
  ['↔', '<->'],
]

function stripLine(line) {
  let s = line
  for (const [from, to] of REPLACEMENTS) {
    if (s.includes(from)) s = s.split(from).join(to)
  }
  s = s.replace(/═+/g, (m) => '='.repeat(m.length))
  return s
}

function processFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const lines = raw.split('\n')
  const next = lines.map(stripLine)
  const out = next.join('\n')
  if (out !== raw) {
    fs.writeFileSync(filePath, out, 'utf8')
    console.log('updated', path.relative(root, filePath))
  }
}

function walk(dir) {
  const names = fs.readdirSync(dir, { withFileTypes: true })
  for (const ent of names) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full)
    else if (ent.isFile() && ent.name.endsWith('.js')) processFile(full)
  }
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'playwright-report',
  'test-results',
])

function walkMarkdown(dir) {
  const names = fs.readdirSync(dir, { withFileTypes: true })
  for (const ent of names) {
    if (SKIP_DIRS.has(ent.name)) continue
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walkMarkdown(full)
    else if (ent.isFile() && ent.name.endsWith('.md')) processFile(full)
  }
}

const extra = [
  'test-with-logs.js',
  'debug-fixes.js',
  'verify-fixes.js',
  'test-chat-fixes.js',
  'screenshot.js',
  'screenshot2.js',
  'verify-phase-1-final.js',
]

walk(path.join(root, 'tests'))
for (const f of extra) {
  const p = path.join(root, f)
  if (fs.existsSync(p)) processFile(p)
}
walkMarkdown(root)
