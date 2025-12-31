const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getMealPackages = async (req, res) => {
  try {
    const { diet, cuisine, duration } = req.query;

    const where = {
      isActive: true,
    };

    if (diet) where.dietType = diet;
    if (cuisine) where.cuisineType = cuisine;
    if (duration) where.durationDays = parseInt(duration);

    const packages = await prisma.mealPackage.findMany({
      where,
      orderBy: { price: 'asc' },
    });

    res.json({
      data: {
        packages,
      },
    });
  } catch (error) {
    console.error('Get Meal Packages Error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error',
        code: 'SERVER_ERROR',
        status: 500,
      },
    });
  }
};
