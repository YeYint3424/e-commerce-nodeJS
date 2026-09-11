const orderService = require('../services/order.service');
const AppError = require('../utils/AppError');
const { ROLES, ORDER_STATUS } = require('../utils/constants');

const PDF_ELIGIBLE_STATUSES = [
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.COMPLETED,
];

function buildVoucherId(order) {
  return `VCH-${order._id.toString().slice(-8).toUpperCase()}`;
}

function toVoucher(order) {
  const payment = order.paymentId && typeof order.paymentId === 'object' ? order.paymentId : null;

  return {
    voucherId: buildVoucherId(order),
    orderId: order._id,
    customer: {
      name: order.shippingInfo.name,
      email: (order.customer && order.customer.email) || null,
      phone: order.shippingInfo.phone,
      address: order.shippingInfo.address,
    },
    items: order.items.map((item) => ({
      product: item.product,
      productName: item.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
    })),
    subtotal: order.subtotal,
    total: order.total,
    paymentMethod: payment
      ? {
          name: payment.methodName,
          type: payment.methodType,
          status: payment.status,
        }
      : null,
    orderStatus: order.status,
    createdAt: order.createdAt,
    changeNotes: (order.editHistory || []).map((entry) => ({
      reason: entry.reason,
      createdAt: entry.createdAt,
    })),
  };
}

async function listVouchers(caller, query) {
  if (caller.role !== ROLES.CUSTOMER) {
    throw new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN');
  }

  const { items, pagination } = await orderService.listOrders(caller, query);
  return { items: items.map(toVoucher), pagination };
}

async function getVoucher(caller, orderId) {
  const order = await orderService.getOrder(caller, orderId);
  return toVoucher(order);
}

async function getVoucherForPdf(caller, orderId) {
  const order = await orderService.getOrder(caller, orderId);

  if (!PDF_ELIGIBLE_STATUSES.includes(order.status)) {
    throw new AppError('Voucher is only available after the order has been confirmed', 409, 'CONFLICT');
  }

  return toVoucher(order);
}

module.exports = {
  listVouchers,
  getVoucher,
  getVoucherForPdf,
};
