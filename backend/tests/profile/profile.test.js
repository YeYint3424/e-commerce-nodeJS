const request = require('supertest');
const createApp = require('../../app');
const { createUserAndToken } = require('../helpers/testUtils');

describe('Profile module', () => {
  const app = createApp();

  describe('GET /api/profile', () => {
    it('rejects requests without a token with 401', async () => {
      const res = await request(app).get('/api/profile');
      expect(res.status).toBe(401);
    });

    it('returns the current user profile', async () => {
      const { token, user } = await createUserAndToken({ role: 'CUSTOMER' });

      const res = await request(app).get('/api/profile').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(user.email);
      expect(res.body.data.user.password).toBeUndefined();
    });
  });

  describe('PUT /api/profile', () => {
    it('updates own name/phone/address/avatar', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });

      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Me', phone: '999', address: '123 Street', avatar: '/uploads/avatar.png' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.name).toBe('Updated Me');
      expect(res.body.data.user.phone).toBe('999');
      expect(res.body.data.user.address).toBe('123 Street');
      expect(res.body.data.user.avatar).toBe('/uploads/avatar.png');
    });

    it('does not allow changing email, password, role, or status through this route', async () => {
      const { token, user } = await createUserAndToken({ role: 'CUSTOMER' });

      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'changed@example.com', password: 'newpassword123', role: 'ADMIN', status: 'INACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(user.email);
      expect(res.body.data.user.role).toBe('CUSTOMER');
      expect(res.body.data.user.status).toBe('ACTIVE');
    });
  });
});
