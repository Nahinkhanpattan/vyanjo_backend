const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const mealPackageController = require('../controllers/mealPackageController');

// Allow browsing without auth? Plan says "Authentication: Required" for everything in general, but browsing might be public.
// Prompt step 542 doesn't explicitly say "Authentication: Required" but "MEAL PACKAGE BROWSING".
// However, the general note says "Backend verifies token" on "Authentication Flow (Every Request)".
// I'll enforce auth for now to be safe and consistent with "Every Request" comment.
router.use(verifyToken);

router.get('/', mealPackageController.getMealPackages);

module.exports = router;
