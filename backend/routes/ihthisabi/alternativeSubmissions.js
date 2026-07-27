const express = require('express');
const AlternativeSubmit = require('../../models/ihthisabi/alternativeSubmit');
const Submission = require('../../models/ihthisabi/Submission');
const { protect, authorize } = require('../../middlewares/ihthisabi/auth');
const { validate, schemas, validateQuery } = require('../../middlewares/ihthisabi/validation');
const {
  getAvailableSubmissionQuarter,
  validateSubmissionQuarter
} = require('../../utils/quarterHelper');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');

const router = express.Router();

// @desc    Submit alternative form
// @route   POST /api/alternative-submissions
// @access  Private (Rukn and UnitAdmin)
router.post('/', protect, authorize('rukn', 'unitAdmin'), validate(schemas.alternativeSubmission), async (req, res) => {
  try {
    const { type, district, area, unit, ruknName, reason, quarter, year, submissionPeriod } = req.body;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    let finalSubmissionPeriod;
    
    // If submissionPeriod is provided as a complete object, use it directly (after validation)
    if (submissionPeriod && submissionPeriod.year && submissionPeriod.quarter) {
      const validation = validateSubmissionQuarter(submissionPeriod.quarter, submissionPeriod.year, currentDate);
      if (!validation.valid) {
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

    // Get userId - unitAdmin uses req.user.userId, rukn uses req.user._id
    const userId = req.user.userId || req.user._id;

    // Normalize reason: convert empty strings to undefined
    const normalizedReason = reason && reason.trim() ? reason.trim() : undefined;

    // CRITICAL: Check if user has already submitted regular submission for this quarter
    const existingRegularSubmission = await Submission.findOne({
      userId: userId,
      'submissionPeriod.year': submissionYear,
      'submissionPeriod.quarter': submissionQuarter
    });

    if (existingRegularSubmission) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a regular submission for this quarter. Cannot submit alternative submission for the same quarter.'
      });
    }

    // Check if user has already submitted alternative submission for this quarter
    const existingAlternativeSubmission = await AlternativeSubmit.findOne({
      userId: userId,
      'submissionPeriod.year': submissionYear,
      'submissionPeriod.quarter': submissionQuarter
    });

    if (existingAlternativeSubmission) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an alternative submission for this quarter'
      });
    }

    // Create alternative submission
    const alternativeSubmission = await AlternativeSubmit.create({
      userId: userId,
      type,
      district,
      area,
      unit,
      ruknName,
      reason: normalizedReason,
      submissionPeriod: finalSubmissionPeriod
    });

    // Populate user details
    await alternativeSubmission.populate('userId', 'username name');

    res.status(201).json({
      success: true,
      message: 'Alternative submission created successfully',
      data: {
        alternativeSubmission: {
          id: alternativeSubmission._id,
          type: alternativeSubmission.type,
          district: alternativeSubmission.district,
          area: alternativeSubmission.area,
          unit: alternativeSubmission.unit,
          ruknName: alternativeSubmission.ruknName,
          reason: alternativeSubmission.reason,
          periodDisplay: alternativeSubmission.periodDisplay,
          createdAt: alternativeSubmission.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Alternative submission error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an alternative submission for this period'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during alternative submission'
    });
  }
});

// @desc    Get user's alternative submissions
// @route   GET /api/alternative-submissions/my-submissions
// @access  Private (Rukn and UnitAdmin)
router.get('/my-submissions', protect, authorize('rukn', 'unitAdmin'), validateQuery(schemas.adminFilter), async (req, res) => {
  try {
    const { year, month } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(req.query);

    // Get userId - unitAdmin uses req.user.userId, rukn uses req.user._id
    const userId = req.user.userId || req.user._id;

    // Build query
    const query = { userId: userId };

    if (year) {
      query['submissionPeriod.year'] = parseInt(year);
    }

    if (month) {
      query['submissionPeriod.month'] = parseInt(month);
    }

    // Get alternative submissions
    const alternativeSubmissions = await AlternativeSubmit.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('type district area unit ruknName reason submissionPeriod periodDisplay adminReply createdAt');

    // Get total count
    const total = await AlternativeSubmit.countDocuments(query);

    res.json({
      success: true,
      data: {
        alternativeSubmissions,
        pagination: buildPaginationMeta(total, pageNum, limitNum)
      }
    });
  } catch (error) {
    console.error('Get alternative submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get all alternative submissions (Admin only)
// @route   GET /api/alternative-submissions/all
// @access  Private (Admin only)
router.get('/all', protect, authorize('admin'), validateQuery(schemas.adminFilter), async (req, res) => {
  try {
    const { year, month, district, area, unit } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(req.query);

    // Build query
    const query = {};

    if (year) {
      query['submissionPeriod.year'] = parseInt(year);
    }

    if (month) {
      query['submissionPeriod.month'] = parseInt(month);
    }

    if (district) {
      query.district = district;
    }

    if (area) {
      query.area = area;
    }

    if (unit) {
      query.unit = unit;
    }

    // Get alternative submissions
    const alternativeSubmissions = await AlternativeSubmit.find(query)
      .populate('userId', 'ruknId name district area unit')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('type district area unit ruknName reason submissionPeriod periodDisplay adminReply createdAt updatedAt');

    // Get total count
    const total = await AlternativeSubmit.countDocuments(query);

    res.json({
      success: true,
      data: {
        alternativeSubmissions,
        pagination: buildPaginationMeta(total, pageNum, limitNum)
      }
    });
  } catch (error) {
    console.error('Get all alternative submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get specific alternative submission
// @route   GET /api/alternative-submissions/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const alternativeSubmission = await AlternativeSubmit.findById(req.params.id)
      .populate('userId', 'username name district area unit')
      .populate('adminReply.repliedBy', 'username name');

    if (!alternativeSubmission) {
      return res.status(404).json({
        success: false,
        message: 'Alternative submission not found'
      });
    }

    // Get userId - unitAdmin uses req.user.userId, rukn uses req.user._id
    const userId = req.user.userId || req.user._id;

    // Check if user can access this submission
    if ((req.user.role === 'rukn' || req.user.role === 'unitAdmin') && alternativeSubmission.userId._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this alternative submission'
      });
    }

    res.json({
      success: true,
      data: {
        alternativeSubmission
      }
    });
  } catch (error) {
    console.error('Get alternative submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update alternative submission
// @route   PUT /api/alternative-submissions/:id
// @access  Private (Rukn and UnitAdmin)
router.put('/:id', protect, authorize('rukn', 'unitAdmin'), validate(schemas.alternativeSubmission), async (req, res) => {
  try {
    const { type, district, area, unit, ruknName, reason } = req.body;

    const alternativeSubmission = await AlternativeSubmit.findById(req.params.id);

    if (!alternativeSubmission) {
      return res.status(404).json({
        success: false,
        message: 'Alternative submission not found'
      });
    }

    // Get userId - unitAdmin uses req.user.userId, rukn uses req.user._id
    const userId = req.user.userId || req.user._id;

    // Check if user owns this submission
    if (alternativeSubmission.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this alternative submission'
      });
    }

    // Normalize reason: convert empty strings to undefined
    const normalizedReason = reason && reason.trim() ? reason.trim() : undefined;

    // Update alternative submission
    alternativeSubmission.type = type;
    alternativeSubmission.district = district;
    alternativeSubmission.area = area;
    alternativeSubmission.unit = unit;
    alternativeSubmission.ruknName = ruknName;
    alternativeSubmission.reason = normalizedReason;

    await alternativeSubmission.save();

    res.json({
      success: true,
      message: 'Alternative submission updated successfully',
      data: {
        alternativeSubmission: {
          id: alternativeSubmission._id,
          type: alternativeSubmission.type,
          district: alternativeSubmission.district,
          area: alternativeSubmission.area,
          unit: alternativeSubmission.unit,
          ruknName: alternativeSubmission.ruknName,
          reason: alternativeSubmission.reason,
          periodDisplay: alternativeSubmission.periodDisplay,
          createdAt: alternativeSubmission.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Update alternative submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during update'
    });
  }
});

// @desc    Delete alternative submission
// @route   DELETE /api/alternative-submissions/:id
// @access  Private (Rukn and UnitAdmin)
router.delete('/:id', protect, authorize('rukn', 'unitAdmin'), async (req, res) => {
  try {
    const alternativeSubmission = await AlternativeSubmit.findById(req.params.id);

    if (!alternativeSubmission) {
      return res.status(404).json({
        success: false,
        message: 'Alternative submission not found'
      });
    }

    // Get userId - unitAdmin uses req.user.userId, rukn uses req.user._id
    const userId = req.user.userId || req.user._id;

    // Check if user can delete this submission
    if (alternativeSubmission.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this alternative submission'
      });
    }

    await AlternativeSubmit.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Alternative submission deleted successfully'
    });
  } catch (error) {
    console.error('Delete alternative submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Admin reply to alternative submission
// @route   PUT /api/alternative-submissions/:id/reply
// @access  Private (Admin only)
router.put('/:id/reply', protect, authorize('admin'), async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reply message is required'
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Reply message cannot exceed 2000 characters'
      });
    }

    const alternativeSubmission = await AlternativeSubmit.findById(req.params.id);

    if (!alternativeSubmission) {
      return res.status(404).json({
        success: false,
        message: 'Alternative submission not found'
      });
    }

    // Update admin reply
    alternativeSubmission.adminReply = {
      message: message.trim(),
      repliedBy: req.user._id,
      repliedAt: new Date()
    };

    await alternativeSubmission.save();

    await alternativeSubmission.populate('adminReply.repliedBy', 'username name');

    res.json({
      success: true,
      message: 'Reply added successfully',
      data: {
        alternativeSubmission: {
          id: alternativeSubmission._id,
          adminReply: alternativeSubmission.adminReply
        }
      }
    });
  } catch (error) {
    console.error('Admin reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

