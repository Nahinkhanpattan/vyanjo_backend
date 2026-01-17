const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const menuController = require("../controllers/menuController");
const adminController = require("../controllers/adminController");

const verifyAdmin = require("../middleware/adminAuth"); // Import verifyAdmin

router.use(verifyToken);

router.get("/current", menuController.getCurrentMenu);
router.get("/week", menuController.getWeeklyMenu);
router.get("/next-week", menuController.getNextWeeklyMenu);

// Admin Routes
router.get("/", verifyAdmin, menuController.getAllMenus);
router.put("/:id", verifyAdmin, adminController.updateWeeklyMenu);
router.delete("/:id", verifyAdmin, menuController.deleteMenu);

module.exports = router;
