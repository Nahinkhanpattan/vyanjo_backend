const prisma = require("../prisma");
const moment = require("moment-timezone");

exports.getNextWeeklyMenu = async (req, res) => {
  try {
    let { diet, cuisine, tier } = req.query;

    // Resolve preferences from subscription if missing
    if ((!diet || !cuisine) && req.user && req.user.id) {
      const subPrefs = await getSubscriptionPreferences(req.user.id);
      if (subPrefs) {
        if (!diet) diet = subPrefs.diet;
        if (!cuisine) cuisine = subPrefs.cuisine;
        if (!tier) tier = subPrefs.tier;
      }
    }

    if (!diet || !cuisine) {
      return res.status(400).json({
        error: {
          message:
            "Diet and Cuisine types are required or no active subscription found",
          code: "MISSING_PARAMS",
          status: 400,
        },
      });
    }

    // Calculate start of NEXT week (Current + 7 days, normalized to Monday Noon)
    const weekStart = moment()
      .tz("Asia/Kolkata")
      .add(1, "weeks")
      .startOf("isoWeek")
      .hour(12);

    console.log(
      `[MenuController] Fetching Next Week for: ${weekStart.format(
        "YYYY-MM-DD"
      )} (Computed WeekStart)`
    );

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
      orderBy: {
        weekStartDate: "desc",
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
    console.error("Get Next Weekly Menu Error:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
        status: 500,
      },
    });
  }
};

exports.getCurrentMenu = async (req, res) => {
  try {
    let { diet, cuisine, tier, date } = req.query;

    // If param "date" is "today", use current date
    let targetDate = moment().tz("Asia/Kolkata");
    if (date && date.toLowerCase() === "today") {
      // already set to today
    } else if (date) {
      targetDate = moment(date).tz("Asia/Kolkata");
    }

    // Attempt to resolve preferences from subscription if missing
    if ((!diet || !cuisine) && req.user && req.user.id) {
      const subPrefs = await getSubscriptionPreferences(req.user.id);
      if (subPrefs) {
        if (!diet) diet = subPrefs.diet;
        if (!cuisine) cuisine = subPrefs.cuisine;
        if (!tier) tier = subPrefs.tier;
      }
    }

    if (!diet || !cuisine) {
      return res.status(400).json({
        error: {
          message:
            "Diet and Cuisine types are required or no active subscription found",
          code: "MISSING_PARAMS",
          status: 400,
        },
      });
    }

    const weekStart = targetDate.clone().startOf("isoWeek").hour(12);

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
          }) for week of ${weekStart.format("YYYY-MM-DD")}`,
          code: "MENU_NOT_FOUND",
          status: 404,
        },
      });
    }

    // Filter for specific day if requested (implicitly 'current' usually implies today/now context,
    // but user said "if i ask ... with date todays")
    // If param 'date' is specifically provided, we filter.
    // If accessing /current without date, we might want to just show today's?
    // User said: "if i ask for current menu with date todays then i want the menu of today's only".
    // This implies if they provided the date param.

    let responseMenu = menu;

    if (date) {
      const dayOfWeek = targetDate.isoWeekday(); // 1=Mon, 7=Sun
      const filteredItems = menu.items.filter(
        (item) => item.dayOfWeek === dayOfWeek
      );

      // We can construct a partial menu object or just return items. Use partial menu object for consistency.
      responseMenu = {
        ...menu,
        items: filteredItems,
      };
    }

    res.json({
      data: {
        menu: responseMenu,
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
    let { date, diet, cuisine, tier } = req.query;

    // Resolve preferences from subscription if missing
    if ((!diet || !cuisine) && req.user && req.user.id) {
      const subPrefs = await getSubscriptionPreferences(req.user.id);
      if (subPrefs) {
        if (!diet) diet = subPrefs.diet;
        if (!cuisine) cuisine = subPrefs.cuisine;
        if (!tier) tier = subPrefs.tier;
      }
    }

    if (!diet || !cuisine) {
      return res.status(400).json({
        error: {
          message:
            "Diet and Cuisine types are required or no active subscription found",
          code: "MISSING_PARAMS",
          status: 400,
        },
      });
    }

    const inputDate = date
      ? moment(date).tz("Asia/Kolkata")
      : moment().tz("Asia/Kolkata");
    const weekStart = inputDate.clone().startOf("isoWeek").hour(12);

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
        weekStartDate: weekStart.toDate(),
      },
      include: {
        items: {
          include: { menuItem: { include: { category: true } } },
        },
      },
      orderBy: {
        weekStartDate: "desc", // In case of duplicates (shouldn't happen), take latest? Unique constraint prevents this actually.
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

// Helper function to get user subscription preferences
async function getSubscriptionPreferences(userId) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["active", "pending_payment", "payment_review"] },
    },
    include: {
      mealPackage: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (subscription && subscription.mealPackage) {
    return {
      diet: subscription.mealPackage.dietType,
      cuisine: subscription.mealPackage.cuisineType,
      tier: subscription.mealPackage.tier,
    };
  }
  return null;
}

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
