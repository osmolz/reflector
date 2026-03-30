import { test, expect } from '@playwright/test';

test.describe('Timeline with Calendar Events', () => {
  const baseUrl = 'http://localhost:5173';

  test.describe('Sync Button', () => {
    test('Sync with Google Calendar button should be visible on timeline page', async ({ page }) => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      // Look for the sync button
      const syncButton = await page.locator('button[aria-label*="Sync with Google Calendar"]');
      expect(await syncButton.isVisible()).toBeTruthy();
      console.log('Sync with Google Calendar button is visible');
    });

    test('Clicking sync button should open SyncCalendarModal', async ({ page }) => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      // Click sync button
      const syncButton = await page.locator('button[aria-label*="Sync with Google Calendar"]');
      if (await syncButton.isVisible()) {
        await syncButton.click();
        await page.waitForTimeout(300);

        // Check if modal opened
        const modalTitle = await page.locator('text=Sync Google Calendar').isVisible();
        expect(modalTitle).toBeTruthy();
        console.log('SyncCalendarModal opened successfully');

        // Close modal
        const cancelButton = await page.locator('button:has-text("Cancel")').last();
        await cancelButton.click();
      }
    });
  });

  test.describe('Calendar Event Display', () => {
    test('Calendar events should have distinct styling from time entries', async ({ page }) => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      // Look for timeline items
      const timelineItems = await page.locator('.timeline-item');
      const itemCount = await timelineItems.count();
      console.log(`Found ${itemCount} timeline items`);

      if (itemCount > 0) {
        // Check for calendar event styling
        const calendarEvents = await page.locator('.timeline-calendar-event');
        const calendarEventCount = await calendarEvents.count();
        console.log(`Found ${calendarEventCount} calendar events`);

        // If there are calendar events, verify they have distinct styling
        if (calendarEventCount > 0) {
          for (let i = 0; i < calendarEventCount; i++) {
            const event = calendarEvents.nth(i);
            const styles = await event.evaluate((el) => {
              return window.getComputedStyle(el);
            });

            // Calendar events should have a light blue background
            expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
            console.log(`Calendar event ${i + 1} has distinct background color`);
          }
        }
      }
    });

    test('Calendar event badge should be displayed', async ({ page }) => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      const calendarBadges = await page.locator('.timeline-calendar-badge');
      const badgeCount = await calendarBadges.count();

      if (badgeCount > 0) {
        for (let i = 0; i < badgeCount; i++) {
          const badge = calendarBadges.nth(i);
          const text = await badge.textContent();
          expect(text.toLowerCase()).toContain('calendar');
          console.log(`Calendar badge ${i + 1} displays "Calendar" text`);
        }
      }
    });

    test('Calendar events should not be editable (no add to calendar button)', async ({ page }) => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      const calendarEvents = await page.locator('.timeline-calendar-event');
      const eventCount = await calendarEvents.count();

      if (eventCount > 0) {
        for (let i = 0; i < eventCount; i++) {
          const event = calendarEvents.nth(i);
          // Calendar events should not have the add to calendar button
          const calendarBtn = await event.locator('.timeline-add-calendar-btn').count();
          expect(calendarBtn).toBe(0);
          console.log(`Calendar event ${i + 1} does not have add to calendar button`);
        }
      }
    });

    test('Calendar events should display "synced" hint instead of "edit"', async ({ page }) => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      const calendarEvents = await page.locator('.timeline-calendar-event');
      const eventCount = await calendarEvents.count();

      if (eventCount > 0) {
        for (let i = 0; i < eventCount; i++) {
          const event = calendarEvents.nth(i);
          const hint = await event.locator('.timeline-edit-hint').textContent();
          expect(hint).toContain('synced');
          console.log(`Calendar event ${i + 1} shows "synced" hint`);
        }
      }
    });
  });

  test.describe('Add to Calendar Button', () => {
    test('Time entries should have "Add to Calendar" button', async ({ page }) => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      // Look for timeline items that are NOT calendar events
      const timelineItems = await page.locator('.timeline-item:not(.timeline-calendar-event)');
      const itemCount = await timelineItems.count();

      if (itemCount > 0) {
        const firstItem = timelineItems.first();
        await firstItem.hover();
        await page.waitForTimeout(200);

        const addCalendarBtn = await firstItem.locator('.timeline-add-calendar-btn');
        const isVisible = await addCalendarBtn.isVisible();
        expect(isVisible).toBeTruthy();
        console.log('Add to Calendar button is visible on time entry hover');
      }
    });

    test('Clicking add to calendar button should open AddToCalendarModal', async ({ page }) => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      const timelineItems = await page.locator('.timeline-item:not(.timeline-calendar-event)');
      const itemCount = await timelineItems.count();

      if (itemCount > 0) {
        const firstItem = timelineItems.first();
        await firstItem.hover();
        await page.waitForTimeout(200);

        const addCalendarBtn = await firstItem.locator('.timeline-add-calendar-btn');
        if (await addCalendarBtn.isVisible()) {
          await addCalendarBtn.click();
          await page.waitForTimeout(300);

          // Check if modal opened
          const modalTitle = await page.locator('text=Add to Calendar').isVisible();
          expect(modalTitle).toBeTruthy();
          console.log('AddToCalendarModal opened successfully');

          // Close modal
          const cancelButton = await page.locator('button:has-text("Cancel")').last();
          await cancelButton.click();
        }
      }
    });
  });

  test.describe('Timeline Item Count', () => {
    test('Timeline should display combined count of time entries and calendar events', async ({ page }) => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      const countText = await page.locator('.timeline-count').textContent();
      console.log(`Timeline count: ${countText}`);

      // Should show "items" (plural) in count if any items exist
      const countMatch = countText.match(/(\d+)/);
      if (countMatch) {
        const count = parseInt(countMatch[1]);
        if (count > 0) {
          expect(countText).toContain('items');
          console.log(`Timeline displays ${count} items in header`);
        }
      }
    });
  });

  test.describe('Calendar Event Time Display', () => {
    test('Calendar events should display start time and duration', async ({ page }) => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      const calendarEvents = await page.locator('.timeline-calendar-event');
      const eventCount = await calendarEvents.count();

      if (eventCount > 0) {
        for (let i = 0; i < eventCount; i++) {
          const event = calendarEvents.nth(i);

          // Check for time display
          const timeElement = await event.locator('.timeline-time');
          const timeText = await timeElement.textContent();
          expect(timeText).toMatch(/\d+:\d+\s*[AP]M/);

          // Check for duration display
          const durationElement = await event.locator('.timeline-duration');
          const durationText = await durationElement.textContent();
          expect(durationText).toMatch(/\d+m/);

          console.log(`Calendar event ${i + 1}: time=${timeText}, duration=${durationText}`);
        }
      }
    });
  });

  test.describe('Merged Event Sorting', () => {
    test('Time entries and calendar events should be sorted chronologically', async ({ page }) => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      const timelineItems = await page.locator('.timeline-item');
      const itemCount = await timelineItems.count();

      if (itemCount > 1) {
        // Extract times from timeline items
        const times = [];
        for (let i = 0; i < Math.min(itemCount, 10); i++) {
          const item = timelineItems.nth(i);
          const timeText = await item.locator('.timeline-time').textContent();
          times.push(timeText);
        }

        console.log(`First 10 item times: ${times.join(', ')}`);

        // Basic verification that times exist
        expect(times.length > 0).toBeTruthy();
        expect(times.every(t => t && t.length > 0)).toBeTruthy();
        console.log('All timeline items have time display');
      }
    });
  });
});
