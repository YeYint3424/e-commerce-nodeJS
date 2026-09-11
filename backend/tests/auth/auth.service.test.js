const authService = require('../../services/auth.service');

describe('auth.service createDefaultAdmin singleton rule', () => {
  it('creates the first default admin successfully', async () => {
    const admin = await authService.createDefaultAdmin({
      name: 'First Admin',
      email: 'first-admin@example.com',
      password: 'adminpass123',
    });

    expect(admin.role).toBe('DEFAULT_ADMIN');
    expect(admin.password).toBeUndefined();
  });

  it('rejects creating a second default admin with 409', async () => {
    await authService.createDefaultAdmin({
      name: 'First Admin',
      email: 'first-admin@example.com',
      password: 'adminpass123',
    });

    await expect(
      authService.createDefaultAdmin({
        name: 'Second Admin',
        email: 'second-admin@example.com',
        password: 'adminpass123',
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});
