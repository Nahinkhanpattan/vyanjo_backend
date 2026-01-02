const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const authController = require('../controllers/authController');
const validateRequest = require('../middleware/validate');
const { body } = require('express-validator');

// Validation rules
const validateSignup = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').optional().trim(),
  validateRequest
];

const validateLogin = [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest
];

const validateProfile = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  validateRequest
];

// Routes
router.post('/signup', validateSignup, authController.signup);
router.post('/login', validateLogin, authController.login);
router.put('/profile', verifyToken, validateProfile, authController.updateProfile);

module.exports = router;
