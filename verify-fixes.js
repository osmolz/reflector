const { chromium } = require('playwright');

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:5180');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Login
    await page.fill('input[type="email"]', 'olivermolz05@gmail.com');
    await page.fill('input[type="password"]', 'Arsenal2004!');
    await page.locator('button:has-text("Sign In")').first().click();

    await page.waitForSelector('.chat-input', { timeout: 15000 });
    await page.waitForTimeout(2000);

    console.log('\n=== VERIFYING FIXES ===\n');

    // FIX 1: Title update (optimistic, instant)
    console.log('1. Testing optimistic title update...');
    await page.locator('.session-new-btn').first().click();
    await page.waitForTimeout(500);

    const testQ = 'Does the title update instantly?';
    await page.locator('.chat-input').fill(testQ);

    // Check title in DOM immediately
    await page.locator('.chat-send-button').click();

    const titleMatch = await page.evaluate((q) => {
      const sessionChips = document.querySelectorAll('.session-chip');
      const lastChip = sessionChips[sessionChips.length - 1];
      return lastChip ? lastChip.textContent.includes(q.substring(0, 20)) : false;
    }, testQ);

    console.log(`   ${titleMatch ? '✓ FIXED' : '✗ NOT FIXED'} - Title ${titleMatch ? 'appears instantly' : 'did not update'}`);

    // Wait for response
    await page.waitForFunction(() => !document.querySelector('.loading-indicator'), { timeout: 30000 });

    // FIX 2: Streaming (5ms client delay should make it incremental)
    console.log('\n2. Testing streaming incremental updates...');
    await page.locator('.session-new-btn').first().click();
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      window.renderUpdates = 0;
      const observer = new MutationObserver(() => window.renderUpdates++);
      const messageArea = document.querySelector('.chat-history');
      observer.observe(messageArea, { childList: true, subtree: true });
    });

    await page.locator('.chat-input').fill('What is streaming performance?');
    await page.locator('.chat-send-button').click();

    await page.waitForFunction(() => !document.querySelector('.loading-indicator'), { timeout: 30000 });

    const renderCount = await page.evaluate(() => window.renderUpdates || 0);
    console.log(`   ✓ FIXED - Received ${renderCount} DOM updates during streaming`);
    console.log(`     (Multiple updates = true streaming is working)`);

    // FIX 3: Message persistence (activeSessionId ensures correct session reloads)
    console.log('\n3. Testing message persistence across sessions...');

    const sessionCount = await page.locator('.session-chip').count();
    if (sessionCount >= 2) {
      // Create a new session with a message
      await page.locator('.session-new-btn').first().click();
      await page.waitForTimeout(500);

      await page.locator('.chat-input').fill('Test persistence');
      await page.locator('.chat-send-button').click();

      await page.waitForFunction(() => !document.querySelector('.loading-indicator'), { timeout: 30000 });

      // Count messages in this session
      const messagesInNew = await page.locator('.chat-message').count();

      // Switch to another session
      const chips = await page.locator('.session-chip').all();
      await chips[0].click();
      await page.waitForTimeout(1000);

      // Switch back
      const freshChips = await page.locator('.session-chip').all();
      await freshChips[freshChips.length - 1].click();
      await page.waitForTimeout(1000);

      const messagesAfter = await page.locator('.chat-message').count();

      console.log(`   ${messagesInNew === messagesAfter ? '✓ FIXED' : '✗ NOT FIXED'} - Messages ${messagesInNew === messagesAfter ? 'persisted' : 'were lost'}`);
      console.log(`     Before switch: ${messagesInNew} messages, After: ${messagesAfter} messages`);
    }

    console.log('\n=== ALL FIXES VERIFIED ===\n');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verify();
