const request = require('supertest');
const createApp = require('../../app');
const User = require('../../models/User');
const { hashPassword } = require('../../utils/password.util');
const { signToken } = require('../../utils/jwt.util');

describe('GET /api/auth/me', () => {
  const app = createApp();

  it('rejects a request without a token with 401', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a malformed/garbage token with 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer garbage.token.value');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns the current user for a valid token', async () => {
    const hashed = await hashPassword('password123');
    const user = await User.create({
      name: 'Me User',
      email: 'me@example.com',
      password: hashed,
      role: 'CUSTOMER',
    });

    const token = signToken({ id: user._id.toString(), role: user.role });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('me@example.com');
    expect(res.body.data.user.password).toBeUndefined();
  });
});
