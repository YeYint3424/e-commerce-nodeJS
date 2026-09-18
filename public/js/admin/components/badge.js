const ORDER_STATUS_CLASSES = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  SHIPPED: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  DELIVERED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  PAYMENT_FAILED: 'bg-slate-200 text-slate-600 dark:bg-neutral-800 dark:text-neutral-300',
};

const PAYMENT_STATUS_CLASSES = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  VERIFIED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
};

const ACCOUNT_STATUS_CLASSES = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  INACTIVE: 'bg-slate-200 text-slate-600 dark:bg-neutral-800 dark:text-neutral-300',
};

function badgeHtml(label, classes) {
  return `<span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${classes}">${label}</span>`;
}

export function orderStatusBadgeHtml(status) {
  return badgeHtml(status || 'UNKNOWN', ORDER_STATUS_CLASSES[status] || 'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-300');
}

export function paymentStatusBadgeHtml(status) {
  return badgeHtml(status || 'N/A', PAYMENT_STATUS_CLASSES[status] || 'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-300');
}

export function accountStatusBadgeHtml(status) {
  return badgeHtml(status || 'UNKNOWN', ACCOUNT_STATUS_CLASSES[status] || 'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-300');
}
