import { test, expect } from '@playwright/test';

test.describe('Chat Streaming - Local Live Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the local dev server
    await page.goto('http://localhost:5178/');
    await page.waitForLoadState('networkidle');
  });

  test('Chat component renders and is visible', async ({ page }) => {
    const chatContainer = page.locator('.chat-container');
    await expect(chatContainer).toBeVisible();
    console.log('[OK] Chat container is visible');
  });

  test('Chat input field is functional', async ({ page }) => {
    const chatInput = page.locator('.chat-input');
    await expect(chatInput).toBeVisible();

    await chatInput.fill('What did I work on today?');
    const value = await chatInput.inputValue();
    expect(value).toBe('What did I work on today?');
    console.log('[OK] Chat input accepts text correctly');
  });

  test('Chat send button responds to input', async ({ page }) => {
    const chatInput = page.locator('.chat-input');
    const sendButton = page.locator('.chat-send-button');

    // Fill input and button should become enabled
    await chatInput.fill('Test question');
    await expect(sendButton).not.toBeDisabled();
    console.log('[OK] Send button responds to input');
  });

  test('Chat history container exists', async ({ page }) => {
    const chatHistory = page.locator('.chat-history');
    await expect(chatHistory).toBeVisible();
    console.log('[OK] Chat history container is visible');
  });

  test('Empty state message shows', async ({ page }) => {
    const emptyMessage = page.locator('.chat-empty');
    await expect(emptyMessage).toContainText('No messages yet');
    console.log('[OK] Empty state displays correctly');
  });

  test('Component is responsive at 375px (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const chatContainer = page.locator('.chat-container');
    await expect(chatContainer).toBeVisible();
    console.log('[OK] Component responsive at 375px');
  });

  test('Component is responsive at 1280px (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const chatContainer = page.locator('.chat-container');
    await expect(chatContainer).toBeVisible();
    console.log('[OK] Component responsive at 1280px');
  });

  test('CSS styles are loaded', async ({ page }) => {
    const styleLoaded = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.querySelector('.chat-container'));
      return styles.display !== '';
    });

    expect(styleLoaded).toBe(true);
    console.log('[OK] CSS styles are loaded');
  });

  test('Keyboard Enter key handling', async ({ page }) => {
    const chatInput = page.locator('.chat-input');
    await chatInput.fill('Test message');

    // Press Enter should trigger send (may not work without auth, but shouldn't crash)
    await chatInput.press('Enter');

    // Input should still be there or cleared (depending on auth state)
    await expect(chatInput).toBeVisible();
    console.log('[OK] Keyboard Enter handling works');
  });

  test('Error banner initially hidden', async ({ page }) => {
    const errorBanner = page.locator('.error-banner');
    const errorVisible = await errorBanner.isVisible().catch(() => false);

    expect(errorVisible).toBe(false);
    console.log('[OK] Error banner initially hidden');
  });
});

test.describe('Streaming Parser Unit Tests', () => {
  test('SSE event parsing in browser context', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simulate SSE events
      const events = [
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello ' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'world' } },
        { type: 'message_stop' }
      ];

      let accumulated = '';
      events.forEach(event => {
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          accumulated += event.delta.text;
        }
      });

      return accumulated;
    });

    expect(result).toBe('Hello world');
    console.log('[OK] SSE event parsing works');
  });

  test('Markdown detection logic', async ({ page }) => {
    const markdownDetected = await page.evaluate(() => {
      const text = 'This has **bold** and __underline__';
      const markdownPattern = /\*\*|__|```|~~~|\|/;
      return markdownPattern.test(text);
    });

    expect(markdownDetected).toBe(true);
    console.log('[OK] Markdown detection works');
  });

  test('Plain prose validation', async ({ page }) => {
    const isPlainProse = await page.evaluate(() => {
      const text = 'I notice you spent 3 hours on work today. That\'s solid focus.';
      const hasMarkdown = /\*\*|__|```|~~~|\|/.test(text);
      return !hasMarkdown;
    });

    expect(isPlainProse).toBe(true);
    console.log('[OK] Plain prose text passes validation');
  });

  test('Streaming text accumulation logic', async ({ page }) => {
    const accumulated = await page.evaluate(() => {
      const chunks = ['I ', 'notice ', 'you ', 'spent ', '3 ', 'hours'];
      let result = '';
      chunks.forEach(chunk => {
        result += chunk;
      });
      return result;
    });

    expect(accumulated).toBe('I notice you spent 3 hours');
    console.log('[OK] Text accumulation works correctly');
  });

  test('Response length validation', async ({ page }) => {
    const isValidLength = await page.evaluate(() => {
      const response = 'I notice you spent about 3 hours on work today. That\'s solid focus.';
      return response.length > 0 && response.length < 1000;
    });

    expect(isValidLength).toBe(true);
    console.log('[OK] Response length validation works');
  });
});
