# Google Calendar Integration - E2E Testing Checklist

**Date Created:** 2026-03-30
**Feature:** Google Calendar Sync and Event Creation
**Status:** Manual E2E Testing Plan

---

## Overview

This checklist provides comprehensive manual testing scenarios for the Google Calendar integration feature.

Test all flows with a real Google Calendar account connected to the application.

---

## Environment Setup

**Prerequisites:**
- Chrome 90+, Firefox 88+, or Safari 14+
- Real Google Account with calendar enabled
- OAuth scopes: `calendar.readonly` (for sync), `calendar` (for push)
- Test Google Calendar created with 10-15 sample events
- Time zone set to US/Eastern (or consistent timezone)
- Network connection (stable internet, not corporate proxy)

**Test Accounts:**
- Primary Google account with personal calendar
- Secondary account for sharing tests (optional)

**Test Data:**
- Create sample events: all-day event, multi-day event, recurring event, event with description
- Create sample time entries in app: 30min, 1hr, 2hr durations
- Have at least 1 time entry overlapping with a calendar event

**Environment Variables:**
- `VITE_SUPABASE_URL` configured for test environment
- `VITE_SUPABASE_ANON_KEY` pointing to test database

**Known Test Parameters:**
- Date format: ISO 8601 (YYYY-MM-DD)
- Time format: 24-hour (HH:MM)
- Maximum sync range: 1 year
- Rate limit: 50 API calls/minute

---

## 1. Sync Flow - Pull Calendar Events

### 1.1 - Sync Button Visibility and Access

- [ ] Navigate to Timeline view
- [ ] Verify Sync with Google Calendar button is visible and clickable
- [ ] Button is disabled if user is not authenticated with Google
- [ ] **Validation:** Button state correctly reflects auth status

### 1.2 - Modal Opens with Date Range Presets

- [ ] Click Sync with Google Calendar button
- [ ] Modal dialog opens with title
- [ ] Modal contains Today, This Week, Custom Range options
- [ ] **Validation:** All preset options are accessible

### 1.3 - Sync Today Preset

- [ ] Select Today preset option
- [ ] Click Sync button
- [ ] Loading indicator appears
- [ ] Success message appears
- [ ] **Validation:** Sync completes without errors

### 1.4 - Calendar Events Appear on Timeline

- [ ] After sync, verify calendar events are displayed
- [ ] Events are listed chronologically
- [ ] **Validation:** Events display correctly

### 1.5 - Calendar Events Have Distinct Styling

- [ ] Calendar events have light blue background
- [ ] Events are visually distinct from time entries
- [ ] **Validation:** Visual distinction is clear and professional

### 1.6 - Calendar Events Are Read-Only

- [ ] Attempt to click/select a calendar event
- [ ] Verify no edit form or modal appears
- [ ] Verify event details cannot be edited
- [ ] **Validation:** Events are protected from modification

### 1.7 - Sync This Week Preset

- [ ] Open sync modal again
- [ ] Select This Week preset
- [ ] Click Sync
- [ ] **Validation:** Week sync works correctly

### 1.8 - Custom Date Range Picker

- [ ] Select Custom Range option
- [ ] Date picker appears
- [ ] Select custom dates and sync
- [ ] **Validation:** Custom ranges work correctly

### 1.9 - Error Handling - Missing Google Auth

- [ ] Revoke OAuth permissions
- [ ] Click Sync with Google Calendar
- [ ] Error message appears
- [ ] **Validation:** Missing auth is handled gracefully

### 1.10 - Error Handling - Invalid Date Range

- [ ] Enter invalid dates
- [ ] Verify error message displays
- [ ] **Validation:** Invalid input is caught

### 1.11 - Error Handling - Network Errors

- [ ] Simulate network disconnection
- [ ] Verify error message appears
- [ ] **Validation:** Network errors handled gracefully

### 1.12 - Error Handling - API Errors

- [ ] Simulate Google Calendar API error
- [ ] Verify error message displays
- [ ] **Validation:** API errors handled user-friendly

### 1.13 - Sync Idempotency

- [ ] Sync Today events twice
- [ ] Verify no duplicates appear
- [ ] **Validation:** Re-syncing works correctly

---

## 2. Push Flow - Create Calendar Event from Time Entry

### 2.1 - Add to Google Calendar Button Visibility

- [ ] Navigate to Timeline with time entries
- [ ] Verify Add to Google Calendar button exists
- [ ] Button is disabled if not authenticated
- [ ] **Validation:** Action is discoverable

### 2.2 - Click Add to Google Calendar

- [ ] Click the button
- [ ] Modal opens with event details
- [ ] **Validation:** Modal opens correctly

### 2.3 - Modal Shows Event Details

- [ ] Title field pre-filled with activity name
- [ ] Start Time field pre-filled
- [ ] End Time field pre-filled
- [ ] Duration calculated and shown
- [ ] **Validation:** All details accessible and pre-filled

### 2.4 - Modify Event Title

- [ ] In modal, clear title field and enter new title
- [ ] Verify input is accepted
- [ ] **Validation:** Title field is editable and accepts new values

### 2.5 - Modify Event Start Time

- [ ] In modal, change start time to earlier time
- [ ] Verify duration recalculates
- [ ] **Validation:** Start time modification updates duration correctly

### 2.6 - Modify Event End Time

- [ ] In modal, change end time to later time
- [ ] Verify duration recalculates
- [ ] **Validation:** End time modification updates duration correctly

### 2.7 - Verify Duration Calculation

- [ ] Set start time to 2:00 PM and end time to 3:30 PM
- [ ] Verify duration shows 1 hour 30 minutes
- [ ] **Validation:** Duration calculated correctly (read-only)

### 2.8 - Cancel Operation

- [ ] Fill in form with new title
- [ ] Click Cancel button
- [ ] Verify modal closes
- [ ] Verify event was NOT created in Google Calendar
- [ ] **Validation:** Cancel button discards changes safely

### 2.9 - Success Confirmation

- [ ] Fill in event details
- [ ] Click Add to Calendar button
- [ ] Verify success message appears with checkmark
- [ ] Verify modal closes after 1.5 seconds
- [ ] **Validation:** Success feedback is clear and timely

### 2.10 - Error: Missing Google Auth

- [ ] Revoke Google Calendar permissions
- [ ] Click Add to Google Calendar on time entry
- [ ] Fill form and click "Add to Calendar"
- [ ] Verify error message appears (auth required)
- [ ] **Validation:** Auth errors handled gracefully

### 2.11 - Error: Google Calendar API Failure

- [ ] Simulate API outage (use network throttling in DevTools)
- [ ] Click Add to Google Calendar
- [ ] Attempt to create event
- [ ] Verify error message displays
- [ ] **Validation:** API errors show user-friendly message

### 2.12 - Error: Invalid Time Range

- [ ] Set start time after end time
- [ ] Click Add to Calendar
- [ ] Verify validation error appears
- [ ] **Validation:** Invalid ranges rejected before API call

### 2.13 - Verify Event Appears in Google Calendar

- [ ] After successful creation, open Google Calendar in new tab
- [ ] Locate the newly created event
- [ ] Verify event title, start, and end time match
- [ ] **Validation:** Event successfully pushed to Google Calendar

### 2.14 - Verify Event Appears on Timeline After Sync

- [ ] Return to Prohairesis app
- [ ] Click Sync with Google Calendar
- [ ] Verify newly created event appears on timeline
- [ ] **Validation:** Push-created events sync back correctly

---

## 3. Coach Integration with Calendar Context

### 3.1 - Coach Sees Calendar Events in Context

**Objective:** Verify coach has access to calendar events and can reference them

**Steps:**
- [ ] Sync calendar events (at least 3 events)
- [ ] Open Coach chat
- [ ] Ask coach: "What events do I have on my calendar today?"
- [ ] Verify coach lists the calendar events by name and time

**Validation:** Coach can see and reference calendar events by name and time

### 3.2 - Coach Makes Calendar-Aware Suggestions

**Objective:** Verify coach considers calendar when suggesting activities

**Steps:**
- [ ] Create a time entry during a busy calendar period
- [ ] Ask coach: "What should I do in the next 2 hours?"
- [ ] Verify coach acknowledges calendar conflicts
- [ ] Verify suggestions don't overlap with existing events

**Validation:** Coach suggestions account for calendar constraints

### 3.3 - Coach Cannot Create Calendar Events

**Objective:** Verify coach has read-only access (no create/delete/modify tools)

**Steps:**
- [ ] In coach chat, ask: "Can you add an event to my calendar?"
- [ ] Verify coach responds that it can only suggest, not create
- [ ] Check that no calendar event is created
- [ ] Verify coach recommends using "Add to Calendar" button instead

**Validation:** Coach reads calendar but cannot modify it

### 3.4 - Calendar Context Persists Across Messages

**Objective:** Verify coach remembers calendar context in conversation

**Steps:**
- [ ] Sync calendar with 2-3 events
- [ ] Ask coach: "What meetings do I have?"
- [ ] Coach responds with meeting list
- [ ] Ask follow-up: "How much free time before the first one?"
- [ ] Verify coach uses previously mentioned events to answer
- [ ] Ask another follow-up about a specific event from earlier message
- [ ] Verify coach remembers without re-listing events

**Validation:** Coach maintains calendar context across multiple messages

---

## 4. Data Integrity and Persistence

- [ ] Events survive page refresh
- [ ] Timezone handling is correct
- [ ] All-day events handled properly
- [ ] Deleted events reflected in sync
- [ ] Modified events updated in Prohairesis
- [ ] Events merge and sort correctly
- [ ] **Validation:** Data integrity maintained

---

## 5. Edge Cases and Error Recovery

- [ ] Offline sync handled gracefully
- [ ] Large date ranges processed correctly
- [ ] Concurrent operations managed safely
- [ ] Optional fields dont cause failures
- [ ] Long input handled gracefully
- [ ] Rate limiting prevents duplicate operations
- [ ] **Validation:** Edge cases handled appropriately

---

## 6. Performance and UX

- [ ] Sync completes in < 10 seconds
- [ ] Modals load in < 500ms
- [ ] Timeline scrolls smoothly with 50+ events
- [ ] Mobile UX acceptable
- [ ] **Validation:** Performance meets standards

---

## 7. Accessibility

### 7.1 - Keyboard Navigation

**Tool:** Browser (no external tool needed)

**Steps:**
- [ ] Click on page, then press Tab repeatedly to navigate through all modal elements
- [ ] Verify focus order is logical: Button → Modal → Title → Form fields → Buttons → Close
- [ ] Press Enter on focused "Sync" button to trigger sync
- [ ] Press Escape in modal to close it
- [ ] **WCAG Criterion:** WCAG 2.1 AA 2.1.1 (Keyboard accessible)

### 7.2 - Screen Reader Compatibility

**Tool:** NVDA (Windows) or JAWS (Windows), or VoiceOver (Mac)

**Steps:**
- [ ] Enable screen reader
- [ ] Navigate to sync button and activate it
- [ ] Verify modal is announced as a dialog
- [ ] Verify form labels are read aloud with each input
- [ ] Verify error messages are announced with role="alert"
- [ ] Verify success messages are announced with role="status"
- [ ] **WCAG Criterion:** WCAG 2.1 AA 4.1.3 (Name, Role, Value)

### 7.3 - Color Contrast

**Tool:** axe DevTools (browser extension) OR Lighthouse (Chrome DevTools)

**Steps:**
- [ ] Install axe DevTools extension or use Lighthouse
- [ ] Run accessibility audit on SyncCalendarModal
- [ ] Verify all text has contrast ratio ≥ 4.5:1 (normal text) or 3:1 (large text)
- [ ] Check modal background vs text color
- [ ] Check error message color vs background
- [ ] **WCAG Criterion:** WCAG 2.1 AA 1.4.3 (Contrast Minimum)

### 7.4 - Form Labels and Error Messages

**Tool:** Browser Inspector (F12)

**Steps:**
- [ ] Inspect title input field with browser DevTools
- [ ] Verify `<label>` element with matching `for="id"` attribute exists
- [ ] Trigger validation error (leave date empty, click sync)
- [ ] Verify error message has `role="alert"`
- [ ] Verify error message is announced by screen readers
- [ ] **WCAG Criterion:** WCAG 2.1 AA 3.3.1 (Error Identification)

### 7.5 - Focus Indicators and Visibility

**Tool:** Browser keyboard navigation

**Steps:**
- [ ] Use Tab to navigate through form
- [ ] Verify focused elements have visible focus indicator (outline or highlight)
- [ ] Verify focus indicator has sufficient contrast
- [ ] Verify buttons show focus state when tabbed to
- [ ] **WCAG Criterion:** WCAG 2.1 AA 2.4.7 (Focus Visible)

---

## Known Issues

Document any issues found during testing here. Use this table to track bugs discovered during E2E testing.

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| Example: Modal doesn't close after 1.5s | Major | Open | Affects user experience, needs fix before release |
| | | | |
| | | | |

**Severity Levels:**
- **Critical:** Feature completely broken, blocks other tests, security issue
- **Major:** Feature partially broken, impacts core workflow
- **Minor:** Edge case, cosmetic issue, not blocking release

---

## Test Summary

**Test Execution Date:** __________

**Total Test Cases:** 100+ (Environment Setup + Sections 1-7)

**Test Results:**
- **Passed:** _____ / _____
- **Failed:** _____ / _____
- **Blocked:** _____ / _____ (environment issue, not code issue)
- **Skipped:** _____ / _____ (not applicable for this build)

**Test Categories:**
- Sync Flow: _____ / 13 passed
- Push Flow: _____ / 14 passed
- Coach Integration: _____ / 4 passed
- Data Integrity: _____ / 6 passed
- Edge Cases: _____ / 8 passed
- Performance & UX: _____ / 6 passed
- Accessibility: _____ / 5 passed

**Pass Criteria:**
- [OK] **Release Ready:** All critical tests passed, all major tests passed, ≤1 minor issue
- [WARN] **Conditional Release:** All critical tests passed, 1-2 major issues with documented workarounds
- [FAIL] **Hold:** Any critical or blocking test failed

**Release Readiness Checklist:**
- [ ] All 13 Sync Flow tests passed
- [ ] All 14 Push Flow tests passed
- [ ] All 4 Coach Integration tests passed
- [ ] All 6 Data Integrity tests passed
- [ ] All 8 Edge Case tests handled
- [ ] All 6 Performance tests meet targets
- [ ] All 5 Accessibility tests compliant
- [ ] No critical issues open
- [ ] All major issues have documented workarounds

**Tester Information:**
- Tester Name: _________________________
- Environment: Chrome _____ / Firefox _____ / Safari _____
- Test Date: _________________________
- Notes: _____________________________________________________________________________

## Sign-Off

- [ ] All critical tests passed
- [ ] All major tests passed
- [ ] Ready for production
- [ ] Issues documented

**Approved by:** _________________________ **Date:** __________
