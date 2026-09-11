import { request } from './http.js';

const TOKEN_KEY = 'auth.token';

export function listVouchers(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });
  const qs = query.toString();
  return request(`/vouchers${qs ? `?${qs}` : ''}`);
}

export function getVoucher(id) {
  return request(`/vouchers/${id}`);
}

export async function downloadVoucherPdf(id) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`/api/vouchers/${id}/pdf`, { headers });
  } catch (err) {
    throw new Error('Unable to reach the server. Please check your connection.');
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = await response.json();
      if (payload && payload.message) {
        message = payload.message;
      }
    } catch (err) {
      // response body was not JSON (e.g. an actual PDF stream); keep default message
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `voucher-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
