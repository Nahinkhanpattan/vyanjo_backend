const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// --- Users Management ---
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { subscriptions: true, curryOrders: true },
        },
      },
    });
    res.json({ data: { users } });
  } catch (error) {
    console.error("Get All Users Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        addresses: true,
        subscriptions: true,
        curryWallets: true,
        raisedIssues: true,
      },
    });
    if (!user)
      return res.status(404).json({ error: { message: "User not found" } });
    res.json({ data: { user } });
  } catch (error) {
    console.error("Get User Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const user = await prisma.user.update({
      where: { id },
      data,
    });
    res.json({ data: { user }, message: "User updated" });
  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// --- Meal Packages Management ---
exports.createMealPackage = async (req, res) => {
  try {
    const {
      name,
      dietType,
      cuisineType,
      tier,
      defaultContainer,
      allowsContainerChoice,
      allowsDietUpgrade,
      allowsCuisineUpgrade,
    } = req.body;

    const mealPackage = await prisma.mealPackage.create({
      data: {
        name,
        dietType,
        cuisineType,
        tier: tier || "REGULAR",
        defaultContainer,
        allowsContainerChoice: allowsContainerChoice || false,
        allowsDietUpgrade: allowsDietUpgrade || false,
        allowsCuisineUpgrade: allowsCuisineUpgrade || false,
        isActive: true,
      },
    });
    res
      .status(201)
      .json({ data: { mealPackage }, message: "Meal Package created" });
  } catch (error) {
    console.error("Create Meal Package Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.updateMealPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const mealPackage = await prisma.mealPackage.update({
      where: { id },
      data,
    });
    res.json({ data: { mealPackage }, message: "Meal Package updated" });
  } catch (error) {
    console.error("Update Meal Package Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.deleteMealPackage = async (req, res) => {
  try {
    const { id } = req.params;
    // Soft delete
    const mealPackage = await prisma.mealPackage.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ data: { mealPackage }, message: "Meal Package deactivated" });
  } catch (error) {
    console.error("Delete Meal Package Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// --- Package Pricing Management (New) ---
exports.createPackagePricing = async (req, res) => {
  try {
    const { mealPackageId, name, durationDays, mealsIncluded, price } =
      req.body;
    // Validation
    if (!mealPackageId || !durationDays || !mealsIncluded || !price) {
      return res
        .status(400)
        .json({ error: { message: "Missing required fields" } });
    }

    const pricing = await prisma.packagePricing.create({
      data: {
        mealPackageId,
        name,
        durationDays: parseInt(durationDays),
        mealsIncluded, // Expects array e.g. ["LUNCH", "DINNER"]
        price: parseFloat(price),
        isActive: true,
      },
    });

    res
      .status(201)
      .json({ data: { pricing }, message: "Package Pricing created" });
  } catch (error) {
    console.error("Create Package Pricing Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.updatePackagePricing = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const pricing = await prisma.packagePricing.update({
      where: { id },
      data,
    });
    res.json({ data: { pricing }, message: "Pricing updated" });
  } catch (error) {
    console.error("Update Pricing Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.deletePackagePricing = async (req, res) => {
  try {
    const { id } = req.params;
    const pricing = await prisma.packagePricing.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ data: { pricing }, message: "Pricing deactivated" });
  } catch (error) {
    console.error("Delete Pricing Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// --- Common Points Management ---
exports.createCommonPoint = async (req, res) => {
  try {
    const data = req.body;
    const commonPoint = await prisma.commonPoint.create({ data });
    res
      .status(201)
      .json({ data: { commonPoint }, message: "Common Point created" });
  } catch (error) {
    console.error("Create Common Point Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.updateCommonPoint = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const commonPoint = await prisma.commonPoint.update({
      where: { id },
      data,
    });
    res.json({ data: { commonPoint }, message: "Common Point updated" });
  } catch (error) {
    console.error("Update Common Point Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.deleteCommonPoint = async (req, res) => {
  try {
    const { id } = req.params;
    const commonPoint = await prisma.commonPoint.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ data: { commonPoint }, message: "Common Point deactivated" });
  } catch (error) {
    console.error("Delete Common Point Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// --- Category Management ---
exports.createCategory = async (req, res) => {
  try {
    const data = req.body; // { name, parentId, ... }
    const category = await prisma.category.create({ data });
    res.status(201).json({ data: { category }, message: "Category created" });
  } catch (error) {
    console.error("Create Category Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: { children: true },
      orderBy: { name: "asc" },
    });
    res.json({ data: { categories } });
  } catch (error) {
    console.error("Get Categories Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const category = await prisma.category.update({ where: { id }, data });
    res.json({ data: { category }, message: "Category updated" });
  } catch (error) {
    console.error("Update Category Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ data: { category }, message: "Category deactivated" });
  } catch (error) {
    console.error("Delete Category Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// --- MenuItem Management ---
exports.createMenuItem = async (req, res) => {
  try {
    const data = req.body; // { name, categoryId, description... }
    const menuItem = await prisma.menuItem.create({ data });
    res.status(201).json({ data: { menuItem }, message: "Menu Item created" });
  } catch (error) {
    console.error("Create MenuItem Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.getAllMenuItems = async (req, res) => {
  try {
    const { categoryId } = req.query;
    const where = { isActive: true };
    if (categoryId) where.categoryId = categoryId;

    const menuItems = await prisma.menuItem.findMany({
      where,
      include: { category: true },
      orderBy: { name: "asc" },
    });
    res.json({ data: { menuItems } });
  } catch (error) {
    console.error("Get MenuItems Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const menuItem = await prisma.menuItem.update({ where: { id }, data });
    res.json({ data: { menuItem }, message: "Menu Item updated" });
  } catch (error) {
    console.error("Update MenuItem Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ data: { menuItem }, message: "Menu Item deactivated" });
  } catch (error) {
    console.error("Delete MenuItem Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// --- Menu Management ---
exports.createWeeklyMenu = async (req, res) => {
  try {
    const { dietType, cuisineType, weekStartDate, items, tier } = req.body;

    // Items is array of: { mealType: 'TIFFIN'|'LUNCH'|'DINNER', dayOfWeek: 1, menuItemId: 'uuid', itemName: '...' }

    const result = await prisma.$transaction(async (prisma) => {
      const menu = await prisma.weeklyMenu.create({
        data: {
          dietType,
          cuisineType,
          tier: tier || "REGULAR",
          weekStartDate: new Date(weekStartDate),
          items: {
            create: items,
          },
        },
        include: { items: true },
      });
      return menu;
    });
    res
      .status(201)
      .json({ data: { menu: result }, message: "Weekly Menu created" });
  } catch (error) {
    console.error("Create Menu Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.updateWeeklyMenu = async (req, res) => {
  // Ideally this should support full replace or patch
  try {
    const { id } = req.params;
    // ... logic to update menu ...
    res.status(501).json({ error: { message: "Not implemented yet" } });
  } catch (error) {
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// --- Upgrades Management ---
exports.createUpgradePrice = async (req, res) => {
  try {
    const data = req.body;
    const upgrade = await prisma.upgradePrice.create({ data });
    res
      .status(201)
      .json({ data: { upgrade }, message: "Upgrade Price created" });
  } catch (error) {
    console.error("Create Upgrade Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.updateUpgradePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const upgrade = await prisma.upgradePrice.update({ where: { id }, data });
    res.json({ data: { upgrade }, message: "Upgrade Price updated" });
  } catch (error) {
    console.error("Update Upgrade Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.deleteUpgradePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const upgrade = await prisma.upgradePrice.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ data: { upgrade }, message: "Upgrade Price deactivated" });
  } catch (error) {
    console.error("Delete Upgrade Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// --- Subscriptions Management ---
exports.getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, phoneNumber: true } },
        mealPackage: { select: { name: true } },
        pricing: true,
      },
    });
    res.json({ data: { subscriptions } });
  } catch (error) {
    console.error("Get All Subscriptions Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// --- Curry Package Management ---
exports.createCurryPackage = async (req, res) => {
  try {
    const data = req.body;
    const package = await prisma.curryTokenPackage.create({ data });
    res
      .status(201)
      .json({ data: { package }, message: "Curry Package created" });
  } catch (error) {
    console.error("Create Curry Package Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.updateCurryPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const package = await prisma.curryTokenPackage.update({
      where: { id },
      data,
    });
    res.json({ data: { package }, message: "Curry Package updated" });
  } catch (error) {
    console.error("Update Curry Package Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.deleteCurryPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const package = await prisma.curryTokenPackage.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ data: { package }, message: "Curry Package deactivated" });
  } catch (error) {
    console.error("Delete Curry Package Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const subscription = await prisma.subscription.update({
      where: { id },
      data,
    });
    res.json({ data: { subscription }, message: "Subscription updated" });
  } catch (error) {
    console.error("Update Subscription Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};
