# CSRF Security Fixes - Mass Update

**Date**: November 2, 2025
**Issue**: 14 API routes missing CSRF protection on mutations
**Severity**: HIGH - Security vulnerability
**Status**: 🔧 In Progress

---

## Security Issue Found

Comprehensive audit revealed **14 routes** accepting POST/PUT/PATCH/DELETE requests without CSRF token validation.

### Why This is Dangerous

Without CSRF protection, an attacker could:
1. Create malicious website with form/JavaScript
2. User visits attacker's site while logged into your app
3. Attacker's code makes requests to your API using user's session
4. Requests succeed because only session cookie is checked, no CSRF token

**Example Attack**:
```html
<!-- Attacker's malicious site -->
<form action="https://yourapp.com/api/admin/users/123/route" method="POST">
  <input name="role" value="ADMIN">
</form>
<script>document.forms[0].submit()</script>
```

If user is logged in, this would work WITHOUT CSRF protection!

---

## Routes Requiring Fixes

### Admin Routes (8 routes)

1. `/api/admin/cron/route.ts` - PATCH (update cron job)
2. `/api/admin/cron/[id]/execute/route.ts` - POST (execute cron manually)
3. `/api/admin/logs/export/route.ts` - POST (export logs)
4. `/api/admin/logs/geolocation/route.ts` - POST (geocode IP)
5. `/api/admin/settings/smtp/test/route.ts` - POST (test SMTP)
6. `/api/admin/settings/telegram/test/route.ts` - POST (test Telegram)
7. `/api/admin/users/[id]/route.ts` - PATCH, DELETE (update/delete user)
8. `/api/admin/users/[id]/avatar/route.ts` - DELETE (delete avatar)

### User Routes (6 routes)

1. `/api/user/profile/route.ts` - PATCH (update profile)
2. `/api/user/password/route.ts` - POST (change password)
3. `/api/user/avatar/route.ts` - POST, DELETE (upload/delete avatar)
4. `/api/user/2fa/setup/route.ts` - POST (enable 2FA)
5. `/api/user/2fa/verify/route.ts` - POST (verify 2FA code)
6. `/api/user/2fa/disable/route.ts` - POST (disable 2FA)
7. `/api/user/2fa/regenerate-backup-codes/route.ts` - POST (regen codes)

---

## Fix Pattern

### For Admin Routes (using `requireAdmin()`)

**Before (Vulnerable)**:
```typescript
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()

  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  // ... business logic
}
```

**After (Protected)**:
```typescript
import { validateCsrfToken } from "@/lib/csrf"

export async function POST(request: NextRequest) {
  // 1. CSRF validation FIRST
  const csrfError = await validateCsrfToken(request)
  if (csrfError) return csrfError

  // 2. Auth check SECOND
  const authResult = await requireAdmin()

  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  // 3. Business logic LAST
}
```

### For User Routes (using `await auth()`)

**Before (Vulnerable)**:
```typescript
export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ... business logic
}
```

**After (Protected)**:
```typescript
import { validateCsrfToken } from "@/lib/csrf"

export async function POST(request: NextRequest) {
  // 1. CSRF validation FIRST
  const csrfError = await validateCsrfToken(request)
  if (csrfError) return csrfError

  // 2. Auth check SECOND
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 3. Business logic LAST
}
```

---

## Impact Assessment

### Routes That Need Frontend Updates

Some routes are called from frontend and will need the CSRF token passed.

**Admin pages** (these pages load GET endpoints that set CSRF tokens):
- `/admin/cron` - Already loads GET /api/admin/cron (has setCsrfTokenCookie)
- `/admin/logs` - GET endpoints set tokens
- `/admin/users` - GET /api/admin/users sets token
- `/admin/settings` - Already fixed ✅

**User pages**:
- `/profile` - GET /api/user/profile needs setCsrfTokenCookie added
- `/profile/edit` - Same
- `/user/2fa` - Needs CSRF token handling

### Routes That Don't Need Frontend Updates

"Test" endpoints that are called with test buttons:
- `/api/admin/settings/smtp/test` - Called from settings page (already has token)
- `/api/admin/settings/telegram/test` - Called from settings page (already has token)

---

## Implementation Plan

### Phase 1: Add CSRF Validation (Backend)
1. Add `validateCsrfToken()` to all 14 mutation endpoints
2. Add imports for `validateCsrfToken`
3. Test each endpoint returns 403 without token

### Phase 2: Add Token Setting (Backend)
1. Add `setCsrfTokenCookie()` to GET endpoints that precede mutations
2. Pass `request` parameter to reuse existing tokens
3. Ensure all admin/user pages have GET endpoints with tokens

### Phase 3: Update Frontend
1. Extract CSRF tokens from GET responses
2. Include tokens in mutation requests
3. Add error handling for 403 (refresh token)

### Phase 4: Testing
1. Test each mutation with and without token
2. Verify 403 when token missing
3. Verify 200 when token present
4. Test multiple mutations on same page

---

## Priority Order

### Critical (Fix Immediately)
1. Admin user management (delete user, update role)
2. User password change
3. 2FA disable (security critical)

### High
4. Cron job execution
5. User profile updates
6. Avatar upload/delete

### Medium
7. Log export
8. Geolocation lookup
9. Test endpoints (SMTP, Telegram)

---

## Automated Fix Script

I can create a script to automatically add CSRF validation to all routes.

Would you like me to:
1. **Auto-fix all 14 routes** (recommended)
2. **Fix critical routes only** (safer, test first)
3. **Show me each fix for review** (slowest, most control)

---

## Testing Checklist

After fixes applied:

### Backend Tests
- [ ] POST without token → 403
- [ ] POST with wrong token → 403
- [ ] POST with correct token → 200
- [ ] Verify error message includes "CSRF"

### Frontend Tests
- [ ] Verify GET endpoints set token
- [ ] Verify mutations send token
- [ ] Test multiple mutations on same page
- [ ] Test token refresh on 403

### Integration Tests
- [ ] Login → Navigate to page → Mutation (should work)
- [ ] Mutation → Another mutation (token reused)
- [ ] Wait 24h → Mutation (token expired, should fail gracefully)

---

## Next Steps

**Recommendation**: Let me auto-fix all 14 routes now.

This will:
1. Add CSRF validation to all mutation endpoints
2. Maintain correct order (CSRF → Auth → Logic)
3. Add necessary imports
4. Be consistent across all routes

**Estimated time**: 10 minutes to fix all routes

**Risk**: Low - only adding validation, not changing logic

Shall I proceed with automatic fixes?
