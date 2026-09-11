const CONTAINER_ID = 'toast-container';

const ICONS = {
  success: 'check-circle',
  error: 'x-circle',
  warning: 'alert-triangle',
  info: 'info',
};

const STYLES = {
  success: 'border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200',
  error: 'border-rose-300/60 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/80 dark:text-rose-200',
  warning: 'border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-200',
  info: 'border-sky-300/60 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/80 dark:text-sky-200',
};

function ensureContainer() {
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.className = 'fixed top-4 right-4 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2';
    document.body.appendChild(container);
  }
  return container;
}

function show(message, variant, duration) {
  const container = ensureContainer();
  const toastEl = document.createElement('div');
  toastEl.className = `toast-enter pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${STYLES[variant] || STYLES.info}`;

  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', ICONS[variant] || ICONS.info);
  icon.className = 'mt-0.5 h-5 w-5 shrink-0';

  const text = document.createElement('p');
  text.className = 'flex-1 text-sm font-medium';
  text.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'shrink-0 opacity-60 transition-opacity hover:opacity-100';
  closeBtn.setAttribute('aria-label', 'Dismiss notification');

  const closeIcon = document.createElement('i');
  closeIcon.setAttribute('data-lucide', 'x');
  closeIcon.className = 'h-4 w-4';
  closeBtn.appendChild(closeIcon);

  toastEl.append(icon, text, closeBtn);
  container.appendChild(toastEl);

  if (window.lucide) {
    window.lucide.createIcons();
  }

  const dismiss = () => {
    toastEl.classList.add('toast-exit');
    setTimeout(() => toastEl.remove(), 200);
  };

  closeBtn.addEventListener('click', dismiss);
  if (duration) {
    setTimeout(dismiss, duration);
  }
}

export const toast = {
  success: (message, duration = 3500) => show(message, 'success', duration),
  error: (message, duration = 4500) => show(message, 'error', duration),
  warning: (message, duration = 4000) => show(message, 'warning', duration),
  info: (message, duration = 3000) => show(message, 'info', duration),
};
