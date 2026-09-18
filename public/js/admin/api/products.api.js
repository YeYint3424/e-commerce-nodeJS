import { request, requestForm, buildQuery } from './http.js';

export function listProducts(params = {}) {
  return request(`/products${buildQuery(params)}`);
}

export function getProduct(id) {
  return request(`/products/${id}`);
}

export function createProduct(formData) {
  return requestForm('/products', { method: 'POST', formData });
}

export function updateProduct(id, formData) {
  return requestForm(`/products/${id}`, { method: 'PUT', formData });
}

export function deleteProduct(id) {
  return request(`/products/${id}`, { method: 'DELETE' });
}
