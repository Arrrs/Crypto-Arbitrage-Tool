import { getRateLimits } from "@/lib/rate-limit"

async function main() {
  console.log("=== Verifying Rate Limit Configuration ===\n")

  const rateLimits = await getRateLimits()

  console.log("Dynamic rate limits from database:")
  console.log(JSON.stringify(rateLimits, null, 2))

  console.log("\n✅ PASSWORD_RESET rate limit:")
  console.log(`   Window: ${rateLimits.PASSWORD_RESET.windowMinutes} minutes`)
  console.log(`   Max attempts: ${rateLimits.PASSWORD_RESET.maxAttempts}`)
}

main()
  .catch(console.error)
