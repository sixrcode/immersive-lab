
const {onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
// Import for analyzeScript. Assuming the build process handles TypeScript to JS transpilation
// and path resolution (e.g., from tsconfig.json paths if src is mapped).
// If functions/index.js is in the same directory as src/ after build, this path might need adjustment.
// For now, assuming a common root or that the build places it correctly.
// MODIFIED: Path updated to point to the copied files within functions directory
const { analyzeScript } = require('./src_copy/ai/flows/ai-script-analyzer');

// Set global options for all functions
setGlobalOptions({ region: 'us-west1' });

admin.initializeApp();

const app = express();

// Middleware to enable CORS
app.use(cors({origin: true}));

// Middleware to parse JSON bodies
app.use(express.json());

// Authentication middleware (applied globally to all routes below)
async function authenticate(req, res, next) {
  // Bypass for testing with a specific mock token
  if (process.env.NODE_ENV === 'test') {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer mock-valid-token')) {
      req.user = { uid: 'test-uid', email: 'test@example.com' };
      return next();
    }
    // Allow tests to explicitly send no token or other tokens to test unauthenticated/error paths
  }

  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token provided or incorrect format.' });
  }
  const idToken = req.headers.authorization.split('Bearer ')[1];
  try {
    // This will now only be hit by actual tokens in non-test env, or by specific test tokens
    // not matching 'mock-valid-token' if we want to test the stubbed verifyIdToken behavior.
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Add user to request
    next();
  } catch (error) {
    logger.error("Error while verifying Firebase ID token:", error);
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

// POST /analyzeScript - Analyzes a script (Authenticated)
app.post('/analyzeScript', async (req, res) => {
  if (!req.body.script) {
    return res.status(400).json({ error: 'Script content is required in the request body.' });
  }

  const { script } = req.body;

  try {
    // The analyzeScript function expects an object like { script: "..." }
    const analysisResult = await analyzeScript({ script });
    res.status(200).json(analysisResult);
  } catch (error) {
    functions.logger.error("Error calling analyzeScript:", error);
    // Check if the error has a message and code, common in Firebase/Google Cloud errors
    const errorMessage = error.message || 'An unexpected error occurred while analyzing the script.';
    const errorCode = error.code || 500; // Default to 500 if no specific code

    // It's good practice to not expose raw internal errors to the client,
    // but for now, we'll return the message. In a production app, you might want to
    // return a generic message for 500 errors.
    res.status(typeof errorCode === 'number' && errorCode >= 100 && errorCode < 600 ? errorCode : 500)
       .json({ error: errorMessage });
  }
});

// Expose Express app as a single Firebase Function
// This function will handle all routes defined in the app
exports.api = onRequest(app);

// Example of another simple function (not using Express, not part of the authenticated API)
exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

// Export the raw app and authenticate middleware ONLY for testing purposes
if (process.env.NODE_ENV === 'test') {
  exports.testableApp = app;
  exports.authenticate = authenticate; // Exporting for potential stubbing
}
