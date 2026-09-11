import { request } from './http.js';

export function createOrder(payload) {
  return request('/orders', { method: 'POST', body: payload });
}

export function getOrder(id) {
  return request(`/orders/${id}`);
}

export function cancelOrder(id, reason) {
  return request(`/orders/${id}/cancel`, { method: 'PATCH', body: { reason } });
}
