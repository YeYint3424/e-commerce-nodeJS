const rateLimit = require('express-rate-limit');
const appConfig = require('../configs/app.config');

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => appConfig.isTest,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    error: { code: 'TOO_MANY_REQUESTS' },
  },
});

module.exports = { authRateLimiter };
