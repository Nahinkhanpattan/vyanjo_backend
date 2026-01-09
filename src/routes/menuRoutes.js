const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const menuController = require("../controllers/menuController");

const verifyAdmin = require("../middleware/adminAuth"); // Import verifyAdmin

router.use(verifyToken);

router.get("/current", menuController.getCurrentMenu);
router.get("/week", menuController.getWeeklyMenu);

// Admin Routes
router.get("/", verifyAdmin, menuController.getAllMenus);
router.delete("/:id", verifyAdmin, menuController.deleteMenu);

module.exports = router;
