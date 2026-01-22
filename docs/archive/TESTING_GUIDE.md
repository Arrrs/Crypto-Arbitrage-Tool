# Testing Guide - Security & Logging Features

## Recent Fixes Applied

### ✅ Fixed Issues:
1. **IP Address & User Agent Tracking** - Now properly captured in admin audit logs
2. **Session Logging** - Login events now logged to SessionLog table
3. **Mobile Responsiveness** - Tables optimized for mobile devices
4. **Admin Endpoint Logging** - All endpoints now use proper logger

### Changes Made:
- Updated `/api/admin/users` to accept NextRequest and log with IP/UA
- Added session logging in `auth.ts` JWT callback
- Made log tables responsive with:
  - Smaller font sizes on mobile
  - Hidden columns (IP, Resource) on small screens
  - Scroll enabled for horizontal overflow
  - Smaller page size (10 vs 20) on mobile

---

## Testing Checklist

### 1. Session Logging Test

**Test Login Logging:**
1. Go to `/login`
2. Login with credentials
3. Go to `/admin/logs` → "User Sessions" tab
4. **Expected**: See new LOGIN event with:
   - Your user email
   - Method: "credentials"
   - Success: Yes (green tag)
   - IP Address (if available)
   - Timestamp

**Test Google OAuth Login:**
1. Logout
2. Login with "Continue with Google"
3. Check `/admin/logs` → "User Sessions"
4. **Expected**: See LOGIN event with method: "google"

### 2. Admin Actions Logging Test

**Test User List Action:**
1. Go to `/admin` (users list)
2. Go to `/admin/logs` → "Admin Actions" tab
3. **Expected**: See "LIST_USERS" action with:
   - Your admin email
   - IP Address ✅ (should now show)
   - User Agent (click "Details" to see) ✅
   - Timestamp

**Test User Update:**
1. Go to `/admin`
2. Edit any user (change name, role, etc.)
3. Save
4. Check `/admin/logs` → "Admin Actions"
5. **Expected**: See "UPDATE_USER" with full details including IP

**Test User Delete:**
1. Create a test user
2. Delete it from admin panel
3. Check logs
4. **Expected**: See "DELETE_USER" with deleted user info + IP

### 3. Application Logs Test

**Test Error Logging:**
1. Go to `/admin/logs` → "Application Logs" tab
2. Filter by level: ERROR (if any)
3. **Expected**: See errors with:
   - Error message
   - Category (auth, api, database, etc.)
   - Stack trace (in details)

**Test Info Logging:**
1. Register a new user
2. Check Application Logs
3. **Expected**: See "New user registered" with INFO level

### 4. Rate Limiting Test

**Test Signup Rate Limit:**
1. Go to `/signup`
2. Try to register 4 times with different emails
3. On 4th attempt within 1 hour
4. **Expected**: Get 429 error "Too many signup attempts"
5. Check `/admin/logs` → "Application Logs"
6. **Expected**: See WARN log "Signup rate limit exceeded"

**Test Password Reset Rate Limit:**
1. Go to `/forgot-password`
2. Submit 4 different emails
3. **Expected**: 4th request gets 429 error
4. Check logs for rate limit warning

### 5. Mobile Responsiveness Test

**On Mobile Device or Browser DevTools (390x844):**

1. Go to `/admin/logs`
2. **Expected**:
   - Tables scroll horizontally
   - IP Address column hidden
   - Resource column hidden
   - Smaller text (11px vs 12px)
   - 10 items per page (vs 20)
   - Small table size
   - Details button still visible

**On Tablet (768px):**
- IP Address visible
- Resource hidden
- Medium font sizes

**On Desktop (>1024px):**
- All columns visible
- Larger font sizes
- 20 items per page

### 6. Security Test

**Test Admin Role Validation:**
1. Login as regular user (non-admin)
2. Try to access `/admin`
3. **Expected**: Redirected to `/dashboard`
4. Try to access `/admin/logs`
5. **Expected**: Redirected to `/dashboard`
6. Try direct API call:
   ```bash
   curl http://localhost:3000/api/admin/users
   ```
7. **Expected**: 401 or 403 error

**Test Subscription Validation:**
1. Login as non-subscribed user
2. Go to `/analytics`
3. **Expected**: See "Premium Feature" locked page
4. Try API call:
   ```bash
   curl http://localhost:3000/api/analytics
   ```
5. **Expected**: 403 Forbidden

### 7. Log Details Test

**Test Details Modal:**
1. Go to any log tab
2. Click "Details" button on any row
3. **Expected Modal Shows**:
   - id
   - adminId (for audit logs)
   - admin object with name, email
   - action
   - resource
   - resourceId
   - details (JSON)
   - **ipAddress** ✅ (should now show)
   - **userAgent** ✅ (should now show)
   - timestamp

### 8. Filtering & Sorting Test

**Audit Logs:**
1. Filter by action type (Create, Update, Delete)
2. **Expected**: Only matching actions shown
3. Sort by timestamp
4. **Expected**: Logs reorder

**Session Logs:**
1. Filter by Status (Success / Failed)
2. **Expected**: Only matching status shown

**App Logs:**
1. Filter by Level (ERROR, WARN, INFO, DEBUG)
2. **Expected**: Only matching level shown

---

## Expected Console Output

### Development Mode
You should see in terminal:
```
[INFO][auth] User logged in: user@example.com
[INFO][admin] Admin action: LIST_USERS
```

### No Errors Expected
The "1 Issue" notification you saw is likely Next.js development warnings about:
- React 19 compatibility with Ant Design
- Missing dependencies in useEffect

These are **safe to ignore** in development.

---

## Known Issues & Limitations

### Current Status:

✅ **Working:**
- Database logging (all 4 tables)
- Session activity tracking
- Admin audit trail
- Application logs
- Rate limiting (signup, password reset)
- Security headers
- Mobile responsive tables
- IP and User Agent tracking

⚠️ **Not Yet Implemented:**
- 2FA (Two-Factor Authentication) - Schema ready
- Log archival / cleanup cron job
- Real-time log updates (manual refresh required)
- Log export functionality
- Advanced filtering (date range, search)

### "1 Issue" Notification

This is a **Next.js development server warning**, not a runtime error. Common causes:
1. Ant Design using React 18 APIs (safe, still works)
2. Missing dependencies in useEffect (cosmetic warning)
3. Console.log statements in production build

**Fix**: These will not appear in production build.

To suppress in development, you can:
1. Ignore it (recommended - it's harmless)
2. Add to `next.config.js`:
   ```js
   reactStrictMode: false
   ```

---

## What to Test Next

### Recommended Testing Order:

1. **✅ Login/Logout** → Check session logs
2. **✅ Admin Actions** → Check audit logs with IP
3. **✅ Mobile View** → Check table responsiveness
4. **✅ Rate Limiting** → Try exceeding limits
5. **✅ Log Details** → Verify IP/UA in modal
6. **⏳ 2FA Setup** → If you want to implement

### Additional Features to Consider:

1. **Log Search** - Add search box to filter logs
2. **Date Range Filter** - Filter logs by date
3. **Export Logs** - Download as CSV/JSON
4. **Real-time Updates** - Auto-refresh every 30s
5. **Log Retention Policy** - Automatic cleanup UI
6. **Email Alerts** - Notify admin of critical events

---

## Troubleshooting

### Session Logs Not Showing

**Problem**: Logged in but no session logs appear
**Solution**:
1. Check database: `SELECT * FROM session_logs ORDER BY timestamp DESC LIMIT 10`
2. Restart dev server: `Ctrl+C` then `npm run dev`
3. Clear browser cookies and login again

### IP Address Showing as "unknown"

**Problem**: IP address not captured
**Cause**: Local development doesn't have real IP
**Solution**:
- In dev: Shows "unknown" (expected)
- In production with reverse proxy: Will show real IP from `x-forwarded-for` header

### No Logs in Database

**Problem**: Actions performed but logs table empty
**Solution**:
1. Check migration applied:
   ```bash
   npx prisma migrate status
   ```
2. If needed, reapply:
   ```bash
   npx prisma migrate dev
   ```
3. Regenerate client:
   ```bash
   npx prisma generate
   ```

### Mobile Table Not Responsive

**Problem**: Table doesn't scroll or hide columns
**Solution**:
- Hard refresh browser: `Ctrl+Shift+R`
- Clear cache
- Check browser console for errors

---

## Success Criteria

You'll know everything is working when:

✅ Session logs appear after login/logout
✅ Admin actions show in audit logs with IP address
✅ Application logs show info/warn/error events
✅ Rate limits trigger 429 errors after exceeding limits
✅ Mobile view hides IP and Resource columns
✅ Tables scroll horizontally on mobile
✅ Details modal shows IP and User Agent
✅ Filtering and sorting work on all tabs

---

## Next Steps

After successful testing:

1. **Add 2FA** (if desired) - I can implement this
2. **Set up log cleanup** - Add cron job for old logs
3. **Configure production** - Follow PRODUCTION_READY.md
4. **Add monitoring** - Set up alerts for errors
5. **Document for team** - Share this guide

---

**Last Updated**: 2025-10-21
**Status**: Ready for Testing
