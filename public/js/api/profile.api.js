import { request } from './http.js';

export function getProfile() {
  return request('/profile');
}

export function updateProfile(payload) {
  return request('/profile', { method: 'PUT', body: payload });
}

export function changePassword(payload) {
  return request('/profile/password', { method: 'PATCH', body: payload });
}
