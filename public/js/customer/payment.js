import { renderNav, renderFooter } from '../components/nav.js';
import { isAuthenticated } from '../auth/auth.js';
import { getOrder } from '../api/orders.api.js';
import { listPaymentOptions, createPayment, uploadPaymentProof } from '../api/payments.api.js';
import { formatCurrency } from '../utils/format.js';
import { escapeHtml, qs, qsa } from '../utils/dom.js';
import { toast } from '../components/toast.js';

if (!isAuthenticated()) {
  sessionStorage.setItem('postLoginRedirect', `${window.location.pathname}${window.location.search}`);
  window.location.href = '/login';
}

renderNav();
renderFooter();

let currentOrder = null;
let paymentOptions = [];
let selectedOptionId = null;
let createdPayment = null;

function getOrderId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('orderId');
}

function showMessage(message) {
  qs('#payment-content').classList.add('hidden');
  const el = qs('#payment-message');
  el.textContent = message;
  el.classList.remove('hidden');
  el.classList.add('flex');
}

function renderOrderSummary(order) {
  qs('#order-id').textContent = `#${order._id}`;
  qs('#order-item-count').textContent = String(order.items.length);
  qs('#order-total').textContent = formatCurrency(order.total);
}

function optionCardHtml(option) {
  const selected = option._id === selectedOptionId;
  return `
    <button type="button" data-option-id="${escapeHtml(option._id)}" class="w-full rounded-2xl border p-4 text-left transition-colors ${
    selected
      ? 'border-gold-500 bg-gold-50 dark:border-gold-500 dark:bg-gold-950/40'
      : 'border-slate-200 bg-white hover:border-gold-300 dark:border-neutral-800 dark:bg-neutral-900'
  }">
      <div class="flex items-center justify-between gap-2">
        <p class="font-semibold text-slate-900 dark:text-white">${escapeHtml(option.name)}</p>
        <span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-neutral-800 dark:text-neutral-400">${escapeHtml(option.type)}</span>
      </div>
      ${option.description ? `<p class="mt-1 text-sm text-slate-500 dark:text-neutral-400">${escapeHtml(option.description)}</p>` : ''}
    </button>
  `;
}

function renderQrDetail() {
  const option = paymentOptions.find((o) => o._id === selectedOptionId);
  const panel = qs('#qr-detail');
  if (!option || option.type !== 'QR') {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');
  qs('#qr-account-info').textContent = option.accountInfo || '';
  qs('#qr-image-wrap').innerHTML = option.qrImage
    ? `<img src="${escapeHtml(option.qrImage)}" alt="QR code" class="h-48 w-48 rounded-xl border border-slate-200 object-cover dark:border-neutral-800" />`
    : '';
}

function renderOptions() {
  qs('#payment-options-list').innerHTML = paymentOptions.map(optionCardHtml).join('');
  qsa('[data-option-id]', qs('#payment-options-list')).forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedOptionId = btn.dataset.optionId;
      renderOptions();
      renderQrDetail();
    });
  });
  qs('#confirm-payment-btn').disabled = !selectedOptionId;
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function confirmPayment() {
  if (!selectedOptionId || !currentOrder) {
    return;
  }

  const btn = qs('#confirm-payment-btn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    const res = await createPayment({ orderId: currentOrder._id, paymentOptionId: selectedOptionId });
    createdPayment = res.data.payment;

    if (res.data.requiresProof) {
      qs('#payment-selection').classList.add('hidden');
      qs('#proof-upload-section').classList.remove('hidden');
    } else {
      window.location.href = `/order-success?orderId=${encodeURIComponent(currentOrder._id)}`;
    }
  } catch (err) {
    toast.error(err.message || 'Failed to create payment');
    btn.disabled = false;
    btn.textContent = 'Confirm Payment Method';
  }
}

function previewProofFile() {
  const fileInput = qs('#proof-file-input');
  const wrap = qs('#proof-preview-wrap');
  const img = qs('#proof-preview-img');
  const file = fileInput.files && fileInput.files[0];

  if (!file) {
    wrap.classList.add('hidden');
    img.src = '';
    return;
  }

  img.src = URL.createObjectURL(file);
  wrap.classList.remove('hidden');
}

async function submitProof() {
  const fileInput = qs('#proof-file-input');
  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    toast.error('Please choose a screenshot to upload');
    return;
  }

  const btn = qs('#upload-proof-btn');
  btn.disabled = true;
  btn.textContent = 'Uploading...';

  try {
    await uploadPaymentProof(createdPayment._id, file);
    window.location.href = `/order-success?orderId=${encodeURIComponent(currentOrder._id)}`;
  } catch (err) {
    toast.error(err.message || 'Failed to upload payment proof');
    btn.disabled = false;
    btn.textContent = 'Upload Proof';
  }
}

async function init() {
  const orderId = getOrderId();
  if (!orderId) {
    showMessage('No order was specified.');
    return;
  }

  try {
    const res = await getOrder(orderId);
    currentOrder = res.data.order;
  } catch (err) {
    showMessage('We could not find that order.');
    return;
  }

  if (currentOrder.status !== 'PENDING') {
    showMessage(`This order is ${currentOrder.status} and can no longer be paid for.`);
    return;
  }

  if (currentOrder.paymentId) {
    showMessage('A payment has already been submitted for this order.');
    return;
  }

  renderOrderSummary(currentOrder);

  try {
    const res = await listPaymentOptions({ status: 'ACTIVE', limit: 100 });
    paymentOptions = res.data.paymentOptions || [];
  } catch (err) {
    toast.error('Could not load payment options');
    paymentOptions = [];
  }

  if (!paymentOptions.length) {
    showMessage('No payment methods are currently available. Please contact support.');
    return;
  }

  renderOptions();
  qs('#confirm-payment-btn').addEventListener('click', confirmPayment);
  qs('#upload-proof-btn').addEventListener('click', submitProof);
  qs('#proof-file-input').addEventListener('change', previewProofFile);

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

init();
