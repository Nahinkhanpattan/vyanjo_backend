const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const curryController = require("../controllers/curryController");

// Public or Auth generic
router.get("/packages", curryController.getCurryPackages);

// Protected
router.use(verifyToken);
router.get("/wallet", curryController.getWalletBalance);
router.post("/purchase", curryController.purchaseTokens); // Mock purchase, usually involves payment gateway callback
router.post("/order", curryController.placeCurryOrder);
router.delete("/order/:id", curryController.cancelCurryOrder);
router.post("/convert", curryController.convertTokens);

module.exports = router;
