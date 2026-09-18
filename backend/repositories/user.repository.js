const User = require('../models/User');
const { ROLES, ACCOUNT_SPACES } = require('../utils/constants');

const SPACE_FALLBACK_ROLES = {
  [ACCOUNT_SPACES.CUSTOMER]: [ROLES.CUSTOMER],
  [ACCOUNT_SPACES.STAFF]: [ROLES.STAFF, ROLES.HR, ROLES.ADMIN, ROLES.DEFAULT_ADMIN],
};

function spaceFilter(email, accountSpace) {
  return {
    email: email.toLowerCase().trim(),
    $or: [{ accountSpace }, { accountSpace: { $exists: false }, role: { $in: SPACE_FALLBACK_ROLES[accountSpace] } }],
  };
}

async function createUser(data) {
  const user = await User.create(data);
  return user;
}

async function findByEmailInSpace(email, accountSpace, { withPassword = false } = {}) {
  const query = User.findOne(spaceFilter(email, accountSpace));
  if (withPassword) {
    query.select('+password');
  }
  return query.exec();
}

async function findById(id) {
  return User.findById(id).exec();
}

async function findByIdWithPassword(id) {
  return User.findById(id).select('+password').exec();
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

async function existsByEmailInSpace(email, accountSpace, excludeId) {
  const filter = spaceFilter(email, accountSpace);
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  const count = await User.countDocuments(filter);
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
  findByEmailInSpace,
  findById,
  findByIdWithPassword,
  findDefaultAdmin,
  countDefaultAdmins,
  updateById,
  existsByEmailInSpace,
  paginate,
  countByFilter,
  deleteById,
  findIdsByEmailMatch,
};
