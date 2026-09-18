import { requireAdminAuth } from './guard.js';
import { initAdminShell } from './components/shell.js';
import { createDataTable } from './components/data-table.js';
import { openModal } from './components/modal.js';
import { accountStatusBadgeHtml } from './components/badge.js';
import { toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirm-dialog.js';
import { escapeHtml, qs, debounce } from '../utils/dom.js';
import { formatDate, formatCurrency } from '../utils/format.js';
import * as productsApi from './api/products.api.js';
import * as categoriesApi from './api/categories.api.js';
import * as paymentOptionsApi from './api/payment-options.api.js';

const currentUser = requireAdminAuth(['ADMIN', 'DEFAULT_ADMIN', 'STAFF']);
if (currentUser) {
  initAdminShell({ active: 'products', user: currentUser });
  init(currentUser);
}

const canDelete = currentUser && ['ADMIN', 'DEFAULT_ADMIN'].includes(currentUser.role);

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-gold-900';

let categoriesCache = [];
let paymentOptionsCache = [];

function fieldHtml(label, inputHtml) {
  return `<div><label class="mb-1 block text-sm font-medium text-slate-700 dark:text-neutral-300">${label}</label>${inputHtml}</div>`;
}

async function loadFilterOptions() {
  const res = await categoriesApi.listCategories({ status: 'ACTIVE', limit: 100 });
  categoriesCache = res.data.categories;
  const select = qs('#filter-category');
  categoriesCache.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c._id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

async function ensurePaymentOptionsLoaded() {
  if (paymentOptionsCache.length) {
    return paymentOptionsCache;
  }
  const res = await paymentOptionsApi.listPaymentOptions({ status: 'ACTIVE', limit: 100 });
  paymentOptionsCache = res.data.paymentOptions;
  return paymentOptionsCache;
}

function renderRow(product) {
  const categoryName = product.category && product.category.name ? escapeHtml(product.category.name) : '-';
  const thumb = product.images && product.images[0]
    ? `<img src="${escapeHtml(product.images[0])}" class="h-10 w-10 rounded-lg object-cover" alt="" />`
    : `<span class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-300 dark:bg-neutral-800"><i data-lucide="image" class="h-4 w-4"></i></span>`;

  const priceHtml = product.discountPrice
    ? `<span class="font-semibold text-slate-900 dark:text-white">${formatCurrency(product.discountPrice)}</span> <span class="text-xs text-slate-400 line-through">${formatCurrency(product.price)}</span>`
    : `<span class="font-semibold text-slate-900 dark:text-white">${formatCurrency(product.price)}</span>`;

  const actions = [
    `<button type="button" data-edit="${product._id}" class="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-gold-300 hover:text-gold-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-gold-700 dark:hover:text-gold-400">Edit</button>`,
  ];
  if (canDelete) {
    actions.push(
      `<button type="button" data-delete="${product._id}" data-delete-name="${escapeHtml(product.name)}" class="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40">Delete</button>`
    );
  }

  return `
    <div class="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[0.5fr_1.6fr_1fr_1fr_0.7fr_0.8fr_1fr_1.2fr] sm:items-center sm:gap-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div>${thumb}</div>
      <div class="min-w-0"><p class="truncate font-medium text-slate-900 dark:text-white">${escapeHtml(product.name)}</p><p class="truncate text-xs text-slate-400">${escapeHtml(product.sku || '')}</p></div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Category</p><p class="text-sm text-slate-600 dark:text-neutral-300">${categoryName}</p></div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Price</p><p class="text-sm">${priceHtml}</p></div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Stock</p><p class="text-sm ${product.stock === 0 ? 'font-semibold text-rose-500' : 'text-slate-600 dark:text-neutral-300'}">${product.stock}</p></div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Status</p>${accountStatusBadgeHtml(product.status)}</div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Created</p><p class="text-sm text-slate-500 dark:text-neutral-400">${formatDate(product.createdAt)}</p></div>
      <div class="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">${actions.join('')}</div>
    </div>
  `;
}

function categoryOptionsHtml(selectedId) {
  return categoriesCache
    .map((c) => `<option value="${c._id}" ${String(c._id) === String(selectedId) ? 'selected' : ''}>${escapeHtml(c.name)}</option>`)
    .join('');
}

function paymentOptionsChecklistHtml(selectedIds = []) {
  const selected = new Set(selectedIds.map(String));
  return paymentOptionsCache
    .map(
      (po) => `
        <label class="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-neutral-700">
          <input type="checkbox" name="paymentOptions" value="${po._id}" ${selected.has(String(po._id)) ? 'checked' : ''} class="rounded border-slate-300 text-gold-600 focus:ring-gold-500" />
          ${escapeHtml(po.name)}
        </label>
      `
    )
    .join('');
}

function existingImagesHtml(images = []) {
  if (!images.length) {
    return '';
  }
  return `
    <div class="flex flex-wrap gap-2">
      ${images.map((img) => `<img src="${escapeHtml(img)}" class="h-14 w-14 rounded-lg border border-slate-200 object-cover dark:border-neutral-700" alt="" />`).join('')}
    </div>
    <p class="text-xs text-slate-400">Uploading new images will replace the current ones.</p>
  `;
}

function productFormHtml(product) {
  const paymentOptionIds = product && product.paymentOptions ? product.paymentOptions.map((po) => (po._id ? po._id : po)) : [];
  return `
    <form id="product-form" class="space-y-4">
      ${fieldHtml('Name', `<input required name="name" value="${escapeHtml(product ? product.name : '')}" class="${INPUT_CLASS}" />`)}
      <div class="grid grid-cols-2 gap-3">
        ${fieldHtml('Category', `<select required name="category" class="${INPUT_CLASS}">${categoryOptionsHtml(product ? product.category && product.category._id : '')}</select>`)}
        ${fieldHtml('SKU (optional)', `<input name="sku" value="${escapeHtml(product ? product.sku || '' : '')}" class="${INPUT_CLASS}" />`)}
      </div>
      <div class="grid grid-cols-3 gap-3">
        ${fieldHtml('Price', `<input required type="number" min="0" step="0.01" name="price" value="${product ? product.price : ''}" class="${INPUT_CLASS}" />`)}
        ${fieldHtml('Discount Price', `<input type="number" min="0" step="0.01" name="discountPrice" value="${product && product.discountPrice ? product.discountPrice : ''}" class="${INPUT_CLASS}" />`)}
        ${fieldHtml('Stock', `<input required type="number" min="0" step="1" name="stock" value="${product ? product.stock : 0}" class="${INPUT_CLASS}" />`)}
      </div>
      ${fieldHtml('Description', `<textarea name="description" rows="3" class="${INPUT_CLASS}">${escapeHtml(product ? product.description || '' : '')}</textarea>`)}
      ${fieldHtml('Payment Options', `<div class="grid grid-cols-2 gap-2">${paymentOptionsChecklistHtml(paymentOptionIds)}</div>`)}
      ${fieldHtml('Images', `<input type="file" name="images" accept="image/png,image/jpeg,image/webp" multiple class="${INPUT_CLASS}" />`)}
      ${product ? existingImagesHtml(product.images) : ''}
      ${fieldHtml(
        'Status',
        `<select name="status" class="${INPUT_CLASS}">
          <option value="ACTIVE" ${!product || product.status === 'ACTIVE' ? 'selected' : ''}>Active</option>
          <option value="INACTIVE" ${product && product.status === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
        </select>`
      )}
      <button type="submit" class="w-full rounded-xl bg-gold-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-500">${product ? 'Save Changes' : 'Create Product'}</button>
    </form>
  `;
}

function buildFormData(form) {
  const formData = new FormData();
  const fields = new FormData(form);
  for (const [key, value] of fields.entries()) {
    if (key === 'images') {
      if (value instanceof File && value.size > 0) {
        formData.append('images', value);
      }
      continue;
    }
    if (key === 'paymentOptions') {
      formData.append('paymentOptions[]', value);
      continue;
    }
    if (key === 'discountPrice' && value === '') {
      continue;
    }
    formData.append(key, value);
  }
  return formData;
}

async function openCreateModal(onSuccess) {
  await ensurePaymentOptionsLoaded();
  const { close, body } = openModal({ title: 'Add Product', bodyHtml: productFormHtml(null) });

  body.querySelector('#product-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await productsApi.createProduct(buildFormData(event.target));
      toast.success('Product created');
      close();
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to create product');
    }
  });
}

async function openEditModal(id, onSuccess) {
  let product;
  try {
    await ensurePaymentOptionsLoaded();
    const res = await productsApi.getProduct(id);
    product = res.data.product;
  } catch (err) {
    toast.error(err.message || 'Failed to load product');
    return;
  }

  const { close, body } = openModal({ title: 'Edit Product', bodyHtml: productFormHtml(product) });

  body.querySelector('#product-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await productsApi.updateProduct(id, buildFormData(event.target));
      toast.success('Product updated');
      close();
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to update product');
    }
  });
}

async function deleteProductFlow(id, name, onSuccess) {
  const confirmed = await confirmDialog({
    title: 'Delete this product?',
    message: `This will permanently delete ${name || 'this product'}. This action cannot be undone.`,
    confirmLabel: 'Delete',
  });
  if (!confirmed) {
    return;
  }
  try {
    await productsApi.deleteProduct(id);
    toast.success('Product deleted');
    onSuccess();
  } catch (err) {
    toast.error(err.message || 'Failed to delete product');
  }
}

async function init() {
  await loadFilterOptions();

  const state = { search: '', category: '', status: '', page: 1 };

  const table = createDataTable({
    root: qs('#products-table'),
    columns: ['Image', 'Product', 'Category', 'Price', 'Stock', 'Status', 'Created', 'Actions'],
    gridCols: 'sm:grid-cols-[0.5fr_1.6fr_1fr_1fr_0.7fr_0.8fr_1fr_1.2fr]',
    emptyIcon: 'package',
    emptyTitle: 'No products found',
    emptyDescription: 'Try adjusting your search or filters, or add a new product.',
    fetchPage: async (params) => {
      const res = await productsApi.listProducts(params);
      return { items: res.data.products, pagination: res.pagination };
    },
    renderRow,
    onPageChange: (page) => {
      state.page = page;
      loadTable();
    },
  });

  function loadTable() {
    table.load({ search: state.search, category: state.category, status: state.status, page: state.page, limit: 10 });
  }

  qs('#filter-search').addEventListener(
    'input',
    debounce((event) => {
      state.search = event.target.value.trim();
      state.page = 1;
      loadTable();
    }, 350)
  );

  qs('#filter-category').addEventListener('change', (event) => {
    state.category = event.target.value;
    state.page = 1;
    loadTable();
  });

  qs('#filter-status').addEventListener('change', (event) => {
    state.status = event.target.value;
    state.page = 1;
    loadTable();
  });

  qs('#create-product-btn').addEventListener('click', () => openCreateModal(loadTable));

  table.body.addEventListener('click', (event) => {
    const editBtn = event.target.closest('[data-edit]');
    const deleteBtn = event.target.closest('[data-delete]');

    if (editBtn) {
      openEditModal(editBtn.dataset.edit, loadTable);
    } else if (deleteBtn) {
      deleteProductFlow(deleteBtn.dataset.delete, deleteBtn.dataset.deleteName, loadTable);
    }
  });

  loadTable();
}
