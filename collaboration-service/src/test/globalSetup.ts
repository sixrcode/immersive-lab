import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

declare global {
  var __MONGOD__: MongoMemoryServer;
  var __MONGOOSE_INSTANCE__: typeof mongoose;
}

export default async function globalSetup() {
  console.log('\nGlobal setup: Starting MongoDB Memory Server...');
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  global.__MONGOD__ = mongoServer;
  process.env.MONGODB_URI = mongoUri;

  console.log(`MongoDB Memory Server started at ${mongoUri}`);

  try {
    console.log('Attempting to connect Mongoose globally...');
    // Using a promise to ensure we wait for the connection event
    await new Promise<void>((resolve, reject) => {
      mongoose.connection.on('connected', () => {
        console.log('Mongoose connected event received in globalSetup.');
        resolve();
      });
      mongoose.connection.on('error', (err) => {
        console.error('Mongoose global connection error event:', err);
        reject(err);
      });
      mongoose.connection.on('disconnected', () => {
        console.log('Mongoose disconnected event received in globalSetup (unexpected).');
      });

      // Start the connection
      mongoose.connect(mongoUri, {
        // useNewUrlParser: true, // Deprecated in Mongoose 6+ (default true)
        // useUnifiedTopology: true // Deprecated in Mongoose 6+ (default true)
      }).catch(reject); // Catch initial connection errors not caught by 'error' event
    });

    console.log('Mongoose connect promise resolved.');

    if (!mongoose.connection.db) {
      throw new Error('mongoose.connection.db is undefined after connect.');
    }
    await mongoose.connection.db.admin().listDatabases();
    console.log('Successfully performed listDatabases() in globalSetup.');

    console.log('Mongoose connection state in globalSetup (end):', mongoose.connection.readyState); // Expected: 1
    global.__MONGOOSE_INSTANCE__ = mongoose;

    // Models will be initialized in each test suite's beforeAll using the global mongoose instance.
    console.log('Global Mongoose instance set up. Models will be initialized by test suites.');

  } catch (error) {
    console.error('Failed to connect Mongoose or perform DB operation in globalSetup:', error);
    if (global.__MONGOD__) {
      await global.__MONGOD__.stop().catch(e => console.error('Error stopping mongod in error path', e));
    }
    process.exit(1);
  }
}
