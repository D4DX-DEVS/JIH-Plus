/**
 * Members Application — a submitted Rukn or Karkoon application.
 *
 * Applicant answers and reviewer answers are kept in two separate maps so the
 * access rules stay simple: `formData` is everything the applicant filled in,
 * `roleData` is every role-scoped field (the per-role comment sections). Both are
 * keyed "field_<id>" to match the shared form renderer.
 */

const mongoose = require('mongoose');
const membersConnection = require('../../config/membersConnection');
const { FORM_TYPES } = require('./FormTemplate');

const STATUSES = ['submitted', 'in_review', 'approved', 'rejected', 'hold'];
const ACTIONS = ['submitted', 'forwarded', 'returned', 'marked', 'approved', 'rejected', 'hold', 'finalized', 'edited'];

const stageHistorySchema = new mongoose.Schema({
  stageKey: { type: String, required: true },
  stageName: { type: String, default: '' },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'MemberAdmin', default: null },
  actorRoleKey: { type: String, default: '' },
  actorName: { type: String, default: '' },
  action: { type: String, enum: ACTIONS, required: true },
  comment: { type: String, default: '' },
  // Values collected by the stage's captureFields (Rukn ID, attendance, dates...)
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  toStageKey: { type: String, default: '' },
  at: { type: Date, default: Date.now }
}, { _id: false });

// The narrative comment each role leaves. Kept alongside stageHistory because a
// role may act at more than one stage, and the detail view lists comments by role.
const commentSchema = new mongoose.Schema({
  roleKey: { type: String, required: true },
  roleName: { type: String, default: '' },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'MemberAdmin', default: null },
  actorName: { type: String, default: '' },
  stageKey: { type: String, default: '' },
  text: { type: String, default: '' },
  at: { type: Date, default: Date.now }
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  formType: {
    type: String,
    enum: FORM_TYPES,
    required: true,
    index: true
  },
  formTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FormTemplate',
    required: true
  },
  formVersion: { type: Number, default: 1 },
  accessLinkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccessLink',
    default: null,
    index: true
  },

  // field_<id> -> value, applicant-visible fields only
  formData: { type: mongoose.Schema.Types.Mixed, default: {} },
  // field_<id> -> value, role-scoped fields only
  roleData: { type: mongoose.Schema.Types.Mixed, default: {} },

  scope: {
    mekhala: { type: String, default: '', trim: true },
    district: { type: String, default: '', trim: true },
    area: { type: String, default: '', trim: true },
    unit: { type: String, default: '', trim: true }
  },

  // Denormalized from formData for listing and WhatsApp notifications.
  applicantName: { type: String, default: '', trim: true },
  applicantMobile: { type: String, default: '', trim: true },
  photo: { type: String, default: '' },

  currentStageKey: { type: String, default: '', index: true },
  stageHistory: [stageHistorySchema],
  comments: [commentSchema],

  status: {
    type: String,
    enum: STATUSES,
    default: 'submitted',
    index: true
  },

  // Assigned by hand at the finalize stage — not auto-generated.
  memberId: { type: String, default: '', trim: true },
  memberIdAssignedAt: { type: Date, default: null },
  thajdeedDate: { type: Date, default: null },

  submittedAt: { type: Date, default: Date.now },

  // Set by scripts/migrateMembersFromJih.js on records imported from the old
  // JIH RuknForm/KarkunForm collections, so re-running the migration is a no-op.
  legacySource: {
    model: { type: String, default: '' },
    id: { type: String, default: '' }
  }
}, { timestamps: true });

applicationSchema.index({ formType: 1, currentStageKey: 1 });
applicationSchema.index({ formType: 1, status: 1 });
applicationSchema.index({ 'scope.unit': 1, formType: 1 });
applicationSchema.index({ 'scope.area': 1, formType: 1 });
applicationSchema.index({ 'scope.district': 1, formType: 1 });
applicationSchema.index({ 'scope.mekhala': 1, formType: 1 });
applicationSchema.index({ submittedAt: -1 });
// A member ID must be unique per form type once assigned; sparse so blanks don't clash.
applicationSchema.index(
  { formType: 1, memberId: 1 },
  { unique: true, partialFilterExpression: { memberId: { $type: 'string', $ne: '' } } }
);
applicationSchema.index(
  { 'legacySource.model': 1, 'legacySource.id': 1 },
  { unique: true, partialFilterExpression: { 'legacySource.id': { $type: 'string', $ne: '' } } }
);

module.exports = membersConnection.model('Application', applicationSchema);
module.exports.STATUSES = STATUSES;
module.exports.ACTIONS = ACTIONS;
