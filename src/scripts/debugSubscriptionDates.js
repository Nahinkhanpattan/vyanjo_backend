const { PrismaClient } = require("@prisma/client");
const moment = require("moment-timezone");
const prisma = new PrismaClient();

async function checkDates() {
  const subId = "f20e66db-0324-4870-b557-b1fee8af95ae"; // User's problematic ID
  console.log(`Checking meals for subscription: ${subId}`);

  const meals = await prisma.subscriptionMeal.findMany({
    where: { subscriptionId: subId },
    orderBy: { serviceDate: "asc" },
  });

  console.log(`Found ${meals.length} meals.`);
  meals.forEach((m) => {
    const dbDate = m.serviceDate; // JS Date object (UTC)
    const istDate = moment(dbDate)
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD HH:mm:ss");
    console.log(
      `ID: ${m.id} | Type: ${
        m.mealType
      } | DB UTC: ${dbDate.toISOString()} | IST: ${istDate} | Paused: ${
        m.isPaused
      }`
    );
  });
}

checkDates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
