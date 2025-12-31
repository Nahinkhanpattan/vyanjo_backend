const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verifyAdmin = require('../middleware/adminAuth');

router.use(verifyAdmin);

// Users
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);


// Meal Packages
router.post('/meal-packages', adminController.createMealPackage);
router.put('/meal-packages/:id', adminController.updateMealPackage);
router.delete('/meal-packages/:id', adminController.deleteMealPackage);

// Common Points
router.post('/common-points', adminController.createCommonPoint);
router.put('/common-points/:id', adminController.updateCommonPoint);
router.delete('/common-points/:id', adminController.deleteCommonPoint);



// Menus
router.post('/menus', adminController.createWeeklyMenu);
router.put('/menus/:id', adminController.updateWeeklyMenu);

// Upgrades
router.post('/upgrades', adminController.createUpgradePrice);
router.put('/upgrades/:id', adminController.updateUpgradePrice);
router.delete('/upgrades/:id', adminController.deleteUpgradePrice);

// Subscriptions
router.get('/subscriptions', adminController.getAllSubscriptions);
router.put('/subscriptions/:id', adminController.updateSubscription);

module.exports = router;
