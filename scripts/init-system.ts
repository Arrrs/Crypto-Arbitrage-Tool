/**
 * System Initialization Script
 * Run this after deploying to set up default data
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🚀 Initializing system...")

  // 1. Initialize Cron Jobs
  console.log("\n📅 Setting up cron jobs...")
  await prisma.cronJob.upsert({
    where: { name: "log_cleanup" },
    create: {
      name: "log_cleanup",
      description: "Clean up old log entries based on retention policy",
      schedule: "0 2 * * *", // Daily at 2 AM
      enabled: true,
    },
    update: {},
  })

  await prisma.cronJob.upsert({
    where: { name: "system_health_check" },
    create: {
      name: "system_health_check",
      description: "Monitor system health and trigger alerts",
      schedule: "*/15 * * * *", // Every 15 minutes
      enabled: true,
    },
    update: {},
  })

  await prisma.cronJob.upsert({
    where: { name: "analytics_refresh" },
    create: {
      name: "analytics_refresh",
      description: "Pre-calculate analytics data for dashboard",
      schedule: "0 */6 * * *", // Every 6 hours
      enabled: true,
    },
    update: {},
  })

  await prisma.cronJob.upsert({
    where: { name: "check_alerts" },
    create: {
      name: "check_alerts",
      description: "Check alert conditions and trigger notifications",
      schedule: "*/5 * * * *", // Every 5 minutes
      enabled: true,
      template: "CHECK_ALERTS",
    },
    update: {},
  })

  await prisma.cronJob.upsert({
    where: { name: "cleanup_expired_email_changes" },
    create: {
      name: "cleanup_expired_email_changes",
      description: "Cleanup expired, cancelled, or finalized pending email changes",
      schedule: "0 */6 * * *", // Every 6 hours
      enabled: true,
    },
    update: {},
  })
  console.log("✅ Cron jobs initialized")

  // 2. Initialize System Settings
  console.log("\n⚙️  Setting up system settings...")
  await prisma.systemSettings.upsert({
    where: { key: "log_retention" },
    create: {
      key: "log_retention",
      value: {
        auditLogs: 90, // days
        sessionLogs: 30,
        appLogs: 30,
        rateLimitLogs: 7,
      },
      description: "Log retention policy (days)",
    },
    update: {},
  })

  await prisma.systemSettings.upsert({
    where: { key: "telegram_config" },
    create: {
      key: "telegram_config",
      value: {
        enabled: false,
        botToken: "",
        chatId: "",
      },
      description: "Telegram bot configuration for alerts",
    },
    update: {},
  })

  await prisma.systemSettings.upsert({
    where: { key: "features" },
    create: {
      key: "features",
      value: {
        geolocation: true,
        telegram_alerts: false,
        email_alerts: false,
      },
      description: "Feature flags",
    },
    update: {},
  })

  // SMTP Configuration
  await prisma.systemSettings.upsert({
    where: { key: "smtp_config" },
    create: {
      key: "smtp_config",
      value: {
        enabled: false,
        host: "",
        port: 587,
        secure: false,
        user: "",
        password: "",
        from: "noreply@example.com",
      },
      description: "SMTP/Email configuration for notifications",
    },
    update: {},
  })

  // OAuth Providers
  await prisma.systemSettings.upsert({
    where: { key: "oauth_providers" },
    create: {
      key: "oauth_providers",
      value: {
        google: {
          enabled: false,
          clientId: "",
          clientSecret: "",
        },
        github: {
          enabled: false,
          clientId: "",
          clientSecret: "",
        },
      },
      description: "OAuth provider configuration",
    },
    update: {},
  })

  // System Limits
  await prisma.systemSettings.upsert({
    where: { key: "system_limits" },
    create: {
      key: "system_limits",
      value: {
        maxFileUploadMB: 5,
        maxAvatarSizeMB: 2,
        rateLimitPerMinute: 60,
        maxLoginAttempts: 5,
        loginAttemptWindowMinutes: 15,
        maxPasswordResetAttempts: 3,
        passwordResetWindowMinutes: 60,
        sessionTimeoutMinutes: 60,
      },
      description: "System-wide limits and thresholds",
    },
    update: {},
  })

  console.log("✅ System settings initialized")

  // 3. Initialize Default Alerts
  console.log("\n🔔 Setting up default alerts...")

  // Failed Login Alert
  const failedLoginAlert = await prisma.alert.upsert({
    where: { id: "failed-login-alert" }, // Use a stable ID
    create: {
      id: "failed-login-alert",
      name: "Failed Login Attempts",
      description: "Alert when multiple failed login attempts are detected from the same IP",
      type: "SECURITY",
      condition: {
        type: "failed_logins",
        threshold: 5,
        timeWindow: 15, // minutes
      },
      enabled: true,
      cooldown: 900, // 15 minutes
    },
    update: {},
  })

  // Error Spike Alert
  const errorSpikeAlert = await prisma.alert.upsert({
    where: { id: "error-spike-alert" },
    create: {
      id: "error-spike-alert",
      name: "Error Spike Detected",
      description: "Alert when error count exceeds threshold in a short time",
      type: "ERROR",
      condition: {
        type: "error_spike",
        threshold: 10,
        timeWindow: 5, // minutes
      },
      enabled: true,
      cooldown: 600, // 10 minutes
    },
    update: {},
  })

  console.log("✅ Default alerts initialized")

  // 4. Display summary
  console.log("\n" + "=".repeat(50))
  console.log("✨ System initialization complete!")
  console.log("=".repeat(50))
  console.log("\n📊 Summary:")

  const cronCount = await prisma.cronJob.count()
  const alertCount = await prisma.alert.count()
  const settingsCount = await prisma.systemSettings.count()

  console.log(`  • Cron Jobs: ${cronCount}`)
  console.log(`  • Alerts: ${alertCount}`)
  console.log(`  • System Settings: ${settingsCount}`)

  console.log("\n📝 Next Steps:")
  console.log("  1. Configure Telegram bot in /admin/settings (optional)")
  console.log("  2. Review and adjust log retention policies")
  console.log("  3. Enable/disable alerts as needed")
  console.log("  4. Monitor cron job executions in /admin/cron")
  console.log("\n🎉 Ready to use!\n")
}

main()
  .catch((e) => {
    console.error("❌ Initialization failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
