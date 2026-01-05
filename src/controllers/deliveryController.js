const prisma = require("../prisma");

// Get Available Delivery Slots
exports.getDeliverySlots = async (req, res) => {
  try {
    // In the future, this could fetch from a DB table allowing dynamic admin updates.
    // For now, we return standard valid windows.

    // Tiffin: Morning delivery
    // Lunch: Afternoon delivery (or morning if Combo)
    // Dinner: Evening delivery

    const slots = {
      TIFFIN: [
        {
          id: "TF_05_06",
          startTime: "05:00",
          endTime: "06:00",
          label: "5 AM - 6 AM",
        },
        {
          id: "TF_06_07",
          startTime: "06:00",
          endTime: "07:00",
          label: "6 AM - 7 AM",
        },
        {
          id: "TF_07_08",
          startTime: "07:00",
          endTime: "08:00",
          label: "7 AM - 8 AM",
        },
        {
          id: "TF_08_09",
          startTime: "08:00",
          endTime: "09:00",
          label: "8 AM - 9 AM",
        },
        {
          id: "TF_09_10",
          startTime: "09:00",
          endTime: "10:00",
          label: "9 AM - 10 AM",
        },
      ],
      LUNCH: [
        // Early lunch slots for office goers or Tiffin+Lunch combos
        {
          id: "LN_07_08",
          startTime: "07:00",
          endTime: "08:00",
          label: "7 AM - 8 AM",
          isEarly: true,
        },
        {
          id: "LN_08_09",
          startTime: "08:00",
          endTime: "09:00",
          label: "8 AM - 9 AM",
          isEarly: true,
        },
        {
          id: "LN_11_12",
          startTime: "11:00",
          endTime: "12:00",
          label: "11 AM - 12 PM",
        },
        {
          id: "LN_12_01",
          startTime: "12:00",
          endTime: "13:00",
          label: "12 PM - 1 PM",
        },
        {
          id: "LN_01_02",
          startTime: "13:00",
          endTime: "14:00",
          label: "1 PM - 2 PM",
        },
        {
          id: "LN_02_03",
          startTime: "14:00",
          endTime: "15:00",
          label: "2 PM - 3 PM",
        },
      ],
      DINNER: [
        {
          id: "DN_06_07",
          startTime: "18:00",
          endTime: "19:00",
          label: "6 PM - 7 PM",
        },
        {
          id: "DN_07_08",
          startTime: "19:00",
          endTime: "20:00",
          label: "7 PM - 8 PM",
        },
        {
          id: "DN_08_09",
          startTime: "20:00",
          endTime: "21:00",
          label: "8 PM - 9 PM",
        },
        {
          id: "DN_09_10",
          startTime: "21:00",
          endTime: "22:00",
          label: "9 PM - 10 PM",
        },
      ],
    };

    res.json({
      data: { slots },
      message: "Delivery slots fetched successfully",
    });
  } catch (error) {
    console.error("Get Delivery Slots Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// Placeholder for future logic
exports.allocateDelivery = async (req, res) => {
  res.status(501).json({ message: "Not implemented" });
};
