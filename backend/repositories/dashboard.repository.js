const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Category = require('../models/Category');
const { ROLES, ORDER_STATUS } = require('../utils/constants');

async function getOrderSummary(saleStatuses) {
  const [result] = await Order.aggregate([
    {
      $facet: {
        totalSales: [
          { $match: { status: { $in: saleStatuses } } },
          { $group: { _id: null, sum: { $sum: '$total' } } },
        ],
        totalOrders: [{ $count: 'count' }],
        pendingOrders: [{ $match: { status: ORDER_STATUS.PENDING } }, { $count: 'count' }],
        completedOrders: [{ $match: { status: ORDER_STATUS.COMPLETED } }, { $count: 'count' }],
      },
    },
  ]);

  return {
    totalSales: (result.totalSales[0] && result.totalSales[0].sum) || 0,
    totalOrders: (result.totalOrders[0] && result.totalOrders[0].count) || 0,
    pendingOrders: (result.pendingOrders[0] && result.pendingOrders[0].count) || 0,
    completedOrders: (result.completedOrders[0] && result.completedOrders[0].count) || 0,
  };
}

async function countCustomers() {
  return User.countDocuments({ role: ROLES.CUSTOMER });
}

async function countProducts() {
  return Product.countDocuments({});
}

async function countLowStockProducts(threshold) {
  return Product.countDocuments({ stock: { $lte: threshold }, status: 'ACTIVE' });
}

async function countOrdersSince(date) {
  return Order.countDocuments({ createdAt: { $gte: date } });
}

async function getSalesByDay(saleStatuses, startDate, endDate) {
  return Order.aggregate([
    {
      $match: {
        status: { $in: saleStatuses },
        createdAt: { $gte: startDate, $lt: endDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
        total: { $sum: '$total' },
        orderCount: { $sum: 1 },
      },
    },
  ]);
}

async function getOrdersByStatus() {
  return Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
}

async function getTopProducts(saleStatuses, limit) {
  return Order.aggregate([
    { $match: { status: { $in: saleStatuses } } },
    { $sort: { createdAt: -1 } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        productName: { $first: '$items.productName' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: limit },
    { $project: { _id: 0, productId: '$_id', productName: 1, totalQuantity: 1, totalRevenue: 1 } },
  ]);
}

async function getSalesByCategory(saleStatuses) {
  return Order.aggregate([
    { $match: { status: { $in: saleStatuses } } },
    { $unwind: '$items' },
    {
      $lookup: {
        from: Product.collection.name,
        localField: 'items.product',
        foreignField: '_id',
        as: 'productDoc',
      },
    },
    { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: Category.collection.name,
        localField: 'productDoc.category',
        foreignField: '_id',
        as: 'categoryDoc',
      },
    },
    { $unwind: { path: '$categoryDoc', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$categoryDoc._id',
        categoryName: { $first: { $ifNull: ['$categoryDoc.name', 'Uncategorized'] } },
        totalRevenue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $project: { _id: 0, categoryId: '$_id', categoryName: 1, totalRevenue: 1 } },
  ]);
}

module.exports = {
  getOrderSummary,
  countCustomers,
  countProducts,
  countLowStockProducts,
  countOrdersSince,
  getSalesByDay,
  getOrdersByStatus,
  getTopProducts,
  getSalesByCategory,
};
