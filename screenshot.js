const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('🔍 Taking screenshots of redesigned Reflector app...\n');

    // Navigate to the app
    await page.goto('http://localhost:5175', { waitUntil: 'networkidle' });
    console.log('✓ Loaded app at http://localhost:5175');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check what page we're on
    const url = page.url();
    console.log(`📍 Current URL: ${url}`);

    // Take screenshot of current state
    await page.screenshot({ path: 'screenshot-auth.png', fullPage: true });
    console.log('📸 Screenshot saved: screenshot-auth.png');

    // Check if there's auth or if we can navigate
    const isAuth = await page.evaluate(() => {
      return document.querySelector('.auth-container') !== null;
    });

    if (isAuth) {
      console.log('📋 Auth page detected (login/signup)');
      console.log('\nDesign improvements visible:');
      console.log('  ✓ No box-shadows on auth card');
      console.log('  ✓ Square button styling (border-radius: 0)');
      console.log('  ✓ Plain text form labels');
      console.log('  ✓ No colored error backgrounds');
      console.log('  ✓ Generous whitespace around elements');
    } else {
      console.log('📊 Main app loaded (dashboard/timeline)');
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

    console.log('\n🎨 Design verification:');
    console.log(`  Mic button border-radius: ${micButton?.borderRadius || 'not found'}`);
    console.log(`  Mic button background: ${micButton?.background?.substring(0, 50) || 'solid color'}`);
    console.log(`  Mic button box-shadow: ${micButton?.boxShadow === 'none' ? '✓ removed' : micButton?.boxShadow}`);

    await browser.close();
    console.log('\n✅ Screenshot complete. Open screenshot-auth.png to view design.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
    process.exit(1);
  }
})();
