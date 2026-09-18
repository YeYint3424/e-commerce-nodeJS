import { logout } from '../auth.js';
import { ROLES } from '../constants.js';
import { escapeHtml } from '../../utils/dom.js';
import { initNotificationBell } from '../notifications.js';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', href: '/ecommerce-admin/dashboard', icon: 'layout-dashboard', roles: [ROLES.STAFF, ROLES.ADMIN, ROLES.DEFAULT_ADMIN] },
  { key: 'orders', label: 'Orders', href: '/ecommerce-admin/orders', icon: 'shopping-cart', roles: [ROLES.STAFF, ROLES.ADMIN, ROLES.DEFAULT_ADMIN] },
  { key: 'products', label: 'Products', href: '/ecommerce-admin/products', icon: 'package', roles: [ROLES.STAFF, ROLES.ADMIN, ROLES.DEFAULT_ADMIN] },
  { key: 'categories', label: 'Categories', href: '/ecommerce-admin/categories', icon: 'tags', roles: [ROLES.STAFF, ROLES.ADMIN, ROLES.DEFAULT_ADMIN] },
  { key: 'payment-options', label: 'Payment Options', href: '/ecommerce-admin/payment-options', icon: 'credit-card', roles: [ROLES.ADMIN, ROLES.DEFAULT_ADMIN] },
  { key: 'accounts', label: 'Accounts', href: '/ecommerce-admin/accounts', icon: 'users', roles: [ROLES.HR, ROLES.ADMIN, ROLES.DEFAULT_ADMIN] },
  { key: 'sales-history', label: 'Sales History', href: '/ecommerce-admin/sales-history', icon: 'bar-chart-2', roles: [ROLES.STAFF, ROLES.ADMIN, ROLES.DEFAULT_ADMIN] },
  { key: 'profile', label: 'Profile', href: '/ecommerce-admin/profile', icon: 'user', roles: [ROLES.STAFF, ROLES.HR, ROLES.ADMIN, ROLES.DEFAULT_ADMIN] },
];

const COLLAPSE_KEY = 'admin.sidebar.collapsed';

function roleLabel(role) {
  if (role === ROLES.DEFAULT_ADMIN) {
    return 'Default Admin';
  }
  if (role === ROLES.ADMIN) {
    return 'Admin';
  }
  if (role === ROLES.HR) {
    return 'HR';
  }
  if (role === ROLES.STAFF) {
    return 'Staff';
  }
  return role;
}

function navLinkHtml(item, active) {
  return `
    <a href="${item.href}" data-nav-item title="${escapeHtml(item.label)}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      active
        ? 'bg-gold-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
    }">
      <i data-lucide="${item.icon}" class="h-5 w-5 shrink-0"></i>
      <span data-nav-text class="truncate">${escapeHtml(item.label)}</span>
    </a>
  `;
}

function sidebarHtml(user, activeKey) {
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  return `
    <aside id="admin-sidebar" class="fixed inset-y-0 left-0 z-40 flex h-[100vh] w-64 -translate-x-full flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 dark:border-neutral-800 dark:bg-neutral-900">
      <div class="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 px-4 dark:border-neutral-800">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 text-white dark:from-gold-500 dark:to-gold-700"><i data-lucide="shield" class="h-5 w-5"></i></span>
        <span data-sidebar-brand class="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white">Shoply Admin</span>
        <button type="button" id="admin-sidebar-close" class="ml-auto rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-neutral-400 dark:hover:bg-neutral-800" aria-label="Close menu">
          <i data-lucide="x" class="h-5 w-5"></i>
        </button>
      </div>
      <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        ${items.map((item) => navLinkHtml(item, item.key === activeKey)).join('')}
      </nav>
      <div class="border-t border-slate-200 p-3 dark:border-neutral-800">
        <button type="button" id="admin-logout" class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40">
          <i data-lucide="log-out" class="h-5 w-5 shrink-0"></i>
          <span data-nav-text class="truncate">Logout</span>
        </button>
        <button type="button" id="admin-sidebar-collapse" class="mt-1 hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 lg:flex dark:text-neutral-400 dark:hover:bg-neutral-800">
          <i data-lucide="panel-left-close" class="h-5 w-5 shrink-0"></i>
          <span data-nav-text class="truncate">Collapse</span>
        </button>
      </div>
    </aside>
  `;
}

function topbarHtml(user) {
  const name = user && user.name ? escapeHtml(user.name) : 'Account';
  return `
    <header class="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6 dark:border-neutral-800 dark:bg-black/80">
      <button type="button" id="admin-hamburger" aria-label="Toggle menu" class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-neutral-300 dark:hover:bg-neutral-800">
        <i data-lucide="menu" class="h-5 w-5"></i>
      </button>
      <div class="ml-auto flex items-center gap-3">
        <div class="relative">
          <button type="button" id="admin-notif-btn" aria-label="Notifications" class="relative rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
            <i data-lucide="bell" class="h-5 w-5"></i>
            <span id="admin-notif-badge" class="absolute -right-0.5 -top-0.5 hidden min-w-[1.1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">0</span>
          </button>
          <div id="admin-notif-panel" class="anim-scale-in absolute right-0 top-12 z-50 hidden max-h-96 w-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"></div>
        </div>
        <button type="button" id="admin-theme-toggle" aria-label="Toggle theme" class="rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
          <i data-lucide="sun" class="hidden h-5 w-5 dark:block"></i>
          <i data-lucide="moon" class="h-5 w-5 dark:hidden"></i>
        </button>
        <div class="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 dark:border-neutral-800">
          <span class="flex h-7 w-7 items-center justify-center rounded-full bg-gold-100 text-xs font-bold text-gold-700 dark:bg-gold-900 dark:text-gold-300">${name.charAt(0).toUpperCase()}</span>
          <div class="hidden leading-tight sm:block">
            <p class="text-xs font-semibold text-slate-800 dark:text-neutral-100">${name}</p>
            <p class="text-[11px] text-slate-400 dark:text-neutral-500">${roleLabel(user.role)}</p>
          </div>
        </div>
      </div>
    </header>
  `;
}

function applyCollapsedState(sidebar, collapsed) {
  const brand = sidebar.querySelector('[data-sidebar-brand]');
  const texts = sidebar.querySelectorAll('[data-nav-text]');
  if (collapsed) {
    sidebar.classList.remove('lg:w-64');
    sidebar.classList.add('lg:w-20');
    if (brand) brand.classList.add('lg:hidden');
    texts.forEach((el) => el.classList.add('lg:hidden'));
  } else {
    sidebar.classList.remove('lg:w-20');
    sidebar.classList.add('lg:w-64');
    if (brand) brand.classList.remove('lg:hidden');
    texts.forEach((el) => el.classList.remove('lg:hidden'));
  }
}

function openMobileSidebar(sidebar, backdrop) {
  sidebar.classList.remove('-translate-x-full');
  sidebar.classList.add('translate-x-0');
  backdrop.classList.remove('hidden');
}

function closeMobileSidebar(sidebar, backdrop) {
  sidebar.classList.add('-translate-x-full');
  sidebar.classList.remove('translate-x-0');
  backdrop.classList.add('hidden');
}

export function initAdminShell({ active, user }) {
  const sidebarMount = document.getElementById('admin-sidebar-mount');
  const topbarMount = document.getElementById('admin-topbar-mount');
  const backdrop = document.getElementById('admin-sidebar-backdrop');

  sidebarMount.innerHTML = sidebarHtml(user, active);
  topbarMount.innerHTML = topbarHtml(user);

  const sidebar = document.getElementById('admin-sidebar');
  sidebar.classList.add('lg:w-64');

  if (window.lucide) {
    window.lucide.createIcons();
  }

  const hamburger = document.getElementById('admin-hamburger');
  const closeBtn = document.getElementById('admin-sidebar-close');
  const collapseBtn = document.getElementById('admin-sidebar-collapse');

  hamburger.addEventListener('click', () => openMobileSidebar(sidebar, backdrop));
  closeBtn.addEventListener('click', () => closeMobileSidebar(sidebar, backdrop));
  backdrop.addEventListener('click', () => closeMobileSidebar(sidebar, backdrop));
  sidebar.querySelectorAll('[data-nav-item]').forEach((link) => {
    link.addEventListener('click', () => closeMobileSidebar(sidebar, backdrop));
  });

  const collapsed = localStorage.getItem(COLLAPSE_KEY) === 'true';
  applyCollapsedState(sidebar, collapsed);
  collapseBtn.addEventListener('click', () => {
    const next = !(localStorage.getItem(COLLAPSE_KEY) === 'true');
    localStorage.setItem(COLLAPSE_KEY, String(next));
    applyCollapsedState(sidebar, next);
  });

  document.getElementById('admin-theme-toggle').addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    window.dispatchEvent(new CustomEvent('admin-theme:changed', { detail: { dark: isDark } }));
  });

  document.getElementById('admin-logout').addEventListener('click', () => {
    logout();
    window.location.href = '/ecommerce-admin/login';
  });

  initNotificationBell(user);
}
