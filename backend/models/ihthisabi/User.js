const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['rukn', 'admin'],
    required: true
  },
  // For Excel-based users, these fields are populated from Excel
  ruknId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values but ensures uniqueness when present
    trim: true
  },
  name: {
    type: String,
    required: function() {
      return this.role === 'rukn';
    },
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: function() {
      return this.role === 'rukn';
    }
  },
  district: {
    type: String,
    required: false,
    trim: true
  },
  area: {
    type: String,
    required: false,
    trim: true
  },
  unit: {
    type: String,
    required: function() {
      return this.role === 'rukn';
    },
    trim: true
  },
  // Contact information fields
  contactNo: {
    type: String,
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        // Allow empty or valid phone numbers (10-20 characters, digits with optional +, spaces, -, parentheses)
        return !v || /^[\d\s\+\-\(\)]{10,20}$/.test(v);
      },
      message: props => `${props.value} is not a valid contact number!`
    }
  },
  emailId: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        // Allow empty or valid email format
        return !v || /^[\w\-\.]+@([\w-]+\.)+[\w-]{2,}$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  country: {
    type: String,
    required: false,
    trim: true,
    uppercase: true,
    maxlength: [50, 'Country cannot exceed 50 characters']
  },
  isAbroad: {
    type: Boolean,
    default: false
  },
  abroadCountry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AbroadCountry',
    default: null
  },
  abroadArea: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AbroadArea',
    default: null
  },
  abroadUnit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AbroadUnit',
    default: null
  },
  // Legacy fields for admin users (keep for backward compatibility)
  username: {
    type: String,
    required: function() {
      return this.role === 'admin';
    },
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [50, 'Username cannot exceed 50 characters']
  },
  password: {
    type: String,
    required: function() {
      return this.role === 'admin';
    },
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
// Make username unique only for admin users via partial index
userSchema.index(
  { username: 1 },
  {
    unique: true,
    partialFilterExpression: {
      role: 'admin',
      username: { $type: 'string' }
    }
  }
);
userSchema.index({ role: 1 });
userSchema.index({ district: 1, area: 1, unit: 1 });
userSchema.index({ ruknId: 1, district: 1, area: 1, unit: 1 }); // Composite index for login validation
userSchema.index({ contactNo: 1 }, { sparse: true }); // Index for contact number queries
userSchema.index({ emailId: 1 }, { sparse: true }); // Index for email queries

// Hash password before saving (only for admin users)
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new) and user has password
  if (!this.isModified('password') || !this.password) return next();
  
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
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Virtual for user's full identification
userSchema.virtual('fullIdentification').get(function() {
  if (this.role === 'rukn') {
    let id = `${this.name} (${this.unit}) - ID: ${this.ruknId}`;
    if (this.contactNo) id += ` - ${this.contactNo}`;
    if (this.emailId) id += ` - ${this.emailId}`;
    return id;
  }
  return this.username;
});

module.exports = ihthisabiConnection.model('User', userSchema);
