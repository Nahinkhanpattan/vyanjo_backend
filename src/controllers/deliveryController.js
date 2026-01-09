const prisma = require("../prisma");

// Get Available Delivery Slots
exports.getDeliverySlots = async (req, res) => {
  try {
    // In the future, this could fetch from a DB table allowing dynamic admin updates.
    // For now, we return standard valid windows.

    // Tiffin: Morning delivery
    // Lunch: Afternoon delivery (or morning if Combo)
    // Dinner: Evening delivery

    // Fetch from DB
    const slots = await prisma.deliveryTimeSlot.findMany({
      where: { isActive: true },
      orderBy: { startTime: "asc" },
    });

    // Group by Meal Type Logic (Optional: if we had a mealType field in slot, but currently we just return all or group by time)
    // The current schema just has name/startTime/endTime.
    // We can infer type from name or time.
    // For now, let's return them categorized if names imply it, or just list them.
    // The previous hardcoded version returned { TIFFIN: [], LCUNH: [] }.
    // Let's try to maintain that structure by parsing names or times if possible.
    // If names are 'Lunch 12-1', etc.
    
    // Grouping helper
    const grouped = {
      TIFFIN: [],
      LUNCH: [],
      DINNER: [],
      SNACKS: []
    };

    slots.forEach(slot => {
        const name = slot.name.toUpperCase();
        // Simple keyword matching
        if (name.includes("MORNING") || name.includes("TIFFIN") || (slot.startTime >= new Date("1970-01-01T05:00:00Z") && slot.startTime < new Date("1970-01-01T10:00:00Z"))) {
             grouped.TIFFIN.push(slot);
        }
        if (name.includes("LUNCH") || name.includes("AFTERNOON") || (slot.startTime >= new Date("1970-01-01T11:00:00Z") && slot.startTime < new Date("1970-01-01T15:00:00Z"))) {
             grouped.LUNCH.push(slot);
        }
        if (name.includes("DINNER") || name.includes("EVENING") || (slot.startTime >= new Date("1970-01-01T18:00:00Z") && slot.startTime < new Date("1970-01-01T22:00:00Z"))) {
             grouped.DINNER.push(slot);
        }
        // Fallback or explicit SNACK logic
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

// Update Delivery Preferences (Time Slots)
exports.updateDeliveryPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body; // { "LUNCH": "slot_uuid", "DINNER": "slot_uuid" }

    if (!preferences || typeof preferences !== "object") {
       return res.status(400).json({ error: { message: "Invalid preferences format" } });
    }

    // Get Active Scheme (or pending)
    const subscription = await prisma.subscription.findFirst({
        where: { 
            userId, 
            status: { in: ["active", "pending_payment", "payment_review"] } 
        }
    });

    if (!subscription) {
        return res.status(404).json({ error: { message: "No active or pending subscription found" } });
    }

    // Update Future Meals
    // We update SubscriptionMeals where mealType matches.
    // AND serviceDate >= today
    
    const today = new Date();
    today.setHours(0,0,0,0);

    const updates = [];

    for (const [mealTypeKey, slotId] of Object.entries(preferences)) {
        // Validation: Verify key is valid meal type (LUNCH, DINNER, TIFFIN etc?)
        // In DB mealType is likely stored as "LUNCH", "DINNER" etc. or lowercase.
        // Assuming user sends "LUNCH" and DB stores uppercase or user sends correct case.
        // Let's normalize to what DB expects (checking schema or values).
        // Schema says db.VarChar(20). Values typically 'TIFFIN', 'LUNCH', 'DINNER'.
        
        const mealType = mealTypeKey.toUpperCase(); // Normalize

        // Update Many
        const updateOp = prisma.subscriptionMeal.updateMany({
            where: {
                subscriptionId: subscription.id,
                mealType: mealType, // Assuming accurate match
                serviceDate: { gte: today }
            },
            data: {
                deliverySlotId: slotId
            }
        });
        updates.push(updateOp);
    }

    await prisma.$transaction(updates);

    res.json({ message: "Delivery preferences saved successfully" });

  } catch (error) {
    console.error("Update Preferences Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};


// Placeholder for future logic
exports.allocateDelivery = async (req, res) => {
  res.status(501).json({ message: "Not implemented" });
};
