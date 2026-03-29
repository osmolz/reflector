import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'olivermolz05@gmail.com';
const TEST_PASSWORD = 'Arsenal2004!';

test('Inspect page structure after login', async ({ page }) => {
  // Login
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill(TEST_EMAIL);
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(TEST_PASSWORD);
  const signInBtn = page.locator('button:has-text("Sign In")').first();
  await signInBtn.click();

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Get the page content
  const pageContent = await page.content();

  // Extract all h2 headings
  const h2s = await page.locator('h2').allTextContents();
  console.log('\n📋 All H2 Headings:');
  h2s.forEach((h2, i) => console.log(`  ${i + 1}. ${h2}`));

  // Extract all button text
  const buttons = await page.locator('button').allTextContents();
  console.log('\n🔘 All Buttons:');
  const uniqueButtons = [...new Set(buttons)].slice(0, 20);
  uniqueButtons.forEach((btn, i) => console.log(`  ${i + 1}. ${btn}`));

  // Look for input fields
  const inputs = await page.locator('input, textarea').count();
  console.log(`\n📝 Form Inputs Found: ${inputs}`);

  // Check for Voice Check-in component
  const voiceCheckIn = await page.locator('text=Voice, Check-in, check-in, voice').isVisible({ timeout: 2000 }).catch(() => false);
  console.log(`\n🎤 Voice/Check-in visible: ${voiceCheckIn}`);

  // Check for specific text we added
  const typeButton = await page.locator('button:has-text("Type")').count();
  const speakButton = await page.locator('button:has-text("Speak")').count();
  console.log(`\n✍️  Type buttons found: ${typeButton}`);
  console.log(`🎤 Speak buttons found: ${speakButton}`);

  // Scroll to see all content
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log(`\n📏 Page height: ${bodyHeight}px`);

  // Get visible element IDs and classes
  const allElements = await page.locator('*[class*="check"], *[class*="chat"], *[class*="form"]').count();
  console.log(`📦 Elements with check/chat/form classes: ${allElements}`);

  // Print all text content
  const allText = await page.textContent('body');
  const lines = allText.split('\n').filter(l => l.trim().length > 0);
  console.log(`\n📄 Page Text Content (first 30 lines):`);
  lines.slice(0, 30).forEach(line => console.log(`  ${line.substring(0, 80)}`));

  // Check if we're actually logged in
  const dashboardVisible = await page.locator('[class*="dashboard"], [class*="main"]').isVisible({ timeout: 2000 }).catch(() => false);
  console.log(`\n🏠 Dashboard visible: ${dashboardVisible}`);
});
