const { verifyToken } = require('../utils/jwt.util');
const userRepository = require('../repositories/user.repository');
const { setIO } = require('./io');
const { STAFF_ADMIN_ROLES } = require('../utils/constants');

function registerNotificationSocket(io) {
  setIO(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyToken(token);
      const user = await userRepository.findById(decoded.id);
      if (!user || user.status === 'INACTIVE') {
        return next(new Error('Authentication required'));
      }

      socket.user = user.toJSON();
      return next();
    } catch (err) {
      return next(new Error('Authentication required'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user._id}`);
    if (STAFF_ADMIN_ROLES.includes(socket.user.role)) {
      socket.join('role:STAFF_ADMIN');
    }
  });

  return io;
}

module.exports = { registerNotificationSocket };
