# Analytics Settings Consolidation

## Overview
Analytics settings have been consolidated into the main System Settings page instead of having a separate analytics page. This provides a better user experience with all admin settings in one centralized location.

## Changes Made

### 1. Settings Page Updated ([app/admin/settings/page.tsx](../app/admin/settings/page.tsx))

#### Added Analytics Form
```typescript
const [analyticsForm] = Form.useForm()
```

#### Added Analytics Loading Logic
The `loadSettings()` function now makes a separate API call to load analytics settings:
```typescript
// Load analytics settings separately (different API endpoint)
const analyticsRes = await fetch("/api/admin/analytics/settings")
if (analyticsRes.ok) {
  const analyticsData = await analyticsRes.json()
  analyticsForm.setFieldsValue({
    trackPageViews: analyticsData.trackPageViews === true,
    trackUserActivity: analyticsData.trackUserActivity === true,
    // ... etc
  })
}
```

#### Added Analytics Save Function
```typescript
const saveAnalyticsSettings = async () => {
  const values = await analyticsForm.validateFields()
  const res = await fetch("/api/admin/analytics/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ /* all analytics fields */ }),
  })
}
```

#### Added Analytics Section to Collapse
A new collapsible section (key: "6") was added with:
- **Label**: "📊 Analytics Settings" with LineChartOutlined icon
- **Content**: Complete analytics configuration form

### 2. New Collapse Section Structure

The analytics section includes three subsections:

#### 📊 Tracking Features
- 6 toggleable switches in a responsive 2-column grid (Row/Col)
- Track Page Views
- Track User Activity
- Track Device Info
- Track Geolocation
- Track Subscription Events
- Track Performance (with warning tag)

#### ⚡ Performance Settings
- **Sampling Rate**: Slider (1-100%) with marks at 1%, 25%, 50%, 75%, 100%
- **Batch Size**: InputNumber (1-1000)
- **Async Tracking**: Toggle switch with "Recommended" tag

#### 💾 Data Retention
- **Raw Data Retention**: InputNumber (1-365 days) - Default: 90 days
- **Aggregated Data Retention**: InputNumber (1-3650 days) - Default: 365 days
- Info alert explaining automatic aggregation

### 3. Removed Separate Analytics Page

#### Backed Up Old File
```bash
mv app/admin/analytics/page.tsx → app/admin/analytics/page.tsx.old
```

The old standalone page is preserved as `.old` for reference but is no longer in use.

#### Removed Navigation Link
Updated [components/sidebar-layout.tsx](../components/sidebar-layout.tsx):
- Removed the `/admin/analytics` menu item
- Analytics settings are now accessed via Settings page

### 4. Mobile Responsiveness

The analytics section uses the same responsive patterns as other settings sections:

#### Tracking Features Grid
```typescript
<Row gutter={[16, 16]}>
  <Col xs={24} md={12}>
    {/* Each switch takes full width on mobile, half on desktop */}
  </Col>
</Row>
```

#### Data Retention Grid
```typescript
<Row gutter={16}>
  <Col xs={24} md={12}>
    {/* Raw data retention input */}
  </Col>
  <Col xs={24} md={12}>
    {/* Aggregated data retention input */}
  </Col>
</Row>
```

**Mobile Behavior:**
- Single column layout (xs={24})
- Full-width inputs
- Vertical stacking

**Desktop Behavior:**
- Two column layout (md={12})
- Side-by-side inputs
- Efficient horizontal space usage

## API Structure

### Separate API Endpoint
Analytics settings continue to use their dedicated API endpoint:
- **GET** `/api/admin/analytics/settings` - Load settings
- **PUT** `/api/admin/analytics/settings` - Save settings

This is different from other settings which use `/api/admin/settings` with a `key` parameter.

### Why Different API?
Analytics has its own database table (`AnalyticsSettings`) with dedicated columns, while other settings use a generic `SystemSettings` table with JSON values. This provides:
- Type safety for analytics fields
- Better query performance
- Dedicated caching via `clearAnalyticsCache()`

## Benefits of Consolidation

### 1. Better User Experience
- ✅ All admin settings in one place
- ✅ Single navigation destination
- ✅ Consistent UI/UX with other settings sections
- ✅ Less cognitive load for admins

### 2. Consistent Design
- ✅ Uses same Collapse pattern as other settings
- ✅ Matches Telegram, SMTP, Log Retention sections
- ✅ Same responsive behavior
- ✅ Uniform spacing and typography

### 3. Reduced Navigation Complexity
- ✅ One less menu item in sidebar
- ✅ Cleaner admin navigation
- ✅ Settings are grouped logically

### 4. Mobile Friendly
- ✅ Responsive grid system (Row/Col)
- ✅ Collapsible sections save screen space
- ✅ Touch-friendly switches and sliders
- ✅ Full-width inputs on mobile

## How to Access Analytics Settings

### For Admin Users:
1. Navigate to **Settings** in the admin sidebar
2. Scroll to the **"📊 Analytics Settings"** section
3. Click to expand the section
4. Configure tracking, performance, and retention settings
5. Click **"Save Analytics Settings"** button

### Settings Page Location:
- **URL**: http://localhost:3000/admin/settings
- **Section**: Item #6 in the Collapse component
- **Icon**: LineChartOutlined (chart icon)

## Files Modified

1. **app/admin/settings/page.tsx** (1092 lines)
   - Added `analyticsForm` form instance
   - Added analytics loading logic
   - Added `saveAnalyticsSettings()` function
   - Added new Collapse item for analytics

2. **components/sidebar-layout.tsx**
   - Removed `/admin/analytics` menu item (lines 143-146)
   - Kept other admin menu items intact

3. **app/admin/analytics/page.tsx**
   - Renamed to `page.tsx.old` (backup)
   - No longer used in production

## API Endpoints Used

### General Settings
- **GET** `/api/admin/settings` → Loads all SystemSettings
- **PUT** `/api/admin/settings` → Saves individual setting by key

### Analytics Settings
- **GET** `/api/admin/analytics/settings` → Loads AnalyticsSettings
- **PUT** `/api/admin/analytics/settings` → Saves all analytics fields

Both endpoints:
- Require ADMIN role authentication
- Return JSON responses
- Include error handling
- Log admin actions

## Testing

The settings page has been successfully tested:
- ✅ Page compiles without errors
- ✅ Settings API endpoint returns 200 OK
- ✅ Analytics API endpoint returns 200 OK
- ✅ Page loads at `/admin/settings`
- ✅ All existing sections work correctly
- ✅ Server running without errors

### Manual Testing Checklist
To verify the implementation:
1. [ ] Navigate to http://localhost:3000/admin/settings
2. [ ] Expand "📊 Analytics Settings" section
3. [ ] Toggle tracking switches
4. [ ] Adjust sampling rate slider
5. [ ] Modify retention day inputs
6. [ ] Click "Save Analytics Settings"
7. [ ] Verify success message appears
8. [ ] Refresh page and confirm settings persisted
9. [ ] Test on mobile viewport (< 768px)
10. [ ] Verify responsive layout works

## Future Enhancements (Optional)

If needed, you could:
- Add analytics statistics/metrics cards above the settings
- Add a "View Metabase Dashboard" button
- Include recent analytics data preview
- Add export/import settings functionality
- Implement settings templates (preset configurations)

## Migration Notes

If you're migrating this project or starting fresh:
1. Run database migrations to create `AnalyticsSettings` table
2. Access settings via `/admin/settings` page
3. Analytics section will auto-create default settings on first save
4. Test data can be generated with `scripts/generate-test-analytics-data.ts`
5. Metabase queries are in `/metabase/queries/` directory

## Summary

Analytics settings are now **fully integrated** into the main System Settings page using the Collapse component pattern. The old separate analytics page has been backed up and removed from navigation. All functionality is preserved, and the UI is more consistent and user-friendly.

**Access at**: http://localhost:3000/admin/settings → Expand "📊 Analytics Settings"
