const User = require('../../models/User');
const Category = require('../../models/Category');
const PaymentOption = require('../../models/PaymentOption');
const { hashPassword } = require('../../utils/password.util');
const { signToken } = require('../../utils/jwt.util');

let counter = 0;

async function createUserAndToken(overrides = {}) {
  counter += 1;
  const hashed = await hashPassword('password123');
  const user = await User.create({
    name: overrides.name || `Test User ${counter}`,
    email: overrides.email || `test-user-${counter}@example.com`,
    password: hashed,
    role: overrides.role || 'CUSTOMER',
    status: overrides.status || 'ACTIVE',
    phone: overrides.phone,
    address: overrides.address,
  });

  const token = signToken({ id: user._id.toString(), role: user.role });
  return { user, token };
}

async function createCategory(overrides = {}) {
  counter += 1;
  return Category.create({
    name: overrides.name || `Category ${counter}`,
    description: overrides.description,
    status: overrides.status || 'ACTIVE',
  });
}

async function createPaymentOption(overrides = {}) {
  counter += 1;
  return PaymentOption.create({
    name: overrides.name || `Payment Option ${counter}`,
    type: overrides.type || 'COD',
    description: overrides.description,
    accountInfo: overrides.accountInfo,
    status: overrides.status || 'ACTIVE',
  });
}

function tinyPngBuffer() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  );
}

module.exports = {
  createUserAndToken,
  createCategory,
  createPaymentOption,
  tinyPngBuffer,
};
