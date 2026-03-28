import { test, expect } from '@playwright/test';

test.describe('Reflector Smoke Tests', () => {
  const baseUrl = 'http://localhost:5173';

  test('App loads and displays main content', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    // Take screenshot to see current state
    await page.screenshot({ path: 'app-state.png' });

    // Check if we can find any major elements
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);

    // Try to find any visible text
    const bodyText = await page.locator('body').innerText();
    console.log('Page content preview:', bodyText.substring(0, 200));

    // Check if Reflector heading exists
    const hasReflector = bodyText.includes('Reflector');
    expect(hasReflector).toBeTruthy();
  });

  test('Check if user is logged in', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    // Look for logged-in indicators
    const bodyText = await page.locator('body').innerText();

    const isLoggedIn = bodyText.includes('Sign out') ||
                      bodyText.includes('Dashboard') ||
                      bodyText.includes('Timeline') ||
                      bodyText.includes('Journal');

    console.log('User appears to be logged in:', isLoggedIn);

    if (isLoggedIn) {
      // Try to find and interact with navigation
      const navButtons = await page.locator('button').allTextContents();
      console.log('Available buttons:', navButtons);

      // Try to access timeline
      const timelineBtn = page.locator('button:has-text("Timeline")');
      if (await timelineBtn.isVisible()) {
        await timelineBtn.click();
        await page.waitForLoadState('networkidle');

        const timelineText = await page.locator('body').innerText();
        const hasActivities = timelineText.includes('Activity') || timelineText.includes('Duration');
        console.log('Timeline has activity data:', hasActivities);
      }

      // Try to access journal
      const journalBtn = page.locator('button:has-text("Journal")');
      if (await journalBtn.isVisible()) {
        await journalBtn.click();
        await page.waitForLoadState('networkidle');
        const journalText = await page.locator('body').innerText();
        console.log('Journal section loaded');
      }

      // Go back to dashboard
      const dashBtn = page.locator('button:has-text("Dashboard")');
      if (await dashBtn.isVisible()) {
        await dashBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('Test voice check-in component', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    const voiceText = await page.locator('text=Voice Check-in').isVisible();
    console.log('Voice Check-in section visible:', voiceText);

    if (voiceText) {
      // Look for mic button or record button
      const buttons = await page.locator('button').allTextContents();
      console.log('Available buttons with text:', buttons);

      // Check for any audio elements or input-related elements
      const hasAudio = await page.locator('audio, [role="button"][aria-label*="mic"], [aria-label*="record"]').count();
      console.log('Audio-related elements found:', hasAudio > 0);
    }
  });

  test('Test chat functionality', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    const chatText = await page.locator('text=Chat Analytics').isVisible();
    console.log('Chat section visible:', chatText);

    if (chatText) {
      // Look for input field
      const chatInput = page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"], input[placeholder*="question"]');

      if (await chatInput.isVisible()) {
        console.log('Chat input found');

        // Try to type a question
        await chatInput.click();
        await chatInput.fill('What is my schedule?');

        // Look for send button
        const sendBtn = page.locator('button:has-text("Send"), button[type="submit"], button:has-text("Ask")');

        if (await sendBtn.isVisible()) {
          console.log('Send button found');

          // Don't actually send (to avoid API calls)
          // await sendBtn.click();
        }
      }
    }
  });

  test('Verify page structure and accessibility', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    // Check for semantic HTML
    const hasHeader = await page.locator('header').count() > 0;
    const hasMain = await page.locator('main').count() > 0;
    const hasNav = await page.locator('nav').count() > 0;

    console.log('Page structure:');
    console.log('  - Has header:', hasHeader);
    console.log('  - Has main:', hasMain);
    console.log('  - Has nav:', hasNav);

    // Check for accessibility attributes
    const buttons = page.locator('button');
    const buttonsCount = await buttons.count();

    console.log(`Found ${buttonsCount} interactive buttons`);

    // Check for any major console errors
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);

    console.log('Console errors:', errors.length === 0 ? 'None' : errors);
  });
});
