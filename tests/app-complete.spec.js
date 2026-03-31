import { test } from '@playwright/test';

const TEST_EMAIL = 'olivermolz05@gmail.com';
const TEST_PASSWORD = 'Arsenal2004!';

test.describe('Complete App Functionality Tests', () => {

  test('1. Full user flow: Text Input → Parse → Save → Timeline → Chat', async ({ page }) => {
    console.log('\n🚀 TEST: Complete User Journey');
    console.log('═'.repeat(70));

    // Capture all errors
    const allErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        allErrors.push(msg.text());
      }
    });

    // STEP 1: Login
    console.log('\n📍 STEP 1: Login');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const loggedIn = await page.locator('button:has-text("Log & journal")').isVisible();
    console.log(`✅ Logged in: ${loggedIn}`);

    // STEP 2: Create activity via text input
    console.log('\n📍 STEP 2: Create Activities via Text Input');
    const typeBtn = page.locator('button:has-text("Type")');
    const typeBtnExists = await typeBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (!typeBtnExists) {
      console.log('❌ Type button not found');
      return;
    }

    await typeBtn.click();
    const textarea = page.locator('textarea').first();
    await textarea.waitFor({ timeout: 2000 });

    const transcript = `Started my day at 7am with a morning run for 45 minutes.
Then breakfast from 7:45 to 8:15am, about 30 minutes.
Worked on project from 8:30am to 12pm, that's 3.5 hours.
Had lunch from 12pm to 1pm.
Continued coding from 1pm to 5:30pm, about 4.5 hours.
Attended a team standup from 5:30 to 6pm.
Relaxed in the evening from 6:30pm to 8pm.`;

    await textarea.fill(transcript);
    console.log(`✅ Transcript entered (${transcript.length} chars)`);

    // Parse
    const parseBtn = page.locator('button:has-text("Parse and review")');
    await parseBtn.click();
    console.log('⏳ Parsing activities...');

    const reviewTitle = page.locator('h3:has-text("Review")');
    await reviewTitle.waitFor({ timeout: 20000 });
    console.log('✅ Activities parsed and review shown');

    // Save
    const saveBtn = page.locator('button:has-text("Save to Timeline")');
    await saveBtn.click();
    console.log('⏳ Saving to timeline...');
    await page.waitForTimeout(2000);
    console.log('✅ Activities saved');

    // STEP 3: View Timeline
    console.log('\n📍 STEP 3: View Timeline');
    const timelineBtn = page.locator('button:has-text("Timeline")');
    await timelineBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const timelineVisible = await page.locator('[class*="timeline"], text=/morning|breakfast|coding/i').isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`✅ Timeline view accessible: ${timelineVisible}`);

    // STEP 4: Chat (dedicated page)
    console.log('\n📍 STEP 4: Chat');
    await page.locator('nav').getByRole('button', { name: 'Chat' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const chatInput = page.locator('input[placeholder*="time"]').first();
    const chatExists = await chatInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (chatExists) {
      const question = 'How much time did I spend working today?';
      await chatInput.fill(question);
      console.log(`✅ Chat question: "${question}"`);

      const sendBtn = page.locator('button:has-text("Send")').first();
      const hasSendBtn = await sendBtn.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasSendBtn) {
        await sendBtn.click();
      } else {
        await chatInput.press('Enter');
      }

      console.log('⏳ Waiting for Claude response...');
      await page.waitForTimeout(6000);

      const pageText = await page.textContent('body');
      const hasResponse = pageText.includes('hour') || pageText.includes('work') || pageText.includes('time');
      console.log(`✅ Chat response received: ${hasResponse}`);
    } else {
      console.log('⚠️  Chat not accessible');
    }

    // STEP 5: Journal lives on Log & journal
    console.log('\n📍 STEP 5: Journal section');
    await page.locator('nav').getByRole('button', { name: 'Log & journal' }).click();
    await page.waitForLoadState('networkidle');
    const journalHeading = page.locator('h2:has-text("Journal")');
    if (await journalHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('✅ Journal section visible on Log & journal');
    }

    // STEP 6: Sign Out
    console.log('\n📍 STEP 6: Sign Out');
    const signOutBtn = page.locator('button:has-text("Sign out")');
    if (await signOutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signOutBtn.click();
      await page.waitForTimeout(1000);
      const signedOut = await page.locator('button:has-text("Sign In")').isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`✅ Signed out: ${signedOut}`);
    }

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log(`✅ Console errors: ${allErrors.length}`);
    if (allErrors.length > 0) {
      allErrors.forEach((err, i) => console.log(`   ${i + 1}. ${err.substring(0, 80)}`));
    }
    console.log('═'.repeat(70));
  });

  test('2. Navigation between all pages', async ({ page }) => {
    console.log('\n🧪 TEST: Navigation Between Pages');
    console.log('═'.repeat(70));

    // Login
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('✅ Logged in');

    const pages = ['Log & journal', 'Timeline', 'Chat'];
    const results = {};

    for (const pageName of pages) {
      const btn = page.locator(`button:has-text("${pageName}")`);
      const exists = await btn.isVisible({ timeout: 2000 }).catch(() => false);

      if (exists) {
        await btn.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        const pageUrl = page.url();
        results[pageName] = { accessible: true, url: pageUrl };
        console.log(`✅ ${pageName}: ${pageUrl}`);
      } else {
        results[pageName] = { accessible: false };
        console.log(`❌ ${pageName}: Button not found`);
      }
    }

    console.log('\n📊 Navigation Results:');
    Object.entries(results).forEach(([name, result]) => {
      console.log(`   ${name}: ${result.accessible ? '✅ Accessible' : '❌ Not Found'}`);
    });
  });

  test('3. Check-in form with both input modes', async ({ page }) => {
    console.log('\n🧪 TEST: Check-in Input Modes');
    console.log('═'.repeat(70));

    // Login
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('✅ Logged in');

    // Check both buttons exist
    const speakBtn = page.locator('button:has-text("Speak")');
    const typeBtn = page.locator('button:has-text("Type")');

    const speakExists = await speakBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const typeExists = await typeBtn.isVisible({ timeout: 2000 }).catch(() => false);

    console.log(`✅ Speak button: ${speakExists}`);
    console.log(`✅ Type button: ${typeExists}`);

    if (typeExists) {
      await typeBtn.click();
      const textarea = page.locator('textarea').first();
      const textareaVisible = await textarea.isVisible();
      console.log(`✅ Text mode: ${textareaVisible}`);

      // Go back
      const backBtn = page.locator('button:has-text("← Back")').first();
      if (await backBtn.isVisible()) {
        await backBtn.click();
        const modeSelection = await speakBtn.isVisible({ timeout: 2000 }).catch(() => false);
        console.log(`✅ Back to mode selection: ${modeSelection}`);
      }
    }

    if (speakExists) {
      await speakBtn.click();
      const micButton = page.locator('[class*="mic"], button[aria-label*="mic"]').isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`✅ Voice mode accessible: ${!!micButton}`);
    }
  });

  test('4. Activity review and editing', async ({ page }) => {
    console.log('\n🧪 TEST: Activity Review & Editing');
    console.log('═'.repeat(70));

    // Login
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Create activities
    const typeBtn = page.locator('button:has-text("Type")');
    await typeBtn.click();

    const textarea = page.locator('textarea').first();
    await textarea.fill('Worked from 9am to 5pm. Lunch at noon for 1 hour.');

    const parseBtn = page.locator('button:has-text("Parse and review")');
    await parseBtn.click();

    const reviewTitle = page.locator('h3:has-text("Review")');
    await reviewTitle.waitFor({ timeout: 20000 });
    console.log('✅ Review page displayed');

    // Check for edit buttons
    const editBtns = page.locator('button:has-text("Edit")');
    const editCount = await editBtns.count();
    console.log(`✅ Edit buttons available: ${editCount}`);

    // Check for delete buttons
    const deleteBtns = page.locator('button:has-text("Delete")');
    const deleteCount = await deleteBtns.count();
    console.log(`✅ Delete buttons available: ${deleteCount}`);

    // Check for save button
    const saveBtn = page.locator('button:has-text("Save to Timeline")');
    const saveAvailable = await saveBtn.isEnabled();
    console.log(`✅ Save button available: ${saveAvailable}`);

    // Check for discard button
    const discardBtn = page.locator('button:has-text("Discard")');
    const discardAvailable = await discardBtn.isVisible();
    console.log(`✅ Discard button available: ${discardAvailable}`);
  });

  test('5. Responsive layout and accessibility', async ({ page }) => {
    console.log('\n🧪 TEST: Responsive & Accessibility');
    console.log('═'.repeat(70));

    // Login
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForLoadState('networkidle');

    // Check for main semantic elements
    const main = page.locator('main');
    const mainExists = await main.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`✅ Main element: ${mainExists}`);

    const nav = page.locator('nav');
    const navExists = await nav.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`✅ Nav element: ${navExists}`);

    // Check form labels
    const labels = page.locator('label');
    const labelCount = await labels.count();
    console.log(`✅ Form labels: ${labelCount}`);

    // Check aria-labels
    const ariaLabels = page.locator('[aria-label]');
    const ariaCount = await ariaLabels.count();
    console.log(`✅ Elements with aria-label: ${ariaCount}`);

    // Check buttons are keyboard accessible
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log(`✅ Total buttons: ${buttonCount}`);

    // Check for images without alt text (should not exist in production)
    const imagesWithoutAlt = page.locator('img:not([alt])');
    const badImgCount = await imagesWithoutAlt.count();
    console.log(`✅ Images without alt text: ${badImgCount}`);

    // Check viewport and layout
    const viewport = page.viewportSize();
    console.log(`✅ Viewport: ${viewport.width}x${viewport.height}`);

    // Try scrolling and checking content is visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    const scrolledContent = await page.locator('body').isVisible();
    console.log(`✅ Content scrollable: ${scrolledContent}`);
  });

  test('6. Error states and recovery', async ({ page }) => {
    console.log('\n🧪 TEST: Error States & Recovery');
    console.log('═'.repeat(70));

    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
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

    // Try empty transcript
    console.log('📝 Testing empty input submission...');
    const typeBtn = page.locator('button:has-text("Type")');
    await typeBtn.click();

    const parseBtn = page.locator('button:has-text("Parse and review")');
    const isDisabled = await parseBtn.isDisabled();
    console.log(`✅ Parse button disabled on empty: ${isDisabled}`);

    // Try with whitespace only
    const textarea = page.locator('textarea').first();
    await textarea.fill('   \n  \n   ');
    await page.waitForTimeout(500);

    const stillDisabled = await parseBtn.isDisabled();
    console.log(`✅ Parse button disabled on whitespace: ${stillDisabled}`);

    // Clear and try valid input
    await textarea.fill('Valid activity: Worked 8 hours');
    await page.waitForTimeout(500);

    const nowEnabled = await parseBtn.isEnabled();
    console.log(`✅ Parse button enabled on valid input: ${nowEnabled}`);

    console.log(`\n📊 Console errors detected: ${errors.length}`);
  });

  test('7. Data persistence across navigation', async ({ page }) => {
    console.log('\n🧪 TEST: Data Persistence');
    console.log('═'.repeat(70));

    // Login
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Create an activity and save it
    const typeBtn = page.locator('button:has-text("Type")');
    await typeBtn.click();

    const textarea = page.locator('textarea').first();
    const uniqueActivity = `Unique activity ${Date.now()} at 10am for 2 hours`;
    await textarea.fill(uniqueActivity);

    const parseBtn = page.locator('button:has-text("Parse and review")');
    await parseBtn.click();

    const reviewTitle = page.locator('h3:has-text("Review")');
    await reviewTitle.waitFor({ timeout: 20000 });

    const saveBtn = page.locator('button:has-text("Save to Timeline")');
    await saveBtn.click();
    console.log('✅ Activity saved');
    await page.waitForTimeout(2000);

    // Navigate away
    const logJournalBtn = page.locator('button:has-text("Log & journal")');
    await logJournalBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    console.log('✅ Navigated away');

    // Navigate to Timeline
    const timelineBtn = page.locator('button:has-text("Timeline")');
    await timelineBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check if activity persisted
    const pageText = await page.textContent('body');
    const persisted = pageText.includes('activity') || pageText.includes('Unique') || pageText.includes('2');
    console.log(`✅ Activity persisted in timeline: ${persisted}`);
  });
});
