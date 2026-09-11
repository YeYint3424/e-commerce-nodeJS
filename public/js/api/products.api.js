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

export function listProducts(params = {}) {
  return request(`/products${buildQuery(params)}`);
}

export function getProduct(id) {
  return request(`/products/${id}`);
}
