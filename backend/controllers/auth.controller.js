const authService = require('../services/auth.service');
const wrapAsync = require('../utils/wrapAsync');
const { sendSuccess } = require('../utils/response.util');

const registerCustomer = wrapAsync(async (req, res) => {
  const { name, email, password, phone, address } = req.body;
  const result = await authService.registerCustomer({ name, email, password, phone, address });

  return sendSuccess(res, {
    message: 'Registration successful',
    data: result,
    statusCode: 201,
  });
});

const loginCustomer = wrapAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginCustomer(email, password);

  return sendSuccess(res, {
    message: 'Login successful',
    data: result,
  });
});

const loginAdminPanel = wrapAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginAdminPanel(email, password);

  return sendSuccess(res, {
    message: 'Login successful',
    data: result,
  });
});

const getMe = wrapAsync(async (req, res) => {
  return sendSuccess(res, {
    message: 'Current user fetched',
    data: { user: req.user },
  });
});

module.exports = {
  registerCustomer,
  loginCustomer,
  loginAdminPanel,
  getMe,
};
