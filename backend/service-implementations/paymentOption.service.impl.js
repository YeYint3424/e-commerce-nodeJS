const paymentOptionRepository = require('../repositories/paymentOption.repository');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination.util');

async function createPaymentOption(data) {
  const { name, description, type, accountInfo, qrImage, status } = data;
  const option = await paymentOptionRepository.create({ name, description, type, accountInfo, qrImage, status });
  return option.toJSON();
}

async function listPaymentOptions(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  const [items, totalItems] = await Promise.all([
    paymentOptionRepository.paginate(filter, { skip, limit }),
    paymentOptionRepository.countByFilter(filter),
  ]);

  return {
    items: items.map((o) => o.toJSON()),
    pagination: buildPaginationMeta({ page, limit, totalItems }),
  };
}

async function getPaymentOption(id) {
  const option = await paymentOptionRepository.findById(id);
  if (!option) {
    throw new AppError('Payment option not found', 404, 'NOT_FOUND');
  }
  return option.toJSON();
}

async function updatePaymentOption(id, data) {
  const existing = await paymentOptionRepository.findById(id);
  if (!existing) {
    throw new AppError('Payment option not found', 404, 'NOT_FOUND');
  }

  const updates = {};
  ['name', 'description', 'type', 'accountInfo', 'qrImage', 'status'].forEach((field) => {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  });

  const updated = await paymentOptionRepository.updateById(id, updates);
  return updated.toJSON();
}

async function changeStatus(id, status) {
  const existing = await paymentOptionRepository.findById(id);
  if (!existing) {
    throw new AppError('Payment option not found', 404, 'NOT_FOUND');
  }

  const updated = await paymentOptionRepository.updateById(id, { status });
  return updated.toJSON();
}

async function deletePaymentOption(id) {
  const existing = await paymentOptionRepository.findById(id);
  if (!existing) {
    throw new AppError('Payment option not found', 404, 'NOT_FOUND');
  }

  await paymentOptionRepository.deleteById(id);
}

module.exports = {
  createPaymentOption,
  listPaymentOptions,
  getPaymentOption,
  updatePaymentOption,
  changeStatus,
  deletePaymentOption,
};
