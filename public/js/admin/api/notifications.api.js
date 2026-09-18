import { request, buildQuery } from './http.js';

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
