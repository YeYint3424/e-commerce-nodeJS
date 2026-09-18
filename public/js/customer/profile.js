import { renderNav, renderFooter } from '../components/nav.js';
import { isAuthenticated, updateCachedUser } from '../auth/auth.js';
import { getProfile, updateProfile, changePassword } from '../api/profile.api.js';
import { toast } from '../components/toast.js';
import { qs } from '../utils/dom.js';

if (!isAuthenticated()) {
  sessionStorage.setItem('postLoginRedirect', '/profile');
  window.location.href = '/login';
}

renderNav();
renderFooter();

const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

function setError(field, message) {
  const el = document.querySelector(`[data-error-for="${field}"]`);
  if (el) {
    el.textContent = message || '';
  }
}

function renderProfile(user) {
  qs('#profile-avatar-initial').textContent = (user.name || '?').charAt(0).toUpperCase();
  qs('#profile-name-display').textContent = user.name || '';
  qs('#profile-email-display').textContent = user.email || '';
  qs('#profile-name').value = user.name || '';
  qs('#profile-email').value = user.email || '';
  qs('#profile-phone').value = user.phone || '';
  qs('#profile-address').value = user.address || '';
}

function validateProfileForm(data) {
  let valid = true;

  if (!data.name) {
    setError('name', 'Full name is required');
    valid = false;
  } else {
    setError('name', '');
  }

  if (data.phone && !PHONE_RE.test(data.phone)) {
    setError('phone', 'Enter a valid phone number');
    valid = false;
  } else {
    setError('phone', '');
  }

  setError('address', '');
  return valid;
}

function validatePasswordForm(data) {
  let valid = true;

  if (!data.currentPassword) {
    setError('currentPassword', 'Current password is required');
    valid = false;
  } else {
    setError('currentPassword', '');
  }

  if (!data.newPassword || data.newPassword.length < 6) {
    setError('newPassword', 'New password must be at least 6 characters');
    valid = false;
  } else {
    setError('newPassword', '');
  }

  if (data.newPassword !== data.confirmNewPassword) {
    setError('confirmNewPassword', 'Passwords do not match');
    valid = false;
  } else {
    setError('confirmNewPassword', '');
  }

  return valid;
}

function withLoading(btn, loadingText, fn) {
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = loadingText;
  return fn().finally(() => {
    btn.disabled = false;
    btn.textContent = originalText;
  });
}

function handleSessionExpired(err) {
  if (err.status === 401) {
    toast.error('Your session has expired. Please log in again.');
    window.location.href = '/login';
    return true;
  }
  return false;
}

function wirePasswordToggles() {
  qs('#profile-content').addEventListener('click', (event) => {
    const toggleBtn = event.target.closest('[data-toggle-password]');
    if (!toggleBtn) {
      return;
    }
    const input = document.getElementById(toggleBtn.dataset.togglePassword);
    const icon = toggleBtn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.setAttribute('data-lucide', 'eye-off');
    } else {
      input.type = 'password';
      icon.setAttribute('data-lucide', 'eye');
    }
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });
}

function wireProfileForm() {
  qs('#profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = {
      name: qs('#profile-name').value.trim(),
      phone: qs('#profile-phone').value.trim(),
      address: qs('#profile-address').value.trim(),
    };

    if (!validateProfileForm(data)) {
      return;
    }

    const btn = qs('#profile-save-btn');
    try {
      await withLoading(btn, 'Saving...', async () => {
        const res = await updateProfile(data);
        renderProfile(res.data.user);
        updateCachedUser(res.data.user);
        toast.success('Profile updated successfully');
      });
    } catch (err) {
      if (!handleSessionExpired(err)) {
        toast.error(err.message || 'Failed to update profile');
      }
    }
  });
}

function wirePasswordForm() {
  qs('#password-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = {
      currentPassword: qs('#current-password').value,
      newPassword: qs('#new-password').value,
      confirmNewPassword: qs('#confirm-new-password').value,
    };

    if (!validatePasswordForm(data)) {
      return;
    }

    const btn = qs('#password-save-btn');
    try {
      await withLoading(btn, 'Updating...', async () => {
        await changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
        toast.success('Password updated successfully');
        qs('#password-form').reset();
      });
    } catch (err) {
      if (handleSessionExpired(err)) {
        return;
      }
      if (err.status === 401 && err.payload && err.payload.error && err.payload.error.code === 'INVALID_CREDENTIALS') {
        setError('currentPassword', 'Current password is incorrect');
        return;
      }
      toast.error(err.message || 'Failed to update password');
    }
  });
}

async function init() {
  let user;
  try {
    const res = await getProfile();
    user = res.data.user;
  } catch (err) {
    if (handleSessionExpired(err)) {
      return;
    }
    toast.error(err.message || 'Failed to load your profile');
    return;
  }

  renderProfile(user);

  qs('#profile-loading').classList.add('hidden');
  qs('#profile-content').classList.remove('hidden');
  if (window.lucide) {
    window.lucide.createIcons();
  }

  wireProfileForm();
  wirePasswordForm();
  wirePasswordToggles();
}

init();
