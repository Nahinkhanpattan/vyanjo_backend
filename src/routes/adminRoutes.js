const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const verifyAdmin = require("../middleware/adminAuth");

router.use(verifyAdmin);

// Users
router.get("/users", adminController.getAllUsers);
router.get("/users/:id", adminController.getUserById);
router.put("/users/:id", adminController.updateUser);
router.patch("/users/:id/status", adminController.toggleUserStatus);

// Meal Packages
router.post("/meal-packages", adminController.createMealPackage);
router.put("/meal-packages/:id", adminController.updateMealPackage);
router.patch(
  "/meal-packages/:id/status",
  adminController.toggleMealPackageStatus
);
router.delete("/meal-packages/:id", adminController.deleteMealPackage);

// Package Pricing (New)
router.post("/package-pricing", adminController.createPackagePricing);
router.put("/package-pricing/:id", adminController.updatePackagePricing);
router.delete("/package-pricing/:id", adminController.deletePackagePricing);

// Common Points
router.post("/common-points", adminController.createCommonPoint);
router.put("/common-points/:id", adminController.updateCommonPoint);
router.delete("/common-points/:id", adminController.deleteCommonPoint);

// Categories
router.get("/categories", adminController.getAllCategories);
router.post("/categories", adminController.createCategory);
router.put("/categories/:id", adminController.updateCategory);
router.delete("/categories/:id", adminController.deleteCategory);

// Menu Items
router.get("/menu-items", adminController.getAllMenuItems);
router.post("/menu-items", adminController.createMenuItem);
router.put("/menu-items/:id", adminController.updateMenuItem);
router.delete("/menu-items/:id", adminController.deleteMenuItem);

// Menus
router.post("/menus", adminController.createWeeklyMenu);
router.put("/menus/:id", adminController.updateWeeklyMenu);

// Upgrades
router.post("/upgrades", adminController.createUpgradePrice);
router.put("/upgrades/:id", adminController.updateUpgradePrice);
router.delete("/upgrades/:id", adminController.deleteUpgradePrice);

// Subscriptions
router.get("/subscriptions", adminController.getAllSubscriptions);
router.put("/subscriptions/:id", adminController.updateSubscription);

// Curry Packages
router.post("/curry-packages", adminController.createCurryPackage);
router.put("/curry-packages/:id", adminController.updateCurryPackage);
router.delete("/curry-packages/:id", adminController.deleteCurryPackage);

module.exports = router;
