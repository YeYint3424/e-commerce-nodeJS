const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'E-commerce API root', data: { version: '1.0.0' } });
});

router.use('/auth', require('./auth.routes'));
router.use('/accounts', require('./account.routes'));
router.use('/profile', require('./profile.routes'));
router.use('/categories', require('./category.routes'));
router.use('/payment-options', require('./paymentOption.routes'));
router.use('/products', require('./product.routes'));

module.exports = router;
