const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const appConfig = require('./configs/app.config');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');
const { sendSuccess } = require('./utils/response.util');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: appConfig.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (!appConfig.isTest) {
    app.use(morgan(appConfig.isProduction ? 'combined' : 'dev'));
  }

  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.get('/api/health', (req, res) => {
    sendSuccess(res, { message: 'API is healthy', data: { uptime: process.uptime() } });
  });

  app.use('/api', require('./routes'));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
