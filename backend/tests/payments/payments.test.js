const request = require('supertest');
const createApp = require('../../app');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const { createUserAndToken, createCategory, createPaymentOption, tinyPngBuffer } = require('../helpers/testUtils');

describe('Payments module', () => {
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

  describe('POST /api/payments', () => {
    it('creates a payment for a PENDING order and links order.paymentId', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc({ price: 40, stock: 10 });
      const codOption = await createPaymentOption({ type: 'COD' });

      const order = await createOrderFor(token, product, 2);

      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order._id, paymentOptionId: codOption._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.data.payment.amount).toBe(80);
      expect(res.body.data.payment.methodType).toBe('COD');
      expect(res.body.data.requiresProof).toBe(false);

      const dbOrder = await Order.findById(order._id);
      expect(dbOrder.paymentId.toString()).toBe(res.body.data.payment._id);
    });

    it('flags requiresProof true for QR options', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc();
      const qrOption = await createPaymentOption({ type: 'QR' });
      const order = await createOrderFor(token, product);

      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order._id, paymentOptionId: qrOption._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.data.requiresProof).toBe(true);
    });

    it('rejects a second payment for the same order with 409', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc();
      const codOption = await createPaymentOption({ type: 'COD' });
      const order = await createOrderFor(token, product);

      await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order._id, paymentOptionId: codOption._id.toString() });

      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order._id, paymentOptionId: codOption._id.toString() });

      expect(res.status).toBe(409);
    });

    it('rejects a payment for another customer order with 404', async () => {
      const { token: tokenA } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: tokenB } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc();
      const codOption = await createPaymentOption({ type: 'COD' });
      const order = await createOrderFor(tokenA, product);

      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ orderId: order._id, paymentOptionId: codOption._id.toString() });

      expect(res.status).toBe(404);
    });

    it('rejects a nonexistent payment option with 404', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc();
      const order = await createOrderFor(token, product);

      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order._id, paymentOptionId: '64b64b64b64b64b64b64b64b' });

      expect(res.status).toBe(404);
    });

    it('rejects an inactive payment option with 422', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc();
      const inactiveOption = await createPaymentOption({ type: 'COD', status: 'INACTIVE' });
      const order = await createOrderFor(token, product);

      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order._id, paymentOptionId: inactiveOption._id.toString() });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/payments/:id/proof', () => {
    it('rejects uploading proof to a COD payment with 422', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc();
      const codOption = await createPaymentOption({ type: 'COD' });
      const order = await createOrderFor(token, product);

      const createRes = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order._id, paymentOptionId: codOption._id.toString() });

      const res = await request(app)
        .post(`/api/payments/${createRes.body.data.payment._id}/proof`)
        .set('Authorization', `Bearer ${token}`)
        .attach('proofImage', tinyPngBuffer(), 'proof.png');

      expect(res.status).toBe(422);
    });

    it('uploads proof successfully for a QR payment', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc();
      const qrOption = await createPaymentOption({ type: 'QR' });
      const order = await createOrderFor(token, product);

      const createRes = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order._id, paymentOptionId: qrOption._id.toString() });

      const paymentId = createRes.body.data.payment._id;

      const res = await request(app)
        .post(`/api/payments/${paymentId}/proof`)
        .set('Authorization', `Bearer ${token}`)
        .attach('proofImage', tinyPngBuffer(), 'proof.png');

      expect(res.status).toBe(200);
      expect(res.body.data.payment.proofImage).toMatch(/^\/uploads\/payment-proofs\//);
    });
  });

  describe('PATCH /api/payments/:id/verify', () => {
    it('verifies a COD payment immediately', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: staffToken } = await createUserAndToken({ role: 'STAFF' });
      const product = await createProductDoc();
      const codOption = await createPaymentOption({ type: 'COD' });
      const order = await createOrderFor(token, product);

      const createRes = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order._id, paymentOptionId: codOption._id.toString() });

      const res = await request(app)
        .patch(`/api/payments/${createRes.body.data.payment._id}/verify`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.payment.status).toBe('VERIFIED');
    });

    it('rejects verifying a QR payment before proof is uploaded with 409', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: staffToken } = await createUserAndToken({ role: 'STAFF' });
      const product = await createProductDoc();
      const qrOption = await createPaymentOption({ type: 'QR' });
      const order = await createOrderFor(token, product);

      const createRes = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order._id, paymentOptionId: qrOption._id.toString() });

      const res = await request(app)
        .patch(`/api/payments/${createRes.body.data.payment._id}/verify`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(409);
    });

    it('rejects a CUSTOMER attempting to verify with 403', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc();
      const codOption = await createPaymentOption({ type: 'COD' });
      const order = await createOrderFor(token, product);

      const createRes = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order._id, paymentOptionId: codOption._id.toString() });

      const res = await request(app)
        .patch(`/api/payments/${createRes.body.data.payment._id}/verify`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/payments/:id/reject', () => {
    it('requires a reason with 422', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: staffToken } = await createUserAndToken({ role: 'STAFF' });
      const product = await createProductDoc();
      const codOption = await createPaymentOption({ type: 'COD' });
      const order = await createOrderFor(token, product);

      const createRes = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order._id, paymentOptionId: codOption._id.toString() });

      const res = await request(app)
        .patch(`/api/payments/${createRes.body.data.payment._id}/reject`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({});

      expect(res.status).toBe(422);
    });

    it('transitions the order to PAYMENT_FAILED and restores stock', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: staffToken } = await createUserAndToken({ role: 'STAFF' });
      const product = await createProductDoc({ stock: 10, price: 15 });
      const codOption = await createPaymentOption({ type: 'COD' });
      const order = await createOrderFor(token, product, 4);

      const afterOrder = await Product.findById(product._id);
      expect(afterOrder.stock).toBe(6);

      const createRes = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order._id, paymentOptionId: codOption._id.toString() });

      const res = await request(app)
        .patch(`/api/payments/${createRes.body.data.payment._id}/reject`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ reason: 'Could not confirm payment' });

      expect(res.status).toBe(200);
      expect(res.body.data.payment.status).toBe('REJECTED');
      expect(res.body.data.payment.rejectionReason).toBe('Could not confirm payment');

      const dbOrder = await Order.findById(order._id);
      expect(dbOrder.status).toBe('PAYMENT_FAILED');

      const dbProduct = await Product.findById(product._id);
      expect(dbProduct.stock).toBe(10);
    });
  });

  describe('GET /api/payments/:id', () => {
    it('allows the owning customer to view the payment', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc();
      const codOption = await createPaymentOption({ type: 'COD' });
      const order = await createOrderFor(token, product);

      const createRes = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order._id, paymentOptionId: codOption._id.toString() });

      const res = await request(app)
        .get(`/api/payments/${createRes.body.data.payment._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.payment._id).toBe(createRes.body.data.payment._id);
    });

    it('forbids another customer from viewing the payment with 404', async () => {
      const { token: tokenA } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: tokenB } = await createUserAndToken({ role: 'CUSTOMER' });
      const product = await createProductDoc();
      const codOption = await createPaymentOption({ type: 'COD' });
      const order = await createOrderFor(tokenA, product);

      const createRes = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ orderId: order._id, paymentOptionId: codOption._id.toString() });

      const res = await request(app)
        .get(`/api/payments/${createRes.body.data.payment._id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(404);
    });

    it('allows STAFF to view any payment', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const { token: staffToken } = await createUserAndToken({ role: 'STAFF' });
      const product = await createProductDoc();
      const codOption = await createPaymentOption({ type: 'COD' });
      const order = await createOrderFor(token, product);

      const createRes = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order._id, paymentOptionId: codOption._id.toString() });

      const res = await request(app)
        .get(`/api/payments/${createRes.body.data.payment._id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
    });
  });
});
