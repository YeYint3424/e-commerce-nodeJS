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

async function paginate(filter, { skip, limit, sort = { createdAt: -1 } } = {}) {
  return User.find(filter).sort(sort).skip(skip).limit(limit).exec();
}

async function countByFilter(filter) {
  return User.countDocuments(filter);
}

async function deleteById(id) {
  return User.findByIdAndDelete(id).exec();
}

async function findIdsByEmailMatch(regex) {
  const users = await User.find({ email: regex }).select('_id').lean();
  return users.map((u) => u._id);
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  findDefaultAdmin,
  countDefaultAdmins,
  updateById,
  existsByEmail,
  paginate,
  countByFilter,
  deleteById,
  findIdsByEmailMatch,
};
