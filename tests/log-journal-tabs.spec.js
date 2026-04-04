import { test, expect } from '@playwright/test';

/**
 * Covers Log/Journal sub-tabs: a11y roles, hints, date field, keyboard roving tabindex.
 * Requires a logged-in session — fresh contexts use anonymous sign-in when enabled in Supabase.
 */
test.describe('Log journal — Time / Journal tabs', () => {
  test.describe.configure({ timeout: 90_000, retries: 2 });
  test('loads main app with tablist and Time selected by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 60_000 });

    const tablist = page.getByRole('tablist', { name: 'Choose time log or journal' });
    await expect(tablist).toBeVisible();

    const timeTab = page.getByRole('tab', { name: 'Time' });
    const journalTab = page.getByRole('tab', { name: 'Journal' });
    await expect(timeTab).toHaveAttribute('aria-selected', 'true');
    await expect(journalTab).toHaveAttribute('aria-selected', 'false');

    await expect(page.getByText('Log activities and durations for your timeline.')).toBeVisible();

    await expect(page.locator('#log-panel-time')).toBeVisible();
    await expect(page.locator('#log-panel-journal')).toBeHidden();

    await expect(page.locator('#log-panel-time').getByLabel('Date for this log')).toBeVisible();
  });

  test('Journal tab shows journal panel and updates hint', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 60_000 });

    await page.getByRole('tab', { name: 'Journal' }).click();

    await expect(page.getByRole('tab', { name: 'Journal' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Time' })).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByText('Write a free-form note for yourself.')).toBeVisible();

    await expect(page.locator('#log-panel-journal')).toBeVisible();
    await expect(page.locator('#log-panel-time')).toBeHidden();

    await expect(page.locator('#log-panel-journal').getByLabel('Date for this log')).toBeVisible();
    await expect(page.getByText('Entry is saved for this calendar day.')).toBeVisible();
  });

  test('ArrowRight / ArrowLeft move selection between tabs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 60_000 });

    const timeTab = page.getByRole('tab', { name: 'Time' });
    const journalTab = page.getByRole('tab', { name: 'Journal' });

    await timeTab.focus();
    await expect(timeTab).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(journalTab).toBeFocused();
    await expect(journalTab).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowLeft');
    await expect(timeTab).toBeFocused();
    await expect(timeTab).toHaveAttribute('aria-selected', 'true');
  });
});
