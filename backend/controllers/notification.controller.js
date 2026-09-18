const notificationService = require('../services/notification.service');
const wrapAsync = require('../utils/wrapAsync');
const { sendSuccess } = require('../utils/response.util');

const listNotifications = wrapAsync(async (req, res) => {
  const { items, pagination } = await notificationService.listNotifications(req.user, req.query);
  return sendSuccess(res, { message: 'Notifications fetched', data: { notifications: items }, pagination });
});

const getUnreadCount = wrapAsync(async (req, res) => {
  const data = await notificationService.getUnreadCount(req.user);
  return sendSuccess(res, { message: 'Unread count fetched', data });
});

const markAsRead = wrapAsync(async (req, res) => {
  const notification = await notificationService.markAsRead(req.user, req.params.id);
  return sendSuccess(res, { message: 'Notification marked as read', data: { notification } });
});

const markAllAsRead = wrapAsync(async (req, res) => {
  await notificationService.markAllAsRead(req.user);
  return sendSuccess(res, { message: 'All notifications marked as read', data: null });
});

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
