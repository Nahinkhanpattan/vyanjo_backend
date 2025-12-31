const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- Users Management ---
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { subscriptions: true, curryOrders: true }
        }
      }
    });
    res.json({ data: { users } });
  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
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
        raisedIssues: true
      }
    });
    if (!user) return res.status(404).json({ error: { message: 'User not found' } });
    res.json({ data: { user } });
  } catch (error) {
    console.error('Get User Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body; // e.g. { role: 'ADMIN', name: ... }
    const user = await prisma.user.update({
      where: { id },
      data
    });
    res.json({ data: { user }, message: 'User updated' });
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};


// --- Meal Packages Management ---
exports.createMealPackage = async (req, res) => {
  try {
    const data = req.body;
    // Basic validation could be added here or via middleware
    const mealPackage = await prisma.mealPackage.create({
      data: {
        ...data,
         // Ensure numbers are numbers, etc if needed. 
         // Prisma generic handling assumes correct types passed or validation middleware handles it.
      }
    });
    res.status(201).json({ data: { mealPackage }, message: 'Meal Package created' });
  } catch (error) {
    console.error('Create Meal Package Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

exports.updateMealPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const mealPackage = await prisma.mealPackage.update({
      where: { id },
      data
    });
    res.json({ data: { mealPackage }, message: 'Meal Package updated' });
  } catch (error) {
    console.error('Update Meal Package Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

exports.deleteMealPackage = async (req, res) => {
  try {
    const { id } = req.params;
    // Set isActive = false instead of hard delete to preserve history?
    // User requested "crud", let's assume Soft Delete or Hard Delete.
    // Given the schema has isActive, let's toggle that or allow update.
    // If explicit DELETE request, maybe soft delete is safer.
    // But for "CRUD endpoints", usually DELETE means delete or checking isActive.
    
    // Let's implement soft delete by default if 'isActive' exists, or update endpoint handles it.
    // If strict DELETE verb, let's try hard delete but catch FK errors (which might be many).
    // Safest: set isActive = false.
    
    const mealPackage = await prisma.mealPackage.update({
      where: { id },
      data: { isActive: false }
    });
    
    res.json({ data: { mealPackage }, message: 'Meal Package deactivated' });
  } catch (error) {
    console.error('Delete Meal Package Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

// --- Common Points Management ---
exports.createCommonPoint = async (req, res) => {
  try {
    const data = req.body;
    const commonPoint = await prisma.commonPoint.create({ data });
    res.status(201).json({ data: { commonPoint }, message: 'Common Point created' });
  } catch (error) {
    console.error('Create Common Point Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

exports.updateCommonPoint = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const commonPoint = await prisma.commonPoint.update({
      where: { id },
      data
    });
    res.json({ data: { commonPoint }, message: 'Common Point updated' });
  } catch (error) {
   console.error('Update Common Point Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

exports.deleteCommonPoint = async (req, res) => {
  try {
    const { id } = req.params;
    // Soft delete
    const commonPoint = await prisma.commonPoint.update({
      where: { id },
      data: { isActive: false }
    });
    res.json({ data: { commonPoint }, message: 'Common Point deactivated' });
  } catch (error) {
    console.error('Delete Common Point Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

// --- Category Management ---
exports.createCategory = async (req, res) => {
  try {
    const data = req.body;
    const category = await prisma.category.create({ data });
    res.status(201).json({ data: { category }, message: 'Category created' });
  } catch (error) {
    console.error('Create Category Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: { children: true },
      orderBy: { name: 'asc' }
    });
    res.json({ data: { categories } });
  } catch (error) {
    console.error('Get Categories Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const category = await prisma.category.update({ where: { id }, data });
    res.json({ data: { category }, message: 'Category updated' });
  } catch (error) {
    console.error('Update Category Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await prisma.category.update({ where: { id }, data: { isActive: false } });
    res.json({ data: { category }, message: 'Category deactivated' });
  } catch (error) {
    console.error('Delete Category Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

// --- MenuItem Management ---
exports.createMenuItem = async (req, res) => {
  try {
    const data = req.body;
    const menuItem = await prisma.menuItem.create({ data });
    res.status(201).json({ data: { menuItem }, message: 'Menu Item created' });
  } catch (error) {
    console.error('Create MenuItem Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
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
      orderBy: { name: 'asc' }
    });
    res.json({ data: { menuItems } });
  } catch (error) {
    console.error('Get MenuItems Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const menuItem = await prisma.menuItem.update({ where: { id }, data });
    res.json({ data: { menuItem }, message: 'Menu Item updated' });
  } catch (error) {
    console.error('Update MenuItem Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const menuItem = await prisma.menuItem.update({ where: { id }, data: { isActive: false } });
    res.json({ data: { menuItem }, message: 'Menu Item deactivated' });
  } catch (error) {
    console.error('Delete MenuItem Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

// --- Menu Management ---
exports.createWeeklyMenu = async (req, res) => {
    try {
        const { dietType, cuisineType, weekStartDate, items } = req.body;
        // Transaction to create menu and items
        const result = await prisma.$transaction(async (prisma) => {
            const menu = await prisma.weeklyMenu.create({
                data: {
                    dietType,
                    cuisineType,
                    tier: req.body.tier || 'REGULAR', // Support Tier
                    weekStartDate: new Date(weekStartDate),
                    items: {
                        create: items // Expects array of { itemType, dayOfWeek, menuItemId, itemName }
                    }
                },
                include: { items: true }
            });
            return menu;
        });
        res.status(201).json({ data: { menu: result }, message: 'Weekly Menu created' });
    } catch (error) {
        console.error('Create Menu Error:', error);
        res.status(500).json({ error: { message: 'Internal Server Error' } });
    }
};

exports.updateWeeklyMenu = async (req, res) => {
    // Basic stub for creating/replacing
    res.status(501).json({ error: { message: 'Not implemented yet' } });
};

// --- Upgrades Management ---
exports.createUpgradePrice = async (req, res) => {
  try {
    const data = req.body;
    // data should contain { name, fromTier, toTier, fromDiet, toDiet, scope, mealType, price }
    // Add validation if needed
    const upgrade = await prisma.upgradePrice.create({ data });
    res.status(201).json({ data: { upgrade }, message: 'Upgrade Price created' });
  } catch (error) {
    console.error('Create Upgrade Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

exports.updateUpgradePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const upgrade = await prisma.upgradePrice.update({ where: { id }, data });
    res.json({ data: { upgrade }, message: 'Upgrade Price updated' });
  } catch (error) {
    console.error('Update Upgrade Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

exports.deleteUpgradePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const upgrade = await prisma.upgradePrice.update({ where: { id }, data: { isActive: false } });
    res.json({ data: { upgrade }, message: 'Upgrade Price deactivated' });
  } catch (error) {
    console.error('Delete Upgrade Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

// --- Subscriptions Management ---
exports.getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, phoneNumber: true } }, mealPackage: { select: { name: true } } }
    });
    res.json({ data: { subscriptions } });
  } catch (error) {
    console.error('Get All Subscriptions Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

exports.updateSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body; // e.g. { status: 'cancelled' }
        const subscription = await prisma.subscription.update({ where: { id }, data });
        res.json({ data: { subscription }, message: 'Subscription updated' });
    } catch (error) {
        console.error('Update Subscription Error:', error);
        res.status(500).json({ error: { message: 'Internal Server Error' } });
    }
};

