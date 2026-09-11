require('dotenv').config();

const http = require('http');
const createApp = require('./app');
const appConfig = require('./configs/app.config');
const { connectDatabase } = require('./configs/database');

async function start() {
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  server.listen(appConfig.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${appConfig.port} [${appConfig.nodeEnv}]`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
