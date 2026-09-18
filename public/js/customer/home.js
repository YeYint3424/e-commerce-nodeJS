import { listProducts } from '../api/products.api.js';
import { listCategories } from '../api/categories.api.js';
import { renderNav, renderFooter } from '../components/nav.js';
import { renderProductCard, productToCartItem, wireWishlistToggle, skeletonGrid } from '../components/product-card.js';
import { addItem } from '../cart/cart.js';
import { toast } from '../components/toast.js';
import { escapeHtml, qs } from '../utils/dom.js';

renderNav();
renderFooter();

const productLookup = new Map();

function bindGridEvents(grid) {
  wireWishlistToggle(grid);
  grid.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-add-to-cart]');
    if (!btn || btn.disabled) {
      return;
    }
    const product = productLookup.get(btn.dataset.addToCart);
    if (!product) {
      return;
    }
    addItem(product, 1);
    toast.success(`${product.name} added to cart`);
  });
}

async function loadCategories() {
  const grid = qs('#categories-grid');
  try {
    const res = await listCategories({ limit: 8, status: 'ACTIVE' });
    const categories = res.data.categories || [];
    if (!categories.length) {
      grid.innerHTML = `<p class="col-span-full text-center text-sm text-slate-400">No categories yet.</p>`;
      return;
    }
    grid.innerHTML = categories
      .map(
        (category) => `
          <a href="/products?category=${category._id}" class="anim-fade-up group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
            <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-500/10 to-gold-700/10 text-gold-600 transition-transform group-hover:scale-110 dark:text-gold-400"><i data-lucide="shapes" class="h-6 w-6"></i></span>
            <span class="text-sm font-semibold text-slate-700 dark:text-neutral-200">${escapeHtml(category.name)}</span>
          </a>
        `
      )
      .join('');
    if (window.lucide) {
      window.lucide.createIcons();
    }
  } catch (err) {
    grid.innerHTML = `<p class="col-span-full text-center text-sm text-rose-400">Failed to load categories.</p>`;
  }
}

async function loadProducts(targetSelector, params) {
  const grid = qs(targetSelector);
  try {
    const res = await listProducts(params);
    const products = res.data.products || [];
    if (!products.length) {
      grid.innerHTML = `<p class="col-span-full text-center text-sm text-slate-400">No products found.</p>`;
      return;
    }
    products.forEach((product) => productLookup.set(product._id, productToCartItem(product)));
    grid.innerHTML = products.map(renderProductCard).join('');
    if (window.lucide) {
      window.lucide.createIcons();
    }
  } catch (err) {
    grid.innerHTML = `<p class="col-span-full text-center text-sm text-rose-400">${escapeHtml(err.message)}</p>`;
  }
}

function init() {
  const newArrivalsGrid = qs('#new-arrivals-grid');
  const trendingGrid = qs('#trending-grid');
  newArrivalsGrid.innerHTML = skeletonGrid(4);
  trendingGrid.innerHTML = skeletonGrid(4);
  bindGridEvents(newArrivalsGrid);
  bindGridEvents(trendingGrid);

  loadCategories();
  loadProducts('#new-arrivals-grid', { limit: 8, sort: 'newest', status: 'ACTIVE' });
  loadProducts('#trending-grid', { limit: 8, sort: 'price_asc', status: 'ACTIVE' });
}

init();
