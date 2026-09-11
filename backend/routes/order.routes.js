const express = require('express');
const { body } = require('express-validator');

const orderController = require('../controllers/order.controller');
const { validate } = require('../middlewares/validation.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { ROLES, ORDER_STATUS } = require('../utils/constants');

const router = express.Router();

router.use(authenticate);

const createValidators = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isMongoId().withMessage('A valid productId is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1').toInt(),
  body('shippingInfo.name').trim().notEmpty().withMessage('Shipping name is required'),
  body('shippingInfo.phone').trim().notEmpty().withMessage('Shipping phone is required'),
  body('shippingInfo.address').trim().notEmpty().withMessage('Shipping address is required'),
];

const statusValidators = [
  body('status').isIn(Object.values(ORDER_STATUS)).withMessage('Invalid status'),
  body('reason').optional().trim(),
];

const cancelValidators = [body('reason').optional().trim()];

const editValidators = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isMongoId().withMessage('A valid productId is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1').toInt(),
  body('reason').trim().notEmpty().withMessage('A reason is required'),
];

router.post('/', requireRole(ROLES.CUSTOMER), createValidators, validate, orderController.createOrder);
router.get('/', orderController.listOrders);
router.get('/:id', orderController.getOrder);
router.patch(
  '/:id/status',
  requireRole(ROLES.STAFF, ROLES.ADMIN, ROLES.DEFAULT_ADMIN),
  statusValidators,
  validate,
  orderController.changeStatus
);
router.patch('/:id/cancel', requireRole(ROLES.CUSTOMER), cancelValidators, validate, orderController.cancelOrder);
router.put(
  '/:id',
  requireRole(ROLES.STAFF, ROLES.ADMIN, ROLES.DEFAULT_ADMIN),
  editValidators,
  validate,
  orderController.editOrder
);

module.exports = router;
