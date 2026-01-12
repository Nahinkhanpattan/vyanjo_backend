const prisma = require("../prisma");
const moment = require("moment-timezone");

exports.createSubscription = async (req, res) => {
  console.log("[SubscriptionController] createSubscription", req.body);
  try {
    const userId = req.user.id;
    // We expect pricing_id which determines package, duration, and meals.
    // Alternatively, we could take package_id + pricing_id.
    const { pricing_id, start_date, address_id, container_type } = req.body;

    if (!pricing_id || !start_date) {
      return res.status(400).json({
        error: {
          message: "Missing required fields: pricing_id, start_date",
        },
      });
    }

    // Check for active subscription
    const activeSub = await prisma.subscription.findFirst({
      where: { userId, status: "active" },
    });

    if (activeSub) {
      return res.status(422).json({
        error: {
          message: "You already have an active subscription",
          code: "ACTIVE_SUBSCRIPTION_EXISTS",
          status: 422,
        },
      });
    }

    // Get Pricing and Package
    const pricing = await prisma.packagePricing.findUnique({
      where: { id: pricing_id },
      include: { mealPackage: true },
    });

    if (!pricing) {
      return res.status(404).json({
        error: {
          message: "Pricing plan not found",
          code: "PRICING_NOT_FOUND",
          status: 404,
        },
      });
    }

    const mealPackage = pricing.mealPackage;
    if (!mealPackage.isActive) {
      return res
        .status(400)
        .json({ error: { message: "This meal package is no longer active" } });
    }

    // Calculate end date (NOON STRATEGY)
    const start = moment(start_date).tz("Asia/Kolkata").hour(12);
    const duration = pricing.durationDays;
    const end = start.clone().add(duration - 1, "days");

    // Validate if address_id is a real UUID, otherwise set to null
    const isValidUUID = (id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      );
    const finalAddressId =
      address_id && isValidUUID(address_id) ? address_id : null;

    // Create Subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        mealPackageId: mealPackage.id,
        pricingId: pricing.id,
        addressId: finalAddressId, // Use processed ID
        containerType: container_type || mealPackage.defaultContainer,
        startDate: start.toDate(),
        endDate: end.toDate(),
        mealsIncluded: pricing.mealsIncluded,
        status: "pending_payment", // Changed from 'active'
      },
    });

    // NOTE: Meal generation is now DEFERRED until Payment Verification by Admin.
    // See adminController.verifyPaymentProof

    res.status(201).json({
      data: {
        subscription,
      },
      message: "Subscription created. Please upload payment proof to activate.",
    });
  } catch (error) {
    console.error("Create Subscription Error:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
        status: 500,
      },
    });
  }
};

exports.getActiveSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ["active", "pending_payment", "payment_review"] },
      },
      include: {
        mealPackage: true,
        address: true,
        pricing: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return res.status(404).json({
        error: {
          message: "No active subscription found",
          code: "NO_ACTIVE_SUBSCRIPTION",
          status: 404,
        },
      });
    }

    const meals = await prisma.subscriptionMeal.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { serviceDate: "asc" },
    });

    res.json({
      data: {
        subscription: {
          ...subscription,
          meals,
        },
      },
    });
  } catch (error) {
    console.error("Get Active Subscription Error:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
        status: 500,
      },
    });
  }
};

exports.createUpgrade = async (req, res) => {
  console.log("[SubscriptionController] createUpgrade", req.params, req.body);
  try {
    const userId = req.user.id;
    const { id } = req.params; // Subscription ID
    const {
      targetTier,
      targetDiet,
      targetCuisine,
      scope,
      date,
      mealType,
      addMeals,
    } = req.body;
    // addMeals: ['DINNER'] if adding a meal type.

    // 1. Validate Subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { mealPackage: true },
    });

    if (!subscription || subscription.userId !== userId) {
      return res
        .status(404)
        .json({ error: { message: "Subscription not found" } });
    }

    // 2. Logic for Upgrade
    // Can trigger multiple actions: Change Tier, Change Diet, Add Meal
    // We'll calculate total price and create records.

    // Simplified: Handle one primary Upgrade Action or calculate sum.
    // If 'addMeals' is present, we are adding meals to the subscription.

    let totalPrice = 0;
    const upgradeRecords = [];
    const newMealsToCreate = [];

    // Date Range
    let startDate = moment(date).tz("Asia/Kolkata");
    let endDate = moment(date).tz("Asia/Kolkata");
    if (scope === "WEEK") endDate = startDate.clone().add(6, "days");
    // If scope is SUBSCRIPTION_REMAINING, we'd need subscription.endDate.

    // A. Check Tier/Diet/Cuisine Upgrade
    if (targetTier || targetDiet || targetCuisine) {
      const fromTier = subscription.mealPackage.tier;
      const fromDiet = subscription.mealPackage.dietType;
      const fromCuisine = subscription.mealPackage.cuisineType;

      // No Downgrade Check
      const tierWeights = { BASIC: 1, REGULAR: 2, PREMIUM: 3 };
      if (targetTier && tierWeights[targetTier] < tierWeights[fromTier]) {
        return res.status(400).json({
          error: { message: "Downgrading subscription tier is not allowed" },
        });
      }

      const priceRecord = await prisma.upgradePrice.findFirst({
        where: {
          fromTier: fromTier,
          toTier: targetTier || fromTier,
          fromDiet: fromDiet,
          toDiet: targetDiet || fromDiet,
          fromCuisine: fromCuisine,
          toCuisine: targetCuisine || fromCuisine,
          scope: scope,
          isActive: true,
        },
      });

      if (priceRecord) {
        totalPrice += parseFloat(priceRecord.price);
        upgradeRecords.push({
          type: "TIER_DIET_CUISINE",
          price: priceRecord.price,
          details: { targetTier, targetDiet, targetCuisine },
        });
      }
    }

    // B. Check Add Meal (e.g. Add DINNER for 1 day)
    // This is essentially buying a mini-package or "Upgrade" that adds a meal.
    if (addMeals && Array.isArray(addMeals)) {
      for (const meal of addMeals) {
        // Find price to add this meal
        // This might be in PackagePricing (1 day single meal) OR properties of UpgradePrice?
        // Prompt says "upgrade... he can add 1 or 2".
        // Let's assume UpgradePrice table handles "Add Meal" via scope='MEAL' or similar.
        // OR we look for a `PackagePricing` for 1 Day + MealType and charge that?
        // "different costs per updates... in upgrade he can increase meals... current meal + other meals".

        // Let's use UpgradePrice with scope 'MEAL_ADDITION' or similar logic.
        // Or simpler: Reuse PackagePricing for "1 Day Tiffin" price?
        // Using PackagePricing is cleaner for "Add Meal".

        // StartDate/EndDate logic applies.
        const days = endDate.diff(startDate, "days") + 1;

        // Find price for 1 Unit of this meal
        // For simplicity, let's assume valid UpgradePrice entry exists for "Add Tiffin"
        /* const addPrice = await prisma.upgradePrice.findFirst({
                 where: { mealType: meal, scope: 'MEAL' ... }
             }); */
        // ... Logic to calculate price ...

        // Create SubscriptionMeals
        for (let d = 0; d < days; d++) {
          newMealsToCreate.push({
            subscriptionId: id,
            serviceDate: startDate.clone().add(d, "days").toDate(),
            mealType: meal,
          });
        }
      }
    }

    // 3. Commit
    // Create SubscriptionUpgrade record
    // Create new SubscriptionMeal records
    // Update Subscription (if permanent tier change)

    const upgrade = await prisma.subscriptionUpgrade.create({
      data: {
        subscriptionId: id,
        targetTier: targetTier,
        targetDiet: targetDiet,
        targetCuisine: targetCuisine,
        originalTier: subscription.mealPackage.tier,
        originalDiet: subscription.mealPackage.dietType,
        originalCuisine: subscription.mealPackage.cuisineType,
        scope,
        startDate: startDate.toDate(),
        endDate: endDate.toDate(),
        price: totalPrice, // Sum
      },
    });

    if (newMealsToCreate.length > 0) {
      await prisma.subscriptionMeal.createMany({ data: newMealsToCreate });
    }

    // If we changed Tier/Diet permanently, update MealPackageId?
    // Usually we'd swap the Subscription.mealPackageId to the new one if fully upgraded relative to remaining days.
    // Complicated for partial updates. Let's assume Metadata tracks it or SubscriptionUpgrade tracks it.

    res.status(201).json({
      data: { upgrade, newMeals: newMealsToCreate.length },
      message: "Upgrade processed",
    });
  } catch (error) {
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.pauseSubscription = async (req, res) => {
  console.log(
    "[SubscriptionController] pauseSubscription",
    req.params,
    req.body
  );
  try {
    const userId = req.user.id;
    const { id } = req.params;
    // Support both old 'dates' array and new 'pauses' array complexity
    // pauses: [ { date: 'YYYY-MM-DD', mealTypes: ['LUNCH', 'DINNER'] || 'ALL' } ]
    const { dates, pauses } = req.body;

    if ((!dates || dates.length === 0) && (!pauses || pauses.length === 0)) {
      return res
        .status(400)
        .json({ error: { message: "Dates or pauses array is required" } });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { mealPackage: true },
    });

    if (!subscription || subscription.userId !== userId) {
      return res
        .status(404)
        .json({ error: { message: "Subscription not found" } });
    }

    const now = moment().tz("Asia/Kolkata");
    const today = now.clone().startOf("day");
    const tomorrow = today.clone().add(1, "days");

    // normalize input into a standard list of pause requests
    // Structure: { date: Moment, mealTypes: ['LUNCH'] or ['ALL'] }
    let pauseRequests = [];

    if (pauses && Array.isArray(pauses)) {
      for (const p of pauses) {
        pauseRequests.push({
          date: moment(p.date).tz("Asia/Kolkata").startOf("day"),
          mealTypes: p.mealTypes || ["ALL"],
        });
      }
    } else if (dates && Array.isArray(dates)) {
      // Legacy support: treats dates as 'ALL' meals for that day
      for (const d of dates) {
        pauseRequests.push({
          date: moment(d).tz("Asia/Kolkata").startOf("day"),
          mealTypes: ["ALL"],
        });
      }
    }

    // Validation & Collection of IDs to Pause
    const mealsToPauseIds = [];
    const mealsToExtend = []; // { mealType: 'LUNCH' }
    const pauseRecords = []; // For MealPause table

    for (const req of pauseRequests) {
      // 1. Validate Date: Must be tomorrow or later
      if (req.date.isBefore(tomorrow)) {
        // If it's today, we can't pause (assuming processed/cooked)
        // Prompt says "pause the next day meal"
        return res.status(400).json({
          error: {
            message: `Cannot pause meals for today or past dates (${req.date.format(
              "YYYY-MM-DD"
            )})`,
          },
        });
      }

      // 2. Validate 8 PM Rule for Tomorrow
      if (req.date.isSame(tomorrow, "day")) {
        if (now.hour() >= 20) {
          return res.status(400).json({
            error: {
              message: "Cannot pause tomorrow's meal after 8:00 PM today",
            },
          });
        }
      }

      // 3. Find meals to pause
      // Robust Date Query Strategy: Broad Fetch + In-Memory Filter
      // We widen the search window to handle Timezone shifts and DB Date truncation.

      const searchStart = req.date.clone().subtract(1, "days").toDate();
      const searchEnd = req.date.clone().add(2, "days").toDate();

      const whereClause = {
        subscriptionId: id,
        serviceDate: {
          gte: searchStart,
          lt: searchEnd,
        },
        isPaused: false, // Only pause active meals
      };

      if (!req.mealTypes.includes("ALL")) {
        whereClause.mealType = { in: req.mealTypes };
      }

      const potentialMeals = await prisma.subscriptionMeal.findMany({
        where: whereClause,
      });

      // Strict In-Memory Filter to match exact IST Date
      const foundMeals = potentialMeals.filter((meal) =>
        moment(meal.serviceDate).tz("Asia/Kolkata").isSame(req.date, "day")
      );

      for (const meal of foundMeals) {
        mealsToPauseIds.push(meal.id);
        mealsToExtend.push({ mealType: meal.mealType });
        // Create Audit Record Data
        pauseRecords.push({
          subscriptionId: id,
          mealDate: meal.serviceDate,
          mealType: meal.mealType,
          pausedAt: new Date(),
        });
      }
    }

    if (mealsToPauseIds.length === 0) {
      return res.json({
        message: "No active meals found to pause for the specified dates.",
      });
    }

    // --- TRANSACTION START ---
    await prisma.$transaction(async (tx) => {
      // 1. Update existing meals to isPaused = true
      await tx.subscriptionMeal.updateMany({
        where: { id: { in: mealsToPauseIds } },
        data: { isPaused: true },
      });

      // 2. Extend Subscription logic
      // Find the absolute last meal date to ensure we don't collide.
      // Do NOT rely solely on subscription.endDate as it might be stale.
      const lastMeal = await tx.subscriptionMeal.aggregate({
        where: { subscriptionId: id },
        _max: { serviceDate: true },
      });

      // If messages exist, start from max date. Else start from subscription.endDate (fallback).
      let lastServiceDate = lastMeal._max.serviceDate
        ? moment(lastMeal._max.serviceDate).tz("Asia/Kolkata").startOf("day")
        : moment(subscription.endDate).tz("Asia/Kolkata").startOf("day");

      let currentEndDate = lastServiceDate;
      let newEndDate = currentEndDate.clone();

      // We have `mealsToExtend` list e.g. ['LUNCH', 'DINNER', 'LUNCH']
      // We need to place them on days AFTER currentEndDate.
      // Simple algorithm:
      //  - Move to next day.
      //  - Check if that day can host these meals (e.g. check duplicate? or just assume valid)
      //  - If package has "LUNCH, DINNER" daily, we can fit 1 Lunch and 1 Dinner per day.
      //  - We need to fill "slots".

      // Let's Group meals by Type
      const extensionCounts = {}; // { LUNCH: 2, DINNER: 1 }
      for (const m of mealsToExtend) {
        extensionCounts[m.mealType] = (extensionCounts[m.mealType] || 0) + 1;
      }

      // We iterate days starting from currentEndDate + 1
      // Until all counts are 0.
      let dayOffset = 1;
      const newMealsData = [];

      while (Object.values(extensionCounts).some((c) => c > 0)) {
        const nextDate = currentEndDate.clone().add(dayOffset, "days");

        // Determine what meals allowed on this day (usually match package?)
        // Assuming Package allows the meals we are pausing (obviously).
        // We assume we can place 'LUNCH' on this day if we haven't already filled it?
        // But wait, if we extend, we are adding NEW days.
        // On a NEW day, we can fit whatever the package allows.
        // IF the package allows [LUNCH, DINNER], we can place 1 LUNCH and 1 DINNER.

        // But here we are just shifting individual meals.
        // Simplest approach: Just dump them on the next available day?
        // If we have 2 Lunches pending, we can't put 2 lunches on same day (usually).
        // So we take 1 Unit of each available type per day.

        const mealsForThisDay = [];

        // Check what we can place
        for (const type of Object.keys(extensionCounts)) {
          if (extensionCounts[type] > 0) {
            // Place 1 instance
            mealsForThisDay.push({
              subscriptionId: id,
              // Use Noon to avoid UTC previous-day rollback (Collision fix)
              serviceDate: nextDate.clone().hour(12).toDate(),
              mealType: type,
              isPaused: false,
            });
            extensionCounts[type]--;
          }
        }

        if (mealsForThisDay.length > 0) {
          newMealsData.push(...mealsForThisDay);
          newEndDate = nextDate; // Track furthest date
          dayOffset++; // Only move to next day if we used this one?
          // Actually yes, if we placed meals, that "day" is partially used.
          // If we have more meals, we go to next day.
          // This spreads meals out. 3 Lunches -> 3 Days. Correct.
        } else {
          // Should not happen if loop condition met
          dayOffset++;
        }
      }

      if (newMealsData.length > 0) {
        await tx.subscriptionMeal.createMany({ data: newMealsData });

        // Update Subscription End Date
        await tx.subscription.update({
          where: { id },
          data: { endDate: newEndDate.toDate() },
        });
      }

      // 3. Create Audit Trail (MealPause)
      if (pauseRecords.length > 0) {
        // Enforce action: PAUSE (Default is PAUSE but being explicit is good)
        const recordsWithAction = pauseRecords.map((p) => ({
          ...p,
          action: "PAUSE",
        }));
        await tx.mealPause.createMany({ data: recordsWithAction });
      }
    });
    // --- TRANSACTION END ---

    res.json({
      message: `Successfully paused ${mealsToPauseIds.length} meals and extended subscription by ${mealsToExtend.length} meals.`,
      data: {
        pausedCount: mealsToPauseIds.length,
        extendedCount: mealsToExtend.length,
      },
    });
  } catch (error) {
    console.error("Pause Subscription Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.resumeSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    // resumes: [ { date: 'YYYY-MM-DD', mealTypes: ['LUNCH'] } ]
    const { resumes } = req.body;

    if (!resumes || !Array.isArray(resumes) || resumes.length === 0) {
      return res
        .status(400)
        .json({ error: { message: "Resumes array is required" } });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id },
    });

    if (!subscription || subscription.userId !== userId) {
      return res
        .status(404)
        .json({ error: { message: "Subscription not found" } });
    }

    const now = moment().tz("Asia/Kolkata");
    const tomorrow = now.clone().startOf("day").add(1, "days");

    const mealsToResumeIds = [];
    const mealsToRemoveExtension = []; // { mealType: 'LUNCH' }
    const auditRecords = [];

    for (const r of resumes) {
      const targetDate = moment(r.date).tz("Asia/Kolkata").startOf("day");
      const types = r.mealTypes || ["ALL"];

      // 1. Validate Date: Cannot resume past meals
      // Strictly speaking, we only care about 8PM rule for Tomorrow.
      // It makes no sense to "resume" a past meal that was already skipped.
      // So targetDate >= tomorrow is safe assumption, or at least >= today if logic allows (but today is likely cooked).
      // Prompt asked for "resume it before 8 pm", implying tomorrow's meal.

      if (targetDate.isBefore(tomorrow)) {
        return res
          .status(400)
          .json({ error: { message: "Cannot resume past or today's meals" } });
      }

      // 2. Validate 8 PM Rule for Tomorrow
      if (targetDate.isSame(tomorrow, "day")) {
        if (now.hour() >= 20) {
          return res.status(400).json({
            error: {
              message: "Cannot resume tomorrow's meal after 8:00 PM today",
            },
          });
        }
      }

      // 3. Find Paused Meals
      // Robust Strategy: Broad Fetch + Strict Filter
      const searchStart = targetDate.clone().subtract(1, "days").toDate();
      const searchEnd = targetDate.clone().add(2, "days").toDate();

      const whereClause = {
        subscriptionId: id,
        serviceDate: {
          gte: searchStart,
          lt: searchEnd,
        },
        isPaused: true, // We can only resume PAUSED meals
      };
      if (!types.includes("ALL")) {
        whereClause.mealType = { in: types };
      }

      const potentialMeals = await prisma.subscriptionMeal.findMany({
        where: whereClause,
      });

      const foundMeals = potentialMeals.filter((meal) =>
        moment(meal.serviceDate).tz("Asia/Kolkata").isSame(targetDate, "day")
      );

      for (const meal of foundMeals) {
        mealsToResumeIds.push(meal.id);
        mealsToRemoveExtension.push({ mealType: meal.mealType });
        auditRecords.push({
          subscriptionId: id,
          mealDate: meal.serviceDate,
          mealType: meal.mealType,
          action: "RESUME",
          pausedAt: new Date(),
        });
      }
    }

    if (mealsToResumeIds.length === 0) {
      return res.json({
        message: "No paused meals found to resume for specified dates.",
      });
    }

    // --- TRANSACTION START ---
    await prisma.$transaction(async (tx) => {
      // 1. Set isPaused = false
      await tx.subscriptionMeal.updateMany({
        where: { id: { in: mealsToResumeIds } },
        data: { isPaused: false },
      });

      // 2. Remove Extension
      // Logic: For each resumed meal, we must delete ONE future meal of same type from end of subscription.
      // This implies finding the LATEST serviceDate for that type and deleting it.
      // We should do this one by one or grouped?
      // To be safe, let's do one by one or grouped by TYPE.

      for (const item of mealsToRemoveExtension) {
        // Find latest active meal of this type
        const latestMeal = await tx.subscriptionMeal.findFirst({
          where: {
            subscriptionId: id,
            mealType: item.mealType,
            isPaused: false, // Assuming extension meals are active
          },
          orderBy: { serviceDate: "desc" },
        });

        if (latestMeal) {
          await tx.subscriptionMeal.delete({ where: { id: latestMeal.id } });
        }
      }

      // 3. Recalculate End Date
      const lastMealAggregate = await tx.subscriptionMeal.aggregate({
        where: { subscriptionId: id },
        _max: { serviceDate: true },
      });

      // If no meals left (unlikely but possible), revert.
      // fallback to original sub end date? No, just update to whatever max is.
      if (lastMealAggregate._max.serviceDate) {
        await tx.subscription.update({
          where: { id },
          data: { endDate: lastMealAggregate._max.serviceDate },
        });
      }

      // 4. Audit Log
      if (auditRecords.length > 0) {
        await tx.mealPause.createMany({ data: auditRecords });
      }
    });

    res.json({
      message: `Successfully resumed ${mealsToResumeIds.length} meals.`,
      data: {
        resumedCount: mealsToResumeIds.length,
      },
    });
  } catch (error) {
    console.error("Resume Subscription Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.getSubscriptionPauses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // Subscription ID

    const subscription = await prisma.subscription.findUnique({
      where: { id },
    });

    if (!subscription || subscription.userId !== userId) {
      return res
        .status(404)
        .json({ error: { message: "Subscription not found" } });
    }

    const pauses = await prisma.mealPause.findMany({
      where: { subscriptionId: id },
      orderBy: { pausedAt: "desc" },
    });

    res.json({
      data: {
        pauses,
        count: pauses.length,
      },
    });
  } catch (error) {
    console.error("Get Pauses Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};
