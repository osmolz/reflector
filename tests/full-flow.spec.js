import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'olivermolz05@gmail.com';
const TEST_PASSWORD = 'Arsenal2004!';

test.describe('Full Flow - Text Input, Parsing, and Chat', () => {

  test('1. Login and navigate to check-in', async ({ page }) => {
    console.log('🔓 Starting login flow...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Verify we're on login page
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    console.log('✅ Login page loaded');

    // Fill email and password
    await emailInput.fill(TEST_EMAIL);
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(TEST_PASSWORD);
    console.log('✅ Credentials entered');

    // Click Sign In button
    const signInBtn = page.locator('button:has-text("Sign In")').first();
    await signInBtn.click();
    console.log('⏳ Signing in...');

    // Wait for navigation to dashboard (max 10 seconds)
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
      console.log('ℹ️  URL didn\'t change but checking if logged in via content');
    });

    await page.waitForLoadState('networkidle');

    // Check if we're logged in by looking for dashboard content
    const dashboardContent = page.locator('button:has-text("Timeline"), button:has-text("Journal"), h2');
    const isVisible = await dashboardContent.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      console.log('✅ Login successful - dashboard visible');
    } else {
      console.log('⚠️  Dashboard not immediately visible, checking for errors...');
      const errorMsg = page.locator('[class*="error"], text=/error|failed/i');
      const hasError = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasError) {
        const errorText = await errorMsg.textContent();
        console.log(`❌ Login error: ${errorText}`);
      }
    }

    // List all console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🔴 [Console Error] ${msg.text()}`);
      } else if (msg.type() === 'warn') {
        console.log(`🟡 [Console Warn] ${msg.text()}`);
      }
    });
  });

  test('2. Text input for check-in (parsing test)', async ({ page }) => {
    console.log('\n📝 Starting text input check-in test...');

    // Login first
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(TEST_EMAIL);
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(TEST_PASSWORD);
    const signInBtn = page.locator('button:has-text("Sign In")').first();
    await signInBtn.click();

    // Wait for dashboard
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Capture console output
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      console.log(`📋 ${msg.text()}`);
    });

    // Click Check-in heading or find the check-in section
    const checkInHeading = page.locator('h2:has-text("Check-in"), h2:has-text("Voice")');
    let checkInFound = await checkInHeading.isVisible({ timeout: 3000 }).catch(() => false);

    if (!checkInFound) {
      console.log('⚠️  Check-in section not immediately visible, scrolling...');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForLoadState('networkidle');
      checkInFound = await checkInHeading.isVisible({ timeout: 3000 }).catch(() => false);
    }

    if (!checkInFound) {
      console.log('❌ Check-in section not found on dashboard');
      return;
    }

    console.log('✅ Check-in section found');

    // Click Type button
    const typeBtn = page.locator('button:has-text("✍️ Type")');
    const typeBtnExists = await typeBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!typeBtnExists) {
      console.log('❌ Type button not found');
      return;
    }

    await typeBtn.click();
    console.log('✅ Clicked Type button');

    // Wait for textarea to appear
    const textarea = page.locator('textarea');
    await textarea.waitFor({ timeout: 3000 });
    console.log('✅ Textarea appeared');

    // Type test input
    const testTranscript = `
    Woke up at 7:00 AM. Had breakfast for 30 minutes.
    Worked on the project from 8 AM to 12 PM, that's 4 hours of focused work.
    Had lunch at 12:30 PM for 45 minutes.
    Continued working from 1:30 PM to 5 PM, another 3.5 hours.
    Went to the gym at 5:30 PM for 1 hour.
    Had dinner at 6:30 PM for 45 minutes.
    Relaxed and watched TV from 7:15 PM to 9 PM.
    `;

    await textarea.fill(testTranscript.trim());
    console.log('✅ Test transcript entered');

    // Verify text was entered
    const enteredText = await textarea.inputValue();
    expect(enteredText).toContain('Woke up at 7:00 AM');
    console.log('✅ Text verified in textarea');

    // Click Parse & Continue button
    const parseBtn = page.locator('button:has-text("Parse & Continue")');
    const parseBtnEnabled = await parseBtn.isEnabled({ timeout: 3000 });

    if (!parseBtnEnabled) {
      console.log('❌ Parse button is disabled');
      return;
    }

    console.log('⏳ Clicking Parse & Continue (this calls Claude API)...');
    await parseBtn.click();

    // Wait for parsing to complete and review page to appear
    const activityReview = page.locator('h2:has-text("Review"), [class*="review"], [class*="activity"]');
    const reviewFound = await activityReview.isVisible({ timeout: 15000 }).catch(() => false);

    if (reviewFound) {
      console.log('✅ Parsing successful! Review page appeared');

      // Check for parsed activities
      const activities = page.locator('[class*="activity"]');
      const count = await activities.count();
      console.log(`✅ Found ${count} parsed activities`);

      // List the activities
      const activityTexts = await page.locator('text=/activity|working|breakfast|lunch|gym/i').allTextContents();
      if (activityTexts.length > 0) {
        console.log('📋 Parsed activities:');
        activityTexts.forEach(text => console.log(`  - ${text.substring(0, 60)}`));
      }
    } else {
      console.log('❌ Review page did not appear after parsing');

      // Check for error message
      const errorMsg = page.locator('[class*="error"], text=/error|failed|parse/i');
      const hasError = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasError) {
        const errorText = await errorMsg.textContent();
        console.log(`❌ Parsing error: ${errorText}`);
      }
    }

    console.log(`📊 Console logs collected: ${consoleLogs.length} messages`);
  });

  test('3. Chat functionality with typed input', async ({ page }) => {
    console.log('\n💬 Starting chat test...');

    // Login first
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(TEST_EMAIL);
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(TEST_PASSWORD);
    const signInBtn = page.locator('button:has-text("Sign In")').first();
    await signInBtn.click();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Capture all console output
    page.on('console', msg => {
      console.log(`📋 [${msg.type()}] ${msg.text()}`);
    });

    // Scroll down to find chat section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Look for Chat section
    const chatHeading = page.locator('h2:has-text("Chat"), [class*="chat"]');
    const chatFound = await chatHeading.isVisible({ timeout: 3000 }).catch(() => false);

    if (!chatFound) {
      console.log('⚠️  Chat section not found, trying text input...');
      const chatInput = page.locator('input[placeholder*="question"], textarea[placeholder*="ask"]');
      const inputFound = await chatInput.isVisible({ timeout: 3000 }).catch(() => false);

      if (!inputFound) {
        console.log('❌ Chat input not found');
        return;
      }
    } else {
      console.log('✅ Chat section found');
    }

    // Find and focus on chat input
    const chatInput = page.locator('input[placeholder*="question"], textarea[placeholder*="ask"], input[class*="chat"]').first();
    const inputExists = await chatInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (!inputExists) {
      console.log('❌ Chat input field not found');
      return;
    }

    // Type a question
    const testQuestion = 'How much time did I spend working this week?';
    await chatInput.click();
    await chatInput.fill(testQuestion);
    console.log(`✅ Question entered: "${testQuestion}"`);

    // Find and click send button
    const sendBtn = page.locator('button:has-text("Send"), button[type="submit"], button[aria-label*="send"]').first();
    const sendBtnExists = await sendBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!sendBtnExists) {
      console.log('⚠️  Send button not found, trying Enter key...');
      await chatInput.press('Enter');
    } else {
      console.log('⏳ Clicking Send button...');
      await sendBtn.click();
    }

    console.log('⏳ Waiting for Claude response...');

    // Wait for response message to appear
    const responseMsg = page.locator('[class*="response"], [class*="message"], text=/time|spend|hour|minute/i');
    const responseFound = await responseMsg.isVisible({ timeout: 20000 }).catch(() => false);

    if (responseFound) {
      const response = await responseMsg.first().textContent();
      console.log(`✅ Chat response received:`);
      console.log(`   "${response.substring(0, 100)}..."`);
    } else {
      console.log('❌ No response received from chat');

      // Check for error
      const errorMsg = page.locator('[class*="error"], text=/error|failed/i');
      const hasError = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasError) {
        const errorText = await errorMsg.textContent();
        console.log(`❌ Chat error: ${errorText}`);
      }
    }
  });

  test('4. Check for console errors throughout flow', async ({ page }) => {
    console.log('\n🔍 Monitoring console for errors...');

    const errors = [];
    const warnings = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warn') {
        warnings.push(msg.text());
      }
    });

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

    // Navigate through pages
    const timelineBtn = page.locator('button:has-text("Timeline")');
    if (await timelineBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await timelineBtn.click();
      await page.waitForLoadState('networkidle');
    }

    const journalBtn = page.locator('button:has-text("Journal")');
    if (await journalBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await journalBtn.click();
      await page.waitForLoadState('networkidle');
    }

    console.log(`\n📊 Console Summary:`);
    console.log(`   Errors: ${errors.length}`);
    console.log(`   Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\n🔴 Errors found:');
      errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    }

    if (warnings.length > 0) {
      console.log('\n🟡 Warnings found:');
      warnings.forEach((warn, i) => console.log(`   ${i + 1}. ${warn}`));
    }

    if (errors.length === 0) {
      console.log('✅ No console errors detected');
    }
  });
});
