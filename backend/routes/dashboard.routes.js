const express = require('express');

const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.get(
  '/',
  authenticate,
  requireRole(ROLES.STAFF, ROLES.ADMIN, ROLES.DEFAULT_ADMIN),
  dashboardController.getDashboard
);

module.exports = router;
