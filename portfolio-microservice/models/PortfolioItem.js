const mongoose = require('mongoose');

const portfolioItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    trim: true,
  },
  videoUrl: {
    type: String,
    trim: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  category: {
    type: String,
    required: true,
    trim: true,
  },
  duration: { // For example, duration of a project or video in minutes/hours
    type: String, // Could also be Number if you have a fixed unit
    trim: true,
  },
  datePublished: {
    type: Date,
    default: Date.now,
  },
  productionStatus: { // New field for production status
    type: String,
    trim: true,
    default: null, // Or a default status like "Pre-production"
  },
  // You might also want to add timestamps for creation and updates
  // createdAt: { type: Date, default: Date.now },
  // updatedAt: { type: Date, default: Date.now }
}, { timestamps: true }); // Enables createdAt and updatedAt automatically

const PortfolioItem = mongoose.model('PortfolioItem', portfolioItemSchema);

module.exports = PortfolioItem;
