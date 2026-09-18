const userRepository = require('../repositories/user.repository');
const { hashPassword, comparePassword } = require('../utils/password.util');
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

async function changePassword(userId, currentPassword, newPassword) {
  const user = await userRepository.findByIdWithPassword(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const isMatch = await comparePassword(currentPassword, user.password);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');
  }

  user.password = await hashPassword(newPassword);
  await user.save();

  return { success: true };
}

module.exports = { updateProfile, changePassword };
