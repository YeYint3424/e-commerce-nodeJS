import { request } from './http.js';

export function createOrder(payload) {
  return request('/orders', { method: 'POST', body: payload });
}

export function getOrder(id) {
  return request(`/orders/${id}`);
}
