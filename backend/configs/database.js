const mongoose = require('mongoose');

async function connectDatabase(uri) {
  const connectionString = uri || process.env.MONGODB_URI;

  if (!connectionString) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(connectionString);

  await require('../models/User').syncIndexes();

  return mongoose.connection;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
