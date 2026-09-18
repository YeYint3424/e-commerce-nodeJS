import { login, isAuthenticated, getUser } from './auth.js';
import { toast } from '../components/toast.js';
import { qs } from '../utils/dom.js';

function landingPageFor(role) {
  return role === 'HR' ? '/ecommerce-admin/accounts' : '/ecommerce-admin/dashboard';
}

if (isAuthenticated()) {
  const user = getUser();
  window.location.href = landingPageFor(user && user.role);
}

if (window.lucide) {
  window.lucide.createIcons();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setError(field, message) {
  const el = document.querySelector(`[data-error-for="${field}"]`);
  if (el) {
    el.textContent = message || '';
  }
}

function validate(data) {
  let valid = true;
  if (!data.email || !EMAIL_RE.test(data.email)) {
    setError('email', 'Enter a valid email address');
    valid = false;
  } else {
    setError('email', '');
  }
  if (!data.password) {
    setError('password', 'Password is required');
    valid = false;
  } else {
    setError('password', '');
  }
  return valid;
}

qs('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = {
    email: qs('#login-email').value.trim(),
    password: qs('#login-password').value,
  };
  if (!validate(data)) {
    return;
  }

  const submitBtn = qs('#login-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in...';

  try {
    const result = await login(data);
    toast.success('Welcome back!');
    window.location.href = landingPageFor(result.user && result.user.role);
  } catch (err) {
    toast.error(err.message || 'Login failed');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
});
