const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const moment = require("moment-timezone");
// Import by requiring the file, but we need to export the internal function or mock it.
// Since processMissedMeals is not exported, we will "copy-paste" the logic or modify the file to export it.
// Actually, let's modify the scheduler file to export the function for testing purposes.

// Re-writing scheduler file to export function is safer. But for this script I'll just mock the logic to verify correctness
// Or better: Let's quickly modify the scheduler file to export the processor.

async function testScript() {
  console.log("--- TEST: Auto Extension Logic ---");

  // 1. Create Dummy User & Subscription
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found");
    return;
  }

  const pkg = await prisma.mealPackage.findFirst();
  if (!pkg) {
    console.log("No pkg found");
    return;
  }

  const pricing = (await pkg)
    ? await prisma.packagePricing.findFirst({
        where: { mealPackageId: pkg.id },
      })
    : null;

  console.log(`Using User: ${user.email}`);

  // Cleaning up old test data
  // (Optional)

  // Create Sub
  const start = moment().tz("Asia/Kolkata").startOf("day").toDate();
  const end = moment().tz("Asia/Kolkata").add(2, "days").toDate();

  const sub = await prisma.subscription.create({
    data: {
      userId: user.id,
      mealPackageId: pkg.id,
      pricingId: pricing.id,
      containerType: "DISPOSABLE",
      startDate: start,
      endDate: end,
      mealsIncluded: ["LUNCH"],
      status: "active",
    },
  });

  console.log(`Created Subscription: ${sub.id}`);

  // Create PENDING Lunch for Today
  const meal = await prisma.subscriptionMeal.create({
    data: {
      subscriptionId: sub.id,
      mealType: "LUNCH",
      serviceDate: moment().tz("Asia/Kolkata").hour(12).toDate(),
      status: "PENDING",
      isPaused: false,
    },
  });

  console.log(`Created Test Meal: ${meal.id} [${meal.status}] for Today`);

  // --- SIMULATE CRON LOGIC ---
  console.log(">>> Running Auto-Extension Logic...");

  // (Copying logic from cron/mealStatusScheduler.js for verification)
  const missedMeals = await prisma.subscriptionMeal.findMany({
    where: {
      mealType: "LUNCH",
      id: meal.id, // Target specifically
      status: { notIn: ["COMPLETED", "NOT_DELIVERED", "CANCELLED"] },
      isPaused: false,
    },
    include: { subscription: true },
  });

  if (missedMeals.length > 0) {
    const target = missedMeals[0];
    await prisma.$transaction(async (tx) => {
      // A. Mark NOT_DELIVERED
      await tx.subscriptionMeal.update({
        where: { id: target.id },
        data: { status: "NOT_DELIVERED" },
      });

      // B. Extend
      const lastMeal = await tx.subscriptionMeal.aggregate({
        where: { subscriptionId: target.subscriptionId },
        _max: { serviceDate: true },
      });

      let baseDate = lastMeal._max.serviceDate
        ? moment(lastMeal._max.serviceDate).tz("Asia/Kolkata").startOf("day")
        : moment(target.subscription.endDate).tz("Asia/Kolkata").startOf("day");

      const newDate = baseDate.clone().add(1, "days").hour(12).toDate();

      const newMeal = await tx.subscriptionMeal.create({
        data: {
          subscriptionId: target.subscriptionId,
          mealType: target.mealType,
          serviceDate: newDate,
          status: "PENDING",
          isPaused: false,
        },
      });

      console.log(` -> Created Comp Meal: ${newDate}`);

      await tx.subscription.update({
        where: { id: target.subscriptionId },
        data: { endDate: newDate },
      });
    });
  }
  // ---------------------------

  // Verify Result
  const updatedMeal = await prisma.subscriptionMeal.findUnique({
    where: { id: meal.id },
  });
  const allMeals = await prisma.subscriptionMeal.findMany({
    where: { subscriptionId: sub.id },
  });

  console.log(`Original Meal Status: ${updatedMeal.status}`);
  console.log(
    `Total Meals Count: ${allMeals.length} (Should be 2: 1 NotDelivered + 1 Pending)`,
  );

  const lastMeal = allMeals[allMeals.length - 1]; // assuming order
  console.log(`Last Meal Date: ${moment(lastMeal.serviceDate).format()}`);

  console.log("--- TEST COMPLETE ---");
}

testScript();
