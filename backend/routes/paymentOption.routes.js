const express = require('express');
const { body } = require('express-validator');

const paymentOptionController = require('../controllers/paymentOption.controller');
const { validate } = require('../middlewares/validation.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { createUploader } = require('../middlewares/upload.middleware');
const { ROLES, PAYMENT_TYPES } = require('../utils/constants');

const router = express.Router();

const qrImageUpload = createUploader({
  destination: 'payment-options',
  fieldName: 'qrImage',
  maxCount: 1,
  maxSizeMB: 5,
});

const createValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('type').isIn(Object.values(PAYMENT_TYPES)).withMessage('Invalid payment type'),
  body('description').optional().trim(),
  body('accountInfo').optional().trim(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
];

const updateValidators = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('type').optional().isIn(Object.values(PAYMENT_TYPES)).withMessage('Invalid payment type'),
  body('description').optional().trim(),
  body('accountInfo').optional().trim(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
];

const statusValidators = [body('status').isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status')];

router.get('/', paymentOptionController.listPaymentOptions);
router.get('/:id', paymentOptionController.getPaymentOption);

router.post(
  '/',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.DEFAULT_ADMIN),
  qrImageUpload,
  createValidators,
  validate,
  paymentOptionController.createPaymentOption
);

router.put(
  '/:id',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.DEFAULT_ADMIN),
  qrImageUpload,
  updateValidators,
  validate,
  paymentOptionController.updatePaymentOption
);

router.patch(
  '/:id/status',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.DEFAULT_ADMIN),
  statusValidators,
  validate,
  paymentOptionController.changeStatus
);

router.delete(
  '/:id',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.DEFAULT_ADMIN),
  paymentOptionController.deletePaymentOption
);

module.exports = router;
