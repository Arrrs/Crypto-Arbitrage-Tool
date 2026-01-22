# Database Migrations

## Important: After Running Analytics Migration

**After running the analytics migration**, you MUST create performance indexes for optimal Metabase performance.

### Run Indexes Script

```bash
# If using Docker PostgreSQL
docker exec -i postgres psql -U postgres -d your_database_name < metabase/setup-indexes.sql

# If using local PostgreSQL
psql -U postgres -d your_database_name -f metabase/setup-indexes.sql
```

**This creates 20+ indexes** that make analytics queries 10-100x faster!

### Which Migration Requires Indexes?

If your migration includes these tables, run the indexes script:
- `UserActivityLog`
- `DailyUserStats`
- `HourlyActivityStats`
- `FeatureUsageStats`
- `SubscriptionChangeLog`

Look for migration files with "analytics" in the name.

---

## Complete Setup Guide

See [DATABASE_SETUP_GUIDE.md](../docs/DATABASE_SETUP_GUIDE.md) for:
- Complete database setup from scratch
- Index creation instructions
- Production considerations
- Troubleshooting guide
- Backup strategies

---

## Quick Reference

### Run All Pending Migrations

```bash
# Development (creates migration files)
npx prisma migrate dev

# Production (applies existing migrations)
npx prisma migrate deploy
```

### Create a New Migration

```bash
npx prisma migrate dev --name your_migration_name
```

### Reset Database (⚠️ DELETES ALL DATA)

```bash
npx prisma migrate reset
```

### View Migration Status

```bash
npx prisma migrate status
```

---

## Migration Order Matters

Migrations are applied in chronological order based on the timestamp in the folder name.

Example:
```
20250101000000_initial_setup/
20250102000000_add_analytics/
20250103000000_add_2fa/
```

**Never modify existing migrations!** Always create a new one.

---

## Troubleshooting

### "Migration failed to apply"

Check the error message. Common issues:
- Table already exists: You might have applied this manually
- Column conflict: Schema drift from manual changes
- Constraint violation: Existing data doesn't meet new constraints

**Solution**: Fix the issue, then run `npx prisma migrate resolve --applied <migration_name>`

### "Migration is in a failed state"

```bash
# Mark as rolled back
npx prisma migrate resolve --rolled-back <migration_name>

# Then try again
npx prisma migrate deploy
```

### Schema Drift Detected

```bash
# See what's different
npx prisma db pull

# If needed, create a migration to sync
npx prisma migrate dev --create-only
```

---

## Production Best Practices

1. **Always backup before migrating**
   ```bash
   docker exec postgres pg_dump -U postgres your_db > pre_migration_backup.sql
   ```

2. **Test migrations in staging first**

3. **Use `migrate deploy` in production**
   - Never use `migrate dev` in production
   - It's designed for development only

4. **Monitor migration duration**
   - Large tables may take time to alter
   - Consider maintenance windows

5. **Keep migration files in version control**
   - They're part of your codebase
   - Team members need them

---

**Remember**: After adding analytics tables, run the indexes script!
