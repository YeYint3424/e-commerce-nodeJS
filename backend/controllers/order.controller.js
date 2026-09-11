const orderService = require('../services/order.service');
const wrapAsync = require('../utils/wrapAsync');
const { sendSuccess } = require('../utils/response.util');

const createOrder = wrapAsync(async (req, res) => {
  const order = await orderService.createOrder(req.user, req.body);
  return sendSuccess(res, { message: 'Order created', data: { order }, statusCode: 201 });
});

const listOrders = wrapAsync(async (req, res) => {
  const { items, pagination } = await orderService.listOrders(req.user, req.query);
  return sendSuccess(res, { message: 'Orders fetched', data: { orders: items }, pagination });
});

const getOrder = wrapAsync(async (req, res) => {
  const order = await orderService.getOrder(req.user, req.params.id);
  return sendSuccess(res, { message: 'Order fetched', data: { order } });
});

const changeStatus = wrapAsync(async (req, res) => {
  const order = await orderService.changeStatus(req.user, req.params.id, req.body.status, req.body.reason);
  return sendSuccess(res, { message: 'Order status updated', data: { order } });
});

const cancelOrder = wrapAsync(async (req, res) => {
  const order = await orderService.cancelOrder(req.user, req.params.id, req.body.reason);
  return sendSuccess(res, { message: 'Order cancelled', data: { order } });
});

const editOrder = wrapAsync(async (req, res) => {
  const order = await orderService.editOrder(req.user, req.params.id, req.body);
  return sendSuccess(res, { message: 'Order updated', data: { order } });
});

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  changeStatus,
  cancelOrder,
  editOrder,
};
