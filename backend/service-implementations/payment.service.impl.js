const paymentRepository = require('../repositories/payment.repository');
const orderRepository = require('../repositories/order.repository');
const paymentOptionRepository = require('../repositories/paymentOption.repository');
const orderService = require('../services/order.service');
const auditLogService = require('../services/auditLog.service');
const AppError = require('../utils/AppError');
const { ROLES, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_TYPES } = require('../utils/constants');

async function createPayment(customer, data) {
  const { orderId, paymentOptionId } = data;

  const order = await orderRepository.findByIdRaw(orderId);
  if (!order || order.customer.toString() !== customer._id.toString()) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  if (order.status !== ORDER_STATUS.PENDING) {
    throw new AppError('Order is not pending payment', 409, 'CONFLICT');
  }

  if (order.paymentId) {
    throw new AppError('Payment already exists for this order', 409, 'CONFLICT');
  }

  const paymentOption = await paymentOptionRepository.findById(paymentOptionId);
  if (!paymentOption) {
    throw new AppError('Payment option not found', 404, 'NOT_FOUND');
  }
  if (paymentOption.status !== 'ACTIVE') {
    throw new AppError('Selected payment option is not available', 422, 'VALIDATION_ERROR');
  }

  const payment = await paymentRepository.create({
    order: order._id,
    paymentOption: paymentOption._id,
    methodName: paymentOption.name,
    methodType: paymentOption.type,
    amount: order.total,
    status: PAYMENT_STATUS.PENDING,
  });

  order.paymentId = payment._id;
  await order.save();

  return payment.toJSON();
}

async function getOwningOrder(payment) {
  return orderRepository.findByIdRaw(payment.order);
}

async function uploadProof(customer, paymentId, file) {
  const payment = await paymentRepository.findById(paymentId);
  if (!payment) {
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }

  const order = await getOwningOrder(payment);
  if (!order || order.customer.toString() !== customer._id.toString()) {
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }

  if (payment.methodType !== PAYMENT_TYPES.QR) {
    throw new AppError('Proof upload is only applicable to QR payments', 422, 'VALIDATION_ERROR');
  }

  if (payment.status !== PAYMENT_STATUS.PENDING) {
    throw new AppError('Payment is no longer pending', 409, 'CONFLICT');
  }

  if (!file) {
    throw new AppError('A proof image is required', 422, 'VALIDATION_ERROR');
  }

  payment.proofImage = `/uploads/payment-proofs/${file.filename}`;
  await payment.save();

  return payment.toJSON();
}

async function verifyPayment(caller, paymentId) {
  const payment = await paymentRepository.findById(paymentId);
  if (!payment) {
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }

  if (payment.methodType === PAYMENT_TYPES.QR && !payment.proofImage) {
    throw new AppError('Payment proof has not been uploaded yet', 409, 'CONFLICT');
  }

  if (payment.status !== PAYMENT_STATUS.PENDING) {
    throw new AppError('Payment is no longer pending', 409, 'CONFLICT');
  }

  const previousStatus = payment.status;

  payment.status = PAYMENT_STATUS.VERIFIED;
  payment.verifiedBy = caller._id;
  payment.verifiedAt = new Date();
  await payment.save();

  await auditLogService.record({
    user: caller._id,
    action: 'PAYMENT_VERIFIED',
    entity: 'Payment',
    entityId: payment._id,
    oldValue: { status: previousStatus },
    newValue: { status: PAYMENT_STATUS.VERIFIED },
  });

  return payment.toJSON();
}

async function rejectPayment(caller, paymentId, reason) {
  if (!reason || !reason.trim()) {
    throw new AppError('A reason is required to reject a payment', 422, 'VALIDATION_ERROR');
  }

  const payment = await paymentRepository.findById(paymentId);
  if (!payment) {
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }

  if (payment.status !== PAYMENT_STATUS.PENDING) {
    throw new AppError('Payment is no longer pending', 409, 'CONFLICT');
  }

  const trimmedReason = reason.trim();
  const previousStatus = payment.status;

  payment.status = PAYMENT_STATUS.REJECTED;
  payment.rejectedBy = caller._id;
  payment.rejectedAt = new Date();
  payment.rejectionReason = trimmedReason;
  await payment.save();

  await auditLogService.record({
    user: caller._id,
    action: 'PAYMENT_REJECTED',
    entity: 'Payment',
    entityId: payment._id,
    reason: trimmedReason,
    oldValue: { status: previousStatus },
    newValue: { status: PAYMENT_STATUS.REJECTED },
  });

  await orderService.changeStatus(caller, payment.order.toString(), ORDER_STATUS.PAYMENT_FAILED, `Payment rejected: ${trimmedReason}`);

  return payment.toJSON();
}

async function getPayment(caller, paymentId) {
  const payment = await paymentRepository.findById(paymentId);
  if (!payment) {
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }

  const order = await getOwningOrder(payment);
  if (!order) {
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }

  if (caller.role === ROLES.CUSTOMER) {
    if (order.customer.toString() !== caller._id.toString()) {
      throw new AppError('Payment not found', 404, 'NOT_FOUND');
    }
  } else if (![ROLES.STAFF, ROLES.ADMIN, ROLES.DEFAULT_ADMIN].includes(caller.role)) {
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }

  return payment.toJSON();
}

module.exports = {
  createPayment,
  uploadProof,
  verifyPayment,
  rejectPayment,
  getPayment,
};
