const mongoose = require('mongoose');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

const optionSchema = new mongoose.Schema({
  value: { type: String, required: true },
  label: { type: String, required: true },
  labelMl: { type: String }
}, { _id: false });

const subFieldSchema = new mongoose.Schema({
  fieldId: { type: String, required: true },
  label: { type: String, required: true },
  labelMl: { type: String },
  type: { type: String, enum: ['number', 'text'], default: 'number' },
  min: { type: Number },
  max: { type: Number },
  placeholder: { type: String }
}, { _id: false });

const questionSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  questionTextMl: { type: String },
  answerType: {
    type: String,
    enum: ['text', 'number', 'radio', 'dropdown', 'star', 'textarea', 'checkbox', 'group'],
    required: true
  },
  options: [optionSchema],
  isRequired: { type: Boolean, default: true },
  order: { type: Number, required: true },
  section: { type: String },
  sectionMl: { type: String },
  placeholder: { type: String },
  min: { type: Number },
  max: { type: Number },
  maxLength: { type: Number },
  subFields: [subFieldSchema]
}, { _id: false });

const applicationFormSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  quarter: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  year: {
    type: Number,
    required: true,
    min: 2020,
    max: 2050
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  questions: {
    type: [questionSchema],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Form must have at least one question'
    }
  },
  clonedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApplicationForm'
  },
  createdBy: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

applicationFormSchema.index({ quarter: 1, year: 1 }, { unique: true });
applicationFormSchema.index({ status: 1 });
applicationFormSchema.index({ createdAt: -1 });

applicationFormSchema.virtual('periodDisplay').get(function() {
  const quarterNames = {
    1: 'Q1 (Jan-Mar)',
    2: 'Q2 (Apr-Jun)',
    3: 'Q3 (Jul-Sep)',
    4: 'Q4 (Oct-Dec)'
  };
  return `${quarterNames[this.quarter] || `Q${this.quarter}`} ${this.year}`;
});

applicationFormSchema.pre('save', function(next) {
  if (this.questions) {
    this.questions.forEach((q, index) => {
      if (!q.questionId) {
        q.questionId = `q_${index + 1}_${Date.now()}`;
      }
      if (q.order === undefined || q.order === null) {
        q.order = index + 1;
      }
      if (['radio', 'dropdown', 'checkbox'].includes(q.answerType) && (!q.options || q.options.length === 0)) {
        throw new Error(`Question "${q.questionText}" of type ${q.answerType} must have at least one option`);
      }
      if (q.answerType === 'group' && (!q.subFields || q.subFields.length === 0)) {
        throw new Error(`Question "${q.questionText}" of type group must have at least one sub-field`);
      }
    });
  }
  next();
});

module.exports = ihthisabiConnection.model('ApplicationForm', applicationFormSchema);
