export function createDataTable({
  root,
  columns,
  gridCols,
  renderRow,
  fetchPage,
  onPageChange,
  emptyIcon = 'inbox',
  emptyTitle = 'No records found',
  emptyDescription = '',
  skeletonCount = 5,
}) {
  root.innerHTML = `
    <div data-dt-header class="hidden rounded-xl bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid ${gridCols} sm:gap-4 dark:bg-neutral-900 dark:text-neutral-400">
      ${columns.map((c) => `<span>${c}</span>`).join('')}
    </div>
    <div data-dt-body class="mt-4 space-y-3"></div>
    <div data-dt-empty class="hidden flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-neutral-700">
      <i data-lucide="${emptyIcon}" class="h-10 w-10 text-slate-300"></i>
      <p class="text-base font-semibold text-slate-600 dark:text-neutral-300">${emptyTitle}</p>
      ${emptyDescription ? `<p class="max-w-sm text-sm text-slate-400">${emptyDescription}</p>` : ''}
    </div>
    <div data-dt-error class="hidden flex-col items-center gap-3 rounded-2xl border border-dashed border-rose-300 py-16 text-center dark:border-rose-800">
      <i data-lucide="alert-triangle" class="h-10 w-10 text-rose-400"></i>
      <p data-dt-error-message class="max-w-sm text-sm font-medium text-rose-500"></p>
      <button type="button" data-dt-retry class="rounded-full bg-gold-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-500">Retry</button>
    </div>
    <div data-dt-pagination class="mt-6 flex items-center justify-center gap-1"></div>
  `;

  const body = root.querySelector('[data-dt-body]');
  const emptyEl = root.querySelector('[data-dt-empty]');
  const errorEl = root.querySelector('[data-dt-error]');
  const errorMsgEl = root.querySelector('[data-dt-error-message]');
  const paginationEl = root.querySelector('[data-dt-pagination]');
  const headerEl = root.querySelector('[data-dt-header]');

  let lastParams = {};

  function skeletonHtml() {
    return Array.from({ length: skeletonCount })
      .map(
        () => `
          <div class="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div class="grid grid-cols-1 gap-3 ${gridCols} sm:items-center sm:gap-4">
              ${columns.map(() => `<div class="h-4 w-24 rounded bg-slate-200 dark:bg-neutral-800"></div>`).join('')}
            </div>
          </div>
        `
      )
      .join('');
  }

  function showState(state) {
    body.classList.toggle('hidden', state !== 'data' && state !== 'loading');
    emptyEl.classList.toggle('hidden', state !== 'empty');
    emptyEl.classList.toggle('flex', state === 'empty');
    errorEl.classList.toggle('hidden', state !== 'error');
    errorEl.classList.toggle('flex', state === 'error');
    headerEl.classList.toggle('sm:hidden', state !== 'data');
  }

  function renderPagination(pagination) {
    if (!pagination || pagination.totalPages <= 1) {
      paginationEl.innerHTML = '';
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

    paginationEl.innerHTML = `
      <button data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} class="rounded-full border border-slate-200 p-2 text-slate-500 disabled:opacity-40 dark:border-neutral-700"><i data-lucide="chevron-left" class="h-4 w-4"></i></button>
      ${pages
        .map((p) =>
          p === '...'
            ? `<span class="px-2 text-slate-400">...</span>`
            : `<button data-page="${p}" class="h-9 w-9 rounded-full text-sm font-medium transition-colors ${
                p === page ? 'bg-gold-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
              }">${p}</button>`
        )
        .join('')}
      <button data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''} class="rounded-full border border-slate-200 p-2 text-slate-500 disabled:opacity-40 dark:border-neutral-700"><i data-lucide="chevron-right" class="h-4 w-4"></i></button>
    `;
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  async function load(params = {}) {
    lastParams = params;
    showState('loading');
    body.innerHTML = skeletonHtml();
    paginationEl.innerHTML = '';

    try {
      const { items, pagination } = await fetchPage(params);

      if (!items || !items.length) {
        showState('empty');
        if (window.lucide) {
          window.lucide.createIcons();
        }
        return;
      }

      body.innerHTML = items.map(renderRow).join('');
      showState('data');
      renderPagination(pagination);
      if (window.lucide) {
        window.lucide.createIcons();
      }
    } catch (err) {
      showState('error');
      errorMsgEl.textContent = err.message || 'Something went wrong. Please try again.';
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }
  }

  root.querySelector('[data-dt-retry]').addEventListener('click', () => load(lastParams));

  paginationEl.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-page]');
    if (!btn || btn.disabled) {
      return;
    }
    if (typeof onPageChange === 'function') {
      onPageChange(Number(btn.dataset.page));
    }
  });

  return {
    body,
    load,
    reload: () => load(lastParams),
  };
}
