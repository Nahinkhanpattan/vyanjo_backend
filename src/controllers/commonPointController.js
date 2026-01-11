const prisma = require("../prisma");

exports.getCommonPoints = async (req, res) => {
  try {
    const { search, city } = req.query;

    const where = {
      isActive: true,
    };

    if (city) {
      where.city = city;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { pincode: { contains: search, mode: "insensitive" } },
      ];
    }

    const commonPoints = await prisma.commonPoint.findMany({
      where,
      orderBy: { name: "asc" },
    });

    if (commonPoints.length === 0) {
      return res
        .status(404)
        .json({ error: { message: "No common points found" } });
    }

    res.json({
      data: {
        commonPoints,
      },
    });
  } catch (error) {
    console.error("Get Common Points Error:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
        status: 500,
      },
    });
  }
};
