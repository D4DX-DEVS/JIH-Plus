const mongoose = require('mongoose');

const reportSubmissionSchema = new mongoose.Schema({
    reportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // New: formData stores field values as { "field_<id>": value }
    // Used for reports built with the pages/fields form builder
    formData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    reportVersion: {
        type: Number,
        default: 1
    },
    // Legacy: answers array for old parts/questions-based reports
    answers: [{
        partId: { type: String },
        questionId: { type: String },
        answer: { type: mongoose.Schema.Types.Mixed },
        answeredAt: { type: Date, default: Date.now }
    }],
    status: {
        type: String,
        enum: ['pending', 'submitted'],
        default: 'pending'
    },
    // Index of the page the user last saved/submitted on (for resuming drafts)
    lastPage: {
        type: Number,
        default: 0
    },
    submittedAt: {
        type: Date
    },
    // Denormalized from Report for efficient month/year/quarter filtering
    month: { type: Number, min: 1, max: 12, default: null },
    year: { type: Number, default: null },
    quarter: { type: Number, min: 1, max: 4, default: null }
}, { timestamps: true });

// Compound indexes for efficient queries
reportSubmissionSchema.index({ reportId: 1, userId: 1 });
reportSubmissionSchema.index({ userId: 1, status: 1 });
reportSubmissionSchema.index({ submittedAt: -1 });
reportSubmissionSchema.index({ month: 1, year: 1 });
reportSubmissionSchema.index({ year: 1 });

module.exports = mongoose.model('ReportSubmission', reportSubmissionSchema);

