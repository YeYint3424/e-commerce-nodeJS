const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'E-commerce API root', data: { version: '1.0.0' } });
});

module.exports = router;
