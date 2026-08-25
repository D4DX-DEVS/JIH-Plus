/**
 * Shared sub-schemas for the ihthisabi pages/fields report builder.
 *
 * Mirrors the JIH portal's Report model (backend/models/report.js) so the same
 * frontend builder + renderer components drive both portals. One deliberate
 * difference: the conditionalLogic operator enum lists exactly the values the
 * editor emits and the renderer evaluates ('not_empty' / 'empty'), rather than
 * the 'is_empty' / 'is_not_empty' spellings, which no UI ever produces.
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

const fieldSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  label: { type: String, default: '', maxlength: 2000 },
  type: { type: String, required: true, enum: FIELD_TYPES },
  required: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  placeholder: { type: String, default: '', maxlength: 500 },
  helpText: { type: String, default: '', maxlength: 1000 },
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
  fields: [fieldSchema]
}, { _id: false });

module.exports = { fieldSchema, pageSchema, FIELD_TYPES, FIELD_WIDTHS, CONDITION_OPERATORS, CONDITION_ACTIONS };
