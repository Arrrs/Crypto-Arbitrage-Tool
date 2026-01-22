# Metabase Dashboard Links - Dynamic Configuration

## Overview
Admins can now dynamically configure Metabase dashboard links directly from the Analytics Settings page. These links appear as clickable cards on the Admin Analytics dashboard.

## Features

✅ **Dynamic Configuration** - Add/remove dashboard links without code changes
✅ **Custom Titles & Descriptions** - Personalize each dashboard link
✅ **Click to Open** - Cards open dashboards in new tab
✅ **Mobile Responsive** - Grid layout adapts to screen size
✅ **Validation** - URL and title validation built-in

---

## How to Configure Dashboard Links

### 1. Navigate to Settings
Go to: **Admin → Settings → Analytics Settings**

### 2. Scroll to "Metabase Dashboards" Section
Located at the bottom of the Analytics Settings collapse section.

### 3. Click "Add Dashboard Link"
A new card will appear with three fields:
- **Dashboard Title** (required)
- **Description** (optional)
- **Metabase URL** (required, must be valid URL)

### 4. Fill in Dashboard Details

**Example 1: User Analytics**
```
Title: User Analytics Dashboard
Description: View user growth, engagement metrics, and retention analysis
URL: https://metabase.yourdomain.com/dashboard/1
```

**Example 2: Revenue Dashboard**
```
Title: Revenue & Subscriptions
Description: Track subscription revenue, conversion rates, and payment metrics
URL: https://metabase.yourdomain.com/dashboard/2
```

**Example 3: Device Analytics**
```
Title: Device & Browser Stats
Description: Analyze user devices, browsers, and operating systems
URL: https://metabase.yourdomain.com/dashboard/3
```

### 5. Add More Dashboards
Click "Add Dashboard Link" to add additional dashboards.
You can add as many as needed.

### 6. Remove Dashboards
Click the "Remove" button in the card header to delete a dashboard link.

### 7. Save Settings
Click "Save Analytics Settings" at the bottom to save all changes.

---

## How Dashboard Links Appear

### On Analytics Page (`/admin/analytics`)

**When Dashboards Are Configured:**
```
┌─────────────────────────────────────────┐
│ 📊 Metabase Analytics Dashboards        │
│ Access detailed analytics...            │
├─────────────────────────────────────────┤
│ ──────────── Dashboards ────────────── │
├─────────────────────────────────────────┤
│ ┌──────┐  ┌──────┐  ┌──────┐           │
│ │ User │  │ Rev  │  │Device│           │
│ │Analyt│  │& Sub │  │Stats │           │
│ │  📤  │  │  📤  │  │  📤  │           │
│ └──────┘  └──────┘  └──────┘           │
└─────────────────────────────────────────┘
```

**When No Dashboards Configured:**
```
┌─────────────────────────────────────────┐
│ ℹ️ No Dashboards Configured             │
│ Add Metabase dashboard links in         │
│ Settings to display them here.          │
│ [Go to Settings]                        │
└─────────────────────────────────────────┘
```

### Dashboard Card Layout

Each dashboard appears as a hoverable card:
```
┌────────────────────────────┐
│ 📤 User Analytics Dashboard│  ← Title with icon
│ View user growth,          │  ← Description
│ engagement metrics, and... │
└────────────────────────────┘
```

**Responsive Grid:**
- **Mobile (< 576px):** 1 column (full width)
- **Tablet (576-768px):** 2 columns
- **Desktop (> 768px):** 3 columns

---

## Database Schema

### Table: `analytics_settings`
```sql
Column: metabaseDashboards
Type: JSONB
Default: []
Format: Array of objects
```

### JSON Structure
```json
{
  "metabaseDashboards": [
    {
      "title": "User Analytics Dashboard",
      "description": "View user growth, engagement metrics, and retention analysis",
      "url": "https://metabase.yourdomain.com/dashboard/1"
    },
    {
      "title": "Revenue & Subscriptions",
      "description": "Track subscription revenue and conversion rates",
      "url": "https://metabase.yourdomain.com/dashboard/2"
    }
  ]
}
```

---

## Files Modified

### 1. Database Schema
**File:** `prisma/schema.prisma`
```prisma
model AnalyticsSettings {
  // ... existing fields
  metabaseDashboards Json? @default("[]")
}
```

### 2. Migration
**File:** `prisma/migrations/20251029225458_add_metabase_dashboards/migration.sql`
```sql
ALTER TABLE "analytics_settings"
ADD COLUMN "metabaseDashboards" JSONB DEFAULT '[]';
```

### 3. Analytics Settings API
**File:** `app/api/admin/analytics/settings/route.ts`

**Updated to handle:**
- GET: Returns `metabaseDashboards` field
- PUT: Saves `metabaseDashboards` array

### 4. Settings Page UI
**File:** `app/admin/settings/page.tsx`

**Added:**
- Form.List for dynamic dashboard management
- Input fields for title, description, URL
- Add/Remove buttons
- URL validation

### 5. Analytics Dashboard Page
**File:** `app/admin/analytics/page.tsx`

**Added:**
- Loads dashboards from settings API
- Displays dashboard cards in responsive grid
- Click handler to open dashboard in new tab
- Empty state with "Go to Settings" button

---

## Example Usage

### Scenario: Setting Up 3 Dashboards

1. **Navigate to Settings:**
   - http://localhost:3000/admin/settings
   - Expand "📊 Analytics Settings"
   - Scroll to "Metabase Dashboards" section

2. **Add First Dashboard:**
   ```
   Title: User Growth & Engagement
   Description: Daily/weekly/monthly active users, new signups, churn rate
   URL: http://localhost:3001/dashboard/1
   ```
   Click "Add Dashboard Link"

3. **Add Second Dashboard:**
   ```
   Title: Device & Geographic Analytics
   Description: Mobile vs desktop usage, browser distribution, user locations
   URL: http://localhost:3001/dashboard/2
   ```
   Click "Add Dashboard Link"

4. **Add Third Dashboard:**
   ```
   Title: Revenue Metrics
   Description: Subscription revenue, conversion funnels, payment success rates
   URL: http://localhost:3001/dashboard/3
   ```

5. **Save:** Click "Save Analytics Settings"

6. **View Results:**
   - Navigate to http://localhost:3000/admin/analytics
   - See 3 dashboard cards displayed in a grid
   - Click any card to open that dashboard

---

## Technical Implementation

### Loading Dashboards

**In `app/admin/analytics/page.tsx`:**
```typescript
const [dashboards, setDashboards] = useState<MetabaseDashboard[]>([])

const loadStats = async () => {
  // ... load stats

  // Load analytics settings (for dashboard links)
  const settingsRes = await fetch("/api/admin/analytics/settings")
  if (settingsRes.ok) {
    const settingsData = await settingsRes.json()
    setDashboards(settingsData.metabaseDashboards || [])
  }
}
```

### Displaying Dashboards

**Responsive Grid:**
```typescript
<Row gutter={[16, 16]}>
  {dashboards.map((dashboard, index) => (
    <Col xs={24} sm={12} md={8} key={index}>
      <Card
        hoverable
        onClick={() => window.open(dashboard.url, "_blank")}
        style={{ height: "100%", cursor: "pointer" }}
      >
        {/* Dashboard content */}
      </Card>
    </Col>
  ))}
</Row>
```

### Managing Dashboards in Settings

**Using Form.List:**
```typescript
<Form.List name="metabaseDashboards">
  {(fields, { add, remove }) => (
    <>
      {fields.map((field) => (
        <Card key={field.key}>
          <Form.Item name={[field.name, "title"]} />
          <Form.Item name={[field.name, "description"]} />
          <Form.Item name={[field.name, "url"]} />
        </Card>
      ))}
      <Button onClick={() => add()}>Add Dashboard Link</Button>
    </>
  )}
</Form.List>
```

---

## Validation Rules

### Dashboard Title
- **Required:** Yes
- **Type:** String
- **Max Length:** No limit (reasonable)
- **Example:** "User Analytics Dashboard"

### Description
- **Required:** No
- **Type:** String (multiline)
- **Max Length:** No limit
- **Example:** "View user growth, engagement metrics, and retention analysis"

### URL
- **Required:** Yes
- **Type:** Valid URL
- **Validation:** Must start with http:// or https://
- **Example:** "https://metabase.yourdomain.com/dashboard/1"

---

## Benefits

### For Admins:
✅ No code changes needed to add dashboards
✅ Self-service dashboard management
✅ Customize titles and descriptions
✅ Add/remove dashboards anytime
✅ Changes take effect immediately

### For Users:
✅ Clean, organized dashboard access
✅ Clear descriptions of what each dashboard shows
✅ One-click access to detailed analytics
✅ Mobile-friendly layout

### For Developers:
✅ Dynamic, database-driven configuration
✅ No hardcoded dashboard URLs
✅ Easy to extend with more fields
✅ Follows existing settings pattern

---

## Migration from Old System

### Before (Hardcoded):
```typescript
// Had to edit code to change Metabase URL
const metabaseUrl = "http://localhost:3001"
```

### After (Dynamic):
```typescript
// Admins configure multiple dashboards in Settings UI
// No code changes needed
```

---

## Troubleshooting

### Dashboards Don't Appear on Analytics Page

**Check:**
1. Are dashboards saved in Settings?
2. Run migration: `npx prisma migrate deploy`
3. Check browser console for errors
4. Verify API endpoint: `GET /api/admin/analytics/settings`

### Can't Add Dashboard Link

**Check:**
1. URL must be valid (http:// or https://)
2. Title is required
3. Check browser console for validation errors

### Dashboard Opens Wrong URL

**Fix:**
1. Go to Settings → Analytics Settings
2. Edit the dashboard URL
3. Save settings
4. Refresh Analytics page

### Empty State Shows When Dashboards Exist

**Debug:**
1. Check `metabaseDashboards` in database
2. Query: `SELECT "metabaseDashboards" FROM analytics_settings;`
3. Should return JSON array
4. If null/empty, re-save in Settings

---

## Future Enhancements

Potential additions:
- Dashboard icons/images
- Dashboard categories (User Analytics, Revenue, etc.)
- Access control per dashboard
- Dashboard tags for filtering
- Preview thumbnails
- Usage tracking (most clicked dashboards)

---

## Summary

The Metabase dashboard links feature provides:
- ✅ Dynamic configuration from Settings UI
- ✅ Multiple dashboard support
- ✅ Custom titles and descriptions
- ✅ Responsive grid layout
- ✅ One-click access from Analytics page
- ✅ No code changes required

**Configure at:** http://localhost:3000/admin/settings (Analytics Settings)
**View at:** http://localhost:3000/admin/analytics
