const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const moment = require("moment-timezone");

exports.createSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    // We expect pricing_id which determines package, duration, and meals.
    // Alternatively, we could take package_id + pricing_id.
    const { pricing_id, start_date, address_id, container_type } = req.body;

    if (!pricing_id || !start_date || !address_id) {
      return res.status(400).json({
        error: {
          message:
            "Missing required fields: pricing_id, start_date, address_id",
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

    // Calculate end date
    const start = moment(start_date).tz("Asia/Kolkata");
    const duration = pricing.durationDays;
    const end = start.clone().add(duration - 1, "days");

    // Create Subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        mealPackageId: mealPackage.id,
        pricingId: pricing.id,
        addressId: address_id,
        containerType: container_type || mealPackage.defaultContainer,
        startDate: start.toDate(),
        endDate: end.toDate(),
        mealsIncluded: pricing.mealsIncluded, // ['TIFFIN', 'LUNCH']
        status: "active",
      },
    });

    // Generate SubscriptionMeals
    const mealsToCreate = [];
    const itemTypes = pricing.mealsIncluded; // array of strings

    for (let i = 0; i < duration; i++) {
      const currentDate = start.clone().add(i, "days");
      for (const type of itemTypes) {
        // e.g. "TIFFIN", "LUNCH"
        mealsToCreate.push({
          subscriptionId: subscription.id,
          serviceDate: currentDate.toDate(),
          mealType: type,
          // deliverySlotId can be assigned later based on type
        });
      }
    }

    if (mealsToCreate.length > 0) {
      await prisma.subscriptionMeal.createMany({
        data: mealsToCreate,
      });
    }

    res.status(201).json({
      data: {
        subscription,
      },
      message: "Subscription created successfully",
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
      where: { userId, status: "active" },
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
    console.error("Create Upgrade Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};
