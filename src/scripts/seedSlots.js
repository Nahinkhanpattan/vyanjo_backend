const prisma = require("../prisma");

async function main() {
  const slots = [
    // Tiffin (Morning)
    {
      name: "Tiffin 6-7 AM",
      startTime: "06:00",
      endTime: "07:00",
      type: "TIFFIN",
    },
    {
      name: "Tiffin 7-8 AM",
      startTime: "07:00",
      endTime: "08:00",
      type: "TIFFIN",
    },
    {
      name: "Tiffin 8-9 AM",
      startTime: "08:00",
      endTime: "09:00",
      type: "TIFFIN",
    },
    {
      name: "Tiffin 9-10 AM",
      startTime: "09:00",
      endTime: "10:00",
      type: "TIFFIN",
    },

    // Lunch
    {
      name: "Lunch 7-8 AM",
      startTime: "07:00",
      endTime: "08:00",
      type: "LUNCH",
    },
    {
      name: "Lunch 8-9 AM",
      startTime: "08:00",
      endTime: "09:00",
      type: "LUNCH",
    },
    {
      name: "Lunch 9-10 AM",
      startTime: "09:00",
      endTime: "10:00",
      type: "LUNCH",
    },
    {
      name: "Lunch 10-11 AM",
      startTime: "10:00",
      endTime: "11:00",
      type: "LUNCH",
    },
    {
      name: "Lunch 11-12 PM",
      startTime: "11:00",
      endTime: "12:00",
      type: "LUNCH",
    },
    {
      name: "Lunch 12-1 PM",
      startTime: "12:00",
      endTime: "13:00",
      type: "LUNCH",
    },
    {
      name: "Lunch 1-2 PM",
      startTime: "13:00",
      endTime: "14:00",
      type: "LUNCH",
    },
    {
      name: "Lunch 2-3 PM",
      startTime: "14:00",
      endTime: "15:00",
      type: "LUNCH",
    },

    // Dinner
    {
      name: "Dinner 6-7 PM",
      startTime: "18:00",
      endTime: "19:00",
      type: "DINNER",
    },
    {
      name: "Dinner 7-8 PM",
      startTime: "19:00",
      endTime: "20:00",
      type: "DINNER",
    },
    {
      name: "Dinner 8-9 PM",
      startTime: "20:00",
      endTime: "21:00",
      type: "DINNER",
    },
    {
      name: "Dinner 9-10 PM",
      startTime: "21:00",
      endTime: "22:00",
      type: "DINNER",
    },
  ];

  console.log("Seeding delivery slots...");

  for (const slot of slots) {
    // Construct Date objects for Time type
    // Prisma mapped @db.Time requires a Date object, the date part is ignored but time is used.
    // Using a fixed epoch date.
    const baseDate = "1970-01-01";
    const start = new Date(`${baseDate}T${slot.startTime}:00Z`);
    const end = new Date(`${baseDate}T${slot.endTime}:00Z`);

    // We identify by name for upsert-like behavior, but since name isn't unique, we check existence.
    const existing = await prisma.deliveryTimeSlot.findFirst({
      where: { name: slot.name },
    });

    if (!existing) {
      await prisma.deliveryTimeSlot.create({
        data: {
          name: slot.name,
          startTime: start,
          endTime: end,
          isActive: true,
        },
      });
      console.log(`Created: ${slot.name}`);
    } else {
      console.log(`Skipped (Exists): ${slot.name}`);
    }
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
