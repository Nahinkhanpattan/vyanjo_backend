const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const moment = require('moment-timezone');

exports.createSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { meal_package_id, address_id, container_type, start_date } = req.body;

    // Check for active subscription
    const activeSub = await prisma.subscription.findFirst({
      where: { userId, status: 'active' },
    });

    if (activeSub) {
      return res.status(422).json({
        error: {
          message: 'You already have an active subscription',
          code: 'ACTIVE_SUBSCRIPTION_EXISTS',
          status: 422,
        },
      });
    }

    // Get Meal Package
    const mealPackage = await prisma.mealPackage.findUnique({
      where: { id: meal_package_id },
    });

    if (!mealPackage) {
      return res.status(404).json({
        error: {
          message: 'Meal package not found',
          code: 'PACKAGE_NOT_FOUND',
          status: 404,
        },
      });
    }

    // Calculate end date
    // Note: We need to account for start_date being in future
    const start = moment(start_date).tz('Asia/Kolkata');
    const duration = mealPackage.durationDays;
    const end = start.clone().add(duration - 1, 'days'); // inclusive duration

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        mealPackageId: meal_package_id,
        addressId: address_id,
        containerType: container_type,
        startDate: start.toDate(),
        endDate: end.toDate(),
        status: 'active',
      },
    });

    // Generate Initial Meals (Synchronous for now, could be async or separate job)
    // We'll generate for the whole duration
    const mealsToCreate = [];
    const itemTypes = [];
    if (mealPackage.includesBreakfast) itemTypes.push('breakfast');
    if (mealPackage.includesLunch) itemTypes.push('lunch');
    if (mealPackage.includesDinner) itemTypes.push('dinner');
    if (mealPackage.includesSnacks) itemTypes.push('snacks');

    // Get default delivery slots?
    // For now null, they can be assigned later or found by default rules
    
    // Iterate days
    for (let i = 0; i < duration; i++) {
        const currentDate = start.clone().add(i, 'days');
        for (const type of itemTypes) {
            mealsToCreate.push({
                subscriptionId: subscription.id,
                serviceDate: currentDate.toDate(),
                itemType: type,
                // deliverySlotId: default_slot?
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
      message: 'Subscription created successfully',
    });

  } catch (error) {
    console.error('Create Subscription Error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error',
        code: 'SERVER_ERROR',
        status: 500,
      },
    });
  }
};

exports.getActiveSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: 'active' },
      include: {
        mealPackage: true,
        address: true,
      },
      orderBy: { createdAt: 'desc' } // Ensure latest
    });

    if (!subscription) {
      return res.status(404).json({
        error: {
          message: 'No active subscription found',
          code: 'NO_ACTIVE_SUBSCRIPTION',
          status: 404,
        },
      });
    }

    // Optionally include meals? Prompt says "Returns active subscription + meals"
    // Fetch meals separately or include
    const meals = await prisma.subscriptionMeal.findMany({
        where: { subscriptionId: subscription.id },
        orderBy: { serviceDate: 'asc' },
    });

    res.json({
        data: {
            subscription: {
                ...subscription,
                meals
            }
        }
    });

  } catch (error) {
    console.error('Get Active Subscription Error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error',
        code: 'SERVER_ERROR',
        status: 500,
      },
    });
  }
};

exports.createUpgrade = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // Subscription ID
    const { targetTier, targetDiet, scope, date, mealType } = req.body;

    // 1. Validate Subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { mealPackage: true }
    });

    if (!subscription || subscription.userId !== userId) {
      return res.status(404).json({ error: { message: 'Subscription not found' } });
    }

    // 2. Determine Original State
    const originalTier = subscription.mealPackage.tier;
    const originalDiet = subscription.mealPackage.dietType;

    // 3. Find Price
    // Logic: Look for exact match in UpgradePrice table.
    // This is simplified. In a real app, you might have base price diff + markup.
    // Here we assume Admin sets specific "Upgrade Package" prices.
    // Or we find the price difference dynamically?
    // User Requirement: "admin can create these categories... upgrade prices"
    // So we look up the UpgradePrice table.
    
    // We expect an UpgradePrice record matching the transition OR just the target.
    // Let's assume there's a record for "Regular -> Premium" per "Meal".
    
    const upgradePriceRecord = await prisma.upgradePrice.findFirst({
      where: {
        fromTier: originalTier,
        toTier: targetTier,
        fromDiet: originalDiet,
        toDiet: targetDiet,
        scope: scope,
        mealType: scope === 'MEAL' ? mealType : undefined,
        isActive: true
      }
    });

    if (!upgradePriceRecord) {
         // Fallback: Check if there is a generic "To Premium" price?
         // For now, strict match.
         return res.status(400).json({ error: { message: 'Upgrade option not available for this selection.' } });
    }

    // 4. Calculate Date Range
    let startDate = moment(date).tz('Asia/Kolkata');
    let endDate = moment(date).tz('Asia/Kolkata');

    if (scope === 'WEEK') {
        endDate = startDate.clone().add(6, 'days');
    }
    // If MEAL or DAY, start=end.

    // 5. Create Upgrade Record
    const upgrade = await prisma.subscriptionUpgrade.create({
      data: {
        subscriptionId: id,
        targetTier,
        targetDiet,
        originalTier,
        originalDiet,
        scope,
        mealType: scope === 'MEAL' ? mealType : null,
        startDate: startDate.toDate(),
        endDate: endDate.toDate(),
        price: upgradePriceRecord.price
      }
    });

    res.status(201).json({ data: { upgrade }, message: 'Upgrade purchased successfully' });

  } catch (error) {
    console.error('Create Upgrade Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};
