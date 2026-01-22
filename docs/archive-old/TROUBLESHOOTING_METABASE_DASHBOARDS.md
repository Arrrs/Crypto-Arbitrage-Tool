# Troubleshooting: Metabase Dashboards Feature

## Issue Fixed: "Unknown argument `metabaseDashboards`"

### Error Message
```
Unknown argument `metabaseDashboards`. Available options are marked with ?.
```

### Root Cause
After adding a new field to the Prisma schema, the Prisma Client was not regenerated. The TypeScript types and database client still used the old schema without the `metabaseDashboards` field.

### Solution Steps

#### 1. Ensure Schema is Correct
Check `prisma/schema.prisma`:
```prisma
model AnalyticsSettings {
  // ... other fields
  metabaseDashboards Json? @default("[]")
}
```

#### 2. Run Migration
```bash
npx prisma migrate deploy
```

This applies the database migration to add the column to PostgreSQL.

#### 3. Regenerate Prisma Client (CRITICAL)
```bash
npx prisma generate
```

This regenerates the TypeScript types and Prisma Client to recognize the new field.

#### 4. Restart Development Server
```bash
# Stop the server (Ctrl+C)
npm run dev
```

The server must be restarted to load the new Prisma Client.

---

## Common Issues

### Issue 1: "Column does not exist" in SQL query

**Error Example:**
```
ERROR: column "adminId" does not exist
```

**Cause:**
Direct column access when the field is stored in JSONB.

**Solution:**
Use JSONB extraction operators:
```sql
-- Wrong
SELECT adminId FROM app_logs

-- Correct
SELECT metadata->>'adminId' as "adminId" FROM app_logs
```

**Fixed Files:**
- `/metabase/queries/errors/02-recent-errors.sql`

---

### Issue 2: Dashboard links don't save

**Check:**
1. Migration applied? `npx prisma migrate deploy`
2. Column exists in database?
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'analytics_settings';
   ```
3. Prisma Client regenerated? `npx prisma generate`
4. Server restarted after regenerate?

---

### Issue 3: TypeScript errors in editor

**Error:**
```typescript
Property 'metabaseDashboards' does not exist on type 'AnalyticsSettings'
```

**Solution:**
1. Run `npx prisma generate`
2. Restart TypeScript server in VSCode: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
3. If using WebStorm/IntelliJ: File → Invalidate Caches → Restart

---

### Issue 4: Dashboards appear empty on analytics page

**Debug Steps:**

1. **Check if dashboards are saved:**
   ```sql
   SELECT "metabaseDashboards"
   FROM analytics_settings
   WHERE id = 'analytics_config';
   ```

2. **Check API response:**
   ```bash
   curl http://localhost:3000/api/admin/analytics/settings \
     -H "Cookie: authjs.session-token=YOUR_TOKEN"
   ```

3. **Check browser console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for JavaScript errors
   - Check Network tab for failed requests

4. **Verify settings were saved:**
   - Go to Settings → Analytics Settings
   - Check if dashboard links are still there
   - If missing, they weren't saved properly

---

### Issue 5: JSON validation error when saving

**Error:**
```
Invalid JSON format
```

**Cause:**
Form validation expects specific JSON structure.

**Required Format:**
```json
[
  {
    "title": "Dashboard Title",
    "description": "Optional description",
    "url": "https://valid-url.com/dashboard/1"
  }
]
```

**Validation Rules:**
- `title`: Required, non-empty string
- `description`: Optional string
- `url`: Required, must be valid HTTP/HTTPS URL

---

## Testing After Fix

### 1. Test Settings Page
```bash
# Navigate to
http://localhost:3000/admin/settings

# Actions:
1. Expand "Analytics Settings"
2. Scroll to "Metabase Dashboards"
3. Click "Add Dashboard Link"
4. Fill in all fields
5. Click "Save Analytics Settings"
6. Should see success message
```

### 2. Test Analytics Page
```bash
# Navigate to
http://localhost:3000/admin/analytics

# Expected:
- Dashboard cards appear in grid
- Cards show title and description
- Clicking card opens URL in new tab
```

### 3. Test Database
```sql
-- Check the saved data
SELECT
  "metabaseDashboards"
FROM analytics_settings
WHERE id = 'analytics_config';

-- Expected output:
[
  {
    "title": "Your Dashboard Title",
    "description": "Your description",
    "url": "https://your-url.com"
  }
]
```

---

## Prisma Workflow Reminder

**When adding new fields to Prisma schema:**

1. **Edit schema** (`prisma/schema.prisma`)
   ```prisma
   model YourModel {
     newField String?
   }
   ```

2. **Create migration**
   ```bash
   npx prisma migrate dev --name add_new_field
   ```

   Or manually:
   ```bash
   mkdir prisma/migrations/$(date +%Y%m%d%H%M%S)_add_new_field
   # Create migration.sql
   npx prisma migrate deploy
   ```

3. **Generate Prisma Client** (MUST DO)
   ```bash
   npx prisma generate
   ```

4. **Restart development server**
   ```bash
   npm run dev
   ```

5. **Update TypeScript types if needed**
   - Interfaces in components
   - API route types
   - Form types

---

## Prevention Checklist

Before deploying schema changes:

- [ ] Schema updated in `prisma/schema.prisma`
- [ ] Migration created and applied
- [ ] `npx prisma generate` executed
- [ ] Development server restarted
- [ ] TypeScript errors resolved
- [ ] API endpoints tested
- [ ] UI components tested
- [ ] Database verified with SQL query
- [ ] Error logs checked (no errors)

---

## Quick Reference Commands

```bash
# Check current schema
npx prisma db pull

# Create migration
npx prisma migrate dev --name your_migration_name

# Apply migrations
npx prisma migrate deploy

# Regenerate client (AFTER schema changes)
npx prisma generate

# Check migration status
npx prisma migrate status

# View database schema
docker exec postgres psql -U postgres -d webapp_dev1 -c "\d your_table"

# Restart dev server
pkill -f "next dev" && npm run dev
```

---

## Summary

**Problem:** Prisma Client not regenerated after schema change

**Solution:**
1. Run `npx prisma generate`
2. Restart dev server

**Always remember:** After ANY Prisma schema change:
```bash
npx prisma migrate deploy  # Apply to database
npx prisma generate         # Update TypeScript client
# Restart server
```

This ensures the database, Prisma Client, and TypeScript types stay in sync.
