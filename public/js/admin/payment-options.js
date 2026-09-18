import { requireAdminAuth } from './guard.js';
import { initAdminShell } from './components/shell.js';
import { createDataTable } from './components/data-table.js';
import { openModal } from './components/modal.js';
import { accountStatusBadgeHtml } from './components/badge.js';
import { toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirm-dialog.js';
import { escapeHtml, qs } from '../utils/dom.js';
import { formatDate } from '../utils/format.js';
import * as paymentOptionsApi from './api/payment-options.api.js';

const currentUser = requireAdminAuth(['ADMIN', 'DEFAULT_ADMIN']);
if (currentUser) {
  initAdminShell({ active: 'payment-options', user: currentUser });
  init();
}

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-gold-900';

const TYPE_LABELS = { COD: 'Cash on Delivery', QR: 'QR Payment' };

function fieldHtml(label, inputHtml) {
  return `<div><label class="mb-1 block text-sm font-medium text-slate-700 dark:text-neutral-300">${label}</label>${inputHtml}</div>`;
}

function renderRow(option) {
  const qrThumb = option.qrImage
    ? `<img src="${escapeHtml(option.qrImage)}" class="h-10 w-10 rounded-lg border border-slate-200 object-cover dark:border-neutral-700" alt="" />`
    : `<span class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-300 dark:bg-neutral-800"><i data-lucide="qr-code" class="h-4 w-4"></i></span>`;

  return `
    <div class="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[0.5fr_1.2fr_1fr_1.6fr_0.8fr_1fr_1.2fr] sm:items-center sm:gap-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div>${qrThumb}</div>
      <div><p class="font-medium text-slate-900 dark:text-white">${escapeHtml(option.name)}</p></div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Type</p><p class="text-sm text-slate-600 dark:text-neutral-300">${TYPE_LABELS[option.type] || option.type}</p></div>
      <div class="min-w-0"><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Description</p><p class="truncate text-sm text-slate-600 dark:text-neutral-300">${escapeHtml(option.description || '-')}</p></div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Status</p>${accountStatusBadgeHtml(option.status)}</div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Created</p><p class="text-sm text-slate-500 dark:text-neutral-400">${formatDate(option.createdAt)}</p></div>
      <div class="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
        <button type="button" data-edit="${option._id}" class="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-gold-300 hover:text-gold-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-gold-700 dark:hover:text-gold-400">Edit</button>
        <button type="button" data-status="${option._id}" data-status-current="${option.status}" class="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
          option.status === 'ACTIVE'
            ? 'border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400'
            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400'
        }">${option.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>
        <button type="button" data-delete="${option._id}" data-delete-name="${escapeHtml(option.name)}" class="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40">Delete</button>
      </div>
    </div>
  `;
}

function optionFormHtml(option) {
  return `
    <form id="option-form" class="space-y-4">
      ${fieldHtml('Name', `<input required name="name" value="${escapeHtml(option ? option.name : '')}" class="${INPUT_CLASS}" />`)}
      ${fieldHtml(
        'Type',
        `<select required name="type" class="${INPUT_CLASS}">
          <option value="COD" ${!option || option.type === 'COD' ? 'selected' : ''}>Cash on Delivery</option>
          <option value="QR" ${option && option.type === 'QR' ? 'selected' : ''}>QR Payment</option>
        </select>`
      )}
      ${fieldHtml('Description', `<textarea name="description" rows="2" class="${INPUT_CLASS}">${escapeHtml(option ? option.description || '' : '')}</textarea>`)}
      ${fieldHtml('Account Information', `<textarea name="accountInfo" rows="2" placeholder="Bank name, account number, etc." class="${INPUT_CLASS}">${escapeHtml(option ? option.accountInfo || '' : '')}</textarea>`)}
      ${fieldHtml('QR Image (for QR payment)', `<input type="file" name="qrImage" accept="image/png,image/jpeg,image/webp" class="${INPUT_CLASS}" />`)}
      ${option && option.qrImage ? `<img src="${escapeHtml(option.qrImage)}" class="h-20 w-20 rounded-lg border border-slate-200 object-cover dark:border-neutral-700" alt="" />` : ''}
      ${fieldHtml(
        'Status',
        `<select name="status" class="${INPUT_CLASS}">
          <option value="ACTIVE" ${!option || option.status === 'ACTIVE' ? 'selected' : ''}>Active</option>
          <option value="INACTIVE" ${option && option.status === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
        </select>`
      )}
      <button type="submit" class="w-full rounded-xl bg-gold-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-500">${option ? 'Save Changes' : 'Create Payment Option'}</button>
    </form>
  `;
}

function buildFormData(form) {
  const formData = new FormData();
  for (const [key, value] of new FormData(form).entries()) {
    if (key === 'qrImage' && (!(value instanceof File) || value.size === 0)) {
      continue;
    }
    formData.append(key, value);
  }
  return formData;
}

function openCreateModal(onSuccess) {
  const { close, body } = openModal({ title: 'Add Payment Option', bodyHtml: optionFormHtml(null) });

  body.querySelector('#option-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await paymentOptionsApi.createPaymentOption(buildFormData(event.target));
      toast.success('Payment option created');
      close();
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to create payment option');
    }
  });
}

async function openEditModal(id, onSuccess) {
  let option;
  try {
    const res = await paymentOptionsApi.getPaymentOption(id);
    option = res.data.paymentOption;
  } catch (err) {
    toast.error(err.message || 'Failed to load payment option');
    return;
  }

  const { close, body } = openModal({ title: 'Edit Payment Option', bodyHtml: optionFormHtml(option) });

  body.querySelector('#option-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await paymentOptionsApi.updatePaymentOption(id, buildFormData(event.target));
      toast.success('Payment option updated');
      close();
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to update payment option');
    }
  });
}

async function toggleStatus(id, currentStatus, onSuccess) {
  const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const confirmed = await confirmDialog({
    title: nextStatus === 'INACTIVE' ? 'Deactivate this payment option?' : 'Activate this payment option?',
    message: nextStatus === 'INACTIVE' ? 'Customers will no longer be able to select it at checkout.' : 'Customers will be able to select it at checkout again.',
    confirmLabel: nextStatus === 'INACTIVE' ? 'Deactivate' : 'Activate',
  });
  if (!confirmed) {
    return;
  }
  try {
    await paymentOptionsApi.changeStatus(id, nextStatus);
    toast.success(`Payment option ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`);
    onSuccess();
  } catch (err) {
    toast.error(err.message || 'Failed to update status');
  }
}

async function deleteOptionFlow(id, name, onSuccess) {
  const confirmed = await confirmDialog({
    title: 'Delete this payment option?',
    message: `This will permanently delete ${name || 'this payment option'}. This action cannot be undone.`,
    confirmLabel: 'Delete',
  });
  if (!confirmed) {
    return;
  }
  try {
    await paymentOptionsApi.deletePaymentOption(id);
    toast.success('Payment option deleted');
    onSuccess();
  } catch (err) {
    toast.error(err.message || 'Failed to delete payment option');
  }
}

function init() {
  const state = { status: '', page: 1 };

  const table = createDataTable({
    root: qs('#payment-options-table'),
    columns: ['QR', 'Name', 'Type', 'Description', 'Status', 'Created', 'Actions'],
    gridCols: 'sm:grid-cols-[0.5fr_1.2fr_1fr_1.6fr_0.8fr_1fr_1.2fr]',
    emptyIcon: 'credit-card',
    emptyTitle: 'No payment options found',
    emptyDescription: 'Add a payment option to let customers check out.',
    fetchPage: async (params) => {
      const res = await paymentOptionsApi.listPaymentOptions(params);
      return { items: res.data.paymentOptions, pagination: res.pagination };
    },
    renderRow,
    onPageChange: (page) => {
      state.page = page;
      loadTable();
    },
  });

  function loadTable() {
    table.load({ status: state.status, page: state.page, limit: 10 });
  }

  qs('#filter-status').addEventListener('change', (event) => {
    state.status = event.target.value;
    state.page = 1;
    loadTable();
  });

  qs('#create-option-btn').addEventListener('click', () => openCreateModal(loadTable));

  table.body.addEventListener('click', (event) => {
    const editBtn = event.target.closest('[data-edit]');
    const statusBtn = event.target.closest('[data-status]');
    const deleteBtn = event.target.closest('[data-delete]');

    if (editBtn) {
      openEditModal(editBtn.dataset.edit, loadTable);
    } else if (statusBtn) {
      toggleStatus(statusBtn.dataset.status, statusBtn.dataset.statusCurrent, loadTable);
    } else if (deleteBtn) {
      deleteOptionFlow(deleteBtn.dataset.delete, deleteBtn.dataset.deleteName, loadTable);
    }
  });

  loadTable();
}
