const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/AppError');

async function updateProfile(userId, data) {
  const updates = {};
  ['name', 'phone', 'address', 'avatar'].forEach((field) => {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  });

  const updated = await userRepository.updateById(userId, updates);
  if (!updated) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  return updated.toJSON();
}

module.exports = { updateProfile };
