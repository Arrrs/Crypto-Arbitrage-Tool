# NextAuth Template - Documentation

**Simple, production-ready Next.js authentication starter**

---

## Quick Start

### 1. Get Started
- **[TEMPLATE_OVERVIEW.md](TEMPLATE_OVERVIEW.md)** - ⭐ **Start here!** Complete overview, philosophy, and use cases
- **[getting-started/SETUP.md](getting-started/SETUP.md)** - Installation and first steps
- **[getting-started/DATABASE_SETUP_GUIDE.md](getting-started/DATABASE_SETUP_GUIDE.md)** - Database configuration

### 2. Learn the Features
- **[features/ARCHITECTURE.md](features/ARCHITECTURE.md)** - System architecture
- **[features/FEATURES.md](features/FEATURES.md)** - Complete feature list

### 3. Analytics & Monitoring
- **[analytics/ADMIN_ANALYTICS_DASHBOARD.md](analytics/ADMIN_ANALYTICS_DASHBOARD.md)** - Built-in analytics
- **[analytics/METABASE_SETUP_QUICK.md](analytics/METABASE_SETUP_QUICK.md)** - Metabase setup
- **[analytics/METABASE_SQL_QUERIES.md](analytics/METABASE_SQL_QUERIES.md)** - Pre-built queries
- **[analytics/ANALYTICS_PAGE_GUIDE.md](analytics/ANALYTICS_PAGE_GUIDE.md)** - Analytics page details
- **[analytics/ANALYTICS_TRACKING_EXAMPLES.md](analytics/ANALYTICS_TRACKING_EXAMPLES.md)** - Tracking examples

### 4. Development
- **[development/DEVELOPER_GUIDE.md](development/DEVELOPER_GUIDE.md)** - Development guidelines
- **[development/PRODUCTION_RECOMMENDATIONS.md](development/PRODUCTION_RECOMMENDATIONS.md)** - Production checklist
- **[development/CHANGELOG.md](development/CHANGELOG.md)** - Version history

---

## Documentation Structure

```
docs/
├── README.md                    # This file (navigation)
├── TEMPLATE_OVERVIEW.md         # ⭐ Start here!
│
├── getting-started/             # Setup guides
│   ├── SETUP.md                 # Installation
│   └── DATABASE_SETUP_GUIDE.md  # Database config
│
├── features/                    # Feature documentation
│   ├── ARCHITECTURE.md          # System design
│   └── FEATURES.md              # Feature list
│
├── analytics/                   # Analytics guides
│   ├── ADMIN_ANALYTICS_DASHBOARD.md
│   ├── METABASE_SETUP_QUICK.md
│   ├── METABASE_SQL_QUERIES.md
│   ├── ANALYTICS_PAGE_GUIDE.md
│   └── ANALYTICS_TRACKING_EXAMPLES.md
│
├── development/                 # Developer resources
│   ├── DEVELOPER_GUIDE.md
│   ├── PRODUCTION_RECOMMENDATIONS.md
│   └── CHANGELOG.md
│
└── archive-old/                 # Old implementation docs (reference only)
```

---

## What This Template Includes

✅ **Authentication** - Email/password, OAuth, 2FA, email verification
✅ **Admin Panel** - User management, settings, logs, analytics
✅ **Audit Logging** - Track all admin actions
✅ **Cron Jobs** - Scheduled tasks (cleanup, health checks)
✅ **Analytics** - Built-in dashboard + Metabase integration
✅ **Security** - Rate limiting, CSRF protection, password hashing

**Not included** (add when needed):
- Redis / Advanced caching
- BullMQ / Job queues
- Microservices
- APM monitoring

---

## 🚀 Quick Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up database
cp .env.example .env
# Edit .env with your database credentials

# 3. Run migrations and seed
npx prisma migrate dev
npm run db:seed

# 4. Start development server
npm run dev
```

**Default Admin Login**: `admin@example.com` / `Admin123!`

---

## Common Questions

**Q: Is this production-ready?**
A: Yes for small-to-medium apps (0-1000 users). See [PRODUCTION_RECOMMENDATIONS.md](development/PRODUCTION_RECOMMENDATIONS.md) for checklist.

**Q: Can I remove features I don't need?**
A: Yes! Everything is modular. See [TEMPLATE_OVERVIEW.md](TEMPLATE_OVERVIEW.md) for what to keep/remove.

**Q: When should I add Redis?**
A: When you have 1000+ concurrent users or need multi-server deployment. Current in-memory rate limiting works fine until then.

**Q: How do I add custom features?**
A: See [DEVELOPER_GUIDE.md](development/DEVELOPER_GUIDE.md) for step-by-step guides.

---

## Technology Stack

- **Next.js 14** (App Router)
- **PostgreSQL** (Database)
- **Prisma** (ORM)
- **NextAuth.js v5** (Authentication)
- **Ant Design** (UI)
- **node-cron** (Background jobs)
- **Metabase** (Analytics - optional)

---

## Quick Links

- **Admin Panel**: http://localhost:3000/admin
- **Metabase** (if enabled): http://localhost:3001
- **API Health Check**: http://localhost:3000/api/health (TODO)

---

## Need Help?

1. Check [TEMPLATE_OVERVIEW.md](TEMPLATE_OVERVIEW.md) troubleshooting section
2. Search [archive-old/](archive-old/) for implementation details
3. Read feature-specific docs in respective folders

---

**Last Updated**: November 1, 2025
