const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const menuController = require('../controllers/menuController');

router.use(verifyToken);

router.get('/current', menuController.getCurrentMenu);
router.get('/week', menuController.getWeeklyMenu);

module.exports = router;
