import { test, expect } from '@playwright/test';

/** Same intent as manual coach testing: forgotten lunch → timeline. */
const COACH_LUNCH_MESSAGE =
  'i forgot to add an event yesterday of getting lunch with charlotte from 12-1pm. add that to timeline';

function sseBody(events) {
  return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
}

test.describe('Chat coach — timeline preview & transcript persistence', () => {
  test.describe.configure({ timeout: 90_000, retries: 2 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 60_000 });
  });

  test('timeline_preview_pending from coach opens Save to timeline; save completes', async ({ page }) => {
    await page.route('**/functions/v1/chat', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        body: sseBody([
          {
            type: 'text',
            text: 'I parsed yesterday’s lunch. Review and save when you’re ready.',
          },
          {
            type: 'timeline_preview_pending',
            source_text: 'lunch with charlotte 12-1pm yesterday',
            activities: [
              {
                activity: 'Lunch with Charlotte',
                duration_minutes: 60,
                start_time_inferred: '12:00 PM',
                category: 'personal',
              },
            ],
          },
          { type: 'done' },
        ]),
      });
    });

    await page.route('**/functions/v1/save-check-in', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, saved: true }),
      });
    });

    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Chat' }).click();

    const composer = page.getByPlaceholder(/Ask Prohairesis/);
    await expect(composer).toBeVisible({ timeout: 20000 });
    await expect(composer).toBeEnabled({ timeout: 20000 });

    await composer.fill(COACH_LUNCH_MESSAGE);
    await page.getByRole('button', { name: 'Send message' }).click();

    const timelineRegion = page.getByRole('region', { name: 'Timeline entry to confirm' });
    await expect(timelineRegion).toBeVisible({ timeout: 15000 });
    await expect(timelineRegion.getByText('Lunch with Charlotte', { exact: true })).toBeVisible();

    await timelineRegion.getByRole('button', { name: 'Save to timeline' }).click();
    await expect(timelineRegion).toBeHidden({ timeout: 15000 });
  });

  test('user chat message survives reload (session + DB persistence)', async ({ page }) => {
    await page.route('**/functions/v1/chat', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        body: sseBody([{ type: 'text', text: 'Noted.' }, { type: 'done' }]),
      });
    });

    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Chat' }).click();

    const composer = page.getByPlaceholder(/Ask Prohairesis/);
    await expect(composer).toBeEnabled({ timeout: 20000 });

    const marker = `Persistence marker ${Date.now()} — ${COACH_LUNCH_MESSAGE}`;
    await composer.fill(marker);
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText('Noted.')).toBeVisible({ timeout: 15000 });

    await page.reload();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 30000 });

    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Chat' }).click();
    await expect(page.getByPlaceholder(/Ask Prohairesis/)).toBeEnabled({ timeout: 20000 });
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20000 });
  });
});
