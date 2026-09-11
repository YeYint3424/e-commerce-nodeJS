import { register } from '../auth/auth.js';
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

  if (!data.name) {
    setError('name', 'Name is required');
    valid = false;
  } else {
    setError('name', '');
  }

  if (!data.email || !EMAIL_RE.test(data.email)) {
    setError('email', 'Enter a valid email address');
    valid = false;
  } else {
    setError('email', '');
  }

  if (!data.password || data.password.length < 6) {
    setError('password', 'Password must be at least 6 characters');
    valid = false;
  } else {
    setError('password', '');
  }

  if (data.password !== data.confirmPassword) {
    setError('confirmPassword', 'Passwords do not match');
    valid = false;
  } else {
    setError('confirmPassword', '');
  }

  return valid;
}

function redirectAfterAuth() {
  const target = sessionStorage.getItem('postLoginRedirect');
  sessionStorage.removeItem('postLoginRedirect');
  window.location.href = target || '/';
}

qs('#register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = {
    name: qs('#register-name').value.trim(),
    email: qs('#register-email').value.trim(),
    password: qs('#register-password').value,
    confirmPassword: qs('#register-confirm').value,
    phone: qs('#register-phone').value.trim(),
    address: qs('#register-address').value.trim(),
  };

  if (!validate(data)) {
    return;
  }

  const submitBtn = qs('#register-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';

  try {
    const { confirmPassword, ...payload } = data;
    await register(payload);
    toast.success('Account created!');
    redirectAfterAuth();
  } catch (err) {
    toast.error(err.message || 'Registration failed');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
});
