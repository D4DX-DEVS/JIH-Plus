const mongoose = require('mongoose');
const ihthisabiConnection = require('../../config/ihthisabiConnection');
const { getQuarterFromMonth, getAvailableSubmissionQuarter } = require('../../utils/quarterHelper');

const alternativeSubmitSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['Aged', 'Patient'],
        required: true
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
    reason: {
        type: String,
        required: false,
        trim: true,
        maxlength: [1000, 'Reason cannot exceed 1000 characters']
    },
    adminReply: {
        message: {
            type: String,
            trim: true,
            maxlength: [2000, 'Reply message cannot exceed 2000 characters']
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
alternativeSubmitSchema.index({ userId: 1 });
alternativeSubmitSchema.index({ district: 1, area: 1, unit: 1 });
alternativeSubmitSchema.index({ 'submissionPeriod.year': 1, 'submissionPeriod.quarter': 1 });
alternativeSubmitSchema.index({ createdAt: -1 });

// Compound index to ensure one alternative submission per user per quarter
alternativeSubmitSchema.index(
    { userId: 1, 'submissionPeriod.year': 1, 'submissionPeriod.quarter': 1 },
    { unique: true }
);

// Virtual for submission period display
alternativeSubmitSchema.virtual('periodDisplay').get(function() {
    if (!this.submissionPeriod) {
        return 'N/A';
    }
    
    const quarterInfo = {
        1: 'Q1 (Jan-Mar)',
        2: 'Q2 (Apr-Jun)', 
        3: 'Q3 (Jul-Sep)',
        4: 'Q4 (Oct-Dec)'
    };
    
    if (this.submissionPeriod.quarter) {
        return `${quarterInfo[this.submissionPeriod.quarter]} ${this.submissionPeriod.year}`;
    }
    
    if (this.submissionPeriod.month) {
        const quarter = getQuarterFromMonth(this.submissionPeriod.month);
        return `${quarterInfo[quarter]} ${this.submissionPeriod.year}`;
    }
    
    return this.submissionPeriod.year || 'N/A';
});

// Virtual for location display
alternativeSubmitSchema.virtual('locationDisplay').get(function() {
    return `${this.district} - ${this.area} - ${this.unit}`;
});

// Pre-save middleware to set submission period
alternativeSubmitSchema.pre('save', function(next) {
    if (this.isNew) {
        const now = new Date();
        const month = now.getMonth() + 1;
        
        // Use available submission quarter logic (previous completed quarter)
        const available = getAvailableSubmissionQuarter(now);
        
        // Only set if not already provided
        if (!this.submissionPeriod || !this.submissionPeriod.year) {
            this.submissionPeriod = {
                year: available.year,
                month: month,
                quarter: available.quarter
            };
        }
    }
    
    // Migration: If quarter is missing but month exists, calculate it
    if (this.submissionPeriod && this.submissionPeriod.month && !this.submissionPeriod.quarter) {
        this.submissionPeriod.quarter = getQuarterFromMonth(this.submissionPeriod.month);
    }
    
    next();
});

module.exports = ihthisabiConnection.model('AlternativeSubmit', alternativeSubmitSchema);