const prisma = require("../prisma");

exports.getMealPackages = async (req, res) => {
  try {
    const { diet, cuisine } = req.query;

    const where = {
      isActive: true,
    };

    if (diet) where.dietType = diet;
    if (cuisine) where.cuisineType = cuisine;

    // Duration is now in pricingOptions.

    const packages = await prisma.mealPackage.findMany({
      where,
      include: {
        pricingOptions: {
          where: { isActive: true },
          orderBy: { price: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    if (packages.length === 0) {
      return res
        .status(404)
        .json({ error: { message: "No meal packages found" } });
    }

    res.json({
      data: {
        packages,
      },
    });
  } catch (error) {
    console.error("Get Meal Packages Error:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
        status: 500,
      },
    });
  }
};
