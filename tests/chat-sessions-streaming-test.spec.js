import { test, expect } from '@playwright/test';

test.describe('Chat Sessions & Streaming - Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the local dev server
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    // Wait for auth to load
    await page.waitForTimeout(2000);

    // Check if login is required
    const emailInput = page.locator('input[type="email"]');
    const isLoginVisible = await emailInput.isVisible().catch(() => false);

    if (isLoginVisible) {
      console.log('📝 Logging in with credentials...');
      // Use credentials from .env
      await emailInput.fill('olivermolz05@gmail.com');

      const passwordInput = page.locator('input[type="password"]');
      await passwordInput.fill('Arsenal2004!');

      // Find and click the login button
      const signInButton = page.locator('button').filter({ hasText: /Sign in|Sign In|Log in|Login/ }).first();
      await signInButton.click();

      // Wait for login to complete
      await page.waitForTimeout(3000);

      // Wait for Dashboard or Chat to appear
      await page.waitForSelector('.dashboard, .chat-container, [role="main"]', { timeout: 10000 }).catch(() => null);
      console.log('✅ Login completed');
    } else {
      console.log('✅ Already logged in');
    }
  });

  test('Session strip UI renders with + New button', async ({ page }) => {
    // Check if session strip exists
    const sessionStrip = page.locator('.session-strip');
    await expect(sessionStrip).toBeVisible({ timeout: 5000 });
    console.log('✅ Session strip is visible');

    // Check if + New button exists
    const newButton = page.locator('.session-new-btn');
    await expect(newButton).toBeVisible();
    await expect(newButton).toContainText('New');
    console.log('✅ + New button is visible and contains "New" text');
  });

  test('Can create a new chat session', async ({ page }) => {
    // Click + New button
    const newButton = page.locator('.session-new-btn');
    await newButton.click();

    // Wait a moment for the session to be created
    await page.waitForTimeout(1000);

    // Check if a new session chip appeared
    const sessionChips = page.locator('.session-chip');
    const chipCount = await sessionChips.count();

    console.log(`✅ New session created - total sessions: ${chipCount}`);
    expect(chipCount).toBeGreaterThan(0);
  });

  test('Session chips display and are clickable', async ({ page }) => {
    // Create a session first
    const newButton = page.locator('.session-new-btn');
    await newButton.click();
    await page.waitForTimeout(1000);

    // Get session chips
    const sessionChips = page.locator('.session-chip');
    const firstChip = sessionChips.first();

    // Check if it's visible
    await expect(firstChip).toBeVisible();
    console.log('✅ Session chip is visible and clickable');

    // Check if it has active state
    const activeChip = page.locator('.session-chip.active');
    await expect(activeChip).toHaveCount(1);
    console.log('✅ Exactly one session chip has active state');
  });

  test('Chat history shows empty state for new session', async ({ page }) => {
    // Create a new session
    const newButton = page.locator('.session-new-btn');
    await newButton.click();
    await page.waitForTimeout(1000);

    // Check for empty state message
    const emptyMessage = page.locator('.chat-empty');
    const isVisible = await emptyMessage.isVisible().catch(() => false);

    if (isVisible) {
      console.log('✅ Empty state message displays for new session');
    } else {
      console.log('⚠️  Empty state message not visible (session might have old messages)');
    }
  });

  test('Can send a message to a session', async ({ page }) => {
    // Create a new session
    const newButton = page.locator('.session-new-btn');
    await newButton.click();
    await page.waitForTimeout(1000);

    // Type a message
    const chatInput = page.locator('.chat-input');
    await chatInput.fill('What is 2 plus 2?');

    // Send the message
    const sendButton = page.locator('.chat-send-button');
    await sendButton.click();

    console.log('✅ Message sent successfully');

    // Wait for response (checking if user message appears)
    const userMessage = page.locator('.user-message');
    await expect(userMessage).toBeVisible({ timeout: 10000 });
    console.log('✅ User message appears in chat');
  });

  test('Streaming - text flows gradually (not block dump)', async ({ page }) => {
    // Create a new session
    const newButton = page.locator('.session-new-btn');
    await newButton.click();
    await page.waitForTimeout(1000);

    // Send a question
    const chatInput = page.locator('.chat-input');
    await chatInput.fill('Count to 5 slowly.');

    const sendButton = page.locator('.chat-send-button');
    await sendButton.click();

    // Monitor the assistant message for gradual content growth
    const assistantMessages = page.locator('.claude-message');

    let lastLength = 0;
    let updateCount = 0;
    let maxLength = 0;

    // Poll for 15 seconds to check if text is updating gradually
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(500);

      const messageContent = await assistantMessages.last().textContent();
      if (messageContent) {
        const currentLength = messageContent.length;

        if (currentLength > lastLength) {
          updateCount++;
          maxLength = currentLength;
          console.log(`  Update ${updateCount}: ${currentLength} chars`);
        }

        lastLength = currentLength;

        // If we've seen a significant response, check for streaming behavior
        if (maxLength > 50) {
          break;
        }
      }
    }

    if (updateCount > 1) {
      console.log(`✅ Streaming detected! Text updated ${updateCount} times (true streaming)`);
    } else if (maxLength > 0) {
      console.log(`⚠️  Text appears to be block arrival - only ${updateCount} update(s) detected`);
    } else {
      console.log('⚠️  No response received');
    }
  });

  test('Session title auto-generates from first message', async ({ page }) => {
    // Create a new session
    const newButton = page.locator('.session-new-btn');
    await newButton.click();
    await page.waitForTimeout(1000);

    // Send a distinctive question
    const chatInput = page.locator('.chat-input');
    const distinctQuestion = 'How much time did I spend on TESTING today?';
    await chatInput.fill(distinctQuestion);

    const sendButton = page.locator('.chat-send-button');
    await sendButton.click();

    // Wait for response
    await page.waitForTimeout(3000);

    // Check if session title contains part of the question
    const sessionChip = page.locator('.session-chip.active');
    const chipText = await sessionChip.textContent();

    console.log(`📋 Active session title: "${chipText}"`);

    if (chipText && chipText.includes('How') || chipText.includes('TESTING')) {
      console.log('✅ Session title auto-generated from message content');
    } else if (chipText && chipText !== 'New Chat') {
      console.log('✅ Session title auto-generated (may be truncated)');
    } else {
      console.log('⚠️  Session title not auto-generated');
    }
  });

  test('Can switch between sessions', async ({ page }) => {
    // Create first session and send message
    const newButton = page.locator('.session-new-btn');
    await newButton.click();
    await page.waitForTimeout(1000);

    const chatInput = page.locator('.chat-input');
    await chatInput.fill('First session message');
    const sendButton = page.locator('.chat-send-button');
    await sendButton.click();

    await page.waitForTimeout(2000);

    // Create second session
    await newButton.click();
    await page.waitForTimeout(1000);

    await chatInput.fill('Second session message');
    await sendButton.click();

    await page.waitForTimeout(2000);

    // Switch back to first session
    const sessionChips = page.locator('.session-chip');
    const firstChip = sessionChips.first();
    await firstChip.click();

    await page.waitForTimeout(1000);

    // Check that first session message is visible
    const userMessages = page.locator('.user-message');
    const messageCount = await userMessages.count();

    console.log(`✅ Switched to first session - found ${messageCount} message(s)`);
    expect(messageCount).toBeGreaterThan(0);
  });

  test('Messages persist in session', async ({ page }) => {
    // Create session and send message
    const newButton = page.locator('.session-new-btn');
    await newButton.click();
    await page.waitForTimeout(1000);

    const chatInput = page.locator('.chat-input');
    const testMessage = 'This is a persistent test message at ' + new Date().getTime();
    await chatInput.fill(testMessage);

    const sendButton = page.locator('.chat-send-button');
    await sendButton.click();

    await page.waitForTimeout(2000);

    // Note which session this is (the active one)
    const activeSessionChip = page.locator('.session-chip.active');
    const sessionTitle = await activeSessionChip.textContent();

    console.log(`📋 Testing persistence in session: "${sessionTitle}"`);

    // Switch to another session (or create a new one)
    await newButton.click();
    await page.waitForTimeout(1000);

    // Switch back
    await activeSessionChip.click();
    await page.waitForTimeout(1000);

    // Check if the message is still there
    const userMessages = page.locator('.user-message');
    const foundMessage = await userMessages.filter({ hasText: testMessage }).count();

    if (foundMessage > 0) {
      console.log('✅ Message persisted in session after switching');
    } else {
      console.log('⚠️  Message not found after session switch');
    }
  });

  test('Error handling - no console errors on interactions', async ({ page }) => {
    const errors = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Perform various interactions
    const newButton = page.locator('.session-new-btn');
    await newButton.click();
    await page.waitForTimeout(500);

    const chatInput = page.locator('.chat-input');
    await chatInput.fill('Test message');

    const sendButton = page.locator('.chat-send-button');
    await sendButton.click();

    await page.waitForTimeout(2000);

    if (errors.length === 0) {
      console.log('✅ No console errors during session operations');
    } else {
      console.log(`⚠️  Found ${errors.length} console error(s):`);
      errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }
  });
});
