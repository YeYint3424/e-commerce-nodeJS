import { escapeHtml } from '../utils/dom.js';
import { formatCurrency } from '../utils/format.js';

export function productToCartItem(product) {
  return {
    id: product._id,
    name: product.name,
    price: product.price,
    discountPrice: product.discountPrice ?? null,
    image: Array.isArray(product.images) && product.images.length ? product.images[0] : null,
    stock: product.stock,
  };
}

function productImageBlock(product) {
  const image = Array.isArray(product.images) && product.images.length ? product.images[0] : null;
  if (image) {
    return `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />`;
  }
  return `<div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 via-fuchsia-100 to-amber-100 dark:from-indigo-950 dark:via-fuchsia-950 dark:to-slate-900"><i data-lucide="image" class="h-10 w-10 text-indigo-300 dark:text-indigo-700"></i></div>`;
}

export function renderProductCard(product) {
  const id = product._id;
  const categoryName = product.category && product.category.name ? product.category.name : '';
  const hasDiscount =
    product.discountPrice !== undefined && product.discountPrice !== null && Number(product.discountPrice) < Number(product.price);
  const outOfStock = !product.stock || product.stock <= 0;

  return `
    <article class="group anim-fade-up flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <a href="/products/${id}" class="relative block aspect-square overflow-hidden">
        ${productImageBlock(product)}
        <button data-wishlist-toggle type="button" class="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-slate-500 shadow-sm transition-colors hover:text-rose-500 dark:bg-slate-900/80" aria-label="Toggle wishlist">
          <i data-lucide="heart" class="h-4 w-4"></i>
        </button>
        ${outOfStock ? `<span class="absolute left-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-white">Out of Stock</span>` : ''}
      </a>
      <div class="flex flex-1 flex-col gap-2 p-4">
        ${categoryName ? `<span class="text-xs font-medium uppercase tracking-wide text-indigo-500 dark:text-indigo-400">${escapeHtml(categoryName)}</span>` : ''}
        <a href="/products/${id}" class="line-clamp-2 text-sm font-semibold text-slate-800 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400">${escapeHtml(product.name)}</a>
        <div class="mt-1 flex items-baseline gap-2">
          <span class="text-lg font-bold text-slate-900 dark:text-white">${formatCurrency(hasDiscount ? product.discountPrice : product.price)}</span>
          ${hasDiscount ? `<span class="text-sm text-slate-400 line-through">${formatCurrency(product.price)}</span>` : ''}
        </div>
        <div class="mt-auto flex items-center gap-2 pt-3">
          <button data-add-to-cart="${id}" ${outOfStock ? 'disabled' : ''} class="flex-1 rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700">
            ${outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
          <a href="/products/${id}" class="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700" aria-label="View details">
            <i data-lucide="arrow-up-right" class="h-4 w-4"></i>
          </a>
        </div>
      </div>
    </article>
  `;
}

export function wireWishlistToggle(container) {
  container.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-wishlist-toggle]');
    if (!btn) {
      return;
    }
    btn.classList.toggle('text-rose-500');
    const icon = btn.querySelector('i');
    if (icon) {
      icon.setAttribute('fill', btn.classList.contains('text-rose-500') ? 'currentColor' : 'none');
    }
  });
}

export function skeletonGrid(count = 8) {
  return Array.from({ length: count })
    .map(
      () => `
        <div class="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div class="aspect-square bg-slate-100 dark:bg-slate-800"></div>
          <div class="space-y-2 p-4">
            <div class="h-3 w-1/3 rounded bg-slate-100 dark:bg-slate-800"></div>
            <div class="h-4 w-2/3 rounded bg-slate-100 dark:bg-slate-800"></div>
            <div class="h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-800"></div>
          </div>
        </div>
      `
    )
    .join('');
}
