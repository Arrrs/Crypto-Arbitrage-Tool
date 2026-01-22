# Bug Fixes Applied

## Summary

Fixed multiple issues found during testing of the self-hosted cron system and settings page.

## Issues Fixed

### 1. Old Cron Jobs Warning ✅
**Problem:** `[Cron Scheduler] No handler found for job: check_alerts`

**Fix:** Removed old cron jobs and updated init script

### 2. Collapse Deprecation Warning ✅
**Problem:** Using deprecated `<Panel>` children

**Fix:** Refactored to use modern `items` prop

### 3. Static Message Warning ✅
**Problem:** Using `message.success()` without App context

**Fix:** Changed to `const { message } = App.useApp()`

### 4. Telegram Enabled Always False ✅
**Problem:** enabled field always saving as false

**Fix:** Added explicit boolean conversion: `enabled: values.enabled === true`

### 5. Features Toggle Incorrect ✅
**Problem:** Toggle values not matching what was selected

**Fix:** Explicit boolean conversion for all feature flags

## Files Modified

- `/app/admin/settings/page.tsx` - Fixed all form save functions
- `/scripts/cleanup-old-crons.ts` - NEW cleanup script
- `/scripts/init-system.ts` - Updated cron jobs list

All critical bugs fixed! 🎉
