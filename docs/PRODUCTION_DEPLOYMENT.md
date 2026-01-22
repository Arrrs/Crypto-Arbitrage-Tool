# Production Deployment Guide

Complete guide for deploying the NextAuth template to production on VPS/Docker.

**Last Updated**: November 1, 2025
**Deployment Target**: VPS/Docker (self-hosted)

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Docker Deployment](#docker-deployment)
4. [Database Setup](#database-setup)
5. [Security Hardening](#security-hardening)
6. [Monitoring & Logging](#monitoring--logging)
7. [Backup Strategy](#backup-strategy)
8. [Performance Optimization](#performance-optimization)
9. [Common Issues](#common-issues)

---

## Pre-Deployment Checklist

### Critical (Must Do)

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `AUTH_SECRET` (min 32 characters)
- [ ] Set production `DATABASE_URL`
- [ ] Configure `NEXTAUTH_URL` to production domain
- [ ] Enable HTTPS/SSL certificate
- [ ] Change all default Docker passwords
- [ ] Configure real SMTP server (not mock)
- [ ] Review and test all cron jobs
- [ ] Run database migrations
- [ ] Test with realistic data volume

### Security (Highly Recommended)

- [ ] CSRF protection enabled (✅ already applied)
- [ ] Rate limiting configured (✅ already applied)
- [ ] Database indexes created (✅ already applied)
- [ ] Request body size limits set (✅ already applied)
- [ ] Security headers configured (✅ already set in middleware)
- [ ] Configure firewall rules (ports 80, 443, 5432)
- [ ] Set up fail2ban for SSH protection
- [ ] Enable PostgreSQL SSL connections

### Monitoring (Recommended)

- [ ] Set up error tracking (Sentry)
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom)
- [ ] Set up log aggregation (optional)
- [ ] Configure database backups (automated)
- [ ] Set up alerts for critical errors

---

## Environment Configuration

### 1. Copy Environment Template

```bash
cp .env.example .env
```

### 2. Required Variables

**Database**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

**Authentication**:
```bash
# Generate a strong secret (32+ characters)
AUTH_SECRET=$(openssl rand -base64 32)
echo "AUTH_SECRET=$AUTH_SECRET" >> .env

# Set production URL
NEXTAUTH_URL="https://yourdomain.com"
```

**Node Environment**:
```env
NODE_ENV="production"
```

### 3. Optional but Recommended

**OAuth Providers** (if using):
```env
# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

**SMTP Configuration**:
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@yourdomain.com"
```

**Metabase** (if using analytics):
```env
METABASE_SITE_URL="http://localhost:3000"
METABASE_SECRET_KEY=$(openssl rand -base64 32)

# Docker credentials
MB_DB_USER="metabase"
MB_DB_PASS=$(openssl rand -base64 16)
MB_DB_NAME="metabase"
```

### 4. Docker-Specific Variables

```env
# PostgreSQL Docker
POSTGRES_USER="webapp_user"
POSTGRES_PASSWORD=$(openssl rand -base64 16)
POSTGRES_DB="webapp_prod"

# Docker network
DOCKER_NETWORK="webapp_network"
```

---

## Docker Deployment

### 1. Production Dockerfile

The included `Dockerfile` is production-ready:

```dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Builder
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=deps /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 2. Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: webapp_postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Next.js Application
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: webapp_app
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      AUTH_SECRET: ${AUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Metabase (Optional)
  metabase:
    image: metabase/metabase:latest
    container_name: webapp_metabase
    environment:
      MB_DB_TYPE: postgres
      MB_DB_DBNAME: ${MB_DB_NAME}
      MB_DB_PORT: 5432
      MB_DB_USER: ${MB_DB_USER}
      MB_DB_PASS: ${MB_DB_PASS}
      MB_DB_HOST: postgres
    ports:
      - "3001:3000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
```

### 3. Build and Deploy

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f app

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Generate Prisma client
docker-compose exec app npx prisma generate
```

### 4. Update Deployment

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy
```

---

## Database Setup

### 1. Production Database Configuration

**PostgreSQL Configuration** (`/etc/postgresql/16/main/postgresql.conf`):

```conf
# Performance
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 4MB

# Connections
max_connections = 100

# Logging
log_statement = 'mod'  # Log all DDL/DML statements
log_duration = on
log_min_duration_statement = 1000  # Log slow queries (>1s)

# Security
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
```

### 2. Create Production Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE webapp_prod;
CREATE USER webapp_user WITH ENCRYPTED PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE webapp_prod TO webapp_user;

# Enable extensions
\c webapp_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 3. Run Migrations

```bash
# From app directory
npx prisma migrate deploy

# Verify
npx prisma db pull
```

---

## Security Hardening

### 1. Firewall Configuration (UFW)

```bash
# Enable firewall
sudo ufw enable

# Allow SSH (change port if using non-standard)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL (only from localhost)
sudo ufw allow from 127.0.0.1 to any port 5432

# Check status
sudo ufw status
```

### 2. SSL/TLS Configuration (Nginx)

```nginx
# /etc/nginx/sites-available/webapp
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers (additional to app middleware)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Proxy to Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=webapp:10m rate=10r/s;
    limit_req zone=webapp burst=20 nodelay;
}
```

### 3. Fail2Ban for SSH Protection

```bash
# Install fail2ban
sudo apt-get install fail2ban

# Configure
sudo nano /etc/fail2ban/jail.local
```

```ini
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

### 4. PostgreSQL Security

```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

```conf
# Only allow local connections
local   all             all                                     peer
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256

# Deny all other connections
host    all             all             0.0.0.0/0               reject
```

---

## Monitoring & Logging

### 1. Application Logging

The template includes comprehensive logging to database tables:
- **AuditLog**: Admin actions
- **SessionLog**: Login/logout events
- **AppLog**: Application errors and events

**View recent errors**:
```sql
SELECT * FROM app_logs
WHERE level = 'ERROR'
ORDER BY timestamp DESC
LIMIT 100;
```

### 2. Cron Job Monitoring

**Check cron job status**:
```sql
SELECT
  name,
  enabled,
  last_run,
  next_run,
  (SELECT status FROM cron_executions WHERE job_id = cron_jobs.id ORDER BY started_at DESC LIMIT 1) as last_status
FROM cron_jobs;
```

**Check failed cron executions**:
```sql
SELECT * FROM cron_executions
WHERE status = 'FAILURE'
ORDER BY started_at DESC
LIMIT 50;
```

### 3. Error Tracking (Sentry)

```bash
npm install @sentry/nextjs
```

```typescript
// instrumentation.ts
import * as Sentry from "@sentry/nextjs"

export async function register() {
  if (process.env.NODE_ENV === "production") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: "production",
    })
  }

  // ... existing code
}
```

### 4. Uptime Monitoring

Use external services:
- **UptimeRobot**: Free tier available
- **Pingdom**: Paid, more features
- **Better Uptime**: Good balance

**Monitor these endpoints**:
- Main app: `https://yourdomain.com`
- Health check: `https://yourdomain.com/api/health`
- Metabase: `https://yourdomain.com:3001`

---

## Backup Strategy

### 1. Automated Database Backups

**Create backup script** (`/usr/local/bin/backup-webapp-db.sh`):

```bash
#!/bin/bash
set -e

# Configuration
DB_NAME="webapp_prod"
DB_USER="webapp_user"
BACKUP_DIR="/var/backups/webapp"
RETENTION_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/webapp_$(date +%Y%m%d_%H%M%S).sql.gz"

# Create backup
pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

# Delete old backups
find "$BACKUP_DIR" -name "webapp_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE"
```

**Make executable**:
```bash
chmod +x /usr/local/bin/backup-webapp-db.sh
```

**Add to crontab** (daily at 2 AM):
```bash
crontab -e
```

```cron
0 2 * * * /usr/local/bin/backup-webapp-db.sh >> /var/log/webapp-backup.log 2>&1
```

### 2. Restore from Backup

```bash
# List backups
ls -lh /var/backups/webapp/

# Restore
gunzip < /var/backups/webapp/webapp_20251101_020000.sql.gz | psql -U webapp_user webapp_prod
```

### 3. Off-Site Backups (Recommended)

**AWS S3**:
```bash
# Install AWS CLI
sudo apt-get install awscli

# Configure
aws configure

# Upload backup
aws s3 cp /var/backups/webapp/webapp_latest.sql.gz s3://your-bucket/backups/
```

---

## Performance Optimization

### 1. Database Connection Pooling

Already configured in Prisma. For production, adjust in `.env`:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname?connection_limit=10&pool_timeout=20"
```

### 2. Next.js Production Optimizations

Already configured in `next.config.ts`:
- Request body size limits: ✅
- Image optimization: ✅ (Next.js default)
- Automatic static optimization: ✅

### 3. Node.js Process Management (PM2)

```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start npm --name "webapp" -- start

# Save PM2 config
pm2 save

# Auto-start on boot
pm2 startup
```

**PM2 Ecosystem Config** (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'webapp',
    script: 'npm',
    args: 'start',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
  }],
}
```

### 4. CDN for Static Assets (Optional)

Use Cloudflare, AWS CloudFront, or similar for:
- Faster asset delivery
- DDoS protection
- Global caching

---

## Common Issues

### Issue: Cron Jobs Not Running

**Symptoms**: Scheduled tasks not executing

**Solution**:
1. Check `instrumentation.ts` is being called:
   ```bash
   docker-compose logs app | grep "Instrumentation"
   ```

2. Verify cron jobs in database:
   ```sql
   SELECT * FROM cron_jobs WHERE enabled = true;
   ```

3. Check cron execution logs:
   ```sql
   SELECT * FROM cron_executions ORDER BY started_at DESC LIMIT 10;
   ```

### Issue: Database Connection Pool Exhausted

**Symptoms**: "Too many clients already" error

**Solution**:
1. Reduce connection limit in `DATABASE_URL`
2. Check for connection leaks in code
3. Increase PostgreSQL `max_connections`

### Issue: High Memory Usage

**Symptoms**: App crashes with OOM errors

**Solution**:
1. Add pagination to all list endpoints (✅ already done for `/api/admin/users`)
2. Check for memory leaks in cron jobs
3. Increase server memory or reduce PM2 instances

### Issue: Slow Admin Dashboard

**Symptoms**: Analytics page takes 5+ seconds to load

**Solution**:
✅ Already fixed with parallel queries in `app/api/admin/analytics/stats/route.ts`

If still slow:
1. Add database indexes (✅ already done)
2. Consider caching stats (Redis optional)
3. Pre-aggregate data with cron jobs

---

## Health Check Endpoint

**Endpoint**: `GET /api/health`

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-01T22:00:00.000Z",
  "database": "connected",
  "uptime": 86400
}
```

Use this for:
- Load balancer health checks
- Uptime monitoring
- Container orchestration (Docker, K8s)

---

## Security Checklist Summary

### ✅ Already Implemented

- CSRF protection on all mutations
- Rate limiting on auth endpoints
- Database indexes for performance
- Request body size limits
- Security headers (CSP, HSTS, X-Frame-Options)
- Environment validation on startup
- Audit logging for admin actions
- Password hashing (bcrypt)
- 2FA support (TOTP)

### Deployment-Specific (Your Responsibility)

- [ ] HTTPS/SSL certificate (Let's Encrypt)
- [ ] Firewall configuration (UFW, iptables)
- [ ] Database backups (automated)
- [ ] Monitoring setup (Sentry, UptimeRobot)
- [ ] Strong passwords for all services
- [ ] SSH key authentication (disable password auth)
- [ ] Regular security updates (`apt update && apt upgrade`)

---

## Next Steps After Deployment

1. **Monitor for 24 hours**:
   - Check error logs
   - Verify cron jobs run
   - Test critical user flows
   - Monitor resource usage

2. **Set up alerts**:
   - Disk space > 80%
   - CPU usage > 90%
   - Database connection failures
   - Application errors

3. **Performance testing**:
   - Load test critical endpoints
   - Test with realistic data volume
   - Verify database query performance

4. **Documentation**:
   - Document your specific deployment
   - Update team on monitoring tools
   - Create runbook for common issues

---

**Deployment Checklist Complete!** 🚀

For questions or issues, check:
- [Template Overview](./TEMPLATE_OVERVIEW.md)
- [Developer Guide](./development/DEVELOPER_GUIDE.md)
- [GitHub Issues](https://github.com/your-repo/issues)
