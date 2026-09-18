import { request } from './http.js';

export function getProfile() {
  return request('/profile');
}

export function updateProfile(payload) {
  return request('/profile', { method: 'PUT', body: payload });
}
