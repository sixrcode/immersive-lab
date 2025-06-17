const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables

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
app.use('/portfolio', portfolioRoutes);

// Conditionally start server and connect to DB
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
  });

  const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('FATAL ERROR: MONGODB_URI is not defined.');
  process.exit(1); // Exit the application if MONGODB_URI is not set
}

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit the application on connection error
  });
}

module.exports = app; // Export the Express app for testing
// module.exports = { app, server }; // Optionally export server if needed for direct closing in tests
