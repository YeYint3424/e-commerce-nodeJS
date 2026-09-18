const userRepository = require('../repositories/user.repository');
const { hashPassword } = require('../utils/password.util');
const AppError = require('../utils/AppError');
const { ROLES, resolveAccountSpace } = require('../utils/constants');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination.util');

const HR_MANAGEABLE_ROLES = [ROLES.STAFF, ROLES.HR];

function assertMutableTarget(caller, target) {
  if (target.role === ROLES.DEFAULT_ADMIN) {
    throw new AppError('This account cannot be modified', 403, 'FORBIDDEN');
  }
  if (caller.role === ROLES.HR && !HR_MANAGEABLE_ROLES.includes(target.role)) {
    throw new AppError('HR can only manage STAFF or HR accounts', 403, 'FORBIDDEN');
  }
}

async function createAccount(caller, data) {
  const { name, email, password, role, phone, address } = data;

  if (role === ROLES.DEFAULT_ADMIN) {
    throw new AppError('Cannot create a default admin account through this endpoint', 403, 'FORBIDDEN');
  }

  if (role === ROLES.ADMIN && caller.role !== ROLES.DEFAULT_ADMIN) {
    throw new AppError('Only the default admin can create ADMIN accounts', 403, 'FORBIDDEN');
  }

  if (caller.role === ROLES.HR && !HR_MANAGEABLE_ROLES.includes(role)) {
    throw new AppError('HR can only create STAFF or HR accounts', 403, 'FORBIDDEN');
  }

  const accountSpace = resolveAccountSpace(role);
  const emailExists = await userRepository.existsByEmailInSpace(email, accountSpace);
  if (emailExists) {
    throw new AppError('Email already registered', 409, 'CONFLICT');
  }

  const hashedPassword = await hashPassword(password);

  const user = await userRepository.createUser({
    name,
    email,
    password: hashedPassword,
    role,
    phone,
    address,
    accountSpace,
  });

  return user.toJSON();
}

async function listAccounts(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.role) {
    filter.role = query.role;
  }
  if (query.status) {
    filter.status = query.status;
  }
  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [items, totalItems] = await Promise.all([
    userRepository.paginate(filter, { skip, limit }),
    userRepository.countByFilter(filter),
  ]);

  return {
    items: items.map((u) => u.toJSON()),
    pagination: buildPaginationMeta({ page, limit, totalItems }),
  };
}

async function getAccount(id) {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new AppError('Account not found', 404, 'NOT_FOUND');
  }
  return user.toJSON();
}

async function updateAccount(caller, id, data) {
  const target = await userRepository.findById(id);
  if (!target) {
    throw new AppError('Account not found', 404, 'NOT_FOUND');
  }

  assertMutableTarget(caller, target);

  if (data.email && data.email.toLowerCase().trim() !== target.email) {
    const accountSpace = target.accountSpace || resolveAccountSpace(target.role);
    const emailExists = await userRepository.existsByEmailInSpace(data.email, accountSpace, target._id);
    if (emailExists) {
      throw new AppError('Email already registered', 409, 'CONFLICT');
    }
  }

  const updates = {};
  ['name', 'phone', 'address', 'email', 'status'].forEach((field) => {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  });

  if (data.password) {
    updates.password = await hashPassword(data.password);
  }

  const updated = await userRepository.updateById(id, updates);
  return updated.toJSON();
}

async function changeRole(caller, id, newRole) {
  const target = await userRepository.findById(id);
  if (!target) {
    throw new AppError('Account not found', 404, 'NOT_FOUND');
  }

  if (target.role === ROLES.DEFAULT_ADMIN || newRole === ROLES.DEFAULT_ADMIN) {
    throw new AppError('Cannot change a role to or from DEFAULT_ADMIN', 403, 'FORBIDDEN');
  }

  if (newRole === ROLES.ADMIN && caller.role !== ROLES.DEFAULT_ADMIN) {
    throw new AppError('Only the default admin can assign the ADMIN role', 403, 'FORBIDDEN');
  }

  if (caller.role === ROLES.HR) {
    if (!HR_MANAGEABLE_ROLES.includes(target.role) || !HR_MANAGEABLE_ROLES.includes(newRole)) {
      throw new AppError('HR can only manage STAFF or HR accounts', 403, 'FORBIDDEN');
    }
  }

  const newAccountSpace = resolveAccountSpace(newRole);
  const currentAccountSpace = target.accountSpace || resolveAccountSpace(target.role);
  if (newAccountSpace !== currentAccountSpace) {
    const emailExists = await userRepository.existsByEmailInSpace(target.email, newAccountSpace, target._id);
    if (emailExists) {
      throw new AppError('Another account with this email already exists in the destination space', 409, 'CONFLICT');
    }
  }

  const updated = await userRepository.updateById(id, { role: newRole, accountSpace: newAccountSpace });
  return updated.toJSON();
}

async function changeStatus(caller, id, status) {
  const target = await userRepository.findById(id);
  if (!target) {
    throw new AppError('Account not found', 404, 'NOT_FOUND');
  }

  assertMutableTarget(caller, target);

  const updated = await userRepository.updateById(id, { status });
  return updated.toJSON();
}

async function deleteAccount(caller, id) {
  const target = await userRepository.findById(id);
  if (!target) {
    throw new AppError('Account not found', 404, 'NOT_FOUND');
  }

  assertMutableTarget(caller, target);

  await userRepository.deleteById(id);
}

module.exports = {
  createAccount,
  listAccounts,
  getAccount,
  updateAccount,
  changeRole,
  changeStatus,
  deleteAccount,
};
