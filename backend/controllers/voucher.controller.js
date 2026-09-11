const voucherService = require('../services/voucher.service');
const wrapAsync = require('../utils/wrapAsync');
const { sendSuccess } = require('../utils/response.util');
const { writeVoucherPdf } = require('../utils/pdf.util');

const listVouchers = wrapAsync(async (req, res) => {
  const { items, pagination } = await voucherService.listVouchers(req.user, req.query);
  return sendSuccess(res, { message: 'Vouchers fetched', data: { vouchers: items }, pagination });
});

const getVoucher = wrapAsync(async (req, res) => {
  const voucher = await voucherService.getVoucher(req.user, req.params.id);
  return sendSuccess(res, { message: 'Voucher fetched', data: { voucher } });
});

const downloadVoucherPdf = wrapAsync(async (req, res) => {
  const voucher = await voucherService.getVoucherForPdf(req.user, req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="voucher-${voucher.orderId}.pdf"`);
  writeVoucherPdf(voucher, res);
});

module.exports = {
  listVouchers,
  getVoucher,
  downloadVoucherPdf,
};
