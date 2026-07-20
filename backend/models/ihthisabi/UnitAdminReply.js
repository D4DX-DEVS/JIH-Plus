const mongoose = require('mongoose');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

const unitAdminReplySchema = new mongoose.Schema({
  unit: {
    type: String,
    required: true,
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  submissionPeriod: {
    year: {
      type: Number,
      required: true
    },
    quarter: {
      type: Number,
      required: true,
      min: 1,
      max: 4
    }
  },
  // Structured reply data
  replyData: {
    submittedMembers: [{
      type: String,
      trim: true
    }],
    quranStudyCompleted: [{
      type: String,
      trim: true
    }],
    quranStudyNotCompleted: [{
      type: String,
      trim: true
    }],
    hadithReadingCompleted: [{
      type: String,
      trim: true
    }],
    hadithReadingNotCompleted: [{
      type: String,
      trim: true
    }],
    bookReadingCompleted: [{
      type: String,
      trim: true
    }],
    bookReadingNotCompleted: [{
      type: String,
      trim: true
    }],
    weeklyMeetingAbsentees: [{
      name: {
        type: String,
        trim: true
      },
      leaveCount: {
        type: Number,
        default: 0
      },
      absentCount: {
        type: Number,
        default: 0
      }
    }],
    jamaathMeetingAbsentees: [{
      type: String,
      trim: true
    }],
    baitulmalDefaulters: [{
      type: String,
      trim: true
    }],
    presentationEffort: {
      satisfactory: [{
        type: String,
        trim: true
      }],
      unsatisfactory: [{
        type: String,
        trim: true
      }]
    },
    newMembersTarget: {
      type: String,
      enum: ['met', 'notMet'],
      default: 'notMet'
    },
    muslimRelationsStatus: {
      type: String,
      enum: ['good', 'average', 'needsImprovement'],
      default: 'average'
    },
    jamaathAgendaStatus: {
      type: String,
      enum: ['efficient', 'needsImprovement'],
      default: 'needsImprovement'
    },
    meqathServiceStatus: {
      type: String,
      enum: ['met', 'notMet'],
      default: 'notMet'
    }
  },
  // Final formatted message
  formattedMessage: {
    type: String,
    required: true
  },
  // Reply metadata
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  repliedAt: {
    type: Date,
    default: Date.now
  },
  whatsappSent: {
    type: Boolean,
    default: false
  },
  whatsappSentAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
unitAdminReplySchema.index({ unit: 1, 'submissionPeriod.year': 1, 'submissionPeriod.quarter': 1 });
unitAdminReplySchema.index({ repliedBy: 1 });
unitAdminReplySchema.index({ createdAt: -1 });

// Virtual for period display
unitAdminReplySchema.virtual('periodDisplay').get(function() {
  if (!this.submissionPeriod) {
    return 'N/A';
  }
  
  const quarterInfo = {
    1: 'Q1 (Jan-Mar)',
    2: 'Q2 (Apr-Jun)', 
    3: 'Q3 (Jul-Sep)',
    4: 'Q4 (Oct-Dec)'
  };
  
  return `${quarterInfo[this.submissionPeriod.quarter] || `Q${this.submissionPeriod.quarter}`} ${this.submissionPeriod.year}`;
});

module.exports = ihthisabiConnection.model('UnitAdminReply', unitAdminReplySchema);

