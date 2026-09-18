export function openModal({ title, bodyHtml }) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[9997] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm';
  overlay.innerHTML = `
    <div class="anim-scale-in my-8 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">${title}</h3>
        <button type="button" data-modal-close class="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-neutral-800"><i data-lucide="x" class="h-5 w-5"></i></button>
      </div>
      <div data-modal-body>${bodyHtml}</div>
    </div>
  `;
  document.body.appendChild(overlay);
  if (window.lucide) {
    window.lucide.createIcons();
  }

  function close() {
    overlay.remove();
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });
  overlay.querySelector('[data-modal-close]').addEventListener('click', close);

  return { overlay, close, body: overlay.querySelector('[data-modal-body]') };
}
