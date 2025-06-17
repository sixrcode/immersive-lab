import { MongoMemoryServer } from 'mongodb-memory-server';
// We will use the global mongoose instance for disconnect
// import mongoose from 'mongoose';

declare global {
  var __MONGOD__: MongoMemoryServer;
  var __MONGOOSE_INSTANCE__: typeof import('mongoose');
}

export default async function globalTeardown() {
  console.log('\nGlobal teardown: Disconnecting Mongoose and stopping MongoDB Memory Server...');

  const mongooseInstance = global.__MONGOOSE_INSTANCE__;

  if (mongooseInstance && mongooseInstance.connection && mongooseInstance.connection.readyState === 1) {
    try {
      await mongooseInstance.disconnect();
      console.log('Global Mongoose instance disconnected.');
    } catch (error) {
      console.error('Error disconnecting global Mongoose instance in globalTeardown:', error);
    }
  } else if (mongooseInstance && mongooseInstance.connection) {
    console.log(`Global Mongoose instance was not connected (readyState: ${mongooseInstance.connection.readyState}) before globalTeardown.`);
  } else {
    console.log('Global Mongoose instance not found or connection object missing.');
  }

  if (global.__MONGOD__) {
    try {
      await global.__MONGOD__.stop();
      console.log('MongoDB Memory Server stopped globally.');
    } catch (error) {
      console.error('Error stopping MongoDB Memory Server in globalTeardown:', error);
    }
  } else {
    console.warn('MongoDB Memory Server instance (__MONGOD__) not found in global teardown.');
  }
}
