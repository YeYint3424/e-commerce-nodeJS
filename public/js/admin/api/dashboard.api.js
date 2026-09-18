import { request, buildQuery } from './http.js';

export function getDashboard(params = {}) {
  return request(`/dashboard${buildQuery(params)}`);
}
