# Geolocation Optimization - On-Demand Lookups

## Problem

**Original Implementation**:
- Geolocation API called automatically on **every login/logout** (session logs)
- Geolocation API called automatically on **every admin action** (audit logs)
- Even with 24-hour caching, this quickly exhausts free API quotas
- ip-api.com: 45 requests/minute, limited monthly quota for free tier

**Cost Analysis**:
- 100 logins/day = 100 API calls
- 50 admin actions/day = 50 API calls
- **Total: 150 calls/day = 4,500 calls/month**
- This would exceed most free tiers quickly

## Solution Implemented

### Changed to **On-Demand Geolocation**

**Benefits**:
1. **Zero automatic API calls** - No lookups unless explicitly requested
2. **Persistent data** - Once looked up, stored in database forever
3. **Batch-friendly** - Can lookup multiple IPs for same location
4. **Investigative workflow** - Lookup only suspicious IPs when investigating incidents
5. **Unlimited retention** - Geolocation data never expires once fetched

## Changes Made

### 1. Removed Automatic Lookups

**File**: [/lib/logger.ts](../lib/logger.ts)

**Before**:
```typescript
if (ipAddress) {
  const geo = await getGeoLocation(ipAddress)  // ❌ Called every time
  country = geo.country
  city = geo.city
}
```

**After**:
```typescript
if (ipAddress) {
  // Note: Geolocation is NOT fetched automatically to save API quota
  // Admin can lookup geolocation on-demand via the UI
}
```

**Impact**:
- Session logs: IP stored, country/city = null initially
- Audit logs: IP stored, country/city = null initially
- **API calls: 0 per log event** (was 1 per event)

---

### 2. Created On-Demand Lookup API

**File**: [/app/api/admin/logs/geolocation/route.ts](../app/api/admin/logs/geolocation/route.ts) ✨ NEW

**Endpoint**: `POST /api/admin/logs/geolocation`

**Request Body**:
```json
{
  "ipAddress": "192.168.1.100",
  "logType": "session"  // or "audit"
}
```

**Response**:
```json
{
  "success": true,
  "ipAddress": "192.168.1.100",
  "country": "United States",
  "city": "New York",
  "updatedCount": 15,
  "message": "Updated 15 log(s) with geolocation data"
}
```

**Features**:
- Calls `getGeoLocation()` for the IP
- Updates **ALL** logs with that IP address
- Updates both session_logs and audit_logs tables
- Only updates rows where `country IS NULL` (doesn't overwrite existing data)
- Returns count of updated records

**Smart Batching**:
```typescript
// If IP 192.168.1.100 appears in 15 different log entries:
// ✅ 1 API call
// ✅ 15 database rows updated
// ✅ Future lookups for same IP: instant (already in DB)
```

---

### 3. Added Lookup Button to Logs UI

**File**: [/app/admin/logs/page.tsx](../app/admin/logs/page.tsx)

**UI Changes**:

**Audit Logs Table** (line 450-478):
```typescript
{
  title: "IP Address",
  render: (ip: string | null, record: any) => (
    <Flex vertical gap={2}>
      <Flex align="center" gap={4}>
        <Text code>{ip || "unknown"}</Text>
        {ip && !record.country && (
          <Button
            type="link"
            size="small"
            icon={<EnvironmentOutlined />}
            loading={lookingUpGeo === ip}
            onClick={() => lookupGeolocation(ip, "audit")}
            title="Lookup location"
          />
        )}
      </Flex>
      {(record.city || record.country) && (
        <Text type="secondary">
          {[record.city, record.country].filter(Boolean).join(", ")}
        </Text>
      )}
    </Flex>
  ),
}
```

**Session Logs Table** (line 576-604):
- Same button implementation for session logs

**Button Behavior**:
- **Shows**: Only when IP exists AND country is null (no geolocation yet)
- **Hides**: After successful lookup (has geolocation data)
- **Loading state**: Shows spinner while looking up
- **Icon**: 🌍 Environment icon
- **Size**: Small, minimal, doesn't clutter UI

**Lookup Function** (line 221-244):
```typescript
const lookupGeolocation = async (ipAddress: string, logType: "audit" | "session") => {
  setLookingUpGeo(ipAddress)
  try {
    const res = await fetch("/api/admin/logs/geolocation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ipAddress, logType }),
    })

    if (res.ok) {
      // Refresh the log list to show updated geolocation
      if (logType === "audit") {
        fetchAuditLogs(false)  // No loading spinner
      } else {
        fetchSessionLogs(false)
      }
    }
  } finally {
    setLookingUpGeo(null)
  }
}
```

---

### 4. Updated Settings UI

**File**: [/app/admin/settings/page.tsx](../app/admin/settings/page.tsx)

**Removed**:
- ❌ "IP Geolocation" toggle (was in Feature Flags)
- ❌ `geolocation` from features save function
- ❌ `geolocation` from features load function

**Added**:
- ✅ Info alert explaining new on-demand approach

**Feature Flags Section**:
```typescript
<Alert
  message="Geolocation Feature"
  description="IP geolocation is now on-demand to save API quota. Use the lookup button next to IP addresses in logs to fetch location data only when needed."
  type="info"
  showIcon
  style={{ marginBottom: 16 }}
/>

<Form>
  {/* Telegram Alerts toggle */}
  {/* Email Alerts toggle */}
  {/* No geolocation toggle anymore */}
</Form>
```

---

### 5. Geolocation Library (Unchanged)

**File**: [/lib/geolocation.ts](../lib/geolocation.ts)

**Still provides**:
- `getGeoLocation(ip)` - Lookup function with caching
- `getClientIP(request)` - Extract IP from request
- `clearOldGeoCache()` - Memory management
- 24-hour in-memory cache for repeat lookups
- Handles local IPs (127.0.0.1, 192.168.x.x, etc.)
- 5-second timeout for API calls
- Graceful error handling

**Cache behavior**:
```typescript
// First lookup: API call
await getGeoLocation("8.8.8.8")  // → API call

// Within 24 hours: cached
await getGeoLocation("8.8.8.8")  // → instant, from cache

// After lookup via UI: database
// Future page loads show data immediately (from database)
```

---

## Usage Workflow

### Scenario 1: Normal Operations

```
User logs in → IP stored (e.g., 192.168.1.50)
└─ Country/City: null
└─ No API call
└─ Admin sees IP in logs
```

**Cost**: 0 API calls per login

---

### Scenario 2: Investigating Suspicious Activity

```
Admin notices failed logins from unknown IP
└─ Goes to /admin/logs
└─ Sees IP: 203.0.113.42 (no location)
└─ Clicks 🌍 button
    └─ API call to ip-api.com
    └─ Returns: "China, Beijing"
    └─ Updates all 23 log entries with that IP
    └─ Button disappears (has location now)
```

**Cost**: 1 API call for 23 log entries

---

### Scenario 3: Security Audit

```
Admin wants to see locations for all recent logins
└─ Filters logs by last 7 days
└─ Sees 10 unique IPs without location
└─ Clicks 🌍 on each IP (one by one)
    └─ 10 API calls total
    └─ Updates hundreds of log entries
└─ Future audits: all data already available
```

**Cost**: 10 API calls (one-time), permanent data

---

## API Quota Management

### Free Tier Limits

**ip-api.com** (current provider):
- **Rate limit**: 45 requests/minute
- **Monthly limit**: Not officially documented, but reasonable use is free
- **No API key required**

### Quota Conservation Strategy

| Scenario | Old Approach | New Approach | Savings |
|----------|--------------|--------------|---------|
| 100 logins/day | 100 API calls | 0 API calls | **100%** |
| 50 admin actions/day | 50 API calls | 0 API calls | **100%** |
| Investigate 5 IPs | 5 API calls | 5 API calls | 0% |
| **Monthly Total** | **4,500 calls** | **~150 calls** | **97%** |

### Estimated Monthly Usage

**Realistic scenario**:
- Normal operations: 0 calls/day
- Security investigations: 5 calls/day (average)
- Bulk audits: 50 calls/month (one-time)

**Total**: ~200 calls/month (vs 4,500 previously)

**Well within free tier!** 🎉

---

## Database Schema

**Session Logs**:
```sql
CREATE TABLE session_logs (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  event TEXT NOT NULL,  -- LOGIN, LOGOUT, etc.
  ipAddress TEXT,       -- Always stored
  country TEXT,         -- NULL until lookup
  city TEXT,            -- NULL until lookup
  userAgent TEXT,
  success BOOLEAN,
  timestamp TIMESTAMP
);
```

**Audit Logs**:
```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  adminId TEXT NOT NULL,
  action TEXT NOT NULL,
  ipAddress TEXT,       -- Always stored
  country TEXT,         -- NULL until lookup
  city TEXT,            -- NULL until lookup
  userAgent TEXT,
  severity TEXT,
  timestamp TIMESTAMP
);
```

**Geolocation Flow**:
1. Log created with IP address
2. `country` and `city` = `null` initially
3. Admin clicks lookup button
4. API fetches geo data
5. Database updates `country` and `city` for all matching IPs
6. UI refreshes, shows location, hides button

---

## Technical Details

### Caching Strategy

**Three-tier caching**:

1. **Memory Cache** (24 hours):
   - In-app `Map<ip, {data, timestamp}>`
   - Prevents duplicate API calls within same instance
   - Clears on app restart

2. **Database Cache** (permanent):
   - Once looked up, stored in `country`/`city` columns
   - Never expires
   - Shared across all app instances

3. **API Calls** (as needed):
   - Only when no memory cache AND no database data
   - Rate limited by ip-api.com (45/min)
   - 5-second timeout

### Error Handling

```typescript
try {
  const geo = await getGeoLocation(ip)
  // Update database
} catch (error) {
  // ✅ Graceful: Returns null values
  // ✅ Doesn't block log creation
  // ✅ User can retry later
  console.error("Geolocation lookup failed:", error)
  return { country: null, city: null }
}
```

---

## Migration Path

### For Existing Logs

**All existing logs have `country = null`**:

```sql
-- Check how many logs need geolocation
SELECT COUNT(*) FROM session_logs WHERE ipAddress IS NOT NULL AND country IS NULL;
SELECT COUNT(*) FROM audit_logs WHERE ipAddress IS NOT NULL AND country IS NULL;
```

**Options**:

1. **Do Nothing** (recommended):
   - Let admins lookup on-demand as needed
   - Only investigative-worthy IPs get looked up
   - Saves maximum API quota

2. **Batch Lookup Unique IPs**:
   ```sql
   SELECT DISTINCT ipAddress FROM session_logs WHERE country IS NULL;
   ```
   - Manually lookup top 50 IPs
   - Updates thousands of log entries
   - Good for security audit

3. **Automated Nightly Script**:
   - Cron job: lookup top 10 new IPs per day
   - Gradual backfill over time
   - Balances quota and data completeness

---

## Future Improvements

### 1. Bulk Lookup UI

Add "Lookup All Visible" button:
```typescript
const lookupAllVisibleIPs = async () => {
  const uniqueIPs = [...new Set(
    auditLogs
      .filter(log => log.ipAddress && !log.country)
      .map(log => log.ipAddress)
  )]

  for (const ip of uniqueIPs) {
    await lookupGeolocation(ip, "audit")
    await sleep(1500)  // Rate limit: 45/min = 1.33s delay
  }
}
```

### 2. Alternative Providers

If ip-api.com becomes limited, switch to:

**ipapi.co** (free):
- 1,000 requests/day free
- No API key needed
- Endpoint: `https://ipapi.co/{ip}/json/`

**ipgeolocation.io** (free):
- 30,000 requests/month free
- Requires API key
- More detailed data (timezone, currency, etc.)

### 3. Geolocation Map View

Add visual map showing:
- Failed login locations
- Admin action origins
- Suspicious IP clusters

Uses already-looked-up data, no additional API calls.

### 4. Smart Prioritization

Auto-suggest lookups for:
- Failed login attempts (security relevant)
- Admin actions from new IPs
- IPs with multiple events

---

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **API Calls** | Every log event | On-demand only |
| **Monthly Quota** | ~4,500 calls | ~150-200 calls |
| **Quota Savings** | 0% | **97%** |
| **Data Retention** | 24h cache | Permanent in DB |
| **User Control** | Automatic | Manual (better privacy) |
| **Investigation Workflow** | Data already there | Fetch when needed |
| **Cost** | May exceed free tier | Well within free tier |
| **Performance** | Slight delay on logs | No delay (async lookup) |
| **Privacy** | Tracks everyone | Track only suspicious |

---

## Testing

### Test the Lookup Feature

1. **Create Test Logs**:
   ```bash
   # Make some failed login attempts
   # Or perform admin actions
   ```

2. **View Logs**:
   ```
   Go to /admin/logs
   Switch to "Session Logs" or "Audit Logs" tab
   ```

3. **Lookup Location**:
   ```
   Find IP without location (no country/city shown)
   Click 🌍 button next to IP
   Wait 1-2 seconds
   Location appears below IP
   Button disappears
   ```

4. **Verify Database**:
   ```sql
   SELECT ipAddress, country, city FROM session_logs WHERE ipAddress = '...';
   ```

### Test Rate Limiting

Try looking up 50 IPs quickly:
- Should handle 45/min limit
- No errors or failures
- Graceful handling

---

## Conclusion

The geolocation feature is now:
- ✅ **Opt-in** - No automatic lookups
- ✅ **Quota-friendly** - 97% reduction in API calls
- ✅ **Permanent data** - Once looked up, stored forever
- ✅ **User-controlled** - Admin decides what to lookup
- ✅ **Privacy-conscious** - Only investigate suspicious activity
- ✅ **Cost-effective** - Stays within free tiers
- ✅ **Scalable** - Works for 1,000s of users

Perfect for security investigations without wasting API quota on routine logins!
