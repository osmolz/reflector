import { test } from '@playwright/test';

const TEST_EMAIL = 'olivermolz05@gmail.com';
const TEST_PASSWORD = 'Arsenal2004!';

test('Debug: Chat failure investigation', async ({ page }) => {
  console.log('\n[find] DEBUGGING CHAT FAILURE');
  console.log('='.repeat(70));

  // Capture all network responses
  const responses = [];
  page.on('response', async (res) => {
    if (res.url().includes('/chat') || res.url().includes('/functions')) {
      const status = res.status();
      const url = res.url();
      let body = null;
      try {
        body = await res.clone().text();
      } catch (e) {
        body = '(could not read body)';
      }
      responses.push({ status, url, body: body?.substring(0, 200) });
      console.log(`\n[net] Response from: ${url}`);
      console.log(`   Status: ${status}`);
      console.log(`   Body: ${body?.substring(0, 300)}`);
    }
  });

  // Capture console
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warn') {
      console.log(`   [log] [${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  // Login
  console.log('\n[step] STEP 1: Login');
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.locator('button:has-text("Sign In")').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('[OK] Logged in');

  // Create some activities first
  console.log('\n[step] STEP 2: Create activities for chat to analyze');
  const typeBtn = page.locator('button:has-text("Type")');
  if (await typeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await typeBtn.click();
    const textarea = page.locator('textarea').first();
    await textarea.fill('Worked from 9am to 5pm with 1 hour lunch at noon. Total 7 hours work.');

    const parseBtn = page.locator('button:has-text("Parse and review")');
    await parseBtn.click();

    const reviewTitle = page.locator('h3:has-text("Review")');
    await reviewTitle.waitFor({ timeout: 20000 });
    console.log('[OK] Activities parsed');

    const saveBtn = page.locator('button:has-text("Save to Timeline")');
    await saveBtn.click();
    await page.waitForTimeout(2000);
    console.log('[OK] Activities saved');
  }

  // Now test chat
  console.log('\n[step] STEP 3: Send chat question');

  // Scroll to chat
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  const chatInput = page.locator('input[placeholder*="time"]').first();
  const chatExists = await chatInput.isVisible({ timeout: 2000 }).catch(() => false);

  if (!chatExists) {
    console.log('[FAIL] Chat input not found');
    return;
  }

  const question = 'How much time did I spend working today?';
  await chatInput.click();
  await chatInput.fill(question);
  console.log(`[note] Question: "${question}"`);

  // Manually inspect the request that will be sent
  console.log('\n[step] Checking what data will be sent:');

  const session = await page.evaluate(() => {
    return localStorage.getItem('sb-jjwmtqkjpbaviwdvyuuq-auth-token');
  });
  console.log(`   Has session token: ${!!session}`);

  // Send the question
  const sendBtn = page.locator('button:has-text("Send")').first();
  if (await sendBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('... Clicking Send button...');
    await sendBtn.click();
  } else {
    console.log('... Using Enter key to send...');
    await chatInput.press('Enter');
  }

  // Wait for response
  console.log('\n... Waiting for chat response (30s)...');
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(5000);

    const pageText = await page.textContent('body');
    const hasResponse = pageText.includes('Claude:') || pageText.includes('time') || pageText.includes('hour');

    if (hasResponse) {
      console.log(`[OK] Response found!`);
      break;
    }

    if (i === 5) {
      console.log('[FAIL] No response after 30 seconds');
    }
  }

  // Check for error messages on page
  console.log('\n[step] STEP 4: Check for errors');
  const errorMsg = page.locator('[class*="error"]');
  const hasError = await errorMsg.isVisible({ timeout: 1000 }).catch(() => false);
  if (hasError) {
    const errorText = await errorMsg.textContent();
    console.log(`[FAIL] Error on page: ${errorText}`);
  }

  // Final page content
  console.log('\n[step] STEP 5: Final page state');
  const pageText = await page.textContent('body');
  const lines = pageText.split('\n').filter(l => l.trim().includes('Claude') || l.trim().includes('time') || l.trim().includes('hour'));
  if (lines.length > 0) {
    console.log('Relevant page content:');
    lines.forEach(line => console.log(`   ${line.substring(0, 100)}`));
  } else {
    console.log('No response text found on page');
  }

  // Summary of all API calls
  console.log('\n[data] ALL API RESPONSES:');
  console.log(`Total API calls: ${responses.length}`);
  responses.forEach((res, i) => {
    console.log(`\n${i + 1}. ${res.url.split('/functions')[1] || res.url.substring(res.url.length - 50)}`);
    console.log(`   Status: ${res.status}`);
    if (res.body && res.body.length > 0) {
      console.log(`   Body: ${res.body}`);
    }
  });
});
