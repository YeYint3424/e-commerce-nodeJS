import { request } from './http.js';

export function registerCustomer(payload) {
  return request('/auth/customer/register', { method: 'POST', body: payload });
}

export function loginCustomer(payload) {
  return request('/auth/customer/login', { method: 'POST', body: payload });
}

export function getMe() {
  return request('/auth/me');
}
