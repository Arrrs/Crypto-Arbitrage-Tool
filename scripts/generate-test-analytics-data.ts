import { prisma } from "../lib/prisma"

/**
 * Generate Test Analytics Data
 *
 * This script creates realistic test data for:
 * - User activity logs (last 90 days)
 * - Daily user stats (last 90 days)
 * - Hourly activity stats (last 7 days)
 * - Feature usage stats (last 30 days)
 * - Subscription change logs
 */

async function generateTestData() {
  console.log("🎲 Generating test analytics data...\n")

  // Get or create test users
  const testUsers = await getOrCreateTestUsers()
  console.log(`✅ Created ${testUsers.length} test users`)

  // Generate daily stats for last 90 days
  await generateDailyStats()
  console.log("✅ Generated daily user stats (90 days)")

  // Generate hourly stats for last 7 days
  await generateHourlyStats()
  console.log("✅ Generated hourly activity stats (7 days)")

  // Generate feature usage stats
  await generateFeatureUsageStats()
  console.log("✅ Generated feature usage stats (30 days)")

  // Generate user activity logs
  await generateUserActivityLogs(testUsers)
  console.log("✅ Generated user activity logs")

  // Generate subscription change logs
  await generateSubscriptionChanges(testUsers)
  console.log("✅ Generated subscription change logs")

  console.log("\n🎉 Test data generation complete!")
  console.log("\nYou can now:")
  console.log("1. Visit /admin/analytics to configure settings")
  console.log("2. Open Metabase and run queries")
  console.log("3. See realistic data in your dashboards")
}

async function getOrCreateTestUsers() {
  const users = []

  for (let i = 1; i <= 50; i++) {
    const user = await prisma.user.upsert({
      where: { email: `testuser${i}@example.com` },
      update: {},
      create: {
        email: `testuser${i}@example.com`,
        name: `Test User ${i}`,
        emailVerified: new Date(),
        isPaid: i <= 15, // 30% paid users
        createdAt: randomDateInPast(90),
      },
    })
    users.push(user)
  }

  return users
}

async function generateDailyStats() {
  const stats = []

  for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    date.setHours(0, 0, 0, 0)

    // Simulate growth over time
    const baseUsers = 10 + Math.floor((90 - daysAgo) * 0.5)
    const dailyVariation = Math.floor(Math.random() * 10)
    const totalUsers = baseUsers + dailyVariation

    const newUsers = daysAgo === 90 ? totalUsers : Math.floor(Math.random() * 5) + 1
    const activeUsers = Math.floor(totalUsers * (0.4 + Math.random() * 0.3)) // 40-70% active
    const paidUsers = Math.floor(totalUsers * 0.3) // 30% paid
    const freeUsers = totalUsers - paidUsers

    const totalLogins = Math.floor(activeUsers * (1 + Math.random() * 2)) // 1-3 logins per active user
    const failedLogins = Math.floor(totalLogins * 0.05) // 5% failed
    const totalPageViews = Math.floor(activeUsers * (10 + Math.random() * 20)) // 10-30 pages per user

    const mobileUsers = Math.floor(activeUsers * (0.4 + Math.random() * 0.2)) // 40-60% mobile
    const desktopUsers = Math.floor(activeUsers * (0.3 + Math.random() * 0.2)) // 30-50% desktop
    const tabletUsers = activeUsers - mobileUsers - desktopUsers

    const revenue = paidUsers * (29.99 + Math.random() * 20) // $29.99-$49.99 per paid user

    const newSubscriptions = Math.floor(newUsers * 0.15) // 15% convert immediately
    const cancelledSubscriptions = Math.floor(paidUsers * 0.02) // 2% churn

    await prisma.dailyUserStats.upsert({
      where: { date: date },
      update: {},
      create: {
        date: date,
        totalUsers,
        newUsers,
        activeUsers,
        paidUsers,
        freeUsers,
        totalLogins,
        failedLogins,
        totalPageViews,
        mobileUsers,
        desktopUsers,
        tabletUsers,
        topCountries: {
          US: Math.floor(activeUsers * 0.4),
          UK: Math.floor(activeUsers * 0.2),
          CA: Math.floor(activeUsers * 0.15),
          AU: Math.floor(activeUsers * 0.1),
          DE: Math.floor(activeUsers * 0.1),
        },
        revenue,
        newSubscriptions,
        cancelledSubscriptions,
      },
    })
  }
}

async function generateHourlyStats() {
  for (let hoursAgo = 168; hoursAgo >= 0; hoursAgo--) { // 7 days * 24 hours
    const hour = new Date()
    hour.setHours(hour.getHours() - hoursAgo, 0, 0, 0)

    // Simulate daily pattern (more activity during day)
    const hourOfDay = hour.getHours()
    const activityMultiplier = hourOfDay >= 8 && hourOfDay <= 22 ? 1.5 : 0.5

    const pageViews = Math.floor((50 + Math.random() * 100) * activityMultiplier)
    const uniqueVisitors = Math.floor((20 + Math.random() * 30) * activityMultiplier)
    const logins = Math.floor((10 + Math.random() * 20) * activityMultiplier)
    const errors = Math.floor(Math.random() * 5) // Random errors
    const errorRate = pageViews > 0 ? (errors / pageViews) * 100 : 0
    const apiCalls = Math.floor(pageViews * (2 + Math.random()))

    await prisma.hourlyActivityStats.upsert({
      where: { hour: hour },
      update: {},
      create: {
        hour,
        pageViews,
        uniqueVisitors,
        logins,
        errors,
        errorRate,
        apiCalls,
      },
    })
  }
}

async function generateFeatureUsageStats() {
  const features = [
    "Profile_Update",
    "Avatar_Upload",
    "2FA_Setup",
    "Dashboard_View",
    "Settings_Change",
    "Password_Change",
    "Export_Data",
    "Search_Feature",
    "Filter_Apply",
    "Report_Generate",
  ]

  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    date.setHours(0, 0, 0, 0)

    for (const feature of features) {
      const totalUses = Math.floor(10 + Math.random() * 100)
      const uniqueUsers = Math.floor(5 + Math.random() * 30)
      const freeUserUses = Math.floor(totalUses * 0.6)
      const paidUserUses = totalUses - freeUserUses

      await prisma.featureUsageStats.create({
        data: {
          date,
          featureName: feature,
          totalUses,
          uniqueUsers,
          freeUserUses,
          paidUserUses,
        },
      })
    }
  }
}

async function generateUserActivityLogs(users: any[]) {
  const activities = ["PAGE_VIEW", "FEATURE_USE", "BUTTON_CLICK", "FORM_SUBMIT"]
  const resources = [
    "/dashboard",
    "/profile",
    "/settings",
    "/admin",
    "/reports",
    "/analytics",
  ]
  const browsers = ["Chrome", "Firefox", "Safari", "Edge"]
  const devices = ["mobile", "desktop", "tablet"]
  const oses = ["Windows", "macOS", "iOS", "Android", "Linux"]
  const countries = ["US", "UK", "CA", "AU", "DE", "FR", "JP"]
  const cities = {
    US: ["New York", "Los Angeles", "Chicago", "Houston"],
    UK: ["London", "Manchester", "Birmingham"],
    CA: ["Toronto", "Vancouver", "Montreal"],
    AU: ["Sydney", "Melbourne", "Brisbane"],
    DE: ["Berlin", "Munich", "Hamburg"],
  }

  // Generate 1000 activity logs over last 7 days
  for (let i = 0; i < 1000; i++) {
    const user = users[Math.floor(Math.random() * users.length)]
    const timestamp = randomDateInPast(7)
    const country = countries[Math.floor(Math.random() * countries.length)]
    const cityList = cities[country as keyof typeof cities] || ["Unknown City"]

    await prisma.userActivityLog.create({
      data: {
        userId: user.id,
        activity: activities[Math.floor(Math.random() * activities.length)],
        resource: resources[Math.floor(Math.random() * resources.length)],
        action: "VIEW",
        metadata: {
          source: "web",
          campaign: Math.random() > 0.7 ? "summer_2025" : null,
        },
        userAgent: `Mozilla/5.0 (${oses[Math.floor(Math.random() * oses.length)]})`,
        deviceType: devices[Math.floor(Math.random() * devices.length)],
        browser: browsers[Math.floor(Math.random() * browsers.length)],
        os: oses[Math.floor(Math.random() * oses.length)],
        ipAddress: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        country: country,
        city: cityList[Math.floor(Math.random() * cityList.length)],
        duration: Math.floor(Math.random() * 5000) + 100, // 100-5100ms
        timestamp,
      },
    })
  }
}

async function generateSubscriptionChanges(users: any[]) {
  const paidUsers = users.filter((u) => u.isPaid)

  for (const user of paidUsers) {
    // Initial upgrade
    const upgradeDate = randomDateInPast(60)
    await prisma.subscriptionChangeLog.create({
      data: {
        userId: user.id,
        changeType: "UPGRADE",
        timestamp: upgradeDate,
        fromStatus: "free",
        toStatus: "paid",
        fromPlan: null,
        toPlan: "pro",
        amount: 29.99,
        currency: "USD",
        paymentMethod: "card",
        transactionId: `txn_${Math.random().toString(36).substr(2, 9)}`,
        reason: "User upgrade via checkout",
      },
    })

    // Some renewals
    if (Math.random() > 0.5) {
      const renewDate = new Date(upgradeDate)
      renewDate.setDate(renewDate.getDate() + 30)

      await prisma.subscriptionChangeLog.create({
        data: {
          userId: user.id,
          changeType: "RENEW",
          timestamp: renewDate,
          fromStatus: "paid",
          toStatus: "paid",
          fromPlan: "pro",
          toPlan: "pro",
          amount: 29.99,
          currency: "USD",
          paymentMethod: "card",
          transactionId: `txn_${Math.random().toString(36).substr(2, 9)}`,
          reason: "Automatic renewal",
        },
      })
    }
  }

  // Some cancellations
  const cancelUsers = paidUsers.slice(0, 3)
  for (const user of cancelUsers) {
    await prisma.subscriptionChangeLog.create({
      data: {
        userId: user.id,
        changeType: "CANCEL",
        timestamp: randomDateInPast(10),
        fromStatus: "paid",
        toStatus: "cancelled",
        fromPlan: "pro",
        toPlan: null,
        amount: 0,
        currency: "USD",
        reason: "User requested cancellation",
      },
    })
  }
}

function randomDateInPast(maxDaysAgo: number): Date {
  const now = new Date()
  const daysAgo = Math.floor(Math.random() * maxDaysAgo)
  const hoursAgo = Math.floor(Math.random() * 24)
  const minutesAgo = Math.floor(Math.random() * 60)

  now.setDate(now.getDate() - daysAgo)
  now.setHours(now.getHours() - hoursAgo)
  now.setMinutes(now.getMinutes() - minutesAgo)

  return now
}

// Run the script
generateTestData()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error("❌ Error generating test data:", e)
    await prisma.$disconnect()
    process.exit(1)
  })
