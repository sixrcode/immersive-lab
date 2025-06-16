const functions = require('firebase-functions');
const express = require('express');
const admin = require('firebase-admin');

admin.initializeApp();

const app = express();

// In-memory store for items (replace with Firestore in a real app)
let items = [
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' }
];
let nextId = 3;

// Middleware to parse JSON bodies
app.use(express.json());

// GET /items - Retrieve all items
app.get('/items', (req, res) => {
  res.status(200).json(items);
});

// Authentication middleware
async function authenticate(req, res, next) {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token provided or incorrect format.' });
  }
  const idToken = req.headers.authorization.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    functions.logger.error("Error while verifying Firebase ID token:", error);
    res.status(403).json({ error: 'Forbidden - Invalid or expired token.' });
  }
}

// POST /items - Add a new item
app.post('/items', authenticate, (req, res) => {
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

// GET /items/:id - Retrieve a single item by ID
app.get('/items/:id', authenticate, (req, res) => {
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

// Example of another simple function (not using Express)
exports.helloWorld = functions.region('us-west1').https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});
