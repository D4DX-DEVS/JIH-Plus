/**
 * Members Application — notification fan-out.
 *
 * In-app notifications go to whoever holds the target role inside the
 * application's scope; WhatsApp goes to the applicant on a final decision.
 * Both are best-effort: a notification failure must never roll back a stage
 * transition that already succeeded.
 */

const Notification = require('../../models/members/Notification');
const MemberAdmin = require('../../models/members/MemberAdmin');
const Role = require('../../models/members/Role');
const { sendWhatsAppMessage } = require('../whatsapp');
const { SCOPE_FIELD_BY_TYPE } = require('./scopeFilter');

/**
 * Notify every holder of `roleKey` whose posting covers `scope`.
 * Falls back to a role-addressed notification when no account matches, so the
 * message is still visible to whoever is later assigned that posting.
 */
async function notifyRole({ roleKey, scope, title, body, applicationId }) {
  try {
    if (!roleKey) return;

    const role = await Role.findOne({ key: roleKey, isActive: true }).lean();
    if (!role) return;

    const query = { role: role._id, isActive: true };
    if (role.scopeType !== 'state') {
      const value = scope?.[role.scopeType];
      if (!value) return;
      query[`scope.${role.scopeType}`] = value;
    }

    const recipients = await MemberAdmin.find(query).select('_id').lean();

    if (!recipients.length) {
      await Notification.create({ recipientRoleKey: roleKey, scope, title, body, applicationId });
      return;
    }

    await Notification.insertMany(recipients.map(r => ({
      recipientAdminId: r._id,
      recipientRoleKey: roleKey,
      scope,
      title,
      body,
      applicationId
    })));
  } catch (error) {
    console.error('Members notifyRole error:', error);
  }
}

/** Notify one specific account. */
async function notifyAccount({ adminId, scope, title, body, applicationId }) {
  try {
    if (!adminId) return;
    await Notification.create({ recipientAdminId: adminId, scope, title, body, applicationId });
  } catch (error) {
    console.error('Members notifyAccount error:', error);
  }
}

/**
 * WhatsApp the applicant about a final decision.
 * sendWhatsAppMessage never throws — it returns { success: false } on failure.
 */
async function notifyApplicantDecision(application, outcome, note) {
  if (!application?.applicantMobile) return { success: false, error: 'no mobile number' };

  const formLabel = application.formType === 'rukn' ? 'Rukn' : 'Karkoon';
  const heading = outcome === 'approved'
    ? `*${formLabel} Application Approved*`
    : outcome === 'rejected'
      ? `*${formLabel} Application Rejected*`
      : `*${formLabel} Application On Hold*`;

  const lines = [heading, '', `Applicant: ${application.applicantName || 'Applicant'}`];
  if (application.memberId) lines.push(`${formLabel} ID: ${application.memberId}`);
  if (note) lines.push('', note);

  return sendWhatsAppMessage(application.applicantMobile, lines.join('\n'));
}

module.exports = { notifyRole, notifyAccount, notifyApplicantDecision, SCOPE_FIELD_BY_TYPE };
