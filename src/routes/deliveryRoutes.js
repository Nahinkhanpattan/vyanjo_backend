const express = require("express");
const router = express.Router();
const deliveryController = require("../controllers/deliveryController");
// const verifyToken = require("../middleware/auth"); // Optional: Open for public or locked to users

router.get("/slots", deliveryController.getDeliverySlots);
// router.post("/allocate", verifyToken, deliveryController.allocateDelivery);

module.exports = router;
