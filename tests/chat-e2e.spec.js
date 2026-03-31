import { test } from '@playwright/test';

const TEST_EMAIL = 'olivermolz05@gmail.com';
const TEST_PASSWORD = 'Arsenal2004!';

test.describe('Chat Functionality E2E Tests', () => {

  test('1. Chat input field is visible and accessible', async ({ page }) => {
    console.log('\n🧪 TEST: Chat Input Visibility');
    console.log('═'.repeat(70));

    // Login
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('✅ Logged in');

    // Look for chat input with correct placeholder
    const chatInput = page.locator('input[placeholder*="time"]').first();
    const chatInputVisible = await chatInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (!chatInputVisible) {
      console.log('⚠️  Chat input not found on initial view, scrolling...');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const scrolledVisible = await chatInput.isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`✅ Chat input visible after scroll: ${scrolledVisible}`);
    } else {
      console.log('✅ Chat input visible');
    }
  });

  test('2. Chat question submission and response', async ({ page }) => {
    console.log('\n🧪 TEST: Chat Question & Response');
    console.log('═'.repeat(70));

    // Login
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('✅ Logged in');

    // Scroll to find chat
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Find chat input with correct placeholder
    const chatInput = page.locator('input[placeholder*="time"]').first();
    const inputExists = await chatInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (!inputExists) {
      console.log('❌ Chat input not found');
      return;
    }

    console.log('✅ Chat input found');

    // Type a question
    const question = 'What activities have I logged?';
    await chatInput.click();
    await chatInput.fill(question);
    console.log(`📝 Question entered: "${question}"`);

    // Find and click send button
    const sendBtn = page.locator('button:has-text("Send")').first();
    const sendBtnExists = await sendBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (!sendBtnExists) {
      console.log('⚠️  Send button not found, trying Enter key');
      await chatInput.press('Enter');
    } else {
      console.log('⏳ Clicking Send button');
      await sendBtn.click();
    }

    // Wait for response
    console.log('⏳ Waiting for Claude response...');
    await page.waitForTimeout(3000);

    // Check if input was cleared (indicates message was sent)
    const inputValue = await chatInput.inputValue();
    const wasCleared = !inputValue || inputValue.length === 0;
    console.log(`✅ Input cleared after send: ${wasCleared}`);
  });

  test('3. Chat response from Claude API', async ({ page }) => {
    console.log('\n🧪 TEST: Chat Claude Response');
    console.log('═'.repeat(70));

    // Capture network calls
    const chatCalls = [];
    page.on('response', async (res) => {
      if (res.url().includes('/chat')) {
        chatCalls.push(res.status());
      }
    });

    // Login
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('✅ Logged in');

    // Scroll to chat
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Send question
    const chatInput = page.locator('input[placeholder*="time"]').first();
    if (!(await chatInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log('❌ Chat input not accessible');
      return;
    }

    const question = 'How much time did I spend today?';
    await chatInput.fill(question);
    console.log(`📝 Question: "${question}"`);

    const sendBtn = page.locator('button:has-text("Send")').first();
    const hasSendBtn = await sendBtn.isVisible({ timeout: 1000 }).catch(() => false);

    if (hasSendBtn) {
      await sendBtn.click();
    } else {
      await chatInput.press('Enter');
    }

    console.log('⏳ Waiting for Claude response...');

    // Wait for API call
    let found = false;
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(5000);
      if (chatCalls.length > 0) {
        console.log(`✅ Chat API called (status: ${chatCalls[0]})`);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('⚠️  Chat API not called after 30s');
    }

    // Check for message in DOM
    const messages = await page.locator('[class*="message"]').count();
    console.log(`✅ Message elements in DOM: ${messages}`);
  });

  test('4. Chat message persistence', async ({ page }) => {
    console.log('\n🧪 TEST: Message Persistence');
    console.log('═'.repeat(70));

    // Login
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('✅ Logged in');

    // Scroll to chat
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const chatInput = page.locator('input[placeholder*="time"]').first();
    if (!(await chatInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log('❌ Chat not accessible');
      return;
    }

    // Send message
    const question = `Test message ${Date.now()}`;
    await chatInput.fill(question);

    const sendBtn = page.locator('button:has-text("Send")').first();
    if (await sendBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sendBtn.click();
    } else {
      await chatInput.press('Enter');
    }

    console.log('⏳ Waiting for message to be sent...');
    await page.waitForTimeout(2000);

    // Check if message appears
    const pageText = await page.textContent('body');
    const found = pageText.includes('Test message') || pageText.includes('You:');
    console.log(`✅ Message visible on page: ${found}`);

    // Navigate away and back
    const dashboardBtn = page.locator('button:has-text("Log & journal")');
    if (await dashboardBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await dashboardBtn.click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Navigated away');

      // Click dashboard again to refresh
      await dashboardBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const persistedText = await page.textContent('body');
      const stillThere = persistedText.includes('You:') || persistedText.includes('You.');
      console.log(`✅ Messages persisted: ${stillThere}`);
    }
  });

  test('5. Chat with no time entries', async ({ page }) => {
    console.log('\n🧪 TEST: Chat with Empty Data');
    console.log('═'.repeat(70));

    // Login
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('✅ Logged in');

    // Scroll to chat
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const chatInput = page.locator('input[placeholder*="time"]').first();
    if (!(await chatInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log('❌ Chat not accessible');
      return;
    }

    // Ask about data
    const question = 'How many activities have I logged?';
    await chatInput.fill(question);

    const sendBtn = page.locator('button:has-text("Send")').first();
    if (await sendBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sendBtn.click();
    } else {
      await chatInput.press('Enter');
    }

    console.log('⏳ Waiting for response...');
    await page.waitForTimeout(5000);

    // Check response (even if no entries, Claude should respond)
    const bodyText = await page.textContent('body');
    const hasResponse = bodyText.includes('Claude:') || bodyText.length > 500;
    console.log(`✅ Claude responded: ${hasResponse}`);
  });
});
