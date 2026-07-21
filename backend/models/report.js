const mongoose = require('mongoose');

// ─── Field sub-schema (mirrors FORM_CONFIGURATION_GUIDE) ─────────────────────
const fieldSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    label: { type: String, required: true, maxlength: 200 },
    type: {
        type: String,
        required: true,
        enum: [
            'text', 'email', 'phone', 'number', 'date', 'datetime', 'time',
            'textarea', 'password', 'url', 'file',
            'select', 'dropdown', 'radio', 'checkbox', 'multiselect', 'yesno',
            'title', 'html', 'group', 'page', 'row', 'column'
        ]
    },
    required: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    placeholder: { type: String, default: '', maxlength: 500 },
    helpText: { type: String, default: '', maxlength: 1000 },
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
    // Advanced table: per-column/row static-vs-input config, admin static cell
    // values, and optional auto-totals. See frontend utils/rowColumnTable.js.
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
    // Conditional logic
    conditionalLogic: {
        field: { type: Number },
        operator: {
            type: String,
            enum: ['equals', 'not_equals', 'contains', 'not_contains',
                   'greater_than', 'less_than', 'is_empty', 'is_not_empty', '']
        },
        value: { type: String, default: '' },
        action: {
            type: String,
            enum: ['show', 'hide', 'require', 'optional', ''],
            default: 'show'
        }
    }
}, { _id: false });

// ─── Page sub-schema ──────────────────────────────────────────────────────────
const pageSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 1000 },
    order: { type: Number, default: 0 },
    fields: [fieldSchema],
    conditionalLogic: {
        field: { type: Number },
        operator: { type: String, default: '' },
        value: { type: String, default: '' }
    }
}, { _id: false });

// ─── Main Report schema ───────────────────────────────────────────────────────
const reportSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['monthly', 'special', 'yearly', 'quarterly'],
        required: true
    },
    reportFor: {
        type: String,
        enum: ['district', 'area', 'unit'],
        required: true
    },
    title: { type: String, required: true },
    titleBase: { type: String, default: '' },
    description: { type: String, default: '' },

    // ── New: pages-based form structure (full form builder) ──
    pages: [pageSchema],

    // ── Legacy: parts-based structure (kept read-only for old data) ──
    parts: [{
        partName: { type: String },
        partOrder: { type: Number, default: 0 },
        questions: [{
            questionText: { type: String },
            questionOrder: { type: Number, default: 0 },
            answerType: {
                type: String,
                enum: ['text', 'number', 'radio', 'dropdown', 'textarea', 'date', 'checkbox']
            },
            options: [{ type: String }],
            isRequired: { type: Boolean, default: false },
            placeholder: { type: String, default: '' }
        }]
    }],

    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },

    // Scheduling
    scheduledFor: { type: Date, default: null },
    recurringMonthly: { type: Boolean, default: false },
    recurringYearly: { type: Boolean, default: false },
    recurringQuarterly: { type: Boolean, default: false },
    // Quarter anchor: the exact start date for a quarterly template
    quarterStartDate: { type: Date, default: null },
    month: { type: Number, min: 1, max: 12 },
    quarter: { type: Number, min: 1, max: 4 },
    year: { type: Number },
    templateRootId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report',
        default: null,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Indexes for better query performance
reportSchema.index({ type: 1, isActive: 1 });
reportSchema.index({ reportFor: 1, isActive: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ type: 1, scheduledFor: 1 });
reportSchema.index({ type: 1, month: 1, year: 1 });
reportSchema.index({ templateRootId: 1, month: 1, year: 1 });
reportSchema.index({ type: 1, quarter: 1, year: 1 });
reportSchema.index({ templateRootId: 1, quarter: 1, year: 1 });

module.exports = mongoose.model('Report', reportSchema);