# Comprehensive Authentication Testing Plan

## Overview
This testing plan covers all authentication flows including the newly refactored 2FA system. Designed to match industry standards (Auth0, Okta, AWS Cognito).

---

## Test Environment Setup

### Prerequisites
- [ ] Server running: `npm run dev` on port 3000
- [ ] Database running and migrated
- [ ] Two browsers ready (Chrome + Firefox/Incognito)
- [ ] Mobile device or responsive mode for mobile testing
- [ ] TOTP authenticator app (Google Authenticator, Authy, or 1Password)

### Test Users Required
Create these test users before starting:

```bash
# User 1: Regular user without 2FA
Email: user1@test.com
Password: password123

# User 2: User with 2FA enabled
Email: user2@test.com
Password: password123
2FA: Enabled (set up during test)

# User 3: OAuth user
Email: your-google-email@gmail.com
Method: Google OAuth
```

---

## Part 1: Basic Authentication (No 2FA)

### Test 1.1: Standard Credentials Login
**Industry Standard**: Basic email/password authentication

1. **Valid Credentials:**
   - [ ] Go to `/login`
   - [ ] Enter: `user1@test.com` / `password123`
   - [ ] Click "Sign In"
   - [ ] **Expected**: Redirect to `/profile` ✅
   - [ ] **Expected**: See user name in header ✅

2. **Invalid Password:**
   - [ ] Logout
   - [ ] Enter: `user1@test.com` / `wrongpassword`
   - [ ] **Expected**: "Invalid email or password" error ✅
   - [ ] **Expected**: Stay on login page ✅

3. **Invalid Email:**
   - [ ] Enter: `nonexistent@test.com` / `password123`
   - [ ] **Expected**: "Invalid email or password" error ✅

4. **Empty Fields:**
   - [ ] Leave email empty, click Sign In
   - [ ] **Expected**: Validation error ✅
   - [ ] Leave password empty, click Sign In
   - [ ] **Expected**: Validation error ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 1.2: Google OAuth Login
**Industry Standard**: Social login integration

1. **First-Time OAuth:**
   - [ ] Click "Continue with Google"
   - [ ] Complete Google OAuth flow
   - [ ] **Expected**: Redirect to `/profile` ✅
   - [ ] **Expected**: User created in database ✅
   - [ ] **Expected**: `emailVerified` automatically set ✅

2. **Existing OAuth User:**
   - [ ] Logout
   - [ ] Click "Continue with Google" again
   - [ ] **Expected**: Login successful (no new user created) ✅

3. **OAuth Session Metadata:**
   - [ ] Go to Profile Settings → Active Sessions
   - [ ] **Expected**: See session with metadata (browser, location) ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 1.3: Email Verification
**Industry Standard**: Prevent fake email signups

1. **Unverified Email Cannot Login:**
   - [ ] Create new user via signup (don't verify email)
   - [ ] Try to login
   - [ ] **Expected**: "Please verify your email" error ✅
   - [ ] **Expected**: "Resend verification" link shown ✅

2. **Email Verification Flow:**
   - [ ] Click "Resend verification email"
   - [ ] Check terminal logs for verification link
   - [ ] Open verification link
   - [ ] **Expected**: "Email verified successfully" ✅
   - [ ] Try login again
   - [ ] **Expected**: Login successful ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

## Part 2: Two-Factor Authentication (2FA) - CRITICAL

### Test 2.1: 2FA Setup
**Industry Standard**: TOTP-based 2FA (RFC 6238)

1. **Enable 2FA:**
   - [ ] Login as `user2@test.com`
   - [ ] Go to Profile Settings
   - [ ] Find "Two-Factor Authentication" section
   - [ ] Click "Enable 2FA"
   - [ ] **Expected**: QR code displayed ✅
   - [ ] **Expected**: Secret key displayed (fallback) ✅

2. **Scan QR Code:**
   - [ ] Open authenticator app (Google Authenticator/Authy)
   - [ ] Scan QR code
   - [ ] **Expected**: Account added with 6-digit code ✅

3. **Verify 2FA Setup:**
   - [ ] Enter 6-digit code from authenticator
   - [ ] Click "Verify and Enable"
   - [ ] **Expected**: "2FA enabled successfully" ✅
   - [ ] **Expected**: Backup codes displayed (10 codes) ✅
   - [ ] **Expected**: Warning to save backup codes ✅

4. **Download Backup Codes:**
   - [ ] Click "Download Backup Codes"
   - [ ] **Expected**: Text file downloads ✅
   - [ ] Save backup codes for later tests

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 2.2: 2FA Login Flow (TOTP)
**Industry Standard**: Session-level 2FA verification

1. **Initial Login (Partial Session):**
   - [ ] Logout
   - [ ] Go to `/login`
   - [ ] Enter: `user2@test.com` / `password123`
   - [ ] Click "Sign In"
   - [ ] **Expected**: Redirect to `/verify-2fa` ✅
   - [ ] **Expected**: URL contains `userId` and `sessionToken` (NOT password!) ✅
   - [ ] **Expected**: TOTP input field shown ✅

2. **Check Partial Session Created:**
   ```bash
   npx tsx scripts/check-sessions.ts
   ```
   - [ ] **Expected**: Session exists with `twoFactorVerified: false` ✅
   - [ ] **Expected**: Session has metadata (IP, location) ✅

3. **Invalid TOTP Code:**
   - [ ] Enter wrong code: `000000`
   - [ ] Click "Verify"
   - [ ] **Expected**: "Invalid verification code" error ✅
   - [ ] **Expected**: Stay on verify-2fa page ✅

4. **Valid TOTP Code:**
   - [ ] Get current code from authenticator app
   - [ ] Enter 6-digit code
   - [ ] Click "Verify"
   - [ ] **Expected**: Redirect to `/profile` ✅
   - [ ] **Expected**: Fully authenticated ✅

5. **Check Session Upgraded:**
   ```bash
   npx tsx scripts/check-sessions.ts
   ```
   - [ ] **Expected**: Same session now has `twoFactorVerified: true` ✅
   - [ ] **Expected**: No duplicate sessions created ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 2.3: 2FA Login Flow (Backup Codes)
**Industry Standard**: Recovery mechanism

1. **Start Login:**
   - [ ] Logout
   - [ ] Login with `user2@test.com` / `password123`
   - [ ] **Expected**: Redirect to `/verify-2fa` ✅

2. **Switch to Backup Code:**
   - [ ] Click "Use Backup Code" tab
   - [ ] **Expected**: Input changes to text field ✅

3. **Invalid Backup Code:**
   - [ ] Enter wrong code: `INVALID-CODE`
   - [ ] **Expected**: Error message ✅

4. **Valid Backup Code:**
   - [ ] Enter one of your saved backup codes
   - [ ] Click "Verify"
   - [ ] **Expected**: Redirect to `/profile` ✅
   - [ ] **Expected**: Fully authenticated ✅

5. **Backup Code Used Once:**
   - [ ] Logout and login again
   - [ ] Try same backup code again
   - [ ] **Expected**: Error "Code already used" ✅

6. **Check Remaining Codes:**
   - [ ] Go to Profile Settings → 2FA section
   - [ ] **Expected**: Shows "9 backup codes remaining" ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 2.4: 2FA Security - Session Isolation
**Industry Standard**: Each session tracks 2FA separately

1. **Login on Device A:**
   - [ ] Browser A: Login as `user2@test.com`
   - [ ] Complete 2FA with TOTP
   - [ ] **Expected**: Logged in on Device A ✅

2. **Login on Device B:**
   - [ ] Browser B: Login as `user2@test.com`
   - [ ] **Expected**: Redirect to 2FA verification ✅
   - [ ] **Expected**: Does NOT bypass 2FA ✅
   - [ ] Complete 2FA with TOTP
   - [ ] **Expected**: Logged in on Device B ✅

3. **Both Sessions Active:**
   ```bash
   npx tsx scripts/check-sessions.ts
   ```
   - [ ] **Expected**: 2 sessions, both with `twoFactorVerified: true` ✅

4. **Device A Logout:**
   - [ ] Browser A: Logout
   - [ ] **Expected**: Device A logged out ✅
   - [ ] Browser B: Navigate to another page
   - [ ] **Expected**: Device B still logged in ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 2.5: 2FA Disable/Re-enable
**Industry Standard**: User can disable 2FA

1. **Disable 2FA:**
   - [ ] Login as `user2@test.com` (with 2FA)
   - [ ] Go to Profile Settings
   - [ ] Click "Disable 2FA"
   - [ ] Enter current password
   - [ ] **Expected**: "2FA disabled successfully" ✅

2. **Login Without 2FA:**
   - [ ] Logout
   - [ ] Login with `user2@test.com` / `password123`
   - [ ] **Expected**: Direct redirect to `/profile` (no 2FA prompt) ✅

3. **Re-enable 2FA:**
   - [ ] Go to Profile Settings
   - [ ] Enable 2FA again
   - [ ] **Expected**: New QR code generated ✅
   - [ ] **Expected**: New backup codes generated ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 2.6: 2FA Edge Cases
**Industry Standard**: Handle edge cases gracefully

1. **Expired Partial Session:**
   - [ ] Login as 2FA user
   - [ ] Stop at 2FA verification page
   - [ ] Wait for session to expire (or manually expire in DB)
   - [ ] Try to verify 2FA
   - [ ] **Expected**: "Session expired" error ✅
   - [ ] **Expected**: Redirect to login ✅

2. **Back Button During 2FA:**
   - [ ] Login as 2FA user
   - [ ] Get to 2FA verification page
   - [ ] Click browser back button
   - [ ] **Expected**: Stays on verification page OR redirects to login ✅
   - [ ] **Expected**: No access to protected pages ✅

3. **Direct URL Access During 2FA:**
   - [ ] Login as 2FA user (stop at 2FA page)
   - [ ] Try to manually visit `/profile` in address bar
   - [ ] **Expected**: Redirected back to `/verify-2fa` or `/login` ✅

4. **2FA User Password Reset:**
   - [ ] User with 2FA enabled uses "Forgot Password"
   - [ ] Reset password via email link
   - [ ] **Expected**: 2FA still enabled ✅
   - [ ] Login with new password
   - [ ] **Expected**: Still prompted for 2FA ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

## Part 3: Session Management

### Test 3.1: Multiple Concurrent Sessions
**Industry Standard**: Multi-device support

1. **Login on Multiple Devices:**
   - [ ] Device A: Login as `user1@test.com`
   - [ ] Device B: Login as `user1@test.com`
   - [ ] Device C (Mobile): Login as `user1@test.com`
   - [ ] **Expected**: All 3 sessions active ✅

2. **View Active Sessions:**
   - [ ] Any device: Go to Profile Settings → Active Sessions
   - [ ] **Expected**: See 3 active sessions ✅
   - [ ] **Expected**: Each shows device info (browser, OS) ✅
   - [ ] **Expected**: Each shows location (city, country) ✅
   - [ ] **Expected**: Each shows last active time ✅
   - [ ] **Expected**: Current session marked with badge ✅

3. **Revoke Remote Session:**
   - [ ] Device A: Click "Revoke" on Device B's session
   - [ ] **Expected**: Success message ✅
   - [ ] Device B: Try to navigate
   - [ ] **Expected**: Device B logged out ✅
   - [ ] Device A & C: Still logged in ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 3.2: Session Metadata Accuracy
**Industry Standard**: Track session details for security

1. **Desktop Browser Metadata:**
   - [ ] Login from Chrome on desktop
   - [ ] Check Active Sessions
   - [ ] **Expected**: Shows "Chrome on Windows/macOS/Linux" ✅
   - [ ] **Expected**: Shows your city/country ✅
   - [ ] **Expected**: Shows your IP address ✅

2. **Mobile Browser Metadata:**
   - [ ] Login from mobile Chrome
   - [ ] Check Active Sessions
   - [ ] **Expected**: Shows "Chrome on Android" (NOT "Chrome on Linux") ✅
   - [ ] **Expected**: Shows correct location ✅

3. **Incognito Mode:**
   - [ ] Login from incognito/private window
   - [ ] **Expected**: Creates separate session ✅
   - [ ] **Expected**: Shows same browser name ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 3.3: Password Change Security
**Industry Standard**: Invalidate other sessions on password change

1. **Password Change from Device A:**
   - [ ] Device A: Login as `user1@test.com`
   - [ ] Device B: Login as `user1@test.com`
   - [ ] Device A: Change password
   - [ ] **Expected**: Device A stays logged in ✅
   - [ ] **Expected**: Success message shown ✅

2. **Device B Logged Out:**
   - [ ] Device B: Try to navigate or refresh
   - [ ] **Expected**: Logged out, redirected to login ✅

3. **Login with New Password:**
   - [ ] Device B: Login with new password
   - [ ] **Expected**: Successful login ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

## Part 4: Rate Limiting

### Test 4.1: Login Rate Limiting
**Industry Standard**: Prevent brute-force attacks

1. **Failed Login Attempts:**
   - [ ] Go to `/login`
   - [ ] Enter correct email, wrong password
   - [ ] Try 5 times
   - [ ] **Expected**: All show "Invalid credentials" ✅

2. **Rate Limit Triggered:**
   - [ ] Try 6th time (or configured limit)
   - [ ] **Expected**: "Too many failed attempts" error ✅
   - [ ] **Expected**: Shows retry time (e.g., "Try again in 15 minutes") ✅

3. **Rate Limit Persists:**
   - [ ] Try to login with correct password
   - [ ] **Expected**: Still blocked ✅

4. **Wait for Reset:**
   - [ ] Wait for rate limit window to expire
   - [ ] Try login with correct password
   - [ ] **Expected**: Login successful ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 4.2: 2FA Verification Rate Limiting
**Industry Standard**: Prevent TOTP brute-force

1. **Multiple Wrong TOTP Codes:**
   - [ ] Login as 2FA user
   - [ ] Enter wrong TOTP codes multiple times
   - [ ] **Expected**: After X attempts, rate limit triggered ✅
   - [ ] **Expected**: Cannot try more codes ✅

2. **Rate Limit Reset:**
   - [ ] Wait for rate limit window
   - [ ] Try with correct code
   - [ ] **Expected**: Works ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

## Part 5: Security Tests

### Test 5.1: Session Token Security
**Industry Standard**: Prevent session hijacking

1. **Invalid Session Token:**
   - [ ] Login normally
   - [ ] Open DevTools → Application → Cookies
   - [ ] Modify session cookie value
   - [ ] Refresh page
   - [ ] **Expected**: Logged out, redirected to login ✅

2. **Stolen Session Token (Different IP):**
   - [ ] Login from Device A
   - [ ] Copy session token
   - [ ] Paste token in Device B (different network if possible)
   - [ ] **Expected**: Works (session tokens are portable)
   - [ ] **Note**: This is normal behavior; IP binding would break mobile users

3. **Session Expiration:**
   ```bash
   # Manually expire session in database
   UPDATE "sessions" SET expires = NOW() - INTERVAL '1 day' WHERE "sessionToken" = 'your-token';
   ```
   - [ ] Try to access protected page
   - [ ] **Expected**: Logged out ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 5.2: CSRF Protection
**Industry Standard**: Prevent cross-site request forgery

1. **State-Changing Requests:**
   - [ ] Try to make API call without CSRF token
   - [ ] **Expected**: 403 Forbidden OR works (depends on implementation)
   - [ ] **Note**: NextAuth handles this automatically

2. **OAuth CSRF:**
   - [ ] Start OAuth flow
   - [ ] Check URL for `state` parameter
   - [ ] **Expected**: Random state token present ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

## Part 6: Edge Cases & Error Handling

### Test 6.1: Network Failures
**Industry Standard**: Graceful degradation

1. **Login During Network Issue:**
   - [ ] Open DevTools → Network tab
   - [ ] Throttle to "Slow 3G"
   - [ ] Try to login
   - [ ] **Expected**: Loading indicator shown ✅
   - [ ] **Expected**: Eventually succeeds or shows timeout error ✅

2. **Geolocation API Failure:**
   - [ ] Block ip-api.com in hosts file (optional)
   - [ ] Login
   - [ ] **Expected**: Login still works ✅
   - [ ] Check session metadata
   - [ ] **Expected**: Location shows "Unknown" but session created ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 6.2: Database Edge Cases
**Industry Standard**: Data integrity

1. **Concurrent Login Attempts:**
   - [ ] Open 2 browser tabs
   - [ ] Login simultaneously in both
   - [ ] **Expected**: Both succeed OR one fails gracefully ✅
   - [ ] **Expected**: No database errors ✅

2. **User Deleted Mid-Session:**
   ```bash
   # Admin deletes user while they're logged in
   DELETE FROM "users" WHERE email = 'test@test.com';
   ```
   - [ ] Try to navigate to another page
   - [ ] **Expected**: Logged out OR shows error ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

## Part 7: OAuth-Specific Tests

### Test 7.1: OAuth User Password Setting
**Industry Standard**: Allow OAuth users to add credentials

1. **OAuth User Sets Password:**
   - [ ] Login with Google OAuth
   - [ ] Go to Profile Settings
   - [ ] Scroll to "Change Password"
   - [ ] **Expected**: No "Current Password" field required ✅
   - [ ] Set new password
   - [ ] **Expected**: Success message ✅

2. **Login with New Credentials:**
   - [ ] Logout
   - [ ] Login with email + new password
   - [ ] **Expected**: Works ✅

3. **OAuth Still Works:**
   - [ ] Logout
   - [ ] Login with Google OAuth
   - [ ] **Expected**: Still works ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

## Part 8: Mobile-Specific Tests

### Test 8.1: Mobile Responsive Design
**Industry Standard**: Mobile-first authentication

1. **Login Form on Mobile:**
   - [ ] Open on mobile or use DevTools responsive mode
   - [ ] Check login form
   - [ ] **Expected**: Form fills screen width ✅
   - [ ] **Expected**: Input fields large enough to tap ✅
   - [ ] **Expected**: No horizontal scrolling ✅

2. **2FA on Mobile:**
   - [ ] Complete 2FA flow on mobile
   - [ ] **Expected**: TOTP input large and easy to use ✅
   - [ ] **Expected**: Tab switching works (TOTP/Backup Code) ✅

3. **Active Sessions on Mobile:**
   - [ ] View Active Sessions on mobile
   - [ ] **Expected**: Session cards stack vertically ✅
   - [ ] **Expected**: All info readable ✅
   - [ ] **Expected**: Revoke button accessible ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

## Part 9: Performance Tests

### Test 9.1: Load Times
**Industry Standard**: Fast authentication

1. **Login Speed:**
   - [ ] Open DevTools → Network tab
   - [ ] Login with credentials
   - [ ] Check `/api/auth/login` request time
   - [ ] **Expected**: < 1 second ✅

2. **2FA Verification Speed:**
   - [ ] Check `/api/auth/verify-2fa` request time
   - [ ] **Expected**: < 500ms ✅

3. **Session Validation:**
   - [ ] Navigate to protected page
   - [ ] Check `auth()` call time
   - [ ] **Expected**: < 200ms ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

## Part 10: Final Integration Tests

### Test 10.1: End-to-End User Journey
**Industry Standard**: Complete user lifecycle

1. **New User Signup:**
   - [ ] Go to `/signup`
   - [ ] Create account
   - [ ] Verify email
   - [ ] Login
   - [ ] **Expected**: Smooth flow ✅

2. **Enable Security Features:**
   - [ ] Set up 2FA
   - [ ] Login from multiple devices
   - [ ] **Expected**: All features work together ✅

3. **Account Recovery:**
   - [ ] Use "Forgot Password"
   - [ ] Reset password
   - [ ] Login with new password + 2FA
   - [ ] **Expected**: Full recovery works ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

## Summary & Industry Standard Checklist

### Core Authentication ✅
- [ ] Credentials login works
- [ ] OAuth login works
- [ ] Email verification enforced
- [ ] Password reset flow works
- [ ] Sessions validated correctly

### Two-Factor Authentication (2FA) ✅
- [ ] 2FA setup generates valid TOTP
- [ ] QR code scannable by authenticator apps
- [ ] Backup codes work for recovery
- [ ] Session-level 2FA verification (NOT user-level manipulation)
- [ ] 2FA required on each device/session
- [ ] 2FA can be disabled/re-enabled

### Session Management ✅
- [ ] Multiple concurrent sessions supported
- [ ] Session metadata captured (IP, location, device)
- [ ] Active sessions page shows all sessions
- [ ] Remote session revocation works
- [ ] Password change invalidates other sessions
- [ ] Current session preserved on password change

### Security ✅
- [ ] Rate limiting prevents brute-force
- [ ] Invalid sessions rejected
- [ ] Session expiration enforced
- [ ] No passwords in URLs
- [ ] No race conditions in 2FA flow
- [ ] CSRF protection present

### User Experience ✅
- [ ] Mobile responsive
- [ ] Fast load times (< 1s)
- [ ] Clear error messages
- [ ] Graceful degradation (geolocation failure)
- [ ] Loading states shown

---

## Test Results Summary

**Date**: ___________
**Tester**: ___________

**Pass Rate**: ___ / ___ tests passed

### Critical Issues Found
1. ___________
2. ___________

### Minor Issues Found
1. ___________
2. ___________

### Performance Metrics
- Average login time: ___ ms
- Average 2FA verification: ___ ms
- Session validation: ___ ms

**Final Status**: 🟢 Production Ready / 🟡 Minor Fixes Needed / 🔴 Major Issues

**Industry Standard Compliance**: [ ] Auth0-level / [ ] Basic / [ ] Needs Work

---

## Post-Testing Actions

Once all tests pass:
- [ ] Archive old testing documentation
- [ ] Update production deployment checklist
- [ ] Document any configuration changes needed
- [ ] Mark authentication system as production-ready

**Authentication System Certification**: ___________
**Approved By**: ___________
**Date**: ___________
