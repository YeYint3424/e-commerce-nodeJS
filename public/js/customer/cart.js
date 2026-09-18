import { getCart, updateQuantity, removeItem, getTotals } from '../cart/cart.js';
import { renderNav, renderFooter } from '../components/nav.js';
import { isAuthenticated } from '../auth/auth.js';
import { formatCurrency } from '../utils/format.js';
import { escapeHtml, qs } from '../utils/dom.js';
import { toast } from '../components/toast.js';

renderNav();
renderFooter();

function renderCart() {
  const items = getCart();
  const listEl = qs('#cart-items');
  const emptyEl = qs('#cart-empty');
  const summaryEl = qs('#cart-summary');

  if (!items.length) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    emptyEl.classList.add('flex');
    summaryEl.classList.add('hidden');
    if (window.lucide) {
      window.lucide.createIcons();
    }
    return;
  }

  emptyEl.classList.add('hidden');
  emptyEl.classList.remove('flex');
  summaryEl.classList.remove('hidden');

  listEl.innerHTML = items
    .map((item) => {
      const unitPrice = item.discountPrice !== null && item.discountPrice !== undefined ? item.discountPrice : item.price;
      const lineTotal = unitPrice * item.quantity;
      return `
        <div class="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div class="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-gold-100 to-gold-200 dark:from-gold-950 dark:to-neutral-900">
            ${
              item.image
                ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="h-full w-full object-cover" />`
                : `<div class="flex h-full w-full items-center justify-center"><i data-lucide="image" class="h-6 w-6 text-gold-300"></i></div>`
            }
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-slate-800 dark:text-neutral-100">${escapeHtml(item.name)}</p>
            <p class="text-sm text-slate-400">${formatCurrency(unitPrice)} each</p>
            <div class="mt-2 flex items-center gap-2">
              <button type="button" data-decrease="${item.id}" class="h-7 w-7 rounded-full border border-slate-200 text-slate-500 hover:border-gold-300 hover:text-gold-600 dark:border-neutral-700">-</button>
              <span class="w-6 text-center text-sm font-medium">${item.quantity}</span>
              <button type="button" data-increase="${item.id}" class="h-7 w-7 rounded-full border border-slate-200 text-slate-500 hover:border-gold-300 hover:text-gold-600 dark:border-neutral-700">+</button>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <span class="text-sm font-bold text-slate-900 dark:text-white">${formatCurrency(lineTotal)}</span>
            <button type="button" data-remove="${item.id}" class="text-xs font-medium text-rose-500 hover:text-rose-600">Remove</button>
          </div>
        </div>
      `;
    })
    .join('');

  if (window.lucide) {
    window.lucide.createIcons();
  }

  const { subtotal, total, totalItems } = getTotals();
  qs('#cart-subtotal').textContent = formatCurrency(subtotal);
  qs('#cart-total').textContent = formatCurrency(total);
  qs('#cart-item-count').textContent = String(totalItems);
}

function bindEvents() {
  qs('#cart-items').addEventListener('click', (event) => {
    const dec = event.target.closest('[data-decrease]');
    const inc = event.target.closest('[data-increase]');
    const rem = event.target.closest('[data-remove]');

    if (dec) {
      const item = getCart().find((i) => i.id === dec.dataset.decrease);
      if (!item) return;
      if (item.quantity <= 1) {
        removeItem(item.id);
      } else {
        updateQuantity(item.id, item.quantity - 1);
      }
      renderCart();
    } else if (inc) {
      const item = getCart().find((i) => i.id === inc.dataset.increase);
      if (!item) return;
      updateQuantity(item.id, item.quantity + 1);
      renderCart();
    } else if (rem) {
      removeItem(rem.dataset.remove);
      toast.info('Item removed from cart');
      renderCart();
    }
  });

  qs('#order-review-btn').addEventListener('click', () => {
    if (!isAuthenticated()) {
      sessionStorage.setItem('postLoginRedirect', '/order-review');
      window.location.href = '/login';
      return;
    }
    window.location.href = '/order-review';
  });
}

renderCart();
bindEvents();
window.addEventListener('cart:changed', renderCart);
