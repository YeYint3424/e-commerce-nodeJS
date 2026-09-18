import { requireAdminAuth } from './guard.js';
import { initAdminShell } from './components/shell.js';
import { createDataTable } from './components/data-table.js';
import { orderStatusBadgeHtml, paymentStatusBadgeHtml } from './components/badge.js';
import { toast } from '../components/toast.js';
import { escapeHtml, qs } from '../utils/dom.js';
import { formatDate, formatCurrency } from '../utils/format.js';
import * as ordersApi from './api/orders.api.js';

const FULFILLED_STATUSES = 'CONFIRMED,PROCESSING,SHIPPED,DELIVERED,COMPLETED';

const currentUser = requireAdminAuth(['STAFF', 'ADMIN', 'DEFAULT_ADMIN']);
if (currentUser) {
  initAdminShell({ active: 'sales-history', user: currentUser });
  init();
}

function renderRow(order) {
  const paymentStatus = order.paymentId ? order.paymentId.status : null;
  return `
    <div class="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[0.9fr_1.3fr_1fr_1fr_1fr_1fr] sm:items-center sm:gap-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Order</p><p class="font-mono text-xs text-slate-500 dark:text-neutral-400">#${escapeHtml(String(order._id).slice(-8))}</p></div>
      <div class="min-w-0"><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Customer</p><p class="truncate font-medium text-slate-900 dark:text-white">${escapeHtml(order.customer ? order.customer.name : 'Unknown')}</p></div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Total</p><p class="text-sm font-semibold text-slate-900 dark:text-white">${formatCurrency(order.total)}</p></div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Payment</p>${paymentStatus ? paymentStatusBadgeHtml(paymentStatus) : '<span class="text-xs text-slate-400">N/A</span>'}</div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Status</p>${orderStatusBadgeHtml(order.status)}</div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Date</p><p class="text-sm text-slate-500 dark:text-neutral-400">${formatDate(order.createdAt)}</p></div>
    </div>
  `;
}

function summaryCardsHtml({ totalRevenue, orderCount, averageOrderValue }) {
  const cards = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: 'dollar-sign' },
    { label: 'Fulfilled Orders', value: orderCount, icon: 'shopping-cart' },
    { label: 'Average Order Value', value: formatCurrency(averageOrderValue), icon: 'trending-up' },
  ];
  return cards
    .map(
      (card) => `
        <div class="anim-fade-in rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">${card.label}</p>
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-50 text-gold-600 dark:bg-gold-950/60 dark:text-gold-300"><i data-lucide="${card.icon}" class="h-4 w-4"></i></span>
          </div>
          <p class="mt-3 text-2xl font-bold text-slate-900 dark:text-white">${card.value}</p>
        </div>
      `
    )
    .join('');
}

function init() {
  const state = { status: '', startDate: '', endDate: '', page: 1 };

  const table = createDataTable({
    root: qs('#sales-table'),
    columns: ['Order', 'Customer', 'Total', 'Payment', 'Status', 'Date'],
    gridCols: 'sm:grid-cols-[0.9fr_1.3fr_1fr_1fr_1fr_1fr]',
    emptyIcon: 'bar-chart-2',
    emptyTitle: 'No sales in this range',
    emptyDescription: 'Try widening the date range or clearing filters.',
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

  function queryParams(overrides = {}) {
    return {
      status: state.status || FULFILLED_STATUSES,
      startDate: state.startDate,
      endDate: state.endDate,
      ...overrides,
    };
  }

  function loadTable() {
    table.load({ ...queryParams(), page: state.page, limit: 10 });
  }

  async function loadSummary() {
    try {
      const res = await ordersApi.listOrders(queryParams({ page: 1, limit: 1000 }));
      const orders = res.data.orders;
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
      const orderCount = res.pagination.totalItems;
      const averageOrderValue = orders.length ? totalRevenue / orders.length : 0;
      qs('#summary-cards').innerHTML = summaryCardsHtml({ totalRevenue, orderCount, averageOrderValue });
      if (window.lucide) {
        window.lucide.createIcons();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load sales summary');
    }
  }

  function reload() {
    state.page = 1;
    loadTable();
    loadSummary();
  }

  qs('#filter-start').addEventListener('change', (event) => {
    state.startDate = event.target.value;
    reload();
  });
  qs('#filter-end').addEventListener('change', (event) => {
    state.endDate = event.target.value;
    reload();
  });
  qs('#filter-status').addEventListener('change', (event) => {
    state.status = event.target.value;
    reload();
  });
  qs('#clear-filters-btn').addEventListener('click', () => {
    state.status = '';
    state.startDate = '';
    state.endDate = '';
    qs('#filter-start').value = '';
    qs('#filter-end').value = '';
    qs('#filter-status').value = '';
    reload();
  });

  loadTable();
  loadSummary();
}
