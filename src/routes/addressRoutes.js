const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const addressController = require('../controllers/addressController');
const validateRequest = require('../middleware/validate');
const { body } = require('express-validator');

const validateAddress = [
  body('tag').isIn(['home', 'work', 'office', 'other']).withMessage('Invalid tag'),
  body('addressLine1').trim().notEmpty().withMessage('Address Line 1 is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pincode').matches(/^[0-9]{6}$/).withMessage('Invalid Pincode'),
  body('isPrimary').optional().isBoolean(),
  body('commonPointId').optional().isUUID().withMessage('Invalid Common Point ID'),
  validateRequest
];

router.use(verifyToken);

router.get('/', addressController.getAddresses);
router.post('/', validateAddress, addressController.createAddress);
router.put('/:id', validateAddress, addressController.updateAddress);

module.exports = router;
