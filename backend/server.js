require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const createApp = require('./app');
const appConfig = require('./configs/app.config');
const { connectDatabase } = require('./configs/database');
const { registerNotificationSocket } = require('./sockets/notification.socket');

async function start() {
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: appConfig.clientOrigin, credentials: true },
  });
  registerNotificationSocket(io);

  server.listen(appConfig.port, () => {
    console.log(`Server running on port ${appConfig.port} [${appConfig.nodeEnv}]`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
