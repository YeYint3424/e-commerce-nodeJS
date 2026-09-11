import { getTotals } from '../cart/cart.js';
import { isAuthenticated, getUser, logout } from '../auth/auth.js';
import { escapeHtml } from '../utils/dom.js';

function navLinkClasses(href) {
  const current = window.location.pathname;
  const active = current === href;
  return active
    ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
    : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors';
}

function authAreaHtml() {
  if (isAuthenticated()) {
    const user = getUser();
    const name = user && user.name ? escapeHtml(user.name) : 'Account';
    return `
      <div class="flex items-center gap-3">
        <span class="hidden text-sm font-medium text-slate-700 dark:text-slate-200 sm:inline">${name}</span>
        <button type="button" id="nav-logout" class="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:text-slate-300">Logout</button>
      </div>
    `;
  }
  return `<a href="/login" class="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500">Login</a>`;
}

function refreshCartBadge() {
  document.querySelectorAll('[data-cart-badge]').forEach((badge) => {
    const { totalItems } = getTotals();
    badge.textContent = totalItems > 99 ? '99+' : String(totalItems);
    badge.classList.toggle('hidden', totalItems === 0);
    badge.classList.toggle('flex', totalItems > 0);
  });
}

function refreshAuthArea() {
  document.querySelectorAll('[data-nav-auth-area]').forEach((el) => {
    el.innerHTML = authAreaHtml();
  });
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function goToSearch(rawValue) {
  const params = new URLSearchParams(window.location.search);
  const value = rawValue.trim();
  if (value) {
    params.set('search', value);
  } else {
    params.delete('search');
  }
  params.delete('page');
  const qs = params.toString();
  window.location.href = `/products${qs ? `?${qs}` : ''}`;
}

function wireNav(mount) {
  const hamburger = mount.querySelector('#nav-hamburger');
  const panel = mount.querySelector('#nav-mobile-panel');
  hamburger.addEventListener('click', () => {
    const isOpen = panel.style.maxHeight && panel.style.maxHeight !== '0px';
    panel.style.maxHeight = isOpen ? '0px' : `${panel.scrollHeight}px`;
  });

  const params = new URLSearchParams(window.location.search);
  const currentSearch = params.get('search') || '';
  const desktopInput = mount.querySelector('#nav-search-input');
  const mobileInput = mount.querySelector('#nav-search-input-mobile');
  desktopInput.value = currentSearch;
  mobileInput.value = currentSearch;

  mount.querySelector('#nav-search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    goToSearch(desktopInput.value);
  });
  mount.querySelector('#nav-search-form-mobile').addEventListener('submit', (event) => {
    event.preventDefault();
    goToSearch(mobileInput.value);
  });

  mount.querySelector('#theme-toggle').addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });

  mount.addEventListener('click', (event) => {
    if (event.target.closest('#nav-logout')) {
      logout();
      window.location.href = '/';
    }
  });

  window.addEventListener('cart:changed', refreshCartBadge);
  window.addEventListener('auth:changed', refreshAuthArea);
}

export function renderNav() {
  const mount = document.getElementById('site-header');
  if (!mount) {
    return;
  }

  mount.innerHTML = `
    <header class="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div class="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a href="/" class="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white"><i data-lucide="shopping-bag" class="h-5 w-5"></i></span>
          Shoply
        </a>
        <nav class="hidden items-center gap-6 text-sm lg:flex">
          <a href="/" class="${navLinkClasses('/')}">Home</a>
          <a href="/products" class="${navLinkClasses('/products')}">Products</a>
          <a href="/products" class="text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400">Categories</a>
        </nav>
        <form id="nav-search-form" class="hidden max-w-md flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-100/70 px-4 py-2 md:flex dark:border-slate-700 dark:bg-slate-900">
          <i data-lucide="search" class="h-4 w-4 text-slate-400"></i>
          <input id="nav-search-input" type="search" placeholder="Search products..." class="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white" />
        </form>
        <div class="ml-auto flex items-center gap-3">
          <button type="button" id="theme-toggle" aria-label="Toggle theme" class="rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            <i data-lucide="sun" class="hidden h-5 w-5 dark:block"></i>
            <i data-lucide="moon" class="h-5 w-5 dark:hidden"></i>
          </button>
          <a href="/cart" class="relative rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="View cart">
            <i data-lucide="shopping-cart" class="h-5 w-5"></i>
            <span data-cart-badge class="absolute -right-1 -top-1 hidden min-w-[1.1rem] items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[10px] font-bold text-white">0</span>
          </a>
          <div data-nav-auth-area class="hidden sm:block">${authAreaHtml()}</div>
          <button type="button" id="nav-hamburger" aria-label="Toggle menu" class="rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800">
            <i data-lucide="menu" class="h-5 w-5"></i>
          </button>
        </div>
      </div>
      <div id="nav-mobile-panel" class="max-h-0 overflow-hidden border-t border-slate-200 lg:hidden dark:border-slate-800" style="transition: max-height 0.3s ease-in-out;">
        <div class="flex flex-col gap-4 px-4 py-4 sm:px-6">
          <form id="nav-search-form-mobile" class="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100/70 px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
            <i data-lucide="search" class="h-4 w-4 text-slate-400"></i>
            <input id="nav-search-input-mobile" type="search" placeholder="Search products..." class="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white" />
          </form>
          <a href="/" class="${navLinkClasses('/')} text-sm">Home</a>
          <a href="/products" class="${navLinkClasses('/products')} text-sm">Products</a>
          <div class="border-t border-slate-200 pt-3 dark:border-slate-800" data-nav-auth-area>${authAreaHtml()}</div>
        </div>
      </div>
    </header>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  wireNav(mount);
  refreshCartBadge();
}

export function renderFooter() {
  const mount = document.getElementById('site-footer');
  if (!mount) {
    return;
  }

  mount.innerHTML = `
    <footer class="mt-16 border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div class="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <div class="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white"><i data-lucide="shopping-bag" class="h-4 w-4"></i></span>
            Shoply
          </div>
          <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">Modern essentials, thoughtfully curated and delivered to your door.</p>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-slate-900 dark:text-white">Shop</h4>
          <ul class="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <li><a href="/products" class="hover:text-indigo-500">All Products</a></li>
            <li><a href="/products?sort=newest" class="hover:text-indigo-500">New Arrivals</a></li>
            <li><a href="/cart" class="hover:text-indigo-500">Cart</a></li>
          </ul>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-slate-900 dark:text-white">Account</h4>
          <ul class="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <li><a href="/login" class="hover:text-indigo-500">Login</a></li>
            <li><a href="/register" class="hover:text-indigo-500">Register</a></li>
          </ul>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-slate-900 dark:text-white">Support</h4>
          <ul class="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <li>support@shoply.example</li>
            <li>Mon-Fri, 9am - 6pm</li>
          </ul>
        </div>
      </div>
      <div class="border-t border-slate-200 py-4 text-center text-xs text-slate-400 dark:border-slate-800">Shoply. All rights reserved.</div>
    </footer>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }
}
