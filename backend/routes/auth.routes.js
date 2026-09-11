const express = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validation.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { authRateLimiter } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

const registerValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

const loginValidators = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post(
  '/customer/register',
  authRateLimiter,
  registerValidators,
  validate,
  authController.registerCustomer
);

router.post(
  '/customer/login',
  authRateLimiter,
  loginValidators,
  validate,
  authController.loginCustomer
);

router.post(
  '/admin/login',
  authRateLimiter,
  loginValidators,
  validate,
  authController.loginAdminPanel
);

router.get('/me', authenticate, authController.getMe);

module.exports = router;
