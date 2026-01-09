const express = require("express");
const router = express.Router();
const deliveryController = require("../controllers/deliveryController");
const authenticate = require("../middleware/auth");

router.get("/slots", deliveryController.getDeliverySlots);
router.post(
  "/preferences",
  authenticate,
  deliveryController.updateDeliveryPreferences
); // Added route using imported auth
// router.post("/allocate", verifyToken, deliveryController.allocateDelivery);

module.exports = router;
