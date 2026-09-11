const Payment = require('../models/Payment');

async function create(data) {
  return Payment.create(data);
}

async function findById(id) {
  return Payment.findById(id).exec();
}

async function findByOrderId(orderId) {
  return Payment.findOne({ order: orderId }).exec();
}

async function save(payment) {
  return payment.save();
}

module.exports = {
  create,
  findById,
  findByOrderId,
  save,
};
