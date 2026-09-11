const Product = require('../models/Product');

async function create(data) {
  return Product.create(data);
}

async function findById(id) {
  return Product.findById(id)
    .populate('category', 'name')
    .populate('paymentOptions', 'name type')
    .exec();
}

async function updateById(id, data) {
  return Product.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('category', 'name')
    .populate('paymentOptions', 'name type')
    .exec();
}

async function deleteById(id) {
  return Product.findByIdAndDelete(id).exec();
}

async function paginate(filter, { skip, limit, sort = { createdAt: -1 } } = {}) {
  return Product.find(filter)
    .populate('category', 'name')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .exec();
}

async function countByFilter(filter) {
  return Product.countDocuments(filter);
}

async function reserveStock(productId, quantity) {
  return Product.findOneAndUpdate(
    { _id: productId, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { new: true }
  ).exec();
}

async function restoreStock(productId, quantity) {
  return Product.findOneAndUpdate(
    { _id: productId },
    { $inc: { stock: quantity } },
    { new: true }
  ).exec();
}

module.exports = {
  create,
  findById,
  updateById,
  deleteById,
  paginate,
  countByFilter,
  reserveStock,
  restoreStock,
};
