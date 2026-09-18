const request = require('supertest');
const createApp = require('../../app');
const Notification = require('../../models/Notification');
const Product = require('../../models/Product');
const { createUserAndToken, createCategory, createPaymentOption, tinyPngBuffer } = require('../helpers/testUtils');

describe('Notifications module', () => {
  const app = createApp();

  describe('access control', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/notifications', () => {
    it('returns only the customer own notifications', async () => {
      const { user: customer, token } = await createUserAndToken({ role: 'CUSTOMER' });
      const { user: otherCustomer } = await createUserAndToken({ role: 'CUSTOMER' });

      await Notification.create({
        recipientUser: customer._id,
        type: 'ORDER_STATUS_CHANGED',
        title: 'Mine',
        message: 'For me',
      });
      await Notification.create({
        recipientUser: otherCustomer._id,
        type: 'ORDER_STATUS_CHANGED',
        title: 'Not mine',
        message: 'For someone else',
      });
      await Notification.create({
        recipientRole: 'STAFF_ADMIN',
        type: 'ORDER_CREATED',
        title: 'Staff broadcast',
        message: 'For staff',
      });

      const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notifications.length).toBe(1);
      expect(res.body.data.notifications[0].title).toBe('Mine');
      expect(res.body.pagination).toMatchObject({ page: 1, limit: 10, totalItems: 1 });
    });

    it('returns personal notifications plus STAFF_ADMIN broadcasts for an ADMIN caller', async () => {
      const { user: admin, token } = await createUserAndToken({ role: 'ADMIN' });

      await Notification.create({
        recipientUser: admin._id,
        type: 'ORDER_STATUS_CHANGED',
        title: 'Personal',
        message: 'Just for this admin',
      });
      await Notification.create({
        recipientRole: 'STAFF_ADMIN',
        type: 'ORDER_CREATED',
        title: 'Broadcast',
        message: 'For all staff/admin',
      });
      await Notification.create({
        recipientUser: (await createUserAndToken({ role: 'CUSTOMER' })).user._id,
        type: 'ORDER_STATUS_CHANGED',
        title: 'Customer only',
        message: 'Not visible to admin',
      });

      const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const titles = res.body.data.notifications.map((n) => n.title).sort();
      expect(titles).toEqual(['Broadcast', 'Personal']);
    });

    it('does not show STAFF_ADMIN broadcasts to an HR caller', async () => {
      const { user: hr, token } = await createUserAndToken({ role: 'HR' });

      await Notification.create({
        recipientUser: hr._id,
        type: 'ORDER_STATUS_CHANGED',
        title: 'HR personal',
        message: 'Just for HR',
      });
      await Notification.create({
        recipientRole: 'STAFF_ADMIN',
        type: 'ORDER_CREATED',
        title: 'Broadcast',
        message: 'For staff/admin only',
      });

      const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notifications.length).toBe(1);
      expect(res.body.data.notifications[0].title).toBe('HR personal');
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('counts only unread notifications visible to the caller', async () => {
      const { user: customer, token } = await createUserAndToken({ role: 'CUSTOMER' });

      await Notification.create({ recipientUser: customer._id, type: 'X', title: 'A', message: 'A', isRead: false });
      await Notification.create({ recipientUser: customer._id, type: 'X', title: 'B', message: 'B', isRead: true });

      const res = await request(app).get('/api/notifications/unread-count').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.unreadCount).toBe(1);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('marks the caller own notification as read', async () => {
      const { user: customer, token } = await createUserAndToken({ role: 'CUSTOMER' });
      const notification = await Notification.create({
        recipientUser: customer._id,
        type: 'X',
        title: 'A',
        message: 'A',
      });

      const res = await request(app)
        .patch(`/api/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notification.isRead).toBe(true);
    });

    it('returns 404 when marking a notification that belongs to another customer', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const { user: otherCustomer } = await createUserAndToken({ role: 'CUSTOMER' });
      const notification = await Notification.create({
        recipientUser: otherCustomer._id,
        type: 'X',
        title: 'A',
        message: 'A',
      });

      const res = await request(app)
        .patch(`/api/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('allows a STAFF caller to mark a STAFF_ADMIN broadcast notification as read', async () => {
      const { token } = await createUserAndToken({ role: 'STAFF' });
      const notification = await Notification.create({
        recipientRole: 'STAFF_ADMIN',
        type: 'ORDER_CREATED',
        title: 'Broadcast',
        message: 'For staff',
      });

      const res = await request(app)
        .patch(`/api/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notification.isRead).toBe(true);
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    it('marks every visible notification as read', async () => {
      const { user: customer, token } = await createUserAndToken({ role: 'CUSTOMER' });
      await Notification.create({ recipientUser: customer._id, type: 'X', title: 'A', message: 'A' });
      await Notification.create({ recipientUser: customer._id, type: 'X', title: 'B', message: 'B' });

      const res = await request(app).patch('/api/notifications/read-all').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);

      const countRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`);
      expect(countRes.body.data.unreadCount).toBe(0);
    });
  });

  describe('event triggers', () => {
    async function setupCatalog(adminToken) {
      const category = await createCategory();
      const product = await Product.create({ name: 'Widget', category: category._id, price: 50, stock: 10 });
      return { category, product };
    }

    it('notifies STAFF_ADMIN (not HR) when a customer places an order', async () => {
      const { token: adminToken } = await createUserAndToken({ role: 'ADMIN' });
      const { token: hrToken } = await createUserAndToken({ role: 'HR' });
      const { token: customerToken, user: customer } = await createUserAndToken({ role: 'CUSTOMER' });
      const { product } = await setupCatalog(adminToken);

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId: product._id.toString(), quantity: 1 }],
          shippingInfo: { name: customer.name, phone: '0912345678', address: '123 Test St' },
        });
      expect(res.status).toBe(201);

      const adminNotifs = await request(app).get('/api/notifications').set('Authorization', `Bearer ${adminToken}`);
      expect(adminNotifs.body.data.notifications.some((n) => n.type === 'ORDER_CREATED')).toBe(true);

      const hrNotifs = await request(app).get('/api/notifications').set('Authorization', `Bearer ${hrToken}`);
      expect(hrNotifs.body.data.notifications.some((n) => n.type === 'ORDER_CREATED')).toBe(false);
    });

    it('notifies the customer when their order is confirmed', async () => {
      const { token: adminToken } = await createUserAndToken({ role: 'ADMIN' });
      const { token: customerToken, user: customer } = await createUserAndToken({ role: 'CUSTOMER' });
      const { product } = await setupCatalog(adminToken);

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId: product._id.toString(), quantity: 1 }],
          shippingInfo: { name: customer.name, phone: '0912345678', address: '123 Test St' },
        });
      const orderId = orderRes.body.data.order._id;

      const confirmRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' });
      expect(confirmRes.status).toBe(200);

      const customerNotifs = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(
        customerNotifs.body.data.notifications.some((n) => n.type === 'ORDER_STATUS_CHANGED')
      ).toBe(true);
    });

    it('notifies STAFF_ADMIN when a customer cancels their own order', async () => {
      const { token: adminToken } = await createUserAndToken({ role: 'ADMIN' });
      const { token: customerToken, user: customer } = await createUserAndToken({ role: 'CUSTOMER' });
      const { product } = await setupCatalog(adminToken);

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId: product._id.toString(), quantity: 1 }],
          shippingInfo: { name: customer.name, phone: '0912345678', address: '123 Test St' },
        });
      const orderId = orderRes.body.data.order._id;

      const cancelRes = await request(app)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Changed my mind' });
      expect(cancelRes.status).toBe(200);

      const adminNotifs = await request(app).get('/api/notifications').set('Authorization', `Bearer ${adminToken}`);
      expect(adminNotifs.body.data.notifications.some((n) => n.type === 'ORDER_CANCELLED')).toBe(true);
    });

    it('notifies STAFF_ADMIN on proof upload and the customer on verify/reject', async () => {
      const { token: adminToken } = await createUserAndToken({ role: 'ADMIN' });
      const { token: customerToken, user: customer } = await createUserAndToken({ role: 'CUSTOMER' });
      const { product } = await setupCatalog(adminToken);
      const paymentOption = await createPaymentOption({ type: 'QR' });

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId: product._id.toString(), quantity: 1 }],
          shippingInfo: { name: customer.name, phone: '0912345678', address: '123 Test St' },
        });
      const orderId = orderRes.body.data.order._id;

      const paymentRes = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId, paymentOptionId: paymentOption._id.toString() });
      const paymentId = paymentRes.body.data.payment._id;

      const proofRes = await request(app)
        .post(`/api/payments/${paymentId}/proof`)
        .set('Authorization', `Bearer ${customerToken}`)
        .attach('proofImage', tinyPngBuffer(), 'proof.png');
      expect(proofRes.status).toBe(200);

      const adminNotifs = await request(app).get('/api/notifications').set('Authorization', `Bearer ${adminToken}`);
      expect(adminNotifs.body.data.notifications.some((n) => n.type === 'PAYMENT_PROOF_UPLOADED')).toBe(true);

      const verifyRes = await request(app)
        .patch(`/api/payments/${paymentId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(verifyRes.status).toBe(200);

      const customerNotifs = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(customerNotifs.body.data.notifications.some((n) => n.type === 'PAYMENT_VERIFIED')).toBe(true);
    });

    it('notifies the customer when their payment is rejected', async () => {
      const { token: adminToken } = await createUserAndToken({ role: 'ADMIN' });
      const { token: customerToken, user: customer } = await createUserAndToken({ role: 'CUSTOMER' });
      const { product } = await setupCatalog(adminToken);
      const paymentOption = await createPaymentOption({ type: 'QR' });

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId: product._id.toString(), quantity: 1 }],
          shippingInfo: { name: customer.name, phone: '0912345678', address: '123 Test St' },
        });
      const orderId = orderRes.body.data.order._id;

      const paymentRes = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId, paymentOptionId: paymentOption._id.toString() });
      const paymentId = paymentRes.body.data.payment._id;

      await request(app)
        .post(`/api/payments/${paymentId}/proof`)
        .set('Authorization', `Bearer ${customerToken}`)
        .attach('proofImage', tinyPngBuffer(), 'proof.png');

      const rejectRes = await request(app)
        .patch(`/api/payments/${paymentId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Blurry screenshot' });
      expect(rejectRes.status).toBe(200);

      const customerNotifs = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${customerToken}`);
      const types = customerNotifs.body.data.notifications.map((n) => n.type);
      expect(types).toEqual(expect.arrayContaining(['PAYMENT_REJECTED', 'ORDER_STATUS_CHANGED']));
    });
  });
});
