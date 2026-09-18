const request = require('supertest');
const createApp = require('../../app');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const { createUserAndToken, createCategory } = require('../helpers/testUtils');

const DAY_MS = 24 * 60 * 60 * 1000;

describe('Dashboard module', () => {
  const app = createApp();

  function dateKey(date) {
    return date.toISOString().slice(0, 10);
  }

  async function createProductDoc(category, overrides = {}) {
    return Product.create({
      name: overrides.name,
      category: category._id,
      price: overrides.price,
      stock: overrides.stock !== undefined ? overrides.stock : 10,
      status: overrides.status || 'ACTIVE',
    });
  }

  function buildItem(product, quantity) {
    return {
      product: product._id,
      productName: product.name,
      unitPrice: product.price,
      quantity,
      subtotal: product.price * quantity,
    };
  }

  async function createOrderDoc({ customer, items, status, createdAt }) {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    return Order.create({
      customer: customer._id,
      items,
      shippingInfo: { name: 'Jane Doe', phone: '0999999999', address: '1 Test Street' },
      subtotal,
      total: subtotal,
      status,
      statusHistory: [{ status, changedAt: createdAt }],
      createdAt,
      updatedAt: createdAt,
    });
  }

  async function seedDataset() {
    const now = Date.now();
    const { user: customer } = await createUserAndToken({ role: 'CUSTOMER' });

    const electronics = await createCategory({ name: 'Electronics' });
    const books = await createCategory({ name: 'Books' });

    const phone = await createProductDoc(electronics, { name: 'Phone', price: 100, stock: 20 });
    const laptop = await createProductDoc(electronics, { name: 'Laptop', price: 500, stock: 20 });
    const novel = await createProductDoc(books, { name: 'Novel', price: 20, stock: 3 });

    const orderPending = await createOrderDoc({
      customer,
      items: [buildItem(phone, 1)],
      status: 'PENDING',
      createdAt: new Date(now + 2 * 60 * 1000),
    });

    const orderCancelled = await createOrderDoc({
      customer,
      items: [buildItem(laptop, 1)],
      status: 'CANCELLED',
      createdAt: new Date(now + 1 * 60 * 1000),
    });

    const orderConfirmed = await createOrderDoc({
      customer,
      items: [buildItem(phone, 2)],
      status: 'CONFIRMED',
      createdAt: new Date(now),
    });

    const orderProcessing = await createOrderDoc({
      customer,
      items: [buildItem(novel, 1)],
      status: 'PROCESSING',
      createdAt: new Date(now - 1 * DAY_MS),
    });

    const orderCompleted = await createOrderDoc({
      customer,
      items: [buildItem(laptop, 1), buildItem(novel, 5)],
      status: 'COMPLETED',
      createdAt: new Date(now - 2 * DAY_MS),
    });

    return {
      customer,
      phone,
      laptop,
      novel,
      orderPending,
      orderCancelled,
      orderConfirmed,
      orderProcessing,
      orderCompleted,
      now,
    };
  }

  describe('access control', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/dashboard');
      expect(res.status).toBe(401);
    });

    it('rejects a CUSTOMER with 403', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('rejects an HR user with 403', async () => {
      const { token } = await createUserAndToken({ role: 'HR' });
      const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('allows STAFF with 200', async () => {
      const { token } = await createUserAndToken({ role: 'STAFF' });
      const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('allows ADMIN with 200', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('summary', () => {
    it('only counts sale-eligible statuses toward totalSales and reports exact pending/completed counts', async () => {
      await seedDataset();
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const { summary } = res.body.data;

      expect(summary.totalSales).toBe(820);
      expect(summary.totalOrders).toBe(5);
      expect(summary.pendingOrders).toBe(1);
      expect(summary.completedOrders).toBe(1);
      expect(summary.totalCustomers).toBe(1);
      expect(summary.totalProducts).toBe(3);
      expect(summary.lowStockCount).toBe(1);
    });
  });

  describe('ordersByStatus', () => {
    it('is limited to the dashboard breakdown statuses, including zero-count ones', async () => {
      await seedDataset();
      const { token } = await createUserAndToken({ role: 'STAFF' });

      const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${token}`);

      const byStatus = {};
      res.body.data.ordersByStatus.forEach((row) => {
        byStatus[row.status] = row.count;
      });

      expect(Object.keys(byStatus).sort()).toEqual(
        ['PENDING', 'CONFIRMED', 'CANCELLED', 'PAYMENT_FAILED'].sort()
      );
      expect(byStatus.PENDING).toBe(1);
      expect(byStatus.CANCELLED).toBe(1);
      expect(byStatus.CONFIRMED).toBe(1);
      expect(byStatus.PAYMENT_FAILED).toBe(0);
    });
  });

  describe('salesByDay', () => {
    it('has exactly `days` entries with no gaps and correct per-day totals', async () => {
      const { now } = await seedDataset();
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      const res = await request(app)
        .get('/api/dashboard?days=7')
        .set('Authorization', `Bearer ${token}`);

      const { salesByDay } = res.body.data;
      expect(salesByDay.length).toBe(7);

      const dates = salesByDay.map((entry) => entry.date);
      const sortedDates = [...dates].sort();
      expect(dates).toEqual(sortedDates);

      const byDate = {};
      salesByDay.forEach((entry) => {
        byDate[entry.date] = entry;
      });

      const todayKey = dateKey(new Date(now));
      const oneDayAgoKey = dateKey(new Date(now - 1 * DAY_MS));
      const twoDaysAgoKey = dateKey(new Date(now - 2 * DAY_MS));

      expect(byDate[todayKey].total).toBe(200);
      expect(byDate[todayKey].orderCount).toBe(1);
      expect(byDate[oneDayAgoKey].total).toBe(20);
      expect(byDate[oneDayAgoKey].orderCount).toBe(1);
      expect(byDate[twoDaysAgoKey].total).toBe(600);
      expect(byDate[twoDaysAgoKey].orderCount).toBe(1);

      const totalAcrossDays = salesByDay.reduce((sum, entry) => sum + entry.total, 0);
      expect(totalAcrossDays).toBe(820);
    });

    it('clamps an out-of-range days value into the sane range', async () => {
      await seedDataset();
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      const res = await request(app)
        .get('/api/dashboard?days=9999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.salesByDay.length).toBe(365);
    });
  });

  describe('topProducts', () => {
    it('orders products by totalRevenue descending, computed only from sale-eligible orders', async () => {
      const { phone, laptop, novel } = await seedDataset();
      const { token } = await createUserAndToken({ role: 'STAFF' });

      const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${token}`);

      const { topProducts } = res.body.data;
      expect(topProducts.length).toBe(3);

      expect(topProducts[0].productId).toBe(laptop._id.toString());
      expect(topProducts[0].totalRevenue).toBe(500);
      expect(topProducts[0].totalQuantity).toBe(1);

      expect(topProducts[1].productId).toBe(phone._id.toString());
      expect(topProducts[1].totalRevenue).toBe(200);
      expect(topProducts[1].totalQuantity).toBe(2);

      expect(topProducts[2].productId).toBe(novel._id.toString());
      expect(topProducts[2].totalRevenue).toBe(120);
      expect(topProducts[2].totalQuantity).toBe(6);
    });
  });

  describe('salesByCategory', () => {
    it('attributes revenue to each product current category', async () => {
      await seedDataset();
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${token}`);

      const { salesByCategory } = res.body.data;
      const byName = {};
      salesByCategory.forEach((row) => {
        byName[row.categoryName] = row.totalRevenue;
      });

      expect(byName.Electronics).toBe(700);
      expect(byName.Books).toBe(120);
      expect(salesByCategory[0].categoryName).toBe('Electronics');
    });
  });

  describe('recentOrders', () => {
    it('is capped at 10 and ordered newest-first', async () => {
      const { user: customer } = await createUserAndToken({ role: 'CUSTOMER' });
      const category = await createCategory({ name: 'Misc' });
      const product = await createProductDoc(category, { name: 'Gadget', price: 10, stock: 100 });

      const now = Date.now();
      const createdOrders = [];
      for (let i = 0; i < 12; i += 1) {
        const order = await createOrderDoc({
          customer,
          items: [buildItem(product, 1)],
          status: 'PENDING',
          createdAt: new Date(now + i * 1000),
        });
        createdOrders.push(order);
      }

      const { token } = await createUserAndToken({ role: 'STAFF' });
      const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${token}`);

      const { recentOrders } = res.body.data;
      expect(recentOrders.length).toBe(10);

      const expectedNewestFirst = [...createdOrders].reverse().slice(0, 10).map((o) => o._id.toString());
      expect(recentOrders.map((o) => o.orderId)).toEqual(expectedNewestFirst);

      expect(recentOrders[0]).toHaveProperty('customerName');
      expect(recentOrders[0]).toHaveProperty('total');
      expect(recentOrders[0]).toHaveProperty('status');
      expect(recentOrders[0]).toHaveProperty('paymentStatus', null);
      expect(recentOrders[0]).toHaveProperty('createdAt');
    });
  });
});
