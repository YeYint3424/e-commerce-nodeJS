const request = require('supertest');
const createApp = require('../../app');
const PaymentOption = require('../../models/PaymentOption');
const { createUserAndToken, tinyPngBuffer } = require('../helpers/testUtils');

describe('Payment Options module', () => {
  const app = createApp();

  describe('GET /api/payment-options', () => {
    it('is public and does not require a token', async () => {
      await PaymentOption.create({ name: 'Cash on Delivery', type: 'COD' });

      const res = await request(app).get('/api/payment-options');

      expect(res.status).toBe(200);
      expect(res.body.data.paymentOptions.length).toBe(1);
    });

    it('paginates and filters by status', async () => {
      for (let i = 0; i < 5; i += 1) {
        await PaymentOption.create({ name: `Option ${i}`, type: 'COD', status: 'ACTIVE' });
      }
      await PaymentOption.create({ name: 'Disabled Option', type: 'QR', status: 'INACTIVE' });

      const res = await request(app).get('/api/payment-options?page=1&limit=3');
      expect(res.status).toBe(200);
      expect(res.body.pagination.totalItems).toBe(6);
      expect(res.body.data.paymentOptions.length).toBe(3);

      const res2 = await request(app).get('/api/payment-options?status=INACTIVE');
      expect(res2.status).toBe(200);
      expect(res2.body.data.paymentOptions.length).toBe(1);
    });
  });

  describe('GET /api/payment-options/:id', () => {
    it('returns 404 for a missing option', async () => {
      const res = await request(app).get('/api/payment-options/64b64b64b64b64b64b64b64b');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/payment-options', () => {
    it('rejects requests without a token with 401', async () => {
      const res = await request(app).post('/api/payment-options').send({ name: 'QR Pay', type: 'QR' });
      expect(res.status).toBe(401);
    });

    it('rejects a non-admin role with 403', async () => {
      const { token } = await createUserAndToken({ role: 'STAFF' });

      const res = await request(app)
        .post('/api/payment-options')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'QR Pay', type: 'QR' });

      expect(res.status).toBe(403);
    });

    it('rejects invalid payload with 422', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      const res = await request(app)
        .post('/api/payment-options')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bad Type', type: 'BITCOIN' });

      expect(res.status).toBe(422);
    });

    it('creates a payment option with plain JSON and no file', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      const res = await request(app)
        .post('/api/payment-options')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Cash on Delivery', type: 'COD', description: 'Pay when it arrives' });

      expect(res.status).toBe(201);
      expect(res.body.data.paymentOption.type).toBe('COD');
      expect(res.body.data.paymentOption.qrImage).toBeUndefined();
    });

    it('creates a payment option with an uploaded QR image', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      const res = await request(app)
        .post('/api/payment-options')
        .set('Authorization', `Bearer ${token}`)
        .field('name', 'KBZPay QR')
        .field('type', 'QR')
        .field('accountInfo', 'Account: 12345')
        .attach('qrImage', tinyPngBuffer(), 'qr.png');

      expect(res.status).toBe(201);
      expect(res.body.data.paymentOption.type).toBe('QR');
      expect(res.body.data.paymentOption.qrImage).toMatch(/^\/uploads\/payment-options\//);
    });
  });

  describe('PUT /api/payment-options/:id', () => {
    it('updates fields', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const option = await PaymentOption.create({ name: 'Old Name', type: 'COD' });

      const res = await request(app)
        .put(`/api/payment-options/${option._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.paymentOption.name).toBe('New Name');
    });
  });

  describe('PATCH /api/payment-options/:id/status', () => {
    it('disables a payment option', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const option = await PaymentOption.create({ name: 'To Disable', type: 'COD' });

      const res = await request(app)
        .patch(`/api/payment-options/${option._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.paymentOption.status).toBe('INACTIVE');
    });
  });

  describe('DELETE /api/payment-options/:id', () => {
    it('deletes a payment option', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const option = await PaymentOption.create({ name: 'To Delete', type: 'COD' });

      const res = await request(app)
        .delete(`/api/payment-options/${option._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const found = await PaymentOption.findById(option._id);
      expect(found).toBeNull();
    });
  });
});
