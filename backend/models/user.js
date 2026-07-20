const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Access code - identifier for login (not unique to allow duplicates)
  accessCode: { 
    type: String, 
    required: true,
    index: true
  },
  
  // User type: district, area, or unit
  type: { 
    type: String, 
    required: true, 
    enum: ['district', 'area', 'unit'],
    index: true
  },
  
  // Hierarchy information
  districtId: { 
    type: String, 
    required: true,
    index: true
  },
  districtName: { 
    type: String, 
    required: true
  },
  
  // For area and unit types
  areaId: { 
    type: String,
    index: true
  },
  areaName: { 
    type: String
  },
  
  // For unit type only
  unitId: { 
    type: String,
    index: true
  },
  unitName: { 
    type: String
  },
  
  // Metadata
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Compound indexes for efficient queries
userSchema.index({ type: 1, districtId: 1 });
userSchema.index({ type: 1, districtId: 1, areaId: 1 });
userSchema.index({ type: 1, districtId: 1, areaId: 1, unitId: 1 });

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);

