const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const subId = "f20e66db-0324-4870-b557-b1fee8af95ae";
  const start = new Date("2026-01-13T18:30:00.000Z");
  const end = new Date("2026-01-15T00:00:00.000Z"); // Widened from 14th 18:30 to 15th 00:00

  console.log("Running Query with:");
  console.log("Sub:", subId);
  console.log("GTE:", start.toISOString());
  console.log("LT:", end.toISOString());

  // 1. Fetch Specific Meal
  const specificMeal = await prisma.subscriptionMeal.findUnique({
    where: { id: "685c5610-3ef1-4c4d-981c-19ad61ae83a6" },
  });
  console.log(
    "Specific Meal Date:",
    specificMeal ? specificMeal.serviceDate.toISOString() : "Not Found"
  );

  // 2. Widen Range
  const startWide = new Date("2026-01-12T00:00:00.000Z");
  const endWide = new Date("2026-01-15T00:00:00.000Z");

  const meals = await prisma.subscriptionMeal.findMany({
    where: {
      subscriptionId: subId,
      serviceDate: {
        gte: startWide,
        lt: endWide,
      },
      isPaused: false,
      mealType: { in: ["TIFFIN"] },
    },
  });

  console.log("Wide Search Result Count:", meals.length);
  meals.forEach((m) => console.log(`Found: ${m.serviceDate.toISOString()}`));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
