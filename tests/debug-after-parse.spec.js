import { test } from '@playwright/test';

const TEST_EMAIL = 'olivermolz05@gmail.com';
const TEST_PASSWORD = 'Arsenal2004!';

test('Debug: Check page state after parsing', async ({ page }) => {
  console.log('\n🔍 Debugging page state after parse click');

  // Capture all console
  page.on('console', msg => {
    console.log(`📋 [${msg.type()}] ${msg.text()}`);
  });

  // Login
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.locator('button:has-text("Sign In")').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click Type and enter text
  const typeBtn = page.locator('button:has-text("Type")');
  await typeBtn.click();
  const textarea = page.locator('textarea').first();
  await textarea.fill('Woke at 7am. Worked 8 hours. Lunch noon. Gym at 5pm.');

  // Click Parse
  console.log('\n⏳ Clicking Parse...');
  const parseBtn = page.locator('button:has-text("Parse and review")');
  await parseBtn.click();

  // Wait and check page content at different intervals
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(5000);

    const bodyText = await page.textContent('body');
    const hasReview = bodyText.includes('Review');
    const hasActivity = bodyText.includes('Activity') || bodyText.includes('activity');
    const hasError = bodyText.includes('error') || bodyText.includes('Error') || bodyText.includes('failed');
    const hasParsing = bodyText.includes('Parsing') || bodyText.includes('parsing');

    console.log(`\n⏱️  After ${(i+1)*5}s:`);
    console.log(`   Has "Review": ${hasReview}`);
    console.log(`   Has "Activity": ${hasActivity}`);
    console.log(`   Has "Error": ${hasError}`);
    console.log(`   Has "Parsing": ${hasParsing}`);

    // List all visible headings
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    if (headings.length > 0) {
      console.log(`   Headings: ${headings.join(' | ')}`);
    }

    // Check for buttons
    const buttons = await page.locator('button').allTextContents();
    const uniqueButtons = [...new Set(buttons)];
    console.log(`   Buttons: ${uniqueButtons.slice(0, 6).join(', ')}`);

    if (hasReview) {
      console.log('\n✅ Review found! Stopping.');
      break;
    }

    if (hasError) {
      console.log('\n❌ Error detected. Looking for error message...');
      const errorElements = await page.locator('[class*="error"]').allTextContents();
      errorElements.forEach(err => console.log(`   Error: ${err.substring(0, 100)}`));
      break;
    }
  }

  // Final state
  console.log('\n📸 Final page content preview:');
  const finalText = await page.textContent('body');
  const lines = finalText.split('\n').filter(l => l.trim().length > 0);
  lines.slice(0, 20).forEach(line => console.log(`   ${line.substring(0, 80)}`));
});
