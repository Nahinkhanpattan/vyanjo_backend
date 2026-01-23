const cron = require("node-cron");
const prisma = require("../prisma");
const moment = require("moment-timezone");

async function processMissedMeals(targetMealType) {
  console.log(`[Cron] Processing Missed Meals for: ${targetMealType}`);

  try {
    const now = moment().tz("Asia/Kolkata");
    const todayStart = now.clone().startOf("day").toDate();
    const todayEnd = now.clone().endOf("day").toDate();

    // 1. Find all meals specifically for TODAY that are still PENDING (not COMPLETED, not PAUSED)
    // We only target the specific meal type (TIFFIN, LUNCH, DINNER)
    const missedMeals = await prisma.subscriptionMeal.findMany({
      where: {
        mealType: targetMealType,
        serviceDate: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: {
          notIn: ["COMPLETED", "NOT_DELIVERED", "CANCELLED"], // Target PENDING
        },
        isPaused: false,
      },
      include: {
        subscription: true, // Need end date to calculate extension
      },
    });

    console.log(
      `[Cron] Found ${missedMeals.length} missed ${targetMealType} meals.`,
    );

    if (missedMeals.length === 0) return;

    // Process each missed meal
    // We use a loop or map. For safety, individual processing or batched ID updates.
    // Since we need to extend EACH subscription individually (dates might differ), we iterate.

    let processedCount = 0;
    let extendedCount = 0;

    for (const meal of missedMeals) {
      await prisma.$transaction(async (tx) => {
        // A. Mark as NOT_DELIVERED
        await tx.subscriptionMeal.update({
          where: { id: meal.id },
          data: { status: "NOT_DELIVERED" },
        });

        // B. Extend Subscription
        // Logic: Find the current absolute last meal date of the subscription to append after.
        // Fallback to subscription.endDate if no meals found (unlikely).

        const lastMeal = await tx.subscriptionMeal.aggregate({
          where: { subscriptionId: meal.subscriptionId },
          _max: { serviceDate: true },
        });

        let baseDate = lastMeal._max.serviceDate
          ? moment(lastMeal._max.serviceDate).tz("Asia/Kolkata").startOf("day")
          : moment(meal.subscription.endDate).tz("Asia/Kolkata").startOf("day");

        // Next available day is Base + 1 Day
        const newDate = baseDate.clone().add(1, "days").hour(12).toDate(); // Standardize time

        // Create the replacement meal
        await tx.subscriptionMeal.create({
          data: {
            subscriptionId: meal.subscriptionId,
            mealType: meal.mealType,
            serviceDate: newDate,
            status: "PENDING",
            isPaused: false,
          },
        });

        // Update Subscription End Date
        await tx.subscription.update({
          where: { id: meal.subscriptionId },
          data: { endDate: newDate },
        });

        // C. Audit Log (Optional but good for tracking auto-extensions)
        await tx.mealPause.create({
          data: {
            subscriptionId: meal.subscriptionId,
            mealDate: meal.serviceDate, // original date
            mealType: meal.mealType,
            action: "AUTO_EXTEND", // Custom action tag
            pausedAt: new Date(),
          },
        });
      });
      processedCount++;
      extendedCount++;
    }

    console.log(
      `[Cron] Successfully processed ${processedCount} meals, extended ${extendedCount} subscriptions.`,
    );
  } catch (error) {
    console.error(
      `[Cron] Error processing missed meals for ${targetMealType}:`,
      error,
    );
  }
}

const initScheduler = () => {
  console.log("[Cron] Initializing Meal Status Scheduler...");

  // 1. Tiffin Check at 11:00 AM
  // Cron format: Minute Hour DayMonth Month DayWeek
  cron.schedule(
    "0 11 * * *",
    () => {
      processMissedMeals("TIFFIN");
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  // 2. Lunch Check at 4:00 PM (16:00)
  cron.schedule(
    "0 16 * * *",
    () => {
      processMissedMeals("LUNCH");
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  // 3. Dinner Check at 11:00 PM (23:00)
  cron.schedule(
    "0 23 * * *",
    () => {
      processMissedMeals("DINNER");
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  console.log(
    "[Cron] Scheduler active for 11AM (Tiffin), 4PM (Lunch), 11PM (Dinner).",
  );
};

module.exports = initScheduler;
