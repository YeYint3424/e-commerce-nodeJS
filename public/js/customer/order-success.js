import { renderNav, renderFooter } from '../components/nav.js';
import { isAuthenticated } from '../auth/auth.js';
import { getOrder } from '../api/orders.api.js';
import { formatCurrency } from '../utils/format.js';
import { qs } from '../utils/dom.js';
import { toast } from '../components/toast.js';

if (!isAuthenticated()) {
  window.location.href = '/login';
}

renderNav();
renderFooter();

function getOrderId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('orderId');
}

function showError() {
  qs('#success-content').classList.add('hidden');
  const errorEl = qs('#success-error');
  errorEl.classList.remove('hidden');
  errorEl.classList.add('flex');
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderOrder(order) {
  qs('#success-order-id').textContent = `#${order._id}`;
  qs('#success-order-status').textContent = order.status;
  qs('#success-order-total').textContent = formatCurrency(order.total);
  qs('#success-item-count').textContent = String(order.items.length);

  const payment = order.paymentId;
  let note = 'Your order is pending confirmation.';
  if (payment && typeof payment === 'object' && payment.methodType === 'QR' && payment.status === 'PENDING') {
    note = 'Your order is awaiting payment verification.';
  }
  qs('#success-note').textContent = note;

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function init() {
  const orderId = getOrderId();
  if (!orderId) {
    showError();
    return;
  }

  try {
    const res = await getOrder(orderId);
    renderOrder(res.data.order);
  } catch (err) {
    toast.error('Could not load order details');
    showError();
  }
}

init();
