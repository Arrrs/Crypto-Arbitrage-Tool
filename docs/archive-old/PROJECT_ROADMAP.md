# Project Roadmap - NextAuth SaaS Template

**Last Updated**: October 31, 2025
**Project Status**: 85% Production Ready
**Version**: 1.2.0

---

## 📊 Current Status Overview

### ✅ Completed Features (What We Have)

#### Core Authentication & Security
- ✅ Email/password registration with verification
- ✅ Google OAuth integration
- ✅ Password reset flow with secure tokens
- ✅ **Two-Factor Authentication (2FA)** - TOTP with backup codes
- ✅ **Strong password requirements** - 8+ chars, complexity validation, real-time feedback
- ✅ **Rate limiting** - IP-based, 5 attempts/15 minutes, human-readable messages
- ✅ **Failed login tracking** - Proper database logging with email/IP/userId
- ✅ Session management with JWT
- ✅ User roles: USER, PREMIUM, ADMIN

#### Logging & Monitoring
- ✅ **Centralized logger** - All production logs go to database via `lib/logger.ts`
- ✅ **Structured JSON logging** - Production-ready for log aggregators (DataDog, CloudWatch, ELK)
- ✅ **Request ID tracking** - Distributed tracing across all requests (UUID v4)
- ✅ **100% API error logging** - All 37 API routes have proper error logging
- ✅ Audit logs - Track all admin actions with before/after values
- ✅ Session logs - Track login/logout/password reset events
- ✅ Application logs - ERROR, WARN, INFO, DEBUG levels
- ✅ Geolocation lookup - On-demand IP lookup with 3-tier caching
- ✅ Export logs to CSV/JSON

#### Admin Panel
- ✅ User management - View, edit, delete, change roles
- ✅ **Analytics dashboard** - Consolidated at `/admin/analytics`
- ✅ **Metabase integration** - Configurable dashboard links in settings
- ✅ Alert management - Configure, test, view trigger history
- ✅ Cron job management - View, enable/disable, manual execution
- ✅ System settings - Database-driven configuration (no restart needed)
- ✅ Logs viewer - Real-time with filters and pagination

#### Alert System
- ✅ Multi-channel notifications (Telegram, Email)
- ✅ Configurable alert rules with conditions
- ✅ Alert types: Failed logins, error spikes, custom alerts
- ✅ Per-alert cooldowns and enable/disable toggles
- ✅ Test button with auto-refresh trigger counter
- ✅ Automatic alert checking every 5 minutes via cron

#### Cron Jobs
- ✅ Template-based system - Create jobs via UI without code changes
- ✅ Built-in jobs: Log cleanup, alert checking, Telegram reports, database backup, user activity summary
- ✅ Execution logging with success/failure tracking
- ✅ Manual execution via admin UI
- ✅ Enable/disable per job

#### System Settings
- ✅ **SMTP/Email configuration** - Database-driven with test button
- ✅ **Telegram bot configuration** - Database-driven with test button
- ✅ Log retention policies - Per log type
- ✅ Feature flags - Telegram alerts, email alerts
- ✅ System limits - Upload size, rate limits, session timeout
- ✅ **Analytics settings** - Metabase dashboard links

#### UI/UX
- ✅ Ant Design 5 component library
- ✅ Fully responsive design (mobile, tablet, desktop)
- ✅ Dark mode support
- ✅ Mobile-optimized layouts with card views
- ✅ Loading states and skeletons
- ✅ Toast notifications
- ✅ Confirmation dialogs

#### Recent Improvements (October 2025)
- ✅ **Console logging cleanup** - All production logs use centralized logger
- ✅ **Route restructuring** - `/dashboard` → `/profile`, consolidated admin analytics
- ✅ **Failed login tracking fix** - Custom login API properly logs failed attempts
- ✅ **Human-readable rate limit messages** - "14 minutes" instead of timestamps

---

## 🎯 Priority 1: Critical (Before Production) - 9-13 Hours Remaining

### 1.5 Redis for Distributed Rate Limiting ⏳
**Status**: Not Started
**Estimated Time**: 2-3 hours
**Importance**: Critical for multi-instance deployments

**Current Issue**: Database-based rate limiting works but doesn't scale for multiple server instances.

**Tasks**:
- [ ] Install `ioredis` package
- [ ] Create `lib/redis.ts` with Redis client setup
- [ ] Update `lib/auth-rate-limit.ts` to use Redis for lookups
- [ ] Keep database logging for audit trail (Redis = speed, DB = history)
- [ ] Add `REDIS_URL` to `.env` and `.env.example`
- [ ] Implement fallback to database when Redis unavailable
- [ ] Test rate limiting with Redis
- [ ] Document Redis setup in `docs/SETUP.md`

**Why**: Database queries for rate limiting don't scale. Redis provides sub-millisecond lookups.

**Deployment Note**: Optional for single-instance deployments, critical for serverless/multi-instance.

---

### 1.6 External Cron Job Execution ⏳
**Status**: Not Started
**Estimated Time**: 4-6 hours
**Importance**: Critical for serverless/production deployments

**Current Issue**: Cron jobs run in-process via `instrumentation.ts` - doesn't work in serverless or multi-instance deployments.

**Solution Options**:
- **Option A**: AWS EventBridge / Google Cloud Scheduler (recommended for serverless)
- **Option B**: Bull Queue with Redis (recommended for self-hosted)
- **Option C**: Vercel Cron (if deploying to Vercel)

**Tasks**:
- [ ] Decide on solution based on deployment target
- [ ] Create API endpoint: `POST /api/cron/trigger?job={name}&secret={CRON_SECRET}`
- [ ] Add `CRON_SECRET` to environment variables
- [ ] Add authentication to cron trigger endpoint
- [ ] Update job execution logic to accept external triggers
- [ ] Remove in-process scheduler (if using EventBridge)
- [ ] Set up external scheduler (CloudFormation/Terraform)
- [ ] Test manual job execution via API
- [ ] Document setup in `docs/SETUP.md`

**Why**: Next.js serverless functions timeout after 10-60 seconds. Long-running cron jobs need external execution.

**Deployment Note**: Can keep in-process for development, but MUST externalize for production.

---

### 1.7 Database Backup Strategy ⏳
**Status**: Not Started
**Estimated Time**: 2-3 hours
**Importance**: Critical for data safety

**Current Issue**: No automated backups.

**Tasks**:
- [ ] Create `scripts/backup-database.ts` using `pg_dump`
- [ ] Add backup cron job template (daily at 3 AM)
- [ ] Implement retention policy (7 daily, 4 weekly, 12 monthly)
- [ ] Compress backups with gzip
- [ ] (Optional) Upload to S3/Google Cloud Storage
- [ ] Test backup creation
- [ ] Test backup restoration: `psql -d dbname < backup.sql`
- [ ] Document backup/restore process in `docs/SETUP.md`
- [ ] Add backup monitoring alert (alert if backup fails)

**Why**: Data loss is catastrophic. Regular backups are essential for disaster recovery.

---

## 🔥 Priority 2: High (First Month) - 12-17 Hours

### 2.1 Log Sampling for High-Volume Endpoints ⏳
**Status**: Not Started
**Estimated Time**: 1-2 hours

**Current Issue**: All API calls logged to database - can overwhelm DB in high traffic.

**Tasks**:
- [ ] Add `sampleRate` parameter to logger functions
- [ ] Implement sampling logic: `if (Math.random() > sampleRate) return`
- [ ] Configure per-endpoint sampling:
  - Auth endpoints: 100% (always log)
  - Admin endpoints: 100% (always log)
  - User profile: 10% (1 in 10 requests)
  - Public endpoints: 1% (1 in 100 requests)
- [ ] Always log ERROR level regardless of sampling
- [ ] Test high-volume endpoint logging

**Why**: Logging every single request creates millions of database rows and slows down the app.

---

### 2.2 Performance Monitoring (APM) ⏳
**Status**: Not Started
**Estimated Time**: 3-4 hours

**Recommended Solutions**:
- **DataDog** (best for production, paid)
- **Prometheus + Grafana** (open source, self-hosted)
- **New Relic** (good free tier)
- **Sentry** (excellent for error tracking)

**Tasks**:
- [ ] Choose monitoring solution
- [ ] Install dependencies
- [ ] Create `lib/metrics.ts` for custom metrics
- [ ] Add APM middleware to track:
  - Request duration
  - Database query time
  - Error rates
  - Memory usage
  - Active sessions
- [ ] Create `/api/metrics` endpoint (Prometheus format)
- [ ] Set up dashboard with key metrics
- [ ] Configure alerting for performance degradation

**Why**: "You can't improve what you don't measure." Production apps need visibility.

---

### 2.3 Complete Webhook Support for Alerts ⏳
**Status**: Partially Implemented
**Estimated Time**: 2-3 hours

**Current Status**: Webhook function exists but not fully implemented.

**Tasks**:
- [ ] Implement complete `sendWebhook()` in `lib/alerts.ts`
- [ ] Add webhook signature verification (HMAC-SHA256)
- [ ] Implement retry logic with exponential backoff (3 retries: 1s, 2s, 4s)
- [ ] Add webhook configuration to alert UI
- [ ] Support Slack webhook format
- [ ] Support Discord webhook format
- [ ] Support generic JSON webhooks
- [ ] Test webhook delivery and retries
- [ ] Log webhook failures to database

**Why**: Different teams use different tools. Webhooks provide flexibility.

---

### 2.4 API Documentation (OpenAPI/Swagger) ⏳
**Status**: Not Started
**Estimated Time**: 4-6 hours

**Tasks**:
- [ ] Install `swagger-ui-react` and `swagger-jsdoc`
- [ ] Create `lib/swagger.ts` for OpenAPI spec generation
- [ ] Create `/api-docs` page with Swagger UI
- [ ] Add JSDoc comments to key API routes:
  - `/api/auth/register`
  - `/api/auth/login`
  - `/api/user/profile`
  - `/api/admin/users`
  - `/api/cron/trigger`
- [ ] Generate OpenAPI 3.0 spec
- [ ] Add "Try it out" functionality
- [ ] Add authentication (admin only)
- [ ] Test Swagger UI

**Why**: Good API docs improve developer experience and reduce support requests.

---

## 📊 Priority 3: Medium (First Quarter) - 9-14 Hours

### 3.1 Unit and Integration Tests ⏳
**Status**: Not Started
**Estimated Time**: Initial 2 hours + ongoing

**Tasks**:
- [ ] Install Jest and React Testing Library
- [ ] Configure Jest with `jest.config.js`
- [ ] Write unit tests for `lib/logger.ts`
- [ ] Write unit tests for `lib/auth-rate-limit.ts`
- [ ] Write unit tests for `lib/totp.ts` (2FA)
- [ ] Write integration tests for `/api/auth/register`
- [ ] Write integration tests for `/api/auth/login`
- [ ] Set up test coverage reporting
- [ ] Add GitHub Actions CI/CD with test runner
- [ ] Add pre-commit hook to run tests

**Goal**: >70% code coverage

**Why**: Tests prevent regressions and give confidence when refactoring.

---

### 3.2 Feature Flags System ⏳
**Status**: Not Started
**Estimated Time**: 4-6 hours

**Tasks**:
- [ ] Add `FeatureFlag` model to Prisma schema
- [ ] Run migration
- [ ] Create `lib/feature-flags.ts` with:
  - `isFeatureEnabled(userId, flagName)`
  - `checkRolloutPercentage(userId, percentage)`
- [ ] Create admin UI: `/app/admin/feature-flags/page.tsx`
- [ ] Create API: `GET/POST /api/admin/feature-flags`
- [ ] Test rollout percentage (50% = half of users see feature)
- [ ] Test condition filtering (roles, specific user IDs)

**Why**: Safely roll out features to subset of users. Disable broken features without deployment.

---

### 3.3 Session Management Dashboard ⏳
**Status**: Not Started
**Estimated Time**: 3-4 hours

**Tasks**:
- [ ] Create `/app/admin/sessions/page.tsx`
- [ ] Create API: `GET /api/admin/sessions`
- [ ] Create API: `DELETE /api/admin/sessions/[token]`
- [ ] Create API: `DELETE /api/admin/sessions/user/[userId]`
- [ ] Add IP and device tracking to session display
- [ ] Show session duration and last activity
- [ ] Add "Revoke All Sessions" bulk action
- [ ] Test session revocation
- [ ] Add geolocation lookup for session IPs

**Why**: Detect compromised accounts, force logout suspicious sessions.

---

## 🌟 Priority 4: Nice-to-Have (Backlog)

### 4.1 Email Template Builder ⏸️
**Status**: Deferred
Visual editor for email templates (welcome, password reset, etc.)

### 4.2 Device Fingerprinting ⏸️
**Status**: Deferred
Detect suspicious logins from new devices/locations

### 4.3 Advanced Analytics Dashboard ⏸️
**Status**: Deferred
Real-time charts, custom date ranges (already using Metabase)

### 4.4 SAML/SSO Support ⏸️
**Status**: Deferred
Enterprise SSO (Okta, Azure AD)

### 4.5 API Key Authentication ⏸️
**Status**: Deferred
Generate API keys for programmatic access

### 4.6 Multi-Tenancy Support ⏸️
**Status**: Deferred
Multiple organizations in one deployment

---

## 📋 Recommended Implementation Order

### Phase 1: Production Essentials (9-13 hours)
1. **Database Backups** (2-3h) - Data safety first
2. **Redis Rate Limiting** (2-3h) - Scalability
3. **External Cron Jobs** (4-6h) - Serverless compatibility

### Phase 2: Observability & Quality (12-17 hours)
4. **Performance Monitoring** (3-4h) - Essential visibility
5. **Log Sampling** (1-2h) - Database optimization
6. **Webhook Alerts** (2-3h) - Complete alert system
7. **API Documentation** (4-6h) - Developer experience

### Phase 3: Advanced Features (9-14 hours)
8. **Unit Tests** (2h initial + ongoing) - Code quality
9. **Feature Flags** (4-6h) - Safe rollouts
10. **Session Management** (3-4h) - Security control

**Total Estimated Time to 100% Production Ready**: 30-44 hours

---

## 🚀 Quick Start for New Features

When adding a new feature to this template:

1. **Database Changes**: Update `prisma/schema.prisma` → Run `npx prisma migrate dev`
2. **API Route**: Create in `/app/api/[feature]/route.ts` with proper error logging
3. **UI Page**: Create in `/app/[feature]/page.tsx` using Ant Design components
4. **Logging**: Use `logger.info/warn/error()` from `lib/logger.ts` with request ID
5. **Settings**: Add to `SystemSettings` model if configurable
6. **Cron Job**: Use template system in `lib/cron-templates.ts` if scheduled
7. **Alert**: Add alert rule in `lib/alerts.ts` if monitoring needed
8. **Documentation**: Update `docs/FEATURES.md` and `docs/CHANGELOG.md`

---

## 📝 Notes

### Deployment Considerations

**Single Instance (VPS, Docker)**:
- ✅ Current setup works perfectly
- ✅ In-process cron jobs are fine
- ✅ Database rate limiting is acceptable
- ⚠️ Still need: Backups, monitoring

**Multi-Instance (Load Balanced)**:
- ⚠️ Need: Redis for rate limiting
- ⚠️ Need: External cron execution
- ⚠️ Need: Session store in Redis or database

**Serverless (Vercel, AWS Lambda)**:
- ❌ Current cron jobs won't work (need external scheduler)
- ⚠️ Need: Redis or external rate limiting
- ⚠️ Need: Database connection pooling (Prisma Accelerate)
- ⚠️ Cold start optimization

### Technology Choices

**Why PostgreSQL?**: Relational data, ACID compliance, excellent for auth systems
**Why Prisma?**: Type-safe queries, migrations, excellent DX
**Why NextAuth?**: Industry standard, secure, OAuth support
**Why Ant Design?**: Professional UI, comprehensive components, mobile-first
**Why Node-Cron?**: Simple for development, but needs replacement for production

---

**Last Updated**: October 31, 2025
**Next Review**: When starting Phase 1 implementation
