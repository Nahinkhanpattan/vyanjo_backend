const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const verifyToken = require('../middleware/auth');
const verifyAdmin = require('../middleware/adminAuth');

// User Routes
router.post('/', verifyToken, issueController.raiseIssue);
router.get('/', verifyToken, issueController.getUserIssues);

// Admin Routes
// Note: We mount these under the same base path but protect them differently.
// Or we could have put them in adminRoutes.js.
// Since User Request asked for "issues endpoint", let's keep them here but clear separation.

router.get('/all', verifyAdmin, issueController.getAllIssues);
router.put('/:id/resolve', verifyAdmin, issueController.resolveIssue);

module.exports = router;
