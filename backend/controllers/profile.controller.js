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

module.exports = { getProfile, updateProfile };
