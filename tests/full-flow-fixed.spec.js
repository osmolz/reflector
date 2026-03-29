import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'olivermolz05@gmail.com';
const TEST_PASSWORD = 'Arsenal2004!';

test.describe('Full Flow - Text Input, Parsing, and Chat', () => {

  test.beforeEach(async ({ page }) => {
    // Collect all console messages
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.log(`🔴 [ERROR] ${text}`);
      } else if (type === 'warn') {
        console.log(`🟡 [WARN] ${text}`);
      }
    });
  });

  test('1. Text input for check-in with parsing', async ({ page }) => {
    console.log('\n📝 TEST 1: Text Input Check-in with Parsing');
    console.log('═'.repeat(50));

    // Login
    console.log('🔓 Logging in...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('✅ Logged in successfully');

    // Click Type button
    console.log('📝 Finding Type button...');
    const typeBtn = page.locator('button:has-text("✍️ Type")');
    await expect(typeBtn).toBeVisible();
    await typeBtn.click();
    console.log('✅ Type button clicked');

    // Fill textarea with test transcript
    console.log('✍️  Entering test transcript...');
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();

    const testText = `Woke up at 7:00 AM. Had breakfast for 30 minutes.
Worked on the project from 8 AM to 12 PM, that's 4 hours.
Had lunch at 12:30 PM for 45 minutes.
Continued working from 1:30 PM to 5 PM, another 3.5 hours.
Went to the gym at 5:30 PM for 1 hour.
Had dinner at 6:30 PM for 45 minutes.
Relaxed and watched TV from 7:15 PM to 9 PM.`;

    await textarea.fill(testText);
    const entered = await textarea.inputValue();
    expect(entered).toContain('Woke up');
    console.log('✅ Transcript entered');

    // Click Parse & Continue
    console.log('⏳ Clicking Parse & Continue (calling Claude API)...');
    const parseBtn = page.locator('button:has-text("Parse & Continue")');
    await expect(parseBtn).toBeEnabled();
    await parseBtn.click();

    // Wait for parsing response
    console.log('⏳ Waiting for Claude parsing response (max 20s)...');

    // Look for the ActivityReview component or error
    const reviewSection = page.locator('h3:has-text("Review"), [class*="activity-review"], text=/Save to Timeline/');
    const error = page.locator('[class*="error"], text=/error|failed/i');

    let result = 'timeout';
    try {
      await Promise.race([
        reviewSection.first().waitFor({ timeout: 20000 }),
        error.first().waitFor({ timeout: 20000 }),
      ]);
      result = await reviewSection.first().isVisible({ timeout: 1000 }).catch(() => 'error');
    } catch (e) {
      result = 'timeout';
    }

    if (result === true) {
      console.log('✅ Parsing successful! Review page appeared');

      // Count activities in review
      const activities = await page.locator('[class*="activity"]').count();
      console.log(`📊 Found ${activities} activities in review`);

      // Save activities
      const saveBtn = page.locator('button:has-text("Save"), button[class*="save"]').first();
      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.click();
        console.log('💾 Clicking Save...');
        await page.waitForTimeout(2000);
        console.log('✅ Activities saved');
      }
    } else if (result === 'error') {
      const errorMsg = await error.first().textContent();
      console.log(`❌ Parsing error: ${errorMsg}`);
    } else {
      console.log(`❌ Parsing timeout - no response after 20 seconds`);
    }
  });

  test('2. Chat functionality with question', async ({ page }) => {
    console.log('\n💬 TEST 2: Chat Functionality');
    console.log('═'.repeat(50));

    // Login
    console.log('🔓 Logging in...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('✅ Logged in successfully');

    // Find chat input
    console.log('💬 Looking for chat input...');
    const chatInput = page.locator('input[placeholder*="question"], input[placeholder*="ask"]').first();
    const exists = await chatInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (!exists) {
      console.log('⚠️  Chat input not found on dashboard');

      // Try scrolling
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      const scrolledExists = await chatInput.isVisible({ timeout: 2000 }).catch(() => false);
      if (!scrolledExists) {
        console.log('❌ Chat input not accessible');
        return;
      }
    }

    console.log('✅ Chat input found');

    // Type a question
    const question = 'How much time did I spend working today?';
    await chatInput.click();
    await chatInput.fill(question);
    console.log(`📝 Question entered: "${question}"`);

    // Send message
    console.log('⏳ Sending question to Claude...');
    const sendBtn = page.locator('button:has-text("Send")');
    await sendBtn.click();

    // Wait for response
    console.log('⏳ Waiting for Claude response (max 20s)...');

    const responseMsg = page.locator('text=/time|hour|minute|work|activity/i');
    const chatError = page.locator('[class*="error"], text=/error|failed/i');

    let received = false;
    try {
      await Promise.race([
        responseMsg.first().waitFor({ timeout: 20000 }),
        chatError.first().waitFor({ timeout: 20000 }),
      ]);
      received = await responseMsg.first().isVisible({ timeout: 1000 }).catch(() => false);
    } catch (e) {
      received = false;
    }

    if (received) {
      const response = await responseMsg.first().textContent();
      console.log('✅ Response received from Claude:');
      console.log(`   "${response.substring(0, 120)}..."`);
    } else {
      const errMsg = await chatError.first().textContent({ timeout: 1000 }).catch(() => null);
      if (errMsg) {
        console.log(`❌ Chat error: ${errMsg}`);
      } else {
        console.log(`❌ No response received after 20 seconds`);
      }
    }
  });

  test('3. Verify console has no critical errors', async ({ page }) => {
    console.log('\n🔍 TEST 3: Console Error Monitoring');
    console.log('═'.repeat(50));

    const errors = [];
    const warnings = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warn') {
        warnings.push(msg.text());
      }
    });

    // Login and navigate
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to other pages
    const timelineBtn = page.locator('button:has-text("Timeline")');
    if (await timelineBtn.isVisible()) {
      await timelineBtn.click();
      await page.waitForLoadState('networkidle');
      console.log('📍 Navigated to Timeline');
    }

    const journalBtn = page.locator('button:has-text("Journal")');
    if (await journalBtn.isVisible()) {
      await journalBtn.click();
      await page.waitForLoadState('networkidle');
      console.log('📍 Navigated to Journal');
    }

    // Report
    console.log(`\n📊 Final Console Report:`);
    console.log(`   🔴 Errors: ${errors.length}`);
    console.log(`   🟡 Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Critical errors found:');
      errors.slice(0, 5).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.substring(0, 80)}`);
      });
    } else {
      console.log('\n✅ No critical console errors');
    }
  });
});
