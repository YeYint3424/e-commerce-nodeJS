const User = require('../models/User');
const { ROLES } = require('../utils/constants');

async function createUser(data) {
  const user = await User.create(data);
  return user;
}

async function findByEmail(email, { withPassword = false } = {}) {
  const query = User.findOne({ email: email.toLowerCase().trim() });
  if (withPassword) {
    query.select('+password');
  }
  return query.exec();
}

async function findById(id) {
  return User.findById(id).exec();
}

async function findDefaultAdmin() {
  return User.findOne({ role: ROLES.DEFAULT_ADMIN }).exec();
}

async function countDefaultAdmins() {
  return User.countDocuments({ role: ROLES.DEFAULT_ADMIN });
}

async function updateById(id, data) {
  return User.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
}

async function existsByEmail(email) {
  const count = await User.countDocuments({ email: email.toLowerCase().trim() });
  return count > 0;
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  findDefaultAdmin,
  countDefaultAdmins,
  updateById,
  existsByEmail,
};
