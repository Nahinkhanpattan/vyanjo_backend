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

// Helper to title case strings
const toTitleCase = (str) => {
  if (!str) return str;
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
  );
};

exports.createCommonPoint = async (req, res) => {
  try {
    const { name, addressLine1, city, state, pincode, latitude, longitude } =
      req.body;

    // 1. Normalize casing (Title Case for consistency)
    const normalizedName = toTitleCase(name ? name.trim() : "");
    const normalizedCity = city ? toTitleCase(city.trim()) : city;
    const normalizedAddress = addressLine1
      ? toTitleCase(addressLine1.trim())
      : addressLine1;

    if (!normalizedName) {
      return res.status(400).json({ error: { message: "Name is required" } });
    }

    // 2. Check for duplicates (Name matches, AND either Pincode or City matches)
    // We check globally (userId: null) or anything really, since we want to reuse ANY existing point that matches.
    const duplicate = await prisma.commonPoint.findFirst({
      where: {
        name: { equals: normalizedName, mode: "insensitive" },
        isActive: true, // Only check active points
        OR: [
          { pincode: pincode ? pincode.trim() : undefined },
          { city: { equals: normalizedCity, mode: "insensitive" } },
        ],
      },
    });

    if (duplicate) {
      console.log(
        `[CommonPoint] Duplicate found: ${normalizedName}. Returning existing ID: ${duplicate.id}`,
      );
      return res.status(200).json({
        data: { commonPoint: duplicate },
        message: "Common Point already exists. Using existing one.",
      });
    }

    // 3. Create new Global Common Point (userId: null)
    // "make other users common point as global" -> implies shared immediately.
    const commonPoint = await prisma.commonPoint.create({
      data: {
        name: normalizedName,
        addressLine1: normalizedAddress,
        city: normalizedCity,
        state,
        pincode,
        latitude,
        longitude,
        userId: null, // Global
        isActive: true,
      },
    });

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
