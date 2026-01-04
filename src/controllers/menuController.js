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
    const weekStart = inputDate.clone().startOf("isoWeek");

    const menu = await prisma.weeklyMenu.findFirst({
      where: {
        dietType: diet,
        cuisineType: cuisine,
        tier: tier || "REGULAR",
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
