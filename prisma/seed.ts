import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com"
  const adminPassword = await hash(process.env.ADMIN_PASSWORD || "admin123", 12)

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        name: "Admin User",
        email: adminEmail,
        password: adminPassword,
        role: "ADMIN",
      },
    })

    console.log("Admin user created: ")
    console.log("Email: ", admin.email)
    console.log("Password: ", adminPassword)
  } else {
    console.log("Admin user already exists")
  }

  // Create a regular test user
  const userEmail = "user@example.com"
  const userPassword = await hash("user123", 12)

  const existingUser = await prisma.user.findUnique({
    where: { email: userEmail },
  })

  if (!existingUser) {
    const user = await prisma.user.create({
      data: {
        name: "Test User",
        email: userEmail,
        password: userPassword,
        role: "USER",
      },
    })

    console.log("\nRegular user created: ")
    console.log("Email: ", user.email)
    console.log("Password: ", userPassword)
  } else {
    console.log("Test user already exists")
  }

  // Get admin user for updatedBy reference
  const admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!admin) {
    console.log("Admin user not found, skipping system settings")
    return
  }

  // Seed system settings
  const systemSettings = [
    {
      key: "features",
      value: { geolocation: true, email_alerts: false, telegram_alerts: true },
      description: "Feature flags",
    },
    {
      key: "log_retention",
      value: { appLogs: 30, auditLogs: 90, sessionLogs: 30, rateLimitLogs: 7 },
      description: "Log retention policy (days)",
    },
    {
      key: "oauth_providers",
      value: {
        github: { enabled: false, clientId: "", clientSecret: "" },
        google: {
          enabled: true,
          clientId: process.env.GOOGLE_CLIENT_ID || "",
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        },
      },
      description: "OAuth provider configuration",
    },
    {
      key: "telegram_config",
      value: {
        chatId: process.env.TELEGRAM_CHAT_ID || "",
        enabled: false,
        botToken: process.env.TELEGRAM_BOT_TOKEN || "",
      },
      description: "Telegram bot configuration for alerts",
    },
    {
      key: "system_limits",
      value: {
        maxAvatarSizeMB: 2,
        maxFileUploadMB: 5,
        maxLoginAttempts: 5,
        maxSignupAttempts: 3,
        rateLimitPerMinute: 60,
        max2FASetupAttempts: 10,
        maxApiWriteAttempts: 30,
        signupWindowMinutes: 180,
        max2FAVerifyAttempts: 5,
        maxAdminReadAttempts: 100,
        apiWriteWindowMinutes: 1,
        maxAdminWriteAttempts: 30,
        maxFileUploadAttempts: 10,
        sessionTimeoutMinutes: 60,
        adminReadWindowMinutes: 1,
        maxEmailChangeAttempts: 3,
        adminWriteWindowMinutes: 1,
        fileUploadWindowMinutes: 60,
        twoFASetupWindowMinutes: 15,
        emailChangeWindowMinutes: 1440,
        maxPasswordResetAttempts: 5,
        twoFAVerifyWindowMinutes: 15,
        loginAttemptWindowMinutes: 15,
        maxPasswordChangeAttempts: 10,
        passwordResetWindowMinutes: 60,
        passwordChangeWindowMinutes: 60,
        maxEmailVerificationAttempts: 5,
        emailVerificationWindowMinutes: 60,
      },
      description: "System-wide limits and thresholds",
    },
    {
      key: "smtp_config",
      value: {
        auth: "password",
        from: process.env.SMTP_USER || "",
        host: process.env.SMTP_HOST || "localhost",
        port: parseInt(process.env.SMTP_PORT || "1025"),
        user: process.env.SMTP_USER || "",
        secure: process.env.SMTP_SECURE === "true",
        enabled: false,
        password: process.env.SMTP_PASSWORD || "",
      },
      description: "SMTP/Email configuration for notifications",
    },
  ]

  console.log("\nSeeding system settings...")
  for (const setting of systemSettings) {
    const existing = await prisma.systemSettings.findUnique({
      where: { key: setting.key },
    })

    if (!existing) {
      await prisma.systemSettings.create({
        data: {
          key: setting.key,
          value: setting.value,
          description: setting.description,
          updatedBy: admin.id,
        },
      })
      console.log(`  Created: ${setting.key}`)
    } else {
      console.log(`  Already exists: ${setting.key}`)
    }
  }
  console.log("System settings seeded")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
