import { getToken } from './auth/auth.js';
import { toast } from './components/toast.js';
import { escapeHtml } from './utils/dom.js';
import { formatDate } from './utils/format.js';
import * as notificationsApi from './api/notifications.api.js';
import { getPayment } from './api/payments.api.js';

async function resolveNotificationUrl(notification) {
  if (notification.entityType === 'Order' && notification.entityId) {
    return `/voucher/${notification.entityId}`;
  }
  if (notification.entityType === 'Payment' && notification.entityId) {
    const res = await getPayment(notification.entityId);
    const order = res.data.payment.order;
    const orderId = order && typeof order === 'object' ? order._id : order;
    return orderId ? `/voucher/${orderId}` : null;
  }
  return null;
}

function timeAgo(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(date);
}

function notificationItemHtml(notification) {
  return `
    <button type="button" data-notif-id="${notification._id}" data-entity-type="${escapeHtml(notification.entityType || '')}" data-entity-id="${escapeHtml(notification.entityId || '')}" class="flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-neutral-800 ${
      notification.isRead ? '' : 'bg-gold-50/60 dark:bg-gold-950/30'
    }">
      <span class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-neutral-100">
        ${notification.isRead ? '' : '<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500"></span>'}
        ${escapeHtml(notification.title)}
      </span>
      <span class="text-xs text-slate-500 dark:text-neutral-400">${escapeHtml(notification.message)}</span>
      <span class="text-[11px] text-slate-400">${timeAgo(notification.createdAt)}</span>
    </button>
  `;
}

export function initNotificationBell() {
  const btn = document.getElementById('notif-btn');
  const badge = document.getElementById('notif-badge');
  const panel = document.getElementById('notif-panel');
  if (!btn || !badge || !panel) {
    return;
  }

  function setUnreadCount(count) {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.toggle('hidden', count === 0);
    badge.classList.toggle('flex', count > 0);
  }

  function renderList(notifications) {
    if (!notifications.length) {
      panel.innerHTML = `<div class="flex flex-col items-center gap-2 py-8 text-center"><i data-lucide="bell-off" class="h-6 w-6 text-slate-300"></i><p class="text-sm text-slate-400">No notifications yet</p></div>`;
    } else {
      panel.innerHTML = `
        <div class="flex items-center justify-between px-2 pb-2">
          <p class="text-sm font-bold text-slate-900 dark:text-white">Notifications</p>
          <button type="button" id="notif-mark-all" class="text-xs font-semibold text-gold-600 hover:underline dark:text-gold-400">Mark all read</button>
        </div>
        <div class="space-y-1">${notifications.map(notificationItemHtml).join('')}</div>
      `;
      panel.querySelector('#notif-mark-all').addEventListener('click', async () => {
        try {
          await notificationsApi.markAllAsRead();
          await refresh();
        } catch (err) {
          toast.error(err.message || 'Failed to update notifications');
        }
      });
    }
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  async function refresh() {
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsApi.listNotifications({ limit: 10 }),
        notificationsApi.getUnreadCount(),
      ]);
      renderList(listRes.data.notifications);
      setUnreadCount(countRes.data.unreadCount);
    } catch (err) {
    }
  }

  panel.addEventListener('click', async (event) => {
    const item = event.target.closest('[data-notif-id]');
    if (!item) {
      return;
    }
    try {
      await notificationsApi.markAsRead(item.dataset.notifId);
      const url = await resolveNotificationUrl({
        entityType: item.dataset.entityType,
        entityId: item.dataset.entityId,
      });
      if (url) {
        window.location.href = url;
        return;
      }
      await refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to update notification');
    }
  });

  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
      panel.classList.remove('hidden');
      refresh();
    } else {
      panel.classList.add('hidden');
    }
  });

  document.addEventListener('click', (event) => {
    if (!panel.classList.contains('hidden') && !panel.contains(event.target) && event.target !== btn && !btn.contains(event.target)) {
      panel.classList.add('hidden');
    }
  });

  refresh();

  if (window.io) {
    const socket = window.io({ auth: { token: getToken() } });
    socket.on('notification:new', (notification) => {
      toast.info(notification.title);
      refresh();
    });
  }
}

