const express = require('express');
const router = express.Router();
const PortfolioItem = require('../models/PortfolioItem');

// POST /portfolio - Create a new portfolio item
router.post('/', async (req, res) => {
  try {
    const newItem = new PortfolioItem(req.body);
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /portfolio - Get all portfolio items
router.get('/', async (req, res) => {
  try {
    const items = await PortfolioItem.find();
    res.status(200).json(items);
  } catch (error) { // Added opening brace
    res.status(500).json({ message: error.message });
  }
});

// GET /portfolio/:id - Get a specific portfolio item by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await PortfolioItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Portfolio item not found' });
    }
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /portfolio/:id - Update a specific portfolio item by ID
router.put('/:id', async (req, res) => {
  try {
    const updatedItem = await PortfolioItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedItem) {
      return res.status(404).json({ message: 'Portfolio item not found' });
    }
    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /portfolio/:id - Delete a specific portfolio item by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedItem = await PortfolioItem.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ message: 'Portfolio item not found' });
    }
    res.status(200).json({ message: 'Portfolio item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
