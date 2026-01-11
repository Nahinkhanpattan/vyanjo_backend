const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const verifyAdmin = require("../middleware/adminAuth");
const {
  createState,
  createDistrict,
  createPincode,
  getAllStates,
  getDistrictsByState,
  getPincodesByDistrict,
} = require("../controllers/masterDataController");
const {
  checkServiceability,
} = require("../controllers/serviceabilityController");

// Serviceability
router.get("/check-pincode", checkServiceability);

// Public or Authenticated generic routes
// Users need to fetch these to populate dropdowns
router.get("/states", getAllStates);
router.get("/states/:stateId/districts", getDistrictsByState);
router.get("/districts/:districtId/pincodes", getPincodesByDistrict);

// Admin Only - Management
router.post("/states", verifyToken, verifyAdmin, createState);
router.post("/districts", verifyToken, verifyAdmin, createDistrict);
router.post("/pincodes", verifyToken, verifyAdmin, createPincode);

module.exports = router;
