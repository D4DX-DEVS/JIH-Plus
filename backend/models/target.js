const mongoose = require('mongoose');

/**
 * Target — top-level count goal created by the State Admin (role: admin)
 * and assigned to a specific district.
 *
 * Workflow:
 *   State admin creates Target (targetCount, districtId)
 *   → District admin allocates counts to its Areas
 *   → Area admin allocates counts to its Units
 *   → Units submit actual counts (submittedCount on TargetAllocation)
 *   → Rollup: sum of all unit submittedCounts shown against targetCount
 */
const targetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    default: '',
    maxlength: 1000
  },
  targetCount: {
    type: Number,
    required: true,
    min: 1
  },
  // The district this target is assigned to
  districtId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'District',
    required: true,
    index: true
  },
  // Who created this target (State admin – decoded from JWT, no User model row required)
  createdBy: {
    type: String, // admin email or identifier
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active'
  }
}, { timestamps: true });

targetSchema.index({ districtId: 1, status: 1 });
targetSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Target', targetSchema);
