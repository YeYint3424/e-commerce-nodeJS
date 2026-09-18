import { request, buildQuery } from './http.js';

export function listCategories(params = {}) {
  return request(`/categories${buildQuery(params)}`);
}

export function getCategory(id) {
  return request(`/categories/${id}`);
}

export function createCategory(payload) {
  return request('/categories', { method: 'POST', body: payload });
}

export function updateCategory(id, payload) {
  return request(`/categories/${id}`, { method: 'PUT', body: payload });
}

export function deleteCategory(id) {
  return request(`/categories/${id}`, { method: 'DELETE' });
}
