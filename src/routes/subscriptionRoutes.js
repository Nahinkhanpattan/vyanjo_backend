const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const subscriptionController = require("../controllers/subscriptionController");
const validateRequest = require("../middleware/validate");
const { body } = require("express-validator");

const validateSubscription = [
  body("pricing_id").isUUID().withMessage("Invalid Pricing ID"),
  body("address_id").optional(), // Allow temp strings or UUID
  body("start_date").isISO8601().toDate().withMessage("Invalid start date"),
  validateRequest,
];

router.use(verifyToken);

router.post(
  "/",
  validateSubscription,
  subscriptionController.createSubscription
);
router.post("/:id/upgrade", subscriptionController.createUpgrade);
router.get("/:id/upgrades", subscriptionController.getAvailableUpgrades);
router.post("/:id/pause", subscriptionController.pauseSubscription);
router.post("/:id/resume", subscriptionController.resumeSubscription);
router.get("/:id/pauses", subscriptionController.getSubscriptionPauses);
router.get("/active", subscriptionController.getActiveSubscription);

module.exports = router;
