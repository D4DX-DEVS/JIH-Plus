/**
 * Ihthisabi Mekhala
 *
 * A Mekhala groups several districts. It sits above District and below State.
 * A district may belong to at most one Mekhala — that exclusivity is enforced by
 * the routes (see routes/ihthisabi/masterData.js) before create/update.
 */

const mongoose = require('mongoose');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

const mekhalaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    districts: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one district must be selected'
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Supports the overlap check that keeps a district inside a single mekhala
mekhalaSchema.index({ districts: 1 });

module.exports = ihthisabiConnection.model('Mekhala', mekhalaSchema);
