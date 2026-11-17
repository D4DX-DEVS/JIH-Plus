/**
 * Members Application — configurable approval pipeline, one document per form type.
 *
 * Stage kinds:
 *   verify   – the actor reviews, fills their own comment fields, forwards
 *   marker   – the actor only records that an external event happened
 *              (Party School attendance, Ameer Mulakath, Urdu form) plus a comment
 *   decision – the actor sets Approved / Rejected / Hold
 *   finalize – the actor assigns the custom member ID and any dates
 *
 * Routing between stages is data, not code: `nextStageKey` is the default forward
 * target and `allowedNextStageKeys` lists every other stage the actor may send to
 * (used for send-backs, and for the state admin choosing between Mekhala Nazim and
 * the next marker stage).
 */

const mongoose = require('mongoose');
const membersConnection = require('../../config/membersConnection');
const { FORM_TYPES } = require('./FormTemplate');

const STAGE_KINDS = ['verify', 'marker', 'decision', 'finalize'];

// Extra values a stage records beyond the comment, e.g. the Rukn ID at finalize
// or the attendance flag at the Party School marker.
const captureFieldSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['text', 'number', 'date', 'yesno', 'textarea'], default: 'text' },
  required: { type: Boolean, default: false }
}, { _id: false });

const stageSchema = new mongoose.Schema({
  key: { type: String, required: true },
  name: { type: String, required: true, maxlength: 200 },
  nameMl: { type: String, default: '' },
  order: { type: Number, required: true },
  // Role.key of whoever acts at this stage. Empty means "the applicant" (the
  // implicit first stage) and is only valid on the seeded submission stage.
  actorRoleKey: { type: String, default: '' },
  kind: { type: String, enum: STAGE_KINDS, default: 'verify' },
  nextStageKey: { type: String, default: '' },
  allowedNextStageKeys: [{ type: String }],
  // Conditional shortcut. Currently the only supported condition is
  // 'actorIsRukn', which the Karkoon flow uses to let a Unit Nazim who is also a
  // Rukn fill the area admin's comments and jump past that stage.
  skipWhen: { type: String, enum: ['', 'actorIsRukn'], default: '' },
  skipToStageKey: { type: String, default: '' },
  // Role keys whose comment fields this stage's actor may additionally fill when
  // the skip condition is met.
  skipFillsRoleKeys: [{ type: String }],
  captureFields: [captureFieldSchema],
  // Terminal stages end the application; nothing forwards out of them.
  isTerminal: { type: Boolean, default: false }
}, { _id: false });

const workflowSchema = new mongoose.Schema({
  formType: {
    type: String,
    enum: FORM_TYPES,
    required: true,
    unique: true
  },
  stages: [stageSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MemberAdmin',
    default: null
  }
}, { timestamps: true });

/**
 * Structural check for a stage list: unique keys, and every routing target names
 * a stage that exists. Returns an error message, or null when the graph is sound.
 * Exported because findOneAndUpdate (used by the workflow routes) skips the
 * document-level pre('validate') hook below.
 */
function stageGraphError(stages) {
  const keys = (stages || []).map(s => s.key);
  const duplicate = keys.find((k, i) => keys.indexOf(k) !== i);
  if (duplicate) return `Duplicate stage key: ${duplicate}`;

  for (const stage of stages || []) {
    const targets = [stage.nextStageKey, stage.skipToStageKey, ...(stage.allowedNextStageKeys || [])];
    for (const target of targets) {
      if (target && !keys.includes(target)) {
        return `Stage "${stage.key}" points at unknown stage "${target}"`;
      }
    }
  }

  // Finalize stages assign the member ID. If approval ends the workflow, or the
  // normal path never forwards to them, approved applications finish without one.
  const finalizers = (stages || []).filter(s => s.kind === 'finalize');
  if (finalizers.length) {
    const endingDecision = stages.find(s => s.kind === 'decision' && (s.isTerminal || !s.nextStageKey));
    if (endingDecision) {
      return `"${endingDecision.name}" ends the workflow when approved, so "${finalizers[0].name}" is never reached. Set its "Forwards to" to the next stage.`;
    }

    const byKey = new Map(stages.map(s => [s.key, s]));
    const orderOf = (s) => s.order ?? stages.indexOf(s) + 1;
    const first = [...stages].sort((a, b) => orderOf(a) - orderOf(b))[0];
    const reached = new Set();
    const pending = [first];
    while (pending.length) {
      const stage = pending.pop();
      if (!stage || reached.has(stage.key)) continue;
      reached.add(stage.key);
      if (!stage.isTerminal) pending.push(byKey.get(stage.nextStageKey), byKey.get(stage.skipToStageKey));
    }
    const unreachable = finalizers.find(s => !reached.has(s.key));
    if (unreachable) {
      return `"${unreachable.name}" can never be reached: no stage forwards to it. Set "Forwards to" on the stage before it.`;
    }
  }
  return null;
}

workflowSchema.pre('validate', function (next) {
  const error = stageGraphError(this.stages);
  next(error ? new Error(error) : undefined);
});

// Convenience accessors used throughout routes/members/applications.js
workflowSchema.methods.stageByKey = function (key) {
  return (this.stages || []).find(s => s.key === key) || null;
};

workflowSchema.methods.firstStage = function () {
  return [...(this.stages || [])].sort((a, b) => a.order - b.order)[0] || null;
};

module.exports = membersConnection.model('Workflow', workflowSchema);
module.exports.STAGE_KINDS = STAGE_KINDS;
module.exports.stageGraphError = stageGraphError;
