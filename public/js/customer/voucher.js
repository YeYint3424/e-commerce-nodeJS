import { renderNav, renderFooter } from '../components/nav.js';
import { isAuthenticated } from '../auth/auth.js';
import { getVoucher, downloadVoucherPdf } from '../api/vouchers.api.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { escapeHtml, qs } from '../utils/dom.js';
import { toast } from '../components/toast.js';
import { statusBadgeHtml, cancelOrderFlow, PDF_ELIGIBLE_STATUSES } from './voucher-shared.js';

if (!isAuthenticated()) {
  sessionStorage.setItem('postLoginRedirect', window.location.pathname);
  window.location.href = '/login';
}

renderNav();
renderFooter();

let currentOrderId = null;

function getIdFromPath() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  return segments[segments.length - 1];
}

function showError() {
  qs('#voucher-skeleton').classList.add('hidden');
  qs('#voucher-content').classList.add('hidden');
  const errorEl = qs('#voucher-error');
  errorEl.classList.remove('hidden');
  errorEl.classList.add('flex');
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderItems(items) {
  qs('#voucher-items').innerHTML = items
    .map(
      (item) => `
        <div class="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 dark:border-neutral-800">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-slate-800 dark:text-neutral-100">${escapeHtml(item.productName)}</p>
            <p class="text-xs text-slate-400">${formatCurrency(item.unitPrice)} x ${item.quantity}</p>
          </div>
          <span class="text-sm font-bold text-slate-900 dark:text-white">${formatCurrency(item.subtotal)}</span>
        </div>
      `
    )
    .join('');
}

function renderPayment(paymentMethod) {
  const el = qs('#voucher-payment');
  if (!paymentMethod) {
    el.innerHTML = `<p class="text-slate-400">Not yet selected</p>`;
    return;
  }
  el.innerHTML = `
    <p><span class="text-slate-400">Method:</span> ${escapeHtml(paymentMethod.name)} (${escapeHtml(paymentMethod.type)})</p>
    <p class="mt-1"><span class="text-slate-400">Status:</span> ${escapeHtml(paymentMethod.status)}</p>
  `;
}

function renderNotes(notes) {
  const section = qs('#voucher-notes-section');
  if (!Array.isArray(notes) || !notes.length) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');
  qs('#voucher-notes').innerHTML = notes
    .map(
      (note) => `
        <li class="rounded-xl border border-slate-100 px-4 py-3 dark:border-neutral-800">
          <p class="text-slate-700 dark:text-neutral-200">${escapeHtml(note.reason || 'No reason provided')}</p>
          <p class="mt-0.5 text-xs text-slate-400">${formatDate(note.createdAt)}</p>
        </li>
      `
    )
    .join('');
}

function renderVoucher(voucher) {
  currentOrderId = voucher.orderId;

  qs('#voucher-id').textContent = voucher.voucherId;
  qs('#voucher-order-id').textContent = voucher.orderId;
  qs('#voucher-date').textContent = formatDate(voucher.createdAt);
  qs('#voucher-status-badge').innerHTML = statusBadgeHtml(voucher.orderStatus);

  qs('#voucher-customer-name').textContent = voucher.customer.name || '-';
  qs('#voucher-customer-email').textContent = voucher.customer.email || '-';
  qs('#voucher-customer-phone').textContent = voucher.customer.phone || '-';
  qs('#voucher-customer-address').textContent = voucher.customer.address || '-';

  renderItems(voucher.items);
  qs('#voucher-subtotal').textContent = formatCurrency(voucher.subtotal);
  qs('#voucher-total').textContent = formatCurrency(voucher.total);

  renderPayment(voucher.paymentMethod);
  renderNotes(voucher.changeNotes);

  const downloadBtn = qs('#voucher-download-btn');
  if (PDF_ELIGIBLE_STATUSES.includes(voucher.orderStatus)) {
    downloadBtn.classList.remove('hidden');
  } else {
    downloadBtn.classList.add('hidden');
  }

  const cancelBtn = qs('#voucher-cancel-btn');
  if (voucher.orderStatus === 'PENDING') {
    cancelBtn.classList.remove('hidden');
  } else {
    cancelBtn.classList.add('hidden');
  }

  qs('#voucher-skeleton').classList.add('hidden');
  qs('#voucher-content').classList.remove('hidden');
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function loadVoucher(id) {
  try {
    const res = await getVoucher(id);
    renderVoucher(res.data.voucher);
  } catch (err) {
    showError();
  }
}

function bindActions() {
  qs('#voucher-download-btn').addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader-2" class="h-4 w-4 animate-spin"></i>Preparing...`;
    if (window.lucide) {
      window.lucide.createIcons();
    }
    try {
      await downloadVoucherPdf(currentOrderId);
    } catch (err) {
      toast.error(err.message || 'Failed to download voucher');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }
  });

  qs('#voucher-cancel-btn').addEventListener('click', () => {
    cancelOrderFlow(currentOrderId, () => loadVoucher(currentOrderId));
  });
}

async function init() {
  const id = getIdFromPath();
  if (!id) {
    showError();
    return;
  }
  bindActions();
  await loadVoucher(id);
}

init();
