import { test } from '@playwright/test';

const TEST_EMAIL = 'olivermolz05@gmail.com';
const TEST_PASSWORD = 'Arsenal2004!';

test('Debug API calls and network errors', async ({ page }) => {
  console.log('\n🔍 Debugging API Calls and Network Issues');
  console.log('═'.repeat(60));

  const networkRequests = [];
  const networkErrors = [];

  // Capture all network activity
  page.on('request', request => {
    const url = request.url();
    if (url.includes('supabase') || url.includes('anthropic') || url.includes('/functions')) {
      networkRequests.push({
        method: request.method(),
        url: url,
        time: new Date().toISOString(),
      });
      console.log(`📤 [${request.method()}] ${url}`);
    }
  });

  page.on('response', response => {
    const url = response.url();
    if (url.includes('supabase') || url.includes('anthropic') || url.includes('/functions')) {
      const status = response.status();
      console.log(`📥 [${status}] ${url}`);

      if (status >= 400) {
        networkErrors.push({
          url,
          status,
          statusText: response.statusText(),
        });
      }
    }
  });

  page.on('console', msg => {
    console.log(`📋 [${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  // Login
  console.log('\n🔓 Logging in...');
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.locator('button:has-text("Sign In")').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('✅ Logged in');

  // Try parsing
  console.log('\n📝 Starting parse test...');
  const typeBtn = page.locator('button:has-text("✍️ Type")');
  await typeBtn.click();

  const textarea = page.locator('textarea').first();
  await textarea.fill('Woke up at 7am. Worked 8 hours. Had lunch. Went to gym.');

  console.log('⏳ Clicking Parse button...');
  const parseBtn = page.locator('button:has-text("Parse & Continue")');
  await parseBtn.click();

  // Wait and watch for API calls
  console.log('\n⏳ Monitoring API calls for 15 seconds...');
  await page.waitForTimeout(15000);

  // Check what we captured
  console.log(`\n📊 Network Activity Summary:`);
  console.log(`   Total API calls: ${networkRequests.length}`);
  console.log(`   Failed requests: ${networkErrors.length}`);

  if (networkRequests.length > 0) {
    console.log('\n📤 API Calls Made:');
    networkRequests.forEach(req => {
      console.log(`   ${req.method} ${req.url.split('?')[0].substring(0, 80)}`);
    });
  }

  if (networkErrors.length > 0) {
    console.log('\n❌ Failed Requests:');
    networkErrors.forEach(err => {
      console.log(`   [${err.status}] ${err.statusText} - ${err.url.substring(0, 60)}`);
    });
  }

  // Check for specific Supabase function calls
  const parseApiCalls = networkRequests.filter(r => r.url.includes('parse'));
  const chatApiCalls = networkRequests.filter(r => r.url.includes('chat'));

  console.log(`\n🔎 Specific Function Calls:`);
  console.log(`   Parse function calls: ${parseApiCalls.length}`);
  console.log(`   Chat function calls: ${chatApiCalls.length}`);

  if (parseApiCalls.length > 0) {
    console.log('\n✅ Parse function WAS called');
  } else {
    console.log('\n❌ Parse function was NOT called');
  }

  // Check for any error indicators on the page
  const errorElement = page.locator('[class*="error"], text=/error|failed/i');
  const hasError = await errorElement.isVisible({ timeout: 1000 }).catch(() => false);
  if (hasError) {
    const errorText = await errorElement.textContent();
    console.log(`\n⚠️  Error message on page: ${errorText}`);
  }

  // Check browser console for auth/API errors
  console.log('\n🔐 Checking for auth/API issues...');
  const pageText = await page.textContent('body');
  if (pageText.includes('401') || pageText.includes('unauthorized') || pageText.includes('Unauthorized')) {
    console.log('⚠️  Unauthorized error detected');
  }
  if (pageText.includes('ANTHROPIC_API_KEY')) {
    console.log('⚠️  API key configuration issue detected');
  }
});
