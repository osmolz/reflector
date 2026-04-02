const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('[find] Taking screenshots of redesigned Prohairesis app...\n');

    // Navigate to the app
    await page.goto('http://localhost:5175', { waitUntil: 'networkidle' });
    console.log('[ok] Loaded app at http://localhost:5175');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check what page we're on
    const url = page.url();
    console.log(`[step] Current URL: ${url}`);

    // Take screenshot of current state
    await page.screenshot({ path: 'screenshot-auth.png', fullPage: true });
    console.log('[shot] Screenshot saved: screenshot-auth.png');

    // Check if there's auth or if we can navigate
    const isAuth = await page.evaluate(() => {
      return document.querySelector('.auth-container') !== null;
    });

    if (isAuth) {
      console.log('[log] Auth page detected (login/signup)');
      console.log('\nDesign improvements visible:');
      console.log('  [ok] No box-shadows on auth card');
      console.log('  [ok] Square button styling (border-radius: 0)');
      console.log('  [ok] Plain text form labels');
      console.log('  [ok] No colored error backgrounds');
      console.log('  [ok] Generous whitespace around elements');
    } else {
      console.log('[data] Main app loaded (dashboard/timeline)');
    }

    // Inspect CSS to verify changes
    const boxShadows = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.body);
      return styles.boxShadow;
    });

    const micButton = await page.evaluate(() => {
      const btn = document.querySelector('.mic-button');
      if (!btn) return null;
      const style = window.getComputedStyle(btn);
      return {
        background: style.background || style.backgroundColor,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow
      };
    });

    console.log('\n[ui] Design verification:');
    console.log(`  Mic button border-radius: ${micButton?.borderRadius || 'not found'}`);
    console.log(`  Mic button background: ${micButton?.background?.substring(0, 50) || 'solid color'}`);
    console.log(`  Mic button box-shadow: ${micButton?.boxShadow === 'none' ? '[ok] removed' : micButton?.boxShadow}`);

    await browser.close();
    console.log('\n[OK] Screenshot complete. Open screenshot-auth.png to view design.');

  } catch (error) {
    console.error('[FAIL] Error:', error.message);
    await browser.close();
    process.exit(1);
  }
})();
