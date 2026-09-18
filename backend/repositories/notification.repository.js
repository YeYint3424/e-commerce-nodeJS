const Notification = require('../models/Notification');

async function create(data) {
  return Notification.create(data);
}

async function findById(id) {
  return Notification.findById(id).exec();
}

async function paginate(filter, { skip, limit, sort = { createdAt: -1 } } = {}) {
  return Notification.find(filter).sort(sort).skip(skip).limit(limit).exec();
}

async function countByFilter(filter) {
  return Notification.countDocuments(filter);
}

async function markRead(id) {
  return Notification.findByIdAndUpdate(id, { isRead: true }, { new: true }).exec();
}

async function markAllRead(filter) {
  return Notification.updateMany(filter, { isRead: true }).exec();
}

module.exports = {
  create,
  findById,
  paginate,
  countByFilter,
  markRead,
  markAllRead,
};
