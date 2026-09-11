const jwt = require('jsonwebtoken');
const jwtConfig = require('../configs/jwt.config');

function signToken(payload) {
  return jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, jwtConfig.secret);
}

module.exports = { signToken, verifyToken };
