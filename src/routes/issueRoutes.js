const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
// verifyAdmin imported below as verifyAdminMiddleware

const verifyAdminMiddleware = require("../middleware/adminAuth");
const issueController = require("../controllers/issueController");

// Protected User Routes
router.post("/", verifyToken, issueController.createIssue);
router.get("/my-issues", verifyToken, issueController.getMyIssues);

// Admin Routes
router.get("/all", verifyAdminMiddleware, issueController.getAllIssues);
router.put("/:id", verifyAdminMiddleware, issueController.updateIssue);

module.exports = router;
