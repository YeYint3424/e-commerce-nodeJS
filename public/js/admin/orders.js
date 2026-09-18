import { requireAdminAuth } from './guard.js';
import { initAdminShell } from './components/shell.js';
import { createDataTable } from './components/data-table.js';
import { openModal } from './components/modal.js';
import { orderStatusBadgeHtml, paymentStatusBadgeHtml } from './components/badge.js';
import { toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirm-dialog.js';
import { promptDialog } from '../components/prompt-dialog.js';
import { escapeHtml, qs, debounce } from '../utils/dom.js';
import { formatDate, formatCurrency } from '../utils/format.js';
import * as ordersApi from './api/orders.api.js';
import * as paymentsApi from './api/payments.api.js';
import * as productsApi from './api/products.api.js';

const currentUser = requireAdminAuth(['STAFF', 'ADMIN', 'DEFAULT_ADMIN']);
if (currentUser) {
  initAdminShell({ active: 'orders', user: currentUser });
  init();
}

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-gold-900';

const STATUS_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED', 'PAYMENT_FAILED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
};

const REASON_REQUIRED_STATUSES = ['CANCELLED', 'PAYMENT_FAILED'];

const STATUS_LABELS = {
  CONFIRMED: 'Confirm Order',
  CANCELLED: 'Cancel Order',
  PAYMENT_FAILED: 'Mark Payment Failed',
  PROCESSING: 'Mark Processing',
  SHIPPED: 'Mark Shipped',
  DELIVERED: 'Mark Delivered',
  COMPLETED: 'Mark Completed',
};

function fieldHtml(label, inputHtml) {
  return `<div><label class="mb-1 block text-sm font-medium text-slate-700 dark:text-neutral-300">${label}</label>${inputHtml}</div>`;
}

function renderRow(order) {
  const itemCount = order.items ? order.items.length : 0;
  const itemsSummary = order.items && order.items.length
    ? `${escapeHtml(order.items[0].productName)}${itemCount > 1 ? ` +${itemCount - 1} more` : ''}`
    : '-';
  const paymentStatus = order.paymentId ? order.paymentId.status : null;

  return `
    <div class="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[0.9fr_1.2fr_1.4fr_0.9fr_1fr_1fr_1fr_0.9fr] sm:items-center sm:gap-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Order</p><p class="font-mono text-xs text-slate-500 dark:text-neutral-400">#${escapeHtml(String(order._id).slice(-8))}</p></div>
      <div class="min-w-0"><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Customer</p><p class="truncate font-medium text-slate-900 dark:text-white">${escapeHtml(order.customer ? order.customer.name : 'Unknown')}</p></div>
      <div class="min-w-0"><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Items</p><p class="truncate text-sm text-slate-600 dark:text-neutral-300">${itemsSummary}</p></div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Total</p><p class="text-sm font-semibold text-slate-900 dark:text-white">${formatCurrency(order.total)}</p></div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Payment</p>${paymentStatus ? paymentStatusBadgeHtml(paymentStatus) : '<span class="text-xs text-slate-400">N/A</span>'}</div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Status</p>${orderStatusBadgeHtml(order.status)}</div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Date</p><p class="text-sm text-slate-500 dark:text-neutral-400">${formatDate(order.createdAt)}</p></div>
      <div class="pt-1 sm:pt-0"><button type="button" data-view="${order._id}" class="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-gold-300 hover:text-gold-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-gold-700 dark:hover:text-gold-400">View</button></div>
    </div>
  `;
}

function itemsTableHtml(items) {
  return `
    <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-neutral-800">
      <table class="w-full min-w-[420px] text-left text-sm">
        <thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-neutral-800 dark:text-neutral-400">
          <tr><th class="py-2 px-3">Product</th><th class="py-2 px-3">Qty</th><th class="py-2 px-3">Unit Price</th><th class="py-2 px-3">Subtotal</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-neutral-800">
          ${items
            .map(
              (item) => `
                <tr>
                  <td class="py-2 px-3 text-slate-700 dark:text-neutral-200">${escapeHtml(item.productName)}</td>
                  <td class="py-2 px-3 text-slate-600 dark:text-neutral-300">${item.quantity}</td>
                  <td class="py-2 px-3 text-slate-600 dark:text-neutral-300">${formatCurrency(item.unitPrice)}</td>
                  <td class="py-2 px-3 font-medium text-slate-900 dark:text-white">${formatCurrency(item.subtotal)}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function editHistoryHtml(order) {
  if (!order.editHistory || !order.editHistory.length) {
    return '';
  }
  return `
    <div>
      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Change Notes</p>
      <ul class="space-y-2">
        ${order.editHistory
          .map(
            (entry) => `
              <li class="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
                <span class="font-medium">${formatDate(entry.createdAt)}:</span> ${escapeHtml(entry.reason || '')}
              </li>
            `
          )
          .join('')}
      </ul>
    </div>
  `;
}

function paymentSectionHtml(order) {
  const payment = order.paymentId;
  if (!payment) {
    return `<p class="text-sm text-slate-400">No payment has been created for this order yet.</p>`;
  }

  const proofBtn = payment.proofImage
    ? `<button type="button" data-view-proof="${escapeHtml(payment.proofImage)}" class="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-gold-300 hover:text-gold-600 dark:border-neutral-700 dark:text-neutral-300">View Payment Proof</button>`
    : '';

  const actions = [];
  if (payment.status === 'PENDING') {
    const canVerify = payment.methodType !== 'QR' || !!payment.proofImage;
    actions.push(
      `<button type="button" data-verify-payment="${payment._id}" ${canVerify ? '' : 'disabled title="Waiting for payment proof"'} class="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">Verify Payment</button>`
    );
    actions.push(
      `<button type="button" data-reject-payment="${payment._id}" class="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300">Reject Payment</button>`
    );
  }

  return `
    <div class="space-y-2 text-sm">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-medium text-slate-900 dark:text-white">${escapeHtml(payment.methodName)}</span>
        ${paymentStatusBadgeHtml(payment.status)}
        <span class="text-slate-500 dark:text-neutral-400">${formatCurrency(payment.amount)}</span>
      </div>
      ${payment.rejectionReason ? `<p class="text-xs text-rose-500">Rejection reason: ${escapeHtml(payment.rejectionReason)}</p>` : ''}
      <div class="flex flex-wrap items-center gap-2 pt-1">${proofBtn}${actions.join('')}</div>
    </div>
  `;
}

function statusActionsHtml(order) {
  const nextStatuses = STATUS_TRANSITIONS[order.status] || [];
  if (!nextStatuses.length) {
    return `<p class="text-sm text-slate-400">No further status transitions available.</p>`;
  }
  return `
    <div class="flex flex-wrap gap-2">
      ${nextStatuses
        .map(
          (status) => `
            <button type="button" data-set-status="${status}" class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              REASON_REQUIRED_STATUSES.includes(status)
                ? 'border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300'
                : 'bg-gold-600 text-white hover:bg-gold-500'
            }">${STATUS_LABELS[status] || status}</button>
          `
        )
        .join('')}
    </div>
  `;
}

function openImageLightbox(src) {
  openModal({ title: 'Payment Proof', bodyHtml: `<img src="${escapeHtml(src)}" class="w-full rounded-xl" alt="Payment proof" />` });
}

async function handleStatusChange(orderId, status, onSuccess, refreshDetail) {
  let reason = '';
  if (REASON_REQUIRED_STATUSES.includes(status)) {
    const entered = await promptDialog({
      title: `${STATUS_LABELS[status]}?`,
      message: 'This action requires a reason and cannot be undone from here.',
      label: 'Reason for this change',
      confirmLabel: 'Continue',
    });
    if (!entered) {
      return;
    }
    reason = entered;
  } else {
    const confirmed = await confirmDialog({ title: `${STATUS_LABELS[status] || status}?`, confirmLabel: 'Confirm' });
    if (!confirmed) {
      return;
    }
  }

  try {
    await ordersApi.changeStatus(orderId, status, reason);
    toast.success('Order status updated');
    onSuccess();
    refreshDetail();
  } catch (err) {
    toast.error(err.message || 'Failed to update order status');
  }
}

async function handleVerifyPayment(paymentId, onSuccess, refreshDetail) {
  const confirmed = await confirmDialog({ title: 'Verify this payment?', confirmLabel: 'Verify' });
  if (!confirmed) {
    return;
  }
  try {
    await paymentsApi.verifyPayment(paymentId);
    toast.success('Payment verified');
    onSuccess();
    refreshDetail();
  } catch (err) {
    toast.error(err.message || 'Failed to verify payment');
  }
}

async function handleRejectPayment(paymentId, onSuccess, refreshDetail) {
  const reason = await promptDialog({
    title: 'Reject this payment?',
    label: 'Reason for rejecting this payment',
    confirmLabel: 'Reject Payment',
  });
  if (!reason) {
    return;
  }
  try {
    await paymentsApi.rejectPayment(paymentId, reason);
    toast.success('Payment rejected');
    onSuccess();
    refreshDetail();
  } catch (err) {
    toast.error(err.message || 'Failed to reject payment');
  }
}

function editItemRowHtml(item, index) {
  return `
    <div class="flex items-center gap-2" data-edit-item-row data-product-id="${item.product}" data-product-name="${escapeHtml(item.productName)}">
      <span class="flex-1 truncate text-sm text-slate-700 dark:text-neutral-200">${escapeHtml(item.productName)}</span>
      <input type="number" min="1" value="${item.quantity}" data-item-qty class="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white" />
      <button type="button" data-remove-item class="rounded-full p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"><i data-lucide="trash-2" class="h-4 w-4"></i></button>
    </div>
  `;
}

async function openEditItemsModal(order, onSuccess, refreshDetail) {
  let products = [];
  try {
    const res = await productsApi.listProducts({ status: 'ACTIVE', limit: 100 });
    products = res.data.products;
  } catch (err) {
    toast.error('Failed to load products for editing');
    return;
  }

  const { close, body } = openModal({
    title: 'Edit Order Items',
    bodyHtml: `
      <form id="edit-items-form" class="space-y-4">
        <div data-items-list class="space-y-2">
          ${order.items.map(editItemRowHtml).join('')}
        </div>
        <div class="flex items-center gap-2">
          <select data-add-product class="${INPUT_CLASS}">
            <option value="">Add a product...</option>
            ${products.map((p) => `<option value="${p._id}" data-name="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('')}
          </select>
          <button type="button" data-add-item-btn class="shrink-0 rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-200">Add</button>
        </div>
        ${fieldHtml('Reason for change (required)', `<textarea required name="reason" rows="2" class="${INPUT_CLASS}"></textarea>`)}
        <button type="submit" class="w-full rounded-xl bg-gold-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-500">Save Changes</button>
      </form>
    `,
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }

  const listEl = body.querySelector('[data-items-list]');

  body.querySelector('[data-add-item-btn]').addEventListener('click', () => {
    const select = body.querySelector('[data-add-product]');
    const productId = select.value;
    if (!productId) {
      return;
    }
    if (listEl.querySelector(`[data-product-id="${productId}"]`)) {
      toast.warning('That product is already in the order');
      return;
    }
    const name = select.selectedOptions[0].dataset.name;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = editItemRowHtml({ product: productId, productName: name, quantity: 1 }, -1);
    listEl.appendChild(wrapper.firstElementChild);
    if (window.lucide) {
      window.lucide.createIcons();
    }
    select.value = '';
  });

  listEl.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('[data-remove-item]');
    if (removeBtn) {
      removeBtn.closest('[data-edit-item-row]').remove();
    }
  });

  body.querySelector('#edit-items-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const reason = new FormData(event.target).get('reason');
    const rows = Array.from(listEl.querySelectorAll('[data-edit-item-row]'));
    if (!rows.length) {
      toast.error('An order must have at least one item');
      return;
    }
    const items = rows.map((row) => ({
      productId: row.dataset.productId,
      quantity: Number(row.querySelector('[data-item-qty]').value),
    }));

    try {
      await ordersApi.editOrder(order._id, { items, reason });
      toast.success('Order updated');
      close();
      onSuccess();
      refreshDetail();
    } catch (err) {
      toast.error(err.message || 'Failed to update order');
    }
  });
}

const EDITABLE_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING'];

async function openOrderDetail(orderId, onSuccess) {
  let order;
  try {
    const res = await ordersApi.getOrder(orderId);
    order = res.data.order;
  } catch (err) {
    toast.error(err.message || 'Failed to load order');
    return;
  }

  const { body, close } = openModal({
    title: `Order #${String(order._id).slice(-8)}`,
    bodyHtml: `
      <div class="space-y-5">
        <div class="flex flex-wrap items-center gap-2">${orderStatusBadgeHtml(order.status)}<span class="text-xs text-slate-400">Placed ${formatDate(order.createdAt)}</span></div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
            <p class="text-sm text-slate-700 dark:text-neutral-200">${escapeHtml(order.customer ? order.customer.name : '-')}</p>
            <p class="text-sm text-slate-500 dark:text-neutral-400">${escapeHtml(order.customer ? order.customer.email : '')}</p>
          </div>
          <div>
            <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Shipping</p>
            <p class="text-sm text-slate-700 dark:text-neutral-200">${escapeHtml(order.shippingInfo.name)} - ${escapeHtml(order.shippingInfo.phone)}</p>
            <p class="text-sm text-slate-500 dark:text-neutral-400">${escapeHtml(order.shippingInfo.address)}</p>
          </div>
        </div>

        <div data-items-section>${itemsTableHtml(order.items)}</div>

        <div class="flex items-center justify-end gap-6 border-t border-slate-100 pt-3 text-sm dark:border-neutral-800">
          <span class="text-slate-500 dark:text-neutral-400">Subtotal: ${formatCurrency(order.subtotal)}</span>
          <span class="font-semibold text-slate-900 dark:text-white">Total: ${formatCurrency(order.total)}</span>
        </div>

        <div data-edit-history-section>${editHistoryHtml(order)}</div>

        ${order.cancelReason ? `<p class="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">Cancelled: ${escapeHtml(order.cancelReason)}</p>` : ''}

        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Payment</p>
          <div data-payment-section>${paymentSectionHtml(order)}</div>
        </div>

        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Update Status</p>
          <div data-status-section>${statusActionsHtml(order)}</div>
        </div>

        ${EDITABLE_STATUSES.includes(order.status) ? `<button type="button" data-edit-items class="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-gold-300 hover:text-gold-600 dark:border-neutral-700 dark:text-neutral-300">Edit Items</button>` : ''}
      </div>
    `,
  });

  async function refreshDetail() {
    try {
      const res = await ordersApi.getOrder(orderId);
      order = res.data.order;
      body.querySelector('[data-items-section]').innerHTML = itemsTableHtml(order.items);
      body.querySelector('[data-edit-history-section]').innerHTML = editHistoryHtml(order);
      body.querySelector('[data-payment-section]').innerHTML = paymentSectionHtml(order);
      body.querySelector('[data-status-section]').innerHTML = statusActionsHtml(order);
      if (window.lucide) {
        window.lucide.createIcons();
      }
    } catch (err) {
      toast.error('Failed to refresh order');
    }
  }

  body.addEventListener('click', (event) => {
    const statusBtn = event.target.closest('[data-set-status]');
    const verifyBtn = event.target.closest('[data-verify-payment]');
    const rejectBtn = event.target.closest('[data-reject-payment]');
    const proofBtn = event.target.closest('[data-view-proof]');
    const editItemsBtn = event.target.closest('[data-edit-items]');

    if (statusBtn) {
      handleStatusChange(order._id, statusBtn.dataset.setStatus, onSuccess, refreshDetail);
    } else if (verifyBtn) {
      handleVerifyPayment(verifyBtn.dataset.verifyPayment, onSuccess, refreshDetail);
    } else if (rejectBtn) {
      handleRejectPayment(rejectBtn.dataset.rejectPayment, onSuccess, refreshDetail);
    } else if (proofBtn) {
      openImageLightbox(proofBtn.dataset.viewProof);
    } else if (editItemsBtn) {
      close();
      openEditItemsModal(order, onSuccess, refreshDetail);
    }
  });
}

function init() {
  const state = { search: '', status: '', page: 1 };

  const table = createDataTable({
    root: qs('#orders-table'),
    columns: ['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', 'Actions'],
    gridCols: 'sm:grid-cols-[0.9fr_1.2fr_1.4fr_0.9fr_1fr_1fr_1fr_0.9fr]',
    emptyIcon: 'shopping-cart',
    emptyTitle: 'No orders found',
    emptyDescription: 'Try adjusting your search or filters.',
    fetchPage: async (params) => {
      const res = await ordersApi.listOrders(params);
      return { items: res.data.orders, pagination: res.pagination };
    },
    renderRow,
    onPageChange: (page) => {
      state.page = page;
      loadTable();
    },
  });

  function loadTable() {
    table.load({ search: state.search, status: state.status, page: state.page, limit: 10 });
  }

  qs('#filter-search').addEventListener(
    'input',
    debounce((event) => {
      state.search = event.target.value.trim();
      state.page = 1;
      loadTable();
    }, 350)
  );

  qs('#filter-status').addEventListener('change', (event) => {
    state.status = event.target.value;
    state.page = 1;
    loadTable();
  });

  table.body.addEventListener('click', (event) => {
    const viewBtn = event.target.closest('[data-view]');
    if (viewBtn) {
      openOrderDetail(viewBtn.dataset.view, loadTable);
    }
  });

  loadTable();

  const orderId = new URLSearchParams(window.location.search).get('orderId');
  if (orderId) {
    openOrderDetail(orderId, loadTable);
  }
}
