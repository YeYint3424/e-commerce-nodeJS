import { request, buildQuery } from './http.js';

export function listOrders(params = {}) {
  return request(`/orders${buildQuery(params)}`);
}

export function getOrder(id) {
  return request(`/orders/${id}`);
}

export function changeStatus(id, status, reason) {
  return request(`/orders/${id}/status`, { method: 'PATCH', body: { status, reason } });
}

export function editOrder(id, payload) {
  return request(`/orders/${id}`, { method: 'PUT', body: payload });
}
