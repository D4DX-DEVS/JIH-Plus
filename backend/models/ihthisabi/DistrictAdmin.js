const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

const districtAdminSchema = new mongoose.Schema({
  district: {
    type: String,
    required: true,
    trim: true
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
  password: {
    type: String,
    required: true,
    minlength: [6, 'Password must be at least 6 characters long']
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

// Index for better query performance
districtAdminSchema.index({ district: 1 });
districtAdminSchema.index({ ruknId: 1, district: 1 }); // Composite index for login validation
districtAdminSchema.index({ emailId: 1 });

// Hash password before saving
districtAdminSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
districtAdminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
districtAdminSchema.methods.toJSON = function() {
  const districtAdmin = this.toObject();
  delete districtAdmin.password;
  return districtAdmin;
};

// Virtual for district admin's full identification
districtAdminSchema.virtual('fullIdentification').get(function() {
  return `${this.name} (${this.district}) - ID: ${this.ruknId}`;
});

module.exports = ihthisabiConnection.model('DistrictAdmin', districtAdminSchema);
