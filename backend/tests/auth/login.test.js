const request = require('supertest');
const createApp = require('../../app');
const User = require('../../models/User');
const { hashPassword } = require('../../utils/password.util');

describe('POST /api/auth/customer/login', () => {
  const app = createApp();

  beforeEach(async () => {
    const hashed = await hashPassword('password123');
    await User.create({
      name: 'Existing Customer',
      email: 'customer@example.com',
      password: hashed,
      role: 'CUSTOMER',
    });
  });

  it('logs in a customer with correct credentials', async () => {
    const res = await request(app).post('/api/auth/customer/login').send({
      email: 'customer@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('customer@example.com');
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app).post('/api/auth/customer/login').send({
      email: 'customer@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects non-existent email with 401', async () => {
    const res = await request(app).post('/api/auth/customer/login').send({
      email: 'nope@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/admin/login', () => {
  const app = createApp();

  beforeEach(async () => {
    const hashed = await hashPassword('adminpass123');
    await User.create({
      name: 'Default Admin',
      email: 'admin@example.com',
      password: hashed,
      role: 'DEFAULT_ADMIN',
    });

    const customerHashed = await hashPassword('password123');
    await User.create({
      name: 'Customer User',
      email: 'customer2@example.com',
      password: customerHashed,
      role: 'CUSTOMER',
    });
  });

  it('logs in an admin-panel user with correct credentials', async () => {
    const res = await request(app).post('/api/auth/admin/login').send({
      email: 'admin@example.com',
      password: 'adminpass123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.role).toBe('DEFAULT_ADMIN');
  });

  it('rejects a customer account attempting admin-panel login with 403', async () => {
    const res = await request(app).post('/api/auth/admin/login').send({
      email: 'customer2@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
