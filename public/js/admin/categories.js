import { requireAdminAuth } from './guard.js';
import { initAdminShell } from './components/shell.js';
import { createDataTable } from './components/data-table.js';
import { openModal } from './components/modal.js';
import { accountStatusBadgeHtml } from './components/badge.js';
import { toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirm-dialog.js';
import { escapeHtml, qs, debounce } from '../utils/dom.js';
import { formatDate } from '../utils/format.js';
import * as categoriesApi from './api/categories.api.js';

const currentUser = requireAdminAuth(['ADMIN', 'DEFAULT_ADMIN', 'STAFF']);
if (currentUser) {
  initAdminShell({ active: 'categories', user: currentUser });
  init();
}

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-gold-900';

function fieldHtml(label, inputHtml) {
  return `<div><label class="mb-1 block text-sm font-medium text-slate-700 dark:text-neutral-300">${label}</label>${inputHtml}</div>`;
}

function renderRow(category) {
  return `
    <div class="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1.2fr_1.8fr_0.8fr_0.8fr_1fr_1fr] sm:items-center sm:gap-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Category</p><p class="font-medium text-slate-900 dark:text-white">${escapeHtml(category.name)}</p></div>
      <div class="min-w-0"><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Description</p><p class="truncate text-sm text-slate-600 dark:text-neutral-300">${escapeHtml(category.description || '-')}</p></div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Product Count</p><p class="text-sm text-slate-600 dark:text-neutral-300">${category.productCount ?? 0}</p></div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Status</p>${accountStatusBadgeHtml(category.status)}</div>
      <div><p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Created</p><p class="text-sm text-slate-500 dark:text-neutral-400">${formatDate(category.createdAt)}</p></div>
      <div class="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
        <button type="button" data-edit="${category._id}" class="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-gold-300 hover:text-gold-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-gold-700 dark:hover:text-gold-400">Edit</button>
        <button type="button" data-delete="${category._id}" data-delete-name="${escapeHtml(category.name)}" class="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40">Delete</button>
      </div>
    </div>
  `;
}

function categoryFormHtml(category) {
  return `
    <form id="category-form" class="space-y-4">
      ${fieldHtml('Name', `<input required name="name" value="${escapeHtml(category ? category.name : '')}" class="${INPUT_CLASS}" />`)}
      ${fieldHtml('Description', `<textarea name="description" rows="3" class="${INPUT_CLASS}">${escapeHtml(category ? category.description || '' : '')}</textarea>`)}
      ${fieldHtml(
        'Status',
        `<select name="status" class="${INPUT_CLASS}">
          <option value="ACTIVE" ${!category || category.status === 'ACTIVE' ? 'selected' : ''}>Active</option>
          <option value="INACTIVE" ${category && category.status === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
        </select>`
      )}
      <button type="submit" class="w-full rounded-xl bg-gold-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-500">${category ? 'Save Changes' : 'Create Category'}</button>
    </form>
  `;
}

function openCreateModal(onSuccess) {
  const { close, body } = openModal({ title: 'Add Category', bodyHtml: categoryFormHtml(null) });

  body.querySelector('#category-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    try {
      await categoriesApi.createCategory(payload);
      toast.success('Category created');
      close();
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to create category');
    }
  });
}

async function openEditModal(id, onSuccess) {
  let category;
  try {
    const res = await categoriesApi.getCategory(id);
    category = res.data.category;
  } catch (err) {
    toast.error(err.message || 'Failed to load category');
    return;
  }

  const { close, body } = openModal({ title: 'Edit Category', bodyHtml: categoryFormHtml(category) });

  body.querySelector('#category-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    try {
      await categoriesApi.updateCategory(id, payload);
      toast.success('Category updated');
      close();
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to update category');
    }
  });
}

async function deleteCategoryFlow(id, name, onSuccess) {
  const confirmed = await confirmDialog({
    title: 'Delete this category?',
    message: `This will permanently delete ${name || 'this category'}. This action cannot be undone.`,
    confirmLabel: 'Delete',
  });
  if (!confirmed) {
    return;
  }
  try {
    await categoriesApi.deleteCategory(id);
    toast.success('Category deleted');
    onSuccess();
  } catch (err) {
    toast.error(err.message || 'Failed to delete category');
  }
}

function init() {
  const state = { search: '', status: '', page: 1 };

  const table = createDataTable({
    root: qs('#categories-table'),
    columns: ['Category', 'Description', 'Product Count', 'Status', 'Created', 'Actions'],
    gridCols: 'sm:grid-cols-[1.2fr_1.8fr_0.8fr_0.8fr_1fr_1fr]',
    emptyIcon: 'tags',
    emptyTitle: 'No categories found',
    emptyDescription: 'Try adjusting your search or filters, or create a new category.',
    fetchPage: async (params) => {
      const res = await categoriesApi.listCategories(params);
      return { items: res.data.categories, pagination: res.pagination };
    },
    renderRow,
    onPageChange: (page) => {
      state.page = page;
      loadTable();
    },
  });

  function loadTable() {
    table.load({ search: state.search, status: state.status, page: state.page, limit: 10 });
  }

  qs('#filter-search').addEventListener(
    'input',
    debounce((event) => {
      state.search = event.target.value.trim();
      state.page = 1;
      loadTable();
    }, 350)
  );

  qs('#filter-status').addEventListener('change', (event) => {
    state.status = event.target.value;
    state.page = 1;
    loadTable();
  });

  qs('#create-category-btn').addEventListener('click', () => openCreateModal(loadTable));

  table.body.addEventListener('click', (event) => {
    const editBtn = event.target.closest('[data-edit]');
    const deleteBtn = event.target.closest('[data-delete]');

    if (editBtn) {
      openEditModal(editBtn.dataset.edit, loadTable);
    } else if (deleteBtn) {
      deleteCategoryFlow(deleteBtn.dataset.delete, deleteBtn.dataset.deleteName, loadTable);
    }
  });

  loadTable();
}
