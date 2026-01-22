# Analytics Admin Page - Visual Guide

## 📍 How to Access

### Option 1: Direct URL
```
http://localhost:3000/admin/analytics
```

### Option 2: Via Sidebar Navigation
1. **Log in as admin user**
2. **Open sidebar** (click hamburger menu icon ☰)
3. **Scroll to Admin section** (you'll see it after Dashboard)
4. **Click "Analytics"** (has a line chart icon 📊)

**Sidebar Menu Order**:
```
🏠 Home
📊 Dashboard
📈 Analytics (user-facing)
👑 Pricing

Admin Section (only visible if you're ADMIN):
👥 Users
📝 Logs
⏰ Cron Jobs
🔔 Alerts
📊 Analytics ← NEW! Click here
⚙️ Settings
```

---

## 🎨 What the Page Should Look Like

### Page Structure

```
┌────────────────────────────────────────────────────────────┐
│  Analytics Settings                                        │
│  Configure what data to track and how long to retain it.  │
│  All tracking is optional and performance-optimized.      │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  🟢 Settings saved successfully! Cache cleared.            │  ← Success message (shows after save)
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  📊 Tracking Features                                      │
│  ──────────────────────────────────────────────────────── │
│                                                            │
│  Track Page Views                              [ON] ●─────│
│  Record when users visit different pages                  │
│                                                            │
│  Track User Activity                           [ON] ●─────│
│  Log user actions and interactions                        │
│                                                            │
│  Track Device Info                             [ON] ●─────│
│  Detect browser, device type, and OS                      │
│                                                            │
│  Track Geolocation                             [ON] ●─────│
│  Record user country and city                             │
│                                                            │
│  Track Subscription Events                     [ON] ●─────│
│  Log payment events and plan changes                      │
│                                                            │
│  Track Performance            ⚠️ Performance Impact        │
│  Measure API response times (expensive)        [OFF] ─────●│
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  ⚡ Performance Settings                                   │
│  ──────────────────────────────────────────────────────── │
│                                                            │
│  Sampling Rate                                     100%   │
│  ●──────────────────────────────────────────────────────● │
│  Track 100% of events. Lower values reduce database load. │
│                                                            │
│  Batch Size                                      [ 100 ]  │
│  Number of events to batch before inserting               │
│                                                            │
│  Async Tracking (Recommended)      ✅ Recommended          │
│  Track events in the background                [ON] ●─────│
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  💾 Data Retention                                         │
│  ──────────────────────────────────────────────────────── │
│                                                            │
│  Raw Data Retention (Days)                     [ 90 ]     │
│  Detailed activity logs. Default: 90 days.                │
│                                                            │
│  Aggregated Data Retention (Days)              [ 365 ]    │
│  Daily/hourly summaries. Default: 365 days.               │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  ℹ️ How Analytics Works                                    │
│  ──────────────────────────────────────────────────────── │
│  • Automatic Aggregation: Raw data compressed nightly     │
│  • Automatic Cleanup: Old data deleted per retention      │
│  • Performance: All tracking is async and non-blocking    │
│  • Privacy: IP-based geolocation only                     │
│  • Metabase Ready: All data queryable via SQL             │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  🕐 Scheduled Cron Jobs                                    │
│  ──────────────────────────────────────────────────────── │
│  Daily Stats: 1:00 AM - Aggregate yesterday's data        │
│  Hourly Stats: Every hour at :05 - Recent metrics         │
│  Feature Usage: 2:00 AM - Aggregate feature data          │
│  Cleanup: 3:00 AM - Delete old data                       │
│                                                            │
│  Manage cron jobs in Admin → Cron Jobs                    │
└────────────────────────────────────────────────────────────┘

──────────────────────────────────────────────────────────────
Last updated: Oct 29, 2025, 1:40 PM      [ Save Settings ]
──────────────────────────────────────────────────────────────
```

---

## 🔧 Interactive Elements

### Toggle Switches
Each feature has a toggle that looks like:
```
[ON]  ●─────  (blue background, dot on right)
[OFF] ─────●  (gray background, dot on left)
```

Click the toggle to enable/disable that feature.

### Sampling Rate Slider
```
1% ●──────────────────────────────────────● 100%
```
- Drag the dot left/right
- Current value shown on the right (e.g., "100%")
- Default: 100% (track all events)
- Lower = less database usage

### Number Inputs
```
Raw Data Retention (Days)    [ 90 ]
                              ↑ Type here
```
- Click to edit
- Type new number
- Valid ranges shown in help text

### Save Button
```
[ Save Settings ]
```
- Click to save all changes
- Shows success message
- Clears settings cache
- Button is blue, changes to "Saving..." while processing

---

## 🎬 What Happens When You Use It

### Initial Load
1. Page fetches current settings from `/api/admin/analytics/settings`
2. All toggles set to their saved state
3. Slider and inputs show current values

### Making Changes
1. Toggle switches respond immediately (but don't save yet)
2. Slider updates value display as you drag
3. Number inputs update on type
4. Nothing is saved until you click "Save Settings"

### Saving
1. Click "Save Settings" button
2. Button text changes to "Saving..."
3. API call to `/api/admin/analytics/settings` (PUT)
4. Green success message appears
5. Settings cache is cleared (new settings take effect immediately)
6. Button returns to "Save Settings"

---

## 🐛 Troubleshooting

### Page is Blank or Only Shows Slider
**Problem**: Page didn't load properly

**Solution**:
1. Check browser console (F12) for errors
2. Make sure you're logged in as ADMIN
3. Try refreshing the page (Ctrl+R)
4. Check if API is responding:
   ```bash
   curl http://localhost:3000/api/admin/analytics/settings
   ```

### "Failed to load settings" Error
**Problem**: Can't fetch settings from database

**Solutions**:
1. **Initialize settings**:
   ```bash
   npx tsx scripts/init-analytics-crons.ts
   ```
2. **Verify database**:
   ```bash
   docker exec postgres psql -U postgres -d webapp_dev1 -c "SELECT * FROM analytics_settings;"
   ```

### Not Seeing Admin Menu
**Problem**: You're not logged in as admin

**Solutions**:
1. **Check your role**:
   ```bash
   docker exec postgres psql -U postgres -d webapp_dev1 -c "SELECT email, role FROM users WHERE email = 'your-email@example.com';"
   ```

2. **Promote yourself to admin**:
   ```bash
   docker exec postgres psql -U postgres -d webapp_dev1 -c "UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';"
   ```

3. **Log out and log back in** for role change to take effect

### Can't Find Analytics Link
**Solution**: I just added it! Restart your dev server:
```bash
# Stop current server (Ctrl+C)
npm run dev
```

The "Analytics" link will now appear in the admin section of the sidebar.

---

## 📊 What Each Setting Does

### Track Page Views
- **ON**: Records every page visit with timestamp, path, device info
- **OFF**: No page view tracking
- **Use case**: Traffic analysis, popular pages

### Track User Activity
- **ON**: Logs clicks, form submissions, feature usage
- **OFF**: No activity tracking
- **Use case**: User behavior analysis, feature adoption

### Track Device Info
- **ON**: Detects browser, device type (mobile/desktop/tablet), OS
- **OFF**: Saves raw user-agent string only
- **Use case**: Browser testing priorities, responsive design decisions

### Track Geolocation
- **ON**: IP-based country and city detection
- **OFF**: No location data
- **Use case**: Localization, timezone considerations

### Track Subscription Events
- **ON**: Logs payments, upgrades, downgrades, cancellations
- **OFF**: No subscription tracking
- **Use case**: Revenue analysis, churn tracking

### Track Performance
- **ON**: Measures API response times, page load durations
- **OFF**: No performance tracking
- **Use case**: Performance optimization (more expensive!)
- **⚠️ Warning**: Adds overhead to requests

### Sampling Rate
- **100%**: Track every single event
- **50%**: Track half of events (randomly selected)
- **10%**: Track 10% of events
- **Use case**: Reduce database load while maintaining statistical accuracy

### Async Tracking
- **ON** (Recommended): Tracking happens in background, doesn't slow down API
- **OFF**: Tracking blocks until complete (not recommended)

### Raw Data Retention
- **90 days** (default): Detailed event logs kept for 3 months
- **Higher**: More historical detail, more storage
- **Lower**: Less storage, less detail

### Aggregated Data Retention
- **365 days** (default): Daily/hourly summaries kept for 1 year
- **Use case**: Long-term trends without massive storage

---

## ✅ After Saving Settings

Your changes take effect **immediately** because:
1. Settings are saved to database
2. Settings cache is cleared
3. Next analytics event uses new settings

**No restart required!**

---

## 🔗 Related Pages

After configuring analytics, you can:
1. **Generate test data**: `npx tsx scripts/generate-test-analytics-data.ts`
2. **View in Metabase**: Use queries from `/metabase/queries/`
3. **Check cron jobs**: Visit `/admin/cron` to see analytics jobs
4. **View raw data**: Use Prisma Studio: `npx prisma studio`

---

**The Analytics page is your control center for all analytics tracking!**
