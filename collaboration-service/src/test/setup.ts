import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

// This file is run after globalSetup and before each test file.
// Mongoose is already connected globally by globalSetup.ts.
// The server is also started globally.

// No longer needed here as Mongoose is connected globally in globalSetup.ts
// beforeAll(async () => {
// });

afterEach(async () => {
  // Clean up all collections after each test
  // Ensure Mongoose is connected before trying to access collections
  if (mongoose.connection.readyState === 1) { // 1 === connected
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } else {
    // console.warn('Mongoose not connected in afterEach, skipping collection cleanup.');
  }
});

// No longer needed here as Mongoose is disconnected and MongoDB server stopped globally in globalTeardown.ts
// afterAll(async () => {
// });
