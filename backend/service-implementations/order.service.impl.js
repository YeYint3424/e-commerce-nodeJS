const orderRepository = require('../repositories/order.repository');
const productRepository = require('../repositories/product.repository');
const userRepository = require('../repositories/user.repository');
const auditLogService = require('../services/auditLog.service');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination.util');
const { ROLES, ORDER_STATUS } = require('../utils/constants');

const STATUS_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED, ORDER_STATUS.PAYMENT_FAILED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.COMPLETED],
};

const EDITABLE_STATUSES = [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING];
const STOCK_RESTORING_STATUSES = [ORDER_STATUS.CANCELLED, ORDER_STATUS.PAYMENT_FAILED];

function resolveUnitPrice(product) {
  return product.discountPrice !== undefined && product.discountPrice !== null ? product.discountPrice : product.price;
}

async function buildOrderItems(items) {
  const reserved = [];

  try {
    const orderItems = [];
    for (const { productId, quantity } of items) {
      const product = await productRepository.findById(productId);
      if (!product) {
        throw new AppError(`Product not found: ${productId}`, 404, 'NOT_FOUND');
      }
      if (product.status !== 'ACTIVE') {
        throw new AppError(`Product is not available: ${product.name}`, 422, 'VALIDATION_ERROR');
      }

      const updated = await productRepository.reserveStock(productId, quantity);
      if (!updated) {
        throw new AppError(`Insufficient stock for ${product.name}`, 409, 'CONFLICT');
      }
      reserved.push({ productId, quantity });

      const unitPrice = resolveUnitPrice(product);
      orderItems.push({
        product: product._id,
        productName: product.name,
        unitPrice,
        quantity,
        subtotal: unitPrice * quantity,
      });
    }
    return orderItems;
  } catch (err) {
    for (const item of reserved) {
      await productRepository.restoreStock(item.productId, item.quantity);
    }
    throw err;
  }
}

async function createOrder(customer, data) {
  const { items, shippingInfo } = data;

  const orderItems = await buildOrderItems(items);
  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const now = new Date();

  let order;
  try {
    order = await orderRepository.create({
      customer: customer._id,
      items: orderItems,
      shippingInfo: {
        name: shippingInfo.name,
        phone: shippingInfo.phone,
        address: shippingInfo.address,
      },
      subtotal,
      total: subtotal,
      status: ORDER_STATUS.PENDING,
      statusHistory: [
        {
          status: ORDER_STATUS.PENDING,
          changedBy: customer._id,
          reason: 'Order placed',
          changedAt: now,
        },
      ],
    });
  } catch (err) {
    for (const item of orderItems) {
      await productRepository.restoreStock(item.product, item.quantity);
    }
    throw err;
  }

  return orderRepository.findById(order._id);
}

async function listOrders(caller, query) {
  if (caller.role === ROLES.HR) {
    throw new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN');
  }

  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (caller.role === ROLES.CUSTOMER) {
    filter.customer = caller._id;
  } else {
    if (query.status) {
      filter.status = query.status;
    }
    if (query.customer) {
      filter.customer = query.customer;
    }
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      const matchingCustomerIds = await userRepository.findIdsByEmailMatch(regex);
      filter.$or = [{ 'shippingInfo.name': regex }, { 'shippingInfo.phone': regex }, { customer: { $in: matchingCustomerIds } }];
    }
  }

  const [items, totalItems] = await Promise.all([
    orderRepository.paginate(filter, { skip, limit }),
    orderRepository.countByFilter(filter),
  ]);

  return { items, pagination: buildPaginationMeta({ page, limit, totalItems }) };
}

async function getOrder(caller, orderId) {
  if (caller.role === ROLES.HR) {
    throw new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN');
  }

  const order = await orderRepository.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  if (caller.role === ROLES.CUSTOMER && order.customer._id.toString() !== caller._id.toString()) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  return order;
}

async function changeStatus(caller, orderId, status, reason) {
  const order = await orderRepository.findByIdRaw(orderId);
  if (!order) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  const allowedNextStatuses = STATUS_TRANSITIONS[order.status] || [];
  if (!allowedNextStatuses.includes(status)) {
    throw new AppError('Invalid status transition', 409, 'CONFLICT');
  }

  const isStockRestoring = STOCK_RESTORING_STATUSES.includes(status);
  if (isStockRestoring && (!reason || !reason.trim())) {
    throw new AppError('A reason is required for this status change', 422, 'VALIDATION_ERROR');
  }

  const previousStatus = order.status;

  if (isStockRestoring) {
    for (const item of order.items) {
      await productRepository.restoreStock(item.product, item.quantity);
    }
    if (status === ORDER_STATUS.CANCELLED) {
      order.cancelReason = reason;
      order.cancelledAt = new Date();
    }
  }

  order.status = status;
  order.statusHistory.push({
    status,
    changedBy: caller._id,
    reason,
    changedAt: new Date(),
  });
  await order.save();

  await auditLogService.record({
    user: caller._id,
    action: 'ORDER_STATUS_CHANGED',
    entity: 'Order',
    entityId: order._id,
    reason,
    oldValue: { status: previousStatus },
    newValue: { status },
  });

  return orderRepository.findById(order._id);
}

async function cancelOrder(customer, orderId, reason) {
  const order = await orderRepository.findByIdRaw(orderId);
  if (!order) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  if (order.customer.toString() !== customer._id.toString()) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  if (order.status !== ORDER_STATUS.PENDING) {
    throw new AppError('Order can no longer be cancelled', 409, 'CONFLICT');
  }

  const finalReason = reason && reason.trim() ? reason.trim() : 'Cancelled by customer';

  for (const item of order.items) {
    await productRepository.restoreStock(item.product, item.quantity);
  }

  order.status = ORDER_STATUS.CANCELLED;
  order.cancelReason = finalReason;
  order.cancelledAt = new Date();
  order.statusHistory.push({
    status: ORDER_STATUS.CANCELLED,
    changedBy: customer._id,
    reason: finalReason,
    changedAt: new Date(),
  });
  await order.save();

  await auditLogService.record({
    user: customer._id,
    action: 'ORDER_CANCELLED',
    entity: 'Order',
    entityId: order._id,
    reason: finalReason,
    oldValue: { status: ORDER_STATUS.PENDING },
    newValue: { status: ORDER_STATUS.CANCELLED },
  });

  return orderRepository.findById(order._id);
}

async function editOrder(caller, orderId, data) {
  const { items, reason } = data;

  if (!reason || !reason.trim()) {
    throw new AppError('A reason is required to edit an order', 422, 'VALIDATION_ERROR');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('At least one item is required', 422, 'VALIDATION_ERROR');
  }

  const order = await orderRepository.findByIdRaw(orderId);
  if (!order) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }
  if (!EDITABLE_STATUSES.includes(order.status)) {
    throw new AppError('Order can no longer be edited', 409, 'CONFLICT');
  }

  const oldItemsSnapshot = order.items.map((item) => ({
    product: item.product.toString(),
    productName: item.productName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    subtotal: item.subtotal,
  }));
  const oldQtyByProduct = new Map(oldItemsSnapshot.map((item) => [item.product, item.quantity]));
  const newProductIds = new Set(items.map((item) => item.productId.toString()));

  const appliedChanges = [];

  async function rollback() {
    for (const change of appliedChanges) {
      await productRepository.restoreStock(change.productId, -change.appliedChange);
    }
  }

  let newOrderItems;
  let oldSubtotal;
  let subtotal;
  let trimmedReason;

  try {
    newOrderItems = [];

    for (const { productId, quantity } of items) {
      if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
        throw new AppError('Quantity must be at least 1', 422, 'VALIDATION_ERROR');
      }

      const product = await productRepository.findById(productId);
      if (!product) {
        throw new AppError(`Product not found: ${productId}`, 404, 'NOT_FOUND');
      }
      if (product.status !== 'ACTIVE') {
        throw new AppError(`Product is not available: ${product.name}`, 422, 'VALIDATION_ERROR');
      }

      const oldQty = oldQtyByProduct.get(productId.toString()) || 0;
      const delta = Number(quantity) - oldQty;

      if (delta > 0) {
        const updated = await productRepository.reserveStock(productId, delta);
        if (!updated) {
          throw new AppError(`Insufficient stock for ${product.name}`, 409, 'CONFLICT');
        }
        appliedChanges.push({ productId, appliedChange: -delta });
      } else if (delta < 0) {
        await productRepository.restoreStock(productId, -delta);
        appliedChanges.push({ productId, appliedChange: -delta });
      }

      const unitPrice = resolveUnitPrice(product);
      newOrderItems.push({
        product: product._id,
        productName: product.name,
        unitPrice,
        quantity: Number(quantity),
        subtotal: unitPrice * Number(quantity),
      });
    }

    for (const oldItem of oldItemsSnapshot) {
      if (!newProductIds.has(oldItem.product)) {
        await productRepository.restoreStock(oldItem.product, oldItem.quantity);
        appliedChanges.push({ productId: oldItem.product, appliedChange: oldItem.quantity });
      }
    }

    oldSubtotal = order.subtotal;
    subtotal = newOrderItems.reduce((sum, item) => sum + item.subtotal, 0);
    trimmedReason = reason.trim();

    order.editHistory.push({
      changedBy: caller._id,
      reason: trimmedReason,
      changes: { before: oldItemsSnapshot, after: newOrderItems },
      createdAt: new Date(),
    });
    order.items = newOrderItems;
    order.subtotal = subtotal;
    order.total = subtotal;

    await order.save();
  } catch (err) {
    await rollback();
    throw err;
  }

  await auditLogService.record({
    user: caller._id,
    action: 'ORDER_ITEMS_EDITED',
    entity: 'Order',
    entityId: order._id,
    reason: trimmedReason,
    oldValue: { items: oldItemsSnapshot, subtotal: oldSubtotal },
    newValue: { items: newOrderItems, subtotal },
  });

  return orderRepository.findById(order._id);
}

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  changeStatus,
  cancelOrder,
  editOrder,
};
