import { request } from './http.js';

function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export function listCategories(params = {}) {
  return request(`/categories${buildQuery(params)}`);
}

export function getCategory(id) {
  return request(`/categories/${id}`);
}
