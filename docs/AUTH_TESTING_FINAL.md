# Final Authentication Testing Checklist

## Purpose
Complete authentication and session management testing before moving to next development phase.

---

## Test Environment
- [ ] Server running: `npm run dev`
- [ ] Database running
- [ ] Two browsers ready (Chrome + Firefox/Incognito)

---

## CRITICAL: Multi-Device Session Tests

### Test 1: Multiple Sessions Should Work
**Goal**: Verify users can be logged in on multiple devices simultaneously

1. **Device A (Chrome):**
   - [+] Login as `user@test.com`
   - [+] Go to `/profile`
   - [+] Verify you see profile page

2. **Device B (Firefox):**
   - [+] Login as `user@test.com` (same user)
   - [+] Go to `/profile`
   - [+] Verify you see profile page

3. **Both Devices:**
   - [+] Both should be logged in simultaneously
   - [+] Try navigating to `/features` on both
   - [+] **Expected**: Both devices work ✅

4. **Verify in Database:**
   ```bash
   npx tsx scripts/check-sessions.ts
   ```
   - [+] **Expected**: See 2+ sessions for the same user

---

### Test 2: Password Change Preserves Current Session
**Goal**: Device that changes password stays logged in, others are logged out

1. **Device A (Chrome):**
   - [+] Login as `user@test.com`
   - [+] Navigate to `/profile/settings`

2. **Device B (Firefox):**
   - [+] Login as `user@test.com`
   - [+] Navigate to `/profile/settings`

3. **Device A - Change Password:**
   - [+] Scroll to "Change Password" section
   - [+] Enter current password: `password123`
   - [+] Enter new password: `newpassword123`
   - [+] Click "Update Password"
   - [+] **Expected**: Success message
   - [+] Stay on same page - **should still be logged in** ✅
   - [+] Navigate to `/features`
   - [+] **Expected**: Works without re-login ✅

4. **Device B - Should Be Logged Out:**
   - [+] Click refresh or navigate to another page
   - [+] **Expected**: Redirected to `/login` ✅
   - [+] Try accessing `/profile` directly
   - [+] **Expected**: Redirected to `/login` ✅

5. **Device B - Login with New Password:**
   - [ ] Login with `user@test.com` / `newpassword123`
   - [ ] **Expected**: Login successful ✅

---

### Test 3: Forgot Password Logs Out All Devices
**Goal**: Password reset via email should invalidate ALL sessions

1. **Setup:**
   - [ ] Device A: Login as `user@test.com`
   - [ ] Device B: Login as `user@test.com`
   - [ ] Both should be active

2. **Device A - Initiate Password Reset:**
   - [ ] Logout
   - [ ] Go to `/login`
   - [ ] Click "Forgot password?"
   - [ ] Enter email: `user@test.com`
   - [ ] **Expected**: "Reset email sent" message

3. **Check Terminal for Reset Link:**
   - [ ] Find password reset link in terminal logs
   - [ ] Copy the link

4. **Complete Password Reset:**
   - [ ] Open reset link in Device A
   - [ ] Enter new password: `resetpassword123`
   - [ ] Click "Reset Password"
   - [ ] **Expected**: Success message

5. **Device A - Should Be Logged Out:**
   - [ ] Try accessing `/profile`
   - [ ] **Expected**: Redirected to `/login` ✅

6. **Device B - Should Also Be Logged Out:**
   - [ ] Refresh page or navigate
   - [ ] **Expected**: Redirected to `/login` ✅

7. **Login with New Password:**
   - [ ] Login with `user@test.com` / `resetpassword123`
   - [ ] **Expected**: Login successful ✅

---

## IMPORTANT: OAuth User Password Setting

### Test 4: OAuth User Can Set Password
**Goal**: Google OAuth users should be able to set a password for credentials login

1. **Login with Google:**
   - [ ] Go to `/login`
   - [ ] Click "Sign in with Google"
   - [ ] Complete OAuth flow
   - [ ] **Expected**: Redirected to `/profile` ✅

2. **Set Password (No Current Password Required):**
   - [ ] Go to `/profile/edit`
   - [ ] Scroll to "Change Password" section
   - [ ] **Do NOT enter current password** (field should be optional)
   - [ ] Enter new password: `mypassword123`
   - [ ] Confirm password: `mypassword123`
   - [ ] Click "Update Password"
   - [ ] **Expected**: Success message ✅
   - [ ] **Expected**: "All sessions have been logged out" ✅

3. **Login with Email + Password:**
   - [ ] Logout
   - [ ] Go to `/login`
   - [ ] Login with OAuth email + `mypassword123`
   - [ ] **Expected**: Login successful ✅

4. **OAuth Still Works:**
   - [ ] Logout
   - [ ] Click "Sign in with Google"
   - [ ] **Expected**: Still works ✅

---

## Rate Limiting Tests

### Test 5: Password Change Rate Limit
**Goal**: Verify rate limiting is working with new dynamic limits

1. **Check Current Limit:**
   ```bash
   npx tsx scripts/verify-rate-limit-fix.ts
   ```
   - [ ] **Expected**: PASSWORD_RESET shows `maxAttempts: 10`

2. **Test Rate Limit:**
   - [ ] Login as any user
   - [ ] Go to `/profile/edit`
   - [ ] Change password 10 times in a row
   - [ ] **Expected**: All 10 succeed ✅
   - [ ] Try 11th time
   - [ ] **Expected**: Rate limit error with retry message ✅

### Test 6: Login Rate Limit
**Goal**: Verify failed login attempts are rate limited

1. **Failed Login Attempts:**
   - [ ] Go to `/login`
   - [ ] Enter correct email: `user@test.com`
   - [ ] Enter wrong password: `wrongpassword`
   - [ ] Try 10 times
   - [ ] **Expected**: All attempts return "Invalid credentials"

2. **Rate Limit Triggered:**
   - [ ] Try 11th time
   - [ ] **Expected**: Rate limit error ✅
   - [ ] Check error message shows time remaining

3. **Wait or Clear Limit:**
   - Option A: Wait for window to expire
   - Option B: Admin → Settings → Increase login attempts limit
   - [ ] **Expected**: Can try again after limit cleared

---

## Session Security Tests

### Test 7: Session Validation
**Goal**: Ensure invalid sessions are rejected

1. **Delete Session from Database:**
   - [ ] Login as user
   - [ ] Note session token from cookies (DevTools)
   - [ ] Manually delete session from database:
   ```bash
   # Run in database or create script
   DELETE FROM "Session" WHERE "sessionToken" = 'your-token-here';
   ```

2. **Try Using Deleted Session:**
   - [ ] Refresh page
   - [ ] **Expected**: Redirected to `/login` ✅
   - [ ] Try accessing `/api/user/profile`
   - [ ] **Expected**: 401 Unauthorized ✅

### Test 8: Session Expiry
**Goal**: Sessions should expire after 30 days

1. **Check Session Expiry:**
   ```bash
   npx tsx scripts/check-sessions.ts
   ```
   - [ ] **Expected**: `expires` field shows ~30 days from creation

2. **Manual Expiry Test** (Optional):
   - [ ] Login
   - [ ] Update session expiry to past date in database
   - [ ] Refresh page
   - [ ] **Expected**: Logged out ✅

---

## Edge Cases

### Test 9: Concurrent Password Changes
**Goal**: Ensure no race conditions with simultaneous password changes

1. **Setup:**
   - [ ] Device A: Login as user
   - [ ] Device B: Login as same user

2. **Simultaneous Change (if possible):**
   - [ ] Device A: Start password change
   - [ ] Device B: Start password change at same time
   - [ ] **Expected**: One succeeds, other may fail or both complete
   - [ ] **Expected**: No database corruption ✅

### Test 10: Invalid Current Password
**Goal**: Verify current password is validated

1. **Try Wrong Current Password:**
   - [ ] Login as user
   - [ ] Go to `/profile/edit`
   - [ ] Enter wrong current password
   - [ ] Enter new password
   - [ ] Click "Update Password"
   - [ ] **Expected**: "Current password is incorrect" error ✅

---

## Quick Verification Script

Run all at once to verify session system health:

```bash
# 1. Check sessions
npx tsx scripts/check-sessions.ts

# 2. Verify rate limits
npx tsx scripts/verify-rate-limit-fix.ts

# 3. Check database
# Should show multiple sessions per user if tested
```

---

## Success Criteria

### Must Pass ✅
- [ ] Multiple devices can be logged in simultaneously
- [ ] Password change preserves current session, logs out others
- [ ] Forgot password logs out ALL devices
- [ ] OAuth users can set password
- [ ] Rate limiting works with dynamic database settings
- [ ] Invalid sessions are rejected
- [ ] Sessions expire correctly

### Known Working (Previously Tested)
- ✅ Password change on Device B logs out Device A
- ✅ Forgot password flow logs out all devices
- ✅ Rate limits read from database settings

---

## Testing Status

**Date Started**: _____________

**Completed Tests**:
- [ ] Test 1: Multiple Sessions
- [ ] Test 2: Password Change Preserves Current
- [ ] Test 3: Forgot Password Logs Out All
- [ ] Test 4: OAuth Password Setting
- [ ] Test 5: Password Rate Limit
- [ ] Test 6: Login Rate Limit
- [ ] Test 7: Session Validation
- [ ] Test 8: Session Expiry
- [ ] Test 9: Concurrent Changes
- [ ] Test 10: Invalid Current Password

**Issues Found**: _____________

**Status**: 🟢 Ready / 🟡 Minor Issues / 🔴 Critical Issues

---

## After Testing

Once all tests pass:
1. [ ] Mark this file with final status
2. [ ] Move to next development phase
3. [ ] Archive old testing files

**Auth System Status**: Ready for Production ✅
