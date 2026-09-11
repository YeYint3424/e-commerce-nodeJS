const Category = require('../models/Category');
const Product = require('../models/Product');

async function create(data) {
  return Category.create(data);
}

async function findById(id) {
  return Category.findById(id).exec();
}

async function findByName(name) {
  return Category.findOne({ name }).exec();
}

async function updateById(id, data) {
  return Category.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
}

async function deleteById(id) {
  return Category.findByIdAndDelete(id).exec();
}

async function paginate(filter, { skip, limit, sort = { createdAt: -1 } } = {}) {
  return Category.find(filter).sort(sort).skip(skip).limit(limit).exec();
}

async function countByFilter(filter) {
  return Category.countDocuments(filter);
}

async function countActiveProductsByCategory(categoryId) {
  return Product.countDocuments({ category: categoryId, status: 'ACTIVE' });
}

async function getProductCounts(categoryIds) {
  const counts = await Product.aggregate([
    { $match: { category: { $in: categoryIds } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  const map = {};
  counts.forEach((c) => {
    map[c._id.toString()] = c.count;
  });
  return map;
}

module.exports = {
  create,
  findById,
  findByName,
  updateById,
  deleteById,
  paginate,
  countByFilter,
  countActiveProductsByCategory,
  getProductCounts,
};
