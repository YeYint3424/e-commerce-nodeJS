require('dotenv').config();

const { connectDatabase, disconnectDatabase } = require('../configs/database');
const { seedDefaultAdmin } = require('./admin.seeder');

async function run() {
  await connectDatabase();

  try {
    await seedDefaultAdmin();
  } finally {
    await disconnectDatabase();
  }
}

run()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Seeding complete');
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Seeding failed:', err);
    process.exit(1);
  });
