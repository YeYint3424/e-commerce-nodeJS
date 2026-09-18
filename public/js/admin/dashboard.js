import { requireAdminAuth } from './guard.js';
import { initAdminShell } from './components/shell.js';
import { getDashboard } from './api/dashboard.api.js';
import { orderStatusBadgeHtml, paymentStatusBadgeHtml } from './components/badge.js';
import { toast } from '../components/toast.js';
import { escapeHtml } from '../utils/dom.js';
import { formatCurrency, formatDate } from '../utils/format.js';

const user = requireAdminAuth(['STAFF', 'ADMIN', 'DEFAULT_ADMIN']);
if (user) {
  initAdminShell({ active: 'dashboard', user });
  init();
}

const PALETTE = ['#b8860b', '#f472b6', '#22c55e', '#f59e0b', '#0ea5e9', '#a855f7', '#ef4444', '#14b8a6'];

const charts = {};

function isDark() {
  return document.documentElement.classList.contains('dark');
}

function chartTheme() {
  const dark = isDark();
  return {
    text: dark ? '#d4d4d4' : '#475569',
    grid: dark ? 'rgba(163, 163, 163, 0.15)' : 'rgba(100, 116, 139, 0.12)',
  };
}

function summaryCards(summary) {
  const cards = [
    { label: 'Total Sales', value: formatCurrency(summary.totalSales), icon: 'dollar-sign' },
    { label: 'Total Orders', value: summary.totalOrders, icon: 'shopping-cart' },
    { label: 'Pending Orders', value: summary.pendingOrders, icon: 'clock' },
    { label: 'Completed Orders', value: summary.completedOrders, icon: 'check-circle' },
    { label: 'Customers', value: summary.totalCustomers, icon: 'users' },
    { label: 'Products', value: summary.totalProducts, icon: 'package' },
    { label: 'Low Stock', value: summary.lowStockCount, icon: 'alert-triangle' },
    { label: "Today's Orders", value: summary.todayOrdersCount, icon: 'calendar' },
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

function destroyCharts() {
  Object.values(charts).forEach((chart) => chart && chart.destroy());
}

function renderCharts(data) {
  destroyCharts();
  const theme = chartTheme();

  charts.salesByDay = new Chart(document.getElementById('chart-sales-by-day'), {
    type: 'line',
    data: {
      labels: data.salesByDay.map((d) => d.date.slice(5)),
      datasets: [
        {
          label: 'Sales',
          data: data.salesByDay.map((d) => d.total),
          borderColor: PALETTE[0],
          backgroundColor: 'rgba(184, 134, 11, 0.15)',
          tension: 0.35,
          fill: true,
          pointRadius: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: theme.text, maxTicksLimit: 10 }, grid: { color: theme.grid } },
        y: { ticks: { color: theme.text }, grid: { color: theme.grid }, beginAtZero: true },
      },
    },
  });

  charts.ordersByStatus = new Chart(document.getElementById('chart-orders-by-status'), {
    type: 'doughnut',
    data: {
      labels: data.ordersByStatus.map((d) => d.status),
      datasets: [
        {
          data: data.ordersByStatus.map((d) => d.count),
          backgroundColor: PALETTE,
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: theme.text, boxWidth: 12, padding: 12 } } },
    },
  });

  charts.topProducts = new Chart(document.getElementById('chart-top-products'), {
    type: 'bar',
    data: {
      labels: data.topProducts.map((p) => p.productName),
      datasets: [
        {
          label: 'Revenue',
          data: data.topProducts.map((p) => p.totalRevenue),
          backgroundColor: PALETTE[1],
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: theme.text }, grid: { color: theme.grid }, beginAtZero: true },
        y: { ticks: { color: theme.text }, grid: { display: false } },
      },
    },
  });

  charts.salesByCategory = new Chart(document.getElementById('chart-sales-by-category'), {
    type: 'bar',
    data: {
      labels: data.salesByCategory.map((c) => c.categoryName),
      datasets: [
        {
          label: 'Revenue',
          data: data.salesByCategory.map((c) => c.totalRevenue),
          backgroundColor: PALETTE[2],
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: theme.text }, grid: { display: false } },
        y: { ticks: { color: theme.text }, grid: { color: theme.grid }, beginAtZero: true },
      },
    },
  });
}

function renderRecentOrders(orders) {
  const body = document.getElementById('recent-orders-body');
  if (!orders.length) {
    body.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-sm text-slate-400">No recent orders</td></tr>`;
    return;
  }
  body.innerHTML = orders
    .map(
      (order) => `
        <tr>
          <td class="py-2.5 pr-4 font-mono text-xs text-slate-500 dark:text-neutral-400">${escapeHtml(String(order.orderId).slice(-8))}</td>
          <td class="py-2.5 pr-4 text-slate-700 dark:text-neutral-200">${escapeHtml(order.customerName)}</td>
          <td class="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">${formatCurrency(order.total)}</td>
          <td class="py-2.5 pr-4">${paymentStatusBadgeHtml(order.paymentStatus)}</td>
          <td class="py-2.5 pr-4">${orderStatusBadgeHtml(order.status)}</td>
          <td class="py-2.5 pr-4 text-slate-500 dark:text-neutral-400">${formatDate(order.createdAt)}</td>
        </tr>
      `
    )
    .join('');
}

let lastData = null;

async function loadDashboard() {
  try {
    const res = await getDashboard({ days: 30 });
    lastData = res.data;
    document.getElementById('summary-cards').innerHTML = summaryCards(lastData.summary);
    if (window.lucide) {
      window.lucide.createIcons();
    }
    renderCharts(lastData);
    renderRecentOrders(lastData.recentOrders);
  } catch (err) {
    toast.error(err.message || 'Failed to load dashboard data');
  }
}

function init() {
  loadDashboard();
  window.addEventListener('admin-theme:changed', () => {
    if (lastData) {
      renderCharts(lastData);
    }
  });
}
