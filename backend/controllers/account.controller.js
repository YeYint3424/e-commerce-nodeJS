const accountService = require('../services/account.service');
const wrapAsync = require('../utils/wrapAsync');
const { sendSuccess } = require('../utils/response.util');

const createAccount = wrapAsync(async (req, res) => {
  const account = await accountService.createAccount(req.user, req.body);
  return sendSuccess(res, { message: 'Account created', data: { account }, statusCode: 201 });
});

const listAccounts = wrapAsync(async (req, res) => {
  const { items, pagination } = await accountService.listAccounts(req.query);
  return sendSuccess(res, { message: 'Accounts fetched', data: { accounts: items }, pagination });
});

const getAccount = wrapAsync(async (req, res) => {
  const account = await accountService.getAccount(req.params.id);
  return sendSuccess(res, { message: 'Account fetched', data: { account } });
});

const updateAccount = wrapAsync(async (req, res) => {
  const account = await accountService.updateAccount(req.user, req.params.id, req.body);
  return sendSuccess(res, { message: 'Account updated', data: { account } });
});

const changeRole = wrapAsync(async (req, res) => {
  const account = await accountService.changeRole(req.user, req.params.id, req.body.role);
  return sendSuccess(res, { message: 'Account role updated', data: { account } });
});

const changeStatus = wrapAsync(async (req, res) => {
  const account = await accountService.changeStatus(req.user, req.params.id, req.body.status);
  return sendSuccess(res, { message: 'Account status updated', data: { account } });
});

const deleteAccount = wrapAsync(async (req, res) => {
  await accountService.deleteAccount(req.user, req.params.id);
  return sendSuccess(res, { message: 'Account deleted', data: null });
});

module.exports = {
  createAccount,
  listAccounts,
  getAccount,
  updateAccount,
  changeRole,
  changeStatus,
  deleteAccount,
};
