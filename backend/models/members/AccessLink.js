/**
 * Members Application — temporary applicant credential.
 *
 * The application form is never public. A unit-level admin creates one link per
 * applicant per form type, shares the URL and credential out of band, and blocks
 * it once the applicant has submitted. After blocking, only admins can edit the
 * submission.
 *
 * The generated password is returned to the creator exactly once, at creation
 * time; only its bcrypt hash is stored.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const membersConnection = require('../../config/membersConnection');
const { FORM_TYPES } = require('./FormTemplate');

const STATUSES = ['active', 'used', 'blocked', 'expired'];

const accessLinkSchema = new mongoose.Schema({
  formType: {
    type: String,
    enum: FORM_TYPES,
    required: true,
    index: true
  },
  // Random URL segment: /members/apply/:token
  token: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MemberAdmin',
    required: true,
    index: true
  },
  // Snapshot of the creator's scope, stamped onto the resulting Application so a
  // later change to the creator's posting doesn't move existing applications.
  scope: {
    mekhala: { type: String, default: '', trim: true },
    district: { type: String, default: '', trim: true },
    area: { type: String, default: '', trim: true },
    unit: { type: String, default: '', trim: true }
  },
  // Labels so the creator can tell their outstanding links apart.
  applicantName: { type: String, default: '', trim: true },
  applicantMobile: { type: String, default: '', trim: true },
  status: {
    type: String,
    enum: STATUSES,
    default: 'active',
    index: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  // The applicant's in-progress answers, so a long multi-page form survives a
  // closed tab. Kept on the link rather than as a draft Application so reviewers
  // never see a half-filled submission.
  draftData: { type: mongoose.Schema.Types.Mixed, default: {} },
  draftPage: { type: Number, default: 0 },
  usedAt: { type: Date },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    default: null
  },
  blockedAt: { type: Date },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MemberAdmin',
    default: null
  }
}, { timestamps: true });

accessLinkSchema.index({ createdBy: 1, status: 1 });
accessLinkSchema.index({ 'scope.unit': 1, status: 1 });
accessLinkSchema.index({ createdAt: -1 });

accessLinkSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

accessLinkSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// A link is usable only while active and unexpired. Callers check this on every
// applicant request, so blocking takes effect immediately rather than at next login.
accessLinkSchema.methods.isUsable = function () {
  if (this.status !== 'active') return false;
  if (this.expiresAt && this.expiresAt.getTime() < Date.now()) return false;
  return true;
};

accessLinkSchema.methods.toJSON = function () {
  const link = this.toObject();
  delete link.password;
  return link;
};

module.exports = membersConnection.model('AccessLink', accessLinkSchema);
module.exports.STATUSES = STATUSES;
