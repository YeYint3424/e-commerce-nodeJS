const express = require('express');
const { body } = require('express-validator');

const profileController = require('../controllers/profile.controller');
const { validate } = require('../middlewares/validation.middleware');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

const updateValidators = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('avatar').optional().trim(),
];

router.get('/', profileController.getProfile);
router.put('/', updateValidators, validate, profileController.updateProfile);

module.exports = router;
