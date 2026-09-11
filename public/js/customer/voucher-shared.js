import { cancelOrder } from '../api/orders.api.js';
import { confirmDialog } from '../components/confirm-dialog.js';
import { toast } from '../components/toast.js';

export const PDF_ELIGIBLE_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

const STATUS_BADGE_CLASSES = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  SHIPPED: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  DELIVERED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  PAYMENT_FAILED: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export function statusBadgeClasses(status) {
  return STATUS_BADGE_CLASSES[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

export function statusBadgeHtml(status) {
  return `<span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(status)}">${status}</span>`;
}

export async function cancelOrderFlow(orderId, onSuccess) {
  const confirmed = await confirmDialog({
    title: 'Cancel this order?',
    message: 'This will cancel the order and restore stock. This action cannot be undone.',
    confirmLabel: 'Cancel Order',
    cancelLabel: 'Keep Order',
  });
  if (!confirmed) {
    return;
  }
  try {
    await cancelOrder(orderId);
    toast.success('Order cancelled');
    if (onSuccess) {
      await onSuccess();
    }
  } catch (err) {
    toast.error(err.message || 'Failed to cancel order');
  }
}
