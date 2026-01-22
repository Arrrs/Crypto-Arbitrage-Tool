import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const adminEmail = "admin@example.com"
  const adminPassword = await hash("admin123", 12)

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

    console.log("Admin user created:")
    console.log("Email:", admin.email)
    console.log("Password: admin123")
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

    console.log("\nRegular user created:")
    console.log("Email:", user.email)
    console.log("Password: user123")
  } else {
    console.log("Test user already exists")
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
