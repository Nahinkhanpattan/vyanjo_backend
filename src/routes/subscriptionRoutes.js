const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');
const validateRequest = require('../middleware/validate');
const { body } = require('express-validator');

const validateSubscription = [
    body('meal_package_id').isUUID().withMessage('Invalid Meal Package ID'),
    body('address_id').isUUID().withMessage('Invalid Address ID'),
    body('container_type').isIn(['plastic', 'steel']).withMessage('Invalid container type'),
    body('start_date').isISO8601().toDate().withMessage('Invalid start date'),
    validateRequest
];

router.use(verifyToken);

router.post('/', validateSubscription, subscriptionController.createSubscription);
router.post('/:id/upgrade', subscriptionController.createUpgrade);
router.get('/active', subscriptionController.getActiveSubscription);

module.exports = router;
