import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('supabase auth config persists session across reloads', async () => {
  const filePath = resolve(__dirname, '../src/lib/supabase.js');
  const source = await readFile(filePath, 'utf8');

  assert.match(
    source,
    /persistSession:\s*true/,
    'Expected persistSession: true so reload keeps the user logged in'
  );

  assert.doesNotMatch(
    source,
    /clearSupabaseBrowserAuthStorage\(\)/,
    'Expected no startup auth storage wipe, which forces logout on reload'
  );
});
