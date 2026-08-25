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
    value: { type: mongoose.Schema.Types.Mixed }
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
      enum: ['unitAdmin', 'rukn', 'mekhalaNazim'],
      required: true
    },
    // Values for pages/fields reports, keyed "field_<id>" by the shared renderer.
    // Legacy parts/questions reports keep using `answers` below.
    formData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Page the submitter last saved on, so a draft resumes where they left off.
    lastPage: {
      type: Number,
      default: 0
    },
    // 'draft' rows are private work-in-progress; only 'submitted' rows reach the admin.
    status: {
      type: String,
      enum: ['draft', 'submitted'],
      default: 'submitted',
      index: true
    },
    submittedAt: { type: Date },
    answers: {
      type: [answerSchema],
      default: [],
      validate: {
        validator: function (v) {
          if (!Array.isArray(v)) return false;
          // Drafts may be empty, and pages/fields reports carry their values in
          // `formData` instead — only a legacy submission must have answers.
          if (this.status === 'draft') return true;
          if (this.formData && Object.keys(this.formData).length > 0) return true;
          return v.length > 0;
        },
        message: 'Answers are required'
      }
    },
    reply: {
      message: { type: String, trim: true, maxlength: 2000 },
      repliedAt: { type: Date },
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
  },
  { timestamps: true }
);

// One submission (draft or submitted) per report per user
dynamicReportSubmissionSchema.index({ reportId: 1, submittedBy: 1 }, { unique: true });
dynamicReportSubmissionSchema.index({ submittedBy: 1, submittedRole: 1 });
dynamicReportSubmissionSchema.index({ month: 1, year: 1, reportType: 1 });
dynamicReportSubmissionSchema.index({ createdAt: -1 });

module.exports = ihthisabiConnection.model('DynamicReportSubmission', dynamicReportSubmissionSchema);

