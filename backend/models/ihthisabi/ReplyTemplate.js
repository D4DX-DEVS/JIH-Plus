const mongoose = require('mongoose');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

// One reply template per report quarter (year + quarter), built from that
// quarter's form questions. A template is an ordered list of paragraphs:
//   { kind: 'text', text }  — fixed text with {unit}/{quarter}/... placeholders
//   { kind: 'members', conditions, match, text, emptyMode, emptyText, ... }
//       — lists the unit members who match the conditions; text uses {names}
//         and {count}. Rendering lives in frontend/src/utils/ihthisabi/replyTemplateEngine.js.
//
// Before per-quarter templates existed a single global document held
// `blocks` keyed to hard-coded field names. That document (year: null) is
// kept so admins can import its wording; it is never rendered any more.

const conditionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['status', 'question'], required: true },
    // type 'status'
    status: { type: String, enum: ['reported', 'form', 'alternative', 'pending', 'all'] },
    // type 'question'
    questionId: { type: String },
    subFieldId: { type: String },
    op: {
      type: String,
      enum: ['in', 'notIn', 'eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between', 'answered', 'blank', 'contains']
    },
    values: { type: [String], default: undefined },
    value: { type: Number },
    value2: { type: Number }
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    id: { type: String },
    kind: { type: String, enum: ['text', 'members'], required: true },
    text: { type: String, default: '' },
    match: { type: String, enum: ['all', 'any'], default: 'all' },
    conditions: { type: [conditionSchema], default: undefined },
    emptyMode: { type: String, enum: ['skip', 'text'], default: 'skip' },
    emptyText: { type: String, default: '' },
    listStyle: { type: String, enum: ['comma', 'lines', 'numbered'], default: 'comma' },
    showValue: { type: Boolean, default: false },
    limit: { type: Number, default: null }
  },
  { _id: false }
);

// Legacy global-template block (read-only, see note above)
const legacyBlockSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['static', 'data'], required: true },
    text: { type: String, default: '' },
    fieldKey: { type: String, default: null },
    nameProperty: { type: String, default: null },
    limit: { type: Number, default: null },
    condition: {
      operator: { type: String, enum: ['gt', 'gte', 'lt', 'lte', 'eq'], default: 'gt' },
      value: { type: Number, default: 0 }
    },
    textTemplate: { type: String, default: '' },
    elseText: { type: String, default: '' }
  },
  { _id: false }
);

const replyTemplateSchema = new mongoose.Schema(
  {
    year: { type: Number, default: null },
    quarter: { type: Number, default: null, min: 1, max: 4 },
    sections: { type: [sectionSchema], default: undefined },
    blocks: { type: [legacyBlockSchema], default: undefined },
    updatedBy: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

replyTemplateSchema.index({ year: 1, quarter: 1 }, { unique: true });

const ReplyTemplate = ihthisabiConnection.model('ReplyTemplate', replyTemplateSchema);

module.exports = ReplyTemplate;
