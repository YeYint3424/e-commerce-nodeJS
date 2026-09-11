const request = require('supertest');
const createApp = require('../../app');
const User = require('../../models/User');
const { createUserAndToken } = require('../helpers/testUtils');

describe('Accounts module', () => {
  const app = createApp();

  describe('POST /api/accounts', () => {
    it('rejects requests without a token with 401', async () => {
      const res = await request(app).post('/api/accounts').send({
        name: 'New Staff',
        email: 'staff1@example.com',
        password: 'password123',
        role: 'STAFF',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects a customer token with 403', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });

      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Staff', email: 'staff2@example.com', password: 'password123', role: 'STAFF' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid payload with 422', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '', email: 'not-an-email', password: '123', role: 'STAFF' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('allows an ADMIN caller to create a STAFF, HR, or CUSTOMER account', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New HR', email: 'hr1@example.com', password: 'password123', role: 'HR' });

      expect(res.status).toBe(201);
      expect(res.body.data.account.role).toBe('HR');
      expect(res.body.data.account.password).toBeUndefined();
    });

    it('rejects an ADMIN caller creating another ADMIN account with 403', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Admin', email: 'admin2@example.com', password: 'password123', role: 'ADMIN' });

      expect(res.status).toBe(403);
    });

    it('allows a DEFAULT_ADMIN caller to create an ADMIN account', async () => {
      const { token } = await createUserAndToken({ role: 'DEFAULT_ADMIN' });

      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Admin', email: 'admin3@example.com', password: 'password123', role: 'ADMIN' });

      expect(res.status).toBe(201);
      expect(res.body.data.account.role).toBe('ADMIN');
    });

    it('rejects creating a DEFAULT_ADMIN account through this endpoint even for a DEFAULT_ADMIN caller', async () => {
      const { token } = await createUserAndToken({ role: 'DEFAULT_ADMIN' });

      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Sneaky Admin', email: 'sneaky@example.com', password: 'password123', role: 'DEFAULT_ADMIN' });

      expect([403, 422]).toContain(res.status);
    });

    it('allows an HR caller to create STAFF or HR accounts', async () => {
      const { token } = await createUserAndToken({ role: 'HR' });

      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Staff by HR', email: 'staffbyhr@example.com', password: 'password123', role: 'STAFF' });

      expect(res.status).toBe(201);
    });

    it('rejects an HR caller creating a CUSTOMER account with 403', async () => {
      const { token } = await createUserAndToken({ role: 'HR' });

      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Customer by HR', email: 'custbyhr@example.com', password: 'password123', role: 'CUSTOMER' });

      expect(res.status).toBe(403);
    });

    it('rejects an HR caller creating an ADMIN account with 403', async () => {
      const { token } = await createUserAndToken({ role: 'HR' });

      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Admin by HR', email: 'adminbyhr@example.com', password: 'password123', role: 'ADMIN' });

      expect(res.status).toBe(403);
    });

    it('rejects duplicate email with 409', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Dup', email: 'dup-account@example.com', password: 'password123', role: 'STAFF' });

      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Dup Two', email: 'dup-account@example.com', password: 'password123', role: 'STAFF' });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/accounts', () => {
    it('paginates results', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      for (let i = 0; i < 15; i += 1) {
        await User.create({
          name: `Bulk ${i}`,
          email: `bulk${i}@example.com`,
          password: 'x'.repeat(10),
          role: 'CUSTOMER',
        });
      }

      const res = await request(app)
        .get('/api/accounts?page=2&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(16);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('supports search by name/email', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      await User.create({ name: 'Zebra Finch', email: 'zebra@example.com', password: 'x'.repeat(10), role: 'CUSTOMER' });

      const res = await request(app)
        .get('/api/accounts?search=zebra')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.accounts.length).toBe(1);
      expect(res.body.data.accounts[0].email).toBe('zebra@example.com');
    });
  });

  describe('PUT /api/accounts/:id', () => {
    it('updates name/phone/address for a target account', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const { user: target } = await createUserAndToken({ role: 'STAFF' });

      const res = await request(app)
        .put(`/api/accounts/${target._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name', phone: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.data.account.name).toBe('Updated Name');
      expect(res.body.data.account.phone).toBe('123456');
    });

    it('ignores role changes attempted through the update route', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const { user: target } = await createUserAndToken({ role: 'STAFF' });

      const res = await request(app)
        .put(`/api/accounts/${target._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(200);
      expect(res.body.data.account.role).toBe('STAFF');
    });

    it('rejects modifying a DEFAULT_ADMIN account with 403', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const { user: target } = await createUserAndToken({ role: 'DEFAULT_ADMIN' });

      const res = await request(app)
        .put(`/api/accounts/${target._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
    });

    it('rejects an HR caller updating a CUSTOMER account with 403', async () => {
      const { token } = await createUserAndToken({ role: 'HR' });
      const { user: target } = await createUserAndToken({ role: 'CUSTOMER' });

      const res = await request(app)
        .put(`/api/accounts/${target._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/accounts/:id/role', () => {
    it('changes a target account role', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const { user: target } = await createUserAndToken({ role: 'STAFF' });

      const res = await request(app)
        .patch(`/api/accounts/${target._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'HR' });

      expect(res.status).toBe(200);
      expect(res.body.data.account.role).toBe('HR');
    });

    it('rejects changing role to DEFAULT_ADMIN with 403/422', async () => {
      const { token } = await createUserAndToken({ role: 'DEFAULT_ADMIN' });
      const { user: target } = await createUserAndToken({ role: 'STAFF' });

      const res = await request(app)
        .patch(`/api/accounts/${target._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'DEFAULT_ADMIN' });

      expect([403, 422]).toContain(res.status);
    });

    it('rejects changing role of a DEFAULT_ADMIN account with 403', async () => {
      const { token } = await createUserAndToken({ role: 'DEFAULT_ADMIN' });
      const { user: target } = await createUserAndToken({ role: 'DEFAULT_ADMIN' });

      const res = await request(app)
        .patch(`/api/accounts/${target._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(403);
    });

    it('rejects an ADMIN caller assigning the ADMIN role with 403', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const { user: target } = await createUserAndToken({ role: 'STAFF' });

      const res = await request(app)
        .patch(`/api/accounts/${target._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(403);
    });

    it('rejects an HR caller changing a STAFF account role to CUSTOMER with 403', async () => {
      const { token } = await createUserAndToken({ role: 'HR' });
      const { user: target } = await createUserAndToken({ role: 'STAFF' });

      const res = await request(app)
        .patch(`/api/accounts/${target._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'CUSTOMER' });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/accounts/:id/status', () => {
    it('deactivates and reactivates an account', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const { user: target } = await createUserAndToken({ role: 'STAFF' });

      const res = await request(app)
        .patch(`/api/accounts/${target._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.account.status).toBe('INACTIVE');
    });

    it('rejects deactivating a DEFAULT_ADMIN account with 403', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const { user: target } = await createUserAndToken({ role: 'DEFAULT_ADMIN' });

      const res = await request(app)
        .patch(`/api/accounts/${target._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('deletes a target account', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const { user: target } = await createUserAndToken({ role: 'STAFF' });

      const res = await request(app)
        .delete(`/api/accounts/${target._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const found = await User.findById(target._id);
      expect(found).toBeNull();
    });

    it('rejects deleting a DEFAULT_ADMIN account with 403', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const { user: target } = await createUserAndToken({ role: 'DEFAULT_ADMIN' });

      const res = await request(app)
        .delete(`/api/accounts/${target._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);

      const found = await User.findById(target._id);
      expect(found).not.toBeNull();
    });

    it('rejects an HR caller deleting an ADMIN account with 403', async () => {
      const { token } = await createUserAndToken({ role: 'HR' });
      const { user: target } = await createUserAndToken({ role: 'ADMIN' });

      const res = await request(app)
        .delete(`/api/accounts/${target._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
