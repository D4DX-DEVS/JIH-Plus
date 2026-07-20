const mongoose = require('mongoose');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  district: {
    type: String,
    required: true,
    trim: true
  },
  area: {
    type: String,
    required: true,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  ruknName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Rukn name cannot exceed 100 characters']
  },
  ruknId: {
    type: String,
    trim: true,
    maxlength: [50, 'Rukn ID cannot exceed 50 characters']
  },
  form: {
    quranStudy: {
      status: {
        type: String,
        enum: ['complete', 'partial', 'none'],
        default: 'none'
      },
      others: {
        type: String,
        trim: true,
        maxlength: [200, 'Others field cannot exceed 200 characters']
      }
    },
    hadithCount: {
      type: Number,
      default: 0,
      min: [0, 'Hadith count cannot be negative'],
      max: [1000, 'Hadith count cannot exceed 1000']
    },
    bookReading: {
      islami: {
        type: String,
        enum: ['complete', 'partial', 'notread'],
        default: 'notread'
      },
      atma: {
        type: String,
        enum: ['complete', 'partial', 'notread'],
        default: 'notread'
      },
      others: {
        type: String,
        trim: true,
        maxlength: [200, 'Others field cannot exceed 200 characters']
      }
    },
    weeklyMeeting: {
      hadir: {
        type: Number,
        default: 0,
        min: [0, 'Count cannot be negative'],
        max: [100, 'Count cannot exceed 100']
      },
      leave: {
        type: Number,
        default: 0,
        min: [0, 'Count cannot be negative'],
        max: [100, 'Count cannot exceed 100']
      },
      absent: {
        type: Number,
        default: 0,
        min: [0, 'Count cannot be negative'],
        max: [100, 'Count cannot exceed 100']
      }
    },
    jamaathMeeting: {
      hadir: {
        type: Number,
        default: 0,
        min: [0, 'Count cannot be negative'],
        max: [100, 'Count cannot exceed 100']
      },
      leave: {
        type: Number,
        default: 0,
        min: [0, 'Count cannot be negative'],
        max: [100, 'Count cannot exceed 100']
      },
      absent: {
        type: Number,
        default: 0,
        min: [0, 'Count cannot be negative'],
        max: [100, 'Count cannot exceed 100']
      }
    },
    grihameetings: {
      type: Number,
      default: 0,
      min: [0, 'Griha meetings count cannot be negative'],
      max: [10, 'Griha meetings count cannot exceed 10']
    },
    thahreekiMeetings: {
      type: Number,
      default: 0,
      min: [0, 'Thahreeki meetings count cannot be negative'],
      max: [10, 'Thahreeki meetings count cannot exceed 10']
    },
    baithulmaal: {
      type: String,
      enum: ['complete', 'partial', 'incomplete'],
      default: 'incomplete'
    },
    zakatPaid: {
      type: String,
      enum: ['yes', 'no', 'notApplicable'],
      default: 'no'
    },
    recruitEffort: {
      type: String,
      enum: ['satisfactory', 'unsatisfactory', null],
      default: null,
      set: v => (v === '' ? null : v)
    },
    newMembers: {
      type: Number,
      default: 0,
      min: [0, 'New members count cannot be negative'],
      max: [50, 'New members count cannot exceed 50']
    },
    muslimRelations: {
      type: Number,
      default: 0,
      min: [0, 'Muslim relations count cannot be negative'],
      max: [100, 'Muslim relations count cannot exceed 100']
    },
    communityRelations: {
      type: Number,
      default: 0,
      min: [0, 'Community relations count cannot be negative'],
      max: [100, 'Community relations count cannot exceed 100']
    },
    scoreCount: {
      type: Number,
      default: 0,
      min: [0, 'Score count cannot be negative'],
      max: [100, 'Score count cannot exceed 100']
    },
    meqathService: {
      type: String,
      enum: ['yes', 'no'],
      default: 'no'
    },
    skillUsage: {
      type: String,
      enum: ['yes', 'no'],
      default: 'no'
    },
    jamaathAgenda: {
      type: String,
      enum: ['yes', 'no', 'almost', null],
      default: null,
      set: v => (v === '' ? null : v)
    },
    jamaathInfluence: {
      type: String,
      enum: ['yes', 'no', 'small'],
      default: 'no'
    },
    suggestions: {
      type: String,
      trim: true,
      maxlength: [1000, 'Suggestions cannot exceed 1000 characters'],
      default: null,
      set: v => (v === '' ? null : v)
    }
  },
  dynamicFormId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApplicationForm',
    default: null
  },
  dynamicFormData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  submissionPeriod: {
    year: {
      type: Number,
      required: true
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    quarter: {
      type: Number,
      required: true,
      min: 1,
      max: 4
    }
  },
  status: {
    type: String,
    enum: ['submitted', 'reviewed', 'approved'],
    default: 'submitted'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  adminReply: {
    message: {
      type: String,
      trim: true
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    repliedAt: {
      type: Date
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
submissionSchema.index({ userId: 1 });
submissionSchema.index({ submittedBy: 1 });
submissionSchema.index({ district: 1, area: 1, unit: 1 });
submissionSchema.index({ submissionPeriod: 1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ createdAt: -1 });

// Compound index to ensure one submission per user per quarter
submissionSchema.index(
  { userId: 1, 'submissionPeriod.year': 1, 'submissionPeriod.quarter': 1 },
  { unique: true }
);
submissionSchema.index(
  { submittedBy: 1, 'submissionPeriod.year': 1, 'submissionPeriod.quarter': 1 },
  { unique: true }
);

// Virtual for submission period display
submissionSchema.virtual('periodDisplay').get(function() {
  if (!this.submissionPeriod) {
    return 'N/A';
  }
  
  const quarterInfo = {
    1: 'Q1 (Jan-Mar)',
    2: 'Q2 (Apr-Jun)', 
    3: 'Q3 (Jul-Sep)',
    4: 'Q4 (Oct-Dec)'
  };
  
  // If quarter is available, use it
  if (this.submissionPeriod.quarter) {
    return `${quarterInfo[this.submissionPeriod.quarter]} ${this.submissionPeriod.year}`;
  }
  
  // If only month is available, calculate quarter from month
  if (this.submissionPeriod.month) {
    const quarter = getQuarterFromMonth(this.submissionPeriod.month);
    return `${quarterInfo[quarter]} ${this.submissionPeriod.year}`;
  }
  
  // Fallback to just year
  return this.submissionPeriod.year || 'N/A';
});

// Virtual for location display
submissionSchema.virtual('locationDisplay').get(function() {
  return `${this.district} - ${this.area} - ${this.unit}`;
});

const { getQuarterFromMonth, getAvailableSubmissionQuarter } = require('../../utils/quarterHelper');

// Pre-save middleware to set submission period and sync userId/submittedBy
submissionSchema.pre('save', function(next) {
  if (this.isNew) {
    // DEBUG: Log submissionPeriod before pre-save processing
    console.log('[Submission Pre-Save] Incoming submissionPeriod:', JSON.stringify(this.submissionPeriod));
    
    // Only set submissionPeriod if it wasn't already provided or is incomplete
    // This allows routes to explicitly set quarter/year from request body
    if (!this.submissionPeriod || !this.submissionPeriod.year || !this.submissionPeriod.quarter) {
      console.log('[Submission Pre-Save] submissionPeriod incomplete, setting defaults');
      const now = new Date();
      const month = now.getMonth() + 1;
      
      // Use available submission quarter logic (previous completed quarter)
      const available = getAvailableSubmissionQuarter(now);
      
      this.submissionPeriod = {
        year: available.year,
        month: month,
        quarter: available.quarter
      };
    } else {
      console.log('[Submission Pre-Save] submissionPeriod is complete, keeping provided values');
    }
    
    // DEBUG: Log submissionPeriod after pre-save processing
    console.log('[Submission Pre-Save] Final submissionPeriod:', JSON.stringify(this.submissionPeriod));
  }
  
  // Migration: If quarter is missing but month exists, calculate it
  if (this.submissionPeriod && this.submissionPeriod.month && !this.submissionPeriod.quarter) {
    // Use standard quarter calculation for existing data
    this.submissionPeriod.quarter = getQuarterFromMonth(this.submissionPeriod.month);
  }
  
  // Ensure submittedBy and userId are always the same
  if (this.userId && !this.submittedBy) {
    this.submittedBy = this.userId;
  } else if (this.submittedBy && !this.userId) {
    this.userId = this.submittedBy;
  }
  
  // If both are provided, ensure they match
  if (this.userId && this.submittedBy && !this.userId.equals(this.submittedBy)) {
    this.submittedBy = this.userId;
  }
  
  next();
});

module.exports = ihthisabiConnection.model('Submission', submissionSchema);
