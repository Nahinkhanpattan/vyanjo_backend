const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authenticate = require("../middleware/auth");
const { upload } = require("../utils/cloudinary");

router.get("/config", authenticate, paymentController.getPaymentConfig);

router.post("/submit", authenticate, paymentController.submitPaymentProof);

router.get("/history", authenticate, paymentController.getUserPaymentHistory);

module.exports = router;
