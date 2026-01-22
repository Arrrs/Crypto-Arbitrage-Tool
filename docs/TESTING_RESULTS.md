# Authentication System Testing Guide

**Last Updated**: 2025-11-26
**Build Version**: Complete Security & UX Overhaul
**Status**: 26/78 tests completed (33.3%)

---

## 📋 Quick Navigation

- [Testing Progress Overview](#testing-progress-overview)
- [Test Environment Setup](#test-environment-setup)
- [Part 1: Account Creation & First Login](#part-1-account-creation--first-login)
- [Part 2: Two-Factor Authentication (2FA)](#part-2-two-factor-authentication-2fa)
- [Part 3: Profile & Security Management](#part-3-profile--security-management)
- [Part 4: Email Change System (NEW)](#part-4-email-change-system-new)
- [Part 5: Password Management](#part-5-password-management)
- [Part 6: Rate Limiting & Security](#part-6-rate-limiting--security)
- [Part 7: Session Management](#part-7-session-management)
- [Part 8: OAuth-Specific Features](#part-8-oauth-specific-features)
- [Part 9: UX Improvements (NEW)](#part-9-ux-improvements-new)
- [Part 10: Edge Cases & Error Handling](#part-10-edge-cases--error-handling)
- [Part 11: Mobile & Performance](#part-11-mobile--performance)
- [Part 12: End-to-End Integration](#part-12-end-to-end-integration)
- [Database Verification Commands](#database-verification-commands)

---

## Testing Progress Overview

### ✅ Completed Tests (26/78)
- [x] Part 1: Account Creation & First Login (3/3) ✅
- [x] Part 2: Two-Factor Authentication (7/13) 🟡
- [ ] Part 3: Profile & Security Management (0/8)
- [ ] Part 4: Email Change System (0/13) ⚠️ CRITICAL
- [x] Part 5: Password Management (9/12) 🟡
- [x] Part 6: Rate Limiting & Security (6/12) 🟡
- [x] Part 7: Session Management (3/4) 🟡
- [x] Part 8: OAuth-Specific Features (1/4) 🟡
- [ ] Part 9: UX Improvements (0/10) ⚠️ CRITICAL
- [x] Part 10: Edge Cases (2/3) 🟡
- [ ] Part 11: Mobile & Performance (0/2)
- [ ] Part 12: End-to-End Integration (0/1)

### 🔴 Critical Untested Features
1. **Email Change System (Part 4)** - Complete security overhaul untested
2. **Rate Limiting on Token Endpoints (Part 6.5-6.10)** - Security fixes untested
3. **UX Improvements (Part 9)** - Auto-redirect, progressive validation untested
4. **2FA for Sensitive Actions (Part 3.5-3.7)** - Grace period system untested

---

## Test Environment Setup

### Prerequisites
- [+] Server running: `npm run dev` on port 3000
- [+] Database running and migrated
- [+] Two browsers ready (Chrome + Firefox/Incognito)
- [+] Mobile device or responsive mode for mobile testing
- [+] TOTP authenticator app (Google Authenticator, Authy, or 1Password)
- [+] Password manager (Chrome built-in, 1Password, or LastPass) for Part 9 testing

### Test Users Required

Create these test users before starting:

```bash
# User 1: Regular user without 2FA
Email: user1@test.com
Password: password123
2FA: Disabled

# User 2: User with 2FA enabled
Email: user2@test.com
Password: password123
2FA: Enabled (set up during tests)

# User 3: OAuth user
Email: your-google-email@gmail.com
Method: Google OAuth
2FA: Setup during tests

# User 4: Test email changes
Email: olduser@test.com
Password: password123
Purpose: Email change testing
```

### Test Data Preparation

```bash
# Clean database (optional - only if starting fresh)
npx prisma migrate reset

# Initialize system
npx tsx scripts/init-system.ts

# Verify database connection
npx prisma studio  # Opens database viewer
```

---

## Part 1: Account Creation & First Login

**Purpose**: Test basic signup, email verification, and first login
**Time Estimate**: 15 minutes
**Prerequisites**: Clean test environment
**Status**: ✅ 3/3 COMPLETED

---

### Test 1.1: Standard Signup & Login ✅ COMPLETED

**Objective**: Verify basic email/password authentication works
**Industry Standard**: Basic credentials authentication (Auth0, AWS Cognito)

**Test Steps**:

1. **Valid Credentials Login:**
   - [+] Go to `/login`
   - [+] Enter: `user1@test.com` / `password123`
   - [+] Click "Sign In"
   - [+] **Expected**: Redirect to `/profile` ✅
   - [+] **Expected**: See user name in header ✅

2. **Invalid Password:**
   - [+] Logout
   - [+] Enter: `user1@test.com` / `wrongpassword`
   - [+] **Expected**: "Invalid email or password" error ✅
   - [+] **Expected**: Stay on login page ✅

3. **Invalid Email:**
   - [+] Enter: `nonexistent@test.com` / `password123`
   - [+] **Expected**: "Invalid email or password" error ✅

4. **Empty Fields:**
   - [+] Leave email empty, click Sign In
   - [+] **Expected**: Validation error ✅
   - [+] Leave password empty, click Sign In
   - [+] **Expected**: Validation error ✅

**Status**: [+] PASS
**Issues**: None

---

### Test 1.2: Email Verification Flow ✅ COMPLETED

**Objective**: Prevent fake email signups
**Industry Standard**: Email verification required before login

**Test Steps**:

1. **Unverified Email Cannot Login:**
   - [+] Create new user via signup (don't verify email)
   - [+] Try to login
   - [+] **Expected**: "Please verify your email" error ✅
   - [+] **Expected**: "Resend verification" link shown ✅

2. **Email Verification Flow:**
   - [+] Click "Resend verification email"
   - [+] Check terminal logs for verification link
   - [+] Open verification link
   - [+] **Expected**: "Email verified successfully" ✅
   - [+] Try login again
   - [+] **Expected**: Login successful ✅

**Status**: [+] PASS
**Issues Fixed**: Email enumeration vulnerability removed - only shows "verify email" error when password is CORRECT (Auth0/AWS Cognito standard)

---

### Test 1.3: Google OAuth Login ✅ COMPLETED

**Objective**: Social login integration works correctly
**Industry Standard**: Social login with automatic email verification

**Test Steps**:

1. **First-Time OAuth:**
   - [+] Click "Continue with Google"
   - [+] Complete Google OAuth flow
   - [+] **Expected**: Redirect to `/profile` ✅
   - [+] **Expected**: User created in database ✅
   - [+] **Expected**: `emailVerified` automatically set ✅

2. **Existing OAuth User:**
   - [+] Logout
   - [+] Click "Continue with Google" again
   - [+] **Expected**: Login successful (no new user created) ✅

3. **OAuth Session Metadata:**
   - [+] Go to Profile Settings → Active Sessions
   - [+] **Expected**: See session with metadata (browser, location) ✅

**Status**: [+] PASS
**Issues Fixed**: OAuth account linking race condition resolved, email verification automatic, session metadata now captured correctly

---

## Part 2: Two-Factor Authentication (2FA)

**Purpose**: Test 2FA setup, login, backup codes, and management
**Time Estimate**: 25 minutes
**Prerequisites**: User1 account without 2FA, User2 account for 2FA setup
**Status**: 🟡 7/13 COMPLETED (54%)

---

### Test 2.1: 2FA Setup ✅ COMPLETED

**Objective**: User can enable 2FA and download backup codes
**Industry Standard**: TOTP-based 2FA with backup codes (Google, GitHub)

**Test Steps**:

1. **Enable 2FA:**
   - [+] Login as `user2@test.com`
   - [+] Go to Profile Settings → Security
   - [+] Click "Enable Two-Factor Authentication"
   - [+] **Expected**: QR code displayed ✅
   - [+] **Expected**: Manual setup key shown ✅

2. **Scan QR Code:**
   - [+] Open authenticator app (Google Authenticator, Authy, 1Password)
   - [+] Scan QR code
   - [+] **Expected**: Account added to authenticator ✅

3. **Verify Setup:**
   - [+] Enter 6-digit TOTP code from authenticator
   - [+] Click "Verify & Enable"
   - [+] **Expected**: 2FA enabled successfully ✅
   - [+] **Expected**: Backup codes displayed (8 codes) ✅

4. **Download Backup Codes:**
   - [+] Click "Download Backup Codes"
   - [+] **Expected**: Text file downloaded ✅
   - [+] **Expected**: File contains 8 backup codes ✅
   - [+] Save codes securely for later tests

**Status**: [+] PASS
**Note**: No

---

### Test 2.2: 2FA Login with TOTP ✅ COMPLETED

**Objective**: 2FA verification required after password entry
**Industry Standard**: Session-level 2FA verification

**Test Steps**:

1. **Initial Login (Partial Session):**
   - [+] Logout
   - [+] Login with `user2@test.com` / `password123`
   - [+] **Expected**: Redirect to `/verify-2fa` ✅
   - [+] **Expected**: See "Authenticator App" and "Backup Code" tabs ✅
   - [+] **Expected**: Cannot access `/profile` (redirects back to 2FA) ✅

2. **Invalid TOTP Code:**
   - [+] Enter wrong code: `000000`
   - [+] Click "Verify"
   - [+] **Expected**: "Invalid or expired code" error ✅
   - [+] **Expected**: Stay on 2FA page ✅

3. **Valid TOTP Code:**
   - [+] Generate fresh code from authenticator app
   - [+] Enter 6-digit code
   - [+] Click "Verify"
   - [+] **Expected**: Redirect to `/profile` ✅
   - [+] **Expected**: Full session access granted ✅

**Status**: [+] PASS

---

### Test 2.3: 2FA Login with Backup Code ✅ COMPLETED

**Objective**: Backup codes work when authenticator unavailable
**Industry Standard**: One-time use backup codes

**Test Steps**:

1. **Switch to Backup Code Tab:**
   - [+] Logout and login with `user2@test.com`
   - [+] On 2FA page, click "Backup Code" tab
   - [+] **Expected**: Tab switches successfully ✅
   - [+] **Expected**: Input field cleared ✅

2. **Invalid Backup Code:**
   - [+] Enter: `INVALID-CODE`
   - [+] **Expected**: "Invalid or already used backup code" error ✅

3. **Valid Backup Code:**
   - [+] Enter one of the downloaded backup codes
   - [+] Click "Verify"
   - [+] **Expected**: Login successful ✅
   - [+] **Expected**: Redirect to `/profile` ✅

4. **One-Time Use Verification:**
   - [+] Logout and login again
   - [+] Try same backup code
   - [+] **Expected**: "Invalid or already used backup code" error ✅

**Status**: [+] PASS

---

### Test 2.4: 2FA Security - Session Isolation ✅ COMPLETED

**Objective**: 2FA verification required per-device, not per-account
**Industry Standard**: Multi-device 2FA enforcement (AWS Cognito)

**Test Steps**:

1. **Login on Device 1:**
   - [+] Login as `user2@test.com` on Chrome
   - [+] Complete 2FA verification
   - [+] **Expected**: Full access granted ✅

2. **Login on Device 2 (Requires 2FA):**
   - [+] Open Firefox/Incognito
   - [+] Login as `user2@test.com`
   - [+] **Expected**: 2FA verification required AGAIN ✅
   - [+] **Expected**: Device 1 session NOT invalidated ✅

3. **Session Independence:**
   - [+] Complete 2FA on Device 2
   - [+] **Expected**: Both devices have independent active sessions ✅

**Status**: [+] PASS

---

### Test 2.5: 2FA Disable & Re-enable ✅ COMPLETED

**Objective**: Users can disable and re-enable 2FA
**Industry Standard**: Require password or 2FA to disable

**Test Steps**:

1. **Disable 2FA:**
   - [+] Login as `user2@test.com`
   - [+] Go to Profile Settings → Security
   - [+] Click "Disable Two-Factor Authentication"
   - [+] **Expected**: Password confirmation modal appears ✅
   - [+] Enter password: `password123`
   - [+] **Expected**: 2FA disabled successfully ✅

2. **Login Without 2FA:**
   - [+] Logout
   - [+] Login with `user2@test.com` / `password123`
   - [+] **Expected**: Direct login to `/profile` (no 2FA prompt) ✅

3. **Re-enable 2FA:**
   - [+] Go to Profile Settings → Security
   - [+] Enable 2FA again
   - [+] **Expected**: NEW QR code generated ✅
   - [+] **Expected**: NEW backup codes generated (old codes invalid) ✅

**Status**: [+] PASS

---

### Test 2.6: 2FA Edge Cases ✅ COMPLETED

**Objective**: Handle edge cases gracefully
**Industry Standard**: Secure session handling

**Test Steps**:

1. **Expired Partial Session:**
   - [+] Login with 2FA user
   - [+] Wait on 2FA page for 15+ minutes
   - [+] Try to verify
   - [+] **Expected**: Session expired, redirected to login ✅

2. **Back Button Behavior:**
   - [+] Login with 2FA user
   - [+] Complete 2FA verification
   - [+] Click browser back button
   - [+] **Expected**: Does NOT return to 2FA page ✅

3. **Direct URL Access:**
   - [+] Logout completely
   - [+] Try to access `/profile` directly
   - [+] **Expected**: Redirect to `/login` ✅

4. **Password Reset with 2FA Enabled:**
   - [+] Go to "Forgot Password"
   - [+] Reset password for 2FA user
   - [+] **Expected**: Password reset successful ✅
   - [+] Login with new password
   - [+] **Expected**: 2FA still required ✅
   - [+] **Expected**: 2FA still works with same codes ✅

**Status**: [+] PASS

---

### Test 2.7: Backup Codes Count Display

**Objective**: Accurate backup code count shown
**Testing Date**: 2025-11-25
**Time Estimate**: 5 minutes

**Test Steps**:

1. **After Enabling 2FA:**
   - [+] Enable 2FA for fresh user
   - [+] Go to Profile Settings → Security
   - [+] **Expected**: "8 backup codes remaining" displayed ✅
   - [+] **Expected**: Count accurate immediately after setup ✅

2. **After Using Backup Code:**
   - [+] Logout and login with backup code
   - [+] Go to Profile Settings → Security
   - [+] **Expected**: "7 backup codes remaining" ✅

3. **After Disabling 2FA:**
   - [+] Disable 2FA
   - [+] **Expected**: Backup codes count hidden/cleared ✅

4. **After Regenerating Codes:**
   - [+] Enable 2FA
   - [+] Use 3 backup codes
   - [+] Regenerate backup codes
   - [+] **Expected**: "8 backup codes remaining" (reset to 8) ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: No

---

### Test 2.8: 2FA Modal Tabs Functionality

**Objective**: Verify 2FA modal tabs work correctly
**Testing Date**: 2025-11-25
**Time Estimate**: 5 minutes

**Test Steps**:

1. **Tab Switching:**
   - [+] Login as 2FA user, reach 2FA verification page
   - [+] **Expected**: "Authenticator App" tab selected by default ✅
   - [+] Click "Backup Code" tab
   - [+] **Expected**: Tab switches successfully ✅
   - [+] **Expected**: Input field changes to backup code format ✅

2. **Input Clearing on Tab Switch:**
   - [+] On "Authenticator App" tab, enter partial code: `123`
   - [+] Switch to "Backup Code" tab
   - [+] **Expected**: Input field cleared ✅
   - [+] Switch back to "Authenticator App" tab
   - [+] **Expected**: Input field cleared ✅

3. **Validation Per Tab:**
   - [+] On "Authenticator App" tab, enter invalid TOTP: `000000`
   - [+] Click Verify
   - [+] **Expected**: Error shown for TOTP ✅
   - [+] Switch to "Backup Code" tab
   - [+] **Expected**: Error cleared on tab switch ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: No

---

### Test 2.9: OAuth User Enable 2FA (No Password Required)

**Objective**: OAuth users can enable 2FA without setting password first
**Testing Date**: 2025-11-25
**Time Estimate**: 8 minutes

**Test Steps**:

1. **OAuth User Enable 2FA:**
   - [+] Login as OAuth user (Google login)
   - [+] Verify user has NO password set
   - [+] Go to Profile Settings → Security
   - [+] Click "Enable Two-Factor Authentication"
   - [+] **Expected**: NO password prompt (different from password users) ✅
   - [+] **Expected**: QR code shown directly ✅

2. **Complete 2FA Setup:**
   - [+] Scan QR code with authenticator app
   - [+] Enter TOTP code
   - [+] **Expected**: 2FA enabled successfully ✅
   - [+] **Expected**: Backup codes displayed ✅

3. **OAuth Login with 2FA:**
   - [+] Logout
   - [+] Login with Google OAuth
   - [+] **Expected**: Direct login to /profile (NO 2FA prompt)  ✅
   - [+] Enter TOTP code
   - [+] **Expected**: Login successful ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 2.10: OAuth User Disable 2FA (No Password Required)

**Objective**: OAuth users disable 2FA with TOTP code, not password
**Testing Date**: 2025-11-25
**Time Estimate**: 5 minutes

**Test Steps**:

1. **Disable 2FA as OAuth User:**
   - [+] Login as OAuth user with 2FA enabled
   - [+] Go to Profile Settings → Security
   - [+] Click "Disable Two-Factor Authentication"
   - [+] **Expected**: 2FA modal appears (NOT password modal) ✅
   - [+] **Expected**: Tabs show "Authenticator App" and "Backup Code" ✅
   - [+] **Expected**: NO password field shown ✅

2. **Verify with TOTP:**
   - [+] Enter 6-digit TOTP code from authenticator app
   - [+] Click "Verify"
   - [+] **Expected**: 2FA disabled successfully ✅

3. **Verify with Backup Code (Alternative):**
   - [+] Re-enable 2FA
   - [+] Click "Disable 2FA" again
   - [+] Switch to "Backup Code" tab
   - [+] Enter valid backup code
   - [+] **Expected**: 2FA disabled successfully ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 2.11: Password User Disable 2FA (Regression Test)

**Objective**: Password users still use password to disable 2FA
**Testing Date**: 2025-11-25
**Time Estimate**: 3 minutes

**Test Steps**:

1. **Disable 2FA as Password User:**
   - [+] Login as password-based user with 2FA enabled
   - [+] Go to Profile Settings → Security
   - [+] Click "Disable Two-Factor Authentication"
   - [+] **Expected**: Password confirmation modal appears ✅
   - [+] **Expected**: NO 2FA modal (different from OAuth users) ✅

2. **Enter Password:**
   - [+] Enter password: `password123`
   - [+] Click "Confirm"
   - [+] **Expected**: 2FA disabled successfully ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 2.12: 2FA Rate Limiting ✅ COMPLETED

**Objective**: Prevent brute-force attacks on 2FA codes
**Industry Standard**: Rate limiting on verification attempts

**Test Steps**:

1. **Multiple Wrong TOTP Codes:**
   - [+] Login as 2FA user
   - [+] Enter wrong code: `000000` (try 10 times rapidly)
   - [+] **Expected**: Rate limit triggered after 5-6 attempts ✅
   - [+] **Expected**: "Too many attempts" error shown ✅
   - [+] **Expected**: Wait time displayed (e.g., "Try again in 15 minutes") ✅

2. **Rate Limit Cooldown:**
   - [+] Wait for cooldown period
   - [+] Try again with valid code
   - [+] **Expected**: Login successful after cooldown ✅

**Status**: [+] PASS

---

### Test 2.13: 2FA Login Rate Limiting (Security Fix) ⚠️ CRITICAL

**Objective**: Prevent session enumeration via 2FA completion endpoint
**Testing Date**: 2025-11-26
**Security Issue**: Issue #10 - Missing rate limiting on `/api/auth/complete-2fa-login`
**Time Estimate**: 8 minutes

**Test Steps**:

1. **Setup:**
   - [+] Login as `user2@test.com` (2FA enabled user)
   - [+] Stop at 2FA verification page
   - [+] Open browser DevTools → Network tab

2. **Test Rate Limiting (10 attempts per 15 minutes):**
   - [+] Enter wrong TOTP code: `000000`
   - [+] Click "Verify" (repeat 11 times rapidly)
   - [+] **Expected**: First 10 attempts return "Invalid code" ✅
   - [+] **Expected**: 11th attempt returns 429 status code ✅
   - [+] **Expected**: Error message: "Too many attempts. Please try again in X minutes" ✅

3. **Verify Rate Limit Applies:**
   - [+] Try with valid TOTP code
   - [+] **Expected**: Still blocked by rate limit ✅
   - [+] **Expected**: Must wait for cooldown period ✅

4. **Check Network Request:**
   - [+] Look at failed request in DevTools
   - [+] **Expected**: `POST /api/auth/complete-2fa-login` returns 429 ✅
   - [+] **Expected**: `X-RateLimit-Limit: 10` header present ✅
   - [+] **Expected**: `X-RateLimit-Remaining: 0` header present ✅
   - [+] **Expected**: `Retry-After` header shows seconds to wait ✅

**Rate Limit Details**:
- **Endpoint**: `/api/auth/complete-2fa-login`
- **Limit**: 10 attempts per 15 minutes
- **Identifier**: IP address
- **Why Critical**: Prevents attackers from enumerating partial sessions

**Status**: [+] Pass / [ ] Fail
**Issues**: No

---

## Part 3: Profile & Security Management

**Purpose**: Test profile updates, password changes, 2FA for sensitive actions
**Time Estimate**: 30 minutes
**Prerequisites**: User with 2FA enabled
**Status**: 🔴 0/8 NOT TESTED

---

### Test 3.1: Basic Profile Updates (Without 2FA)

**Objective**: Users can update name and other profile fields
**Time Estimate**: 3 minutes

**Test Steps**:

1. **Update Name:**
   - [+] Login as `user1@test.com` (no 2FA)
   - [+] Go to Profile Settings
   - [+] Change name to "New Test Name"
   - [+] Click "Update Profile"
   - [+] **Expected**: Success message displayed ✅
   - [+] **Expected**: Name updated in header ✅
   - [+] **Expected**: NO 2FA modal (user doesn't have 2FA) ✅

2. **Verify Persistence:**
   - [+] Refresh page
   - [+] **Expected**: Name still shows "New Test Name" ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 3.2: Avatar Upload

**Objective**: Users can upload and update profile pictures
**Time Estimate**: 5 minutes

**Test Steps**:

1. **Upload Avatar:**
   - [+] Go to Profile Settings
   - [+] Click "Upload Avatar" or avatar placeholder
   - [+] Select image file (PNG, JPG, max 5MB)
   - [+] **Expected**: Image preview shown ✅
   - [+] Click "Save"
   - [+] **Expected**: Avatar updated in profile and header ✅

2. **Change Avatar:**
   - [+] Upload different image
   - [+] **Expected**: Old avatar replaced with new one ✅

3. **Remove Avatar:**
   - [+] Click "Remove Avatar"
   - [+] **Expected**: Reverts to default placeholder ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 3.3: Password Change Without 2FA (Regression)

**Objective**: Users without 2FA can change password normally
**Testing Date**: 2025-11-25
**Time Estimate**: 5 minutes

**Test Steps**:

1. **Change Password:**
   - [+] Login as `user1@test.com` (no 2FA)
   - [+] Go to Profile Settings → Security
   - [+] Click "Change Password"
   - [+] Enter current password: `password123`
   - [+] Enter new password: `NewPassword123!`
   - [+] Confirm new password: `NewPassword123!`
   - [+] Click "Update Password"
   - [+] **Expected**: NO 2FA modal appears (user doesn't have 2FA) ✅
   - [+] **Expected**: Success message: "Password updated successfully" ✅
   - [+] **Expected**: Other sessions logged out ✅

2. **Login with New Password:**
   - [+] Logout
   - [+] Login with old password: `password123`
   - [+] **Expected**: "Invalid email or password" error ✅
   - [+] Login with new password: `NewPassword123!`
   - [+] **Expected**: Login successful ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 3.4: Session Management (Regression)

**Objective**: Verify session management still works
**Time Estimate**: 5 minutes

**Test Steps**:

1. **View Active Sessions:**
   - [+] Login as `user1@test.com`
   - [+] Go to Profile Settings → Active Sessions
   - [+] **Expected**: Current session listed ✅
   - [+] **Expected**: Session metadata shown (browser, location, IP) ✅

2. **Revoke Remote Session:**
   - [+] Open Firefox/Incognito
   - [+] Login as `user1@test.com` (creates second session)
   - [+] On original Chrome browser, go to Active Sessions
   - [+] **Expected**: 2 sessions listed ✅
   - [+] Click "Revoke" on Firefox session
   - [+] **Expected**: Session revoked successfully ✅
   - [+] On Firefox, refresh page
   - [+] **Expected**: Redirected to login after 30-60 seconds ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 3.5: Password Change with 2FA ⚠️ NEW FEATURE

**Objective**: 2FA required when changing password (with grace period)
**Testing Date**: 2025-11-25
**Grace Period**: 10 minutes per-session
**Time Estimate**: 10 minutes

**Test Steps**:

1. **First Password Change (Requires 2FA):**
   - [+] Login as `user2@test.com` (2FA enabled)
   - [+] Go to Profile Settings → Security
   - [+] Click "Change Password"
   - [+] Enter current password: `password123`
   - [+] Enter new password: `NewPassword123!`
   - [+] Click "Update Password"
   - [+] **Expected**: 2FA modal appears with tabs ✅
   - [+] **Expected**: See "Authenticator App" and "Backup Code" tabs ✅

2. **Verify with TOTP:**
   - [+] Switch to "Authenticator App" tab
   - [+] Enter 6-digit TOTP code
   - [+] Click "Verify"
   - [+] **Expected**: Password change succeeds ✅
   - [+] **Expected**: Success message displayed ✅
   - [+] **Expected**: Other sessions logged out ✅

3. **Second Password Change (Grace Period):**
   - [+] Immediately try to change password again
   - [+] Enter current password: `NewPassword123!`
   - [+] Enter new password: `AnotherPassword123!`
   - [+] Click "Update Password"
   - [-] **Expected**: NO 2FA modal (grace period active) ✅
   - [+] **Expected**: Password change succeeds immediately ✅

4. **Grace Period Expiry:**
   - [ ] Wait 11 minutes
   - [ ] Try to change password again
   - [ ] **Expected**: 2FA modal appears again ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: We have mandatory 2fa for password change (no grace period)

---

### Test 3.6: Password Change with Backup Code

**Objective**: Backup codes work for password change 2FA
**Testing Date**: 2025-11-25
**Time Estimate**: 5 minutes

**Test Steps**:

1. **Use Backup Code:**
   - [ ] Login as `user2@test.com`
   - [ ] Wait 11 minutes (ensure grace period expired)
   - [ ] Try to change password
   - [ ] **Expected**: 2FA modal appears ✅
   - [+] Switch to "Backup Code" tab
   - [+] Enter unused backup code
   - [+] Click "Verify"
   - [+] **Expected**: Password change succeeds ✅

2. **Verify Code Consumed:**
   - [+] Try same backup code again for another password change
   - [+] **Expected**: "Invalid or already used backup code" error ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 3.7: Grace Period Per-Session Security

**Objective**: Grace period doesn't leak across devices
**Testing Date**: 2025-11-25
**Time Estimate**: 10 minutes

**Test Steps**:

1. **Setup:**
   - [ ] Login as `user2@test.com` on Chrome (Device 1)
   - [ ] Login as `user2@test.com` on Firefox (Device 2)

2. **Password Change on Device 1:**
   - [ ] On Device 1, change password with 2FA
   - [ ] **Expected**: Grace period active on Device 1 ✅

3. **Password Change on Device 2:**
   - [ ] On Device 2, try to change password immediately
   - [ ] **Expected**: 2FA modal STILL APPEARS (no grace period leak) ✅
   - [ ] **Expected**: Device 2 requires its own 2FA verification ✅

4. **Second Password Change on Device 1:**
   - [ ] On Device 1, change password again within 10 minutes
   - [ ] **Expected**: NO 2FA modal (grace period still active) ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: We have no grace period for password change

---

### Test 3.8: 2FA Modal Consistency Across Features

**Objective**: 2FA modal looks and works the same everywhere
**Testing Date**: 2025-11-25
**Time Estimate**: 8 minutes

**Test Steps**:

1. **Email Change Modal:**
   - [+] Login as `user2@test.com`
   - [+] Wait 11 minutes (grace period expired)
   - [+] Try to change email
   - [+] **Expected**: 2FA modal appears ✅
   - [+] **Expected**: Tabs present ("Authenticator App" + "Backup Code") ✅
   - [+] **Expected**: Visual design matches login 2FA page ✅

2. **Password Change Modal:**
   - [+] Try to change password
   - [+] **Expected**: 2FA modal appears ✅
   - [+] **Expected**: Same tabs and design ✅

3. **Disable 2FA Modal (OAuth Users Only):**
   - [+] Logout and login as OAuth user with 2FA
   - [+] Try to disable 2FA
   - [+] **Expected**: 2FA modal appears (not password modal) ✅
   - [+] **Expected**: Same tabs and design ✅

4. **Visual Consistency Check:**
   - [+] All modals have same width and height
   - [+] All modals have same button styles
   - [+] All modals have same error message formatting
   - [+] All modals have same loading states

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

## Part 4: Email Change System (NEW)

**Purpose**: Test complete email change security system with verification/cancellation
**Time Estimate**: 45 minutes
**Prerequisites**: User with 2FA enabled, access to two email inboxes
**Status**: 🔴 0/13 NOT TESTED ⚠️ CRITICAL FEATURE

**Implementation Date**: 2025-11-26
**Security Focus**: Prevent account takeover attacks

---

### Test 4.1: Basic Email Change Flow ⚠️ CRITICAL

**Objective**: Verify complete email change workflow
**Time Estimate**: 10 minutes

**Test Steps**:

1. **Initiate Email Change:**
   - [+] Login as `user2@test.com` (2FA enabled)
   - [+] Go to Profile Settings
   - [+] Change email from `user2@test.com` to `newuser@test.com`
   - [+] Click "Update Profile"
   - [+] **Expected**: 2FA modal appears (if grace period expired) ✅
   - [+] Enter 2FA code
   - [+] **Expected**: Success message: "Email change initiated! We've sent a verification link..." ✅
   - [+] **Expected**: User stays logged in (NOT logged out) ✅
   - [+] **Expected**: Email in profile still shows `user2@test.com` ✅

2. **Check Email Inbox (NEW email):**
   - [+] Open inbox for `newuser@test.com`
   - [+] **Expected**: Email from AUTH APP with subject "Verify Your New Email Address" ✅
   - [+] **Expected**: Email contains blue "Verify Email Change" button ✅
   - [+] **Expected**: Email explains grace period: "You can still login with your old email..." ✅
   - [+] **Expected**: Email says link expires in 24 hours ✅

3. **Check Email Inbox (OLD email):**
   - [+] Open inbox for `user2@test.com`
   - [+] **Expected**: Email from AUTH APP with subject "⚠️ Email Address Change Request" ✅
   - [+] **Expected**: Email contains RED "Cancel Email Change" button ✅
   - [+] **Expected**: Email shows FROM (`user2@test.com`) and TO (`newuser@test.com`) addresses ✅
   - [+] **Expected**: Email warns what happens if you don't cancel ✅

4. **Verify Email Change:**
   - [+] Click verification link in NEW email
   - [+] **Expected**: Redirect to `/verify-email-change?token=...` ✅
   - [+] **Expected**: Page auto-verifies (shows loading spinner) ✅
   - [+] **Expected**: Success message displayed ✅
   - [+] **Expected**: Redirect to `/login` after 3 seconds ✅

5. **Login with New Email:**
   - [+] Go to `/login`
   - [+] Try login with `user2@test.com` (old email)
   - [+] **Expected**: "Invalid email or password" error ✅
   - [+] Try login with `newuser@test.com` (new email)
   - [+] **Expected**: Login succeeds ✅
   - [+] Go to Profile Settings
   - [+] **Expected**: Email shows `newuser@test.com` ✅
   - [+] **Expected**: Other sessions were logged out ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 4.2: Grace Period Login (24-Hour Window)

**Objective**: Both old and new email work during grace period
**Time Estimate**: 8 minutes

**Test Steps**:

1. **Initiate Email Change:**
   - [+] Login as `olduser@test.com`
   - [+] Change email to `newuser@test.com`
   - [+] Provide 2FA code
   - [+] **Expected**: Email change initiated ✅

2. **Login with OLD Email (Before Verification):**
   - [+] Logout
   - [+] Go to `/login`
   - [+] Login with `olduser@test.com` (old email)
   - [+] **Expected**: Login succeeds ✅
   - [+] **Expected**: Can access profile ✅
   - [+] **Expected**: Email still shows `olduser@test.com` ✅

3. **Login with NEW Email (Before Verification):**
   - [+] Logout
   - [+] Try login with `newuser@test.com` (new email)
   - [+] **Expected**: "Invalid email or password" error ✅
   - [+] **Reason**: Email not verified yet, can't use it ✅

4. **Verify Email Change:**
   - [+] Click verification link from new email inbox
   - [+] **Expected**: Email updated successfully ✅

5. **Login with OLD Email (After Verification):**
   - [+] Logout
   - [+] Try login with `olduser@test.com` (old email)
   - [+] **Expected**: "Invalid email or password" error ✅

6. **Login with NEW Email (After Verification):**
   - [+] Try login with `newuser@test.com` (new email)
   - [+] **Expected**: Login succeeds ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 4.3: Email Change Cancellation ⚠️ CRITICAL SECURITY

**Objective**: User can cancel unauthorized email changes
**Security**: Prevents account takeover attacks
**Time Estimate**: 8 minutes

**Test Steps**:

1. **Initiate Email Change:**
   - [+] Login as `user2@test.com`
   - [+] Change email to `attacker@evil.com`
   - [+] Provide 2FA code
   - [+] **Expected**: Email change initiated ✅

2. **Check Cancellation Email:**
   - [+] Open inbox for `user2@test.com` (old email)
   - [+] **Expected**: Warning email received ✅
   - [+] **Expected**: Red "Cancel Email Change" button visible ✅
   - [+] **Expected**: Email shows FROM and TO addresses clearly ✅

3. **Cancel Email Change:**
   - [+] Click "Cancel Email Change" button
   - [+] **Expected**: Redirect to `/cancel-email-change?token=...` ✅
   - [+] **Expected**: Warning page shown: "Are you sure you want to cancel?" ✅
   - [+] **Expected**: Shows which email change will be cancelled ✅
   - [+] Click "Cancel Email Change" button
   - [+] **Expected**: Success message: "Email change cancelled successfully" ✅

4. **Verify Cancellation:**
   - [+] Try to use verification link from `attacker@evil.com` inbox
   - [+] **Expected**: "Invalid or expired token" error ✅
   - [+] Login with `user2@test.com`
   - [+] **Expected**: Login still works ✅
   - [+] Try login with `attacker@evil.com`
   - [+] **Expected**: "Invalid email or password" error ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 4.4: Email Change Expiration (24 Hours)

**Objective**: Verification links expire after 24 hours
**Time Estimate**: 5 minutes (or skip and note)

**Test Steps**:

1. **Initiate Email Change:**
   - [+] Login as `user2@test.com`
   - [+] Change email to `newuser@test.com`
   - [+] **Expected**: Email change initiated ✅

2. **Test Expired Verification Link:**
   - [+] Wait 25 hours (OR manually update database to expire token)
   - [+] Click verification link from new email
   - [+] **Expected**: Error page shown ✅
   - [+] **Expected**: "This link has expired" message ✅
   - [+] **Expected**: Link to initiate new email change ✅

3. **Verify Old Email Still Works:**
   - [+] Login with `user2@test.com` (old email)
   - [+] **Expected**: Login succeeds ✅

**Manual Database Expiration** (alternative to waiting 24 hours):
```sql
UPDATE pending_email_changes
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE new_email = 'newuser@test.com';
```

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 4.5: Email Already in Use ⚠️ CRITICAL SECURITY

**Objective**: Cannot change to email already registered
**Security**: Prevents email hijacking
**Time Estimate**: 5 minutes

**Test Steps**:

1. **Try Email Already in Use:**
   - [+] Login as `user1@test.com`
   - [+] Try to change email to `user2@test.com` (already exists)
   - [+] Provide 2FA code if needed
   - [+] **Expected**: Error message: "This email is already in use" ✅
   - [+] **Expected**: Email change NOT initiated ✅
   - [+] **Expected**: NO emails sent ✅

2. **Database Verification:**
   - [+] Check `pending_email_changes` table
   - [+] **Expected**: NO pending change record created ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 4.6: Email Pending for Another User ⚠️ CRITICAL SECURITY

**Objective**: Cannot change to email pending verification for another user
**Security**: Prevents race condition attacks
**Time Estimate**: 8 minutes

**Test Steps**:

1. **User 1 Initiates Email Change:**
   - [+] Login as `user1@test.com`
   - [+] Change email to `shared@test.com`
   - [+] **Expected**: Email change initiated ✅
   - [+] **Do NOT verify yet** (keep pending)

2. **User 2 Tries Same Email:**
   - [+] Logout, login as `user2@test.com`
   - [+] Try to change email to `shared@test.com` (same as User 1's pending)
   - [+] Provide 2FA code
   - [+] **Expected**: Error: "This email is already in use or pending verification" ✅
   - [+] **Expected**: Email change NOT initiated ✅

3. **After User 1 Verifies:**
   - [+] User 1 clicks verification link
   - [+] **Expected**: User 1's email changed to `shared@test.com` ✅
   - [+] User 2 tries to change to `shared@test.com` again
   - [+] **Expected**: Error: "This email is already in use" ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 4.7: Case-Insensitive Email Checking

**Objective**: Email addresses treated case-insensitively
**Time Estimate**: 5 minutes

**Test Steps**:

1. **Try Case Variations:**
   - [+] Login as `user1@test.com`
   - [+] Try to change email to `USER2@TEST.COM` (user2 already exists)
   - [+] **Expected**: Error: "This email is already in use" ✅
   - [+] Try to change email to `User2@Test.Com`
   - [+] **Expected**: Error: "This email is already in use" ✅

2. **Verify Stored Format:**
   - [+] Change email to valid new address: `NewUser@Test.Com`
   - [+] Complete verification
   - [+] Check database
   - [+] **Expected**: Email stored in lowercase: `newuser@test.com` ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 4.8: Multiple Pending Email Changes

**Objective**: Only one pending email change per user allowed
**Time Estimate**: 8 minutes

**Test Steps**:

1. **Initiate First Email Change:**
   - [+] Login as `user1@test.com`
   - [+] Change email to `newuser1@test.com`
   - [+] **Expected**: Email change initiated ✅
   - [+] **Do NOT verify yet**

2. **Initiate Second Email Change:**
   - [+] Immediately change email to `newuser2@test.com` (different email)
   - [+] Provide 2FA code
   - [+] **Expected**: Email change initiated ✅

3. **Verify First Link Cancelled:**
   - [+] Click verification link for `newuser1@test.com` (first change)
   - [+] **Expected**: Error: "Invalid or expired token" ✅
   - [+] **Reason**: Superseded by second email change ✅

4. **Verify Second Link Works:**
   - [+] Click verification link for `newuser2@test.com` (second change)
   - [+] **Expected**: Email change successful ✅
   - [+] Login with `newuser2@test.com`
   - [+] **Expected**: Login succeeds ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 4.9: Session Invalidation on Email Change

**Objective**: All sessions logged out except current when email changes
**Time Estimate**: 8 minutes

**Test Steps**:

1. **Setup Multiple Sessions:**
   - [+] Login as `user1@test.com` on Chrome (Device 1)
   - [+] Login as `user1@test.com` on Firefox (Device 2)
   - [+] Go to Profile Settings → Active Sessions on Device 1
   - [+] **Expected**: 2 active sessions shown ✅

2. **Initiate Email Change:**
   - [+] On Device 1, change email to `newuser@test.com`
   - [+] Complete 2FA verification
   - [+] **Expected**: Email change initiated ✅

3. **Verify Email Change:**
   - [+] Click verification link from email
   - [+] **Expected**: Email change successful ✅

4. **Check Other Sessions:**
   - [+] On Device 2 (Firefox), refresh page
   - [+] **Expected**: Redirected to login within 30-60 seconds ✅
   - [+] Try to access `/profile` on Device 2
   - [+] **Expected**: Redirected to login ✅

5. **Current Session Preserved:**
   - [+] On Device 1 (Chrome), refresh page
   - [+] **Expected**: Still logged in ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 4.10: Email Change Without 2FA

**Objective**: Users without 2FA can still change email
**Time Estimate**: 5 minutes

**Test Steps**:

1. **Change Email (No 2FA User):**
   - [+] Login as user WITHOUT 2FA enabled
   - [+] Go to Profile Settings
   - [+] Change email to new address
   - [+] Click "Update Profile"
   - [+] **Expected**: NO 2FA modal appears ✅
   - [+] **Expected**: Email change initiated immediately ✅

2. **Complete Verification:**
   - [+] Click verification link from new email
   - [+] **Expected**: Email change successful ✅
   - [+] Login with new email
   - [+] **Expected**: Login succeeds ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 4.11: Token Reuse Prevention

**Objective**: Verification tokens can only be used once
**Time Estimate**: 5 minutes

**Test Steps**:

1. **Use Verification Token:**
   - [+] Initiate email change
   - [+] Click verification link from email
   - [+] **Expected**: Email change successful ✅

2. **Try Token Again:**
   - [+] Click same verification link again
   - [+] **Expected**: Error: "Invalid or expired token" ✅
   - [+] **Expected**: Token consumed and deleted from database ✅

3. **Try Cancellation Token After Email Changed:**
   - [+] Click cancellation link from old email (after verification)
   - [+] **Expected**: Error: "Invalid or expired token" ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 4.12: Cron Job Cleanup

**Objective**: Expired/cancelled/finalized email changes cleaned up automatically
**Time Estimate**: 5 minutes (manual trigger)

**Test Steps**:

1. **Create Test Data:**
   - [+] Create 3 pending email changes:
     - One expired (24+ hours old)
     - One cancelled
     - One completed (finalized)

2. **Manual Cron Trigger:**
   ```bash
   # Trigger cron manually via API or database
   curl -X POST http://localhost:3000/api/admin/cron/email-cleanup/execute
   ```

3. **Verify Cleanup:**
   - [+] Check `pending_email_changes` table
   - [+] **Expected**: Expired change deleted ✅
   - [+] **Expected**: Cancelled change deleted ✅
   - [+] **Expected**: Finalized change deleted ✅

4. **Cron Schedule Verification:**
   - [+] Check admin panel → Cron Jobs
   - [+] **Expected**: "Email Change Cleanup" job listed ✅
   - [+] **Expected**: Schedule shows "Every 6 hours" ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 4.13: UI/UX Verification

**Objective**: Email change UI is clear and user-friendly
**Time Estimate**: 8 minutes

**Test Steps**:

1. **Profile Settings Page:**
   - [+] Go to Profile Settings
   - [+] **Expected**: Email field clearly labeled ✅
   - [-] **Expected**: Helpful text: "Changing your email requires verification" ✅
   - [+] **Expected**: No confusing UI elements ✅

2. **Success Message Clarity:**
   - [+] Change email
   - [+] **Expected**: Success message explains next steps clearly ✅
   - [+] **Expected**: Message mentions both verification and cancellation emails ✅
   - [+] **Expected**: Message explains 24-hour expiration ✅

3. **Verification Page Auto-Verify:**
   - [+] Click verification link
   - [+] **Expected**: Page loads and auto-verifies (no manual button click) ✅
   - [+] **Expected**: Loading spinner shown during verification ✅
   - [+] **Expected**: Success message clear and friendly ✅
   - [+] **Expected**: Countdown to login redirect (3 seconds) ✅

4. **Cancellation Page Warning:**
   - [+] Click cancellation link
   - [+] **Expected**: Warning shown BEFORE cancellation ✅
   - [+] **Expected**: Shows which email change will be cancelled ✅
   - [+] **Expected**: "Cancel Email Change" button clearly labeled ✅
   - [+] **Expected**: Success message after cancellation ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

## Part 5: Password Management

**Purpose**: Test password changes, resets, validation, Unicode support
**Time Estimate**: 25 minutes
**Prerequisites**: Test users, email access
**Status**: 🟡 9/12 COMPLETED (75%)

---

### Test 5.1: Unicode Password Support ✅ COMPLETED

**Objective**: Modern password standards accept all Unicode characters
**Testing Date**: 2025-11-25
**Standard**: NIST SP 800-63B

**Test Steps**:

1. **Cyrillic Password:**
   - [+] Go to `/signup`
   - [+] Create user with password: `Привет123!` (Russian)
   - [+] **Expected**: Password accepted ✅
   - [+] Login with Cyrillic password
   - [+] **Expected**: Login successful ✅

2. **Mixed Script Password:**
   - [+] Create user with password: `Hello世界123!` (English + Chinese)
   - [+] **Expected**: Password accepted ✅

3. **Emoji Password:**
   - [+] Create user with password: `MyP@ss🔒2024!`
   - [+] **Expected**: Password accepted ✅

4. **Password with Spaces:**
   - [+] Create user with password: `My Secure Password 123!`
   - [+] **Expected**: Password accepted ✅
   - [+] Login with exact spaces
   - [+] **Expected**: Login successful ✅

5. **Weak But Valid Unicode:**
   - [+] Try password: `ååååå123` (5 characters + 3 numbers)
   - [+] **Expected**: Password accepted (meets 8 char minimum) ✅

**Status**: [+] PASS

---

### Test 5.2: Password Validation UI ✅ COMPLETED

**Objective**: Clear password requirements shown
**Testing Date**: 2025-11-25

**Test Steps**:

1. **Signup Page Requirements:**
   - [+] Go to `/signup`
   - [+] **Expected**: Password requirements listed:
     - "At least 8 characters long" ✅
     - "Must contain at least one number" ✅
     - NO complexity requirements (no "must contain special char") ✅

2. **Real-Time Validation:**
   - [+] Enter password: `abc` (too short)
   - [+] **Expected**: "At least 8 characters" requirement NOT met ✅
   - [+] Enter password: `abcdefgh` (no number)
   - [+] **Expected**: "Must contain at least one number" NOT met ✅
   - [+] Enter password: `abcdefgh1`
   - [+] **Expected**: All requirements met ✅

**Status**: [+] PASS

---

### Test 5.3: Password Change with Unicode ✅ COMPLETED

**Objective**: Change to Unicode password works
**Testing Date**: 2025-11-25

**Test Steps**:

1. **Change to Unicode Password:**
   - [+] Login as user
   - [+] Go to Profile Settings → Security
   - [+] Change password to: `新しいパスワード123!` (Japanese)
   - [+] **Expected**: Password change successful ✅

2. **Login with New Unicode Password:**
   - [+] Logout
   - [+] Login with new Japanese password
   - [+] **Expected**: Login successful ✅

**Status**: [+] PASS

---

### Test 5.4: Password Reset with Unicode ✅ COMPLETED

**Objective**: Reset to Unicode password works
**Testing Date**: 2025-11-25

**Test Steps**:

1. **Reset to Unicode Password:**
   - [+] Go to "Forgot Password"
   - [+] Enter email
   - [+] Click reset link from email
   - [+] Enter new password: `Пароль2024!` (Russian)
   - [+] **Expected**: Password reset successful ✅

2. **Password Strength Indicator:**
   - [+] **Expected**: Password strength indicator works with Unicode ✅
   - [+] **Expected**: Shows "Strong" for complex Unicode passwords ✅

**Status**: [+] PASS

---

### Test 5.5: OAuth User Setting Password ✅ COMPLETED

**Objective**: OAuth users can set password for password-based login
**Testing Date**: 2025-11-25

**Test Steps**:

1. **Set Unicode Password:**
   - [+] Login as OAuth user (Google)
   - [+] Go to Profile Settings → Security
   - [+] Click "Set Password" (OAuth users don't have password initially)
   - [+] Enter password: `МойПароль123!` (Russian)
   - [+] **Expected**: Password set successfully ✅

2. **Login with Set Password:**
   - [+] Logout
   - [+] Login with email/password (not OAuth)
   - [+] **Expected**: Login successful with Unicode password ✅

3. **OAuth Still Works:**
   - [+] Logout
   - [+] Login with Google OAuth
   - [+] **Expected**: OAuth login still works ✅

**Status**: [+] PASS

---

### Test 5.6: Password Entry Points Consistency ✅ COMPLETED

**Objective**: All password entry points accept Unicode
**Testing Date**: 2025-11-25

**Test Steps**:

1. **Check All Entry Points:**
   - [+] Signup page: Unicode accepted ✅
   - [+] Login page: Unicode accepted ✅
   - [+] Password change page: Unicode accepted ✅
   - [+] Password reset page: Unicode accepted ✅
   - [+] OAuth "Set Password" page: Unicode accepted ✅

2. **Validation Consistency:**
   - [+] All pages show same requirements ✅
   - [+] All pages have same validation logic ✅

**Status**: [+] PASS

---

### Test 5.7: Password Change Rate Limiting ✅ COMPLETED

**Objective**: Prevent abuse of password change endpoint
**Testing Date**: 2025-11-25
**Security Issue**: Was counting 3 attempts for 1 change (now fixed)

**Test Steps**:

1. **Test Rate Limiting (5 changes per hour):**
   - [+] Login as user with 2FA
   - [+] Change password (with 2FA verification)
   - [+] **Expected**: Each change counts as 1 attempt (not 3) ✅
   - [+] Change password 5 more times
   - [+] **Expected**: 6th attempt blocked with rate limit ✅

2. **Separate from Password Reset:**
   - [+] Try password reset (forgot password flow)
   - [+] **Expected**: Different rate limit (not affected by password change limit) ✅

**Status**: [+] PASS
**Issues Fixed**: CRITICAL - Was counting password change as 3 attempts (now counts as 1)

---

### Test 5.8: Password Reset Rate Limiting ✅ COMPLETED

**Objective**: Separate rate limits for password reset
**Testing Date**: 2025-11-25

**Test Steps**:

1. **Test Password Reset Limit:**
   - [+] Go to "Forgot Password"
   - [+] Request password reset 5 times
   - [+] **Expected**: 6th request blocked ✅
   - [+] **Expected**: Separate from PASSWORD_CHANGE limit ✅

**Status**: [+] PASS

---

### Test 5.9: Admin UI for Rate Limits ✅ COMPLETED

**Objective**: Admin can view and configure rate limits
**Testing Date**: 2025-11-25

**Test Steps**:

1. **Admin Panel:**
   - [+] Login as admin
   - [+] Go to Admin → Settings → Rate Limiting
   - [+] **Expected**: See separate controls for:
     - PASSWORD_CHANGE (5 per hour) ✅
     - PASSWORD_RESET (5 per hour) ✅
   - [+] **Expected**: Tooltips explain each limit clearly ✅

**Status**: [+] PASS

---

### Test 5.10: Password Reset Token Validation (Progressive) ⚠️ NEW FEATURE

**Objective**: Token validated BEFORE showing password form
**Testing Date**: 2025-11-26
**Time Estimate**: 5 minutes

**Test Steps**:

1. **Request Password Reset:**
   - [+] Go to `/forgot-password`
   - [+] Enter `test@test.com`
   - [+] Click "Send Reset Link"
   - [+] **Expected**: Success message displayed ✅
   - [+] Check email inbox

2. **Click Valid Reset Link:**
   - [+] Open email and click reset link
   - [+] **Expected**: See loading spinner with text "Validating Reset Link..." ✅
   - [+] **Expected**: Spinner disappears within 1-2 seconds ✅
   - [+] **Expected**: Green success alert appears: "Reset Link Verified" ✅
   - [+] **Expected**: Success alert message: "Token is valid. You can now reset your password." ✅
   - [+] **Expected**: Password form is visible below success message ✅
   - [+] **Expected**: No flash of form before validation ✅

3. **Complete Password Reset:**
   - [+] Enter new password: `NewPassword123!`
   - [+] Confirm password: `NewPassword123!`
   - [+] Click "Reset Password"
   - [+] **Expected**: Password reset successful ✅
   - [+] **Expected**: Redirect to login ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 5.11: Expired Password Reset Link ⚠️ NEW FEATURE

**Objective**: Expired links detected immediately
**Testing Date**: 2025-11-26
**Time Estimate**: 5 minutes

**Test Steps**:

1. **Request Password Reset:**
   - [+] Go to `/forgot-password`
   - [+] Enter `test@test.com`
   - [+] Get reset link from email

2. **Expire Token Manually:**
   ```sql
   UPDATE verification_tokens
   SET expires = NOW() - INTERVAL '1 hour'
   WHERE identifier LIKE 'reset:%';
   ```

3. **Click Expired Reset Link:**
   - [+] Click reset link
   - [+] **Expected**: See loading spinner "Validating Reset Link..." ✅
   - [+] **Expected**: Red error alert appears ✅
   - [+] **Expected**: Error message: "This reset link has expired. Please request a new one." ✅
   - [+] **Expected**: Password form is NOT shown ✅
   - [+] **Expected**: "Request New Reset Link" button shown ✅

4. **Request New Link:**
   - [+] Click "Request New Reset Link"
   - [+] **Expected**: Redirect to `/forgot-password` ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 5.12: Password Reset Rate Limiting (Token Endpoint) ⚠️ CRITICAL SECURITY

**Objective**: Prevent brute-force attacks on password reset tokens
**Testing Date**: 2025-11-26
**Security Issue**: Issue #8 - Missing rate limiting on `/api/auth/reset-password`
**Time Estimate**: 8 minutes

**Test Steps**:

1. **Setup:**
   - [+] Request password reset for `test@test.com`
   - [+] Get reset token from email
   - [+] Open browser DevTools → Network tab

2. **Test Rate Limiting (5 attempts per hour):**
   - [+] Click reset link with valid token
   - [+] Enter password: `WrongPassword1!`
   - [+] Click "Reset Password" (repeat 6 times with different wrong passwords)
   - [+] **Expected**: First 5 attempts return validation errors ✅
   - [+] **Expected**: 6th attempt returns 429 status code ✅
   - [+] **Expected**: Error message: "Too many attempts. Please try again in X minutes" ✅

3. **Verify Rate Limit Applies:**
   - [+] Try with correct password
   - [+] **Expected**: Still blocked by rate limit ✅
   - [+] **Expected**: Must wait for cooldown period ✅

4. **Check Network Request:**
   - [+] Look at failed request in DevTools
   - [+] **Expected**: `POST /api/auth/reset-password` returns 429 ✅
   - [ ] **Expected**: `X-RateLimit-Limit: 5` header present ✅
   - [ ] **Expected**: `X-RateLimit-Remaining: 0` header present ✅
   - [ ] **Expected**: `Retry-After` header shows seconds to wait ✅

**Rate Limit Details**:
- **Endpoint**: `/api/auth/reset-password`
- **Limit**: 5 attempts per hour
- **Identifier**: IP address
- **Why Critical**: Prevents token brute-force attacks

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

## Part 6: Rate Limiting & Security

**Purpose**: Test rate limiting on all endpoints, security hardening
**Time Estimate**: 35 minutes
**Prerequisites**: Multiple test accounts
**Status**: 🟡 6/12 COMPLETED (50%)

---

### Test 6.1: Login Rate Limiting ✅ COMPLETED

**Objective**: Prevent brute-force login attacks
**Industry Standard**: Rate limiting on authentication endpoints

**Test Steps**:

1. **Failed Login Attempts:**
   - [+] Go to `/login`
   - [+] Enter: `test@test.com` / `wrongpassword`
   - [+] Try 6 times rapidly
   - [+] **Expected**: Rate limit triggered after 5-6 attempts ✅
   - [+] **Expected**: Error message with retry time ✅

2. **Rate Limit Cooldown:**
   - [+] Wait for cooldown period
   - [+] Try login with correct password
   - [+] **Expected**: Login successful after cooldown ✅

**Status**: [+] PASS

---

### Test 6.2: 2FA Verification Rate Limiting ✅ COMPLETED

**Objective**: Prevent brute-force on 2FA codes
**Covered in**: Test 2.12

**Status**: [+] PASS

---

### Test 6.3: Password Change Rate Limiting ✅ COMPLETED

**Objective**: Prevent password change abuse
**Covered in**: Test 5.7

**Status**: [+] PASS

---

### Test 6.4: Password Reset Request Rate Limiting ✅ COMPLETED

**Objective**: Prevent password reset email spam
**Covered in**: Test 5.8

**Status**: [+] PASS

---

### Test 6.5: Password Reset Token Rate Limiting ⚠️ CRITICAL SECURITY

**Objective**: Prevent brute-force on password reset tokens
**Covered in**: Test 5.12

**Status**: [+] Pass / [ ] Fail

---

### Test 6.6: Email Verification Rate Limiting ⚠️ CRITICAL SECURITY

**Objective**: Prevent token brute-force on email verification
**Testing Date**: 2025-11-26
**Security Issue**: Issue #9 - Missing rate limiting on `/api/auth/verify-email`
**Time Estimate**: 8 minutes

**Test Steps**:

1. **Setup:**
   - [+] Create new user via signup
   - [+] **Do NOT verify email yet**
   - [+] Get verification token from email
   - [+] Open browser DevTools → Network tab

2. **Test Rate Limiting (5 attempts per hour):**
   - [+] Click verification link
   - [+] Modify URL token to wrong value: `?token=INVALID123`
   - [+] Try 6 times with different invalid tokens
   - [+] **Expected**: First 5 attempts return "Invalid token" ✅
   - [+] **Expected**: 6th attempt returns 429 status code ✅
   - [+] **Expected**: Error message: "Too many attempts. Please try again in X minutes" ✅

3. **Verify Rate Limit Applies:**
   - [+] Try with valid token
   - [+] **Expected**: Still blocked by rate limit ✅
   - [+] **Expected**: Must wait for cooldown period ✅

4. **Check Network Request:**
   - [+] Look at failed request in DevTools
   - [+] **Expected**: `POST /api/auth/verify-email` returns 429 ✅
   - [+] **Expected**: `X-RateLimit-Limit: 5` header present ✅
   - [+] **Expected**: `X-RateLimit-Remaining: 0` header present ✅
   - [+] **Expected**: `Retry-After` header shows seconds to wait ✅

**Rate Limit Details**:
- **Endpoint**: `/api/auth/verify-email`
- **Limit**: 5 attempts per hour
- **Identifier**: IP address
- **Why Critical**: Prevents email verification token brute-force

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 6.7: 2FA Completion Rate Limiting ⚠️ CRITICAL SECURITY

**Objective**: Prevent session enumeration via 2FA completion
**Covered in**: Test 2.13

**Status**: [+] Pass / [ ] Fail

---

### Test 6.8: Email Change Verification Rate Limiting

**Objective**: Prevent token brute-force on email change verification
**Testing Date**: 2025-11-26
**Security Issue**: Issue #5 fix verification
**Time Estimate**: 8 minutes

**Test Steps**:

1. **Setup:**
   - [+] Login and initiate email change
   - [+] Get verification token from new email inbox
   - [+] Open browser DevTools → Network tab

2. **Test Rate Limiting (5 attempts per hour):**
   - [+] Click verification link
   - [+] Modify URL token to wrong value
   - [+] Try 6 times with different invalid tokens
   - [+] **Expected**: First 5 attempts return "Invalid token" ✅
   - [+] **Expected**: 6th attempt returns 429 status code ✅
   - [+] **Expected**: Error message: "Too many attempts. Please try again in X minutes" ✅

3. **Check Network Request:**
   - [+] Look at failed request in DevTools
   - [+] **Expected**: `POST /api/user/email/verify` returns 429 ✅
   - [+] **Expected**: Rate limit headers present ✅

**Rate Limit Details**:
- **Endpoint**: `/api/user/email/verify`
- **Limit**: 5 attempts per hour
- **Identifier**: IP address

**Status**: [+] Pass / [ ] Fail
**Issues**: Get 429 on 2-th or 3-th try while have limit up to 5 on email verification

---

### Test 6.9: Email Change Cancellation Rate Limiting

**Objective**: Prevent token brute-force on email change cancellation
**Testing Date**: 2025-11-26
**Security Issue**: Issue #5 fix verification
**Time Estimate**: 8 minutes

**Test Steps**:

1. **Setup:**
   - [+] Login and initiate email change
   - [+] Get cancellation token from old email inbox
   - [+] Open browser DevTools → Network tab

2. **Test Rate Limiting (5 attempts per hour):**
   - [+] Click cancellation link
   - [+] Modify URL token to wrong value
   - [+] Try 6 times with different invalid tokens
   - [+] **Expected**: First 5 attempts return "Invalid token" ✅
   - [+] **Expected**: 6th attempt returns 429 status code ✅

3. **Check Network Request:**
   - [+] **Expected**: `POST /api/user/email/cancel` returns 429 ✅
   - [+] **Expected**: Rate limit headers present ✅

**Rate Limit Details**:
- **Endpoint**: `/api/user/email/cancel`
- **Limit**: 5 attempts per hour
- **Identifier**: IP address

**Status**: [+] Pass / [ ] Fail
**Issues**: Can't easily test limit because not able to use token in url, and button can't be clicked few times

---

### Test 6.10: Rate Limit Summary - All Token Endpoints

**Objective**: Comprehensive verification of ALL token endpoints
**Testing Date**: 2025-11-26
**Time Estimate**: 5 minutes

**Checklist**:

| Endpoint | Rate Limit | Status | Notes |
|----------|------------|--------|-------|
| `/api/auth/login` | 5/hour | [+] Tested | Part 6.1 |
| `/api/auth/reset-password` | 5/hour | [ ] Tested | Issue #8 fix |
| `/api/auth/verify-email` | 5/hour | [ ] Tested | Issue #9 fix |
| `/api/auth/complete-2fa-login` | 10/15min | [ ] Tested | Issue #10 fix |
| `/api/user/email/verify` | 5/hour | [ ] Tested | Issue #5 fix |
| `/api/user/email/cancel` | 5/hour | [ ] Tested | Issue #5 fix |
| `/api/auth/verify-2fa` | 5/15min | [+] Already had | Pre-existing |
| `/api/user/2fa/verify` | 10/15min | [+] Already had | Pre-existing |

**Overall Security Posture**:
- [+] All token endpoints protected ✅
- [+] Rate limits match industry standards ✅
- [+] Error messages don't leak sensitive info ✅
- [+] Retry times communicated to users ✅

**Status**: [+] All Pass / [ ] Some Fail / [ ] Not Tested
**Issues**: ___________

---

### Test 6.11: Session Token Security ✅ COMPLETED

**Objective**: Session tokens are secure and properly validated

**Test Steps**:

1. **Invalid Session Token:**
   - [+] Login and get session cookie
   - [+] Modify cookie value
   - [+] Try to access `/profile`
   - [+] **Expected**: Redirected to login ✅

2. **Stolen Token (Portable Behavior):**
   - [+] Copy session cookie from Chrome
   - [+] Open Firefox, manually add same session cookie
   - [+] Access `/profile`
   - [+] **Expected**: Session works (cookies are portable by design) ✅

3. **Session Expiration:**
   - [+] Wait for session expiry (30 days default)
   - [+] **Expected**: Redirected to login ✅

**Status**: [+] PASS

---

### Test 6.12: CSRF Protection

**Objective**: State-changing requests protected against CSRF
**Status**: INCOMPLETE

**Test Steps**:

1. **State-Changing Requests:**
   - [+] Try POST requests without CSRF token
   - [+] **Expected**: Requests blocked ✅

2. **OAuth CSRF Protection:**
   - [+] Verify OAuth state parameter used
   - [+] **Expected**: CSRF protection on OAuth flow ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

## Part 7: Session Management

**Purpose**: Test session creation, metadata, revocation, security
**Time Estimate**: 15 minutes
**Prerequisites**: Multiple browsers/devices
**Status**: 🟡 3/4 COMPLETED (75%)

---

### Test 7.1: Multiple Concurrent Sessions ✅ COMPLETED

**Objective**: Users can have multiple active sessions
**Covered in**: Test 2.4 and Part 3 tests

**Test Steps**:

1. **Multi-Device Login:**
   - [+] Login on Chrome
   - [+] Login on Firefox
   - [+] **Expected**: Both sessions active ✅

2. **View Active Sessions:**
   - [+] Go to Profile Settings → Active Sessions
   - [+] **Expected**: Both sessions listed ✅

3. **Revoke Remote Session:**
   - [+] Click "Revoke" on Firefox session
   - [+] **Expected**: Firefox session logged out within 30-60 seconds ✅

**Status**: [+] PASS
**Note**: Time gap of 30-60 seconds before logout on revoked sessions

---

### Test 7.2: Session Metadata Accuracy ✅ COMPLETED

**Objective**: Session metadata captured correctly

**Test Steps**:

1. **Desktop Browser Metadata:**
   - [+] Login on Chrome desktop
   - [+] Go to Active Sessions
   - [+] **Expected**: Shows "Chrome" browser ✅
   - [+] **Expected**: Shows approximate location (city/country) ✅
   - [+] **Expected**: Shows IP address ✅

2. **Mobile Browser Metadata:**
   - [+] Login on mobile device or mobile emulation
   - [+] **Expected**: Shows correct mobile browser/device ✅

3. **Incognito Mode Detection:**
   - [+] Login in incognito mode
   - [+] **Expected**: Session still created with metadata ✅

**Status**: [+] PASS

---

### Test 7.3: Password Change Invalidates Other Sessions ✅ COMPLETED

**Objective**: Security - password change logs out other sessions
**Covered in**: Test 3.3

**Test Steps**:

1. **Setup Multiple Sessions:**
   - [+] Login on Chrome and Firefox
   - [+] Verify 2 active sessions

2. **Change Password:**
   - [+] On Chrome, change password
   - [+] **Expected**: Chrome session preserved ✅
   - [+] **Expected**: Firefox session invalidated ✅

**Status**: [+] PASS

---

### Test 7.4: Email Change Invalidates Other Sessions

**Objective**: Security - email change logs out other sessions
**Covered in**: Test 4.9

**Status**: [+] Pass / [ ] Fail

---

## Part 8: OAuth-Specific Features

**Purpose**: Test OAuth login, account linking, password setting
**Time Estimate**: 15 minutes
**Prerequisites**: Google account for OAuth testing
**Status**: 🟡 1/4 COMPLETED (25%)

---

### Test 8.1: OAuth First-Time Login ✅ COMPLETED

**Objective**: OAuth creates account and auto-verifies email
**Covered in**: Test 1.3

**Status**: [+] PASS

---

### Test 8.2: OAuth User Set Password

**Objective**: OAuth users can set password for email/password login
**Covered in**: Test 5.5

**Status**: [+] PASS (Unicode test)
**Need Standard Password Test**: [+]

**Additional Test Steps**:

1. **Set Standard Password:**
   - [+] Login as OAuth user
   - [+] Set password: `StandardPassword123!`
   - [+] **Expected**: Password set successfully ✅
   - [+] Login with email/password
   - [+] **Expected**: Login successful ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 8.3: OAuth User Enable 2FA

**Objective**: OAuth users can enable 2FA without password
**Covered in**: Test 2.9

**Status**: [+] Pass / [ ] Fail

---

### Test 8.4: OAuth User Disable 2FA

**Objective**: OAuth users disable 2FA with TOTP code, not password
**Covered in**: Test 2.10

**Status**: [+] Pass / [ ] Fail

---

## Part 9: UX Improvements (NEW)

**Purpose**: Test progressive validation, auto-redirect, autocomplete enhancements
**Time Estimate**: 60-75 minutes
**Prerequisites**: Password manager (Chrome, 1Password, LastPass), multiple browsers
**Status**: 🔴 0/10 NOT TESTED ⚠️ CRITICAL

**Implementation Date**: 2025-11-26
**Focus**: Industry-standard UX patterns (Google, GitHub, Microsoft)

---

### Test 9.1: Progressive Password Reset Validation ⚠️ CRITICAL

**Objective**: Token validated BEFORE showing password form
**Time Estimate**: 5 minutes

**DUPLICATE**: This is the same as Test 5.10
**Status**: [+] Pass / [ ] Fail
**See**: Test 5.10 for test steps

---

### Test 9.2: Expired Password Reset Link Handling ⚠️ CRITICAL

**Objective**: Expired links detected immediately
**Time Estimate**: 5 minutes

**DUPLICATE**: This is the same as Test 5.11
**Status**: [+] Pass / [ ] Fail
**See**: Test 5.11 for test steps

---

### Test 9.3: Email Verification Auto-Redirect with Countdown ⚠️ CRITICAL

**Objective**: Seamless flow from email verification to login
**Time Estimate**: 8 minutes

**Test Steps**:

1. **Setup:**
   - [+] Create new user via signup
   - [+] Get verification link from email

2. **Click Verification Link (Logged Out):**
   - [+] Click verification link
   - [+] **Expected**: Page loads with loading spinner ✅
   - [+] **Expected**: Auto-verification happens (no manual button click) ✅
   - [+] **Expected**: Success message displayed ✅
   - [+] **Expected**: Countdown timer shows: "Redirecting to login in 3 seconds..." ✅
   - [+] **Expected**: Countdown updates: 3, 2, 1 ✅
   - [+] **Expected**: Auto-redirect to `/login` after 3 seconds ✅

3. **Email Pre-fill on Login Page:**
   - [+] After redirect to login
   - [+] **Expected**: Email field pre-filled with verified email ✅
   - [+] **Expected**: Success message shown: "Email verified! Please login." ✅
   - [+] **Expected**: Password field is focused and ready to type ✅

4. **Manual "Go to Login Now" Button:**
   - [+] Click verification link again (or use different account)
   - [+] Before countdown finishes, click "Go to Login Now" button
   - [+] **Expected**: Immediate redirect to login ✅
   - [-] **Expected**: Email still pre-filled ✅

**Status**: [+] Pass / [ ] Fail
**Issues**: ___________

---

### Test 9.4: Email Verification for Logged-In User

**Objective**: Different flow when user already logged in
**Time Estimate**: 3 minutes

**Test Steps**:

1. **Verify Email While Logged In:**
   - [+] Create new user, but don't logout
   - [+] Click verification link while still logged in
   - [ ] **Expected**: Email verified successfully ✅
   - [ ] **Expected**: Redirect to `/profile` (NOT `/login`) ✅
   - [ ] **Expected**: NO countdown timer (already logged in) ✅
   - [ ] **Expected**: Success message shown on profile page ✅

**Status**: [ ] Pass / [+] Fail
**Issues**: No sense, i can't login without verification.

---

### Test 9.5: Autocomplete & Password Manager Integration ⚠️ CRITICAL

**Objective**: Proper HTML5 autocomplete attributes for password managers
**Time Estimate**: 10 minutes

**Test Steps**:

1. **Chrome/Edge Built-in Password Manager:**
   - [+] Go to `/signup`
   - [+] Enter email and password
   - [+] Submit form
   - [+] **Expected**: Chrome offers to save password ✅
   - [+] Click "Save"
   - [+] Logout
   - [+] Go to `/login`
   - [+] **Expected**: Chrome autofills email and password ✅
   - [+] Click login
   - [+] **Expected**: Login successful ✅

2. **1Password Integration:**
   - [ ] Install 1Password extension (or use existing)
   - [ ] Go to `/login`
   - [ ] Click 1Password icon
   - [ ] **Expected**: Saved credentials shown ✅
   - [ ] Click credential
   - [ ] **Expected**: Form autofilled correctly ✅

3. **LastPass Integration:**
   - [ ] Install LastPass extension (or use existing)
   - [ ] Go to `/login`
   - [ ] **Expected**: LastPass detects login form ✅
   - [ ] **Expected**: Autofill works correctly ✅

4. **Bitwarden Integration:**
   - [ ] Install Bitwarden extension (or use existing)
   - [ ] Go to `/login`
   - [ ] **Expected**: Bitwarden detects login form ✅
   - [ ] **Expected**: Autofill works correctly ✅

5. **HTML5 Attribute Verification:**
   - [ ] Inspect login page source
   - [ ] **Expected**: Email input has `autocomplete="email username"` ✅
   - [ ] **Expected**: Password input has `autocomplete="current-password"` ✅
   - [ ] Inspect signup page source
   - [ ] **Expected**: Email input has `autocomplete="email"` ✅
   - [ ] **Expected**: Password input has `autocomplete="new-password"` ✅
   - [ ] Inspect password change page
   - [ ] **Expected**: Current password has `autocomplete="current-password"` ✅
   - [ ] **Expected**: New password has `autocomplete="new-password"` ✅

**Success Criteria**:
- [ ] At least 2 password managers tested successfully
- [ ] Autofill success rate: 95%+
- [ ] Correct autocomplete attributes on all forms

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 9.6: Email Pre-fill on Login Page

**Objective**: Email query parameter pre-fills login form
**Time Estimate**: 3 minutes

**Test Steps**:

1. **Direct URL with Email Parameter:**
   - [ ] Navigate to: `/login?email=test@test.com`
   - [ ] **Expected**: Email field pre-filled with `test@test.com` ✅
   - [ ] **Expected**: Password field is focused ✅
   - [ ] **Expected**: URL parameters cleared after page load ✅

2. **Pre-fill After Email Verification:**
   - [ ] Covered in Test 9.3 ✅

3. **URL Encoding:**
   - [ ] Navigate to: `/login?email=test%2Bplus@test.com`
   - [ ] **Expected**: Email decoded correctly: `test+plus@test.com` ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 9.7: Loading States and Transitions

**Objective**: Smooth loading states, no blank screens
**Time Estimate**: 5 minutes

**Test Steps**:

1. **Network Throttling:**
   - [ ] Open DevTools → Network tab
   - [ ] Set throttling to "Slow 3G"
   - [ ] Click password reset link
   - [ ] **Expected**: Loading spinner shown immediately ✅
   - [ ] **Expected**: No blank screen or flash of content ✅
   - [ ] **Expected**: Smooth transition to success/error state ✅

2. **Loading Spinner Animation:**
   - [ ] Verify spinner is animated (not static image)
   - [ ] **Expected**: Spinner rotates smoothly ✅

3. **Transition Timing:**
   - [ ] **Expected**: Loading state → Success/Error in < 2 seconds (normal network) ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 9.8: Error Handling and Edge Cases

**Objective**: Graceful error handling for edge cases
**Time Estimate**: 10 minutes

**Test Steps**:

1. **Network Error During Token Validation:**
   - [ ] Click password reset link
   - [ ] **Immediately** disable network (DevTools → Offline)
   - [ ] **Expected**: Error message: "Unable to validate reset link. Please try again." ✅
   - [ ] **Expected**: Helpful instructions shown ✅

2. **Invalid Token Format:**
   - [ ] Navigate to: `/reset-password?token=INVALID!!!`
   - [ ] **Expected**: Error shown immediately ✅
   - [ ] **Expected**: Password form NOT shown ✅

3. **Multiple Simultaneous Requests:**
   - [ ] Click verification link multiple times rapidly
   - [ ] **Expected**: Only one request processed ✅
   - [ ] **Expected**: No duplicate error messages ✅

4. **SQL Injection Attempt:**
   - [ ] Navigate to: `/reset-password?token=' OR '1'='1`
   - [ ] **Expected**: Treated as invalid token ✅
   - [ ] **Expected**: No database error shown to user ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 9.9: Cross-Browser Compatibility

**Objective**: Features work across all major browsers
**Time Estimate**: 15 minutes

**Test Steps**:

1. **Chrome:**
   - [ ] Test progressive password reset validation ✅
   - [ ] Test email verification auto-redirect ✅
   - [ ] Test autocomplete ✅
   - [ ] **Status**: [ ] All Pass

2. **Firefox:**
   - [ ] Test progressive password reset validation ✅
   - [ ] Test email verification auto-redirect ✅
   - [ ] Test autocomplete ✅
   - [ ] **Status**: [ ] All Pass

3. **Safari (Mac/iOS):**
   - [ ] Test progressive password reset validation ✅
   - [ ] Test email verification auto-redirect ✅
   - [ ] Test autocomplete ✅
   - [ ] **Status**: [ ] All Pass

4. **Edge:**
   - [ ] Test progressive password reset validation ✅
   - [ ] Test email verification auto-redirect ✅
   - [ ] Test autocomplete ✅
   - [ ] **Status**: [ ] All Pass

**Browser Compatibility Matrix**:

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Progressive validation | [ ] | [ ] | [ ] | [ ] |
| Auto-redirect countdown | [ ] | [ ] | [ ] | [ ] |
| Email pre-fill | [ ] | [ ] | [ ] | [ ] |
| Autocomplete attributes | [ ] | [ ] | [ ] | [ ] |

**Status**: [ ] All Pass / [ ] Some Fail
**Issues**: ___________

---

### Test 9.10: Mobile Responsiveness for New Features

**Objective**: UX improvements work on mobile devices
**Time Estimate**: 10 minutes

**Test Steps**:

1. **Mobile Browser Testing:**
   - [ ] Open mobile device or responsive mode (375x667 - iPhone SE)
   - [ ] Click password reset link
   - [ ] **Expected**: Loading spinner properly sized for mobile ✅
   - [ ] **Expected**: Success/error messages readable on small screen ✅
   - [ ] **Expected**: Password form fits without horizontal scroll ✅

2. **Touch Interactions:**
   - [ ] Click verification link on mobile
   - [ ] **Expected**: Countdown timer readable on mobile ✅
   - [ ] **Expected**: "Go to Login Now" button is tap-friendly (44x44px+) ✅

3. **Mobile Autocomplete:**
   - [ ] Go to login page on mobile
   - [ ] **Expected**: Mobile keyboard shows email type for email field ✅
   - [ ] **Expected**: Password manager integration works on mobile ✅

4. **Responsive Breakpoints:**
   - [ ] Test at 320px (smallest mobile)
   - [ ] Test at 768px (tablet)
   - [ ] Test at 1024px (desktop)
   - [ ] **Expected**: All layouts responsive ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

## Part 10: Edge Cases & Error Handling

**Purpose**: Test edge cases, network failures, error scenarios
**Time Estimate**: 15 minutes
**Prerequisites**: DevTools for network throttling
**Status**: 🟡 2/3 COMPLETED (67%)

---

### Test 10.1: Network Failures ✅ COMPLETED

**Objective**: Graceful handling of network issues

**Test Steps**:

1. **Login During Network Issues:**
   - [+] Open DevTools → Network → Offline
   - [+] Try to login
   - [+] **Expected**: Error message: "Network error, please try again" ✅

2. **Geolocation API Failure:**
   - [+] Block geolocation API
   - [+] Login anyway
   - [+] **Expected**: Session created without location data ✅

**Status**: [+] PASS

---

### Test 10.2: Database Edge Cases ✅ COMPLETED

**Objective**: Handle database race conditions

**Test Steps**:

1. **Concurrent Login Attempts:**
   - [+] Open 2 browser tabs
   - [+] Login simultaneously in both tabs
   - [+] **Expected**: Both logins succeed ✅
   - [+] **Expected**: 2 separate sessions created ✅

2. **User Deleted Mid-Session:**
   - [+] Login as user
   - [+] Delete user from database (admin panel)
   - [+] Refresh page
   - [+] **Expected**: Not immediately logged out (session still valid) ✅
   - [+] Try to access protected resource
   - [+] **Expected**: Eventually redirected to login ✅

**Status**: [+] PASS
**Note**: Not immediately logged out on user deletion

---

### Test 10.3: Error Message Security

**Objective**: Error messages don't leak sensitive information
**Time Estimate**: 8 minutes

**Test Steps**:

1. **Invalid Login:**
   - [ ] Try login with non-existent email
   - [ ] **Expected**: Generic error: "Invalid email or password" ✅
   - [ ] **Expected**: Doesn't reveal if email exists ✅

2. **Invalid 2FA Code:**
   - [ ] Enter wrong 2FA code
   - [ ] **Expected**: Generic error: "Invalid or expired code" ✅
   - [ ] **Expected**: Doesn't reveal which (invalid vs expired) ✅

3. **Invalid Password Reset Token:**
   - [ ] Try invalid reset token
   - [ ] **Expected**: Generic error about invalid/expired link ✅
   - [ ] **Expected**: No database errors shown ✅

4. **Rate Limit Errors:**
   - [ ] Trigger rate limit
   - [ ] **Expected**: Clear message with retry time ✅
   - [ ] **Expected**: No internal implementation details leaked ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

## Part 11: Mobile & Performance

**Purpose**: Test mobile responsiveness and performance metrics
**Time Estimate**: 20 minutes
**Prerequisites**: Mobile device or responsive mode, DevTools
**Status**: 🔴 0/2 NOT TESTED

---

### Test 11.1: Mobile Responsive Design

**Objective**: All features work on mobile devices
**Time Estimate**: 15 minutes

**Test Steps**:

1. **Login Form on Mobile:**
   - [ ] Open `/login` on mobile (or 375x667 responsive mode)
   - [ ] **Expected**: Form fits without horizontal scroll ✅
   - [ ] **Expected**: Input fields properly sized for mobile ✅
   - [ ] **Expected**: Buttons are tap-friendly (44x44px+) ✅

2. **2FA on Mobile:**
   - [ ] Complete login flow with 2FA on mobile
   - [ ] **Expected**: 2FA tabs work on mobile ✅
   - [ ] **Expected**: Input fields properly sized ✅
   - [ ] **Expected**: No layout issues ✅

3. **Active Sessions on Mobile:**
   - [ ] Go to Profile Settings → Active Sessions on mobile
   - [ ] **Expected**: Session list readable and scrollable ✅
   - [ ] **Expected**: "Revoke" buttons are tap-friendly ✅

4. **Profile Settings on Mobile:**
   - [ ] Navigate through all profile settings on mobile
   - [ ] **Expected**: All forms accessible ✅
   - [ ] **Expected**: No horizontal scroll ✅
   - [ ] **Expected**: Modals fit within viewport ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

### Test 11.2: Performance Metrics

**Objective**: Page load and interaction performance
**Time Estimate**: 5 minutes

**Test Steps**:

1. **Login Speed:**
   - [ ] Open DevTools → Performance tab
   - [ ] Record login flow
   - [ ] **Expected**: Login completes in < 1 second ✅

2. **2FA Verification Speed:**
   - [ ] Record 2FA verification
   - [ ] **Expected**: Verification completes in < 500ms ✅

3. **Session Validation Speed:**
   - [ ] Record page load with active session
   - [ ] **Expected**: Session validation in < 200ms ✅

4. **Lighthouse Audit:**
   - [ ] Run Lighthouse audit on `/login`
   - [ ] **Expected**: Performance score > 90 ✅
   - [ ] **Expected**: Accessibility score > 90 ✅

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

## Part 12: End-to-End Integration

**Purpose**: Complete user journey from signup to all features
**Time Estimate**: 20 minutes
**Prerequisites**: Clean database
**Status**: 🔴 0/1 NOT TESTED

---

### Test 12.1: Complete User Journey

**Objective**: Test entire authentication system end-to-end
**Time Estimate**: 20 minutes

**Test Steps**:

1. **New User Signup:**
   - [ ] Go to `/signup`
   - [ ] Create account with email/password
   - [ ] **Expected**: Account created ✅
   - [ ] **Expected**: Verification email sent ✅

2. **Email Verification:**
   - [ ] Click verification link
   - [ ] **Expected**: Email verified with auto-redirect ✅
   - [ ] **Expected**: Login page with email pre-filled ✅

3. **First Login:**
   - [ ] Enter password and login
   - [ ] **Expected**: Redirect to `/profile` ✅

4. **Enable 2FA:**
   - [ ] Go to Profile Settings → Security
   - [ ] Enable 2FA
   - [ ] **Expected**: QR code shown, backup codes downloaded ✅

5. **Test 2FA Login:**
   - [ ] Logout and login again
   - [ ] **Expected**: 2FA verification required ✅
   - [ ] Complete 2FA with TOTP code
   - [ ] **Expected**: Login successful ✅

6. **Change Password:**
   - [ ] Change password
   - [ ] **Expected**: 2FA modal appears (grace period expired) ✅
   - [ ] **Expected**: Other sessions logged out ✅

7. **Change Email:**
   - [ ] Initiate email change
   - [ ] **Expected**: Verification email sent to new address ✅
   - [ ] **Expected**: Warning email sent to old address ✅
   - [ ] Complete email change
   - [ ] **Expected**: Login with new email works ✅

8. **Test Password Reset:**
   - [ ] Logout
   - [ ] Use "Forgot Password" flow
   - [ ] **Expected**: Progressive validation works ✅
   - [ ] **Expected**: Password reset successful ✅

9. **Session Management:**
   - [ ] Login on second device
   - [ ] View active sessions
   - [ ] Revoke remote session
   - [ ] **Expected**: Remote session logged out ✅

10. **Disable 2FA:**
    - [ ] Disable 2FA with password
    - [ ] **Expected**: 2FA disabled successfully ✅
    - [ ] Login without 2FA
    - [ ] **Expected**: Direct login (no 2FA prompt) ✅

**Success Criteria**:
- [ ] All steps complete without errors
- [ ] All security features work as expected
- [ ] All UX improvements function correctly

**Status**: [ ] Pass / [ ] Fail
**Issues**: ___________

---

## Database Verification Commands

Quick database queries for manual verification during testing:

```bash
# Connect to database
npx prisma studio

# Or use psql
PGPASSWORD=password psql -U postgres -d nextauth -h localhost -p 5432
```

### Useful SQL Queries:

```sql
-- Check all sessions for a user
SELECT * FROM sessions WHERE user_id = 'USER_ID';

-- View pending email changes
SELECT * FROM pending_email_changes WHERE user_id = 'USER_ID';

-- Check verification tokens
SELECT * FROM verification_tokens WHERE identifier = 'EMAIL';

-- View 2FA settings
SELECT id, email, "twoFactorEnabled", "backupCodesCount" FROM users WHERE email = 'EMAIL';

-- View backup codes
SELECT * FROM backup_codes WHERE user_id = 'USER_ID';

-- Check rate limit data
SELECT * FROM rate_limits WHERE identifier = 'IP_ADDRESS';

-- View audit logs
SELECT * FROM audit_logs WHERE user_id = 'USER_ID' ORDER BY created_at DESC LIMIT 10;
```

---

## Testing Summary Template

After completing all tests, fill out this summary:

### Overall Status
- **Total Tests**: 78
- **Passed**: ___
- **Failed**: ___
- **Skipped**: ___
- **Pass Rate**: ___%

### Critical Issues Found
1. ___________
2. ___________
3. ___________

### Recommendations
1. ___________
2. ___________
3. ___________

### Ready for Production?
- [ ] YES - All critical tests passed
- [ ] NO - Critical issues found (see above)
- [ ] PARTIAL - Minor issues acceptable for deployment

---

**End of Testing Guide**
