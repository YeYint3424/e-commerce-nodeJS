import { isAuthenticated, getUser } from './auth.js';
import { ADMIN_PANEL_ROLES } from './constants.js';

export function requireAdminAuth(allowedRoles = ADMIN_PANEL_ROLES) {
  if (!isAuthenticated()) {
    window.location.href = '/ecommerce-admin/login';
    return null;
  }

  const user = getUser();
  if (!user || !ADMIN_PANEL_ROLES.includes(user.role) || !allowedRoles.includes(user.role)) {
    window.location.href = '/ecommerce-admin/login';
    return null;
  }

  return user;
}
