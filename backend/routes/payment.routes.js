const express = require('express');
const { body } = require('express-validator');

const paymentController = require('../controllers/payment.controller');
const { validate } = require('../middlewares/validation.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { createUploader } = require('../middlewares/upload.middleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(authenticate);

const proofUpload = createUploader({
  destination: 'payment-proofs',
  fieldName: 'proofImage',
  maxCount: 1,
  maxSizeMB: 5,
});

const createValidators = [
  body('orderId').isMongoId().withMessage('A valid orderId is required'),
  body('paymentOptionId').isMongoId().withMessage('A valid paymentOptionId is required'),
];

const rejectValidators = [body('reason').trim().notEmpty().withMessage('A reason is required')];

router.post('/', requireRole(ROLES.CUSTOMER), createValidators, validate, paymentController.createPayment);
router.post('/:id/proof', requireRole(ROLES.CUSTOMER), proofUpload, paymentController.uploadProof);
router.patch(
  '/:id/verify',
  requireRole(ROLES.STAFF, ROLES.ADMIN, ROLES.DEFAULT_ADMIN),
  paymentController.verifyPayment
);
router.patch(
  '/:id/reject',
  requireRole(ROLES.STAFF, ROLES.ADMIN, ROLES.DEFAULT_ADMIN),
  rejectValidators,
  validate,
  paymentController.rejectPayment
);
router.get('/:id', paymentController.getPayment);

module.exports = router;
