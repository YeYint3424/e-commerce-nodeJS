const express = require('express');
const { body } = require('express-validator');

const productController = require('../controllers/product.controller');
const { validate } = require('../middlewares/validation.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { createUploader } = require('../middlewares/upload.middleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

const productImagesUpload = createUploader({
  destination: 'products',
  fieldName: 'images',
  maxCount: 5,
  maxSizeMB: 5,
});

const createValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('category').isMongoId().withMessage('A valid category id is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number').toFloat(),
  body('discountPrice')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('discountPrice must be a non-negative number')
    .toFloat(),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer').toInt(),
  body('sku').optional().trim(),
  body('description').optional().trim(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  body('paymentOptions').optional().isArray().withMessage('paymentOptions must be an array'),
  body('paymentOptions.*').optional().isMongoId().withMessage('Invalid payment option id'),
];

const updateValidators = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('category').optional().isMongoId().withMessage('A valid category id is required'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number').toFloat(),
  body('discountPrice')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('discountPrice must be a non-negative number')
    .toFloat(),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer').toInt(),
  body('sku').optional().trim(),
  body('description').optional().trim(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  body('paymentOptions').optional().isArray().withMessage('paymentOptions must be an array'),
  body('paymentOptions.*').optional().isMongoId().withMessage('Invalid payment option id'),
];

router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);

router.post(
  '/',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.DEFAULT_ADMIN, ROLES.STAFF),
  productImagesUpload,
  createValidators,
  validate,
  productController.createProduct
);

router.put(
  '/:id',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.DEFAULT_ADMIN, ROLES.STAFF),
  productImagesUpload,
  updateValidators,
  validate,
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.DEFAULT_ADMIN),
  productController.deleteProduct
);

module.exports = router;
