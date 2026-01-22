# Authentication Architecture

## Overview

This application uses a **hybrid authentication approach** that combines NextAuth.js for OAuth and session management with custom API endpoints for credentials-based authentication.

## Why Hybrid Approach?

### What NextAuth.js Handles
- ✅ OAuth providers (Google, GitHub, etc.)
- ✅ Session validation (`auth()` function)
- ✅ Database session storage (via Prisma adapter)
- ✅ Client-side `SessionProvider`

### What Custom Endpoints Handle
- ✅ Credentials login (`/api/auth/login`)
- ✅ 2FA verification flow
- ✅ Session metadata capture (IP, location, device)
- ✅ Rate limiting and security checks

### Rationale

**Why not use NextAuth's Credentials provider?**

1. **Next.js 15 Limitations**: Cannot access `headers()` in NextAuth adapter/authorize functions
2. **Metadata Capture**: Need to capture IP, location, device at login time
3. **2FA Requirements**: Session-level 2FA verification flags
4. **Fine-grained Control**: Custom rate limiting, logging, and security checks

This hybrid approach is **industry-standard** (used by Auth0, Firebase, Supabase) and provides the best of both worlds.

---

## Authentication Flows

### 1. Google OAuth Login (Standard NextAuth)

```
┌─────────┐                    ┌──────────────┐                 ┌─────────┐
│ Client  │                    │  NextAuth.js │                 │   DB    │
└────┬────┘                    └──────┬───────┘                 └────┬────┘
     │                                │                               │
     │  signIn("google")              │                               │
     ├───────────────────────────────>│                               │
     │                                │                               │
     │  Redirect to Google            │                               │
     │<───────────────────────────────┤                               │
     │                                │                               │
     │  User authorizes               │                               │
     │                                │                               │
     │  Callback with code            │                               │
     ├───────────────────────────────>│                               │
     │                                │  Create/Update User           │
     │                                ├──────────────────────────────>│
     │                                │                               │
     │                                │  Create Session               │
     │                                ├──────────────────────────────>│
     │                                │                               │
     │  Redirect to /profile          │                               │
     │<───────────────────────────────┤                               │
     │                                │                               │
```

**Key Files:**
- `auth.config.ts` - Google provider configuration
- `auth.ts` - NextAuth config with signIn callback for user creation

---

### 2. Credentials Login (No 2FA)

```
┌─────────┐                ┌─────────────────┐                 ┌─────────┐
│ Client  │                │ /api/auth/login │                 │   DB    │
└────┬────┘                └────────┬────────┘                 └────┬────┘
     │                              │                               │
     │  POST {email, password}      │                               │
     ├─────────────────────────────>│                               │
     │                              │  Validate credentials         │
     │                              ├──────────────────────────────>│
     │                              │                               │
     │                              │  Create session               │
     │                              │  twoFactorVerified: true      │
     │                              ├──────────────────────────────>│
     │                              │                               │
     │                              │  Set session cookie           │
     │  {success: true}             │                               │
     │<─────────────────────────────┤                               │
     │                              │                               │
     │  Redirect to /profile        │                               │
     │                              │                               │
```

**Key Files:**
- `app/api/auth/login/route.ts` - Credentials validation & session creation
- `app/login/page.tsx` - Login form

**Session Created:**
```javascript
{
  sessionToken: "random-hex-token",
  userId: "user-id",
  expires: Date(now + 30 days),
  twoFactorVerified: true,  // ✅ Fully authenticated
  // Metadata
  userAgent: "Mozilla/5.0...",
  ipAddress: "192.168.1.1",
  country: "United States",
  city: "New York"
}
```

---

### 3. Credentials Login (With 2FA) - INDUSTRY STANDARD FLOW

```
┌─────────┐       ┌─────────────────┐    ┌──────────────────┐    ┌─────────┐
│ Client  │       │ /api/auth/login │    │ /api/auth/       │    │   DB    │
│         │       │                 │    │ complete-2fa     │    │         │
└────┬────┘       └────────┬────────┘    └────────┬─────────┘    └────┬────┘
     │                     │                       │                   │
     │ POST {email, pwd}   │                       │                   │
     ├────────────────────>│                       │                   │
     │                     │ Validate credentials  │                   │
     │                     ├──────────────────────────────────────────>│
     │                     │                       │                   │
     │                     │ Create PARTIAL session│                   │
     │                     │ twoFactorVerified: false  (PENDING)       │
     │                     ├──────────────────────────────────────────>│
     │                     │                       │                   │
     │ {error: "2fa_required",                     │                   │
     │  sessionToken}      │                       │                   │
     │<────────────────────┤                       │                   │
     │                     │                       │                   │
     │ Redirect to /verify-2fa                     │                   │
     │ ?userId=...&sessionToken=...                │                   │
     │                     │                       │                   │
     │ User enters TOTP code                       │                   │
     │                     │                       │                   │
     │ POST /api/auth/verify-2fa                   │                   │
     │ {userId, code}      │                       │                   │
     ├─────────────────────┼───────────────────────┼──────────────────>│
     │                     │                       │ Verify TOTP       │
     │                     │                       │                   │
     │ {success: true}     │                       │                   │
     │<────────────────────┼───────────────────────┼───────────────────┤
     │                     │                       │                   │
     │ POST /api/auth/complete-2fa-login           │                   │
     │ {userId, sessionToken}                      │                   │
     ├─────────────────────┼──────────────────────>│                   │
     │                     │                       │ UPDATE session    │
     │                     │                       │ SET twoFactorVerified = true
     │                     │                       ├──────────────────>│
     │                     │                       │                   │
     │ {success: true}     │                       │                   │
     │<────────────────────┼───────────────────────┤                   │
     │                     │                       │                   │
     │ Redirect to /profile (FULLY AUTHENTICATED)  │                   │
     │                     │                       │                   │
```

**Key Insight: Session-Level 2FA Verification**

Instead of manipulating the user's `twoFactorEnabled` flag (security risk!), we use a **session-level flag**:

```javascript
// Initial login (2FA user)
Session {
  sessionToken: "abc123",
  userId: "user-id",
  twoFactorVerified: false  // ❌ Partial authentication
}

// After 2FA verification
Session {
  sessionToken: "abc123",
  userId: "user-id",
  twoFactorVerified: true   // ✅ Fully authenticated
}
```

**Key Files:**
- `app/api/auth/login/route.ts` - Creates partial session
- `app/verify-2fa/page.tsx` - 2FA verification UI
- `app/api/auth/verify-2fa/route.ts` - TOTP/backup code validation
- `app/api/auth/complete-2fa-login/route.ts` - Upgrades session to fully authenticated

**Why This Approach is Better:**

| Old (BROKEN) | New (CORRECT) |
|--------------|---------------|
| Temporarily disable `user.twoFactorEnabled` | Never touch user's 2FA settings |
| Race condition if server crashes | Idempotent, no side effects |
| Manual `signIn()` workaround | Direct session update |
| Security risk | Industry standard (Auth0, Okta) |

---

## Session Validation

### Protected API Routes

```typescript
import { auth } from "@/auth"

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Protected logic here
}
```

**How it works:**
1. `auth()` reads the session cookie
2. Validates token exists in database
3. Checks expiration
4. Returns user data or `null`

### Protected Pages (Client)

```typescript
"use client"
import { useSession } from "next-auth/react"

export default function ProtectedPage() {
  const { data: session, status } = useSession()

  if (status === "loading") return <Loading />
  if (!session) return <Redirect to="/login" />

  return <div>Protected content</div>
}
```

### Middleware (Edge Runtime)

**Limitation:** Cannot validate session in database (Edge Runtime)

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const sessionCookie = req.cookies.get("next-auth.session-token")
  const hasSessionCookie = !!sessionCookie

  // ONLY checks cookie existence, NOT validity
  // Actual validation happens in API routes via auth()

  if (hasSessionCookie && isAuthPage) {
    return NextResponse.redirect(new URL("/profile", req.url))
  }

  if (!hasSessionCookie && isProtectedPage) {
    return NextResponse.redirect(new URL("/login", req.url))
  }
}
```

**Why limited?**
- Edge Runtime cannot access database
- Session validation requires database lookup
- Middleware only does basic redirects
- Real protection happens in API routes

---

## Database Schema

### Session Model

```prisma
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id])

  // Session metadata (captured at login)
  userAgent    String?
  ipAddress    String?
  country      String?
  city         String?
  createdAt    DateTime @default(now())
  lastActive   DateTime @default(now())

  // 2FA verification status (session-level flag)
  twoFactorVerified Boolean @default(false)
}
```

**Key Points:**
- `twoFactorVerified` is session-specific, not user-specific
- Each login creates a new session
- Metadata captured once at login time
- `lastActive` updated on session refresh

---

## Configuration

### Environment Variables

```bash
# Session duration (configurable)
SESSION_MAX_AGE_DAYS="30"  # 1-365 days allowed
```

**Where it's used:**
- `auth.ts` - NextAuth session `maxAge`
- `app/api/auth/login/route.ts` - Session expiry calculation

**Validation:**
- `lib/env.ts` - Zod schema validates range and type

---

## Security Features

### 1. Rate Limiting
- **Location:** `lib/auth-rate-limit.ts`
- **Applied:** `/api/auth/login` (before validation)
- **Limits:** 5 attempts per 15 minutes (configurable)

### 2. Geolocation
- **Service:** ip-api.com (40 requests/min free tier)
- **Fallback:** Gracefully degrades if API fails
- **Rate limiting:** Implemented in `lib/geolocation-safe.ts`

### 3. Session Metadata
- **Captured:** User-agent, IP, country, city
- **Used for:** Active sessions management, security monitoring
- **Privacy:** Only captured on login, not tracked continuously

### 4. Email Verification
- **Required:** Before first login
- **Bypass:** Admin can manually verify
- **Table:** Uses NextAuth's `VerificationToken` model

### 5. 2FA (TOTP)
- **Algorithm:** HOTP (RFC 4226) / TOTP (RFC 6238)
- **Secret:** Stored encrypted in database
- **Backup codes:** 10 codes, hashed with bcrypt
- **QR Code:** Generated on setup, not stored

---

## File Structure

```
Authentication Files
├── auth.config.ts                  # NextAuth providers (Google only)
├── auth.ts                         # NextAuth configuration
├── middleware.ts                   # Basic session cookie checks
│
├── app/
│   ├── login/page.tsx             # Login form
│   ├── verify-2fa/page.tsx        # 2FA verification UI
│   │
│   └── api/auth/
│       ├── login/route.ts         # ⭐ Custom credentials endpoint
│       ├── verify-2fa/route.ts    # TOTP/backup code validation
│       ├── complete-2fa-login/    # ⭐ 2FA session upgrade
│       └── [...nextauth]/route.ts # NextAuth handler
│
├── lib/
│   ├── auth-rate-limit.ts         # Rate limiting logic
│   ├── geolocation-safe.ts        # IP → Location (with cache)
│   ├── logger.ts                  # Session activity logging
│   └── env.ts                     # Environment validation
│
└── prisma/
    └── schema.prisma              # Session, User models
```

---

## Common Operations

### Adding a New OAuth Provider

1. Add to `auth.config.ts`:
```typescript
import GitHub from "next-auth/providers/github"

export default {
  providers: [
    Google({...}),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
}
```

2. Add env variables to `.env` and `lib/env.ts`
3. Update `auth.ts` signIn callback if needed

### Changing Session Duration

Edit `.env`:
```bash
SESSION_MAX_AGE_DAYS="60"  # 60 days instead of 30
```

Restart server. Validation ensures 1-365 days range.

### Disabling Geolocation

In `app/api/auth/login/route.ts`, comment out geolocation call:
```typescript
// try {
//   const { getGeoLocationSafe } = await import("@/lib/geolocation-safe")
//   const geo = await getGeoLocationSafe(ipAddress || null)
//   country = geo.country || undefined
//   city = geo.city || undefined
// } catch (error) {
//   console.warn("[Login] Failed to get geolocation:", error)
// }
```

---

## Troubleshooting

### "Session not found" after login
- Check cookie name matches environment (`__Secure-` prefix in production)
- Verify database session was created
- Check session expiry date

### 2FA not working
- Verify `twoFactorEnabled` flag on user
- Check TOTP secret exists
- Ensure time sync (TOTP is time-based)

### Metadata shows "Unknown"
- Check geolocation API rate limits
- Verify `x-forwarded-for` or `x-real-ip` headers
- Check network allows ip-api.com requests

---

## Migration Notes (2025-11-21)

### What Changed

**Before:**
- Credentials provider in `auth.config.ts` (never used)
- 2FA disabled `user.twoFactorEnabled` temporarily (race condition)
- Password passed in URL to 2FA page (security risk)
- Duplicate validation in 3 places

**After:**
- Removed credentials provider (dead code)
- Session-level `twoFactorVerified` flag (safe)
- SessionToken passed to 2FA page (secure)
- Consolidated validation in `/api/auth/login`

### Breaking Changes
None - all changes backward compatible.

### Database Migration
Added `twoFactorVerified` column to `Session` table (defaults to `false`).

---

## Further Reading

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [RFC 6238: TOTP](https://tools.ietf.org/html/rfc6238)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
