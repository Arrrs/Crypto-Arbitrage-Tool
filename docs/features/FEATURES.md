# Features Guide

Complete overview of all features and how to use them.

## Table of Contents

- [Authentication](#authentication)
- [User Management](#user-management)
- [Analytics System](#analytics-system)
- [Logging & Monitoring](#logging--monitoring)
- [Alert System](#alert-system)
- [Cron Jobs](#cron-jobs)
- [System Settings](#system-settings)

---

## Authentication

### User Registration
- Email + password registration
- Automatic email verification sent
- **Password strength requirements**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
  - Real-time strength indicator with visual feedback
- Duplicate email prevention

### Email Verification
- Verification link expires in 24 hours
- Resend verification option available
- Verified badge on user profile
- Admins can manually verify users

### Login
- Email + password authentication
- Google OAuth (optional)
- "Remember me" functionality via JWT sessions
- Failed login tracking and rate limiting

### Password Reset
- "Forgot password" flow with email
- Reset token expires in 1 hour
- Rate limited (3 attempts per hour)
- Secure token generation

### User Roles
- **USER**: Basic access to dashboard
- **PREMIUM**: Extended features (configurable)
- **ADMIN**: Full system access including admin panel

### Two-Factor Authentication (2FA)
- **TOTP-based** authentication (RFC 6238 standard)
- **QR code setup** for authenticator apps (Google Authenticator, Authy, 1Password, etc.)
- **Backup codes** (8 codes) for account recovery
- **Password-protected** disable and regeneration
- **Integrated login flow** with 2FA verification page
- **OAuth support**: OAuth users must set password before enabling 2FA
- **Security logging**: All 2FA events logged to audit trail
- **One-time use**: Backup codes removed after use
- **Management UI**: Complete setup/disable/regenerate flows in profile settings

See [2FA_IMPLEMENTATION_SUMMARY.md](2FA_IMPLEMENTATION_SUMMARY.md) for complete details.

### Account Security
- Session logging with IP tracking
- Rate limiting on auth endpoints
- Failed login monitoring
- Two-factor authentication (2FA) support
- Password strength validation with real-time feedback
- Distributed request ID tracking
- Structured JSON logging for observability
- Email notifications for suspicious activity (optional)

---

## User Management

### Admin Panel (`/admin`)

**User List**:
- View all registered users
- Search by name or email
- Filter by role, verification status
- Sort by registration date
- Pagination for large user bases

**User Actions**:
- Edit user details (name, email, role)
- Toggle admin status
- Verify/unverify email manually
- Grant/revoke premium status
- Delete users (with confirmation)

**User Details Modal**:
- Full user information
- Registration date
- Last login timestamp
- Email verification status
- Current role and permissions
- Avatar display

**Avatar Support**:
- Upload custom avatar images
- Automatic resizing and optimization
- Default avatars if none uploaded
- File size limits (configurable)

---

## Analytics System

### Overview

Complete, production-ready analytics system for tracking user behavior, feature adoption, and business metrics. All tracking is **optional**, **performance-optimized**, and **Metabase-ready**.

**Key Features**:
- 📊 Track page views, feature usage, subscriptions, and device info
- ⚙️ Admin UI to enable/disable tracking types
- 🚀 Async/non-blocking (never slows down your app)
- 📉 Automatic data aggregation and cleanup
- 📈 46 SQL queries ready for Metabase dashboards
- 🎯 Sampling support (track 10% or 100% of events)

### What You Can Track

**User Activity**:
- Page views and navigation
- Feature usage and adoption
- Button clicks and interactions
- Form submissions
- Session duration

**User Attributes**:
- Device type (mobile/desktop/tablet)
- Browser and version
- Operating system
- Geographic location (country/city)
- IP address

**Business Metrics**:
- New signups per day
- Daily/weekly/monthly active users (DAU/WAU/MAU)
- User retention (cohort analysis)
- Paid vs free user breakdown
- Subscription changes (upgrades, downgrades, cancellations)
- Revenue tracking
- Feature adoption rates

**Technical Metrics**:
- Error rates and error types
- API response times
- Login success/failure rates
- Hourly activity patterns

### Analytics Settings (`/admin/analytics`)

**Tracking Toggles**:
- ✅ Track Page Views
- ✅ Track User Activity
- ✅ Track Device Info
- ✅ Track Geolocation
- ✅ Track Subscription Events
- ❌ Track Performance (more expensive)

**Performance Controls**:
- **Sampling Rate**: 1-100% (track all events or only a percentage)
- **Async Tracking**: Non-blocking by default (recommended)
- **Batch Size**: For future batch optimization

**Data Retention**:
- **Raw Data**: Default 90 days (detailed activity logs)
- **Aggregated Data**: Default 365 days (daily/hourly summaries)
- **Automatic Cleanup**: Runs daily at 3:00 AM

### How It Works

**1. Event Tracking**:
```
User Action → trackActivity() → Check settings → Apply sampling →
Async insert to DB → Return immediately (non-blocking)
```

**2. Data Aggregation**:
```
Raw data (millions of rows) → Cron runs daily →
Compress to summaries (one row per day) → Delete old raw data →
99.999% space savings
```

**3. Scheduled Jobs** (Auto-configured):
- **Daily Stats** (1:00 AM): Aggregate yesterday's data into DailyUserStats
- **Hourly Stats** (Every hour at :05): Recent activity metrics
- **Feature Usage** (2:00 AM): Feature adoption aggregation
- **Cleanup** (3:00 AM): Delete data older than retention period

### Database Tables

**AnalyticsSettings** (1 row):
- Configuration and toggle controls
- Sampling rate and performance settings
- Retention periods

**UserActivityLog** (raw events):
- All user actions with timestamps
- Device info, geolocation, metadata
- Cleaned up after retention period

**SubscriptionChangeLog**:
- Payment events
- Plan changes
- Revenue tracking

**DailyUserStats** (aggregated):
- One row per day
- Total/new/active users
- Paid vs free breakdown
- Revenue summaries

**HourlyActivityStats** (aggregated):
- Recent hourly metrics
- Page views, logins, errors
- Error rates

**FeatureUsageStats** (aggregated):
- Feature adoption per day
- Free vs paid usage
- Unique users per feature

### Metabase Integration

**Setup**:
1. Run Metabase via Docker
2. Connect to your PostgreSQL database
3. Use the 46 pre-written SQL queries from `docs/METABASE_SQL_QUERIES.md`
4. Create dashboards with recommended visualizations

**Available Dashboards** (10 types):
1. **User Growth** - Signups, growth rate, user base expansion
2. **User Activity** - DAU/WAU/MAU, stickiness, engagement
3. **Revenue & Subscriptions** - MRR, churn, ARPU, conversion
4. **Feature Adoption** - Usage patterns, engagement rates
5. **Device & Platform** - Mobile vs desktop, browsers, OS
6. **Geographic** - Countries, cities, growth by region
7. **Performance & Errors** - Error rates, monitoring
8. **Real-Time Monitoring** - Live activity, current metrics
9. **User Retention** - Cohort analysis, retention curves
10. **Advanced Analytics** - LTV, funnels, engagement scores

### Adding Tracking to Your Code

**Track Page View**:
```typescript
import { trackPageView } from "@/lib/analytics"
import { getGeoLocation } from "@/lib/geolocation"

export async function GET(request: NextRequest) {
  const session = await auth()
  const userAgent = request.headers.get("user-agent")
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]
  const geo = await getGeoLocation(ip)

  await trackPageView({
    userId: session.user.id,
    path: "/your-page",
    userAgent,
    ipAddress: ip,
    country: geo.country,
    city: geo.city,
  })

  return NextResponse.json({ data: "..." })
}
```

**Track Feature Usage**:
```typescript
import { trackFeatureUse } from "@/lib/analytics"

await trackFeatureUse({
  userId: session.user.id,
  featureName: "Profile_Update",
  action: "UPDATED",
  metadata: { changes: ["name", "email"] },
})
```

**Track Subscription Change**:
```typescript
import { trackSubscriptionChange } from "@/lib/analytics"

await trackSubscriptionChange({
  userId: session.user.id,
  changeType: "UPGRADE",
  fromStatus: "free",
  toStatus: "paid",
  fromPlan: null,
  toPlan: "pro",
  amount: 29.99,
  currency: "USD",
  paymentMethod: "card",
  transactionId: payment.id,
})
```

### Performance Characteristics

**Non-Blocking** (Default):
- All tracking is async by default
- Returns immediately, tracking happens in background
- Never slows down API responses

**Sampling**:
- Track 100% of events or reduce to 10% for high-traffic routes
- Reduces database load and storage costs
- Configurable per setting

**Settings Cache**:
- Settings cached for 1 minute
- Reduces database queries from every request to once per minute
- Automatic cache clearing when settings change

**Silent Failures**:
- If tracking fails, logs warning but doesn't throw
- User experience is never interrupted
- Failed tracking doesn't break your app

### Example Queries

**Daily Active Users (Last 30 Days)**:
```sql
SELECT date, "activeUsers" as dau
FROM "DailyUserStats"
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
```

**Top 10 Features**:
```sql
SELECT "featureName", SUM("totalUses") as total
FROM "FeatureUsageStats"
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY "featureName"
ORDER BY total DESC LIMIT 10;
```

**Mobile vs Desktop Usage**:
```sql
SELECT date, "mobileUsers" as mobile, "desktopUsers" as desktop
FROM "DailyUserStats"
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
```

### Documentation

See complete documentation:
- **ANALYTICS_SYSTEM_COMPLETE.md** - Full feature reference and API guide
- **METABASE_SQL_QUERIES.md** - 46 production-ready SQL queries
- **ANALYTICS_TRACKING_EXAMPLES.md** - Code examples and best practices
- **ANALYTICS_IMPLEMENTATION_COMPLETE.md** - Complete implementation summary

---

## Logging & Monitoring

### Four Log Types

#### 1. Audit Logs
**Purpose**: Track all admin actions

**Logged Actions**:
- User role changes
- Settings modifications
- User deletion/creation
- Permission grants
- System configuration changes

**Data Captured**:
- Admin ID and name
- Action type
- Resource affected
- Before/after values (for updates)
- IP address
- User agent
- Timestamp
- Severity level (INFO, WARNING, CRITICAL)

**Retention**: Configurable (default: 90 days)

#### 2. Session Logs
**Purpose**: Track user authentication events

**Events Logged**:
- LOGIN (successful/failed)
- LOGOUT
- PASSWORD_RESET
- EMAIL_VERIFICATION

**Data Captured**:
- User ID
- Event type
- Success/failure status
- IP address (with on-demand geolocation)
- User agent
- Login method (credentials, Google OAuth)
- Failure reason (if failed)
- Timestamp

**Retention**: Configurable (default: 30 days)

#### 3. Application Logs
**Purpose**: System errors and important events

**Log Levels**:
- ERROR: Application errors
- WARN: Warnings and potential issues
- INFO: General information
- DEBUG: Debugging information

**Data Captured**:
- Log level
- Message
- Category (auth, api, database, email, etc.)
- Stack trace (for errors)
- Structured metadata
- Timestamp

**Retention**: Configurable (default: 30 days)

#### 4. Rate Limit Logs
**Purpose**: Track rate limiting events

**Data Captured**:
- IP address or identifier
- Endpoint being accessed
- Attempt count
- Blocked status
- Time window
- Timestamp

**Retention**: Configurable (default: 7 days)

### Log Viewing

**Filters**:
- Search by user, admin, IP, action, etc.
- Filter by date range
- Filter by severity (audit logs)
- Filter by success/failure (session logs)
- Filter by level (app logs)

**Display**:
- Responsive table view (desktop)
- Card view (mobile)
- Detailed modal for each log entry
- Real-time updates
- Load more / pagination

**Export**:
- Export to CSV
- Export to JSON
- Download filtered results
- Include/exclude columns

### Geolocation

**On-Demand Lookup**:
- IP addresses stored immediately
- Geolocation fetched only when needed
- Click 🌍 button next to IP to lookup
- Results cached permanently in database
- Saves API quota (97% reduction)

**Use Cases**:
- Investigate suspicious logins
- Track admin actions by location
- Security audits
- Compliance requirements

---

## Alert System

### Alert Types

#### Failed Login Attempts
**Purpose**: Detect brute force attacks

**Configuration**:
- Threshold: Number of failed attempts
- Time window: Period to count (minutes)
- Cooldown: Time between alerts (seconds)

**Example**: Alert if ≥5 failed logins from same IP in 15 minutes

#### Error Spike
**Purpose**: Detect application issues

**Configuration**:
- Threshold: Number of errors
- Time window: Period to count (minutes)
- Cooldown: Time between alerts

**Example**: Alert if ≥10 errors in last 5 minutes

### Notification Channels

**Telegram**:
- Configure bot token and chat ID in Settings
- Rich formatting with emojis
- Instant mobile notifications
- Toggle on/off per alert

**Email**:
- Configure SMTP in Settings
- HTML email templates
- Color-coded by severity
- Specify recipient per alert
- Toggle on/off per alert

### Alert Management

**Create Alert**:
1. Go to `/admin/alerts`
2. Click "Create Alert"
3. Fill in:
   - Name and description
   - Alert type and severity
   - Condition parameters
   - Enable Telegram/Email
   - Set cooldown period
4. Save

**Test Alert**:
- Click "Test" button on any alert
- Sends test notification to configured channels
- Verifies configuration works
- Trigger count updates automatically

**View History**:
- Click "History" button
- See all times alert triggered
- View exact timestamp and message
- Track resolution status

**Edit Alert**:
- Modify thresholds
- Change notification channels
- Update email recipients
- Enable/disable alert

**Delete Alert**:
- Remove unwanted alerts
- Confirmation required
- Trigger history preserved

### Alert Monitoring

**Auto-Check**: Alerts checked every 5 minutes via cron job

**Manual Check**: Test button for immediate testing

**Cooldown**: Prevents spam by waiting specified seconds between notifications

---

## Cron Jobs

### Available Jobs

#### Log Cleanup
**Schedule**: Daily at 2 AM
**Purpose**: Delete old logs based on retention policy
**Configuration**: Set retention days in Settings
**Template**: Uses CLEANUP_OLD_DATA template

#### Check Alerts
**Schedule**: Every 5 minutes
**Purpose**: Evaluate alert conditions and trigger notifications
**Configuration**: Manages all enabled alerts
**Template**: Uses CHECK_ALERTS template

#### System Health Check
**Schedule**: Every 15 minutes
**Purpose**: Monitor system health
**Configuration**: Customizable checks

#### Analytics Refresh
**Schedule**: Every 6 hours
**Purpose**: Pre-calculate dashboard analytics
**Configuration**: Customizable metrics

### Job Management

**View Jobs**:
- See all configured cron jobs
- Status (enabled/disabled)
- Schedule (cron expression)
- Last run time
- Total executions

**Execute Manually**:
- Click "Run" button
- Immediate execution
- Useful for testing

**View Execution History**:
- Click "History" button
- See all past executions
- Status (SUCCESS/FAILURE)
- Duration
- Output/error messages
- Records affected

**Edit Job**:
- Change schedule
- Enable/disable
- Update description

### Adding New Jobs

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md#adding-cron-jobs) for how to add custom cron jobs.

---

## System Settings

### Settings Categories

All settings stored in database and update instantly (no restart required).

#### 1. Telegram Bot Configuration

**Setup**:
1. Message @BotFather on Telegram
2. Send `/newbot` and follow instructions
3. Copy bot token
4. Start chat with your bot
5. Get chat ID from @userinfobot
6. Enter in Settings
7. Test connection

**Settings**:
- Bot token
- Chat ID
- Enable/disable toggle

#### 2. Log Retention Policy

**Configure Days**:
- Audit logs (7-365 days, default: 90)
- Session logs (7-180 days, default: 30)
- Application logs (7-90 days, default: 30)
- Rate limit logs (1-30 days, default: 7)

**Auto-Cleanup**: Cron job runs daily at 2 AM

#### 3. Feature Flags

**Toggles**:
- Telegram alerts (enable/disable)
- Email alerts (enable/disable)

**Geolocation**: Always on-demand (no toggle needed)

#### 4. SMTP/Email Configuration

**Settings**:
- SMTP host (e.g., smtp.gmail.com)
- SMTP port (587, 465, or 1025 for MailHog)
- Use TLS/SSL toggle
- Authentication method (usually "password")
- Username/email
- Password/app password
- From address
- Enable/disable toggle

**Test Connection**: Button to verify SMTP works

**Supported Providers**:
- Gmail (requires app password)
- SendGrid
- AWS SES
- Outlook/Office365
- MailHog (local testing)
- Any SMTP server

#### 5. System Limits

**Configurable Limits**:
- Max file upload size (MB)
- Max avatar size (MB)
- Rate limit per minute
- Max login attempts
- Session timeout (minutes)

### Settings History

**Tracking**:
- All settings changes logged
- Shows old and new values
- Timestamp and admin who made change
- Visible in Audit Logs

---

## Mobile Support

### Responsive Design

**Breakpoints**:
- Mobile: < 768px
- Tablet: 768px - 992px
- Desktop: > 992px

**Optimizations**:
- Card-based layouts on mobile
- Touch-friendly buttons
- Collapsible menus
- Optimized tables
- Full functionality on all devices

**Mobile-Specific Features**:
- Cron jobs: Card view with all actions
- Alerts: Card view with notification channels
- Logs: Streamlined view with details modal
- Settings: Full-width forms

---

## Security Features

### Rate Limiting

**Protected Endpoints**:
- Login: 5 attempts per 15 minutes
- Registration: 3 attempts per hour
- Password reset: 3 attempts per hour
- All API routes: 60 requests per minute

**Behavior**:
- Returns 429 status when limited
- Includes retry-after header
- Logs all rate limit events
- Per-IP address tracking

### Session Security

**Features**:
- JWT-based sessions
- Secure HTTP-only cookies
- Session expiry (configurable)
- IP tracking
- User agent logging
- Failed login monitoring

### Admin Protection

**Middleware**:
- All `/admin` routes protected
- Requires ADMIN role
- Database re-validation (not just JWT)
- Checks on every request
- Audit logging for all actions

### Data Protection

**Measures**:
- Password hashing (bcrypt, 12 rounds)
- Sensitive data in environment variables
- SQL injection prevention (Prisma ORM)
- XSS protection
- CSRF tokens (NextAuth)
- Security headers middleware

---

## Notifications

### Telegram Notifications

**Setup**: Configure in Settings → Telegram Bot Configuration

**Supported Alerts**:
- Failed login attempts
- Error spikes
- Custom alerts

**Message Format**:
- Emoji indicators
- Severity level
- Timestamp
- Detailed metadata
- Formatted for readability

### Email Notifications

**Setup**: Configure in Settings → SMTP/Email Configuration

**Supported Alerts**:
- Failed login attempts
- Error spikes
- Custom alerts

**Email Format**:
- HTML templates
- Color-coded by severity
- Professional design
- Mobile-responsive
- Plain text fallback

**Additional Emails**:
- Email verification
- Password reset
- Welcome emails (optional)

---

## Dashboard

### User Dashboard (`/dashboard`)

**Features**:
- Welcome message
- Profile information
- Recent activity
- Quick actions
- Responsive layout

### Admin Dashboard (`/admin`)

**Overview**:
- User statistics
- Recent activity feed
- System health status
- Quick access to all admin features

**Navigation**:
- Users: User management
- Logs: View all logs
- Cron: Manage scheduled jobs
- Alerts: Configure notifications
- Settings: System configuration

---

## API Documentation

### Public Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (via NextAuth)
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/verify-email` - Verify email with token

### User Endpoints (Authenticated)

- `GET /api/user/profile` - Get user profile
- `PATCH /api/user/profile` - Update profile
- `POST /api/user/avatar` - Upload avatar

### Admin Endpoints (Admin Only)

- `GET /api/admin/users` - List users
- `PATCH /api/admin/users/[id]` - Update user
- `DELETE /api/admin/users/[id]` - Delete user
- `GET /api/admin/logs/*` - View logs
- `GET /api/admin/cron` - List cron jobs
- `POST /api/admin/cron/[id]/execute` - Execute job
- `GET /api/admin/alerts` - List alerts
- `POST /api/admin/alerts/[id]/test` - Test alert
- `GET /api/admin/settings` - Get settings
- `PUT /api/admin/settings` - Update settings
- `POST /api/admin/logs/geolocation` - Lookup IP geolocation

All admin endpoints require valid admin session.

---

## Tips & Best Practices

### For Admins

1. **Regular Monitoring**: Check logs weekly for suspicious activity
2. **Alert Configuration**: Set reasonable thresholds to avoid spam
3. **Log Retention**: Balance storage costs with compliance needs
4. **Geolocation**: Lookup only suspicious IPs to save API quota
5. **Email Testing**: Use MailHog for development before production SMTP

### For Developers

1. **Logging**: Use appropriate log levels (ERROR for bugs, INFO for events)
2. **Settings**: Add new settings to SystemSettings table, not .env
3. **Cron Jobs**: Use templates when possible for consistency
4. **Security**: Always validate admin role on sensitive endpoints
5. **Testing**: Test on mobile devices, not just desktop

### For Security

1. **Password Policy**: Enforce strong passwords in production
2. **Rate Limiting**: Adjust limits based on traffic patterns
3. **Session Timeout**: Set shorter timeouts for sensitive applications
4. **Audit Logs**: Review regularly for unauthorized access
5. **Alerts**: Enable failed login alerts immediately

---

## Troubleshooting

### Common Issues

**Can't login**:
- Check email is verified
- Try password reset
- Check rate limiting
- View session logs for error

**Emails not sending**:
- Test SMTP connection in Settings
- Check SMTP credentials
- Verify "enabled" toggle is on
- Check application logs for errors

**Alerts not triggering**:
- Verify alert is enabled
- Check cron job is running (`check_alerts`)
- Review alert conditions
- Test alert manually

**Geolocation not working**:
- IP must be public (not 127.0.0.1 or 192.168.x.x)
- Check internet connection
- API may be rate limited (wait and retry)
- Check browser console for errors

**Cron jobs not executing**:
- Check job is enabled
- View execution history for errors
- Verify app is running (not serverless without scheduler)
- Check system logs

For more help, see [ARCHITECTURE.md](ARCHITECTURE.md) or contact administrator.
