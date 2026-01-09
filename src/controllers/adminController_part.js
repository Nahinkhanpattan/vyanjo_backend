// --- Delivery Time Slots Management ---
exports.getAllDeliveryTimeSlots = async (req, res) => {
  try {
    const timeSlots = await prisma.deliveryTimeSlot.findMany({
      orderBy: { startTime: "asc" },
    });
    // Format dates to easier readable time string if needed, or send as is
    res.json({ data: { timeSlots } });
  } catch (error) {
    console.error("Get Time Slots Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.createDeliveryTimeSlot = async (req, res) => {
  try {
    const { name, startTime, endTime } = req.body;
    // expect startTime/endTime as ISO strings or time strings '12:00:00'
    // Prisma Date/Time handling can be tricky. Assuming ISO string or compatible format.
    // Ideally user sends "2023-01-01T12:00:00.000Z" (dummy date, time matters)

    const timeSlot = await prisma.deliveryTimeSlot.create({
      data: {
        name,
        startTime: new Date(startTime), // Ensure Date object
        endTime: new Date(endTime),
        isActive: true,
      },
    });
    res.status(201).json({ data: { timeSlot }, message: "Time Slot created" });
  } catch (error) {
    console.error("Create Time Slot Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.updateDeliveryTimeSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, isActive } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    const timeSlot = await prisma.deliveryTimeSlot.update({
      where: { id },
      data: updateData,
    });
    res.json({ data: { timeSlot }, message: "Time Slot updated" });
  } catch (error) {
    console.error("Update Time Slot Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.deleteDeliveryTimeSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const timeSlot = await prisma.deliveryTimeSlot.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ data: { timeSlot }, message: "Time Slot deactivated" });
  } catch (error) {
    console.error("Delete Time Slot Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// --- Common Points Extension ---
exports.getAllCommonPoints = async (req, res) => {
  try {
    const commonPoints = await prisma.commonPoint.findMany({
      orderBy: { name: "asc" },
      // include: { addresses: { select: { id: true } } } // Optional: count users using it
    });
    res.json({ data: { commonPoints } });
  } catch (error) {
    console.error("Get All Common Points Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// --- Address Management ---
exports.getAllAddresses = async (req, res) => {
  try {
    const addresses = await prisma.address.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, phoneNumber: true, email: true } },
        commonPoint: true,
      },
    });
    res.json({ data: { addresses } });
  } catch (error) {
    console.error("Get All Addresses Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    // Admin can update anything
    const address = await prisma.address.update({
      where: { id },
      data,
    });
    res.json({ data: { address }, message: "Address updated" });
  } catch (error) {
    console.error("Update Address Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    // Hard delete or soft? Schema doesn't have isActive for Address.
    // Usually addresses are critical for history. Maybe just leave as is, or hard delete if really requested.
    // User requested CRUD. Let's do hard delete but with caution or check if used.
    // If it has relations (subscriptions), it might fail or cascade.
    // Schema says: Subscription -> Address. No cascade delete on subscription side mostly.

    // Safer to just try delete and let Prisma complain if related records exist, or cascade if configured.
    // Schema: Address -> Subscription[]
    // If we delete address, subscriptions using it might break or need cascade.
    // Prisma schema for Address:
    // subscriptions Subscription[]
    // No onDelete: Cascade on Subscription relation to Address.

    // So this will fail if subscriptions exist.
    // For now, let's just attempt delete.

    await prisma.address.delete({
      where: { id },
    });
    res.json({ message: "Address deleted" });
  } catch (error) {
    console.error("Delete Address Error:", error);
    if (error.code === "P2003") {
      return res
        .status(400)
        .json({
          error: {
            message: "Cannot delete address associated with subscriptions",
          },
        });
    }
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};
