import { listProducts } from '../api/products.api.js';
import { listCategories } from '../api/categories.api.js';
import { renderNav, renderFooter } from '../components/nav.js';
import { renderProductCard, productToCartItem, wireWishlistToggle, skeletonGrid } from '../components/product-card.js';
import { addItem } from '../cart/cart.js';
import { toast } from '../components/toast.js';
import { escapeHtml, qs, debounce } from '../utils/dom.js';

renderNav();
renderFooter();

const productLookup = new Map();
const state = {
  search: '',
  category: '',
  minPrice: '',
  maxPrice: '',
  sort: 'newest',
  page: 1,
};

function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  state.search = params.get('search') || '';
  state.category = params.get('category') || '';
  state.minPrice = params.get('minPrice') || '';
  state.maxPrice = params.get('maxPrice') || '';
  state.sort = params.get('sort') || 'newest';
  state.page = Number(params.get('page')) || 1;
}

function writeStateToUrl() {
  const params = new URLSearchParams();
  if (state.search) params.set('search', state.search);
  if (state.category) params.set('category', state.category);
  if (state.minPrice) params.set('minPrice', state.minPrice);
  if (state.maxPrice) params.set('maxPrice', state.maxPrice);
  if (state.sort && state.sort !== 'newest') params.set('sort', state.sort);
  if (state.page > 1) params.set('page', String(state.page));
  const qs2 = params.toString();
  window.history.pushState({}, '', `${window.location.pathname}${qs2 ? `?${qs2}` : ''}`);
}

function renderPagination(pagination) {
  const el = qs('#pagination');
  if (!pagination || pagination.totalPages <= 1) {
    el.innerHTML = '';
    return;
  }
  const { page, totalPages } = pagination;
  const pages = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  el.innerHTML = `
    <button data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} class="rounded-full border border-slate-200 p-2 text-slate-500 disabled:opacity-40 dark:border-slate-700"><i data-lucide="chevron-left" class="h-4 w-4"></i></button>
    ${pages
      .map((p) =>
        p === '...'
          ? `<span class="px-2 text-slate-400">...</span>`
          : `<button data-page="${p}" class="h-9 w-9 rounded-full text-sm font-medium transition-colors ${
              p === page
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }">${p}</button>`
      )
      .join('')}
    <button data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''} class="rounded-full border border-slate-200 p-2 text-slate-500 disabled:opacity-40 dark:border-slate-700"><i data-lucide="chevron-right" class="h-4 w-4"></i></button>
  `;
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function loadProducts() {
  const grid = qs('#products-grid');
  grid.innerHTML = skeletonGrid(9);

  try {
    const res = await listProducts({
      search: state.search,
      category: state.category,
      minPrice: state.minPrice,
      maxPrice: state.maxPrice,
      sort: state.sort,
      page: state.page,
      limit: 12,
      status: 'ACTIVE',
    });
    const products = res.data.products || [];

    if (!products.length) {
      grid.innerHTML = `
        <div class="col-span-full flex flex-col items-center gap-3 py-16 text-center">
          <i data-lucide="search-x" class="h-10 w-10 text-slate-300"></i>
          <p class="text-lg font-semibold text-slate-600 dark:text-slate-300">No products found</p>
          <p class="text-sm text-slate-400">Try adjusting your filters or search term.</p>
        </div>
      `;
      if (window.lucide) {
        window.lucide.createIcons();
      }
      renderPagination(null);
      return;
    }

    products.forEach((product) => productLookup.set(product._id, productToCartItem(product)));
    grid.innerHTML = products.map(renderProductCard).join('');
    if (window.lucide) {
      window.lucide.createIcons();
    }
    renderPagination(res.pagination);
  } catch (err) {
    grid.innerHTML = `<p class="col-span-full text-center text-sm text-rose-400">${escapeHtml(err.message)}</p>`;
    renderPagination(null);
  }
}

async function loadCategoryOptions() {
  const select = qs('#filter-category');
  try {
    const res = await listCategories({ limit: 100, status: 'ACTIVE' });
    const categories = res.data.categories || [];
    categories.forEach((category) => {
      const opt = document.createElement('option');
      opt.value = category._id;
      opt.textContent = category.name;
      if (category._id === state.category) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  } catch (err) {
    toast.error('Failed to load categories');
  }
}

function bindFilters() {
  qs('#filter-search').value = state.search;
  qs('#filter-min').value = state.minPrice;
  qs('#filter-max').value = state.maxPrice;
  qs('#filter-sort').value = state.sort;

  const debouncedSearch = debounce((value) => {
    state.search = value;
    state.page = 1;
    writeStateToUrl();
    loadProducts();
  }, 400);

  qs('#filter-search').addEventListener('input', (event) => debouncedSearch(event.target.value.trim()));

  qs('#filter-category').addEventListener('change', (event) => {
    state.category = event.target.value;
    state.page = 1;
    writeStateToUrl();
    loadProducts();
  });

  qs('#filter-sort').addEventListener('change', (event) => {
    state.sort = event.target.value;
    state.page = 1;
    writeStateToUrl();
    loadProducts();
  });

  qs('#price-filter-form').addEventListener('submit', (event) => {
    event.preventDefault();
    state.minPrice = qs('#filter-min').value;
    state.maxPrice = qs('#filter-max').value;
    state.page = 1;
    writeStateToUrl();
    loadProducts();
  });

  qs('#pagination').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-page]');
    if (!btn || btn.disabled) {
      return;
    }
    state.page = Number(btn.dataset.page);
    writeStateToUrl();
    loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const grid = qs('#products-grid');
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

async function init() {
  readStateFromUrl();
  await loadCategoryOptions();
  bindFilters();
  loadProducts();
}

init();
