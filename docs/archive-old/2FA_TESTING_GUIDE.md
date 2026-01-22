# 2FA Testing Guide

**Created**: October 27, 2025
**Last Updated**: October 27, 2025

This guide provides step-by-step instructions for testing the Two-Factor Authentication (2FA) implementation.

---

## Prerequisites

Before testing, ensure you have:

1. **Development environment running**:
   ```bash
   npm run dev
   ```

2. **Database migrated**:
   ```bash
   npx prisma migrate dev
   ```

3. **Authenticator app installed** (choose one):
   - Google Authenticator (iOS/Android)
   - Authy (iOS/Android/Desktop)
   - 1Password (with TOTP support)
   - Microsoft Authenticator
   - Any RFC 6238-compliant TOTP app

4. **Test user account created**:
   - Register a new account at `/signup`
   - Verify email if email verification is enabled
   - Ensure you can log in with credentials

---

## Test Scenario 1: Enable 2FA (Happy Path)

### Steps:

1. **Log in to your test account**
   - Navigate to `/login`
   - Enter email and password
   - Verify you can access the dashboard

2. **Navigate to profile settings**
   - Click your profile icon/name
   - Select "Profile" or navigate to `/profile`

3. **Find 2FA section**
   - Scroll to "Two-Factor Authentication" card
   - Current status should show: "Disabled" with red tag

4. **Click "Enable 2FA"**
   - Setup modal should open
   - Step 1 of 3 should be visible

5. **Scan QR code** (Step 1)
   - Open your authenticator app
   - Click "Add account" or "+" button
   - Scan the displayed QR code
   - OR manually enter the secret key shown below QR code
   - Account should appear as "NextAuth App (your-email@example.com)"
   - Click "Next" in the modal

6. **Verify TOTP token** (Step 2)
   - Look at your authenticator app
   - Enter the current 6-digit code (e.g., "123456")
   - Click "Verify and Enable 2FA"
   - Should proceed to Step 3

7. **Save backup codes** (Step 3)
   - 8 backup codes should be displayed (format: XXXXX-XXXXX)
   - Click "Copy Codes" button - codes copied to clipboard
   - OR click "Download Codes" - downloads `nextauth-backup-codes.txt`
   - **IMPORTANT**: Save these codes securely (you'll need one for testing)
   - Click "Finish Setup"

8. **Verify 2FA is enabled**
   - Modal should close
   - Status should now show: "Enabled" with green tag
   - Verified date should be displayed
   - "Disable 2FA" and "Regenerate Backup Codes" buttons should be visible

### Expected Results:
- ✅ QR code generates and displays correctly
- ✅ Authenticator app successfully scans code
- ✅ Valid TOTP token enables 2FA
- ✅ 8 backup codes are displayed
- ✅ Status changes to "Enabled"
- ✅ Database updated: `twoFactorEnabled = true`, `twoFactorVerified = <current timestamp>`

---

## Test Scenario 2: Login with 2FA (TOTP Token)

### Steps:

1. **Log out**
   - Click logout button or navigate to `/api/auth/signout`

2. **Navigate to login page**
   - Go to `/login`

3. **Enter credentials**
   - Email: your test account email
   - Password: your test account password
   - Click "Sign in"

4. **Redirected to 2FA verification**
   - Should automatically redirect to `/verify-2fa`
   - "Authenticator App" tab should be selected by default
   - 6-digit code input field should be visible

5. **Enter TOTP token**
   - Open your authenticator app
   - Find "NextAuth App (your-email)" account
   - Enter the current 6-digit code
   - Click "Verify"

6. **Verify login successful**
   - Should redirect to `/dashboard` or homepage
   - You should be logged in
   - Session should be active

### Expected Results:
- ✅ Login flow detects 2FA requirement
- ✅ Redirects to `/verify-2fa` page
- ✅ Valid TOTP token completes login
- ✅ User redirected to dashboard
- ✅ Session created successfully
- ✅ Audit log shows "LOGIN" with method "credentials_with_2fa"

---

## Test Scenario 3: Login with Backup Code

### Steps:

1. **Log out**
   - Click logout button

2. **Navigate to login page**
   - Go to `/login`

3. **Enter credentials**
   - Email: your test account email
   - Password: your test account password
   - Click "Sign in"

4. **Redirected to 2FA verification**
   - Should automatically redirect to `/verify-2fa`

5. **Switch to "Backup Code" tab**
   - Click the "Backup Code" tab
   - Input field should change to accept backup code format

6. **Enter one of your saved backup codes**
   - Use one of the codes you saved earlier (format: XXXXX-XXXXX)
   - Click "Verify"

7. **Verify login successful**
   - Should redirect to `/dashboard`
   - You should be logged in

8. **Check backup code was removed**
   - Go to profile settings
   - Click "Regenerate Backup Codes"
   - Enter password to view current codes
   - Verify you now have 7 codes instead of 8

### Expected Results:
- ✅ Backup code tab switches input format
- ✅ Valid backup code completes login
- ✅ Used backup code is removed from database
- ✅ Warning message appears about backup code usage
- ✅ Remaining backup codes count decremented
- ✅ Audit log shows backup code usage

---

## Test Scenario 4: Regenerate Backup Codes

### Steps:

1. **Log in to your account** (with 2FA enabled)

2. **Navigate to profile settings**
   - Go to `/profile`
   - Find "Two-Factor Authentication" section

3. **Click "Regenerate Backup Codes"**
   - Modal should open
   - Password field should be visible

4. **Enter your password**
   - Enter your account password
   - Click "Regenerate Codes"

5. **New backup codes displayed**
   - 8 new backup codes should be shown
   - Format: XXXXX-XXXXX
   - Click "Copy Codes" or "Download Codes"
   - Click "Done"

6. **Verify old codes are invalid**
   - Log out
   - Try to log in using an old backup code (from step 3)
   - Should fail with "Invalid verification code"
   - Now try with one of the new backup codes
   - Should succeed

### Expected Results:
- ✅ Password required to regenerate codes
- ✅ 8 new backup codes generated
- ✅ Old backup codes invalidated
- ✅ New backup codes work for login
- ✅ Database updated with new hashed codes

---

## Test Scenario 5: Disable 2FA

### Steps:

1. **Log in to your account** (with 2FA enabled)

2. **Navigate to profile settings**
   - Go to `/profile`
   - Find "Two-Factor Authentication" section

3. **Click "Disable 2FA"**
   - Modal should open
   - Password field should be visible
   - Warning message about security risk

4. **Enter your password**
   - Enter your account password
   - Click "Disable 2FA"

5. **Verify 2FA is disabled**
   - Modal should close
   - Status should now show: "Disabled" with red tag
   - "Enable 2FA" button should be visible
   - "Disable 2FA" and "Regenerate Backup Codes" buttons should be hidden

6. **Test login without 2FA**
   - Log out
   - Log in with email and password
   - Should go directly to dashboard (no 2FA verification)

### Expected Results:
- ✅ Password required to disable 2FA
- ✅ Status changes to "Disabled"
- ✅ Database updated: `twoFactorEnabled = false`, `twoFactorSecret = null`, `backupCodes = []`
- ✅ Login flow no longer requires 2FA
- ✅ Audit log shows "2FA disabled" event

---

## Test Scenario 6: Error Handling

### Test 6.1: Invalid TOTP Token

1. Log out and go to `/login`
2. Enter credentials (for 2FA-enabled account)
3. On `/verify-2fa` page, enter an invalid code (e.g., "000000")
4. Click "Verify"

**Expected**: Error message "Invalid verification code"

### Test 6.2: Expired TOTP Token

1. Log out and go to `/login`
2. Enter credentials
3. Note the current TOTP token from your app
4. Wait 30+ seconds for token to expire
5. Enter the expired token

**Expected**: Error message "Invalid verification code"

### Test 6.3: Used Backup Code

1. Log in with a backup code (as in Scenario 3)
2. Log out
3. Try to log in again with the same backup code

**Expected**: Error message "Invalid verification code"

### Test 6.4: Incorrect Password (Disable 2FA)

1. Log in (2FA enabled)
2. Go to profile, click "Disable 2FA"
3. Enter incorrect password
4. Click "Disable 2FA"

**Expected**: Error message "Incorrect password"

### Test 6.5: Incorrect Verification Code (Setup)

1. Log in (2FA disabled)
2. Go to profile, click "Enable 2FA"
3. Scan QR code, proceed to Step 2
4. Enter invalid code (e.g., "000000")
5. Click "Verify and Enable 2FA"

**Expected**: Error message "Invalid verification code", 2FA not enabled

---

## Test Scenario 7: OAuth Users (No Password)

**Note**: OAuth users (Google, GitHub) don't have passwords initially.

### Steps:

1. **Create OAuth account** (if not already done)
   - Sign up via Google or GitHub OAuth

2. **Navigate to profile settings**
   - Go to `/profile`

3. **Try to enable 2FA**
   - Click "Enable 2FA"

4. **Check for warning**
   - Should show message: "You must set a password before enabling 2FA"
   - Should not proceed to QR code

5. **Set a password first**
   - In profile, find "Set Password" section
   - Enter and confirm a strong password
   - Click "Set Password"

6. **Now enable 2FA**
   - Click "Enable 2FA" again
   - Should now work and show QR code

### Expected Results:
- ✅ OAuth users without password cannot enable 2FA
- ✅ Clear error message guides user to set password first
- ✅ After setting password, 2FA setup works normally

---

## Test Scenario 8: Security Logging

### Steps:

1. **Check database logs** after each action:
   ```sql
   SELECT * FROM "Log" WHERE category = 'security' ORDER BY timestamp DESC LIMIT 10;
   ```

2. **Verify log entries exist for**:
   - 2FA setup initiated
   - 2FA enabled (after verification)
   - 2FA login success
   - 2FA login failure (invalid code)
   - Backup code used
   - Backup codes regenerated
   - 2FA disabled

3. **Check session activity logs**:
   ```sql
   SELECT * FROM "SessionActivity" WHERE activity = 'LOGIN' ORDER BY timestamp DESC LIMIT 10;
   ```

4. **Verify login methods logged**:
   - `credentials_with_2fa` for successful 2FA login
   - Failed login attempts with reason "Invalid 2FA code"

### Expected Results:
- ✅ All 2FA events logged to database
- ✅ Request IDs included in logs
- ✅ User IDs associated with events
- ✅ Timestamps accurate
- ✅ Metadata includes relevant context (e.g., remaining backup codes)

---

## Database Verification Queries

### Check User 2FA Status
```sql
SELECT
  id,
  email,
  "twoFactorEnabled",
  "twoFactorVerified",
  array_length("backupCodes", 1) as backup_code_count
FROM "User"
WHERE email = 'your-test-email@example.com';
```

### Check 2FA Logs
```sql
SELECT
  timestamp,
  level,
  message,
  metadata
FROM "Log"
WHERE category = 'security'
  AND message LIKE '%2FA%'
ORDER BY timestamp DESC
LIMIT 20;
```

### Check Login Attempts
```sql
SELECT
  timestamp,
  activity,
  success,
  "failReason",
  metadata
FROM "SessionActivity"
WHERE "userId" = 'user-id-here'
ORDER BY timestamp DESC
LIMIT 10;
```

---

## Common Issues and Troubleshooting

### Issue: QR Code Not Displaying
- **Check**: Browser console for errors
- **Check**: Network tab for failed API calls
- **Solution**: Verify `qrcode` package installed: `npm install qrcode`

### Issue: "2FA not configured" Error During Login
- **Check**: Database `twoFactorEnabled` field is `true`
- **Check**: `twoFactorSecret` field has a value
- **Solution**: Re-enable 2FA from profile settings

### Issue: Authenticator App Shows Wrong Code
- **Check**: Device time is synchronized (TOTP relies on accurate time)
- **Solution**: Enable automatic time sync on your device

### Issue: All Backup Codes Used
- **Solution**:
  1. Log in with TOTP token from authenticator app
  2. Go to profile settings
  3. Click "Regenerate Backup Codes"
  4. Save new codes

### Issue: Lost Authenticator Access and No Backup Codes
- **Solution**: As admin, manually disable 2FA in database:
  ```sql
  UPDATE "User"
  SET
    "twoFactorEnabled" = false,
    "twoFactorSecret" = null,
    "backupCodes" = ARRAY[]::text[]
  WHERE email = 'user-email@example.com';
  ```

---

## Performance Testing

### Test Load Time
1. Measure QR code generation time (should be <500ms)
2. Measure TOTP verification time (should be <100ms)
3. Measure backup code verification time (should be <200ms due to bcrypt)

### Test Concurrent Logins
1. Open 3 browser tabs in incognito mode
2. Log in simultaneously with 2FA in all tabs
3. Verify all succeed without race conditions

---

## Security Testing

### Test Time Window
1. Generate a TOTP token
2. Wait exactly 30 seconds
3. Try to use the token
4. Should still work (2-step window = ±60 seconds)

### Test Backup Code Hashing
1. Enable 2FA and save backup codes
2. Check database `backupCodes` field:
   ```sql
   SELECT "backupCodes" FROM "User" WHERE email = 'test@example.com';
   ```
3. Verify codes are bcrypt hashes (start with `$2a$` or `$2b$`)
4. Verify plain-text codes are NOT stored

### Test One-Time Use
1. Log in with a backup code
2. Immediately log out and try to use the same code again
3. Should fail with "Invalid verification code"

---

## Test Checklist

Use this checklist to ensure comprehensive testing:

- [ ] Enable 2FA with QR code
- [ ] Enable 2FA with manual secret entry
- [ ] Verify with valid TOTP token
- [ ] Verify with invalid TOTP token (error handling)
- [ ] Save backup codes (copy and download)
- [ ] Log in with TOTP token
- [ ] Log in with backup code
- [ ] Verify backup code removed after use
- [ ] Log in with used backup code (should fail)
- [ ] Regenerate backup codes
- [ ] Verify old backup codes invalid
- [ ] Verify new backup codes work
- [ ] Disable 2FA with correct password
- [ ] Disable 2FA with incorrect password (should fail)
- [ ] Log in without 2FA after disabling
- [ ] Try to enable 2FA as OAuth user (should require password first)
- [ ] Check all security logs in database
- [ ] Verify session activity logged correctly
- [ ] Test time window (±60 seconds)
- [ ] Verify backup codes are hashed in database
- [ ] Test QR code display in different browsers
- [ ] Test mobile authenticator app compatibility
- [ ] Test concurrent logins with 2FA

---

## Next Steps After Testing

1. **Fix any bugs found** during testing
2. **Update IMPLEMENTATION_PROGRESS.md** with test results
3. **Document any edge cases** discovered
4. **Consider additional features**:
   - SMS 2FA as alternative to TOTP
   - Hardware token support (U2F/WebAuthn)
   - Admin-enforced 2FA for certain roles
   - Email notification when 2FA is disabled
   - Rate limiting on 2FA verification attempts

---

**Last Updated**: October 27, 2025 by Claude
