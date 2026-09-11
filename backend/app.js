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

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.tailwindcss.com', 'https://unpkg.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://unpkg.com', 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
        },
      },
    })
  );
  app.use(cors({ origin: appConfig.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (!appConfig.isTest) {
    app.use(morgan(appConfig.isProduction ? 'combined' : 'dev'));
  }

  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  const publicDir = path.join(__dirname, '../public');
  app.use(express.static(publicDir, { index: false }));

  const customerPages = {
    '/': 'index.html',
    '/products': 'products.html',
    '/products/:id': 'product-detail.html',
    '/cart': 'cart.html',
    '/login': 'login.html',
    '/register': 'register.html',
  };

  Object.entries(customerPages).forEach(([route, file]) => {
    app.get(route, (req, res) => {
      res.sendFile(path.join(publicDir, 'customer', file));
    });
  });

  app.get('/api/health', (req, res) => {
    sendSuccess(res, { message: 'API is healthy', data: { uptime: process.uptime() } });
  });

  app.use('/api', require('./routes'));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
