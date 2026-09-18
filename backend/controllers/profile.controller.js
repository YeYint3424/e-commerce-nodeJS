const profileService = require('../services/profile.service');
const wrapAsync = require('../utils/wrapAsync');
const { sendSuccess } = require('../utils/response.util');

const getProfile = wrapAsync(async (req, res) => {
  return sendSuccess(res, { message: 'Profile fetched', data: { user: req.user } });
});

const updateProfile = wrapAsync(async (req, res) => {
  const user = await profileService.updateProfile(req.user._id, req.body);
  return sendSuccess(res, { message: 'Profile updated', data: { user } });
});

const changePassword = wrapAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await profileService.changePassword(req.user._id, currentPassword, newPassword);
  return sendSuccess(res, { message: 'Password changed successfully', data: null });
});

module.exports = { getProfile, updateProfile, changePassword };
