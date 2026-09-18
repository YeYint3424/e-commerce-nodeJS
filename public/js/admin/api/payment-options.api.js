import { request, requestForm, buildQuery } from './http.js';

export function listPaymentOptions(params = {}) {
  return request(`/payment-options${buildQuery(params)}`);
}

export function getPaymentOption(id) {
  return request(`/payment-options/${id}`);
}

export function createPaymentOption(formData) {
  return requestForm('/payment-options', { method: 'POST', formData });
}

export function updatePaymentOption(id, formData) {
  return requestForm(`/payment-options/${id}`, { method: 'PUT', formData });
}

export function changeStatus(id, status) {
  return request(`/payment-options/${id}/status`, { method: 'PATCH', body: { status } });
}

export function deletePaymentOption(id) {
  return request(`/payment-options/${id}`, { method: 'DELETE' });
}
