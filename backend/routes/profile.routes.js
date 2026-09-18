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

const changePasswordValidators = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
];

router.get('/', profileController.getProfile);
router.put('/', updateValidators, validate, profileController.updateProfile);
router.patch('/password', changePasswordValidators, validate, profileController.changePassword);

module.exports = router;
