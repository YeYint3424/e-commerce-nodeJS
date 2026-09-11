const Order = require('../models/Order');

async function create(data) {
  return Order.create(data);
}

async function findById(id) {
  return Order.findById(id).populate('customer', 'name email phone').exec();
}

async function findByIdRaw(id) {
  return Order.findById(id).exec();
}

async function save(order) {
  return order.save();
}

async function paginate(filter, { skip, limit, sort = { createdAt: -1 } } = {}) {
  return Order.find(filter).populate('customer', 'name email phone').sort(sort).skip(skip).limit(limit).exec();
}

async function countByFilter(filter) {
  return Order.countDocuments(filter);
}

module.exports = {
  create,
  findById,
  findByIdRaw,
  save,
  paginate,
  countByFilter,
};
