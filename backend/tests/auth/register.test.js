const request = require('supertest');
const createApp = require('../../app');
const User = require('../../models/User');

describe('POST /api/auth/customer/register', () => {
  const app = createApp();

  it('registers a customer and returns a token, forcing role to CUSTOMER', async () => {
    const res = await request(app)
      .post('/api/auth/customer/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        role: 'ADMIN',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.role).toBe('CUSTOMER');
    expect(res.body.data.user.email).toBe('jane@example.com');
    expect(res.body.data.user.password).toBeUndefined();

    const stored = await User.findOne({ email: 'jane@example.com' });
    expect(stored.role).toBe('CUSTOMER');
  });

  it('rejects duplicate email with 409', async () => {
    await request(app).post('/api/auth/customer/register').send({
      name: 'Jane Doe',
      email: 'dup@example.com',
      password: 'password123',
    });

    const res = await request(app).post('/api/auth/customer/register').send({
      name: 'Jane Doe Two',
      email: 'dup@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects invalid email format with 422', async () => {
    const res = await request(app).post('/api/auth/customer/register').send({
      name: 'Jane Doe',
      email: 'not-an-email',
      password: 'password123',
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('rejects weak/short password with 422', async () => {
    const res = await request(app).post('/api/auth/customer/register').send({
      name: 'Jane Doe',
      email: 'shortpass@example.com',
      password: '123',
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});
