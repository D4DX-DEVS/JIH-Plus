const express = require('express');
const Submission = require('../../models/ihthisabi/Submission');
const AlternativeSubmit = require('../../models/ihthisabi/alternativeSubmit');
const ApplicationForm = require('../../models/ihthisabi/ApplicationForm');
const User = require('../../models/ihthisabi/User');
const { protect, authorize } = require('../../middlewares/ihthisabi/auth');
const { migrateStaticToDynamic } = require('../../utils/staticToDynamicMigration');
const { validate, schemas, validateQuery } = require('../../middlewares/ihthisabi/validation');
const { 
  getAvailableSubmissionQuarter, 
  validateSubmissionQuarter,
  filterHiddenQuarters,
  getHiddenQuarterFilter,
  getArchivedQuarterFilter
} = require('../../utils/quarterHelper');

const router = express.Router();

// Attach the combined quarter filter (static Q3 hide + archived quarters) to every request
router.use(async (req, res, next) => {
  try {
    req.quarterFilter = await getArchivedQuarterFilter();
  } catch (err) {
    req.quarterFilter = getHiddenQuarterFilter();
  }
  next();
});
const OPTIONAL_FORM_FIELDS = ['recruitEffort', 'jamaathAgenda', 'suggestions'];

const validateSubmissionMiddleware = (req, res, next) => {
  if (req.body.dynamicFormData && req.body.dynamicFormId) {
    const { district, area, unit, ruknName } = req.body;
    if (!district || !area || !unit || !ruknName) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'basic', message: 'District, area, unit, and ruknName are required' }]
      });
    }
    return next();
  }
  return validate(schemas.submission)(req, res, next);
};

// Normalize optional form fields to null to keep persistence consistent
const normalizeOptionalFormFields = (form = {}) => {
  const normalized = { ...form };
  OPTIONAL_FORM_FIELDS.forEach(field => {
    if (normalized[field] === undefined || normalized[field] === '') {
      normalized[field] = null;
    }
  });
  return normalized;
};
// Helper function to fetch district data from external API
const fetchDistrictData = async () => {
  try {
    const apiEndpoint = process.env.DISTRICT_API_ENDPOINT;
    
    if (!apiEndpoint) {
      throw new Error('District API endpoint not configured in environment variables');
    }
    
    const response = await axios.get(apiEndpoint);
    
    if (!response.data || !response.data.success) {
      throw new Error('Invalid response from districts API');
    }
    
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching district data:', error);
    throw error;
  }
};

// Helper function to fetch area data from external API
const fetchAreaData = async (districtId) => {
  try {
    const apiEndpoint = process.env.AREA_API_ENDPOINT;
    
    if (!apiEndpoint) {
      throw new Error('Area API endpoint not configured in environment variables');
    }
    
    // Replace {districtId} placeholder in API endpoint if it exists
    const finalEndpoint = apiEndpoint.includes('{districtId}') 
      ? apiEndpoint.replace('{districtId}', encodeURIComponent(districtId))
      : `${apiEndpoint}/${encodeURIComponent(districtId)}`;
    
    const response = await axios.get(finalEndpoint);
    
    if (!response.data || !response.data.success) {
      throw new Error('Invalid response from areas API');
    }
    
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching area data:', error);
    throw error;
  }
};


// @desc    Submit form
// @route   POST /api/submissions
// @access  Private (Rukn only)
router.post('/', protect, authorize('rukn'), validateSubmissionMiddleware, async (req, res) => {
  try {
    const { district, area, unit, ruknName, form, quarter, year, submissionPeriod, dynamicFormId, dynamicFormData } = req.body;
    const isDynamicSubmission = !!(dynamicFormId && dynamicFormData);
    const normalizedForm = isDynamicSubmission ? {} : normalizeOptionalFormFields(form);

    // DEBUG: Log incoming request
    console.log('[Rukn Submit] Incoming request body submissionPeriod:', JSON.stringify(submissionPeriod));
    console.log('[Rukn Submit] Top-level quarter:', quarter, 'year:', year);

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    let finalSubmissionPeriod;
    
    // If submissionPeriod is provided as a complete object, use it directly (after validation)
    if (submissionPeriod && submissionPeriod.year && submissionPeriod.quarter) {
      const validation = validateSubmissionQuarter(submissionPeriod.quarter, submissionPeriod.year, currentDate);
      if (!validation.valid) {
        console.warn('Submission blocked (current/future quarter):', {
          userId: req.user._id,
          quarter: submissionPeriod.quarter,
          year: submissionPeriod.year,
          reason: validation.reason
        });
        return res.status(400).json({
          success: false,
          message: validation.reason
        });
      }
      // Use the provided submissionPeriod, ensuring month is set
      finalSubmissionPeriod = {
        year: submissionPeriod.year,
        quarter: submissionPeriod.quarter,
        month: submissionPeriod.month || currentMonth
      };
    } else {
      // Extract quarter and year from top-level format
      const providedQuarter = quarter || submissionPeriod?.quarter;
      const providedYear = year || submissionPeriod?.year;

      if (providedQuarter && providedYear) {
        const validation = validateSubmissionQuarter(providedQuarter, providedYear, currentDate);
        if (!validation.valid) {
          console.warn('Submission blocked (current/future quarter):', {
            userId: req.user._id,
            quarter: providedQuarter,
            year: providedYear,
            reason: validation.reason
          });
          return res.status(400).json({
            success: false,
            message: validation.reason
          });
        }
        finalSubmissionPeriod = {
          year: providedYear,
          quarter: providedQuarter,
          month: currentMonth
        };
      } else {
        // Use default available quarter
        const available = getAvailableSubmissionQuarter(currentDate);
        finalSubmissionPeriod = {
          year: available.year,
          quarter: available.quarter,
          month: currentMonth
        };
      }
    }

    const submissionYear = finalSubmissionPeriod.year;
    const submissionQuarter = finalSubmissionPeriod.quarter;

    // DEBUG: Log final submission period before creating
    console.log('[Rukn Submit] Final submissionPeriod to be saved:', JSON.stringify(finalSubmissionPeriod));

    // CRITICAL: Check if user has already submitted alternative submission for this quarter
    const existingAlternativeSubmission = await AlternativeSubmit.findOne({
      userId: req.user._id,
      'submissionPeriod.year': submissionYear,
      'submissionPeriod.quarter': submissionQuarter
    });

    if (existingAlternativeSubmission) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an alternative submission for this quarter. Cannot submit regular submission for the same quarter.'
      });
    }

    // Check if user has already submitted regular submission for this quarter
    const existingSubmission = await Submission.findOne({
      userId: req.user._id,
      'submissionPeriod.year': submissionYear,
      'submissionPeriod.quarter': submissionQuarter
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted for this quarter'
      });
    }

    // Get ruknId from user (should be available in req.user from auth middleware)
    const userRuknId = req.user.ruknId;

    // Build submission data
    const submissionData = {
      userId: req.user._id,
      submittedBy: req.user._id,
      district,
      area,
      unit,
      ruknName,
      ruknId: userRuknId,
      submissionPeriod: finalSubmissionPeriod
    };

    if (isDynamicSubmission) {
      const appForm = await ApplicationForm.findOne({
        _id: dynamicFormId,
        status: 'published',
        quarter: submissionQuarter,
        year: submissionYear
      });
      if (!appForm) {
        return res.status(400).json({
          success: false,
          message: 'The dynamic form for this quarter is not available or has been unpublished'
        });
      }
      submissionData.dynamicFormId = dynamicFormId;
      submissionData.dynamicFormData = dynamicFormData;
    } else {
      submissionData.form = normalizedForm;
    }

    // Create submission
    const submission = await Submission.create(submissionData);

    // Populate user details
    await submission.populate('userId', 'username name');
    await submission.populate('submittedBy', 'username name');

    // DEBUG: Log saved submission period
    console.log('[Rukn Submit] Saved submission submissionPeriod:', JSON.stringify(submission.submissionPeriod));
    console.log('[Rukn Submit] Saved submission periodDisplay:', submission.periodDisplay);

    res.status(201).json({
      success: true,
      message: 'Form submitted successfully',
      data: {
        submission: {
          id: submission._id,
          district: submission.district,
          area: submission.area,
          unit: submission.unit,
          ruknName: submission.ruknName,
          periodDisplay: submission.periodDisplay,
          status: submission.status,
          createdAt: submission.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Submission error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted for this period'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during submission'
    });
  }
});

// @desc    Get user's submissions
// @route   GET /api/submissions/my-submissions
// @access  Private (Rukn only)
router.get('/my-submissions', protect, authorize('rukn'), validateQuery(schemas.adminFilter), async (req, res) => {
  try {
    const { page = 1, limit = 10, year, month } = req.query;

    // Build query - EXCLUDE Q3 submissions
    const query = { 
      userId: req.user._id,
      ...req.quarterFilter // Filter out archived quarters
    };

    if (year) {
      query['submissionPeriod.year'] = year;
    }

    if (month) {
      query['submissionPeriod.month'] = month;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get submissions
    const submissions = await Submission.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('district area unit ruknName submissionPeriod status createdAt periodDisplay form dynamicFormId dynamicFormData');

    // Get total count
    const total = await Submission.countDocuments(query);

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalSubmissions: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get specific submission
// @route   GET /api/submissions/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('userId', 'username name district area unit')
      .populate('submittedBy', 'username name district area unit')
      .populate('reviewedBy', 'username name')
      .populate('adminReply.repliedBy', 'username name');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if user can access this submission
    if (req.user.role === 'rukn' && submission.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this submission'
      });
    }

    // Auto-migrate static submissions to dynamic format if a dynamic form exists for the quarter
    await migrateStaticToDynamic(submission);

    res.json({
      success: true,
      data: {
        submission
      }
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update submission status (Admin only)
// @route   PUT /api/submissions/:id/status
// @access  Private (Admin only)
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!status || !['submitted', 'reviewed', 'approved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required'
      });
    }

    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Update submission
    submission.status = status;
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();
    
    if (notes) {
      submission.notes = notes;
    }

    await submission.save();

    res.json({
      success: true,
      message: 'Submission status updated successfully',
      data: {
        submission: {
          id: submission._id,
          status: submission.status,
          reviewedBy: submission.reviewedBy,
          reviewedAt: submission.reviewedAt,
          notes: submission.notes
        }
      }
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update submission
// @route   PUT /api/submissions/:id
// @access  Private (Rukn only)
router.put('/:id', protect, authorize('rukn'), validateSubmissionMiddleware, async (req, res) => {
  try {
    const { district, area, unit, ruknName, form, dynamicFormId, dynamicFormData } = req.body;
    const isDynamicSubmission = !!(dynamicFormId && dynamicFormData);
    const normalizedForm = isDynamicSubmission ? null : normalizeOptionalFormFields(form);

    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if user owns this submission
    if (submission.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this submission'
      });
    }

    // Update submission
    submission.district = district;
    submission.area = area;
    submission.unit = unit;
    submission.ruknName = ruknName;

    if (isDynamicSubmission) {
      submission.dynamicFormId = dynamicFormId;
      submission.dynamicFormData = dynamicFormData;
    } else {
      submission.form = normalizedForm;
    }

    // Ensure mandatory relational fields exist to satisfy schema validation
    if (!submission.userId) {
      submission.userId = req.user._id;
    }
    if (!submission.submittedBy) {
      submission.submittedBy = submission.userId;
    }

    await submission.save();

    res.json({
      success: true,
      message: 'Submission updated successfully',
      data: {
        submission: {
          id: submission._id,
          district: submission.district,
          area: submission.area,
          unit: submission.unit,
          ruknName: submission.ruknName,
          periodDisplay: submission.periodDisplay,
          status: submission.status,
          createdAt: submission.createdAt,
          form: submission.form
        }
      }
    });
  } catch (error) {
    console.error('Update submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during update'
    });
  }
});

// @desc    Delete submission
// @route   DELETE /api/submissions/:id
// @access  Private (Rukn only)
router.delete('/:id', protect, authorize('rukn'), async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if user can delete this submission
    if (submission.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this submission'
      });
    }

    await Submission.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get submission statistics for user
// @route   GET /api/submissions/stats/my-stats
// @access  Private (Rukn only)
router.get('/stats/my-stats', protect, authorize('rukn'), async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Get current year submissions - EXCLUDE Q3
    const currentYearSubmissions = await Submission.find({
      userId: req.user._id,
      'submissionPeriod.year': currentYear,
      ...req.quarterFilter // Filter out archived quarters
    }).sort({ 'submissionPeriod.quarter': 1 });

    // Calculate statistics - excluding Q3 (only 3 quarters: Q1, Q2, Q4)
    const totalSubmissions = currentYearSubmissions.length;
    const completedQuarters = currentYearSubmissions.map(s => s.submissionPeriod.quarter);
    // Only show available quarters (1, 2, 4) - exclude Q3
    const availableQuarters = [1, 2, 4];
    const pendingQuarters = availableQuarters.filter(quarter => !completedQuarters.includes(quarter));

    // Get average scores for various metrics (only from non-dynamic submissions)
    const legacySubmissions = currentYearSubmissions.filter(s => !s.dynamicFormId);
    const avgHadithCount = legacySubmissions.length > 0 
      ? legacySubmissions.reduce((sum, s) => sum + (s.form?.hadithCount || 0), 0) / legacySubmissions.length 
      : 0;

    const avgNewMembers = legacySubmissions.length > 0
      ? legacySubmissions.reduce((sum, s) => sum + (s.form?.newMembers || 0), 0) / legacySubmissions.length
      : 0;

    const avgScoreCount = legacySubmissions.length > 0
      ? legacySubmissions.reduce((sum, s) => sum + (s.form?.scoreCount || 0), 0) / legacySubmissions.length
      : 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalSubmissions,
          completedQuarters,
          pendingQuarters,
          completionRate: Math.round((totalSubmissions / 3) * 100), // Changed from 4 to 3 quarters
          averages: {
            hadithCount: Math.round(avgHadithCount),
            newMembers: Math.round(avgNewMembers),
            scoreCount: Math.round(avgScoreCount)
          }
        },
        submissions: currentYearSubmissions.map(s => ({
          quarter: s.submissionPeriod.quarter,
          periodDisplay: s.periodDisplay,
          status: s.status,
          hadithCount: s.form?.hadithCount || 0,
          newMembers: s.form?.newMembers || 0,
          scoreCount: s.form?.scoreCount || 0,
          isDynamic: !!s.dynamicFormId
        }))
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
