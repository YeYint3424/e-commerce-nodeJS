const express = require('express');
const { body } = require('express-validator');

const accountController = require('../controllers/account.controller');
const { validate } = require('../middlewares/validation.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

const CREATABLE_ROLES = [ROLES.STAFF, ROLES.HR, ROLES.CUSTOMER, ROLES.ADMIN];

router.use(authenticate, requireRole(ROLES.ADMIN, ROLES.DEFAULT_ADMIN, ROLES.HR));

const createValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').isIn(CREATABLE_ROLES).withMessage('Invalid role'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
];

const updateValidators = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
];

const roleValidators = [body('role').isIn(CREATABLE_ROLES).withMessage('Invalid role')];

const statusValidators = [body('status').isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status')];

router.post('/', createValidators, validate, accountController.createAccount);
router.get('/', accountController.listAccounts);
router.get('/:id', accountController.getAccount);
router.put('/:id', updateValidators, validate, accountController.updateAccount);
router.patch('/:id/role', roleValidators, validate, accountController.changeRole);
router.patch('/:id/status', statusValidators, validate, accountController.changeStatus);
router.delete('/:id', accountController.deleteAccount);

module.exports = router;
