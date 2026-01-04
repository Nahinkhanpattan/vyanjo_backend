
const { PrismaClient } = require("@prisma/client");
const bcrypt = require('bcrypt'); // or bcrypt, depending on package.json. Checking imports usually helps.
// Assuming bcryptjs based on typical express apps, but will check package.json if fails.
// Using 'bcrypt' might need compilation. Let's try to detect or just use what authController uses.
// Reviewing authController.js in next step if unsure, but standardizing on bcryptjs is safer if not sure.

// Better strategy: Read package.json first? No, I'll write the file and if it fails due to missing package I'll fix.
// Actually, let's check package.json first to be sure.
const prisma = new PrismaClient();

async function main() {
  const email = "admin@vyanjo.com";
  const password = "admin123";
  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashedPassword,
      name: "Super Admin",
      role: "ADMIN",
      isActive: true, // Ensure active
      phoneNumber: "0000000000",
    },
  });

  console.log({ admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
