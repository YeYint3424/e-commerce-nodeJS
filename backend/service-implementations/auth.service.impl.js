const userRepository = require('../repositories/user.repository');
const { hashPassword, comparePassword } = require('../utils/password.util');
const { signToken } = require('../utils/jwt.util');
const AppError = require('../utils/AppError');
const { ROLES, ADMIN_PANEL_ROLES } = require('../utils/constants');

function buildToken(user) {
  return signToken({ id: user._id.toString(), role: user.role });
}

async function registerCustomer(data) {
  const { name, email, password, phone, address } = data;

  const emailExists = await userRepository.existsByEmail(email);
  if (emailExists) {
    throw new AppError('Email already registered', 409, 'CONFLICT');
  }

  const hashedPassword = await hashPassword(password);

  const user = await userRepository.createUser({
    name,
    email,
    password: hashedPassword,
    phone,
    address,
    role: ROLES.CUSTOMER,
  });

  const token = buildToken(user);
  const userJson = user.toJSON();

  return { user: userJson, token };
}

async function loginCustomer(email, password) {
  const user = await userRepository.findByEmail(email, { withPassword: true });
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
  }

  if (user.role !== ROLES.CUSTOMER) {
    throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
  }

  if (user.status === 'INACTIVE') {
    throw new AppError('This account has been deactivated', 401, 'UNAUTHORIZED');
  }

  const token = buildToken(user);
  const userJson = user.toJSON();

  return { user: userJson, token };
}

async function loginAdminPanel(email, password) {
  const user = await userRepository.findByEmail(email, { withPassword: true });
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
  }

  if (user.role === ROLES.CUSTOMER) {
    throw new AppError('This login is for staff and administrators only', 403, 'FORBIDDEN');
  }

  if (!ADMIN_PANEL_ROLES.includes(user.role)) {
    throw new AppError('This login is for staff and administrators only', 403, 'FORBIDDEN');
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
  }

  if (user.status === 'INACTIVE') {
    throw new AppError('This account has been deactivated', 401, 'UNAUTHORIZED');
  }

  const token = buildToken(user);
  const userJson = user.toJSON();

  return { user: userJson, token };
}

async function getCurrentUser(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  return user.toJSON();
}

async function createDefaultAdmin({ name, email, password }) {
  const existingCount = await userRepository.countDefaultAdmins();
  if (existingCount > 0) {
    throw new AppError('A default admin already exists', 409, 'CONFLICT');
  }

  const emailExists = await userRepository.existsByEmail(email);
  if (emailExists) {
    throw new AppError('Email already registered', 409, 'CONFLICT');
  }

  const hashedPassword = await hashPassword(password);

  const user = await userRepository.createUser({
    name,
    email,
    password: hashedPassword,
    role: ROLES.DEFAULT_ADMIN,
  });

  return user.toJSON();
}

module.exports = {
  registerCustomer,
  loginCustomer,
  loginAdminPanel,
  getCurrentUser,
  createDefaultAdmin,
};
