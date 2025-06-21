const express = require('express');
const router = express.Router();
const PortfolioItem = require('../models/PortfolioItem');
const logger = require('../logger'); // Require the logger

// POST /portfolio - Create a new portfolio item
router.post('/', async (req, res, next) => {
  try {
    const newItem = new PortfolioItem(req.body);
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (err) {
    logger.error('Error creating portfolio item', { error: err.message, stack: err.stack, body: req.body, userId: req.user?.uid });
    err.status = 400; // Bad Request
    next(err);
  }
});

// GET /portfolio - Get all portfolio items
router.get('/', async (req, res, next) => {
  try {
    const items = await PortfolioItem.find();
    res.status(200).json(items);
  } catch (err) {
    logger.error('Error fetching all portfolio items', { error: err.message, stack: err.stack, userId: req.user?.uid });
    err.status = 500;
    next(err);
  }
});

// GET /portfolio/:id - Get a specific portfolio item by ID
router.get('/:id', async (req, res, next) => {
  try {
    const item = await PortfolioItem.findById(req.params.id);
    if (!item) {
      logger.warn(`Portfolio item not found with id: ${req.params.id}`, { itemId: req.params.id, userId: req.user?.uid });
      return res.status(404).json({ message: 'Portfolio item not found' });
    }
    res.status(200).json(item);
  } catch (err) {
    logger.error(`Error fetching portfolio item with id: ${req.params.id}`, { error: err.message, stack: err.stack, itemId: req.params.id, userId: req.user?.uid });
    err.status = 500;
    next(err);
  }
});

// PUT /portfolio/:id - Update a specific portfolio item by ID
router.put('/:id', async (req, res, next) => {
  try {
    const updatedItem = await PortfolioItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedItem) {
      logger.warn(`Portfolio item not found for update with id: ${req.params.id}`, { itemId: req.params.id, userId: req.user?.uid });
      return res.status(404).json({ message: 'Portfolio item not found' });
    }
    res.status(200).json(updatedItem);
  } catch (err) {
    logger.error(`Error updating portfolio item with id: ${req.params.id}`, { error: err.message, stack: err.stack, itemId: req.params.id, body: req.body, userId: req.user?.uid });
    err.status = 400; // Bad Request (e.g. validation error)
    next(err);
  }
});

// DELETE /portfolio/:id - Delete a specific portfolio item by ID
router.delete('/:id', async (req, res, next) => {
  try {
    const deletedItem = await PortfolioItem.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      logger.warn(`Portfolio item not found for deletion with id: ${req.params.id}`, { itemId: req.params.id, userId: req.user?.uid });
      return res.status(404).json({ message: 'Portfolio item not found' });
    }
    res.status(200).json({ message: 'Portfolio item deleted successfully' });
  } catch (err) {
    logger.error(`Error deleting portfolio item with id: ${req.params.id}`, { error: err.message, stack: err.stack, itemId: req.params.id, userId: req.user?.uid });
    err.status = 500;
    next(err);
  }
});

module.exports = router;
