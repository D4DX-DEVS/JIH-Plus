/**
 * Members Application — one collection for every admin/reviewer account.
 *
 * The role is a reference into the dynamic Role registry rather than a string
 * enum, so a new role never needs a new model or a new branch in `protect`.
 * `scope` names must match LocationMaster entries exactly (no regex matching,
 * unlike the old JIH rukn/karkun routes).
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const membersConnection = require('../../config/membersConnection');

const memberAdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters long']
  },
  password: {
    type: String,
    required: true,
    minlength: [6, 'Password must be at least 6 characters long']
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  contactNo: {
    type: String,
    default: '',
    trim: true
  },
  email: {
    type: String,
    default: '',
    trim: true,
    lowercase: true
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  scope: {
    mekhala: { type: String, default: '', trim: true },
    district: { type: String, default: '', trim: true },
    area: { type: String, default: '', trim: true },
    unit: { type: String, default: '', trim: true }
  },
  // Karkoon workflow: a Unit Nazim/Nazimath who is also a Rukn may add the
  // area admin's comments and skip that stage. See models/members/Workflow.js.
  isRukn: {
    type: Boolean,
    default: false
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

memberAdminSchema.index({ role: 1, isActive: 1 });
memberAdminSchema.index({ 'scope.unit': 1 });
memberAdminSchema.index({ 'scope.area': 1 });
memberAdminSchema.index({ 'scope.district': 1 });
memberAdminSchema.index({ 'scope.mekhala': 1 });

memberAdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

memberAdminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

memberAdminSchema.methods.toJSON = function () {
  const account = this.toObject();
  delete account.password;
  return account;
};

module.exports = membersConnection.model('MemberAdmin', memberAdminSchema);
