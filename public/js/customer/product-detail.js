import { getProduct } from '../api/products.api.js';
import { renderNav, renderFooter } from '../components/nav.js';
import { productToCartItem } from '../components/product-card.js';
import { addItem } from '../cart/cart.js';
import { toast } from '../components/toast.js';
import { formatCurrency } from '../utils/format.js';
import { escapeHtml, qs } from '../utils/dom.js';

renderNav();
renderFooter();

let currentProduct = null;
let quantity = 1;

function getIdFromPath() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  return segments[segments.length - 1];
}

function renderGallery(images, name) {
  const wrap = qs('#detail-gallery');
  if (!images || !images.length) {
    wrap.innerHTML = `<div class="flex aspect-square items-center justify-center rounded-3xl bg-gradient-to-br from-gold-100 via-gold-200 to-amber-100 dark:from-gold-950 dark:via-gold-900 dark:to-neutral-900"><i data-lucide="image" class="h-16 w-16 text-gold-300 dark:text-gold-700"></i></div>`;
    if (window.lucide) {
      window.lucide.createIcons();
    }
    return;
  }

  wrap.innerHTML = `
    <div class="aspect-square overflow-hidden rounded-3xl border border-slate-200 dark:border-neutral-800">
      <img id="gallery-main" src="${escapeHtml(images[0])}" alt="${escapeHtml(name)}" class="h-full w-full object-cover" />
    </div>
    ${
      images.length > 1
        ? `<div class="mt-3 flex gap-3 overflow-x-auto">
            ${images
              .map(
                (img, i) =>
                  `<button type="button" data-thumb="${escapeHtml(img)}" class="h-16 w-16 shrink-0 overflow-hidden rounded-xl border ${
                    i === 0 ? 'border-gold-500' : 'border-slate-200 dark:border-neutral-700'
                  }"><img src="${escapeHtml(img)}" alt="" class="h-full w-full object-cover" /></button>`
              )
              .join('')}
          </div>`
        : ''
    }
  `;

  wrap.querySelectorAll('[data-thumb]').forEach((btn) => {
    btn.addEventListener('click', () => {
      qs('#gallery-main').src = btn.dataset.thumb;
      wrap.querySelectorAll('[data-thumb]').forEach((b) => b.classList.remove('border-gold-500'));
      btn.classList.add('border-gold-500');
    });
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function updateQuantityUi() {
  qs('#qty-value').textContent = String(quantity);
  qs('#qty-decrease').disabled = quantity <= 1;
  qs('#qty-increase').disabled = quantity >= currentProduct.stock;
}

function bindActions() {
  qs('#qty-decrease').addEventListener('click', () => {
    quantity = Math.max(1, quantity - 1);
    updateQuantityUi();
  });
  qs('#qty-increase').addEventListener('click', () => {
    quantity = Math.min(currentProduct.stock, quantity + 1);
    updateQuantityUi();
  });
  qs('#add-to-cart').addEventListener('click', () => {
    addItem(productToCartItem(currentProduct), quantity);
    toast.success(`${currentProduct.name} added to cart`);
  });
  qs('#buy-now').addEventListener('click', () => {
    addItem(productToCartItem(currentProduct), quantity);
    window.location.href = '/cart';
  });
}

function renderNotFound() {
  qs('#product-detail-content').classList.add('hidden');
  const notFound = qs('#product-not-found');
  notFound.classList.remove('hidden');
  notFound.classList.add('flex');
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderProduct(product) {
  document.title = `${product.name} - Shoply`;
  renderGallery(product.images, product.name);
  qs('#detail-category').textContent = (product.category && product.category.name) || '';
  qs('#detail-name').textContent = product.name;
  qs('#detail-description').textContent = product.description || 'No description available.';

  const hasDiscount =
    product.discountPrice !== undefined && product.discountPrice !== null && Number(product.discountPrice) < Number(product.price);
  qs('#detail-price').textContent = formatCurrency(hasDiscount ? product.discountPrice : product.price);
  const originalEl = qs('#detail-original-price');
  if (hasDiscount) {
    originalEl.textContent = formatCurrency(product.price);
    originalEl.classList.remove('hidden');
  } else {
    originalEl.classList.add('hidden');
  }

  const outOfStock = !product.stock || product.stock <= 0;
  const stockEl = qs('#detail-stock');
  stockEl.textContent = outOfStock ? 'Out of stock' : `${product.stock} in stock`;
  stockEl.classList.toggle('text-rose-500', outOfStock);
  stockEl.classList.toggle('text-emerald-500', !outOfStock);

  const paymentList = qs('#payment-options-list');
  if (Array.isArray(product.paymentOptions) && product.paymentOptions.length) {
    paymentList.innerHTML = product.paymentOptions
      .map(
        (po) =>
          `<span class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 dark:border-neutral-700 dark:text-neutral-300"><i data-lucide="credit-card" class="h-3.5 w-3.5"></i>${escapeHtml(po.name)}</span>`
      )
      .join('');
  } else {
    paymentList.innerHTML = `<span class="text-xs text-slate-400">No payment options configured.</span>`;
  }

  const addBtn = qs('#add-to-cart');
  const buyBtn = qs('#buy-now');
  addBtn.disabled = outOfStock;
  buyBtn.disabled = outOfStock;
  addBtn.textContent = outOfStock ? 'Out of Stock' : 'Add to Cart';
  buyBtn.textContent = outOfStock ? 'Out of Stock' : 'Buy Now';

  if (window.lucide) {
    window.lucide.createIcons();
  }

  quantity = 1;
  if (!outOfStock) {
    updateQuantityUi();
  }
  bindActions();
}

async function init() {
  const id = getIdFromPath();
  if (!id) {
    renderNotFound();
    return;
  }
  try {
    const res = await getProduct(id);
    currentProduct = res.data.product;
    renderProduct(currentProduct);
  } catch (err) {
    renderNotFound();
  }
}

init();
