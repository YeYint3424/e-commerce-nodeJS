import { renderNav, renderFooter } from '../components/nav.js';
import { isAuthenticated } from '../auth/auth.js';
import { listVouchers } from '../api/vouchers.api.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { escapeHtml, qs } from '../utils/dom.js';
import { statusBadgeHtml, cancelOrderFlow } from './voucher-shared.js';

if (!isAuthenticated()) {
  sessionStorage.setItem('postLoginRedirect', '/voucher-list');
  window.location.href = '/login';
}

renderNav();
renderFooter();

const GRID_COLS = 'sm:grid-cols-[1fr_1.6fr_0.9fr_0.9fr_0.9fr_1.2fr]';

const state = {
  status: '',
  page: 1,
};

function skeletonRows(count) {
  return Array.from({ length: count })
    .map(
      () => `
        <div class="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div class="grid grid-cols-1 gap-3 ${GRID_COLS} sm:items-center sm:gap-4">
            <div class="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800"></div>
            <div class="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800"></div>
            <div class="h-4 w-16 rounded bg-slate-200 dark:bg-slate-800"></div>
            <div class="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-800"></div>
            <div class="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800"></div>
            <div class="h-8 w-24 rounded-full bg-slate-200 dark:bg-slate-800"></div>
          </div>
        </div>
      `
    )
    .join('');
}

function renderRow(voucher) {
  const items = voucher.items || [];
  const firstName = items.length ? items[0].productName : '-';
  const summary = items.length > 1 ? `${firstName} and ${items.length - 1} more` : firstName;
  const canCancel = voucher.orderStatus === 'PENDING';

  return `
    <div class="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 ${GRID_COLS} sm:items-center sm:gap-4 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Voucher</p>
        <p class="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">${escapeHtml(voucher.voucherId)}</p>
      </div>
      <div class="min-w-0">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Items</p>
        <p class="truncate text-sm text-slate-600 dark:text-slate-300">${escapeHtml(summary)}</p>
      </div>
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Total</p>
        <p class="text-sm font-semibold text-slate-900 dark:text-white">${formatCurrency(voucher.total)}</p>
      </div>
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Status</p>
        ${statusBadgeHtml(voucher.orderStatus)}
      </div>
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Date</p>
        <p class="text-sm text-slate-500 dark:text-slate-400">${formatDate(voucher.createdAt)}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
        <a href="/voucher/${voucher.orderId}" class="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-400">View</a>
        ${
          canCancel
            ? `<button type="button" data-cancel="${voucher.orderId}" class="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40">Cancel</button>`
            : ''
        }
      </div>
    </div>
  `;
}

function renderPagination(pagination) {
  const el = qs('#pagination');
  if (!pagination || pagination.totalPages <= 1) {
    el.innerHTML = '';
    return;
  }
  const { page, totalPages } = pagination;
  const pages = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  el.innerHTML = `
    <button data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} class="rounded-full border border-slate-200 p-2 text-slate-500 disabled:opacity-40 dark:border-slate-700"><i data-lucide="chevron-left" class="h-4 w-4"></i></button>
    ${pages
      .map((p) =>
        p === '...'
          ? `<span class="px-2 text-slate-400">...</span>`
          : `<button data-page="${p}" class="h-9 w-9 rounded-full text-sm font-medium transition-colors ${
              p === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }">${p}</button>`
      )
      .join('')}
    <button data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''} class="rounded-full border border-slate-200 p-2 text-slate-500 disabled:opacity-40 dark:border-slate-700"><i data-lucide="chevron-right" class="h-4 w-4"></i></button>
  `;
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function loadVouchers() {
  const listEl = qs('#voucher-list');
  qs('#voucher-empty').classList.add('hidden');
  qs('#voucher-empty').classList.remove('flex');
  listEl.classList.remove('hidden');
  listEl.innerHTML = skeletonRows(4);

  try {
    const res = await listVouchers({ status: state.status, page: state.page, limit: 10 });
    const vouchers = res.data.vouchers || [];

    if (!vouchers.length) {
      listEl.classList.add('hidden');
      qs('#voucher-empty').classList.remove('hidden');
      qs('#voucher-empty').classList.add('flex');
      if (window.lucide) {
        window.lucide.createIcons();
      }
      renderPagination(null);
      return;
    }

    listEl.innerHTML = vouchers.map(renderRow).join('');
    renderPagination(res.pagination);
  } catch (err) {
    listEl.innerHTML = `<p class="py-10 text-center text-sm text-rose-400">${escapeHtml(err.message)}</p>`;
    renderPagination(null);
  }
}

function bindEvents() {
  qs('#filter-status').addEventListener('change', (event) => {
    state.status = event.target.value;
    state.page = 1;
    loadVouchers();
  });

  qs('#voucher-list').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-cancel]');
    if (!btn) {
      return;
    }
    cancelOrderFlow(btn.dataset.cancel, loadVouchers);
  });

  qs('#pagination').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-page]');
    if (!btn || btn.disabled) {
      return;
    }
    state.page = Number(btn.dataset.page);
    loadVouchers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function init() {
  bindEvents();
  loadVouchers();
}

init();
