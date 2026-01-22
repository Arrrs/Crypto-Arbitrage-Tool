# Quick Start Guide

**Get your application running in 5 minutes**

---

## First Time Setup

### 1. Clone & Install

```bash
# If starting from template
git clone <your-repo>
cd nextAuth
npm install
```

### 2. Set Up Environment

```bash
# Copy example env
cp .env.example .env  # or create .env manually

# Edit .env and set:
# - DATABASE_URL
# - AUTH_SECRET (generate with: openssl rand -base64 32)
# - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (optional)
```

### 3. Start Database

```bash
# Using Docker (recommended)
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=webapp_dev \
  -p 5432:5432 \
  postgres:latest
```

### 4. Run Setup Script

```bash
# This does everything:
# - Generates Prisma client
# - Runs migrations
# - Creates indexes
# - Initializes analytics
./scripts/setup-database.sh
```

### 5. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

---

## Daily Development

```bash
# Start the app
npm run dev

# Open Prisma Studio (database GUI)
npx prisma studio

# View logs (if using MailHog for emails)
# http://localhost:8025
```

---

## Common Tasks

### Create Admin User

```sql
-- After signing up, promote to admin:
docker exec postgres psql -U postgres -d webapp_dev1 -c "UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';"
```

### View Database

```bash
# Open Prisma Studio
npx prisma studio

# Or use psql
docker exec -it postgres psql -U postgres -d webapp_dev1
```

### Add New Feature with Database Changes

```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_your_feature

# 3. If adding analytics tables, run indexes:
docker exec -i postgres psql -U postgres -d webapp_dev1 < metabase/setup-indexes.sql
```

### Reset Database (⚠️ Deletes all data!)

```bash
npx prisma migrate reset
```

---

## Analytics & Metabase

### Set Up Metabase

```bash
# If not installed, run:
docker run -d -p 3001:3000 \
  -e "MB_DB_TYPE=postgres" \
  -e "MB_DB_DBNAME=webapp_dev1" \
  -e "MB_DB_USER=postgres" \
  -e "MB_DB_PASS=password" \
  -e "MB_DB_HOST=host.docker.internal" \
  --name metabase \
  metabase/metabase:latest
```

Visit http://localhost:3001

### Use Existing Metabase

1. Add database connection (PostgreSQL)
2. Copy queries from `metabase/queries/` folders
3. Create dashboards using templates in `metabase/dashboard-templates/`

### Configure Analytics

Visit http://localhost:3000/admin/analytics to enable/disable tracking

---

## Production Deployment

### Vercel (recommended for Next.js)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - DATABASE_URL (use connection pooling)
# - AUTH_SECRET
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET
```

### Docker

```bash
# Build
docker build -t your-app .

# Run
docker run -d -p 3000:3000 \
  -e DATABASE_URL="your-db-url" \
  -e AUTH_SECRET="your-secret" \
  your-app
```

### Traditional Server

```bash
# Build
npm run build

# Start
npm start
```

**Don't forget**:
- Run migrations: `npx prisma migrate deploy`
- Create indexes: Run `metabase/setup-indexes.sql`
- Set up backups
- Configure SSL for database

---

## Troubleshooting

**App won't start**
- Check DATABASE_URL is correct
- Verify database is running: `docker ps`
- Check migrations: `npx prisma migrate status`

**Can't log in**
- Check email is verified
- Verify user exists: `npx prisma studio`
- Check session logs in admin panel

**Slow Metabase queries**
- Run indexes script: `metabase/setup-indexes.sql`
- Check if analytics is enabled: `/admin/analytics`

**Build errors**
- Clear Next.js cache: `rm -rf .next`
- Regenerate Prisma client: `npx prisma generate`

---

## Useful Links

- **Documentation**: [docs/](docs/)
- **Database Setup**: [docs/DATABASE_SETUP_GUIDE.md](docs/DATABASE_SETUP_GUIDE.md)
- **Features Guide**: [docs/FEATURES.md](docs/FEATURES.md)
- **Analytics Setup**: [docs/ANALYTICS_IMPLEMENTATION_COMPLETE.md](docs/ANALYTICS_IMPLEMENTATION_COMPLETE.md)
- **Metabase Queries**: [metabase/README.md](metabase/README.md)
- **Mobile Responsive**: [docs/MOBILE_RESPONSIVENESS_AUDIT.md](docs/MOBILE_RESPONSIVENESS_AUDIT.md)

---

## Key Files to Know

```
nextAuth/
├── .env                    # Environment variables
├── prisma/schema.prisma    # Database schema
├── app/                    # Next.js pages
│   ├── api/               # API routes
│   ├── admin/             # Admin panel
│   └── login/             # Auth pages
├── lib/                   # Utilities
│   ├── analytics.ts       # Analytics tracking
│   └── logger.ts          # Structured logging
├── metabase/              # Metabase queries & dashboards
├── scripts/               # Setup & utility scripts
└── docs/                  # Documentation
```

---

**Need more help?** Check the full documentation in the `docs/` folder!
