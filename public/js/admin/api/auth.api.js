import { request } from './http.js';

export function loginAdmin(payload) {
  return request('/auth/admin/login', { method: 'POST', body: payload });
}

export function getMe() {
  return request('/auth/me');
}
