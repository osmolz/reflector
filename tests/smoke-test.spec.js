import { test, expect } from '@playwright/test';

test.describe('Prohairesis Smoke Tests', () => {
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

    // Check if Prohairesis heading exists
    const hasProhairesis = bodyText.includes('Prohairesis');
    expect(hasProhairesis).toBeTruthy();
  });

  test('Check if user is logged in', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    // Look for logged-in indicators
    const bodyText = await page.locator('body').innerText();

    const isLoggedIn = bodyText.includes('Sign out') &&
                      (bodyText.includes('Log & journal') || bodyText.includes('Timeline')) &&
                      bodyText.includes('Chat');

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

      // Journal is on Log & journal (default); confirm section heading
      const journalSection = page.locator('h2:has-text("Journal")');
      if (await journalSection.isVisible().catch(() => false)) {
        console.log('Journal section visible on Log & journal');
      }

      const chatNav = page.locator('nav').getByRole('button', { name: 'Chat' });
      if (await chatNav.isVisible()) {
        await chatNav.click();
        await page.waitForLoadState('networkidle');
      }

      const logNav = page.locator('nav').getByRole('button', { name: 'Log & journal' });
      if (await logNav.isVisible()) {
        await logNav.click();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('Test voice check-in component', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    const voiceText = await page.locator('text=Log time').isVisible();
    console.log('Log time section visible:', voiceText);

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

    await page.locator('nav').getByRole('button', { name: 'Chat' }).click();
    await page.waitForLoadState('networkidle');
    const chatInput = page.locator('input[placeholder*="time"], input[placeholder*="Ask"]');

    if (await chatInput.isVisible().catch(() => false)) {
      console.log('Chat input visible on Chat page');

      const sendBtn = page.locator('button:has-text("Send")');
      if (await sendBtn.isVisible()) {
        console.log('Send button found');
      }
    } else {
      console.log('Chat input not visible (may need login)');
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
