const { chromium } = require('playwright');

async function debug() {
  const browser = await chromium.launch({ headless: false });
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

    console.log('=== DEBUGGING ISSUE 1: TITLE NOT UPDATING ===\n');

    // Create new session
    const newBtn = page.locator('.session-new-btn').first();
    await newBtn.click();
    await page.waitForTimeout(1000);

    const question = 'How much time did I spend coding?';

    // Check session state before send
    const sessionCountBefore = await page.locator('.session-chip').count();
    console.log(`Sessions before send: ${sessionCountBefore}`);

    const chatInput = page.locator('.chat-input').first();
    const sendBtn = page.locator('.chat-send-button').first();

    await chatInput.fill(question);

    // Check title immediately after send (with small wait for React batch)
    console.log('Sending message...');
    await sendBtn.click();

    await page.waitForTimeout(100);

    const titleAfter100ms = await page.evaluate(() => {
      const chips = document.querySelectorAll('.session-chip');
      const last = chips[chips.length - 1];
      return last ? last.textContent : 'none';
    });
    console.log(`Title at 100ms: "${titleAfter100ms}"`);

    await page.waitForTimeout(400);

    const titleAfter500ms = await page.evaluate(() => {
      const chips = document.querySelectorAll('.session-chip');
      const last = chips[chips.length - 1];
      return last ? last.textContent : 'none';
    });
    console.log(`Title at 500ms: "${titleAfter500ms}"`);

    // Wait for response
    await page.waitForFunction(() => !document.querySelector('.loading-indicator'), { timeout: 30000 });

    const titleAfterResponse = await page.evaluate(() => {
      const chips = document.querySelectorAll('.session-chip');
      const last = chips[chips.length - 1];
      return last ? last.textContent : 'none';
    });
    console.log(`Title after response: "${titleAfterResponse}"`);

    console.log('\n=== DEBUGGING ISSUE 3: MESSAGE PERSISTENCE ===\n');

    // Send a message in current session
    await chatInput.fill('Testing persistence');
    await sendBtn.click();

    await page.waitForFunction(() => !document.querySelector('.loading-indicator'), { timeout: 30000 });

    const messagesInCurrentSession = await page.locator('.chat-message').count();
    console.log(`Messages in current session: ${messagesInCurrentSession}`);

    // Get all sessions
    const allChips = await page.locator('.session-chip').all();
    console.log(`Total sessions: ${allChips.length}`);

    if (allChips.length >= 2) {
      // Switch to first session
      console.log('Switching to first session...');
      await allChips[0].click();
      await page.waitForTimeout(1500);

      const messagesInFirst = await page.locator('.chat-message').count();
      console.log(`Messages in first session: ${messagesInFirst}`);

      // Switch back to current
      console.log('Switching back to current session...');
      const freshChips = await page.locator('.session-chip').all();
      await freshChips[freshChips.length - 1].click();
      await page.waitForTimeout(1500);

      const messagesAfterSwitch = await page.locator('.chat-message').count();
      console.log(`Messages after switching back: ${messagesAfterSwitch}`);

      if (messagesAfterSwitch === messagesInCurrentSession) {
        console.log('✓ Messages PERSISTED');
      } else {
        console.log(`✗ Messages LOST (was ${messagesInCurrentSession}, now ${messagesAfterSwitch})`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Keep browser open for inspection
    console.log('\nBrowser will stay open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

debug();
