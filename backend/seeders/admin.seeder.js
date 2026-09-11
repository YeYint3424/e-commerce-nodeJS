const authService = require('../services/auth.service');
const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/AppError');

async function seedDefaultAdmin() {
  const name = process.env.DEFAULT_ADMIN_NAME;
  const email = process.env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    // eslint-disable-next-line no-console
    console.log('Skipping default admin seed: DEFAULT_ADMIN_NAME/EMAIL/PASSWORD not fully set in env');
    return;
  }

  const existingCount = await userRepository.countDefaultAdmins();
  if (existingCount > 0) {
    // eslint-disable-next-line no-console
    console.log('Default admin already exists, skipping seed');
    return;
  }

  try {
    await authService.createDefaultAdmin({ name, email, password });
    // eslint-disable-next-line no-console
    console.log(`Default admin created: ${email}`);
  } catch (err) {
    if (err instanceof AppError) {
      // eslint-disable-next-line no-console
      console.log(`Skipping default admin seed: ${err.message}`);
      return;
    }
    throw err;
  }
}

module.exports = { seedDefaultAdmin };
