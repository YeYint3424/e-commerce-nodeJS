import { request } from './http.js';

const TOKEN_KEY = 'auth.token';

export function listPaymentOptions(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });
  const qs = query.toString();
  return request(`/payment-options${qs ? `?${qs}` : ''}`);
}

export function createPayment(payload) {
  return request('/payments', { method: 'POST', body: payload });
}

export function getPayment(id) {
  return request(`/payments/${id}`);
}

export async function uploadPaymentProof(id, file) {
  const token = localStorage.getItem(TOKEN_KEY);
  const formData = new FormData();
  formData.append('proofImage', file);

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`/api/payments/${id}/proof`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (err) {
    throw new Error('Unable to reach the server. Please check your connection.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (err) {
    payload = null;
  }

  if (!response.ok || !payload || payload.success === false) {
    const message = (payload && payload.message) || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
