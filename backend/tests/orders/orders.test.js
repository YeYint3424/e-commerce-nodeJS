const request = require('supertest');
const createApp = require('../../app');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const { createUserAndToken, createCategory } = require('../helpers/testUtils');

describe('Orders module', () => {
  const app = createApp();

  let productCounter = 0;

  async function createProductDoc(overrides = {}) {
    productCounter += 1;
    const category = await createCategory();
    return Product.create({
      name: overrides.name || `Widget ${productCounter}`,
      category: category._id,
      price: overrides.price !== undefined ? overrides.price : 20,
      discountPrice: overrides.discountPrice,
      stock: overrides.stock !== undefined ? overrides.stock : 10,
      status: overrides.status || 'ACTIVE',
    });
  }

  const shippingInfo = { name: 'John Doe', phone: '0123456789', address: '123 Main St' };

  describe('POST /api/orders', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const product = await createProductDoc();
      const res = await request(app)
        .post('/api/orders')
        .send({ items: [{ productId: product._id.toString(), quantity: 1 }], shippingInfo });
      expect(res.status).toBe(401);
    });

    it('rejects a non-CUSTOMER role with 403', async () => {
      const { token } = await createUserAndToken({ role: 'STAFF' });
      const product = await createProductDoc();

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 1 }], shippingInfo });

      expect(res.status).toBe(403);
    });

    it('creates an order, decrements stock, and ignores a bogus client-sent price', async () => {
      const { user, token } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc({ price: 50, stock: 10 });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ productId: product._id.toString(), quantity: 3, price: 0.01 }],
          shippingInfo,
        });

      expect(res.status).toBe(201);
      const order = res.body.data.order;
      expect(order.status).toBe('PENDING');
      expect(order.items.length).toBe(1);
      expect(order.items[0].unitPrice).toBe(50);
      expect(order.items[0].quantity).toBe(3);
      expect(order.items[0].subtotal).toBe(150);
      expect(order.subtotal).toBe(150);
      expect(order.total).toBe(150);
      expect(order.customer._id || order.customer).toBeTruthy();

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(7);

      const dbOrder = await Order.findById(order._id);
      expect(dbOrder.statusHistory.length).toBe(1);
      expect(dbOrder.statusHistory[0].status).toBe('PENDING');
      void user;
    });

    it('uses discountPrice when present', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc({ price: 50, discountPrice: 35, stock: 10 });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 2 }], shippingInfo });

      expect(res.status).toBe(201);
      expect(res.body.data.order.items[0].unitPrice).toBe(35);
      expect(res.body.data.order.subtotal).toBe(70);
    });

    it('rejects insufficient stock with 409 and leaves stock unchanged', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc({ stock: 1 });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 2 }], shippingInfo });

      expect(res.status).toBe(409);

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(1);
    });

    it('rolls back stock reservations for earlier items when a later item fails', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const productA = await createProductDoc({ stock: 5 });
      const productB = await createProductDoc({ stock: 1 });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [
            { productId: productA._id.toString(), quantity: 2 },
            { productId: productB._id.toString(), quantity: 2 },
          ],
          shippingInfo,
        });

      expect(res.status).toBe(409);

      const updatedA = await Product.findById(productA._id);
      const updatedB = await Product.findById(productB._id);
      expect(updatedA.stock).toBe(5);
      expect(updatedB.stock).toBe(1);
    });

    it('rejects a non-existent product id with 404', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productId: '64b64b64b64b64b64b64b64b', quantity: 1 }], shippingInfo });

      expect(res.status).toBe(404);
    });

    it('rejects invalid payload with 422', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [], shippingInfo });

      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/orders', () => {
    it('scopes results to the requesting customer only', async () => {
      const { user: customerA, token: tokenA } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: tokenB } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc({ stock: 10 });

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 1 }], shippingInfo });

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 1 }], shippingInfo });

      const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orders.length).toBe(1);
      expect(res.body.data.orders[0].customer._id).toBe(customerA._id.toString());
    });

    it('allows STAFF/ADMIN to see all orders with pagination', async () => {
      const { token: customerToken } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: staffToken } = await createUserAndToken({ role: 'STAFF' });
      const product = await createProductDoc({ stock: 10 });

      for (let i = 0; i < 3; i += 1) {
        await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ items: [{ productId: product._id.toString(), quantity: 1 }], shippingInfo });
      }

      const res = await request(app).get('/api/orders?page=1&limit=2').set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orders.length).toBe(2);
      expect(res.body.pagination.totalItems).toBe(3);
    });

    it('forbids HR from listing orders', async () => {
      const { token } = await createUserAndToken({ role: 'HR' });
      const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('forbids a customer from viewing another customer order', async () => {
      const { token: tokenA } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: tokenB } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc({ stock: 10 });

      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 1 }], shippingInfo });

      const res = await request(app)
        .get(`/api/orders/${createRes.body.data.order._id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect([403, 404]).toContain(res.status);
    });

    it('forbids HR from viewing order detail', async () => {
      const { token: customerToken } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: hrToken } = await createUserAndToken({ role: 'HR' });
      const product = await createProductDoc({ stock: 10 });

      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 1 }], shippingInfo });

      const res = await request(app)
        .get(`/api/orders/${createRes.body.data.order._id}`)
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    it('allows STAFF to transition PENDING -> CONFIRMED and appends statusHistory', async () => {
      const { token: customerToken } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: staffToken } = await createUserAndToken({ role: 'STAFF' });
      const product = await createProductDoc({ stock: 10 });

      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 1 }], shippingInfo });

      const orderId = createRes.body.data.order._id;

      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(200);
      expect(res.body.data.order.status).toBe('CONFIRMED');

      const dbOrder = await Order.findById(orderId);
      expect(dbOrder.statusHistory.length).toBe(2);
      expect(dbOrder.statusHistory[1].status).toBe('CONFIRMED');
    });

    it('rejects a CUSTOMER attempting a status transition with 403', async () => {
      const { token: customerToken } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc({ stock: 10 });

      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 1 }], shippingInfo });

      const res = await request(app)
        .patch(`/api/orders/${createRes.body.data.order._id}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(403);
    });

    it('rejects an invalid status transition with 409', async () => {
      const { token: customerToken } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: staffToken } = await createUserAndToken({ role: 'STAFF' });
      const product = await createProductDoc({ stock: 10 });

      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 1 }], shippingInfo });

      const orderId = createRes.body.data.order._id;

      const skipRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'SHIPPED' });
      expect(skipRes.status).toBe(409);

      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'CONFIRMED' });
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'PROCESSING' });
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'SHIPPED' });
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'DELIVERED' });

      const backwardsRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'PENDING' });
      expect(backwardsRes.status).toBe(409);
    });
  });

  describe('PATCH /api/orders/:id/cancel', () => {
    it('allows the owner to cancel a PENDING order and restores stock', async () => {
      const { token: customerToken } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc({ stock: 10 });

      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 3 }], shippingInfo });

      const afterCreate = await Product.findById(product._id);
      expect(afterCreate.stock).toBe(7);

      const res = await request(app)
        .patch(`/api/orders/${createRes.body.data.order._id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.order.status).toBe('CANCELLED');

      const afterCancel = await Product.findById(product._id);
      expect(afterCancel.stock).toBe(10);
    });

    it('rejects cancelling once the order is CONFIRMED', async () => {
      const { token: customerToken } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: staffToken } = await createUserAndToken({ role: 'STAFF' });
      const product = await createProductDoc({ stock: 10 });

      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 1 }], shippingInfo });

      const orderId = createRes.body.data.order._id;

      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'CONFIRMED' });

      const res = await request(app)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/orders/:id', () => {
    it('rejects an edit without a reason with 422', async () => {
      const { token: customerToken } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: adminToken } = await createUserAndToken({ role: 'ADMIN' });
      const product = await createProductDoc({ stock: 10 });

      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 2 }], shippingInfo });

      const res = await request(app)
        .put(`/api/orders/${createRes.body.data.order._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 3 }] });

      expect(res.status).toBe(422);
    });

    it('adjusts stock for changed quantities and appends editHistory with a valid reason', async () => {
      const { token: customerToken } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: adminToken } = await createUserAndToken({ role: 'ADMIN' });
      const product = await createProductDoc({ stock: 10, price: 20 });

      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 2 }], shippingInfo });

      const orderId = createRes.body.data.order._id;
      const afterCreate = await Product.findById(product._id);
      expect(afterCreate.stock).toBe(8);

      const res = await request(app)
        .put(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 5 }], reason: 'Customer requested more units' });

      expect(res.status).toBe(200);
      expect(res.body.data.order.items[0].quantity).toBe(5);
      expect(res.body.data.order.subtotal).toBe(100);

      const afterEdit = await Product.findById(product._id);
      expect(afterEdit.stock).toBe(5);

      const dbOrder = await Order.findById(orderId);
      expect(dbOrder.editHistory.length).toBe(1);
      expect(dbOrder.editHistory[0].reason).toBe('Customer requested more units');
    });

    it('rejects editing when insufficient stock is available, rolling back partial changes', async () => {
      const { token: customerToken } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: adminToken } = await createUserAndToken({ role: 'ADMIN' });
      const productA = await createProductDoc({ stock: 10, price: 10 });
      const productB = await createProductDoc({ stock: 1, price: 10 });

      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [
            { productId: productA._id.toString(), quantity: 1 },
            { productId: productB._id.toString(), quantity: 1 },
          ],
          shippingInfo,
        });

      const orderId = createRes.body.data.order._id;

      const res = await request(app)
        .put(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            { productId: productA._id.toString(), quantity: 5 },
            { productId: productB._id.toString(), quantity: 3 },
          ],
          reason: 'Attempting overallocation',
        });

      expect(res.status).toBe(409);

      const afterA = await Product.findById(productA._id);
      const afterB = await Product.findById(productB._id);
      expect(afterA.stock).toBe(9);
      expect(afterB.stock).toBe(0);
    });
  });
});
