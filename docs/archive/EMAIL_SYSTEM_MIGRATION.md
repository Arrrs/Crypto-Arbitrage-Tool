# Email System Migration - .env to Database Configuration

## Overview

The email/SMTP system has been migrated from `.env` file configuration to database-driven configuration. This allows runtime updates to email settings without requiring application restarts.

## What Changed

### 1. New Email Library - `/lib/email-db.ts`

Created a new email library that reads SMTP configuration from the database instead of environment variables.

**Key Functions**:
- `getSMTPConfig()` - Retrieves SMTP settings from `system_settings` table
- `createTransporter()` - Creates Nodemailer transporter using DB config
- `sendEmail()` - Main email sending function
- `testSMTPConnection()` - Tests SMTP connection and sends test email
- `sendVerificationEmail()` - Sends email verification messages
- `sendPasswordResetEmail()` - Sends password reset messages

**Database Schema**:
```typescript
{
  key: "smtp_config",
  value: {
    enabled: boolean,
    host: string,         // e.g., "localhost", "smtp.gmail.com"
    port: number,         // e.g., 1025, 587, 465
    secure: boolean,      // true for port 465, false for 587, 1025
    auth: string,         // Authentication method (e.g., "password")
    user: string,         // SMTP username
    password: string,     // SMTP password
    from: string          // From email address
  }
}
```

### 2. Updated Files to Use New Library

All files that send emails now import from `/lib/email-db.ts` instead of `/lib/email.ts`:

- [/app/api/auth/register/route.ts](../app/api/auth/register/route.ts) - User registration verification emails
- [/app/api/auth/forgot-password/route.ts](../app/api/auth/forgot-password/route.ts) - Password reset emails
- [/app/api/user/profile/route.ts](../app/api/user/profile/route.ts) - Email change verification
- [/app/api/auth/resend-verification/route.ts](../app/api/auth/resend-verification/route.ts) - Resend verification emails

### 3. New API Endpoint - SMTP Test

Created [/app/api/admin/settings/smtp/test/route.ts](../app/api/admin/settings/smtp/test/route.ts)

**Endpoint**: `POST /api/admin/settings/smtp/test`

**Features**:
- Verifies SMTP connection using `transporter.verify()`
- Sends test email to configured "from" address
- Returns detailed error messages if connection fails
- Logs test attempts in admin action logs

**Response Example**:
```json
{
  "success": true,
  "message": "Test email sent successfully to noreply@example.com"
}
```

### 4. Settings UI Updates

Updated [/app/admin/settings/page.tsx](../app/admin/settings/page.tsx):

**Added Fields**:
- **Authentication Method** - New input field for auth method (default: "password")
  - Tooltip: "For MailHog and most SMTP servers, use 'password'"

**Added Button**:
- **Test Email Connection** - Calls the test API endpoint
  - Shows success/error messages
  - Loading state while testing

**Fixed Bug**:
- Page reload on tab switch now prevented
- Form data is preserved when switching browser tabs
- Only loads settings once on initial mount using `hasLoadedOnce` state

### 5. Environment Variables

Commented out deprecated variables in `.env`:

```bash
# Telegram Bot Configuration (DEPRECATED - Now configured in database settings)
# TELEGRAM_BOT_TOKEN="..."
# TELEGRAM_CHAT_ID="..."

# System Configuration (DEPRECATED - Now configured in database settings)
# LOG_RETENTION_DAYS=30
# ENABLE_GEOLOCATION=true

# SMTP Configuration (DEPRECATED - Now configured in database settings)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# ...
```

**Still Required in .env**:
- `DATABASE_URL` - Database connection
- `AUTH_SECRET` - NextAuth secret
- `NEXTAUTH_URL` - Application URL
- OAuth credentials (Google, GitHub)

## Testing with MailHog

### MailHog Configuration

MailHog is a local SMTP testing server that runs in Docker. Perfect for development!

**Settings to use**:
- **SMTP Host**: `localhost`
- **SMTP Port**: `1025`
- **Use TLS/SSL**: `false` (disabled)
- **Authentication Method**: `password`
- **Username**: `anything` (MailHog doesn't validate)
- **Password**: `anything` (MailHog doesn't validate)
- **From Address**: `noreply@example.com` (or any email)
- **Enable email notifications**: `true`

### How to Test

1. **Start MailHog** (if not already running):
   ```bash
   docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog
   ```

2. **Configure SMTP in Settings UI**:
   - Go to `/admin/settings`
   - Expand "📧 SMTP/Email Configuration"
   - Fill in the MailHog settings above
   - Click "Save Configuration"

3. **Test Connection**:
   - Click "Test Email Connection" button
   - Should see success message
   - Check MailHog web UI at `http://localhost:8025`
   - You should see the test email

4. **Test Actual Emails**:
   - Register a new user account
   - Request password reset
   - Change email address
   - All emails should appear in MailHog

## How It Works

### Startup Behavior

When SMTP is not configured or disabled:
- Emails are logged to console only
- No actual emails are sent
- Application continues to work normally

### Runtime Updates

1. Admin saves SMTP settings in UI
2. Settings saved to `system_settings` table
3. Next email send reads fresh config from database
4. No application restart needed!

### Email Flow

```
User triggers email action
    ↓
API calls sendVerificationEmail() or sendPasswordResetEmail()
    ↓
getSMTPConfig() reads from database
    ↓
createTransporter() builds Nodemailer transport
    ↓
sendEmail() sends message
    ↓
Success/error returned
```

### Fallback Behavior

If SMTP config is missing or disabled:
```typescript
// Creates a console-only transport
return nodemailer.createTransport({
  streamTransport: true,
  newline: "unix",
  buffer: true,
})
```

Emails are logged to console:
```
========== EMAIL SENT ==========
To: user@example.com
Subject: Verify your email address
================================
```

## Configuration Examples

### Gmail

```
Host: smtp.gmail.com
Port: 587
Secure: false
Auth: password
User: your-email@gmail.com
Password: your-app-password (from Google Account settings)
From: your-email@gmail.com
```

**Note**: Must enable "Less secure app access" or use App Password

### Outlook/Office365

```
Host: smtp.office365.com
Port: 587
Secure: false
Auth: password
User: your-email@outlook.com
Password: your-password
From: your-email@outlook.com
```

### SendGrid

```
Host: smtp.sendgrid.net
Port: 587
Secure: false
Auth: password
User: apikey
Password: your-sendgrid-api-key
From: noreply@yourdomain.com
```

### AWS SES

```
Host: email-smtp.us-east-1.amazonaws.com
Port: 587
Secure: false
Auth: password
User: your-smtp-username
Password: your-smtp-password
From: verified-email@yourdomain.com
```

### MailHog (Development)

```
Host: localhost
Port: 1025
Secure: false
Auth: password
User: anything
Password: anything
From: noreply@example.com
```

## Migration Checklist

- ✅ Created `/lib/email-db.ts` with database-backed email system
- ✅ Updated all API routes to use new email library
- ✅ Added SMTP test endpoint
- ✅ Added authentication field to settings UI
- ✅ Added test connection button to settings UI
- ✅ Fixed page reload issue on tab switch
- ✅ Commented out deprecated .env variables
- ✅ Verified all email-sending code paths work with new system

## Old System (DEPRECATED)

The old `/lib/email.ts` file still exists but is no longer used. It can be deleted safely, but has been kept for reference.

**Old behavior**:
- Read from `process.env.SMTP_HOST`, `process.env.SMTP_PORT`, etc.
- Required application restart to update settings
- Settings in `.env` file

**New behavior**:
- Read from database `system_settings` table
- Update settings at runtime via admin UI
- No restart required

## Benefits

1. **Runtime Configuration** - Update SMTP settings without restarting
2. **Admin UI** - Non-technical admins can configure email
3. **Test Function** - Verify settings before saving
4. **Multiple Environments** - Different settings per environment without code changes
5. **Audit Trail** - Settings changes logged in admin action logs
6. **Consistent** - Same pattern as Telegram, log retention, etc.

## Troubleshooting

### Test Connection Fails

**Error**: "Failed to connect to SMTP server"

**Solutions**:
- Verify host and port are correct
- Check firewall allows outbound connection
- Try toggling "Use TLS/SSL" setting
- For Gmail: Use App Password, not regular password
- For MailHog: Make sure Docker container is running

### Emails Not Sending

**Check**:
1. Is SMTP enabled in settings? (toggle switch)
2. Did test connection succeed?
3. Check application logs for errors
4. Verify "from" address is valid
5. Check admin action logs for send attempts

### MailHog Not Receiving Emails

**Check**:
1. Is MailHog running? `docker ps`
2. Is port 1025 exposed? Should see in `docker ps` output
3. Check MailHog UI at `http://localhost:8025`
4. Try sending test email from settings

### Form Data Lost on Tab Switch

This should now be fixed! The page only loads settings once on initial mount. If you still experience this:
- Clear browser cache
- Make sure you're on latest code
- Check browser console for errors

## Summary

The email system has been successfully migrated from environment variables to database configuration. All email-sending functionality now uses `/lib/email-db.ts`, settings can be updated via the admin UI, and the test connection feature allows verification before use.

The system works with any SMTP server including:
- Production servers (Gmail, SendGrid, AWS SES, etc.)
- Development servers (MailHog)
- No configuration (console logging only)

This provides maximum flexibility for different deployment scenarios while maintaining security and ease of use.
