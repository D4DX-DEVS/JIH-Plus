const mongoose = require('mongoose');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

const dynamicReportSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    titleBase: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    parts: [{
        partName: {
            type: String,
            required: true
        },
        partOrder: {
            type: Number,
            required: true,
            default: 0
        },
        questions: [{
            questionText: {
                type: String,
                required: true
            },
            questionOrder: {
                type: Number,
                required: true,
                default: 0
            },
            answerType: {
                type: String,
                enum: ['text', 'number', 'radio', 'dropdown', 'textarea', 'date', 'checkbox'],
                required: true
            },
            options: [{
                type: String
            }], // For radio, dropdown, checkbox
            isRequired: {
                type: Boolean,
                default: false
            },
            placeholder: {
                type: String,
                default: ''
            }
        }]
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    scheduledFor: {
        type: Date, // When this report becomes available (creation date for current month instances, 1st for auto-generated ones)
        default: null
    },
    recurringMonthly: {
        type: Boolean,
        default: false // True only for the original template that should spawn new reports every month
    },
    month: {
        type: Number, // 1-12: indicates which month this particular report instance belongs to
        min: 1,
        max: 12
    },
    year: {
        type: Number, // Year for this particular report instance
        min: 2000, // Reasonable minimum year
        max: 2100 // Reasonable maximum year
    },
    templateRootId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DynamicReport',
        default: null, // Points to the original report that serves as the recurring template
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

// Custom validation: validate month/year only when provided
dynamicReportSchema.pre('validate', function(next) {
    if (this.month && (!Number.isInteger(this.month) || this.month < 1 || this.month > 12)) {
        this.invalidate('month', 'Month must be between 1 and 12');
    }
    if (this.year && (!Number.isInteger(this.year) || this.year < 2000 || this.year > 2100)) {
        this.invalidate('year', 'Year must be a valid year');
    }
    next();
});

// Validate that options are provided for radio, dropdown, and checkbox answer types
dynamicReportSchema.pre('validate', function(next) {
    if (this.parts && Array.isArray(this.parts)) {
        for (const part of this.parts) {
            if (part.questions && Array.isArray(part.questions)) {
                for (const question of part.questions) {
                    if (['radio', 'dropdown', 'checkbox'].includes(question.answerType)) {
                        if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
                            this.invalidate('parts', `Question "${question.questionText}" with answerType "${question.answerType}" must have options`);
                        }
                    }
                }
            }
        }
    }
    next();
});

// Indexes for better query performance
dynamicReportSchema.index({ isActive: 1 });
dynamicReportSchema.index({ createdAt: -1 });
dynamicReportSchema.index({ month: 1, year: 1 });
dynamicReportSchema.index({ templateRootId: 1, month: 1, year: 1 });
dynamicReportSchema.index({ recurringMonthly: 1, isActive: 1 });

module.exports = ihthisabiConnection.model('DynamicReport', dynamicReportSchema);