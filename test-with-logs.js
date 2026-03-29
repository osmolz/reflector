const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Log all console messages
  page.on('console', msg => {
    if (msg.text().includes('[Chat]')) {
      console.log('BROWSER:', msg.text());
    }
  });

  try {
    await page.goto('http://localhost:5180');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Login
    await page.fill('input[type="email"]', 'olivermolz05@gmail.com');
    await page.fill('input[type="password"]', 'Arsenal2004!');
    await page.locator('button:has-text("Sign In")').first().click();

    await page.waitForSelector('.chat-input', { timeout: 15000 });
    await page.waitForTimeout(2000);

    console.log('\n=== Testing title update with logs ===\n');

    // Create new session
    await page.locator('.session-new-btn').first().click();
    await page.waitForTimeout(1000);

    // Send message
    const question = 'How much time on development?';
    await page.locator('.chat-input').first().fill(question);

    console.log('Clicking send button...');
    await page.locator('.chat-send-button').first().click();

    // Wait a bit for logs
    await page.waitForTimeout(500);

    const title = await page.evaluate(() => {
      const chips = document.querySelectorAll('.session-chip');
      return chips[chips.length - 1]?.textContent || 'none';
    });

    console.log('\nTitle after send:', title);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

test();
