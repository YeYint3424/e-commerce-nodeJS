const dashboardService = require('../services/dashboard.service');
const wrapAsync = require('../utils/wrapAsync');
const { sendSuccess } = require('../utils/response.util');

const getDashboard = wrapAsync(async (req, res) => {
  const data = await dashboardService.getDashboard(req.query);
  return sendSuccess(res, { message: 'Dashboard data fetched', data });
});

module.exports = { getDashboard };
