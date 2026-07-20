const mongoose = require('mongoose');

/**
 * TargetAllocation — one row per (target, level, location).
 *
 * Level hierarchy:
 *   district  — the district's share of the target (auto-created = targetCount)
 *   area      — one row per area (created when district splits)
 *   unit      — one row per unit (created when area splits)
 *
 * Units submit their actual count via submittedCount.
 * Rollup aggregates unit submittedCounts → area total → district total.
 */
const targetAllocationSchema = new mongoose.Schema({
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Target',
    required: true,
    index: true
  },
  level: {
    type: String,
    enum: ['district', 'area', 'unit'],
    required: true
  },
  districtId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'District',
    required: true
  },
  areaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AreaMaster',
    default: null
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UnitMaster',
    default: null
  },
  // The parent allocation row (area row's parentId = district row; unit row's parentId = area row)
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TargetAllocation',
    default: null
  },
  // Count allocated to this location
  allocatedCount: {
    type: Number,
    required: true,
    min: 0
  },
  // Actual count submitted by a unit (null until the unit submits)
  submittedCount: {
    type: Number,
    default: null,
    min: 0
  },
  submittedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Ensure at most one allocation row per (target, level, location)
targetAllocationSchema.index({ targetId: 1, level: 1, districtId: 1, areaId: 1, unitId: 1 }, { unique: true });
targetAllocationSchema.index({ targetId: 1, level: 1 });
targetAllocationSchema.index({ targetId: 1, districtId: 1 });
targetAllocationSchema.index({ targetId: 1, areaId: 1 });

module.exports = mongoose.model('TargetAllocation', targetAllocationSchema);
