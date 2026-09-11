import { getCart, getTotals, clearCart } from '../cart/cart.js';
import { renderNav, renderFooter } from '../components/nav.js';
import { isAuthenticated } from '../auth/auth.js';
import { getProfile } from '../api/profile.api.js';
import { createOrder } from '../api/orders.api.js';
import { formatCurrency } from '../utils/format.js';
import { escapeHtml, qs } from '../utils/dom.js';
import { toast } from '../components/toast.js';

if (!isAuthenticated()) {
  sessionStorage.setItem('postLoginRedirect', '/order-review');
  window.location.href = '/login';
}

renderNav();
renderFooter();

function setError(field, message) {
  const el = document.querySelector(`[data-error-for="${field}"]`);
  if (el) {
    el.textContent = message || '';
  }
}

function showEmptyState() {
  qs('#review-content').classList.add('hidden');
  const emptyEl = qs('#review-empty');
  emptyEl.classList.remove('hidden');
  emptyEl.classList.add('flex');
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function showSuccessState(order) {
  qs('#review-content').classList.add('hidden');
  const successEl = qs('#review-success');
  successEl.classList.remove('hidden');
  successEl.classList.add('flex');
  qs('#success-order-id').textContent = `Order #${order._id} - Status: ${order.status}`;
  qs('#success-continue-payment').href = `/payment?orderId=${encodeURIComponent(order._id)}`;
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderItems() {
  const items = getCart();
  const listEl = qs('#review-items');

  listEl.innerHTML = items
    .map((item) => {
      const unitPrice = item.discountPrice !== null && item.discountPrice !== undefined ? item.discountPrice : item.price;
      const lineTotal = unitPrice * item.quantity;
      return `
        <div class="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div class="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-100 to-fuchsia-100 dark:from-indigo-950 dark:to-slate-900">
            ${
              item.image
                ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="h-full w-full object-cover" />`
                : `<div class="flex h-full w-full items-center justify-center"><i data-lucide="image" class="h-6 w-6 text-indigo-300"></i></div>`
            }
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">${escapeHtml(item.name)}</p>
            <p class="text-sm text-slate-400">${formatCurrency(unitPrice)} x ${item.quantity}</p>
          </div>
          <span class="text-sm font-bold text-slate-900 dark:text-white">${formatCurrency(lineTotal)}</span>
        </div>
      `;
    })
    .join('');

  if (window.lucide) {
    window.lucide.createIcons();
  }

  const { subtotal, total, totalItems } = getTotals();
  qs('#review-item-count').textContent = String(totalItems);
  qs('#review-subtotal').textContent = formatCurrency(subtotal);
  qs('#review-total').textContent = formatCurrency(total);
}

function prefillShippingForm(user) {
  if (!user) {
    return;
  }
  qs('#shipping-name').value = user.name || '';
  qs('#shipping-phone').value = user.phone || '';
  qs('#shipping-address').value = user.address || '';
}

function validateShipping(data) {
  let valid = true;
  if (!data.name) {
    setError('name', 'Name is required');
    valid = false;
  } else {
    setError('name', '');
  }
  if (!data.phone) {
    setError('phone', 'Phone is required');
    valid = false;
  } else {
    setError('phone', '');
  }
  if (!data.address) {
    setError('address', 'Address is required');
    valid = false;
  } else {
    setError('address', '');
  }
  return valid;
}

async function placeOrder() {
  const shippingInfo = {
    name: qs('#shipping-name').value.trim(),
    phone: qs('#shipping-phone').value.trim(),
    address: qs('#shipping-address').value.trim(),
  };

  if (!validateShipping(shippingInfo)) {
    return;
  }

  const items = getCart().map((item) => ({ productId: item.id, quantity: item.quantity }));

  const submitBtn = qs('#place-order-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Placing order...';

  try {
    const res = await createOrder({ items, shippingInfo });
    clearCart();
    toast.success('Order placed successfully');
    showSuccessState(res.data.order);
  } catch (err) {
    toast.error(err.message || 'Failed to place order');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Place Order';
  }
}

async function init() {
  if (!getCart().length) {
    showEmptyState();
    return;
  }

  renderItems();

  try {
    const res = await getProfile();
    prefillShippingForm(res.data.user);
  } catch (err) {
    toast.error('Could not load your profile details');
  }

  qs('#place-order-btn').addEventListener('click', placeOrder);
}

init();
