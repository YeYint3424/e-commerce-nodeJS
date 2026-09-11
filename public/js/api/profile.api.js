import { request } from './http.js';

export function getProfile() {
  return request('/profile');
}
