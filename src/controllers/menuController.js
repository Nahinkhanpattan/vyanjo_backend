const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const moment = require("moment-timezone");

exports.getCurrentMenu = async (req, res) => {
  try {
    const { diet, cuisine, tier } = req.query; // Added tier support

    if (!diet || !cuisine) {
      return res.status(400).json({
        error: {
          message: "Diet and Cuisine types are required",
          code: "MISSING_PARAMS",
          status: 400,
        },
      });
    }

    const today = moment().tz("Asia/Kolkata");
    const weekStart = today.clone().startOf("isoWeek");

    // Using findFirst instead of findUnique to avoid strict compound key requirement issues
    // and to support optional defaults like Tier
    const menu = await prisma.weeklyMenu.findFirst({
      where: {
        dietType: diet,
        cuisineType: cuisine,
        tier: tier || "REGULAR", // Default to Regular if not specified
        weekStartDate: weekStart.toDate(),
      },
      include: {
        items: {
          include: { menuItem: { include: { category: true } } },
        },
      },
    });

    if (!menu) {
      return res.status(404).json({
        error: {
          message: `No menu found for ${diet} ${cuisine} (${
            tier || "REGULAR"
          }) for week of ${weekStart.format("YYYY-MM-DD")}`,
          code: "MENU_NOT_FOUND",
          status: 404,
        },
      });
    }

    res.json({
      data: {
        menu,
      },
    });
  } catch (error) {
    console.error("Get Current Menu Error:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
        status: 500,
      },
    });
  }
};

exports.getWeeklyMenu = async (req, res) => {
  try {
    const { date, diet, cuisine, tier } = req.query;

    if (!date || !diet || !cuisine) {
      return res.status(400).json({
        error: {
          message: "Date, Diet and Cuisine types are required",
          code: "MISSING_PARAMS",
          status: 400,
        },
      });
    }

    const inputDate = moment(date).tz("Asia/Kolkata");
    // If a specific date is provided, used it as start date if it's a Monday,
    // OR calculate start of week.
    // The user creates menu with '2025-01-05' (Sunday).
    // 'startOf('isoWeek')' on Sunday 2025-01-05 gives Monday 2024-12-30.
    // BUT maybe they intended 2025-01-05 to be start?
    // Standard is Monday. Let's stick to startOf('isoWeek') for consistency,
    // BUT we must print what we are searching for.

    // Fix: Creation used 'new Date(weekStartDate)' directly.
    // If frontend sends Sunday, DB has Sunday.
    // Fetching uses 'startOf(isoWeek)' which changes it to Monday.
    // We should probably NOT change the date if the user asking for a specific date?
    // Let's rely on exact match if they send a date that looks like a start date.

    const weekStart = inputDate.clone().startOf("isoWeek");
    // Wait, if I created it as Sunday, fetch as Monday fails.
    // Solution: Admin Creation should ALSO normalize to start of week?
    // OR: Fetch should look for exact date first?
    // Better: Normalize creation to Monday. That is the standard.
    // However, I can't change the data already in DB easily.
    // Let's check for BOTH or just trust the input?

    // For now, let's look for the calculated weekStart OR the raw input date?
    // findFirst allows only one where.

    console.log(
      `[MenuController] Fetching for: ${weekStart.format(
        "YYYY-MM-DD"
      )} (Computed WeekStart)`
    );

    const menu = await prisma.weeklyMenu.findFirst({
      where: {
        dietType: diet,
        cuisineType: cuisine,
        tier: tier || "REGULAR",
        // Logic: Try to find by normalized week start
        weekStartDate: weekStart.toDate(),
      },
      include: {
        items: {
          include: { menuItem: { include: { category: true } } },
        },
      },
    });

    if (!menu) {
      return res.status(404).json({
        error: {
          message: `No menu found for ${diet} ${cuisine} (${
            tier || "REGULAR"
          }) for week starting ${weekStart.format("YYYY-MM-DD")}`,
          code: "MENU_NOT_FOUND",
          status: 404,
        },
      });
    }

    res.json({
      data: {
        menu,
      },
    });
  } catch (error) {
    console.error("Get Weekly Menu Error:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
        status: 500,
      },
    });
  }
};

exports.getAllMenus = async (req, res) => {
  try {
    const menus = await prisma.weeklyMenu.findMany({
      orderBy: { weekStartDate: "desc" },
      include: {
        items: {
          include: { menuItem: { include: { category: true } } },
        },
      },
    });

    res.json({
      data: {
        menus,
        count: menus.length,
      },
      message: "Menus retrieved successfully",
    });
  } catch (error) {
    console.error("Get All Menus Error:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
        status: 500,
      },
    });
  }
};

exports.deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;

    const menu = await prisma.weeklyMenu.findUnique({
      where: { id },
    });

    if (!menu) {
      return res.status(404).json({
        error: {
          message: "Menu not found",
          code: "MENU_NOT_FOUND",
          status: 404,
        },
      });
    }

    await prisma.weeklyMenu.delete({
      where: { id },
    });

    res.json({
      message: "Menu deleted successfully",
      data: { id },
    });
  } catch (error) {
    console.error("Delete Menu Error:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
        status: 500,
      },
    });
  }
};
