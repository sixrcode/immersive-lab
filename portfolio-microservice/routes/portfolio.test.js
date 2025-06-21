const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/index'); // Assuming your Express app is exported from src/index.js
const PortfolioItem = require('../models/PortfolioItem');

let mongoServer;
let server; // To hold the HTTP server instance

// Utility function to clear the database
async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Ensure mongoose is not already connected from a previous require/import of app
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Start the Express server
  // Note: app itself is the express app. We need to start it on a port.
  // Supertest can also work by passing the app instance directly, which is often preferred for tests
  // as it doesn't require listening on a real port.
  // For this setup, we'll let Supertest manage the app.
});

afterEach(async () => {
  await clearDatabase(); // Clear data after each test
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  // If your app starts a server, close it here e.g. server.close();
  // Check if app is the server instance or the express app
  // If app is an http.Server instance:
  // if (app && app.close) {
  //   app.close();
  // }
  // If app is the express app, and index.js exports the server:
  // require('../src/index').server.close(); // Assuming src/index.js exports the server instance
});

describe('Portfolio API Endpoints', () => {
  // Placeholder for tests
  it('should have a placeholder test', () => {
    expect(true).toBe(true);
  });
});

// Helper function to create a portfolio item for tests
const createSampleItem = () => ({
  title: "Test Project",
  description: "A test project description.",
  category: "Test Category",
  tags: ["test", "project"],
  imageUrl: "http://example.com/image.png",
  videoUrl: "http://example.com/video.mp4",
  duration: "10 mins",
});

// Actual tests will go here
describe('POST /portfolio', () => {
  it('should create a new portfolio item', async () => {
    const newItem = createSampleItem();
    const res = await request(app)
      .post('/portfolio')
      .send(newItem);
    expect(res.statusCode).toEqual(201);
    expect(res.body.title).toBe(newItem.title);
    expect(res.body).toHaveProperty('_id');

    const dbItem = await PortfolioItem.findById(res.body._id);
    expect(dbItem).toBeTruthy();
    expect(dbItem.title).toBe(newItem.title);
  });

  it('should return 400 for missing required fields (e.g., title)', async () => {
    const { title, ...incompleteItem } = createSampleItem(); // Remove title
    const res = await request(app)
      .post('/portfolio')
      .send(incompleteItem);
    expect(res.statusCode).toEqual(400);
  });
});

describe('GET /portfolio', () => {
  it('should return an array of portfolio items', async () => {
    await PortfolioItem.create(createSampleItem());
    await PortfolioItem.create({ ...createSampleItem(), title: "Test Project 2" });

    const res = await request(app).get('/portfolio');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBe(2);
  });

  it('should return an empty array if no items exist', async () => {
    const res = await request(app).get('/portfolio');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBe(0);
  });
});

describe('GET /portfolio/:id', () => {
  it('should return a single portfolio item by ID', async () => {
    const item = await PortfolioItem.create(createSampleItem());
    const res = await request(app).get(`/portfolio/${item._id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.title).toBe(item.title);
    expect(res.body._id).toBe(item._id.toString());
  });

  it('should return 404 if item not found', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/portfolio/${nonExistentId}`);
    expect(res.statusCode).toEqual(404);
  });

  it('should return 500 for an invalid ID format', async () => {
    const res = await request(app).get('/portfolio/invalid-id-format');
    // The default Express error handler might return HTML for 500, or Mongoose might cast error.
    // Depending on error handling, this could be 400 or 500.
    // Mongoose typically throws a CastError for invalid ObjectId, which our handler should catch as 500 or a more specific 400.
    // The current route handler for GET /:id catches generic errors as 500.
    expect(res.statusCode).toEqual(500);
  });
});

describe('PUT /portfolio/:id', () => {
  it('should update an existing portfolio item', async () => {
    const item = await PortfolioItem.create(createSampleItem());
    const updates = { title: "Updated Test Project", description: "Updated description." };

    const res = await request(app)
      .put(`/portfolio/${item._id}`)
      .send(updates);

    expect(res.statusCode).toEqual(200);
    expect(res.body.title).toBe(updates.title);
    expect(res.body.description).toBe(updates.description);

    const dbItem = await PortfolioItem.findById(item._id);
    expect(dbItem.title).toBe(updates.title);
  });

  it('should update the productionStatus of an existing portfolio item', async () => {
    const item = await PortfolioItem.create(createSampleItem());
    const updates = { productionStatus: "In Production" };

    const res = await request(app)
      .put(`/portfolio/${item._id}`)
      .send(updates);

    expect(res.statusCode).toEqual(200);
    expect(res.body.productionStatus).toBe(updates.productionStatus);

    const dbItem = await PortfolioItem.findById(item._id);
    expect(dbItem.productionStatus).toBe(updates.productionStatus);
    expect(dbItem.title).toBe(item.title); // Ensure other fields are not changed
  });

  it('should return 404 if item to update is not found', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const updates = { title: "Updated Title" };
    const res = await request(app)
      .put(`/portfolio/${nonExistentId}`)
      .send(updates);
    expect(res.statusCode).toEqual(404);
  });

  it('should return 400 for invalid update data (e.g., making title empty if required)', async () => {
    const item = await PortfolioItem.create(createSampleItem());
    const updates = { title: "" }; // Assuming title is required and cannot be empty

    const res = await request(app)
      .put(`/portfolio/${item._id}`)
      .send(updates);
    expect(res.statusCode).toEqual(400); // Mongoose validation should fail
  });
});

describe('DELETE /portfolio/:id', () => {
  it('should delete a portfolio item by ID', async () => {
    const item = await PortfolioItem.create(createSampleItem());

    const res = await request(app).delete(`/portfolio/${item._id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe('Portfolio item deleted successfully');

    const dbItem = await PortfolioItem.findById(item._id);
    expect(dbItem).toBeNull();
  });

  it('should return 404 if item to delete is not found', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/portfolio/${nonExistentId}`);
    expect(res.statusCode).toEqual(404);
  });

  it('should return 500 for an invalid ID format on delete', async () => {
    const res = await request(app).delete('/portfolio/invalid-id-format');
    expect(res.statusCode).toEqual(500); // Similar to GET /:id with invalid format
  });
});
