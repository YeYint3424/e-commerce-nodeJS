const request = require('supertest');
const createApp = require('../../app');
const Product = require('../../models/Product');
const { createUserAndToken, createCategory, createPaymentOption } = require('../helpers/testUtils');

describe('Vouchers module', () => {
  const app = createApp();

  let productCounter = 0;

  async function createProductDoc(overrides = {}) {
    productCounter += 1;
    const category = await createCategory();
    return Product.create({
      name: overrides.name || `Widget ${productCounter}`,
      category: category._id,
      price: overrides.price !== undefined ? overrides.price : 20,
      stock: overrides.stock !== undefined ? overrides.stock : 10,
      status: overrides.status || 'ACTIVE',
    });
  }

  const shippingInfo = { name: 'John Doe', phone: '0123456789', address: '123 Main St' };

  async function createOrderFor(token, product, quantity = 1) {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product._id.toString(), quantity }], shippingInfo });
    return res.body.data.order;
  }

  async function confirmOrder(staffToken, orderId) {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'CONFIRMED' });
    return res.body.data.order;
  }

  describe('GET /api/vouchers', () => {
    it('only returns the caller own orders when scoped as a customer', async () => {
      const { token: tokenA } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: tokenB } = await createUserAndToken({ role: 'CUSTOMER' });
      const productA = await createProductDoc();
      const productB = await createProductDoc();

      const orderA = await createOrderFor(tokenA, productA);
      await createOrderFor(tokenB, productB);

      const res = await request(app).get('/api/vouchers').set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.vouchers.length).toBe(1);
      expect(res.body.data.vouchers[0].orderId).toBe(orderA._id);
    });

    it('rejects a STAFF caller with 403', async () => {
      const { token: staffToken } = await createUserAndToken({ role: 'STAFF' });
      const res = await request(app).get('/api/vouchers').set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects an HR caller with 403', async () => {
      const { token: hrToken } = await createUserAndToken({ role: 'HR' });
      const res = await request(app).get('/api/vouchers').set('Authorization', `Bearer ${hrToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/vouchers/:id', () => {
    it('allows a customer to view their own voucher', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc();
      const order = await createOrderFor(token, product);

      const res = await request(app).get(`/api/vouchers/${order._id}`).set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.voucher.orderId).toBe(order._id);
      expect(res.body.data.voucher.voucherId).toBe(`VCH-${order._id.slice(-8).toUpperCase()}`);
    });

    it('forbids a customer from viewing another customer voucher with 404', async () => {
      const { token: tokenA } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: tokenB } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc();
      const order = await createOrderFor(tokenA, product);

      const res = await request(app).get(`/api/vouchers/${order._id}`).set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
    });

    it('allows STAFF and ADMIN to view any voucher', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: staffToken } = await createUserAndToken({ role: 'STAFF' });
      const { token: adminToken } = await createUserAndToken({ role: 'ADMIN' });
      const product = await createProductDoc();
      const order = await createOrderFor(token, product);

      const staffRes = await request(app).get(`/api/vouchers/${order._id}`).set('Authorization', `Bearer ${staffToken}`);
      const adminRes = await request(app).get(`/api/vouchers/${order._id}`).set('Authorization', `Bearer ${adminToken}`);

      expect(staffRes.status).toBe(200);
      expect(adminRes.status).toBe(200);
    });

    it('forbids HR with 403', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: hrToken } = await createUserAndToken({ role: 'HR' });
      const product = await createProductDoc();
      const order = await createOrderFor(token, product);

      const res = await request(app).get(`/api/vouchers/${order._id}`).set('Authorization', `Bearer ${hrToken}`);
      expect(res.status).toBe(403);
    });

    it('reflects the payment method once a payment has been attached', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc();
      const codOption = await createPaymentOption({ type: 'COD' });
      const order = await createOrderFor(token, product);

      const beforeRes = await request(app).get(`/api/vouchers/${order._id}`).set('Authorization', `Bearer ${token}`);
      expect(beforeRes.body.data.voucher.paymentMethod).toBeNull();

      await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order._id, paymentOptionId: codOption._id.toString() });

      const afterRes = await request(app).get(`/api/vouchers/${order._id}`).set('Authorization', `Bearer ${token}`);
      expect(afterRes.status).toBe(200);
      expect(afterRes.body.data.voucher.paymentMethod).toEqual({
        name: codOption.name,
        type: 'COD',
        status: 'PENDING',
      });
    });

    it('includes editHistory reasons in changeNotes after an admin edits the order', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: adminToken } = await createUserAndToken({ role: 'ADMIN' });
      const product = await createProductDoc({ stock: 10 });
      const order = await createOrderFor(token, product, 2);

      const editRes = await request(app)
        .put(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ productId: product._id.toString(), quantity: 3 }], reason: 'Customer requested more units' });
      expect(editRes.status).toBe(200);

      const res = await request(app).get(`/api/vouchers/${order._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.voucher.changeNotes.length).toBe(1);
      expect(res.body.data.voucher.changeNotes[0].reason).toBe('Customer requested more units');
    });
  });

  describe('GET /api/vouchers/:id/pdf', () => {
    it('returns a valid PDF for a CONFIRMED order', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: staffToken } = await createUserAndToken({ role: 'STAFF' });
      const product = await createProductDoc();
      const order = await createOrderFor(token, product);
      await confirmOrder(staffToken, order._id);

      const res = await request(app)
        .get(`/api/vouchers/${order._id}/pdf`)
        .set('Authorization', `Bearer ${token}`)
        .buffer(true)
        .parse((response, callback) => {
          response.setEncoding('binary');
          let data = '';
          response.on('data', (chunk) => {
            data += chunk;
          });
          response.on('end', () => {
            callback(null, Buffer.from(data, 'binary'));
          });
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain(`voucher-${order._id}.pdf`);
      expect(res.body.slice(0, 5).toString()).toBe('%PDF-');
    });

    it('rejects with 409 for a PENDING order', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc();
      const order = await createOrderFor(token, product);

      const res = await request(app).get(`/api/vouchers/${order._id}/pdf`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(409);
    });

    it('rejects with 409 for a CANCELLED order', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc();
      const order = await createOrderFor(token, product);

      await request(app)
        .patch(`/api/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Changed my mind' });

      const res = await request(app).get(`/api/vouchers/${order._id}/pdf`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(409);
    });

    it('forbids a customer from downloading another customer voucher PDF with 404', async () => {
      const { token: tokenA } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: tokenB } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: staffToken } = await createUserAndToken({ role: 'STAFF' });
      const product = await createProductDoc();
      const order = await createOrderFor(tokenA, product);
      await confirmOrder(staffToken, order._id);

      const res = await request(app).get(`/api/vouchers/${order._id}/pdf`).set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
    });

    it('forbids HR with 403', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: hrToken } = await createUserAndToken({ role: 'HR' });
      const { token: staffToken } = await createUserAndToken({ role: 'STAFF' });
      const product = await createProductDoc();
      const order = await createOrderFor(token, product);
      await confirmOrder(staffToken, order._id);

      const res = await request(app).get(`/api/vouchers/${order._id}/pdf`).set('Authorization', `Bearer ${hrToken}`);
      expect(res.status).toBe(403);
    });
  });
});
