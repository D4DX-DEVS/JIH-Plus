const mongoose = require('mongoose');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

const unitAdminMessageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  sentBy: {
    type: String,
    trim: true
  },
  sentByRole: {
    type: String,
    trim: true
  },
  sentByEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  totalRecipients: {
    type: Number,
    default: 0
  },
  sentCount: {
    type: Number,
    default: 0
  },
  failedCount: {
    type: Number,
    default: 0
  },
  missingContactCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = ihthisabiConnection.model('UnitAdminMessage', unitAdminMessageSchema);
