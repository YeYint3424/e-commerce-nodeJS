import { request } from './http.js';

export function getPayment(id) {
  return request(`/payments/${id}`);
}

export function verifyPayment(id) {
  return request(`/payments/${id}/verify`, { method: 'PATCH' });
}

export function rejectPayment(id, reason) {
  return request(`/payments/${id}/reject`, { method: 'PATCH', body: { reason } });
}
