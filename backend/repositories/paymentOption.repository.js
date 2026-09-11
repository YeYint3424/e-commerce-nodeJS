const PaymentOption = require('../models/PaymentOption');

async function create(data) {
  return PaymentOption.create(data);
}

async function findById(id) {
  return PaymentOption.findById(id).exec();
}

async function updateById(id, data) {
  return PaymentOption.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
}

async function deleteById(id) {
  return PaymentOption.findByIdAndDelete(id).exec();
}

async function paginate(filter, { skip, limit, sort = { createdAt: -1 } } = {}) {
  return PaymentOption.find(filter).sort(sort).skip(skip).limit(limit).exec();
}

async function countByFilter(filter) {
  return PaymentOption.countDocuments(filter);
}

async function existsAllByIds(ids) {
  if (!ids || ids.length === 0) {
    return true;
  }
  const count = await PaymentOption.countDocuments({ _id: { $in: ids } });
  return count === ids.length;
}

module.exports = {
  create,
  findById,
  updateById,
  deleteById,
  paginate,
  countByFilter,
  existsAllByIds,
};
