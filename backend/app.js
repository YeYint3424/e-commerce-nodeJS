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
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.tailwindcss.com', 'https://unpkg.com', 'https://cdn.jsdelivr.net'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://unpkg.com', 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://picsum.photos', 'https://fastly.picsum.photos'],
          connectSrc: ["'self'", 'https://unpkg.com', 'https://cdn.jsdelivr.net', 'https://cdn.tailwindcss.com'],
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
    '/order-review': 'order-review.html',
    '/payment': 'payment.html',
    '/order-success': 'order-success.html',
    '/order-failed': 'order-failed.html',
    '/voucher-list': 'voucher-list.html',
    '/voucher/:id': 'voucher.html',
    '/login': 'login.html',
    '/register': 'register.html',
    '/profile': 'profile.html',
  };

  Object.entries(customerPages).forEach(([route, file]) => {
    app.get(route, (req, res) => {
      res.sendFile(path.join(publicDir, 'customer', file));
    });
  });

  const adminPages = {
    '/ecommerce-admin/login': 'login.html',
    '/ecommerce-admin/dashboard': 'dashboard.html',
    '/ecommerce-admin/accounts': 'accounts.html',
    '/ecommerce-admin/categories': 'categories.html',
    '/ecommerce-admin/products': 'products.html',
    '/ecommerce-admin/orders': 'orders.html',
    '/ecommerce-admin/payment-options': 'payment-options.html',
    '/ecommerce-admin/sales-history': 'sales-history.html',
    '/ecommerce-admin/profile': 'profile.html',
  };

  Object.entries(adminPages).forEach(([route, file]) => {
    app.get(route, (req, res) => {
      res.sendFile(path.join(publicDir, 'admin', file));
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
