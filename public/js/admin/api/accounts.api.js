import { request, buildQuery } from './http.js';

export function listAccounts(params = {}) {
  return request(`/accounts${buildQuery(params)}`);
}

export function getAccount(id) {
  return request(`/accounts/${id}`);
}

export function createAccount(payload) {
  return request('/accounts', { method: 'POST', body: payload });
}

export function updateAccount(id, payload) {
  return request(`/accounts/${id}`, { method: 'PUT', body: payload });
}

export function changeRole(id, role) {
  return request(`/accounts/${id}/role`, { method: 'PATCH', body: { role } });
}

export function changeStatus(id, status) {
  return request(`/accounts/${id}/status`, { method: 'PATCH', body: { status } });
}

export function deleteAccount(id) {
  return request(`/accounts/${id}`, { method: 'DELETE' });
}
