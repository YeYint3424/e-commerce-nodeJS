import { request } from './http.js';

function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export function listNotifications(params = {}) {
  return request(`/notifications${buildQuery(params)}`);
}

export function getUnreadCount() {
  return request('/notifications/unread-count');
}

export function markAsRead(id) {
  return request(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllAsRead() {
  return request('/notifications/read-all', { method: 'PATCH' });
}
