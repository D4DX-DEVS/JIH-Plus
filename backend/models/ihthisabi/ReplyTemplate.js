const mongoose = require('mongoose');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

// A single global document stores the admin-configured reply template.
// Each block is either:
//   { type: 'static', text: '...' }
//   { type: 'data', fieldKey: '...', nameProperty: null|'name', limit: null|number,
//     condition: { operator: 'gt'|'gte'|'lt'|'lte'|'eq', value: number },
//     textTemplate: '...{names}...{count}...{unit}...{quarter}...{year}...',
//     elseText: '...' }
const blockSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['static', 'data'], required: true },
    // Static block fields
    text: { type: String, default: '' },
    // Data block fields
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
    blocks: { type: [blockSchema], required: true },
    updatedBy: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

// Singleton helper: always returns the one document (or null if never saved).
replyTemplateSchema.statics.getSingleton = async function () {
  return this.findOne({});
};

const ReplyTemplate = ihthisabiConnection.model('ReplyTemplate', replyTemplateSchema);

module.exports = ReplyTemplate;
