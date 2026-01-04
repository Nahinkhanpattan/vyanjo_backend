const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const verifyAdmin = require("../middleware/adminAuth");
const controller = require("../controllers/masterDataController");

// Public or Authenticated generic routes
// Users need to fetch these to populate dropdowns
router.get("/states", controller.getAllStates);
router.get("/states/:stateId/districts", controller.getDistrictsByState);
router.get("/districts/:districtId/pincodes", controller.getPincodesByDistrict);

// Admin Only - Management
router.post("/states", verifyToken, verifyAdmin, controller.createState);
router.post("/districts", verifyToken, verifyAdmin, controller.createDistrict);
router.post("/pincodes", verifyToken, verifyAdmin, controller.createPincode);

module.exports = router;
