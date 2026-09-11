const paymentOptionService = require('../services/paymentOption.service');
const wrapAsync = require('../utils/wrapAsync');
const { sendSuccess } = require('../utils/response.util');

function extractQrImage(req) {
  if (req.file) {
    return `/uploads/payment-options/${req.file.filename}`;
  }
  return undefined;
}

const createPaymentOption = wrapAsync(async (req, res) => {
  const data = { ...req.body };
  const qrImage = extractQrImage(req);
  if (qrImage !== undefined) {
    data.qrImage = qrImage;
  }
  const paymentOption = await paymentOptionService.createPaymentOption(data);
  return sendSuccess(res, { message: 'Payment option created', data: { paymentOption }, statusCode: 201 });
});

const listPaymentOptions = wrapAsync(async (req, res) => {
  const { items, pagination } = await paymentOptionService.listPaymentOptions(req.query);
  return sendSuccess(res, { message: 'Payment options fetched', data: { paymentOptions: items }, pagination });
});

const getPaymentOption = wrapAsync(async (req, res) => {
  const paymentOption = await paymentOptionService.getPaymentOption(req.params.id);
  return sendSuccess(res, { message: 'Payment option fetched', data: { paymentOption } });
});

const updatePaymentOption = wrapAsync(async (req, res) => {
  const data = { ...req.body };
  const qrImage = extractQrImage(req);
  if (qrImage !== undefined) {
    data.qrImage = qrImage;
  }
  const paymentOption = await paymentOptionService.updatePaymentOption(req.params.id, data);
  return sendSuccess(res, { message: 'Payment option updated', data: { paymentOption } });
});

const changeStatus = wrapAsync(async (req, res) => {
  const paymentOption = await paymentOptionService.changeStatus(req.params.id, req.body.status);
  return sendSuccess(res, { message: 'Payment option status updated', data: { paymentOption } });
});

const deletePaymentOption = wrapAsync(async (req, res) => {
  await paymentOptionService.deletePaymentOption(req.params.id);
  return sendSuccess(res, { message: 'Payment option deleted', data: null });
});

module.exports = {
  createPaymentOption,
  listPaymentOptions,
  getPaymentOption,
  updatePaymentOption,
  changeStatus,
  deletePaymentOption,
};
