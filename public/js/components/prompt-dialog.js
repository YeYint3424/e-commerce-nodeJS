export function promptDialog({
  title = 'Please provide more information',
  message = '',
  label = 'Reason',
  placeholder = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm';
    overlay.innerHTML = `
      <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">${title}</h3>
        ${message ? `<p class="mt-2 text-sm text-slate-500 dark:text-neutral-400">${message}</p>` : ''}
        <label class="mt-4 block text-sm font-medium text-slate-700 dark:text-neutral-300">${label}</label>
        <textarea data-prompt-input rows="3" placeholder="${placeholder}" class="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-gold-900"></textarea>
        <p data-prompt-error class="mt-1 hidden text-xs text-rose-500">This field is required.</p>
        <div class="mt-6 flex justify-end gap-3">
          <button type="button" data-prompt-cancel class="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">${cancelLabel}</button>
          <button type="button" data-prompt-ok class="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500">${confirmLabel}</button>
        </div>
      </div>
    `;

    function close(result) {
      overlay.remove();
      resolve(result);
    }

    const textarea = overlay.querySelector('[data-prompt-input]');
    const errorEl = overlay.querySelector('[data-prompt-error]');

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        close(null);
      }
    });
    overlay.querySelector('[data-prompt-cancel]').addEventListener('click', () => close(null));
    overlay.querySelector('[data-prompt-ok]').addEventListener('click', () => {
      const value = textarea.value.trim();
      if (!value) {
        errorEl.classList.remove('hidden');
        textarea.focus();
        return;
      }
      close(value);
    });

    document.body.appendChild(overlay);
    textarea.focus();
  });
}
