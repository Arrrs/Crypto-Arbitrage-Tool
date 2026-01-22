# Analytics Tracking Examples

Quick reference for adding analytics tracking to your routes.

---

## Basic Import Pattern

```typescript
import { trackActivity, trackPageView, trackFeatureUse } from "@/lib/analytics"
import { getGeoLocation } from "@/lib/geolocation"
```

---

## Common Patterns

### 1. Track Page View

Use this for any GET request that displays a page.

```typescript
export async function GET(request: NextRequest) {
  const session = await auth()

  // Extract request info
  const userAgent = request.headers.get("user-agent")
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
             request.headers.get("x-real-ip")
  const geo = await getGeoLocation(ip)

  // Track page view
  await trackPageView({
    userId: session.user.id,
    path: "/your-page-path",
    userAgent,
    ipAddress: ip,
    country: geo.country,
    city: geo.city,
  })

  // Your route logic...
  return NextResponse.json({ data: "..." })
}
```

### 2. Track Feature Usage

Use this for POST/PATCH requests where users take actions.

```typescript
export async function POST(request: NextRequest) {
  const session = await auth()

  // Your route logic...
  const result = await doSomething()

  // Track feature usage
  await trackFeatureUse({
    userId: session.user.id,
    featureName: "Feature_Name", // Use snake_case or PascalCase
    action: "ACTION_TYPE", // e.g., "CREATED", "UPDATED", "DELETED"
    metadata: {
      // Any additional context
      itemType: "example",
      success: true,
    },
  })

  return NextResponse.json({ success: true })
}
```

### 3. Track with Duration

Track how long an operation takes.

```typescript
export async function POST(request: NextRequest) {
  const session = await auth()
  const startTime = Date.now()

  // Your route logic...
  const result = await expensiveOperation()

  const duration = Date.now() - startTime

  // Track with duration
  await trackActivity({
    userId: session.user.id,
    activity: "FEATURE_USE",
    resource: "Expensive_Operation",
    action: "EXECUTED",
    duration, // milliseconds
    metadata: { success: true },
  })

  return NextResponse.json({ result })
}
```

### 4. Track Subscription Changes

```typescript
import { trackSubscriptionChange } from "@/lib/analytics"

export async function POST(request: NextRequest) {
  const session = await auth()

  // Handle payment/subscription logic...
  const payment = await processPayment()

  // Track subscription change
  await trackSubscriptionChange({
    userId: session.user.id,
    changeType: "UPGRADE", // UPGRADE, DOWNGRADE, CANCEL, RENEW, TRIAL_START, etc.
    fromStatus: "free",
    toStatus: "paid",
    fromPlan: null,
    toPlan: "pro",
    amount: 29.99,
    currency: "USD",
    paymentMethod: "card",
    transactionId: payment.id,
    reason: "User upgrade via checkout",
    metadata: { source: "web" },
  })

  return NextResponse.json({ success: true })
}
```

### 5. Track with Full Details

Maximum detail tracking (for important events).

```typescript
export async function POST(request: NextRequest) {
  const session = await auth()
  const startTime = Date.now()

  // Extract all request info
  const userAgent = request.headers.get("user-agent")
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]
  const geo = await getGeoLocation(ip)

  // Your route logic...
  const result = await importantOperation()

  // Track with all details
  await trackActivity({
    userId: session.user.id,
    activity: "FEATURE_USE",
    resource: "Important_Operation",
    action: "COMPLETED",
    metadata: {
      result: result.id,
      itemCount: result.items.length,
      success: true,
    },
    duration: Date.now() - startTime,
    userAgent,
    ipAddress: ip,
    country: geo.country,
    city: geo.city,
  })

  return NextResponse.json({ result })
}
```

---

## Real-World Examples

### Dashboard View

```typescript
// app/api/dashboard/route.ts
export async function GET(request: NextRequest) {
  const session = await auth()

  const userAgent = request.headers.get("user-agent")
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]
  const geo = await getGeoLocation(ip)

  await trackPageView({
    userId: session.user.id,
    path: "/dashboard",
    userAgent,
    ipAddress: ip,
    country: geo.country,
    city: geo.city,
  })

  const data = await getDashboardData(session.user.id)
  return NextResponse.json(data)
}
```

### 2FA Setup

```typescript
// app/api/user/2fa/enable/route.ts
export async function POST(request: NextRequest) {
  const session = await auth()

  // Enable 2FA logic...
  await enable2FA(session.user.id)

  await trackFeatureUse({
    userId: session.user.id,
    featureName: "2FA_Setup",
    action: "ENABLED",
    metadata: { method: "TOTP" },
  })

  return NextResponse.json({ success: true })
}
```

### Avatar Upload

```typescript
// app/api/user/avatar/route.ts
export async function POST(request: NextRequest) {
  const session = await auth()

  // Upload avatar logic...
  const avatarUrl = await uploadAvatar(file)

  await trackFeatureUse({
    userId: session.user.id,
    featureName: "Avatar_Upload",
    action: "UPLOADED",
    metadata: {
      fileSize: file.size,
      mimeType: file.type,
    },
  })

  return NextResponse.json({ avatarUrl })
}
```

### Login (Credentials Provider)

Add to your auth callback:

```typescript
// auth.ts (in callbacks)
callbacks: {
  async signIn({ user, account }) {
    if (account?.provider === "credentials") {
      // Track login
      await trackFeatureUse({
        userId: user.id,
        featureName: "Login",
        action: "CREDENTIALS",
      })
    }
    return true
  }
}
```

### Admin Action

```typescript
// app/api/admin/users/[id]/update/route.ts
export async function PATCH(request: NextRequest) {
  const session = await auth()

  // Admin updates user...
  await updateUser(userId, data)

  await trackActivity({
    userId: session.user.id, // Admin's ID
    activity: "ADMIN_ACTION",
    resource: "User_Management",
    action: "UPDATED",
    metadata: {
      targetUserId: userId,
      changes: data,
    },
  })

  return NextResponse.json({ success: true })
}
```

---

## Best Practices

### ✅ DO

1. **Track at the API level** (server-side), not client-side
2. **Use descriptive names**: `Feature_Name` not `feat1`
3. **Include metadata** for context
4. **Track important user actions**: signups, logins, purchases, key features
5. **Use consistent naming**: `PascalCase` for features, `UPPER_CASE` for actions

### ❌ DON'T

1. **Don't track sensitive data** (passwords, tokens, credit cards)
2. **Don't track every single action** (track meaningful events only)
3. **Don't block on tracking** (always use async, it's the default)
4. **Don't track in middleware** (too many events, performance impact)
5. **Don't duplicate tracking** (one event per action)

---

## Activity Types

Use these standard activity types for consistency:

| Activity | Use Case |
|----------|----------|
| `PAGE_VIEW` | User views a page |
| `FEATURE_USE` | User uses a feature (most common) |
| `BUTTON_CLICK` | Specific button tracking |
| `FORM_SUBMIT` | Form submission |
| `ADMIN_ACTION` | Admin panel actions |
| `API_CALL` | External API usage |
| `ERROR` | Error occurred (auto-tracked by logger) |

---

## Action Types

Common action types:

| Action | Meaning |
|--------|---------|
| `VIEW` | Viewed something |
| `CREATE` | Created new item |
| `UPDATE` | Updated existing item |
| `DELETE` | Deleted item |
| `ENABLE` | Enabled a feature |
| `DISABLE` | Disabled a feature |
| `UPLOAD` | Uploaded file |
| `DOWNLOAD` | Downloaded file |
| `SEND` | Sent message/email |
| `CLICK` | Clicked button |
| `SUBMIT` | Submitted form |

---

## Feature Name Conventions

Use clear, hierarchical names:

```
Good:
- "2FA_Setup"
- "Profile_Update"
- "Avatar_Upload"
- "Password_Reset"
- "Dashboard_View"
- "Admin_User_Create"

Avoid:
- "feature1"
- "click"
- "update"
- "action"
```

---

## Geolocation Helper

Reusable function for getting IP and location:

```typescript
async function getRequestInfo(request: NextRequest) {
  const userAgent = request.headers.get("user-agent")
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
             request.headers.get("x-real-ip")
  const geo = await getGeoLocation(ip)

  return {
    userAgent,
    ipAddress: ip,
    country: geo.country,
    city: geo.city,
  }
}

// Usage:
const info = await getRequestInfo(request)
await trackPageView({
  userId: session.user.id,
  path: "/page",
  ...info,
})
```

---

## Performance Considerations

### When to Use Full Tracking

Use full tracking (device info, geolocation) for:
- Page views (understand traffic sources)
- Login/signup (security, demographics)
- Important feature usage (adoption analysis)

### When to Use Minimal Tracking

Use minimal tracking (just userId + feature name) for:
- Frequent actions (avoid DB load)
- Internal features (less important)
- High-traffic endpoints

Example:
```typescript
// Minimal tracking (fast)
await trackFeatureUse({
  userId: session.user.id,
  featureName: "Quick_Action",
  action: "CLICKED",
})

// No geolocation, no device parsing, no IP
```

---

## Testing Your Tracking

### 1. Check if Events Are Logged

```sql
SELECT * FROM "UserActivityLog"
WHERE "userId" = 'your_user_id'
ORDER BY timestamp DESC
LIMIT 10;
```

### 2. Check Feature Usage

```sql
SELECT "featureName", COUNT(*) as count
FROM "UserActivityLog"
WHERE activity = 'FEATURE_USE'
GROUP BY "featureName"
ORDER BY count DESC;
```

### 3. Check if Settings Work

Toggle tracking off in `/admin/analytics`, then perform an action.
Verify no new entries in `UserActivityLog`.

---

## Summary

**Basic Pattern:**
```typescript
import { trackPageView, trackFeatureUse } from "@/lib/analytics"
import { getGeoLocation } from "@/lib/geolocation"

// For GET (page view)
await trackPageView({
  userId: session.user.id,
  path: "/page",
  userAgent,
  ipAddress: ip,
  country: geo.country,
  city: geo.city,
})

// For POST (feature usage)
await trackFeatureUse({
  userId: session.user.id,
  featureName: "Feature_Name",
  action: "ACTION",
  metadata: { /* context */ },
})
```

That's it! Simple, non-blocking, and powerful.

---

**Need Help?** Check:
- `lib/analytics.ts` - All tracking functions
- `docs/ANALYTICS_SYSTEM_COMPLETE.md` - Complete API reference
- `docs/METABASE_SQL_QUERIES.md` - Query your tracked data
