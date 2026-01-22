# Complete Testing Checklist - CSRF Protection & System Functionality

## Purpose
Comprehensive testing plan to verify CSRF protection is working correctly across all pages and that all functionality remains operational after the security implementation.

---

## Test Environment Setup

### Prerequisites
- [ ] Server running: `npm run dev`
- [ ] Database running and accessible
- [ ] At least 3 test users created:
  - Admin user (with password)
  - Regular user (with password)
  - Paid user (with subscription)
  - OAuth user (Google sign-in)

### Test Accounts Required
```
Admin: admin@test.com / password123
User: user@test.com / password123
Paid User: paid@test.com / password123 (set paidUntil to future date)
OAuth User: Sign up with Google
```

---

## 1. Authentication & Session Tests

### 1.1 User Registration
- [ ] Navigate to `/signup`
- [ ] Fill in name, email, password
- [ ] Submit form
- [ ] **Expected**: User created, verification email sent
- [ ] **CSRF**: No 403 errors during registration

### 1.2 Email Verification
- [ ] Check terminal/logs for verification link
- [ ] Click verification link
- [ ] **Expected**: Email verified successfully
- [ ] Try using old verification link again
- [ ] **Expected**: Link expired/invalid message

### 1.3 User Login (Password)
- [ ] Navigate to `/login`
- [ ] Enter email and password
- [ ] Submit form
- [ ] **Expected**: Redirected to `/profile`
- [ ] **CSRF**: No errors during login

### 1.4 User Login (OAuth - Google)
- [ ] Click "Sign in with Google"
- [ ] Complete Google OAuth flow
- [ ] **Expected**: Redirected to `/profile`
- [ ] **CSRF**: No errors during OAuth

### 1.5 User Logout
- [ ] Click logout button
- [ ] **Expected**: Redirected to `/login`
- [ ] Try accessing `/profile`
- [ ] **Expected**: Redirected back to `/login`

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

## 4. Admin - User Management Tests

### 4.1 Access User Management
- [ ] Login as admin user
- [ ] Navigate to `/admin/users`
- [ ] **Expected**: User list displayed
- [ ] **CSRF**: GET `/api/admin/users` should have `x-csrf-token` in response

### 4.2 Create New User
- [ ] Click "Create User" button
- [ ] Fill in form:
  - Name: "Test User"
  - Email: "newuser@test.com"
  - Password: "password123"
  - Role: USER
  - Admin Verified: true
  - Paid Until: (future date)
- [ ] Click "Create"
- [ ] **Expected**: User created successfully
- [ ] **CSRF**: POST `/api/admin/users/create` should have CSRF token
- [ ] Check user appears in list

### 4.3 Edit User
- [ ] Click "Edit" on any user
- [ ] Change role to ADMIN
- [ ] Toggle "Email Verified" on
- [ ] Toggle "Admin Verified" on
- [ ] Set "Subscription Expiry" to future date
- [ ] **Expected**: "Paid Status" automatically becomes true
- [ ] Click "Update"
- [ ] **Expected**: User updated successfully
- [ ] **CSRF**: PATCH `/api/admin/users/[id]/update` should have CSRF token
- [ ] Verify changes in user list

### 4.4 Delete User Avatar
- [ ] Click "Edit" on user with avatar
- [ ] Click "Delete Avatar" button
- [ ] Confirm in popup
- [ ] **Expected**: Avatar deleted
- [ ] **CSRF**: DELETE `/api/admin/users/[id]/avatar` should have CSRF token

### 4.5 Delete User
- [ ] Click "Delete" on a test user
- [ ] Confirm in popup
- [ ] **Expected**: User deleted successfully
- [ ] **CSRF**: DELETE `/api/admin/users/[id]` should have CSRF token
- [ ] Verify user removed from list
- [ ] Try to delete yourself (admin)
- [ ] **Expected**: Delete button disabled

### 4.6 User Filters (Tabs)
- [ ] Click "All Users" tab
- [ ] **Expected**: All users shown
- [ ] Click "Paid" tab
- [ ] **Expected**: Only paid users shown (with crown icon)
- [ ] Click "Free" tab
- [ ] **Expected**: Only free users shown

### 4.7 Pagination (if > 10 users)
- [ ] Check pagination controls at bottom
- [ ] Change page size
- [ ] Navigate to next page
- [ ] **Expected**: Different users shown

---

## 5. Admin - Cron Jobs Tests

### 5.1 View Cron Jobs
- [ ] Navigate to `/admin/cron`
- [ ] **Expected**: List of cron jobs displayed
- [ ] **CSRF**: GET `/api/admin/cron` should have `x-csrf-token` in response

### 5.2 Enable/Disable Cron Job
- [ ] Toggle a job OFF
- [ ] **Expected**: "Job disabled" message
- [ ] **CSRF**: PATCH `/api/admin/cron` should have CSRF token
- [ ] Toggle same job ON
- [ ] **Expected**: "Job enabled" message
- [ ] **CSRF**: PATCH request should have CSRF token

### 5.3 Execute Cron Job Manually
- [ ] Click "Run Now" (play icon) on any job
- [ ] **Expected**: "Job is running..." message
- [ ] **CSRF**: POST `/api/admin/cron/[id]/execute` should have CSRF token
- [ ] Wait 2 seconds
- [ ] **Expected**: Page refreshes, new execution appears in "Last Status"
- [ ] Check execution status (Success/Failed)

### 5.4 Edit Cron Schedule
- [ ] Click "Edit" (pencil icon) on a job
- [ ] Change schedule (e.g., from "0 0 * * *" to "0 1 * * *")
- [ ] Change description
- [ ] Click "Update"
- [ ] **Expected**: Job updated successfully
- [ ] **CSRF**: PATCH `/api/admin/cron` should have CSRF token
- [ ] Verify changes in job list

### 5.5 View Execution History
- [ ] Click "View History" on a job with executions
- [ ] **Expected**: Modal shows recent executions
- [ ] Check execution details (status, duration, output, error)

---

## 6. Admin - Alerts Tests

### 6.1 View Alerts
- [ ] Navigate to `/admin/alerts`
- [ ] **Expected**: Alert rules list displayed
- [ ] **CSRF**: GET `/api/admin/alerts` should have `x-csrf-token` in response

### 6.2 Enable/Disable Alert
- [ ] Toggle alert ON/OFF
- [ ] **Expected**: Alert status changed
- [ ] **CSRF**: PATCH `/api/admin/alerts/[id]` should have CSRF token

### 6.3 Test Alert (Send Notification)
- [ ] First ensure Telegram/Email configured in Settings
- [ ] Click "Test" button on an alert
- [ ] **Expected**: "Test notification sent!" message
- [ ] **CSRF**: POST `/api/admin/alerts/[id]/test` should have CSRF token
- [ ] Check Telegram/Email for test message

### 6.4 View Alert Trigger History
- [ ] Click "History" on an alert
- [ ] **Expected**: Modal shows past triggers
- [ ] Check trigger details (timestamp, message, sent status)

### 6.5 Delete Alert
- [ ] Click "Delete" on an alert
- [ ] Confirm in popup
- [ ] **Expected**: Alert deleted
- [ ] **CSRF**: DELETE `/api/admin/alerts/[id]` should have CSRF token
- [ ] Verify alert removed from list

---

## 7. Admin - Logs Tests

### 7.1 View Audit Logs
- [ ] Navigate to `/admin/logs`
- [ ] Click "Audit Logs" tab
- [ ] **Expected**: Admin actions displayed
- [ ] **CSRF**: GET `/api/admin/logs/audit` should have `x-csrf-token` in response
- [ ] Check columns: Admin, Action, Resource, IP Address, Timestamp

### 7.2 Search Audit Logs
- [ ] Enter search term (e.g., "DELETE")
- [ ] **Expected**: Filtered results after 500ms delay
- [ ] Clear search
- [ ] **Expected**: All logs shown again

### 7.3 Load More Audit Logs
- [ ] Scroll to bottom
- [ ] Click "Load More" button
- [ ] **Expected**: More logs loaded

### 7.4 View Audit Log Details
- [ ] Click "View Details" on any log entry
- [ ] **Expected**: Modal shows full details (metadata, user agent, etc.)

### 7.5 Geolocation Lookup (Audit)
- [ ] Find log with IP address
- [ ] Click "Lookup" button
- [ ] **Expected**: Geolocation fetched and displayed
- [ ] **CSRF**: POST `/api/admin/logs/geolocation` should have CSRF token

### 7.6 View Session Logs
- [ ] Click "Session Logs" tab
- [ ] **Expected**: Login/logout events displayed
- [ ] Check columns: User, Event, Method, IP, Success/Fail
- [ ] Repeat search and geolocation tests

### 7.7 View Application Logs
- [ ] Click "Application Logs" tab
- [ ] **Expected**: System logs displayed
- [ ] Check columns: Level, Message, Category, Timestamp
- [ ] Repeat search test

### 7.8 Export Logs
- [ ] Click "Export" button
- [ ] Select log type (Audit/Session/App)
- [ ] Select format (CSV/JSON)
- [ ] Click "Export"
- [ ] **Expected**: File downloads
- [ ] **CSRF**: POST `/api/admin/logs/export` should have CSRF token
- [ ] Open file and verify data

---

## 8. Admin - System Settings Tests

### 8.1 Telegram Configuration
- [ ] Navigate to `/admin/settings`
- [ ] Expand "Telegram Notifications" section
- [ ] Fill in:
  - Bot Token: (your Telegram bot token)
  - Chat ID: (your Telegram chat ID)
- [ ] Toggle "Enabled" ON
- [ ] Click "Save Configuration"
- [ ] **Expected**: Success message
- [ ] **CSRF**: PUT `/api/admin/settings` should have CSRF token

### 8.2 Test Telegram
- [ ] Click "Test Configuration" button
- [ ] **Expected**: "Test message sent successfully!" message
- [ ] **CSRF**: POST `/api/admin/settings/telegram/test` should have CSRF token
- [ ] Check Telegram for test message

### 8.3 SMTP/Email Configuration
- [ ] Expand "SMTP/Email Settings" section
- [ ] Fill in:
  - Host: smtp.gmail.com
  - Port: 587
  - Secure: true
  - Auth: password
  - User: your-email@gmail.com
  - Password: (app password)
  - From: your-email@gmail.com
- [ ] Toggle "Enabled" ON
- [ ] Click "Save SMTP Configuration"
- [ ] **Expected**: Success message
- [ ] **CSRF**: PUT `/api/admin/settings` should have CSRF token

### 8.4 Test SMTP
- [ ] Click "Test SMTP" button
- [ ] **Expected**: Success message
- [ ] **CSRF**: POST `/api/admin/settings/smtp/test` should have CSRF token
- [ ] Check email inbox for test message

### 8.5 Log Retention Policy
- [ ] Expand "Log Retention Policy" section
- [ ] Change retention days:
  - Audit Logs: 90 days
  - Session Logs: 60 days
  - Application Logs: 30 days
- [ ] Click "Save Policy"
- [ ] **Expected**: Success message
- [ ] **CSRF**: PUT `/api/admin/settings` should have CSRF token

### 8.6 Feature Flags
- [ ] Expand "Feature Flags" section
- [ ] Toggle features ON/OFF:
  - Allow Registration
  - Allow OAuth Login
  - Require Email Verification
  - Enable 2FA
- [ ] Click "Save Features"
- [ ] **Expected**: Success message
- [ ] **CSRF**: PUT `/api/admin/settings` should have CSRF token

### 8.7 System Limits
- [ ] Expand "System Limits" section
- [ ] Change values:
  - Max File Upload: 10 MB
  - Max Avatar Size: 5 MB
  - Rate Limit: 60 per minute
  - Max Login Attempts: 5
- [ ] Click "Save Limits"
- [ ] **Expected**: Success message
- [ ] **CSRF**: PUT `/api/admin/settings` should have CSRF token

### 8.8 Analytics Settings
- [ ] Expand "Analytics Configuration" section
- [ ] Toggle tracking options
- [ ] Adjust sampling rate and batch size
- [ ] Click "Save Analytics Settings"
- [ ] **Expected**: Success message, cache cleared
- [ ] **CSRF**: PUT `/api/admin/analytics/settings` should have CSRF token

---

## 9. Admin - Analytics Tests

### 9.1 View Dashboard
- [ ] Navigate to `/admin/analytics`
- [ ] **Expected**: Analytics dashboard loads
- [ ] Check overview metrics (users, sessions, page views)

### 9.2 Date Range Filter
- [ ] Change date range (Last 7 days, 30 days, custom)
- [ ] **Expected**: Charts update with filtered data

### 9.3 User Activity Chart
- [ ] View "User Activity" chart
- [ ] **Expected**: Line graph showing activity over time
- [ ] Hover over data points
- [ ] **Expected**: Tooltips show values

### 9.4 Page Views Chart
- [ ] View "Page Views" chart
- [ ] **Expected**: Bar chart or similar showing top pages

### 9.5 Device & Browser Stats
- [ ] View device breakdown
- [ ] **Expected**: Pie chart showing desktop/mobile/tablet
- [ ] View browser stats
- [ ] **Expected**: Chart showing browser distribution

### 9.6 Subscription Metrics (if available)
- [ ] View subscription data
- [ ] **Expected**: Charts showing paid vs free users over time

---

## 10. Paid User Tests

### 10.1 Verify Paid Status
- [ ] Login as paid user (paidUntil > today)
- [ ] Check if crown icon appears
- [ ] **Expected**: Premium features accessible

### 10.2 Subscription Expiry
- [ ] As admin, change user's paidUntil to yesterday
- [ ] Logout and login as that user
- [ ] **Expected**: isPaid automatically becomes false
- [ ] Premium features should be restricted

### 10.3 Renew Subscription
- [ ] As admin, set paidUntil to future date again
- [ ] **Expected**: isPaid automatically becomes true
- [ ] Premium features restored

---

## 11. Error Handling & Security Tests

### 11.1 CSRF Protection - Missing Token
- [ ] Open browser DevTools
- [ ] Go to Network tab
- [ ] Make a mutation request (e.g., update profile)
- [ ] Before sending, remove `x-csrf-token` header using interceptor or modify request
- [ ] **Expected**: 403 Forbidden error
- [ ] **Expected**: Error message: "Invalid CSRF token"

### 11.2 CSRF Protection - Invalid Token
- [ ] Modify CSRF token to wrong value
- [ ] Make mutation request
- [ ] **Expected**: 403 Forbidden error

### 11.3 Session Expiry
- [ ] Login
- [ ] Wait for session to expire (or manually delete session cookie)
- [ ] Try making a request
- [ ] **Expected**: Redirected to login

### 11.4 Unauthorized Access
- [ ] Logout
- [ ] Try accessing `/admin/users` directly
- [ ] **Expected**: Redirected to login
- [ ] Login as regular user
- [ ] Try accessing `/admin/users`
- [ ] **Expected**: Redirected to `/profile` or 403 error

### 11.5 SQL Injection Attempt
- [ ] Try entering SQL in form fields: `' OR '1'='1`
- [ ] **Expected**: Treated as literal string, not executed

### 11.6 XSS Attempt
- [ ] Try entering script in name: `<script>alert('XSS')</script>`
- [ ] **Expected**: Escaped/sanitized, not executed

### 11.7 File Upload Security
- [ ] Try uploading non-image file as avatar
- [ ] **Expected**: Rejected with error
- [ ] Try uploading huge file (>5MB)
- [ ] **Expected**: Rejected with size error

---

## 12. Performance & Load Tests

### 12.1 Page Load Times
- [ ] Open DevTools Performance tab
- [ ] Record page load for main pages
- [ ] **Expected**: < 3 seconds for initial load
- [ ] Check Lighthouse score
- [ ] **Expected**: Performance > 70

### 12.2 API Response Times
- [ ] Check Network tab for API requests
- [ ] **Expected**: Most APIs < 500ms
- [ ] Database queries optimized (check console for query logs)

### 12.3 Token Reuse (No Rotation Issues)
- [ ] Make GET request to get token
- [ ] Make multiple mutations with same token
- [ ] **Expected**: All succeed (token reused correctly)
- [ ] Refresh page
- [ ] **Expected**: Same token returned

---

## 13. Mobile Responsiveness Tests

### 13.1 Mobile View
- [ ] Open DevTools
- [ ] Toggle device toolbar (mobile view)
- [ ] Navigate through all pages
- [ ] **Expected**: Responsive layout, no horizontal scroll
- [ ] Test all forms and buttons
- [ ] **Expected**: Touch-friendly, proper spacing

### 13.2 Tablet View
- [ ] Switch to tablet view
- [ ] Navigate through pages
- [ ] **Expected**: Adaptive layout for medium screens

---

## 14. Browser Compatibility Tests

### 14.1 Test in Different Browsers
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest, if available)
- [ ] **Expected**: Consistent behavior across all browsers

### 14.2 Private/Incognito Mode
- [ ] Open in incognito/private mode
- [ ] Complete full user flow
- [ ] **Expected**: Everything works (no localStorage issues)

---

## 15. Database Integrity Tests

### 15.1 Check Relationships
- [ ] Create user with avatar
- [ ] Delete user
- [ ] **Expected**: Avatar file cleaned up (cascade delete)

### 15.2 Check Constraints
- [ ] Try creating user with duplicate email
- [ ] **Expected**: Error message
- [ ] Try invalid data types
- [ ] **Expected**: Validation errors

---

## Critical Issues Checklist

### High Priority - Must Fix Before Production
- [ ] No CSRF 403 errors on any mutation
- [ ] All admin endpoints require authentication
- [ ] Session management works correctly
- [ ] Password reset flow secure
- [ ] File uploads validated and sanitized
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities

### Medium Priority - Should Fix Soon
- [ ] Error messages user-friendly
- [ ] Loading states shown properly
- [ ] Form validation comprehensive
- [ ] Pagination works on all lists
- [ ] Search/filter functions work

### Low Priority - Nice to Have
- [ ] Animations smooth
- [ ] UI/UX polished
- [ ] Tooltips helpful
- [ ] Accessibility features (ARIA labels, keyboard nav)

---

## Testing Notes Template

Use this template to record your findings:

```
## Test Session: [Date]
**Tester**: [Your Name]
**Environment**: Development
**Browser**: Chrome 120

### Bugs Found:
1. [Page/Feature] - [Description] - Priority: High/Medium/Low
2. ...

### Passed Tests:
- Authentication ✅
- Profile Management ✅
- ...

### Failed Tests:
- [Test Name] - [Reason] - [Screenshots/Error logs]

### CSRF Status:
- All user endpoints: ✅ No 403 errors
- All admin endpoints: ✅ No 403 errors
- Token extraction: ✅ Working
- Token validation: ✅ Working
```

---

## Final Verification

After completing all tests:

- [ ] All CSRF-protected endpoints working
- [ ] No security vulnerabilities found
- [ ] All features functional
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Mobile responsive
- [ ] Cross-browser compatible

**System Status**: ✅ Ready for Production / ⚠️ Needs Fixes / ❌ Critical Issues

---

## Additional Resources

- **API Documentation**: Check `/api/` folder for endpoint details
- **Database Schema**: See `prisma/schema.prisma`
- **CSRF Implementation**: See `lib/csrf.ts`
- **Logger**: Check `lib/logger.ts` for log details

---

Good luck with testing! 🚀
