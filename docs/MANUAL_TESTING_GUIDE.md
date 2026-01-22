# Complete Manual Testing Guide

**Date**: 2025-11-26
**Status**: Ready for Testing
**Estimated Time**: 4-5 hours (comprehensive) | 1 hour (critical paths only)

---

## Quick Reference

**Critical Tests (Must Do)** - 1 hour:
- Part A: New UX Improvements (15 min)
- Part B: Security Fixes (30 min)
- Part C: Email Change System (15 min)

**Full Test Suite** - 4-5 hours:
- All parts from existing TESTING_RESULTS.md
- New improvements tests

---

## PART A: UX Improvements (New - 2025-11-26)

### Test A.1: Progressive Password Reset ⭐ CRITICAL

**Estimated Time**: 5 minutes

**Prerequisites**:
- Test user: `test@test.com`

**Test Steps**:
1. Go to `/forgot-password`
2. Enter `test@test.com`
3. Click "Send Reset Link"
4. Check email for reset link
5. Click reset link
6. **✅ VERIFY**: See loading spinner "Validating Reset Link..."
7. **✅ VERIFY**: Spinner disappears within 1-2 seconds
8. **✅ VERIFY**: Green success alert appears: "Reset Link Verified"
9. **✅ VERIFY**: Password form is visible
10. Enter new password (e.g., `NewPassword123!`)
11. Confirm password
12. Click "Reset Password"
13. **✅ VERIFY**: Success message
14. **✅ VERIFY**: Redirect to login page
15. Login with new password
16. **✅ VERIFY**: Login successful

**What to Look For**:
- ✅ No flash of password form before validation
- ✅ Clear status messages
- ✅ Smooth transitions

---

### Test A.2: Expired Password Reset Link ⭐ CRITICAL

**Estimated Time**: 3 minutes

**Prerequisites**:
- Access to database OR wait 24 hours

**Test Steps**:
1. Request password reset
2. Copy reset link (don't click yet)
3. **Option A**: Manually expire token in database:
   ```sql
   UPDATE VerificationToken
   SET expires = NOW() - INTERVAL '1 hour'
   WHERE identifier LIKE 'reset:%'
   AND token = 'YOUR_TOKEN_HERE';
   ```
4. **Option B**: Wait 24+ hours
5. Click expired reset link
6. **✅ VERIFY**: See "Validating..." spinner
7. **✅ VERIFY**: Error appears: "Link Expired" OR "Invalid Reset Link"
8. **✅ VERIFY**: "Request New Reset Link" button visible
9. Click "Request New Reset Link"
10. **✅ VERIFY**: Redirect to `/forgot-password`

**What to Look For**:
- ✅ Clear expired vs invalid messaging
- ✅ No ability to submit password with expired token
- ✅ Easy path to request new link

---

### Test A.3: Email Verification Auto-Redirect ⭐ CRITICAL

**Estimated Time**: 5 minutes

**Prerequisites**:
- New email address not yet registered

**Test Steps**:
1. Go to `/signup`
2. Register with `newuser@test.com`
3. Check email for verification link
4. Click verification link
5. **✅ VERIFY**: See "Verifying your email..." spinner
6. **✅ VERIFY**: Success message appears: "Email Verified!"
7. **✅ VERIFY**: Countdown appears: "Redirecting in 3 seconds..."
8. **✅ VERIFY**: Countdown decrements: 3 → 2 → 1
9. Wait for auto-redirect (or click "Go to Login Now")
10. **✅ VERIFY**: Redirect to `/login`
11. **✅ VERIFY**: Email field is pre-filled with `newuser@test.com`
12. **✅ VERIFY**: Success message visible: "Email verified! Please login."
13. Enter password
14. Login
15. **✅ VERIFY**: Login successful

**What to Look For**:
- ✅ Smooth countdown animation
- ✅ Email pre-fill works correctly
- ✅ Can skip countdown with button

---

### Test A.4: Autocomplete & Password Managers

**Estimated Time**: 2 minutes

**Chrome/Edge Built-in Password Manager**:
1. Open `/login` (incognito if already logged in)
2. Enter credentials and login
3. **✅ VERIFY**: Browser prompts "Save password?"
4. Save password
5. Logout
6. Return to `/login`
7. Click email field
8. **✅ VERIFY**: Key icon appears in field
9. **✅ VERIFY**: Saved credentials appear in dropdown
10. Select credentials
11. **✅ VERIFY**: Both email AND password auto-filled
12. **✅ VERIFY**: Login works

**1Password/LastPass**:
1. Open `/login`
2. **✅ VERIFY**: Browser extension icon shows count (e.g., "1")
3. Click extension
4. **✅ VERIFY**: Credentials recognized as "Login" type (not "Credit Card")
5. Click autofill
6. **✅ VERIFY**: Both fields populated
7. **✅ VERIFY**: Login works

---

## PART B: Security Fixes Verification

### Test B.1: Rate Limiting on Password Reset ⭐ CRITICAL

**Estimated Time**: 3 minutes

**Test Steps**:
```bash
# Run this command 6 times rapidly
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:3000/api/auth/reset-password \
    -H "Content-Type: application/json" \
    -d '{"token":"invalid-token-12345","password":"NewPass123!@#"}' \
    -w "\nStatus: %{http_code}\n\n"
  sleep 0.5
done
```

**Expected Output**:
- Attempts 1-5: Status 400 (Invalid token)
- Attempt 6: Status 429 (Too Many Requests)

**✅ VERIFY**:
- Rate limit kicks in after 5 attempts
- Error message shows retry time

---

### Test B.2: Rate Limiting on Email Verification ⭐ CRITICAL

**Estimated Time**: 3 minutes

```bash
# Run 6 rapid verification attempts
for i in {1..6}; do
  echo "Attempt $i:"
  curl "http://localhost:3000/api/auth/verify-email?token=invalid-token-$i" \
    -w "\nStatus: %{http_code}\n\n"
  sleep 0.5
done
```

**Expected Output**:
- Attempts 1-5: Status 400
- Attempt 6: Status 429

---

### Test B.3: Email Change Race Condition Prevention ⭐ CRITICAL

**Estimated Time**: 10 minutes

**Scenario**: Verify transaction prevents email conflicts

**Test Steps**:
1. Login as `user1@test.com`
2. Go to Profile Settings
3. Initiate email change to `target@example.com`
4. DON'T verify yet
5. Open verification email (copy link but don't click)
6. In **another browser/incognito**, register `target@example.com` directly
7. **✅ VERIFY**: Registration succeeds
8. Now click verification link from step 5
9. **✅ VERIFY**: Error: "This email address is already in use by another account"
10. **✅ VERIFY**: user1@test.com email unchanged

**What This Tests**:
- Transaction prevents TOCTOU race condition
- Email conflict check happens atomically

---

## PART C: Email Change System

### Test C.1: Complete Email Change Flow

**Estimated Time**: 8 minutes

**Prerequisites**:
- User with 2FA enabled: `user2@test.com`

**Test Steps**:
1. Login as `user2@test.com`
2. Go to `/profile/settings`
3. Click email field, change to `newaddress@test.com`
4. Click "Update Profile"
5. **✅ VERIFY**: 2FA modal appears
6. Enter 2FA code
7. **✅ VERIFY**: Success message: "Verification email sent..."
8. **✅ VERIFY**: Profile shows old email still
9. Check NEW email inbox (`newaddress@test.com`)
10. **✅ VERIFY**: Email received: "Verify your new email address"
11. Check OLD email inbox (`user2@test.com`)
12. **✅ VERIFY**: Email received: "Your email is being changed"
13. Click verification link in NEW email
14. **✅ VERIFY**: Success: "Email address updated successfully!"
15. Return to profile
16. **✅ VERIFY**: Email now shows `newaddress@test.com`
17. Logout
18. Login with OLD email (`user2@test.com`)
19. **✅ VERIFY**: Login FAILS (email changed)
20. Login with NEW email (`newaddress@test.com`)
21. **✅ VERIFY**: Login succeeds

---

### Test C.2: Email Change Cancellation

**Estimated Time**: 5 minutes

**Test Steps**:
1. Login as `test@test.com`
2. Initiate email change to `temp@test.com`
3. Check OLD email (`test@test.com`)
4. Click "Cancel this change" link
5. **✅ VERIFY**: Success: "Email change cancelled"
6. **✅ VERIFY**: Email remains `test@test.com`
7. Check NEW email (`temp@test.com`)
8. Click verification link
9. **✅ VERIFY**: Error: "This email change has been cancelled"

---

## PART D: Critical Security Paths

### Test D.1: 2FA Login Flow

**Estimated Time**: 3 minutes

**Prerequisites**:
- User with 2FA: `user2@test.com`

**Test Steps**:
1. Go to `/login`
2. Enter `user2@test.com` credentials
3. **✅ VERIFY**: Redirect to `/verify-2fa`
4. Enter 6-digit TOTP code
5. **✅ VERIFY**: Login succeeds
6. **✅ VERIFY**: Redirect to `/profile`

---

### Test D.2: Session Invalidation on Password Change

**Estimated Time**: 5 minutes

**Test Steps**:
1. Login as `test@test.com` in Chrome
2. Open **second browser** (Firefox/Edge)
3. Login as same user in second browser
4. **✅ VERIFY**: Two active sessions visible in "Active Sessions"
5. In Chrome: Go to Profile Settings → Change Password
6. Complete password change
7. **✅ VERIFY**: Chrome redirects to login (current session kept in some implementations)
8. **In Firefox**: Try to navigate to `/profile`
9. **✅ VERIFY**: Firefox redirects to login (session invalidated)
10. Login in Firefox with NEW password
11. **✅ VERIFY**: Login works

---

## PART E: Edge Cases

### Test E.1: Multiple Pending Email Changes

**Estimated Time**: 3 minutes

**Test Steps**:
1. Login as `test@test.com`
2. Change email to `email1@test.com`
3. **BEFORE verifying**, change email again to `email2@test.com`
4. **✅ VERIFY**: Second request succeeds (cancels first)
5. Try to verify first email link (`email1@test.com`)
6. **✅ VERIFY**: Error: Link invalid or expired
7. Verify second email link (`email2@test.com`)
8. **✅ VERIFY**: Succeeds, email changed to `email2@test.com`

---

### Test E.2: Email Already Pending for Another User

**Estimated Time**: 4 minutes

**Test Steps**:
1. Login as `user1@test.com`
2. Initiate email change to `target@test.com`
3. DON'T verify yet
4. Logout
5. Login as `user2@test.com`
6. Try to change email to `target@test.com` (same email)
7. **✅ VERIFY**: Error: "This email is already pending verification for another account"
8. **✅ VERIFY**: Change rejected

---

## PART F: Performance & UX

### Test F.1: Loading States

**Estimated Time**: 2 minutes

**Test Steps**:
1. Throttle network (Chrome DevTools → Network → Slow 3G)
2. Navigate to various pages
3. **✅ VERIFY**: Loading spinners appear
4. **✅ VERIFY**: No white screen flash
5. **✅ VERIFY**: Skeleton screens (if implemented)

---

### Test F.2: Error Handling

**Estimated Time**: 3 minutes

**Test Steps**:
1. Disconnect internet
2. Try to login
3. **✅ VERIFY**: Clear error message
4. Try to change password
5. **✅ VERIFY**: Error displayed (not silent fail)
6. Reconnect internet
7. Retry action
8. **✅ VERIFY**: Works correctly

---

## Testing Checklist Summary

### Critical Path Tests (MUST DO) - 1 Hour

- [ ] A.1: Progressive Password Reset (5 min)
- [ ] A.2: Expired Reset Link (3 min)
- [ ] A.3: Email Verification Auto-Redirect (5 min)
- [ ] A.4: Autocomplete (2 min)
- [ ] B.1: Password Reset Rate Limiting (3 min)
- [ ] B.2: Email Verification Rate Limiting (3 min)
- [ ] B.3: Email Change Race Condition (10 min)
- [ ] C.1: Complete Email Change Flow (8 min)
- [ ] D.1: 2FA Login (3 min)
- [ ] D.2: Session Invalidation (5 min)

**Total**: ~47 minutes

### Full Test Suite - 4-5 Hours

**Include all tests from**:
- [`TESTING_RESULTS.md` Part 7.9](TESTING_RESULTS.md) - Email Change (50+ tests)
- [`TESTING_RESULTS.md` Part 7.10](TESTING_RESULTS.md) - Rate Limiting (5 tests)
- This guide (Part A-F)

---

## Bug Reporting Template

```markdown
**Test**: [Test Name, e.g., A.1: Progressive Password Reset]
**Status**: FAIL
**Steps to Reproduce**:
1. [Step]
2. [Step]
3. [Step]

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happened]

**Screenshots**:
[Attach if applicable]

**Environment**:
- Browser: [Chrome 120 / Firefox 121 / etc.]
- OS: [Windows 11 / macOS 14 / etc.]
- Device: [Desktop / Mobile]

**Console Errors**:
```
[Paste any console errors]
```

**Network Tab**:
[Any failed requests]
```

---

## Success Criteria

**Pass Criteria**:
- ✅ All CRITICAL tests pass (Part A, B.1-B.3, C.1, D.1-D.2)
- ✅ No blocking bugs found
- ✅ Security features work as expected
- ✅ UX improvements function correctly

**Deployment Ready**:
- ✅ Critical path tests: 10/10 passed
- ✅ No high-severity bugs
- ✅ User experience improvements verified

---

**Last Updated**: 2025-11-26
**Next Review**: After test execution
