const mongoose = require('mongoose');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

const answerSchema = new mongoose.Schema(
  {
    partOrder: { type: Number, required: true },
    partName: { type: String, required: true },
    questionOrder: { type: Number, required: true },
    questionText: { type: String, required: true },
    answerType: {
      type: String,
      enum: ['text', 'number', 'radio', 'dropdown', 'textarea', 'date', 'checkbox'],
      required: true
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { _id: false }
);

const dynamicReportSubmissionSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DynamicReport',
      required: true,
      index: true
    },
    templateRootId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DynamicReport',
      index: true
    },
    reportType: {
      type: String,
      enum: ['monthly', 'special'],
      required: true
    },
    month: { type: Number, min: 1, max: 12 },
    year: { type: Number, min: 2000, max: 2100 },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    submittedRole: {
      type: String,
      enum: ['unitAdmin', 'rukn'],
      required: true
    },
    answers: {
      type: [answerSchema],
      required: true,
      validate: v => Array.isArray(v) && v.length > 0
    },
    reply: {
      message: { type: String, trim: true, maxlength: 2000 },
      repliedAt: { type: Date },
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
  },
  { timestamps: true }
);

// One submission per report per user
dynamicReportSubmissionSchema.index({ reportId: 1, submittedBy: 1 }, { unique: true });
dynamicReportSubmissionSchema.index({ submittedBy: 1, submittedRole: 1 });
dynamicReportSubmissionSchema.index({ month: 1, year: 1, reportType: 1 });
dynamicReportSubmissionSchema.index({ createdAt: -1 });

module.exports = ihthisabiConnection.model('DynamicReportSubmission', dynamicReportSubmissionSchema);

