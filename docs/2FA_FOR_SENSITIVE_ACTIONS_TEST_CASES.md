# 2FA for Sensitive Actions - Test Cases

**Implementation Date**: November 24, 2025
**Feature**: OAuth users can enable 2FA, which protects sensitive account operations

---

## Overview

This document contains comprehensive test cases for the new 2FA implementation that:
1. Allows OAuth users to enable 2FA
2. Requires 2FA verification for sensitive actions
3. Implements a 10-minute grace period
4. Works with both TOTP codes and backup codes

---

## Phase 1: OAuth Users Can Enable 2FA

### Test 1.1: OAuth User Enables 2FA
**Prerequisites**: User logged in with Google OAuth (no password set)

**Steps**:
1. Navigate to Profile Settings
2. Scroll to "Two-Factor Authentication" section
3. Verify you see the blue info message (not orange warning)
4. Click "Enable 2FA" button
5. Scan QR code with authenticator app
6. Enter 6-digit code from app
7. Save backup codes

**Expected Results**:
- ✅ No warning about "password required"
- ✅ Info message explains 2FA protects sensitive operations
- ✅ Setup flow completes successfully
- ✅ 2FA status shows "Enabled" with green tag
- ✅ Backup codes are generated and displayed

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

### Test 1.2: Password User Enables 2FA
**Prerequisites**: User logged in with email/password

**Steps**:
1. Navigate to Profile Settings
2. Scroll to "Two-Factor Authentication" section
3. Click "Enable 2FA" button
4. Complete setup (scan QR, verify code, save backup codes)

**Expected Results**:
- ✅ Info message mentions "code when signing in with your password"
- ✅ Setup completes successfully
- ✅ 2FA is enabled

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

## Phase 2: 2FA Required for Sensitive Actions

### Test 2.1: Email Change with 2FA (First Time)
**Prerequisites**:
- User has 2FA enabled
- User has NOT verified 2FA in last 10 minutes

**Steps**:
1. Navigate to Profile Settings
2. Change email address to a new one
3. Click "Update Profile"
4. Observe the response

**Expected Results**:
- ✅ Request returns error with `requiresTwoFactor: true`
- ✅ Frontend shows 2FA verification modal
- ✅ Modal asks for authentication code
- ✅ Modal shows tip about backup codes

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

### Test 2.2: Email Change with Valid 2FA Code
**Prerequisites**:
- Test 2.1 completed (2FA modal showing)

**Steps**:
1. Open authenticator app
2. Get current 6-digit code
3. Enter code in modal
4. Click "Verify"

**Expected Results**:
- ✅ Code is accepted
- ✅ Email change proceeds
- ✅ Verification email sent to new address
- ✅ Security notification sent to old address
- ✅ Success message displayed

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

### Test 2.3: Email Change with Backup Code
**Prerequisites**:
- User has 2FA enabled
- User has backup codes

**Steps**:
1. Try to change email
2. Enter a backup code instead of TOTP code
3. Submit

**Expected Results**:
- ✅ Backup code is accepted
- ✅ Email change proceeds
- ✅ That specific backup code is consumed (can't be reused)
- ✅ Remaining backup codes count decreases by 1

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

### Test 2.4: Email Change with Invalid 2FA Code
**Prerequisites**: User has 2FA enabled

**Steps**:
1. Try to change email
2. Enter incorrect 6-digit code (e.g., "000000")
3. Submit

**Expected Results**:
- ✅ Error message: "Invalid authentication code"
- ✅ Email is NOT changed
- ✅ Modal stays open
- ✅ User can try again

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

### Test 2.5: 2FA Rate Limiting
**Prerequisites**: User has 2FA enabled

**Steps**:
1. Try to change email
2. Enter wrong code 5 times in a row
3. Try 6th time

**Expected Results**:
- ✅ After 5 failed attempts, rate limit triggers
- ✅ Error message shows: "Too many failed attempts. Try again after [TIME]"
- ✅ User must wait before trying again
- ✅ Rate limit settings from admin panel are respected

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

### Test 2.6: Password Change with 2FA
**Prerequisites**: User has 2FA enabled

**Steps**:
1. Navigate to Profile Settings → Set Password section
2. Enter current password (if has password) or just new password (OAuth user)
3. Enter new password
4. Click "Update Password"
5. Verify 2FA modal appears
6. Enter correct 2FA code

**Expected Results**:
- ✅ 2FA verification is required
- ✅ Password changes after successful 2FA verification
- ✅ All other sessions are invalidated
- ✅ Current session remains active

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

### Test 2.7: Disable 2FA (Password User)
**Prerequisites**:
- User has password
- User has 2FA enabled

**Steps**:
1. Navigate to Profile Settings → Two-Factor Authentication
2. Click "Disable 2FA"
3. Enter password
4. Confirm

**Expected Results**:
- ✅ Password is required
- ✅ 2FA is disabled after correct password
- ✅ 2FA status shows "Disabled"
- ✅ All 2FA secrets are removed from database

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

### Test 2.8: Disable 2FA (OAuth User)
**Prerequisites**:
- OAuth user (no password)
- User has 2FA enabled

**Steps**:
1. Navigate to Profile Settings → Two-Factor Authentication
2. Click "Disable 2FA"
3. Modal should ask for 2FA code (not password)
4. Enter current 2FA code
5. Confirm

**Expected Results**:
- ✅ 2FA code is required (not password)
- ✅ 2FA is disabled after correct code
- ✅ UI updates to show 2FA as disabled

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

## Phase 3: Grace Period Testing

### Test 3.1: Grace Period After Email Change
**Prerequisites**: User has 2FA enabled

**Steps**:
1. Change email (verify 2FA code)
2. Wait 2 minutes
3. Try to change email again

**Expected Results**:
- ✅ NO 2FA modal appears (grace period active)
- ✅ Email change proceeds without additional 2FA
- ✅ Grace period lasts 10 minutes from last verification

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

### Test 3.2: Grace Period After Password Change
**Prerequisites**: User has 2FA enabled

**Steps**:
1. Change password (verify 2FA code)
2. Immediately try to change email

**Expected Results**:
- ✅ Email change does NOT require 2FA (grace period active)
- ✅ Grace period is shared across all sensitive actions

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

### Test 3.3: Grace Period Expiry
**Prerequisites**: User has 2FA enabled

**Steps**:
1. Change email (verify 2FA code)
2. Wait 11 minutes (more than grace period)
3. Try to change password

**Expected Results**:
- ✅ 2FA verification IS required (grace period expired)
- ✅ User must enter code again

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

### Test 3.4: Grace Period Per Session
**Prerequisites**: User has 2FA enabled, logged in on 2 devices

**Steps**:
1. On Device A: Change email (verify 2FA)
2. On Device B: Try to change password immediately

**Expected Results**:
- ✅ Device B still requires 2FA (grace period is per-session)
- ✅ Grace periods don't carry across different sessions

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

## Integration Tests

### Test 4.1: OAuth User Full Flow
**Prerequisites**: New OAuth user

**Steps**:
1. Sign up with Google OAuth
2. Enable 2FA
3. Change email (verify with 2FA code)
4. Within 10 minutes, set a password (no 2FA required - grace period)
5. Wait 11 minutes
6. Try to disable 2FA (requires 2FA code since no password)

**Expected Results**:
- ✅ All steps complete successfully
- ✅ Grace period works correctly
- ✅ OAuth user can manage 2FA without password

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

### Test 4.2: Password User Full Flow
**Prerequisites**: User with email/password account

**Steps**:
1. Enable 2FA
2. Change email (verify with 2FA)
3. Change password (no 2FA required - grace period)
4. Disable 2FA (requires password)

**Expected Results**:
- ✅ All steps complete successfully
- ✅ Password is required to disable 2FA (not 2FA code)

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

### Test 4.3: Backup Codes Depletion
**Prerequisites**: User has 2FA with only 1 backup code left

**Steps**:
1. Try to change email
2. Use the last backup code
3. Navigate to Profile Settings
4. Check backup codes count

**Expected Results**:
- ✅ Warning shows: "No codes - regenerate immediately!"
- ✅ Backup codes count shows 0
- ✅ User can still use TOTP codes
- ✅ "Regenerate Backup Codes" button is available

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

## Edge Cases

### Test 5.1: User Without 2FA
**Prerequisites**: User has 2FA disabled

**Steps**:
1. Try to change email
2. Try to change password

**Expected Results**:
- ✅ NO 2FA verification required
- ✅ Changes proceed normally
- ✅ Only CSRF and rate limiting are checked

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

### Test 5.2: Expired Session During 2FA Verification
**Prerequisites**: User has 2FA enabled

**Steps**:
1. Start email change
2. Leave 2FA modal open for 2+ hours (session expires)
3. Try to verify with 2FA code

**Expected Results**:
- ✅ Returns 401 Unauthorized
- ✅ User is redirected to login
- ✅ No partial changes are made

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

### Test 5.3: Concurrent 2FA Verifications
**Prerequisites**: User logged in on 2 tabs

**Steps**:
1. Tab 1: Start email change (2FA modal opens)
2. Tab 2: Start password change (2FA modal opens)
3. Tab 1: Verify with 2FA code
4. Tab 2: Immediately verify with same session

**Expected Results**:
- ✅ Tab 1 succeeds (email changed)
- ✅ Tab 2 succeeds without code (grace period from Tab 1)
- ✅ Grace period is shared within same session

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

## Admin Configuration Tests

### Test 6.1: Change 2FA Verify Rate Limit
**Prerequisites**: Admin access

**Steps**:
1. Login as admin
2. Navigate to Admin → Settings → System Limits
3. Change "Max 2FA Verify Attempts" from 5 to 3
4. Change "2FA Verify Window" from 15 to 10 minutes
5. Save settings
6. As regular user, try to fail 2FA verification

**Expected Results**:
- ✅ Rate limit triggers after 3 attempts (not 5)
- ✅ Window is 10 minutes (not 15)
- ✅ Settings are applied immediately

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

## Security Tests

### Test 7.1: CSRF Protection
**Prerequisites**: User has 2FA enabled

**Steps**:
1. Capture email change request
2. Remove CSRF token
3. Replay request

**Expected Results**:
- ✅ Request is rejected (401/403)
- ✅ Email is NOT changed
- ✅ CSRF error is logged

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

### Test 7.2: Rate Limiting Logs
**Prerequisites**: User has 2FA enabled

**Steps**:
1. Try to verify 2FA with wrong code 6 times
2. Check database AppLog table

**Expected Results**:
- ✅ Failed attempts are logged
- ✅ Rate limit trigger is logged
- ✅ Logs include userId and IP
- ✅ Category is "security"

**Status**: [ ] Pass / [ ] Fail
**Notes**: ___________

---

## Performance Tests

### Test 8.1: 2FA Verification Response Time
**Prerequisites**: User has 2FA enabled

**Steps**:
1. Change email with valid 2FA code
2. Measure response time

**Expected Results**:
- ✅ Response time < 500ms (typical)
- ✅ No noticeable lag in UI
- ✅ Grace period is set quickly

**Status**: [ ] Pass / [ ] Fail
**Response Time**: _____ms

---

## Summary

**Total Tests**: 31
**Passed**: ___
**Failed**: ___
**Skipped**: ___

**Critical Issues Found**: ___________

**Notes**: ___________

---

## Test Environment

- **Date Tested**: ___________
- **Tester**: ___________
- **Environment**: Dev / Staging / Production
- **Browser**: ___________
- **Database**: PostgreSQL
- **Node Version**: ___________

---

## Implementation Notes

### What Changed:
1. **OAuth users can now enable 2FA** (removed password requirement)
2. **2FA protects sensitive actions**: email change, password change, disable 2FA
3. **10-minute grace period** to avoid annoying users
4. **Works with TOTP codes AND backup codes**
5. **Per-session grace period** (not global)
6. **Rate limiting** on 2FA verification (5 attempts per 15 minutes by default)

### Key Files Modified:
- `components/two-factor-settings.tsx` - Removed password requirement
- `lib/2fa-verification.ts` - New utility for verification
- `components/two-factor-verify-modal.tsx` - Reusable 2FA modal
- `app/api/user/profile/route.ts` - Email change requires 2FA
- `app/api/user/password/route.ts` - Password change requires 2FA
- `app/api/user/2fa/disable/route.ts` - Disable requires 2FA or password
- `prisma/schema.prisma` - Added `twoFactorVerifiedAt` field

### Grace Period Implementation:
- Stored in `Session.twoFactorVerifiedAt` field
- 10 minutes from last verification
- Per-session (different devices = different grace periods)
- Automatically checked by `requireTwoFactorVerification()` utility

---

**Good luck with testing! 🚀**
