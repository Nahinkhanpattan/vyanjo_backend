const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const verifyAdmin = require("../middleware/adminAuth");

router.use(verifyAdmin);

// Users
router.get("/users", adminController.getAllUsers);
router.get("/users/:id", adminController.getUserById);
router.put("/users/:id", adminController.updateUser);
router.post("/users", adminController.createUser);
router.patch("/users/:id/status", adminController.toggleUserStatus);
router.delete("/users/:id", adminController.deleteUser);

// Meal Packages
router.get("/meal-packages", adminController.getAllMealPackages);
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

// Time Slots
router.get("/time-slots", adminController.getAllDeliveryTimeSlots);
router.post("/time-slots", adminController.createDeliveryTimeSlot);
router.put("/time-slots/:id", adminController.updateDeliveryTimeSlot);
router.delete("/time-slots/:id", adminController.deleteDeliveryTimeSlot);

// Common Points
router.get("/common-points", adminController.getAllCommonPoints);
// Existing Create/Update/Delete Common Points are already there

// Addresses
router.get("/addresses", adminController.getAllAddresses);
router.put("/addresses/:id", adminController.updateAddress);
router.delete("/addresses/:id", adminController.deleteAddress);

// Payment Configuration
router.post("/payment-details", adminController.createPaymentDetails);
router.get("/payment-details", adminController.getPaymentDetailsAdmin);

// Payment Verification
router.get("/payments", adminController.getAllPaymentProofs);
router.post("/payments/:id/verify", adminController.verifyPaymentProof);
router.post("/payments/:id/reject", adminController.rejectPaymentProof);

// Order Management
router.get("/orders/stats", adminController.getOrderStats);
router.get("/orders/users", adminController.getUsersWithOrders);
router.get(
  "/users/:id/delivery-details",
  adminController.getUserDeliveryDetails
);
router.patch("/meals/:id/status", adminController.updateMealStatus);
router.get("/earnings/daily", adminController.getDailyEarnings);

module.exports = router;
