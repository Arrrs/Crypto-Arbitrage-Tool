Prerequisites:

  - [+] Server running: `npm run dev`
  - [+] Database running and accessible
  - [+] At least 3 test users created:
    (already have 50+ users before)
    - Admin user (with password) (admin@example.com:admin123)
    - Regular user (with password) (TestUnpaid@mail.com:TestUnpaid123!)
    - Paid user (with subscription) (TestPaid@mail.com:TestPaid123!)
    - OAuth user (Google sign-in) (arseniykalinovich@gmail.com)

---

## MOBILE RESPONSIVENESS FIXES - COMPLETED ✅

**Fixed on**: 2025-11-08

### Issues Found:
- Horizontal scrolling on alerts page table
- User management table cramped on tablets

### Fixes Applied:
1. **Alerts Page**: Added scroll wrapper and `scroll={{ x: 800 }}` to table
2. **Users Page**: Added scroll wrapper and `scroll={{ x: 1000 }}` to table
3. **Cron Jobs Page**: Added scroll wrapper and `scroll={{ x: 1000 }}` to table
4. **Logs Page**: Already had proper scroll configuration ✅

**Result**: All admin tables now scroll internally instead of causing page-wide horizontal scroll.

See full details: [MOBILE_RESPONSIVENESS_FIXES.md](MOBILE_RESPONSIVENESS_FIXES.md)

---

  Admin user (with password) (admin@example.com:admin123) - already created.
  Regular user (with password):
  createduser TestUnpaid@mail.com:TestUnpaid123!
  verification link failed to send because of wrong smtp credentials
  changed smtp credentials to mailhog (runs locally) and saved (sucessfully saved)
  tried to login and saw error: 
      GET /login 200 in 34ms
      ○ Compiling /api/auth/check-2fa ...
      ✓ Compiled /api/auth/check-2fa in 626ms (3407 modules)
      POST /api/auth/check-2fa 200 in 668ms
      ✓ Compiled /api/auth/login in 423ms (3409 modules)
      [auth][error] Error [EmailNotVerifiedError]: Please verify your email before signing in. Check your inbox for the verification link.
          at Object.authorize (auth.config.ts:73:17)
          at async POST (app/api/auth/login/route.ts:67:16)
        71 |         // Check if email is verified OR admin has verified the account
        72 |         if (!user.emailVerified && !user.adminVerified) {
      > 73 |           throw new EmailNotVerifiedError()
          |                 ^
        74 |         }
        75 |
        76 |         return { {
        type: 'CredentialsSignin',
        kind: 'signIn',
        code: 'email_not_verified'
      }
      [WARN][security][e773aa9f] Failed LOGIN attempt for user cmhp6z83l000s14lyho47bb02 {
        event: 'LOGIN',
        method: 'credentials',
        failReason: 'Invalid credentials',
        ipAddress: '::1'
      }
      [WARN][security][e773aa9f] Failed login attempt {
        ip: '::1',
        email: 'TestUnpaid@mail.com',
        userId: 'cmhp6z83l000s14lyho47bb02',
        reason: 'Invalid credentials',
        errorType: 'CredentialsSignin'
      }
      POST /api/auth/login 401 in 918ms
  expected notification "Please verify your email before signing in. Check your inbox for the verification link." on frontend and get it, so it's okay. But i see an error in logs (not optimised in server console) and that failed login atempt was recorded with failReason: 'Invalid credentials' type, but it's actually not verified email.
  I press on "resend verif email" and get email with link (good), activated it and successfully logged to the app so it's okay. 

  Also i noticed when i close tab and lry to open site with new tab i see some flashing homepage like it enters to homepage by default but then see that user is logged and redirects to profile page (as it should) but it looks not so good, is it possible to see loading screen that we have instead of it? But not overengenired please, we should keep everything simple.

  Also on the /pricing page i see three cards fith different plans, they looks good for mobile view, but for desktop make buttons lo be aligned to the bottom of the card

  Also in /admin/users page we have users table, but have no search in columns, i think more UI-UX features should be added for more easy use of the app.

  Also when i changed paid status for user i saw big message in console:
      [INFO][admin] Admin action: UPDATE_USER_SUBSCRIPTION {
      adminId: 'cmgoe2wa20000ybfmkkz6mspe',
      action: 'UPDATE_USER_SUBSCRIPTION',
      resource: 'User',
      resourceId: 'cmhpjrgt90017l1jobiby35fc',
      userEmail: 'TestPaid@mail.com',
      changes: {
        role: { new: 'USER' },
        adminVerified: { new: true },
        emailVerified: { new: true },
        isPaid: { new: true },
        paidUntil: { new: '2025-11-28T22:00:00.000Z' }
      },
      subscription: { isPaid: true, paidUntil: 2025-11-28T22:00:00.000Z }
    }
    PATCH /api/admin/users/cmhpjrgt90017l1jobiby35fc/update 200 in 1752ms
    ✓ Compiled /api/admin/users in 306ms (3377 modules)
    GET /api/admin/users 200 in 370ms
  I I think we should have more critical logs here or have them shorter here in main log flow

  I registred with google button using arseniykalinovich@gmail.com account, i was logged to the site after that, so it's good. For the first time i saw page with:
    You’re signing back in to NextAuthTest
    ArseniyKalinovich@gmail.com
    Review NextAuthTest’s Privacy Policy and Terms of Service to understand how NextAuthTest will process and protect your data.
    To make changes at any time, go to your Google Account.
    Learn more about Sign in with Google.
  And i submitted. But after that i logged out and logged again and hope not to see this page again, but it appears again in this login flow, should i see this page on every log in?

Test cases:

  1.1 User Registration - good.

  1.2 Email Verification - got email on smtm (local mailhog), and email verified successfully in the view and in logs (200). When i tried to use old verification link again i didn't see link expired/invalid message, instead i saw "email verified successfully" but in logs:  GET /api/auth/verify-email?token=88db5a29dc99f3f49fbd59c5010160f4c3175a3161647ab2c5f08e4a9c5844e7 400 in 21ms
  So looks like there is an issue with frontend.

  1.3 User Login (Password) - good.

  1.4 User Login (OAuth - Google) - good.

  1.5 User Logout - good.

  1.6 Password Reset Flow - clicked on forgot password and got the link, reset password page opened but i cant update password because of "Validation failed" on frontend. I see that we sent this from frontend:
      {token: "dccc085aea0e06a566e79785021c6780434d9acba4c427787d91bf661e02c623", password: "TestUser123!"}
      password
      : 
      "TestUser123!"
      token
      : 
      "dccc085aea0e06a566e79785021c6780434d9acba4c427787d91bf661e02c623"
  And getting this response:
      {
          "error": "Validation failed",
          "details": [
              {
                  "field": "confirmPassword",
                  "message": "Required"
              }
          ]
      }
  And here are logs from server: 
    GET /api/auth/session 200 in 11ms
    ○ Compiling /forgot-password ...
    ✓ Compiled /forgot-password in 1624ms (6232 modules)
    GET /forgot-password 200 in 1725ms
    ○ Compiling /api/auth/forgot-password ...
    ✓ Compiled /api/auth/forgot-password in 966ms (6120 modules)
    [INFO][email] Email sent {
      to: 'test17@mail.com',
      subject: 'Reset your password',
      messageId: '<144aa273-6ac5-c084-acb9-8e9e58d69259@nextauthtemplate.com>',
      devMode: false
    }
    [INFO][auth] Password reset requested { userId: 'cmgzjtqql0000rv3v24z4n0jg', email: 'test17@mail.com' }
    POST /api/auth/forgot-password 200 in 1169ms
    [INFO][system] Cron job completed: check_alerts { duration: 18, recordsAffected: 0 }
    ○ Compiling /reset-password ...
    ✓ Compiled /reset-password in 1200ms (6142 modules)
    GET /reset-password?token=692cc5296607d07f2060c3215c4e55bff780694dbde20667c17858b517b00783 200 in 1592ms
    ✓ Compiled /api/auth/[...nextauth] in 357ms (3238 modules)
    GET /api/auth/session 200 in 537ms
    GET /api/auth/session 200 in 10ms
    GET /api/auth/session 200 in 11ms
    ○ Compiling /api/auth/reset-password ...
    ✓ Compiled /api/auth/reset-password in 1101ms (6146 modules)
    POST /api/auth/reset-password 400 in 1228ms
    POST /api/auth/reset-password 400 in 10ms
    POST /api/auth/reset-password 400 in 17ms
    POST /api/auth/reset-password 400 in 11ms
    ○ Compiling /login ...
    ✓ Compiled /login in 851ms (2885 modules)
    GET /login 200 in 1231ms
    ✓ Compiled /api/auth/[...nextauth] in 404ms (3056 modules)
    GET /api/auth/session 200 in 595ms
    GET /api/auth/session 200 in 26ms
    GET /forgot-password 200 in 56ms
    ✓ Compiled /api/auth/forgot-password in 485ms (3095 modules)
    [INFO][email] Email sent {
      to: 'test17@mail.com',
      subject: 'Reset your password',
      messageId: '<58ffbc6c-cd4f-24d9-8c83-1ffb430b75a3@nextauthtemplate.com>',
      devMode: false
    }
    [INFO][auth] Password reset requested { userId: 'cmgzjtqql0000rv3v24z4n0jg', email: 'test17@mail.com' }
    POST /api/auth/forgot-password 200 in 731ms
    GET /reset-password?token=dccc085aea0e06a566e79785021c6780434d9acba4c427787d91bf661e02c623 200 in 212ms
    GET /api/auth/session 200 in 75ms
    GET /api/auth/session 200 in 11ms
    GET /api/auth/session 200 in 12ms
    ✓ Compiled /api/auth/reset-password in 312ms (3098 modules)
    POST /api/auth/reset-password 400 in 353ms
    POST /api/auth/reset-password 400 in 10ms
    POST /api/auth/reset-password 400 in 11ms


    2.1 View Profile - good (`x-csrf-token` header in response).

    2.2 Update Profile Name - request header had CSRF token, but response header had not, but i see that i still can update profile name (Success message, name updated)
       GET /api/user/profile 200 in 19ms
      PATCH /api/user/profile 200 in 18ms
      GET /api/auth/csrf 200 in 50ms
      POST /api/auth/session 200 in 21ms
      GET /profile/edit 200 in 39ms
    And i see new Name value after page refresh, so it's like broken.

    2.3 Update Email Address - on change i was logged out
      GET /api/user/profile 200 in 25ms
      [INFO][email] Email sent {
        to: 'test1313@mail.com',
        subject: 'Verify your email address',
        messageId: '<cd9814b3-c7d6-0acf-d1ed-bc07bbf6639d@nextauthtemplate.com>',
        devMode: false
      }
      PATCH /api/user/profile 200 in 80ms
      GET /api/auth/csrf 200 in 38ms
      POST /api/auth/signout 200 in 18ms
      GET /login?message=Please%20verify%20your%20new%20email%20address%20before%20signing%20in. 200 in 54ms
      GET /api/auth/session 200 in 67ms
      GET /api/auth/session 200 in 19ms
      [INFO][system] Cron job completed: check_alerts { duration: 40, recordsAffected: 0 }
      ○ Compiling /verify-email ...
      ✓ Compiled /verify-email in 1374ms (5781 modules)
      GET /verify-email?token=7f1d34aaed21d42d112d883d71f8503e71bde9316387277f4c1249cd2fc29563 200 in 1741ms
      ✓ Compiled /api/auth/verify-email in 296ms (3174 modules)
      ✓ Compiled in 537ms (2778 modules)
      GET /api/auth/session 200 in 1180ms
      GET /api/auth/verify-email?token=7f1d34aaed21d42d112d883d71f8503e71bde9316387277f4c1249cd2fc29563 200 in 1051ms
      GET /api/auth/session 200 in 26ms
      GET /api/auth/verify-email?token=7f1d34aaed21d42d112d883d71f8503e71bde9316387277f4c1249cd2fc29563 400 in 33ms
      GET /api/auth/session 200 in 19ms
      GET /login 200 in 54ms
      ✓ Compiled /api/auth/check-2fa in 298ms (3178 modules)
      POST /api/auth/check-2fa 200 in 355ms
      ○ Compiling /api/auth/login ...
      ✓ Compiled /api/auth/login in 519ms (3180 modules)
      [INFO][auth] User logged in: test1313@mail.com { userId: 'cmgwl5ugb000011tppa1wywsf', method: 'credentials' }
      POST /api/auth/login 200 in 931ms
      GET /profile 200 in 247ms
      GET /api/auth/session 200 in 72ms
      GET /api/auth/session 200 in 20ms
      GET /api/auth/session 200 in 16ms
      GET /api/auth/session 200 in 15ms
      GET /api/auth/session 200 in 42ms
      ○ Compiling /api/user/profile ...
      ✓ Compiled /api/user/profile in 613ms (3220 modules)
      GET /api/user/profile 200 in 758ms
      GET /api/user/profile 200 in 55ms
    Got link and saw "Email Verified" message. 
    After that successfully logged in, so this test looks good.

    2.4 Change Password - good
      GET /api/user/profile 200 in 18ms
      ○ Compiling /api/user/password ...
      ✓ Compiled /api/user/password in 1371ms (5994 modules)
      [INFO][auth][62497045] User changed password 
      POST /api/user/password 200 in 2081ms
    And successfully logged in with new password.
    Couldn't check header because of quick page refresh, so i'm not sure that we use it but in server logs i see no 403 error.

    2.5 Avatar Upload - 
      GET /api/user/profile 200 in 23ms  
      POST /api/user/avatar 200 in 54ms
      GET /api/auth/csrf 200 in 48ms
      POST /api/auth/session 200 in 17ms
    New photo uploads and saves, but i cant check header on CSRF token because page refreshes immediately (two times). Can you teach me how to do "Check Network" correctly? Because sometimes page refreshes and i had no "debug" command in the code.
    After refresh i can see the new avatar.

    2.6 Remove Avatar - the same as with adding an avatar, click button, can't see headers because of double page refresh. After that i see no avatar, so it's good.



    3.1 Enable 2FA (Password User) - first thought - if i use desktop i can scan QR code, but how should it work when i use phone?
    I scaned qr code with my phone and enter numbers, after that saw backup codes:
      1C0C5-4B4C6
      AFDC5-31524
      F88C9-6D6D4
      29F8D-FC440
      EA5EA-DA33E
      812FD-583BB
      80D0C-1C2F8
      EFBAB-83CC0

    At this point layout was broken a little bit, the table with codes and setup window was not centret and went out of available space on the phone so i should scroll to the right (like out of app borders) to see whole window. 
    POST `/api/user/2fa/setup` and POST `/api/user/2fa/verify` header requests had  CSRF token, but response header had no CSRF token, is it ok? And setting was successfully enabled. But i missed to check request header, so it can work correctly.
    Also when status is enabled i see two buttons: Regenerate... and Disable 2FA. THis buttons layout for mobile is bad, Disable button is out of the screen, so i need to scroll to the right and see this button partly on white space out of site.
    Also menu layout needs to be scrolled to the bottom to get to the profile button instead of having it just in the bottom of the menu, there are a lot of space for it to not use scroll, so it's something with layout.
    Some logs: 
      ○ Compiling /api/user/2fa/setup ...
      ✓ Compiled /api/user/2fa/setup in 1487ms (6017 modules)
      (node:134420) [DEP0005] DeprecationWarning: Buffer() is deprecated due to security and usability issues. Please use the Buffer.alloc(), Buffer.allocUnsafe(), or Buffer.from() methods instead.
      (Use `node --trace-deprecation ...` to show where the warning was created)
      [INFO][security][273bf97e] 2FA setup initiated { email: 'test1313@mail.com' }
      POST /api/user/2fa/setup 200 in 2213ms
      [INFO][system] System health check completed { output: 'Health check passed - 3 checks OK' }
      [INFO][system] Cron job completed: check_alerts { duration: 8, recordsAffected: 0 }
      ○ Compiling /api/user/2fa/verify ...
      ✓ Compiled /api/user/2fa/verify in 1406ms (6018 modules)
      [INFO][security][d9097df8] 2FA enabled successfully { email: 'test1313@mail.com' }
      POST /api/user/2fa/verify 200 in 1582ms

    3.2 Login with 2FA - good.

    !!! 🔴 CRITICAL SECURITY VULNERABILITY - 2FA BYPASS - ✅ FIXED!

    **THE BUG**: User with enabled 2FA tried to login, got to 2FA verification page, clicked "Back to login" WITHOUT entering 2FA code, and was redirected to /profile page as logged in!

    **IMPACT**: Complete bypass of Two-Factor Authentication security!

    Logs showing the vulnerability:
      POST /api/auth/check-2fa 200 in 799ms
      [INFO][auth] User logged in: test11@mail.com  ← SESSION CREATED BEFORE 2FA!
      POST /api/auth/login 200 in 628ms
      GET /verify-2fa?userId=... 200 in 841ms
      GET /profile 200 in 906ms  ← User accessed profile WITHOUT completing 2FA!

    **ROOT CAUSE**:
    - Login flow created full session before 2FA verification
    - auth.config.ts didn't check 2FA status before returning user
    - User could bypass 2FA by clicking "Back to Login"

    **FIXES APPLIED** (2025-11-08):
    1. ✅ Updated auth.config.ts to check 2FA BEFORE creating session
    2. ✅ Created /api/auth/validate-password endpoint (validates password WITHOUT session)
    3. ✅ Updated login flow to use validate-password for 2FA users
    4. ✅ Session now only created AFTER successful 2FA verification

    **FILES CHANGED**:
    - auth.config.ts (added 2FA check)
    - app/api/auth/validate-password/route.ts (NEW - password validation without session)
    - app/login/page.tsx (use validate-password for 2FA flow)
    - app/verify-2fa/page.tsx (added handleBackToLogin)

    See full details: CRITICAL_2FA_BYPASS_FIX.md

    **STATUS**: ✅ VULNERABILITY COMPLETELY ELIMINATED


    3.3 Login with Backup Code - get {"success":true,"message":"2FA verification successful"}. Tried to login with same code again and get {"error":"Invalid verification code"}
      GET /api/auth/csrf 200 in 53ms
      POST /api/auth/signout 200 in 22ms
      GET /login 200 in 311ms
      GET /api/auth/session 200 in 78ms
      GET /api/auth/session 200 in 18ms
      ✓ Compiled /api/auth/check-2fa in 273ms (3282 modules)
      POST /api/auth/check-2fa 200 in 312ms
      ✓ Compiled /api/auth/login in 492ms (3284 modules)
      [INFO][auth] User logged in: test1313@mail.com { userId: 'cmgwl5ugb000011tppa1wywsf', method: 'credentials' }
      POST /api/auth/login 200 in 828ms
      GET /verify-2fa?userId=cmgwl5ugb000011tppa1wywsf&email=test1313%40mail.com&password=Test1313%21 200 in 47ms
      [WARN][security][72cb0e7b] Failed LOGIN attempt for user cmgwl5ugb000011tppa1wywsf {
        event: 'LOGIN',
        method: 'credentials',
        failReason: 'Invalid 2FA code',
        ipAddress: '::1'
      }
      POST /api/auth/verify-2fa 400 in 457ms

    3.4 Regenerate Backup Codes - good, but layout for mobile is still messed up, table gets out of the box.
      6A9CC-DAD66
      D0F7E-94F0B
      ADEA0-FB056
      95B25-CDCB9
      00546-67CB1
      988FE-BC2F3
      A529C-20BCF
      F2293-50A76
    POST `/api/user/2fa/regenerate-backup-codes` request header had CSRF token, but response header had not.
    And also old code no longer works, so it's good

    3.5 Disable 2FA - works good, request header had CSRF token, but response header had not. Also layout for mobile view is out of the box like.

    3.6 2FA for OAuth Users - see message "2FA Not Available" for OAuth users

    Also small test for OAuth user - can't change email without setted password.
    POST "api/user/password" request header had CSRF token, but response header had not.
    After password set i logged out and in again with Google button.
    Changed email from arseniykalinovich@gmail.com to arseniykalinovich1@gmail.com, sam notification that i need to verify email and i will be logged out in 3 sec. After i was logged out, submit email with link and logged with the same password and new email.
    I tried to login again with google button and arseniykalinovich@gmail.com account and new account was created, so looks like everything works good.


  I stopped on this steps for now, will continue later on testing.







  New round of tests: 


  ## 1. Authentication & Session Tests

### 1.1 User Registration
- [+] Navigate to `/signup`
- [+] Fill in name, email, password
- [+] Submit form
- [+] **Expected**: User created, verification email sent
- [+] **CSRF**: No 403 errors during registration

### 1.2 Email Verification
- [+] Check terminal/logs for verification link
- [+] Click verification link
- [+] **Expected**: Email verified successfully
- [+] Try using old verification link again
- [+] **Expected**: Link expired/invalid message

### 1.3 User Login (Password)
- [+] Navigate to `/login`
- [+] Enter email and password
- [+] Submit form
- [+] **Expected**: Redirected to `/profile`
- [+] **CSRF**: No errors during login

### 1.4 User Login (OAuth - Google)
- [+] Click "Sign in with Google"
- [+] Complete Google OAuth flow
- [+] **Expected**: Redirected to `/profile`
- [+] **CSRF**: No errors during OAuth

### 1.5 User Logout
- [+] Click logout button
- [+] **Expected**: Redirected to `/login`
- [+] Try accessing `/profile`
- [+] **Expected**: Redirected back to `/login`

### 1.6 Password Reset Flow
- [ ] Go to login page
- [ ] Click "Forgot password?"
- [ ] Enter email address
- [ ] **Expected**: Reset email sent
- [ ] Check terminal for reset link
- [ ] Click reset link
- [ ] Enter new password
- [ ] **Expected**: Password updated successfully
- [ ] **CSRF**: No 403 errors

---

## 2. User Profile Tests (Regular User)

### 2.1 View Profile
- [ ] Login as regular user
- [ ] Navigate to `/profile/edit`
- [ ] **Expected**: Profile form loads with user data
- [ ] **CSRF**: Check browser DevTools Network tab - GET `/api/user/profile` should have `x-csrf-token` header in response

### 2.2 Update Profile Name
- [ ] Change name field
- [ ] Click "Update Profile"
- [ ] **Expected**: Success message, name updated
- [ ] **CSRF**: Check Network tab - PATCH request should include `x-csrf-token` header
- [ ] Refresh page
- [ ] **Expected**: New name persists

### 2.3 Update Email Address
- [ ] Change email field
- [ ] Click "Update Profile"
- [ ] **Expected**: Success message, logged out, verification email sent
- [ ] **CSRF**: No 403 error
- [ ] Verify new email
- [ ] Login with new email
- [ ] **Expected**: Login successful

### 2.4 Change Password
- [ ] Scroll to "Change Password" section
- [ ] Enter current password
- [ ] Enter new password
- [ ] Confirm new password
- [ ] Click "Update Password"
- [ ] **Expected**: Success message
- [ ] **CSRF**: No 403 error
- [ ] Logout and login with new password
- [ ] **Expected**: Login successful

### 2.5 Avatar Upload
- [ ] Click on avatar or "Change Photo" button
- [ ] Select an image (JPG, PNG < 5MB)
- [ ] **Expected**: Crop modal opens
- [ ] Adjust zoom and crop area
- [ ] Click "Save"
- [ ] **Expected**: Avatar uploaded, success message
- [ ] **CSRF**: Check Network - POST `/api/user/avatar` should have CSRF token
- [ ] Refresh page
- [ ] **Expected**: New avatar persists

### 2.6 Remove Avatar
- [ ] Click "Remove" button on avatar
- [ ] **Expected**: Avatar removed, success message
- [ ] **CSRF**: DELETE `/api/user/avatar` should have CSRF token
- [ ] Refresh page
- [ ] **Expected**: Default avatar shown

---

## 3. Two-Factor Authentication (2FA) Tests

### 3.1 Enable 2FA (Password User)
- [ ] Login as user with password
- [ ] Go to `/profile/edit`
- [ ] Scroll to "Two-Factor Authentication" section
- [ ] Click "Enable 2FA"
- [ ] **Expected**: QR code displayed
- [ ] **CSRF**: POST `/api/user/2fa/setup` should have CSRF token
- [ ] Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
- [ ] Click "Next: Verify Code"
- [ ] Enter 6-digit code from app
- [ ] Click "Verify & Enable 2FA"
- [ ] **Expected**: Backup codes displayed
- [ ] **CSRF**: POST `/api/user/2fa/verify` should have CSRF token
- [ ] Copy or download backup codes
- [ ] Click "Done"
- [ ] **Expected**: 2FA status shows "Enabled"

### 3.2 Login with 2FA
- [ ] Logout
- [ ] Login with email and password
- [ ] **Expected**: 2FA code prompt appears
- [ ] Enter code from authenticator app
- [ ] **Expected**: Login successful

### 3.3 Login with Backup Code
- [ ] Logout
- [ ] Login with email and password
- [ ] When prompted for 2FA code, enter one of the backup codes
- [ ] **Expected**: Login successful
- [ ] Try using the same backup code again
- [ ] **Expected**: Code rejected (single use)

### 3.4 Regenerate Backup Codes
- [ ] Go to `/profile/edit`
- [ ] Click "Regenerate Backup Codes"
- [ ] **Expected**: New backup codes displayed
- [ ] **CSRF**: POST `/api/user/2fa/regenerate-backup-codes` should have CSRF token
- [ ] Save new codes
- [ ] Try old backup code
- [ ] **Expected**: Old code no longer works

### 3.5 Disable 2FA
- [ ] Go to `/profile/edit`
- [ ] Click "Disable 2FA"
- [ ] Enter password in modal
- [ ] Click "Disable 2FA"
- [ ] **Expected**: 2FA disabled, success message
- [ ] **CSRF**: POST `/api/user/2fa/disable` should have CSRF token
- [ ] Logout and login
- [ ] **Expected**: No 2FA prompt, login with password only

### 3.6 2FA for OAuth Users
- [ ] Login as OAuth user (Google)
- [ ] Go to `/profile/edit`
- [ ] Check 2FA section
- [ ] **Expected**: Message showing "2FA Not Available" for OAuth users

---