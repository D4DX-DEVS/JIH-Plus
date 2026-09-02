/**
 * Shared sub-schemas for the Members Application form builder.
 *
 * Structurally identical to models/ihthisabi/dynamicReportSchemas.js (and, through
 * it, to the JIH portal's models/report.js) so the same frontend builder and
 * renderer components drive all three sections.
 *
 * The one addition is audience scoping. A members form holds both the applicant's
 * own questions and the per-role comment sections (Unit Admin Comment, District
 * Admin Comment, ...). `audience` marks which of the two a page or field is, and
 * `audienceRole` names the Role.key that owns it. Applicants only ever receive
 * fields where audience === 'applicant'; a reviewer may only write fields whose
 * audienceRole is their own role. Enforced server-side in routes/members/.
 */

const mongoose = require('mongoose');

const FIELD_TYPES = [
  'text', 'email', 'phone', 'number', 'date', 'datetime', 'time',
  'textarea', 'password', 'url', 'file',
  'select', 'dropdown', 'radio', 'checkbox', 'multiselect', 'yesno',
  'title', 'html', 'group', 'page', 'row', 'column'
];

const FIELD_WIDTHS = ['full', 'three-quarters', 'two-thirds', 'half', 'third', 'quarter'];

const CONDITION_OPERATORS = ['equals', 'not_equals', 'contains', 'not_empty', 'empty', ''];
const CONDITION_ACTIONS = ['show', 'hide', 'require', 'optional', ''];

const AUDIENCES = ['applicant', 'role'];

const fieldSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  label: { type: String, default: '', maxlength: 2000 },
  type: { type: String, required: true, enum: FIELD_TYPES },
  required: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  placeholder: { type: String, default: '', maxlength: 500 },
  helpText: { type: String, default: '', maxlength: 1000 },
  // Who this field belongs to. 'applicant' fields go into Application.formData;
  // 'role' fields go into Application.roleData and are hidden from the applicant.
  audience: { type: String, enum: AUDIENCES, default: 'applicant' },
  audienceRole: { type: String, default: '' },
  // Layout width on the 12-column form grid; narrower fields share a line.
  width: { type: String, enum: FIELD_WIDTHS, default: 'full' },
  options: [{ type: String, maxlength: 200 }],
  validation: {
    pattern: { type: String, default: '' },
    minLength: { type: Number },
    maxLength: { type: Number },
    min: { type: Number },
    max: { type: Number },
    customMessage: { type: String, default: '' }
  },
  // Row/Column table config
  columns: { type: Number },
  columnTitles: [{ type: String }],
  rows: { type: Number },
  rowTitles: [{ type: String }],
  firstColumnHeader: { type: String, default: '' },
  columnMeta: [{
    kind: { type: String, enum: ['input', 'static'], default: 'input' },
    inputType: { type: String, enum: ['text', 'number'], default: 'text' },
    _id: false
  }],
  rowMeta: [{
    kind: { type: String, enum: ['input', 'static'], default: 'input' },
    _id: false
  }],
  staticCells: { type: mongoose.Schema.Types.Mixed, default: {} },
  sumRow: { type: Boolean, default: false },
  sumColumn: { type: Boolean, default: false },
  sumRowLabel: { type: String, default: 'Total' },
  sumColumnLabel: { type: String, default: 'Total' },
  conditionalLogic: {
    field: { type: Number },
    operator: { type: String, enum: CONDITION_OPERATORS },
    value: { type: String, default: '' },
    action: { type: String, enum: CONDITION_ACTIONS, default: 'show' }
  }
}, { _id: false });

const pageSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  title: { type: String, default: '', maxlength: 200 },
  description: { type: String, default: '', maxlength: 1000 },
  order: { type: Number, default: 0 },
  // A whole page can belong to one role — the usual shape for a comment section.
  // Fields inside inherit the page's audience unless they set their own.
  audience: { type: String, enum: AUDIENCES, default: 'applicant' },
  audienceRole: { type: String, default: '' },
  fields: [fieldSchema]
}, { _id: false });

module.exports = {
  fieldSchema,
  pageSchema,
  FIELD_TYPES,
  FIELD_WIDTHS,
  CONDITION_OPERATORS,
  CONDITION_ACTIONS,
  AUDIENCES
};
