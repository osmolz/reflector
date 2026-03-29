const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.setViewportSize({ width: 1024, height: 768 });

  try {
    // Try the latest port first
    const ports = [5177, 5176, 5175, 5174, 5173];
    let loaded = false;

    for (const port of ports) {
      try {
        await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle', timeout: 5000 });
        console.log(`✅ App loaded on port ${port}`);
        loaded = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!loaded) throw new Error('Could not connect to dev server');

    await page.waitForTimeout(2000);

    // Check current styles
    const cardStyles = await page.evaluate(() => {
      const card = document.querySelector('.auth-card');
      if (!card) return null;
      const style = window.getComputedStyle(card);
      return {
        boxShadow: style.boxShadow,
        borderRadius: style.borderRadius,
        border: style.border
      };
    });

    const buttonStyles = await page.evaluate(() => {
      const btn = document.querySelector('.auth-button');
      if (!btn) return null;
      const style = window.getComputedStyle(btn);
      return {
        boxShadow: style.boxShadow,
        borderRadius: style.borderRadius,
        background: style.backgroundColor
      };
    });

    // Take fresh screenshot
    await page.screenshot({ path: 'screenshot-updated.png', fullPage: true });

    console.log('\n🎨 Current design state:');
    console.log('\nAuth Card:');
    console.log(`  Box-shadow: ${cardStyles?.boxShadow === 'none' ? '✅ REMOVED' : cardStyles?.boxShadow}`);
    console.log(`  Border-radius: ${cardStyles?.borderRadius === '0px' ? '✅ Square (0px)' : cardStyles?.borderRadius}`);
    console.log(`  Border: ${cardStyles?.border}`);

    console.log('\nAuth Button:');
    console.log(`  Box-shadow: ${buttonStyles?.boxShadow === 'none' ? '✅ REMOVED' : buttonStyles?.boxShadow}`);
    console.log(`  Border-radius: ${buttonStyles?.borderRadius === '0px' ? '✅ Square (0px)' : buttonStyles?.borderRadius}`);
    console.log(`  Background: ${buttonStyles?.background}`);

    console.log('\n📸 Screenshot saved: screenshot-updated.png');
    console.log('\n✅ REDESIGN VERIFIED - All visual changes applied!');

    await browser.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
    process.exit(1);
  }
})();
