const paymentService = require('../services/payment.service');
const wrapAsync = require('../utils/wrapAsync');
const { sendSuccess } = require('../utils/response.util');
const { PAYMENT_TYPES } = require('../utils/constants');

const createPayment = wrapAsync(async (req, res) => {
  const payment = await paymentService.createPayment(req.user, req.body);
  return sendSuccess(res, {
    message: 'Payment created',
    data: { payment, requiresProof: payment.methodType === PAYMENT_TYPES.QR },
    statusCode: 201,
  });
});

const uploadProof = wrapAsync(async (req, res) => {
  const payment = await paymentService.uploadProof(req.user, req.params.id, req.file);
  return sendSuccess(res, { message: 'Payment proof uploaded', data: { payment } });
});

const verifyPayment = wrapAsync(async (req, res) => {
  const payment = await paymentService.verifyPayment(req.user, req.params.id);
  return sendSuccess(res, { message: 'Payment verified', data: { payment } });
});

const rejectPayment = wrapAsync(async (req, res) => {
  const payment = await paymentService.rejectPayment(req.user, req.params.id, req.body.reason);
  return sendSuccess(res, { message: 'Payment rejected', data: { payment } });
});

const getPayment = wrapAsync(async (req, res) => {
  const payment = await paymentService.getPayment(req.user, req.params.id);
  return sendSuccess(res, { message: 'Payment fetched', data: { payment } });
});

module.exports = {
  createPayment,
  uploadProof,
  verifyPayment,
  rejectPayment,
  getPayment,
};
