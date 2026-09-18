export function confirmDialog({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel' } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm';
    overlay.innerHTML = `
      <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">${title}</h3>
        <p class="mt-2 text-sm text-slate-500 dark:text-neutral-400">${message}</p>
        <div class="mt-6 flex justify-end gap-3">
          <button type="button" data-confirm-cancel class="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">${cancelLabel}</button>
          <button type="button" data-confirm-ok class="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500">${confirmLabel}</button>
        </div>
      </div>
    `;

    function close(result) {
      overlay.remove();
      resolve(result);
    }

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        close(false);
      }
    });
    overlay.querySelector('[data-confirm-cancel]').addEventListener('click', () => close(false));
    overlay.querySelector('[data-confirm-ok]').addEventListener('click', () => close(true));

    document.body.appendChild(overlay);
  });
}
