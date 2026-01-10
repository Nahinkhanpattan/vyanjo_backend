const prisma = require("../prisma");

// Get Available Delivery Slots
// Get Available Delivery Slots
exports.getDeliverySlots = async (req, res) => {
  try {
    // Tiffin: Morning delivery
    // Lunch: Afternoon delivery (or morning if Combo)
    // Dinner: Evening delivery

    // Fetch from DB
    const slots = await prisma.deliveryTimeSlot.findMany({
      where: { isActive: true },
      orderBy: { startTime: "asc" },
    });

    // Grouping
    const grouped = {
      TIFFIN: [],
      LUNCH: [],
      DINNER: [],
    };

    slots.forEach((slot) => {
      const name = slot.name.toUpperCase();
      // Heuristic based on name or time
      if (name.includes("TIFFIN")) {
        grouped.TIFFIN.push(slot);
      } else if (name.includes("LUNCH")) {
        grouped.LUNCH.push(slot);
      } else if (name.includes("DINNER")) {
        grouped.DINNER.push(slot);
      } else {
        // Fallback checks if name doesn't contain keywords (backwards compatibility)
        if (
          slot.startTime >= new Date("1970-01-01T05:00:00Z") &&
          slot.startTime < new Date("1970-01-01T10:00:00Z")
        ) {
          grouped.TIFFIN.push(slot);
        } else if (
          slot.startTime >= new Date("1970-01-01T11:00:00Z") &&
          slot.startTime < new Date("1970-01-01T15:00:00Z")
        ) {
          grouped.LUNCH.push(slot);
        } else if (
          slot.startTime >= new Date("1970-01-01T18:00:00Z") &&
          slot.startTime < new Date("1970-01-01T22:00:00Z")
        ) {
          grouped.DINNER.push(slot);
        }
      }
    });

    res.json({
      data: { slots: grouped },
      message: "Delivery slots fetched successfully",
    });
  } catch (error) {
    console.error("Get Delivery Slots Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// Update Delivery Preferences (Time Slots and Addresses)
exports.updateDeliveryPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences, addresses } = req.body;

    if (
      (!preferences || typeof preferences !== "object") &&
      (!addresses || typeof addresses !== "object")
    ) {
      return res
        .status(400)
        .json({
          error: {
            message: "Invalid input format. Provide preferences or addresses.",
          },
        });
    }

    // Get Active Subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ["active", "pending_payment", "payment_review"] },
      },
    });

    if (!subscription) {
      return res.status(404).json({
        error: { message: "No active or pending subscription found" },
      });
    }

    const updates = [];
    const prefKeys = preferences ? Object.keys(preferences) : [];
    const addrKeys = addresses ? Object.keys(addresses) : [];
    const allKeys = new Set([...prefKeys, ...addrKeys]);

    // 1. Update/Create SubscriptionPreference records
    for (const mealTypeKey of allKeys) {
      const mealType = mealTypeKey.toUpperCase();
      const slotId = preferences?.[mealTypeKey];
      const addressId = addresses?.[mealTypeKey];

      // Upsert Preference manually
      const existingPref = await prisma.subscriptionPreference.findUnique({
        where: {
          subscriptionId_mealType: {
            subscriptionId: subscription.id,
            mealType: mealType,
          },
        },
      });

      const dataToUpdate = {};
      if (slotId !== undefined) dataToUpdate.deliverySlotId = slotId;
      if (addressId !== undefined) dataToUpdate.addressId = addressId;

      if (existingPref) {
        await prisma.subscriptionPreference.update({
          where: { id: existingPref.id },
          data: dataToUpdate,
        });
      } else {
        await prisma.subscriptionPreference.create({
          data: {
            subscriptionId: subscription.id,
            mealType: mealType,
            ...dataToUpdate,
          },
        });
      }

      // 2. Queue updates for FUTURE SubscriptionMeals
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (Object.keys(dataToUpdate).length > 0) {
        const updateOp = prisma.subscriptionMeal.updateMany({
          where: {
            subscriptionId: subscription.id,
            mealType: mealType,
            serviceDate: { gte: today },
          },
          data: dataToUpdate,
        });
        updates.push(updateOp);
      }
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    res.json({ message: "Delivery preferences saved successfully" });
  } catch (error) {
    console.error("Update Preferences Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// Get User's Current Delivery Preferences
exports.getUserDeliveryPreferences = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get Active Scheme
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ["active", "pending_payment", "payment_review"] },
      },
      include: {
        address: true, // Fallback/Default address
        preferences: {
          include: {
            deliverySlot: true,
            address: true,
          },
        },
      },
    });

    if (!subscription) {
      return res.status(404).json({
        error: { message: "No active or pending subscription found" },
      });
    }

    const preferences = {};
    const addresses = {};
    const details = {};

    // We iterate over the saved preferences
    if (subscription.preferences) {
      subscription.preferences.forEach((pref) => {
        const type = pref.mealType;

        if (pref.deliverySlotId) {
          preferences[type] = pref.deliverySlotId;
        }
        if (pref.addressId) {
          addresses[type] = pref.addressId;
        } else {
          addresses[type] = subscription.addressId;
        }

        details[type] = {
          slotName: pref.deliverySlot?.name || "Not set",
          addressLine1:
            pref.address?.addressLine1 || subscription.address?.addressLine1,
          city: pref.address?.city || subscription.address?.city,
        };
      });
    }

    res.json({
      data: {
        preferences,
        addresses,
        details,
      },
      message: "Preferences fetched successfully",
    });
  } catch (error) {
    console.error("Get Preferences Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// Placeholder for future logic
exports.allocateDelivery = async (req, res) => {
  res.status(501).json({ message: "Not implemented" });
};
