# NextAuth Template - Overview

**Last Updated**: November 1, 2025
**Philosophy**: Simple, maintainable, production-ready starter for SaaS applications

---

## What This Template Is

A **minimal but complete** Next.js authentication starter with:
- Full auth system (email/password, OAuth, 2FA)
- Admin panel for user management
- Audit logging and basic analytics
- Background cron jobs for maintenance
- Production-ready security features
- Simple architecture you can understand

**Not over-engineered** - Add Redis, microservices, etc. when you actually need them.

---

## Core Features (Always Included)

### Authentication & Security
- **Email/Password Authentication** with bcrypt hashing
- **Two-Factor Authentication (2FA)** with TOTP and backup codes
- **OAuth Support** (Google configured, easy to add more)
- **Email Verification** with magic links
- **Password Reset** flow
- **Session Management** with NextAuth.js v5
- **Rate Limiting** (in-memory, simple)
- **CSRF Protection** (ready to enable)

### Admin Panel
- **User Management** (create, update, delete, search)
- **Role-Based Access** (USER, ADMIN)
- **System Settings UI** (configure app from admin panel)
- **Audit Logging** (who did what, when)
- **Activity Tracking** (login attempts, user actions)

### Analytics & Monitoring
- **Basic Analytics Dashboard** (user stats, activity, errors)
- **Metabase Integration** (optional, powerful SQL-based analytics)
- **Application Logs** (errors, warnings, info)
- **Session Logs** (login attempts, IP tracking, geolocation)
- **Health Check Endpoint** (for load balancers)

### Background Jobs (node-cron)
- **Log Cleanup** (delete old logs automatically)
- **System Health Checks** (monitor database, check errors)
- **Alert System** (notify admins of issues via Telegram/Email)
- **Configurable via UI** (enable/disable jobs, set schedules)

### Developer Experience
- **TypeScript** throughout
- **Prisma ORM** for type-safe database access
- **Ant Design** for UI components
- **Responsive Design** (mobile-first)
- **Docker Compose** for local development
- **Environment Validation** (fail fast on missing config)

---

## Technology Stack

| Category | Technology | Why |
|----------|-----------|-----|
| Framework | Next.js 14 (App Router) | Modern, SSR, API routes |
| Database | PostgreSQL | Reliable, powerful |
| ORM | Prisma | Type-safe, migrations |
| Auth | NextAuth.js v5 | Industry standard |
| UI | Ant Design | Professional, accessible |
| Background Jobs | node-cron | Simple, no dependencies |
| Analytics | Metabase (optional) | Powerful, self-hosted |
| Deployment | Docker | Consistent environments |

---

## Project Structure

```
/app                      # Next.js App Router
  /admin                  # Admin panel pages
    /users                # User management
    /logs                 # Log viewing
    /analytics            # Analytics dashboard
    /settings             # System settings
    /alerts               # Alert configuration
    /cron                 # Cron job management
  /api                    # API routes
    /admin                # Protected admin endpoints
    /auth                 # Auth endpoints (NextAuth)
  /(auth)                 # Auth pages (login, signup, etc.)

/lib                      # Shared utilities
  auth-rate-limit.ts      # Rate limiting (in-memory)
  logger.ts               # Logging utilities
  prisma.ts               # Prisma client
  cron-scheduler.ts       # Cron job scheduler
  cron.ts                 # Cron job handlers
  analytics-cron.ts       # Analytics aggregation jobs

/components               # React components
  sidebar-layout.tsx      # Admin layout
  [feature-name].tsx      # Feature components

/prisma                   # Database schema and migrations
  schema.prisma           # Database models
  seed.ts                 # Seed data script

/docs                     # Documentation
  TEMPLATE_OVERVIEW.md    # This file
  [other docs]
```

---

## What's NOT Included (Add When Needed)

### Redis / Caching
- **When to add**: 1000+ concurrent users, multi-server deployment
- **Use cases**: Session storage, distributed rate limiting, caching
- **Why not now**: Adds complexity, not needed for most MVPs

### BullMQ / Advanced Job Queues
- **When to add**: Complex background processing, retries, job priorities
- **Use cases**: Email campaigns, data exports, heavy computations
- **Why not now**: node-cron is sufficient for scheduled tasks

### Microservices Architecture
- **When to add**: Team scaling, independent deployment needs
- **Use cases**: Separate services for payments, notifications, etc.
- **Why not now**: Monolith is easier to maintain and deploy

### Advanced Monitoring (APM)
- **When to add**: Production with paying customers
- **Use cases**: Performance monitoring, error tracking (Sentry, Datadog)
- **Why not now**: Built-in logging is sufficient for development

---

## Getting Started

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd nextAuth

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your database credentials
```

### 2. Database Setup

```bash
# Start PostgreSQL with Docker
docker compose up -d postgres

# Run migrations
npx prisma migrate dev

# Seed database (creates admin user)
npm run db:seed
```

### 3. Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

**Default Admin Login**:
- Email: `admin@example.com`
- Password: `Admin123!`

### 4. Optional: Start Metabase

```bash
docker compose --profile analytics up -d
```

Visit: http://localhost:3001

---

## Configuration

### Environment Variables

**Required**:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
AUTH_SECRET="min-32-chars-secret-use-openssl-rand-base64-32"
```

**Optional**:
```env
NEXTAUTH_URL="http://localhost:3000"  # Auto-detected in dev
GOOGLE_CLIENT_ID="..."                 # For OAuth
GOOGLE_CLIENT_SECRET="..."             # For OAuth
```

**SMTP (Email) - Configure in Admin UI**:
- Go to Admin → Settings
- Configure SMTP settings
- Test email sending

**Telegram (Alerts) - Configure in Admin UI**:
- Go to Admin → Settings
- Add bot token and chat ID
- Test alerts

---

## Common Use Cases

### Use Case 1: SaaS Application
**What you have**: Auth, admin panel, user management, analytics
**What to add**: Your app-specific features, payment integration
**Estimated start time**: 1 day

### Use Case 2: Internal Tool / CRM
**What you have**: Auth, user management, audit logs
**What to add**: Your business logic, custom admin pages
**Estimated start time**: 1 day

### Use Case 3: Marketplace
**What you have**: Multi-user auth, admin moderation
**What to add**: Product listings, transactions, reviews
**Estimated start time**: 2 days

### Use Case 4: Social Network
**What you have**: User profiles, authentication
**What to add**: Posts, connections, feeds, messaging
**Estimated start time**: 3 days

### Use Case 5: Dashboard / Analytics Platform
**What you have**: Auth, Metabase integration, cron jobs
**What to add**: Data connectors, custom visualizations
**Estimated start time**: 2 days

---

## Scaling Path

### Stage 1: MVP (0-100 users)
- Current setup is perfect
- Single server deployment
- PostgreSQL + Next.js monolith

### Stage 2: Growth (100-1000 users)
- Add database indexes
- Optimize slow queries
- Add simple caching (in-memory)

### Stage 3: Scaling (1000-10000 users)
- **Add Redis** for sessions and rate limiting
- **Add CDN** for static assets
- **Horizontal scaling** (multiple Next.js instances)
- **Database read replicas**

### Stage 4: Enterprise (10000+ users)
- **Microservices** (if needed)
- **BullMQ** for job queues
- **APM monitoring** (Datadog, New Relic)
- **Advanced caching** strategies

---

## Security Checklist

**Already Implemented**:
- ✅ Password hashing (bcrypt)
- ✅ 2FA support (TOTP + backup codes)
- ✅ Rate limiting (login attempts)
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS protection (React, Content Security Policy)
- ✅ Audit logging (all admin actions)
- ✅ Environment validation
- ✅ Health checks

**Before Production**:
- [ ] Enable HTTPS/SSL
- [ ] Change default admin password
- [ ] Configure SMTP for real emails
- [ ] Set strong AUTH_SECRET (32+ chars)
- [ ] Enable CSRF protection on all mutations
- [ ] Run security scan (OWASP ZAP)
- [ ] Set up error monitoring (Sentry)
- [ ] Configure database backups

---

## Cron Jobs

### Available Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Log Cleanup | Daily | Delete logs older than retention period |
| System Health Check | Every 5 min | Check for errors, high failure rates |
| Alert Check | Every 1 min | Trigger configured alerts |
| Analytics Refresh | Hourly | Update analytics aggregations |

### Managing Cron Jobs

**Via Admin UI**:
1. Go to Admin → Cron Jobs
2. Enable/disable jobs
3. Edit schedules (cron syntax)
4. View execution history
5. Manually trigger jobs

**Via Code**:
- Edit handlers in `lib/cron.ts`
- Add new jobs in `lib/cron-templates.ts`
- Jobs run in Next.js process (no separate worker)

---

## Metabase Integration

**Why Metabase?**
- Self-hosted, free
- SQL-based queries (no code)
- Beautiful dashboards
- Email reports
- User-friendly for non-technical admins

**Setup**:
```bash
# Start Metabase
docker compose --profile analytics up -d

# Connect to your database
# Host: postgres (Docker network)
# Database: webapp_dev1
# User: postgres
# Password: [from docker-compose.yml]
```

**Pre-built Queries** (see `docs/METABASE_SQL_QUERIES.md`):
- User growth over time
- Daily active users
- Failed login attempts
- Top user activities
- Error rate trends

---

## Customization Guide

### Adding a New Feature

1. **Create Database Models** (`prisma/schema.prisma`)
2. **Generate Migration** (`npx prisma migrate dev`)
3. **Create API Routes** (`app/api/[feature]/route.ts`)
4. **Add Admin UI** (`app/admin/[feature]/page.tsx`)
5. **Update Sidebar** (`components/sidebar-layout.tsx`)

### Adding OAuth Provider

1. **Get credentials** from provider
2. **Add to** `auth.ts` providers array
3. **Add env vars** to `.env`
4. **Test login flow**

### Adding Cron Job

1. **Create handler** in `lib/cron.ts`
2. **Add template** in `lib/cron-templates.ts`
3. **Run seed** to add to database
4. **Enable in Admin UI**

---

## Deployment

### Docker Production

```bash
# Build and start all services
docker compose --profile production up -d

# Run migrations
docker compose exec app npx prisma migrate deploy

# View logs
docker compose logs -f app
```

### Manual Deployment (VPS)

```bash
# Build Next.js
npm run build

# Start production server
npm start

# Or use PM2
npm install -g pm2
pm2 start npm --name "nextauth" -- start
```

### Environment Variables (Production)

```env
NODE_ENV="production"
DATABASE_URL="postgresql://..."  # Production database
AUTH_SECRET="..."                 # Strong random secret
NEXTAUTH_URL="https://yourdomain.com"
```

---

## Troubleshooting

### Cron Jobs Not Running
- Check `instrumentation.ts` is enabled
- Check cron job is enabled in database
- Check logs in Admin → Logs

### Authentication Not Working
- Verify `AUTH_SECRET` is set
- Check database connection
- Check `NEXTAUTH_URL` matches your domain

### Email Not Sending
- Configure SMTP in Admin → Settings
- Test with "Send Test Email" button
- Check application logs for errors

### Database Connection Failed
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` is correct
- Check firewall/network settings

---

## Support & Resources

**Documentation**:
- Next.js: https://nextjs.org/docs
- NextAuth.js: https://authjs.dev
- Prisma: https://www.prisma.io/docs
- Ant Design: https://ant.design

**This Template**:
- [GitHub Issues](your-repo-url/issues)
- [Documentation](./docs/)

---

## License

MIT License - Use freely for personal and commercial projects
