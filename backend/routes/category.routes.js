const express = require('express');
const { body } = require('express-validator');

const categoryController = require('../controllers/category.controller');
const { validate } = require('../middlewares/validation.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

const createValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('slug').optional().trim(),
  body('description').optional().trim(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
];

const updateValidators = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('slug').optional().trim(),
  body('description').optional().trim(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
];

router.get('/', categoryController.listCategories);
router.get('/:id', categoryController.getCategory);

router.post(
  '/',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.DEFAULT_ADMIN, ROLES.STAFF),
  createValidators,
  validate,
  categoryController.createCategory
);

router.put(
  '/:id',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.DEFAULT_ADMIN, ROLES.STAFF),
  updateValidators,
  validate,
  categoryController.updateCategory
);

router.delete(
  '/:id',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.DEFAULT_ADMIN, ROLES.STAFF),
  categoryController.deleteCategory
);

module.exports = router;
