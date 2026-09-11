const AppError = require('../utils/AppError');
const { ROLES, ADMIN_PANEL_ROLES } = require('../utils/constants');

function requireRole(...roles) {
  return function roleChecker(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN'));
    }
    return next();
  };
}

const requireAdminPanel = requireRole(...ADMIN_PANEL_ROLES);
const requireAdmin = requireRole(ROLES.ADMIN, ROLES.DEFAULT_ADMIN);

module.exports = { requireRole, requireAdminPanel, requireAdmin };
