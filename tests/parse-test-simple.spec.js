import { test } from '@playwright/test';

const TEST_EMAIL = 'olivermolz05@gmail.com';
const TEST_PASSWORD = 'Arsenal2004!';

test('Simple parse test with error details', async ({ page }) => {
  console.log('\n🧪 Simple Parse Test');
  console.log('═'.repeat(60));

  // Capture console
  page.on('console', msg => {
    console.log(`📋 [${msg.type()}] ${msg.text()}`);
  });

  // Capture all responses
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('parse')) {
      const status = response.status();
      console.log(`\n📥 Parse Response: ${status}`);
      try {
        const text = await response.text();
        console.log(`Response body: ${text}`);
      } catch (e) {
        console.log(`(Could not read body)`);
      }
    }
  });

  // Login
  console.log('\n🔓 Logging in...');
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.locator('button:has-text("Sign In")').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  console.log('✅ Logged in');

  // Get session info
  const sessionToken = await page.evaluate(async () => {
    const { data } = await window.location;
    return null; // Placeholder
  });

  // Test parse
  console.log('\n📝 Typing text...');
  const typeBtn = page.locator('button:has-text("✍️ Type")');
  await typeBtn.click();
  await page.waitForTimeout(1000);

  const textarea = page.locator('textarea').first();
  await textarea.fill('Woke up at 7am. Worked for 8 hours. Lunch at noon.');

  console.log('⏳ Clicking Parse...');
  const parseBtn = page.locator('button:has-text("Parse & Continue")');
  await parseBtn.click();

  console.log('⏳ Waiting for response (30s)...');
  await page.waitForTimeout(30000);

  // Check for any visible error
  const errorText = await page.locator('[class*="error"], text=/error|failed|unauthorized/i').textContent({ timeout: 1000 }).catch(() => null);
  if (errorText) {
    console.log(`\n❌ Error visible on page: ${errorText}`);
  }
});
