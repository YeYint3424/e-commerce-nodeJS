require('dotenv').config();

const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '1d',
};

if (!jwtConfig.secret && process.env.NODE_ENV !== 'test') {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

module.exports = jwtConfig;
