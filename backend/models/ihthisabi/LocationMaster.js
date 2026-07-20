/**
 * Ihthisabi Location Master
 *
 * Persists District / Area / Unit names that are explicitly added by an admin.
 * The master-data routes merge these with User-derived aggregations so that
 * newly added locations appear in both the Master Data page (count=0) and in
 * member-creation dropdowns.
 *
 * Fields
 *   type        – 'district' | 'area' | 'unit'
 *   name        – display name (stored as-is)
 *   district    – parent district name (required for area and unit)
 *   area        – parent area name (required for unit)
 *   isActive    – soft-delete flag
 */

const mongoose = require('mongoose');

const locationMasterSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['district', 'area', 'unit'],
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    district: {
      type: String,
      default: '',
      trim: true
    },
    area: {
      type: String,
      default: '',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Compound unique index – prevents duplicates within the same parent scope
locationMasterSchema.index({ type: 1, name: 1, district: 1, area: 1 }, { unique: true });

module.exports = mongoose.model('IhthisabiLocationMaster', locationMasterSchema);
