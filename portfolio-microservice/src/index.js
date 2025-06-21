require('../firebaseAdmin'); // Initialize Firebase Admin SDK
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables
const { authenticate } = require('../middleware/auth'); // Import authentication middleware
const logger = require('../logger'); // Require the logger
const { v4: uuidv4 } = require('uuid'); // Require uuid

const app = express(); // Define app
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
  res.send('Portfolio Microservice is running!');
});

// Import routes
const portfolioRoutes = require('../routes/portfolio');

// Use routes
// Apply authentication middleware before portfolio routes
app.use('/portfolio', authenticate);
app.use('/portfolio', portfolioRoutes);

// Global error handler
app.use((err, req, res, next) => {
  const errorId = err.errorId || uuidv4();
  const userId = req.user ? req.user.uid : 'unknown'; // Assuming user might be on req from auth middleware
  const errorMessage = err.message || 'An unexpected error occurred.';
  const errorCode = err.code || 'INTERNAL_ERROR';
  const errorStatus = typeof err.status === 'number' ? err.status : 500;

  logger.error(errorMessage, { // Winston takes message first, then metadata object
    errorId,
    userId,
    route: req.path,
    method: req.method,
    errorCode,
    stack: err.stack,
    requestDetails: {
      params: req.params,
      query: req.query,
      // body: req.body, // Avoid logging sensitive PII by default
    }
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(errorStatus).json({
    success: false,
    error: {
      id: errorId,
      message: errorMessage,
      code: errorCode,
    }
  });
});

// Conditionally start server and connect to DB
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(port, () => {
    logger.info(`Server is running on port: ${port}`);
  });

  const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  logger.error('FATAL ERROR: MONGODB_URI is not defined.');
  process.exit(1); // Exit the application if MONGODB_URI is not set
}

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => logger.info('MongoDB connected successfully.'))
  .catch(err => {
    logger.error('MongoDB connection error:', { error: err });
    process.exit(1); // Exit the application on connection error
  });
}

module.exports = app; // Export the Express app for testing
// module.exports = { app, server }; // Optionally export server if needed for direct closing in tests
