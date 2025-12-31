const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const authController = require('../controllers/authController');
const validateRequest = require('../middleware/validate');
const { body } = require('express-validator');

// Validation rules
const validateProfile = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  validateRequest
];

// Routes
router.post('/login', verifyToken, authController.login);
router.put('/profile', verifyToken, validateProfile, authController.updateProfile);

module.exports = router;
