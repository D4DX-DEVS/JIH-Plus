/**
 * Members Application — in-app notifications.
 *
 * Either addressed to one account (recipientAdminId) or fanned out to whoever
 * holds a role within a scope (recipientRoleKey + scope), which is how a stage
 * hand-off reaches "the district admin for this district" without knowing who
 * that is at write time.
 */

const mongoose = require('mongoose');
const membersConnection = require('../../config/membersConnection');

const notificationSchema = new mongoose.Schema({
  recipientAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MemberAdmin',
    default: null,
    index: true
  },
  recipientRoleKey: {
    type: String,
    default: '',
    index: true
  },
  scope: {
    mekhala: { type: String, default: '', trim: true },
    district: { type: String, default: '', trim: true },
    area: { type: String, default: '', trim: true },
    unit: { type: String, default: '', trim: true }
  },
  title: { type: String, required: true, maxlength: 200 },
  body: { type: String, default: '', maxlength: 2000 },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    default: null
  },
  // Accounts that have read a role-addressed notification.
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MemberAdmin'
  }],
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ recipientRoleKey: 1, createdAt: -1 });
notificationSchema.index({ recipientAdminId: 1, isRead: 1 });

module.exports = membersConnection.model('MemberNotification', notificationSchema);
