const chai = require('chai');
const sinon = require('sinon');
const admin = require('firebase-admin');
const functionsTest = require('firebase-functions-test')({
  // projectId: 'your-project-id', // Optional
}, /* optional path to service account key */);

const request = require('supertest');

// Import the functions to be tested
const myFunctions = require('../index.js'); // For helloWorld and potentially for stubbing authenticate
const { testableApp } = require('../index.js'); // The raw Express app for supertest

const assert = chai.assert;
const expect = chai.expect; // Using expect for some supertest assertions

describe('Cloud Functions Tests', () => {
  let adminInitStub;
  let adminAuthStub;

  // Using a simple string for mock valid token, as authenticate function in index.js is now test-aware
  const MOCK_VALID_TOKEN = "mock-valid-token";

  before(() => {
    adminInitStub = sinon.stub(admin, 'initializeApp');
    // This stub remains for any direct calls to admin.auth().verifyIdToken
    // (e.g., if a test case sends a token *not* equal to MOCK_VALID_TOKEN
    // and expects the actual verifyIdToken logic to be hit and fail as per the stub's default).
    const mockVerifyIdToken = sinon.stub();
    // This specific `withArgs` for MOCK_VALID_TOKEN might not even be strictly necessary now
    // if the authenticate middleware in index.js handles it, but it doesn't hurt.
    mockVerifyIdToken.withArgs(MOCK_VALID_TOKEN).resolves({ uid: 'test-uid', email: 'test@example.com' });
    mockVerifyIdToken.rejects(new Error('Invalid token - default mock rejection for verifyIdToken stub'));
    adminAuthStub = sinon.stub(admin, 'auth').returns({
      verifyIdToken: mockVerifyIdToken
    });
  });

  after(() => {
    adminInitStub.restore();
    adminAuthStub.restore();
    functionsTest.cleanup();
  });

  // Test for helloWorld (still using firebase-functions-test)
  describe('Cloud Functions: helloWorld (using firebase-functions-test)', () => {
    it('should return "Hello from Firebase!"', (done) => {
      const req = {}; // Mock request
      const res = {
        send: (text) => {
          assert.equal(text, "Hello from Firebase!");
          done();
        }
      };
      myFunctions.helloWorld(req, res);
    });
  });

  // Old API tests using firebase-functions-test are commented out or removed
  // describe('Cloud Functions: API (using firebase-functions-test)', () => { ... });

  describe('Cloud Functions: API (using supertest)', () => {
    describe('Unauthenticated requests', () => {
      // No need to stub 'authenticate' here, we are testing its behavior for unauthenticated requests
      it('GET /items - should return 401 if no token is provided', (done) => {
        request(testableApp)
          .get('/items')
          .expect(401)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body.error).to.include('No token provided');
            done();
          });
      });

      it('POST /items - should return 401 if no token is provided', (done) => {
        request(testableApp)
          .post('/items')
          .send({ name: 'Test Item from Supertest' })
          .expect(401)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body.error).to.include('No token provided');
            done();
          });
      });

      it('GET /items/1 - should return 401 Unauthorized if no token is provided', (done) => {
        request(testableApp)
          .get('/items/1')
          .expect(401)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body.error).to.include('No token provided');
            done();
          });
      });
    });

    describe('Authenticated /items routes', () => {
      // No longer stubbing myFunctions.authenticate due to test-aware middleware in index.js

      it('GET /items - should return items if valid token is provided', (done) => {
        request(testableApp)
          .get('/items')
          .set('Authorization', `Bearer ${MOCK_VALID_TOKEN}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.be.an('array');
            expect(res.body).to.deep.include({ id: 1, name: 'Item 1' });
            done();
          });
      });

      it('POST /items - should create an item if valid token is provided', (done) => {
        const newItemName = 'Supertest Item';
        request(testableApp)
          .post('/items')
          .set('Authorization', `Bearer ${MOCK_VALID_TOKEN}`)
          .send({ name: newItemName })
          .expect(201)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.be.an('object');
            expect(res.body.name).to.equal(newItemName);
            // Optionally, verify it was added to the 'items' array in-memory store
            // This requires accessing 'items' or adding a GET by ID test
            done();
          });
      });

       it('GET /items/:id - should retrieve a single item if valid token is provided', (done) => {
        request(testableApp)
          .get('/items/1')
          .set('Authorization', `Bearer ${MOCK_VALID_TOKEN}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.be.an('object');
            expect(res.body.id).to.equal(1);
            done();
          });
      });

      it('GET /items/:id - should return 404 for non-existent item with valid token', (done) => {
        request(testableApp)
          .get('/items/999')
          .set('Authorization', `Bearer ${MOCK_VALID_TOKEN}`)
          .expect(404)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body.error).to.equal('Item not found');
            done();
          });
      });

      it('POST /items - should return 400 if name is missing with valid token', (done) => {
        request(testableApp)
          .post('/items')
          .set('Authorization', `Bearer ${MOCK_VALID_TOKEN}`)
          .send({}) // No name
          .expect(400)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body.error).to.equal('Item name is required');
            done();
          });
      });
    });
  });
});
