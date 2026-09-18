import { loginAdmin } from './api/auth.api.js';

const TOKEN_KEY = 'admin.auth.token';
const USER_KEY = 'admin.auth.user';

export function isAuthenticated() {
  return !!localStorage.getItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function persist({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('admin-auth:changed', { detail: { user } }));
}

export async function login(payload) {
  const res = await loginAdmin(payload);
  persist(res.data);
  return res.data;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent('admin-auth:changed', { detail: { user: null } }));
}
