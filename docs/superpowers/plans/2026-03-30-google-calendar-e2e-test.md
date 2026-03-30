# Google Calendar Integration - E2E Testing Checklist

**Date Created:** 2026-03-30
**Feature:** Google Calendar Sync and Event Creation
**Status:** Manual E2E Testing Plan

---

## Overview

This checklist provides comprehensive manual testing scenarios for the Google Calendar integration feature.

Test all flows with a real Google Calendar account connected to the application.

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

### 2.4 through 2.14 - Event Modification and Error Handling

- [ ] Modify title, start time, end time, duration as needed
- [ ] Click Add to Calendar button
- [ ] Verify event appears in Google Calendar
- [ ] Verify event appears after re-sync
- [ ] Test error handling scenarios
- [ ] **Validation:** All push flow tests pass

---

## 3. Coach Integration with Calendar Context

- [ ] Coach sees and acknowledges calendar events
- [ ] Coach suggests activities with calendar awareness
- [ ] Coach cannot create calendar events
- [ ] Calendar context persists in conversation
- [ ] **Validation:** Coach integration works correctly

---

## 4. Data Integrity and Persistence

- [ ] Events survive page refresh
- [ ] Timezone handling is correct
- [ ] All-day events handled properly
- [ ] Deleted events reflected in sync
- [ ] Modified events updated in Reflector
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

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG AA
- [ ] Error messages clear and accessible
- [ ] **Validation:** Accessibility standards met

---

## Test Summary

**Total Test Cases:** 90+
**Passed:** _____ / _____
**Failed:** _____ / _____
**Blocked:** _____ / _____

## Sign-Off

- [ ] All critical tests passed
- [ ] All major tests passed
- [ ] Ready for production
- [ ] Issues documented

**Approved by:** _________________________ **Date:** __________
