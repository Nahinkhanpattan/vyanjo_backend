const prisma = require("../prisma");

exports.getCommonPoints = async (req, res) => {
  try {
    const { search, city, type } = req.query;
    const userId = req.user ? req.user.id : null;

    const where = {
      isActive: true,
    };

    if (type === "global") {
      where.userId = null;
    } else if (type === "personal") {
      if (!userId)
        return res.status(401).json({ error: { message: "Unauthorized" } });
      where.userId = userId;
    } else {
      where.OR = [{ userId: null }, { userId: userId }];
    }

    if (city) {
      where.city = city;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { pincode: { contains: search, mode: "insensitive" } },
          ],
        },
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

exports.createCommonPoint = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    // Force user_id
    data.userId = userId;
    data.isActive = true;

    const commonPoint = await prisma.commonPoint.create({ data });
    res
      .status(201)
      .json({ data: { commonPoint }, message: "Common Point created" });
  } catch (error) {
    console.error("Create User Common Point Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.updateCommonPoint = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.commonPoint.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res
        .status(404)
        .json({ error: { message: "Common Point not found or unauthorized" } });
    }

    const commonPoint = await prisma.commonPoint.update({
      where: { id },
      data,
    });
    res.json({ data: { commonPoint }, message: "Common Point updated" });
  } catch (error) {
    console.error("Update User Common Point Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.deleteCommonPoint = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = await prisma.commonPoint.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res
        .status(404)
        .json({ error: { message: "Common Point not found or unauthorized" } });
    }

    // Soft delete
    const commonPoint = await prisma.commonPoint.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ data: { commonPoint }, message: "Common Point deleted" });
  } catch (error) {
    console.error("Delete User Common Point Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};
