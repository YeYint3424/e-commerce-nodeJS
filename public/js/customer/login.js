import { login } from '../auth/auth.js';
import { renderNav, renderFooter } from '../components/nav.js';
import { toast } from '../components/toast.js';
import { qs } from '../utils/dom.js';

renderNav();
renderFooter();

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

function redirectAfterAuth() {
  const target = sessionStorage.getItem('postLoginRedirect');
  sessionStorage.removeItem('postLoginRedirect');
  window.location.href = target || '/';
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
    await login(data);
    toast.success('Welcome back!');
    redirectAfterAuth();
  } catch (err) {
    toast.error(err.message || 'Login failed');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
});
