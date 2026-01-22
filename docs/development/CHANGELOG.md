# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Nothing yet

### Changed
- Nothing yet

### Fixed
- Nothing yet

### Removed
- Nothing yet

---

## [1.0.0] - 2025-10-26

Initial production-ready release with complete authentication, admin panel, logging, alerts, and cron jobs.

### Added

#### Authentication & User Management
- Email + password registration with verification
- Email verification system (24-hour expiry)
- Login with credentials and session management
- Password reset flow (1-hour token expiry)
- Google OAuth support (configured via .env)
- User roles: USER, PREMIUM, ADMIN
- Rate limiting on auth endpoints
- Avatar upload and management
- Admin panel for user management
  - View, edit, delete users
  - Change roles and permissions
  - Manual email verification
  - Search and filter users
  - Pagination support

#### Logging & Monitoring
- **Audit Logs**: Track all admin actions with before/after values
- **Session Logs**: Track login/logout/password reset events
- **Application Logs**: System errors and important events (ERROR, WARN, INFO, DEBUG)
- **Rate Limit Logs**: Track rate limiting events
- On-demand IP geolocation lookup (saves API quota)
  - 97% reduction in API calls vs automatic lookup
  - Three-tier caching (memory, database, API)
  - Batch updates (one lookup updates all logs with same IP)
  - Permanent storage once looked up
- Export logs to CSV/JSON
- Real-time log viewing with filters
- Mobile-responsive log tables (card view on mobile)

#### Alert System
- Configurable alert rules with conditions
- Alert types:
  - Failed login attempts (brute force detection)
  - Error spikes (application issues)
  - Extensible for custom alerts
- Multi-channel notifications:
  - Telegram (with rich formatting)
  - Email (HTML templates)
- Alert management UI:
  - Create, edit, delete, test alerts
  - View trigger history
  - Configure per-alert cooldowns
  - Enable/disable per alert
  - Toggle notification channels per alert
- Auto-refresh of trigger counter after testing
- Automatic alert checking every 5 minutes via cron

#### Cron Jobs
- Template-based cron job system (no code changes needed)
- Built-in jobs:
  - Log cleanup (daily at 2 AM)
  - Alert checking (every 5 minutes)
  - Telegram reports (configurable schedule)
  - Database backup (configurable)
  - User activity summary (configurable)
- Cron job management UI:
  - View all jobs with status
  - Manual execution
  - View execution history
  - Enable/disable jobs
  - Mobile-responsive job cards
- Execution logging with success/failure tracking

#### System Settings
- Database-driven configuration (no restart required)
- Settings categories:
  - Telegram bot configuration with test button
  - Log retention policies (per log type)
  - Feature flags (Telegram alerts, Email alerts)
  - SMTP/Email configuration with test button
  - System limits (upload size, rate limits, session timeout)
- Settings change tracking in audit logs
- Real-time updates across all instances

#### UI/UX
- Ant Design 5 component library
- Fully responsive design (mobile, tablet, desktop)
- Dark mode support
- Mobile-optimized layouts:
  - Card view for cron jobs
  - Card view for alerts
  - Streamlined log tables
  - Touch-friendly buttons
- Loading states and skeletons
- Toast notifications for user feedback
- Confirmation dialogs for destructive actions

#### Security
- Password hashing (bcrypt, 12 rounds)
- JWT-based sessions with HTTP-only cookies
- Rate limiting on all sensitive endpoints
- Admin middleware protection
- IP tracking for all requests
- User agent logging
- Failed login monitoring
- Session security with expiry
- SQL injection prevention (Prisma ORM)
- XSS protection
- CSRF tokens (NextAuth)

#### Documentation
- Complete feature documentation (FEATURES.md)
- Setup instructions (SETUP.md)
- Architecture overview (ARCHITECTURE.md)
- Developer guide (DEVELOPER_GUIDE.md)
- This changelog (CHANGELOG.md)
- Geolocation optimization guide (GEOLOCATION_OPTIMIZATION.md)

#### Developer Experience
- TypeScript throughout
- Prisma ORM with migrations
- Environment variable configuration
- Docker support
- Seed scripts for testing
- System initialization script
- Hot reload in development

### Changed

#### Geolocation System
- **BREAKING**: Changed from automatic to on-demand geolocation lookups
  - Removed automatic API calls on every log event
  - Added lookup button in logs UI (🌍 icon)
  - API calls reduced by 97% (from ~4,500 to ~150-200/month)
  - Data now persists permanently in database once looked up
  - Old logs have null country/city until manually looked up

#### Alert System
- Notification channels now toggleable per alert (Telegram and Email)
- Alert trigger counter auto-refreshes after testing
- Email recipient now configurable per alert
- Disabled channel toggles when service not configured

#### Settings UI
- Removed Google OAuth UI (configured via .env only due to NextAuth limitation)
- Removed geolocation toggle (now on-demand only)
- Added info alerts explaining new approaches

### Fixed
- Fixed failed login alerts not triggering (check_alerts cron job was missing)
- Fixed Telegram notification toggle not working in alert modal
- Fixed email notification toggle not working in alert modal
- Fixed cron job template registration for CHECK_ALERTS

### Removed
- Removed automatic geolocation API calls (now on-demand)
- Removed geolocation feature flag from settings
- Removed Google OAuth UI from settings (still works via .env)
- Removed Tailwind CSS (migrated to Ant Design)

---

## How to Use This Changelog

### For Developers

When making changes, add entries under `[Unreleased]` in the appropriate category:

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Fixed**: Bug fixes
- **Removed**: Removed features

### Example Entry Format

```markdown
## [Unreleased]

### Added
- User notification preferences page
- SMS alert channel support
- Dark mode toggle in user settings

### Changed
- Updated alert cooldown to use seconds instead of minutes
- Improved log export performance for large datasets

### Fixed
- Fixed timezone issue in cron job scheduler
- Fixed avatar upload failing for files over 2MB

### Removed
- Removed deprecated session log fields
```

### When Releasing a New Version

1. Move all `[Unreleased]` items to a new version section
2. Add the version number and date
3. Clear the `[Unreleased]` section
4. Update version in `package.json`

```markdown
## [Unreleased]

### Added
- Nothing yet

...

## [1.1.0] - 2025-11-15

### Added
- User notification preferences page
- SMS alert channel support
```

### Version Numbering Guide

Use [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes (e.g., API changes, removed features)
- **MINOR** (1.x.0): New features (backward compatible)
- **PATCH** (1.0.x): Bug fixes (backward compatible)

**Examples**:
- `1.0.0` → `1.0.1`: Fixed a bug (patch)
- `1.0.1` → `1.1.0`: Added SMS alerts (minor)
- `1.1.0` → `2.0.0`: Changed API response format (major)

### Migration Notes

If a version requires database migrations or manual steps, add a section:

```markdown
## [2.0.0] - 2026-01-15

### Migration Required

**Database Migration**:
```bash
npx prisma migrate deploy
```

**Manual Steps**:
1. Update environment variables (see .env.example)
2. Re-run system initialization: `npx tsx scripts/init-system.ts`
3. Clear old cache: Delete `/tmp/cache/*`

### Breaking Changes
- API endpoint `/api/admin/logs` now requires `logType` parameter
- Removed `geolocation` field from session logs (use `country` and `city` instead)
```

---

## Version History Summary

- **1.0.0** (2025-10-26): Initial production release with authentication, admin panel, logging, alerts, cron jobs, and comprehensive documentation.

---

## Links

- [GitHub Repository](https://github.com/yourusername/nextauth)
- [Documentation](docs/README.md)
- [Issues](https://github.com/yourusername/nextauth/issues)
- [Pull Requests](https://github.com/yourusername/nextauth/pulls)
