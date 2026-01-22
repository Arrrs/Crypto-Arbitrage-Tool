/**
 * Initialize Analytics Cron Jobs
 *
 * Run this script to set up analytics aggregation and cleanup cron jobs
 */

import { prisma } from "../lib/prisma"

async function initAnalyticsCrons() {
  console.log("🚀 Initializing analytics cron jobs...")

  const jobs = [
    {
      name: "aggregate_daily_stats",
      description: "Aggregate daily analytics data into summary table",
      schedule: "0 1 * * *", // Daily at 1 AM
      template: "aggregate_daily_stats",
      enabled: true,
    },
    {
      name: "aggregate_hourly_stats",
      description: "Aggregate hourly analytics data",
      schedule: "5 * * * *", // Hourly at :05 past the hour
      template: "aggregate_hourly_stats",
      enabled: true,
    },
    {
      name: "aggregate_feature_usage",
      description: "Aggregate feature usage statistics",
      schedule: "0 2 * * *", // Daily at 2 AM
      template: "aggregate_feature_usage",
      enabled: true,
    },
    {
      name: "cleanup_analytics_data",
      description: "Clean up old analytics data based on retention settings",
      schedule: "0 3 * * *", // Daily at 3 AM
      template: "cleanup_analytics_data",
      enabled: true,
    },
  ]

  for (const job of jobs) {
    try {
      const existing = await prisma.cronJob.findUnique({
        where: { name: job.name },
      })

      if (existing) {
        console.log(`  ℹ️  Cron job "${job.name}" already exists, skipping...`)
        continue
      }

      await prisma.cronJob.create({
        data: job,
      })

      console.log(`  ✅ Created cron job: ${job.name} (${job.schedule})`)
    } catch (error) {
      console.error(`  ❌ Failed to create "${job.name}":`, error)
    }
  }

  // Create analytics settings if not exists
  try {
    const settings = await prisma.analyticsSettings.findUnique({
      where: { id: "analytics_config" },
    })

    if (!settings) {
      await prisma.analyticsSettings.create({
        data: {
          id: "analytics_config",
        },
      })
      console.log("  ✅ Created default analytics settings")
    } else {
      console.log("  ℹ️  Analytics settings already exist")
    }
  } catch (error) {
    console.error("  ❌ Failed to create analytics settings:", error)
  }

  console.log("\n✨ Analytics cron jobs initialized!")
  console.log("\nScheduled jobs:")
  console.log("  • Daily Stats: Every day at 1:00 AM")
  console.log("  • Hourly Stats: Every hour at :05")
  console.log("  • Feature Usage: Every day at 2:00 AM")
  console.log("  • Cleanup: Every day at 3:00 AM")
  console.log("\nYou can manage these in the Admin > Cron Jobs panel.")
}

initAnalyticsCrons()
  .then(() => {
    console.log("\n✅ Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Error:", error)
    process.exit(1)
  })
