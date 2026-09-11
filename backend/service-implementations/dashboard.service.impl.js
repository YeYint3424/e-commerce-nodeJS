const dashboardRepository = require('../repositories/dashboard.repository');
const orderRepository = require('../repositories/order.repository');
const { ORDER_STATUS } = require('../utils/constants');

const SALE_STATUSES = [
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.COMPLETED,
];

const LOW_STOCK_THRESHOLD = 5;
const TOP_PRODUCTS_LIMIT = 5;
const RECENT_ORDERS_LIMIT = 10;
const MIN_DAYS = 1;
const MAX_DAYS = 365;
const DEFAULT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function clampDays(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_DAYS;
  }
  return Math.min(Math.max(parsed, MIN_DAYS), MAX_DAYS);
}

function utcMidnight(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function fillSalesByDay(rows, startDate, days) {
  const map = new Map(rows.map((row) => [row._id, row]));
  const result = [];

  for (let i = 0; i < days; i += 1) {
    const day = new Date(startDate.getTime() + i * DAY_MS);
    const key = formatDate(day);
    const row = map.get(key);
    result.push({
      date: key,
      total: row ? row.total : 0,
      orderCount: row ? row.orderCount : 0,
    });
  }

  return result;
}

function fillOrdersByStatus(rows) {
  const map = new Map(rows.map((row) => [row._id, row.count]));
  return Object.values(ORDER_STATUS).map((status) => ({
    status,
    count: map.get(status) || 0,
  }));
}

function toRecentOrder(order) {
  const customer = order.customer && typeof order.customer === 'object' ? order.customer : null;
  const payment = order.paymentId && typeof order.paymentId === 'object' ? order.paymentId : null;

  return {
    orderId: order._id,
    customerName: (customer && customer.name) || order.shippingInfo.name,
    total: order.total,
    status: order.status,
    paymentStatus: payment ? payment.status : null,
    createdAt: order.createdAt,
  };
}

async function getDashboard(query) {
  const days = clampDays(query.days);
  const todayStart = utcMidnight(new Date());
  const windowStart = new Date(todayStart.getTime() - (days - 1) * DAY_MS);
  const windowEnd = new Date(todayStart.getTime() + DAY_MS);

  const [
    orderSummary,
    totalCustomers,
    totalProducts,
    lowStockCount,
    todayOrdersCount,
    salesByDayRows,
    ordersByStatusRows,
    topProducts,
    salesByCategory,
    recentOrdersRaw,
  ] = await Promise.all([
    dashboardRepository.getOrderSummary(SALE_STATUSES),
    dashboardRepository.countCustomers(),
    dashboardRepository.countProducts(),
    dashboardRepository.countLowStockProducts(LOW_STOCK_THRESHOLD),
    dashboardRepository.countOrdersSince(todayStart),
    dashboardRepository.getSalesByDay(SALE_STATUSES, windowStart, windowEnd),
    dashboardRepository.getOrdersByStatus(),
    dashboardRepository.getTopProducts(SALE_STATUSES, TOP_PRODUCTS_LIMIT),
    dashboardRepository.getSalesByCategory(SALE_STATUSES),
    orderRepository.paginate({}, { skip: 0, limit: RECENT_ORDERS_LIMIT, sort: { createdAt: -1 } }),
  ]);

  return {
    summary: {
      totalSales: orderSummary.totalSales,
      totalOrders: orderSummary.totalOrders,
      pendingOrders: orderSummary.pendingOrders,
      completedOrders: orderSummary.completedOrders,
      totalCustomers,
      totalProducts,
      lowStockCount,
      todayOrdersCount,
    },
    salesByDay: fillSalesByDay(salesByDayRows, windowStart, days),
    ordersByStatus: fillOrdersByStatus(ordersByStatusRows),
    topProducts,
    salesByCategory,
    recentOrders: recentOrdersRaw.map(toRecentOrder),
  };
}

module.exports = { getDashboard };
