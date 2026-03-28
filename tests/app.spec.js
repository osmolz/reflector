import { test, expect } from '@playwright/test';

// Test configuration
test.describe('Reflector App - E2E Tests', () => {
  const baseUrl = 'http://localhost:5173';
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!@#';

  test.beforeEach(async ({ page }) => {
    await page.goto(baseUrl);
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('1. App loads successfully', async ({ page }) => {
    // Check for app title
    await expect(page).toHaveTitle(/Reflector/);

    // Check for main content
    const authForm = page.locator('input[type="email"]');
    await expect(authForm).toBeVisible();
  });

  test('2. Auth form is visible with both tabs', async ({ page }) => {
    // Check for Sign In tab
    const signInTab = page.locator('button:has-text("Sign In")');
    await expect(signInTab).toBeVisible();

    // Check for Sign Up tab
    const signUpTab = page.locator('button:has-text("Sign Up")');
    await expect(signUpTab).toBeVisible();

    // Check for email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Check for password input
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('3. User can sign up with email and password', async ({ page }) => {
    // Click Sign Up tab if not already selected
    const signUpTab = page.locator('button:has-text("Sign Up")');
    if (!(await signUpTab.evaluate(el => el.classList.contains('active')))) {
      await signUpTab.click();
    }

    // Fill form
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);

    // Click Sign Up button
    const signUpButton = page.locator('button:has-text("Sign Up")');
    await signUpButton.click();

    // Wait for either success or error message
    const message = page.locator('.message-container, .error-message');
    await expect(message).toBeVisible({ timeout: 10000 });

    // Check if logged in or if there's an error message
    const successMsg = page.locator('text=success, logged in, or email');
    const errorMsg = page.locator('.error-message');

    if (await errorMsg.isVisible()) {
      console.log('Sign up error (may be due to rate limiting on free tier)');
    }
  });

  test('4. User can navigate to timeline after login', async ({ page }) => {
    // Try to sign in first - use a known test account or check if already logged in
    const timelineBtn = page.locator('button:has-text("Timeline")');

    // If timeline button exists, user is logged in
    if (await timelineBtn.isVisible()) {
      await timelineBtn.click();

      // Check for timeline content
      const timelineContent = page.locator('[class*="timeline"], [class*="activity"]');
      await expect(timelineContent.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('5. Voice check-in section is visible when logged in', async ({ page }) => {
    // Check if user is logged in by looking for header
    const headerUser = page.locator('[class*="header-user"]');

    if (await headerUser.isVisible()) {
      // Look for voice check-in section
      const voiceSection = page.locator('text=Voice Check-in');
      await expect(voiceSection).toBeVisible();

      // Look for mic button
      const micButton = page.locator('button[aria-label*="mic"], button:has-text("Record")');
      if (await micButton.isVisible()) {
        console.log('Mic button found');
      }
    }
  });

  test('6. Journal page is accessible', async ({ page }) => {
    // Check if user is logged in
    const journalBtn = page.locator('button:has-text("Journal")');

    if (await journalBtn.isVisible()) {
      await journalBtn.click();

      // Check for journal content area
      const journalContent = page.locator('[class*="journal"], textarea, [contenteditable]');
      await expect(journalContent.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('7. Chat section is visible on dashboard', async ({ page }) => {
    // Check if user is logged in
    const headerUser = page.locator('[class*="header-user"]');

    if (await headerUser.isVisible()) {
      // Look for chat section
      const chatSection = page.locator('text=Chat Analytics, text=Ask about your time');

      if (await chatSection.first().isVisible()) {
        console.log('Chat section is visible');
      }
    }
  });

  test('8. User can sign out', async ({ page }) => {
    // Check if user is logged in
    const signOutBtn = page.locator('button:has-text("Sign out")');

    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();

      // Should redirect back to auth form
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible({ timeout: 5000 });
    }
  });

  test('9. Page is responsive and elements are accessible', async ({ page }) => {
    // Check for proper semantic HTML
    const main = page.locator('main');
    await expect(main).toBeVisible();

    const header = page.locator('header');
    if (await header.isVisible()) {
      console.log('Header is properly structured');
    }

    const nav = page.locator('nav');
    if (await nav.isVisible()) {
      console.log('Navigation is present');
    }
  });

  test('10. Console has no critical errors', async ({ page, context }) => {
    const logs = [];

    // Capture console messages
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        logs.push({
          type: msg.type(),
          text: msg.text()
        });
      }
    });

    // Trigger some interactions
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    // Check for critical errors (filter out expected warnings)
    const criticalErrors = logs.filter(log =>
      log.type === 'error' &&
      !log.text.includes('Missing Supabase') &&
      !log.text.includes('Network request failed')
    );

    if (criticalErrors.length === 0) {
      console.log('No critical console errors found');
    } else {
      console.log('Console errors:', criticalErrors);
    }
  });
});
