
const functions = require('firebase-functions');
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

admin.initializeApp();

const app = express();

// Middleware to enable CORS
app.use(cors({origin: true}));

// Middleware to parse JSON bodies
app.use(express.json());

// Authentication middleware (applied globally to all routes below)
async function authenticate(req, res, next) {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token provided or incorrect format.' });
  }
  const idToken = req.headers.authorization.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Add user to request
    next();
  } catch (error) {
    functions.logger.error("Error while verifying Firebase ID token:", error);
    res.status(403).json({ error: 'Forbidden - Invalid or expired token.' });
  }
}

// Apply authentication middleware to all routes in this Express app
app.use(authenticate);

// In-memory store for items (replace with Firestore in a real app)
let items = [
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' }
];
let nextId = 3;

// GET /items - Retrieve all items (Now authenticated)
app.get('/items', (req, res) => {
  // Example: Accessing authenticated user's UID
  // functions.logger.info(`User ${req.user.uid} accessed /items`);
  res.status(200).json(items);
});

// POST /items - Add a new item (Already authenticated)
app.post('/items', (req, res) => {
  if (!req.body.name) {
    return res.status(400).json({ error: 'Item name is required' });
  }
  const newItem = {
    id: nextId++,
    name: req.body.name
  };
  items.push(newItem);
  res.status(201).json(newItem);
});

// GET /items/:id - Retrieve a single item by ID (Already authenticated)
app.get('/items/:id', (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  const item = items.find(i => i.id === itemId);
  if (item) {
    res.status(200).json(item);
  } else {
    res.status(404).json({ error: 'Item not found' });
  }
});

// Expose Express app as a single Firebase Function
// This function will handle all routes defined in the app
exports.api = functions.region('us-west1').https.onRequest(app);

// Example of another simple function (not using Express, not part of the authenticated API)
exports.helloWorld = functions.region('us-west1').https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});
