import { requireAdminAuth } from './guard.js';
import { initAdminShell } from './components/shell.js';
import { getUser } from './auth.js';
import { toast } from '../components/toast.js';
import { qs } from '../utils/dom.js';
import * as profileApi from './api/profile.api.js';

const ROLE_LABELS = {
  STAFF: 'Staff',
  HR: 'HR',
  ADMIN: 'Admin',
  DEFAULT_ADMIN: 'Default Admin',
};

const USER_STORAGE_KEY = 'admin.auth.user';

const currentUser = requireAdminAuth(['STAFF', 'HR', 'ADMIN', 'DEFAULT_ADMIN']);
if (currentUser) {
  initAdminShell({ active: 'profile', user: currentUser });
  init();
}

function renderProfile(user) {
  qs('#profile-avatar-initial').textContent = (user.name || '?').charAt(0).toUpperCase();
  qs('#profile-name-display').textContent = user.name;
  qs('#profile-role-display').textContent = ROLE_LABELS[user.role] || user.role;
  qs('#profile-name').value = user.name || '';
  qs('#profile-email').value = user.email || '';
  qs('#profile-phone').value = user.phone || '';
  qs('#profile-address').value = user.address || '';
}

async function init() {
  let user;
  try {
    const res = await profileApi.getProfile();
    user = res.data.user;
  } catch (err) {
    user = getUser();
    toast.error(err.message || 'Failed to load profile');
  }
  renderProfile(user);

  qs('#profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      name: qs('#profile-name').value.trim(),
      phone: qs('#profile-phone').value.trim(),
      address: qs('#profile-address').value.trim(),
    };
    try {
      const res = await profileApi.updateProfile(payload);
      const updated = res.data.user;
      renderProfile(updated);
      const stored = getUser();
      if (stored) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ ...stored, ...updated }));
      }
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    }
  });
}
