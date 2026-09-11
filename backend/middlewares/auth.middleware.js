const { verifyToken } = require('../utils/jwt.util');
const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/AppError');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new AppError('Authentication token missing', 401, 'UNAUTHORIZED');
    }

    const decoded = verifyToken(token);

    const user = await userRepository.findById(decoded.id);
    if (!user) {
      throw new AppError('User no longer exists', 401, 'UNAUTHORIZED');
    }

    if (user.status === 'INACTIVE') {
      throw new AppError('This account has been deactivated', 401, 'UNAUTHORIZED');
    }

    req.user = user.toJSON();
    return next();
  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }
    return next(new AppError('Invalid or expired authentication token', 401, 'UNAUTHORIZED'));
  }
}

module.exports = { authenticate };
