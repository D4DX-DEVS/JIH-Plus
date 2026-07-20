const mongoose = require('mongoose');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

const archivedQuarterSchema = new mongoose.Schema({
  quarter: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  year: {
    type: Number,
    required: true,
    min: 2020,
    max: 2100
  },
  archivedAt: {
    type: Date,
    default: Date.now
  },
  archivedBy: {
    type: String,
    trim: true
  }
}, {
  timestamps: false
});

// Compound unique index: each quarter/year can only be archived once
archivedQuarterSchema.index({ quarter: 1, year: 1 }, { unique: true });

module.exports = ihthisabiConnection.model('ArchivedQuarter', archivedQuarterSchema);
