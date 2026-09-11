const express = require('express');

const voucherController = require('../controllers/voucher.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(authenticate);

router.get('/', requireRole(ROLES.CUSTOMER), voucherController.listVouchers);
router.get('/:id', voucherController.getVoucher);
router.get('/:id/pdf', voucherController.downloadVoucherPdf);

module.exports = router;
