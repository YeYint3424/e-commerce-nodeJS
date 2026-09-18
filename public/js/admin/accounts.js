import { requireAdminAuth } from './guard.js';
import { initAdminShell } from './components/shell.js';
import { createDataTable } from './components/data-table.js';
import { openModal } from './components/modal.js';
import { accountStatusBadgeHtml } from './components/badge.js';
import { toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirm-dialog.js';
import { escapeHtml, qs, debounce } from '../utils/dom.js';
import { formatDate } from '../utils/format.js';
import * as accountsApi from './api/accounts.api.js';

const ROLE_LABELS = {
  STAFF: 'Staff',
  HR: 'HR',
  ADMIN: 'Admin',
  DEFAULT_ADMIN: 'Default Admin',
  CUSTOMER: 'Customer',
};

const currentUser = requireAdminAuth(['ADMIN', 'DEFAULT_ADMIN', 'HR']);
if (currentUser) {
  initAdminShell({ active: 'accounts', user: currentUser });
  init(currentUser);
}

function assignableRoles(caller) {
  if (caller.role === 'DEFAULT_ADMIN') {
    return ['STAFF', 'HR', 'CUSTOMER', 'ADMIN'];
  }
  if (caller.role === 'ADMIN') {
    return ['STAFF', 'HR', 'CUSTOMER'];
  }
  if (caller.role === 'HR') {
    return ['STAFF', 'HR'];
  }
  return [];
}

function canMutate(caller, target) {
  if (target.role === 'DEFAULT_ADMIN') {
    return false;
  }
  if (caller.role === 'HR') {
    return ['STAFF', 'HR'].includes(target.role);
  }
  return true;
}

function roleOptionsHtml(roles, selected) {
  return roles.map((r) => `<option value="${r}" ${r === selected ? 'selected' : ''}>${ROLE_LABELS[r] || r}</option>`).join('');
}

function fieldHtml(label, inputHtml) {
  return `<div><label class="mb-1 block text-sm font-medium text-slate-700 dark:text-neutral-300">${label}</label>${inputHtml}</div>`;
}

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-gold-900';

function renderRow(account, caller) {
  const mutable = canMutate(caller, account);
  const actions = [];

  if (mutable) {
    actions.push(
      `<button type="button" data-edit="${account._id}" class="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-gold-300 hover:text-gold-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-gold-700 dark:hover:text-gold-400">Edit</button>`
    );
    actions.push(
      `<button type="button" data-role="${account._id}" data-role-current="${account.role}" class="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-gold-300 hover:text-gold-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-gold-700 dark:hover:text-gold-400">Change Role</button>`
    );
    actions.push(
      `<button type="button" data-status="${account._id}" data-status-current="${account.status}" class="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        account.status === 'ACTIVE'
          ? 'border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400'
          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400'
      }">${account.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>`
    );
    actions.push(
      `<button type="button" data-delete="${account._id}" data-delete-name="${escapeHtml(account.name)}" class="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40">Delete</button>`
    );
  } else {
    actions.push(
      `<button type="button" data-view="${account._id}" class="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-gold-300 hover:text-gold-600 dark:border-neutral-700 dark:text-neutral-300">View</button>`
    );
  }

  return `
    <div class="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1.2fr_1.6fr_0.8fr_0.8fr_1fr_1.6fr] sm:items-center sm:gap-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Name</p><p class="font-medium text-slate-900 dark:text-white">${escapeHtml(account.name)}</p></div>
      <div class="min-w-0"><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Email</p><p class="truncate text-sm text-slate-600 dark:text-neutral-300">${escapeHtml(account.email)}</p></div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Role</p><p class="text-sm text-slate-600 dark:text-neutral-300">${ROLE_LABELS[account.role] || account.role}</p></div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Status</p>${accountStatusBadgeHtml(account.status)}</div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Created</p><p class="text-sm text-slate-500 dark:text-neutral-400">${formatDate(account.createdAt)}</p></div>
      <div class="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">${actions.join('')}</div>
    </div>
  `;
}

function openCreateModal(caller, onSuccess) {
  const roles = assignableRoles(caller);
  const { close, body } = openModal({
    title: 'Create Account',
    bodyHtml: `
      <form id="account-form" class="space-y-4">
        ${fieldHtml('Name', `<input required name="name" class="${INPUT_CLASS}" />`)}
        ${fieldHtml('Email', `<input required type="email" name="email" class="${INPUT_CLASS}" />`)}
        ${fieldHtml('Password', `<input required type="password" minlength="6" name="password" class="${INPUT_CLASS}" />`)}
        ${fieldHtml('Role', `<select name="role" class="${INPUT_CLASS}">${roleOptionsHtml(roles, roles[0])}</select>`)}
        ${fieldHtml('Phone (optional)', `<input name="phone" class="${INPUT_CLASS}" />`)}
        ${fieldHtml('Address (optional)', `<input name="address" class="${INPUT_CLASS}" />`)}
        <button type="submit" class="w-full rounded-xl bg-gold-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-500">Create Account</button>
      </form>
    `,
  });

  body.querySelector('#account-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    try {
      await accountsApi.createAccount(payload);
      toast.success('Account created');
      close();
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to create account');
    }
  });
}

async function openEditModal(id, onSuccess) {
  let account;
  try {
    const res = await accountsApi.getAccount(id);
    account = res.data.account;
  } catch (err) {
    toast.error(err.message || 'Failed to load account');
    return;
  }

  const { close, body } = openModal({
    title: 'Edit Account',
    bodyHtml: `
      <form id="account-edit-form" class="space-y-4">
        ${fieldHtml('Name', `<input required name="name" value="${escapeHtml(account.name)}" class="${INPUT_CLASS}" />`)}
        ${fieldHtml('Email', `<input required type="email" name="email" value="${escapeHtml(account.email)}" class="${INPUT_CLASS}" />`)}
        ${fieldHtml('Phone', `<input name="phone" value="${escapeHtml(account.phone || '')}" class="${INPUT_CLASS}" />`)}
        ${fieldHtml('Address', `<input name="address" value="${escapeHtml(account.address || '')}" class="${INPUT_CLASS}" />`)}
        ${fieldHtml(
          'Status',
          `<select name="status" class="${INPUT_CLASS}">
            <option value="ACTIVE" ${account.status === 'ACTIVE' ? 'selected' : ''}>Active</option>
            <option value="INACTIVE" ${account.status === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
          </select>`
        )}
        <button type="submit" class="w-full rounded-xl bg-gold-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-500">Save Changes</button>
      </form>
    `,
  });

  body.querySelector('#account-edit-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    try {
      await accountsApi.updateAccount(id, payload);
      toast.success('Account updated');
      close();
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to update account');
    }
  });
}

async function openViewModal(id) {
  let account;
  try {
    const res = await accountsApi.getAccount(id);
    account = res.data.account;
  } catch (err) {
    toast.error(err.message || 'Failed to load account');
    return;
  }

  openModal({
    title: 'Account Details',
    bodyHtml: `
      <div class="space-y-3 text-sm">
        <div><p class="text-slate-400">Name</p><p class="font-medium text-slate-900 dark:text-white">${escapeHtml(account.name)}</p></div>
        <div><p class="text-slate-400">Email</p><p class="font-medium text-slate-900 dark:text-white">${escapeHtml(account.email)}</p></div>
        <div><p class="text-slate-400">Role</p><p class="font-medium text-slate-900 dark:text-white">${ROLE_LABELS[account.role] || account.role}</p></div>
        <div><p class="text-slate-400">Status</p>${accountStatusBadgeHtml(account.status)}</div>
        <div><p class="text-slate-400">Phone</p><p class="font-medium text-slate-900 dark:text-white">${escapeHtml(account.phone || '-')}</p></div>
        <div><p class="text-slate-400">Address</p><p class="font-medium text-slate-900 dark:text-white">${escapeHtml(account.address || '-')}</p></div>
        <div><p class="text-slate-400">Created</p><p class="font-medium text-slate-900 dark:text-white">${formatDate(account.createdAt)}</p></div>
      </div>
      <p class="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-neutral-800 dark:text-neutral-400">You do not have permission to modify this account.</p>
    `,
  });
}

function openRoleModal(id, currentRole, caller, onSuccess) {
  const roles = assignableRoles(caller);
  const { close, body } = openModal({
    title: 'Change Role',
    bodyHtml: `
      <form id="role-form" class="space-y-4">
        ${fieldHtml('New Role', `<select name="role" class="${INPUT_CLASS}">${roleOptionsHtml(roles, currentRole)}</select>`)}
        <button type="submit" class="w-full rounded-xl bg-gold-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-500">Update Role</button>
      </form>
    `,
  });

  body.querySelector('#role-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const role = new FormData(event.target).get('role');
    try {
      await accountsApi.changeRole(id, role);
      toast.success('Role updated');
      close();
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to update role');
    }
  });
}

async function toggleStatus(id, currentStatus, onSuccess) {
  const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const confirmed = await confirmDialog({
    title: nextStatus === 'INACTIVE' ? 'Deactivate this account?' : 'Activate this account?',
    message:
      nextStatus === 'INACTIVE'
        ? 'The user will no longer be able to log in.'
        : 'The user will regain access to log in.',
    confirmLabel: nextStatus === 'INACTIVE' ? 'Deactivate' : 'Activate',
  });
  if (!confirmed) {
    return;
  }
  try {
    await accountsApi.changeStatus(id, nextStatus);
    toast.success(`Account ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`);
    onSuccess();
  } catch (err) {
    toast.error(err.message || 'Failed to update status');
  }
}

async function deleteAccountFlow(id, name, onSuccess) {
  const confirmed = await confirmDialog({
    title: 'Delete this account?',
    message: `This will permanently delete ${name || 'this account'}. This action cannot be undone.`,
    confirmLabel: 'Delete',
  });
  if (!confirmed) {
    return;
  }
  try {
    await accountsApi.deleteAccount(id);
    toast.success('Account deleted');
    onSuccess();
  } catch (err) {
    toast.error(err.message || 'Failed to delete account');
  }
}

function init(caller) {
  const state = { search: '', role: '', status: '', page: 1 };

  const table = createDataTable({
    root: qs('#accounts-table'),
    columns: ['Name', 'Email', 'Role', 'Status', 'Created', 'Actions'],
    gridCols: 'sm:grid-cols-[1.2fr_1.6fr_0.8fr_0.8fr_1fr_1.6fr]',
    emptyIcon: 'users',
    emptyTitle: 'No accounts found',
    emptyDescription: 'Try adjusting your search or filters.',
    fetchPage: async (params) => {
      const res = await accountsApi.listAccounts(params);
      return { items: res.data.accounts, pagination: res.pagination };
    },
    renderRow: (account) => renderRow(account, caller),
    onPageChange: (page) => {
      state.page = page;
      loadTable();
    },
  });

  function loadTable() {
    table.load({ search: state.search, role: state.role, status: state.status, page: state.page, limit: 10 });
  }

  qs('#filter-search').addEventListener(
    'input',
    debounce((event) => {
      state.search = event.target.value.trim();
      state.page = 1;
      loadTable();
    }, 350)
  );

  qs('#filter-role').addEventListener('change', (event) => {
    state.role = event.target.value;
    state.page = 1;
    loadTable();
  });

  qs('#filter-status').addEventListener('change', (event) => {
    state.status = event.target.value;
    state.page = 1;
    loadTable();
  });

  qs('#create-account-btn').addEventListener('click', () => openCreateModal(caller, loadTable));

  table.body.addEventListener('click', (event) => {
    const editBtn = event.target.closest('[data-edit]');
    const viewBtn = event.target.closest('[data-view]');
    const roleBtn = event.target.closest('[data-role]');
    const statusBtn = event.target.closest('[data-status]');
    const deleteBtn = event.target.closest('[data-delete]');

    if (editBtn) {
      openEditModal(editBtn.dataset.edit, loadTable);
    } else if (viewBtn) {
      openViewModal(viewBtn.dataset.view);
    } else if (roleBtn) {
      openRoleModal(roleBtn.dataset.role, roleBtn.dataset.roleCurrent, caller, loadTable);
    } else if (statusBtn) {
      toggleStatus(statusBtn.dataset.status, statusBtn.dataset.statusCurrent, loadTable);
    } else if (deleteBtn) {
      deleteAccountFlow(deleteBtn.dataset.delete, deleteBtn.dataset.deleteName, loadTable);
    }
  });

  loadTable();
}
