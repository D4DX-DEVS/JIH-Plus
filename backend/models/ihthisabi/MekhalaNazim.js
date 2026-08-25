const mongoose = require('mongoose');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

// No password field: like every other portal role, a nazim signs in with their
// RUKN ID alone through /auth/unified-login.

const mekhalaNazimSchema = new mongoose.Schema({
  mekhala: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mekhala',
    required: true,
    unique: true // one nazim per mekhala
  },
  ruknId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  contactNo: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  emailId: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

mekhalaNazimSchema.index({ emailId: 1 });

module.exports = ihthisabiConnection.model('MekhalaNazim', mekhalaNazimSchema);
