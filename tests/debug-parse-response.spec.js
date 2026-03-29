import { test } from '@playwright/test';

const TEST_EMAIL = 'olivermolz05@gmail.com';
const TEST_PASSWORD = 'Arsenal2004!';

test('Debug: Capture parse API response', async ({ page }) => {
  console.log('\n📡 Capturing Parse API Response');

  const requests = [];
  const responses = [];

  page.on('request', req => {
    if (req.url().includes('/parse')) {
      requests.push({
        method: req.method(),
        url: req.url(),
        time: new Date().toISOString(),
      });
      console.log(`📤 Request: ${req.method()} ${req.url()}`);
    }
  });

  page.on('response', async res => {
    if (res.url().includes('/parse')) {
      const status = res.status();
      console.log(`📥 Response: ${status}`);

      try {
        const body = await res.json();
        console.log(`   Body: ${JSON.stringify(body).substring(0, 200)}`);
        responses.push({ status, body, time: new Date().toISOString() });
      } catch (e) {
        console.log(`   (Could not parse JSON)`);
      }
    }
  });

  // Login
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.locator('button:has-text("Sign In")').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click Type and enter text
  const typeBtn = page.locator('button:has-text("✍️ Type")');
  await typeBtn.click();
  const textarea = page.locator('textarea').first();
  await textarea.fill('Woke at 7am. Worked 8 hours. Lunch noon. Gym at 5pm.');

  // Click Parse
  console.log('\n⏳ Clicking Parse...');
  const parseBtn = page.locator('button:has-text("Parse & Continue")');
  await parseBtn.click();

  // Wait for response
  console.log('\n⏳ Waiting for response...');
  await page.waitForTimeout(20000);

  // Report
  console.log(`\n📊 Summary:`);
  console.log(`   Requests sent: ${requests.length}`);
  console.log(`   Responses received: ${responses.length}`);

  if (responses.length > 0) {
    responses.forEach((res, i) => {
      console.log(`\n   Response ${i+1}:`);
      console.log(`      Status: ${res.status}`);
      console.log(`      Time: ${res.time}`);
      if (res.body) {
        if (res.body.activities) {
          console.log(`      Activities: ${res.body.activities.length}`);
        } else if (res.body.error) {
          console.log(`      Error: ${res.body.error}`);
        } else {
          console.log(`      Data: ${JSON.stringify(res.body).substring(0, 100)}`);
        }
      }
    });
  } else {
    console.log('\n❌ No response received from parse API!');
  }
});
