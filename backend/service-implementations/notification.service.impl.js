const notificationRepository = require('../repositories/notification.repository');
const { getIO } = require('../sockets/io');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination.util');
const { ROLES, STAFF_ADMIN_ROLES } = require('../utils/constants');

const STAFF_ADMIN_ROOM = 'role:STAFF_ADMIN';
const STAFF_ADMIN_RECIPIENT = 'STAFF_ADMIN';

function filterForUser(user) {
  if (user.role === ROLES.CUSTOMER || user.role === ROLES.HR) {
    return { recipientUser: user._id };
  }
  return { $or: [{ recipientUser: user._id }, { recipientRole: STAFF_ADMIN_RECIPIENT }] };
}

function canView(user, notification) {
  if (notification.recipientUser && notification.recipientUser.toString() === user._id.toString()) {
    return true;
  }
  return notification.recipientRole === STAFF_ADMIN_RECIPIENT && STAFF_ADMIN_ROLES.includes(user.role);
}

function emitToRoom(room, notification) {
  const io = getIO();
  if (io) {
    io.to(room).emit('notification:new', notification);
  }
}

async function listNotifications(user, query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = filterForUser(user);

  const [items, totalItems] = await Promise.all([
    notificationRepository.paginate(filter, { skip, limit }),
    notificationRepository.countByFilter(filter),
  ]);

  return { items, pagination: buildPaginationMeta({ page, limit, totalItems }) };
}

async function getUnreadCount(user) {
  const filter = { ...filterForUser(user), isRead: false };
  const count = await notificationRepository.countByFilter(filter);
  return { unreadCount: count };
}

async function markAsRead(user, id) {
  const notification = await notificationRepository.findById(id);
  if (!notification || !canView(user, notification)) {
    throw new AppError('Notification not found', 404, 'NOT_FOUND');
  }
  return notificationRepository.markRead(id);
}

async function markAllAsRead(user) {
  const filter = { ...filterForUser(user), isRead: false };
  await notificationRepository.markAllRead(filter);
  return { success: true };
}

async function notifyUser(userId, { type, title, message, entityType, entityId }) {
  const notification = await notificationRepository.create({
    recipientUser: userId,
    type,
    title,
    message,
    entityType,
    entityId,
  });
  emitToRoom(`user:${userId}`, notification.toJSON());
  return notification;
}

async function notifyStaffAdmin({ type, title, message, entityType, entityId }) {
  const notification = await notificationRepository.create({
    recipientRole: STAFF_ADMIN_RECIPIENT,
    type,
    title,
    message,
    entityType,
    entityId,
  });
  emitToRoom(STAFF_ADMIN_ROOM, notification.toJSON());
  return notification;
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  notifyUser,
  notifyStaffAdmin,
};
