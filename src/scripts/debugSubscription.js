const prisma = require("../prisma");

async function main() {
  const subId = "69a3913c-c5d1-4772-b1d1-7c157d3a0224";

  console.log("Checking subscription:", subId);

  const sub = await prisma.subscription.findUnique({
    where: { id: subId },
  });

  if (!sub) {
    console.log("Subscription not found!");
    return;
  }

  console.log("Subscription:", sub);

  const meals = await prisma.subscriptionMeal.findMany({
    where: { subscriptionId: subId },
    orderBy: { serviceDate: "asc" },
  });

  console.log("Total Meals Found:", meals.length);

  if (meals.length > 0) {
    console.log("First Meal:", meals[0]);
    console.log("Last Meal:", meals[meals.length - 1]);

    // Check for future meals
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future = meals.filter((m) => new Date(m.serviceDate) >= today);
    console.log(
      "Future Meals Count (>= " + today.toISOString() + "):",
      future.length
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
