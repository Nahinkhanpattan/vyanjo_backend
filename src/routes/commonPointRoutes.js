const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const commonPointController = require("../controllers/commonPointController");

// All routes require authentication as per plan?
// Plan said: Authentication: Required for GET /api/common-points
router.use(verifyToken);

router.get("/", commonPointController.getCommonPoints);
router.post("/", commonPointController.createCommonPoint);
router.put("/:id", commonPointController.updateCommonPoint);
router.delete("/:id", commonPointController.deleteCommonPoint);

module.exports = router;
