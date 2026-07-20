const express = require('express');
const mongoose = require('mongoose');
const DynamicReport = require('../../models/ihthisabi/dynamicReport');
const DynamicReportSubmission = require('../../models/ihthisabi/DynamicReportSubmission');
const User = require('../../models/ihthisabi/User');
const UnitAdmin = require('../../models/ihthisabi/UnitAdmin');
const { protect, authorize } = require('../../middlewares/ihthisabi/auth');

const router = express.Router();

const getUserId = (user = {}) => user.userId || user._id || user.id;

// Helper to get valid ObjectId or null for createdBy field
const getCreatorId = (user = {}) => {
  const userId = getUserId(user);
  // If userId is "admin" (string) or not a valid ObjectId, return null
  if (!userId || userId === 'admin' || !mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }
  return userId;
};

const validateReportPayload = (body) => {
  const { title, parts } = body;
  if (!title || !parts || !Array.isArray(parts) || parts.length === 0) {
    return 'Title and at least one part with questions are required';
  }

  for (const part of parts) {
    if (!part.partName || !part.questions || !Array.isArray(part.questions) || part.questions.length === 0) {
      return 'Each part must have a name and at least one question';
    }

    for (const question of part.questions) {
      if (!question.questionText || !question.answerType) {
        return 'Each question must have questionText and answerType';
      }

      if (['radio', 'dropdown', 'checkbox'].includes(question.answerType)) {
        if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
          return `Question with answerType '${question.answerType}' must have options array`;
        }
      }
    }
  }

  return null;
};

// All routes require authentication
router.use(protect);

// ===== Admin: Create report =====
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const validationError = validateReportPayload(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const { title, titleBase, description, parts } = req.body;
    const now = new Date();
    const creatorId = getCreatorId(req.user);

    const report = await DynamicReport.create({
      title,
      titleBase: titleBase || title,
      description: description || '',
      parts,
      createdBy: creatorId,
      isActive: true,
      recurringMonthly: false,
      scheduledFor: req.body.scheduledFor || now
    });

    return res.status(201).json({ success: true, data: report });
  } catch (error) {
    console.error('[DynamicReports] Create error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ===== Admin: Update report =====
router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const report = await DynamicReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const hasSubmissions = await DynamicReportSubmission.exists({ reportId: id });

    // If submissions exist, block structural changes
    if (hasSubmissions && (req.body.parts || req.body.type)) {
      return res.status(400).json({
        success: false,
        message: 'This report already has submissions; structure cannot be edited'
      });
    }

    const allowedFields = ['title', 'titleBase', 'description', 'isActive', 'scheduledFor', 'recurringMonthly', 'month', 'year', 'parts'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        report[field] = req.body[field];
      }
    });

    await report.save();
    return res.json({ success: true, data: report });
  } catch (error) {
    console.error('[DynamicReports] Update error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ===== Admin: Delete report =====
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const hasSubmissions = await DynamicReportSubmission.exists({ reportId: id });

    if (hasSubmissions) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a report that already has submissions'
      });
    }

    const deleted = await DynamicReport.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    return res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    console.error('[DynamicReports] Delete error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ===== User/Admin: List available forms =====
router.get('/', authorize('admin', 'unitAdmin', 'rukn'), async (req, res) => {
  try {
    const now = new Date();
    const { includeTemplates } = req.query;

    const query = { isActive: true };

    if (req.user.role === 'admin' && includeTemplates === 'true') {
      query.$or = [{ scheduledFor: { $lte: now } }, { recurringMonthly: true }];
    } else {
      query.scheduledFor = { $lte: now };
    }

    const reports = await DynamicReport.find(query)
      .select('-parts')
      .sort({ createdAt: -1 })
      .limit(10);
    
    return res.json({ success: true, data: reports });
  } catch (error) {
    console.error('[DynamicReports] List forms error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ===== Admin: View all submissions with filters =====
router.get('/submissions', authorize('admin'), async (req, res) => {
  try {
    const { reportId, month, year, role, page = 1, limit = 50 } = req.query;
    const query = {};
    if (reportId) query.reportId = reportId;
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);
    if (role) query.submittedRole = role;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const submissions = await DynamicReportSubmission.find(query)
      .populate('reportId', 'title month year')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Manually populate submittedBy based on role (unitAdmin vs rukn)
    const populatedSubmissions = await Promise.all(
      submissions.map(async (submission) => {
        let submittedByData = null;
        
        if (submission.submittedBy) {
          if (submission.submittedRole === 'unitAdmin') {
            const unitAdmin = await UnitAdmin.findById(submission.submittedBy).select('name unit ruknId').lean();
            if (unitAdmin) {
              submittedByData = {
                ...unitAdmin,
                role: 'unitAdmin'
              };
            }
          } else if (submission.submittedRole === 'rukn') {
            const user = await User.findById(submission.submittedBy).select('name unit ruknId role').lean();
            if (user) {
              submittedByData = user;
            }
          }
        }
        
        // Exclude answers from list view
        const { answers, ...submissionWithoutAnswers } = submission;
        
        return {
          ...submissionWithoutAnswers,
          submittedBy: submittedByData
        };
      })
    );

    const total = await DynamicReportSubmission.countDocuments(query);

    return res.json({
      success: true,
      data: populatedSubmissions,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('[DynamicReports] List submissions error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ===== Admin: Get single submission details (with answers) =====
router.get('/submissions/:id', authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const submission = await DynamicReportSubmission.findById(id).lean();

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Manually populate submittedBy based on role
    let submittedByData = null;
    if (submission.submittedBy) {
      if (submission.submittedRole === 'unitAdmin') {
        const unitAdmin = await UnitAdmin.findById(submission.submittedBy).select('name unit ruknId').lean();
        if (unitAdmin) {
          submittedByData = {
            ...unitAdmin,
            role: 'unitAdmin'
          };
        }
      } else if (submission.submittedRole === 'rukn') {
        const user = await User.findById(submission.submittedBy).select('name unit ruknId role').lean();
        if (user) {
          submittedByData = user;
        }
      }
    }

    // Populate reply.repliedBy if exists
    let replyData = submission.reply || null;
    if (replyData && replyData.repliedBy) {
      const adminUser = await User.findById(replyData.repliedBy).select('name username').lean();
      if (adminUser) {
        replyData = {
          ...replyData,
          repliedBy: adminUser
        };
      }
    }

    // Exclude reportId from response
    const { reportId, ...submissionWithoutReportId } = submission;

    const submissionWithDetails = {
      ...submissionWithoutReportId,
      submittedBy: submittedByData,
      reply: replyData
    };

    return res.json({
      success: true,
      data: submissionWithDetails
    });
  } catch (error) {
    console.error('[DynamicReports] Get submission details error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ===== User/Admin: Get form details =====
router.get('/:id', authorize('admin', 'unitAdmin', 'rukn'), async (req, res) => {
  try {
    const report = await DynamicReport.findById(req.params.id);
    if (!report || !report.isActive) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    return res.json({ success: true, data: report });
  } catch (error) {
    console.error('[DynamicReports] Get form error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ===== Admin: Reply to a submission =====
router.post('/submissions/:id/reply', authorize('admin'), async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Reply message is required' });
    }

    const submission = await DynamicReportSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Try to find an actual admin user in User model
    let adminUserId = getCreatorId(req.user);
    
    // If admin user ID is null (special admin token), try to find an admin user
    if (!adminUserId) {
      const adminUser = await User.findOne({ role: 'admin' }).select('_id').lean();
      if (adminUser) {
        adminUserId = adminUser._id;
      }
    }

    submission.reply = {
      message: message.trim(),
      repliedAt: new Date(),
      repliedBy: adminUserId
    };

    await submission.save();

    // Populate repliedBy for response
    let replyData = submission.reply.toObject ? submission.reply.toObject() : submission.reply;
    if (replyData.repliedBy) {
      const adminUser = await User.findById(replyData.repliedBy).select('name username email').lean();
      if (adminUser) {
        replyData.repliedBy = adminUser;
      }
    } else if (req.user.email) {
      // If no admin user found, include admin info from token
      replyData.repliedBy = {
        name: 'Admin',
        email: req.user.email,
        role: 'admin'
      };
    }

    return res.json({
      success: true,
      data: {
        ...replyData,
        submissionId: submission._id
      }
    });
  } catch (error) {
    console.error('[DynamicReports] Reply error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ===== Admin: Edit a reply =====
router.put('/submissions/:id/reply', authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Reply message is required' });
    }

    const submission = await DynamicReportSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (!submission.reply || !submission.reply.message) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    // Update reply message and timestamp
    submission.reply.message = message.trim();
    submission.reply.repliedAt = new Date();
    // Keep the original repliedBy

    await submission.save();

    // Populate repliedBy for response
    let replyData = submission.reply.toObject ? submission.reply.toObject() : submission.reply;
    if (replyData.repliedBy) {
      const adminUser = await User.findById(replyData.repliedBy).select('name username email').lean();
      if (adminUser) {
        replyData.repliedBy = adminUser;
      }
    } else if (req.user.email) {
      replyData.repliedBy = {
        name: 'Admin',
        email: req.user.email,
        role: 'admin'
      };
    }

    return res.json({
      success: true,
      message: 'Reply updated successfully',
      data: {
        ...replyData,
        submissionId: submission._id
      }
    });
  } catch (error) {
    console.error('[DynamicReports] Edit reply error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ===== Admin: Delete a reply =====
router.delete('/submissions/:id/reply', authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await DynamicReportSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (!submission.reply || !submission.reply.message) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    // Remove reply by setting it to null/undefined
    submission.reply = undefined;
    await submission.save();

    return res.json({
      success: true,
      message: 'Reply deleted successfully'
    });
  } catch (error) {
    console.error('[DynamicReports] Delete reply error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ===== User: My submissions =====
router.get('/my/submissions', authorize('unitAdmin', 'rukn'), async (req, res) => {
  try {
    const userId = getUserId(req.user);
    const submissions = await DynamicReportSubmission.find({ submittedBy: userId })
      .populate('reportId', 'title type month year')
      .sort({ createdAt: -1 })
      .lean();

    // Exclude answers from list view (similar to admin list)
    const submissionsWithoutAnswers = submissions.map(submission => {
      const { answers, ...submissionWithoutAnswers } = submission;
      return submissionWithoutAnswers;
    });

    return res.json({ success: true, data: submissionsWithoutAnswers });
  } catch (error) {
    console.error('[DynamicReports] My submissions error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ===== User: Get own single submission with answers (for edit pre-fill) =====
router.get('/my/submissions/:id', authorize('unitAdmin', 'rukn'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req.user);

    const submission = await DynamicReportSubmission.findById(id)
      .populate('reportId', 'title month year parts')
      .lean();

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (submission.submittedBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    return res.json({ success: true, data: submission });
  } catch (error) {
    console.error('[DynamicReports] Get my submission error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ===== User: Edit own submission =====
router.put('/my/submissions/:id', authorize('unitAdmin', 'rukn'), async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    const userId = getUserId(req.user);

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: 'Answers are required' });
    }

    const submission = await DynamicReportSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Verify ownership
    if (submission.submittedBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'You can only edit your own submissions' });
    }

    // Prevent editing if admin has replied
    if (submission.reply && submission.reply.message) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit submission after admin has replied'
      });
    }

    // Update answers
    submission.answers = answers;
    await submission.save();

    return res.json({
      success: true,
      message: 'Submission updated successfully',
      data: submission
    });
  } catch (error) {
    console.error('[DynamicReports] Edit submission error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ===== User: Delete own submission =====
router.delete('/my/submissions/:id', authorize('unitAdmin', 'rukn'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req.user);

    const submission = await DynamicReportSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Verify ownership
    if (submission.submittedBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own submissions' });
    }

    // Prevent deletion if admin has replied
    if (submission.reply && submission.reply.message) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete submission after admin has replied'
      });
    }

    await DynamicReportSubmission.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    console.error('[DynamicReports] Delete submission error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ===== User: Submit a report =====
router.post('/:id/submit', authorize('unitAdmin', 'rukn'), async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    const userId = getUserId(req.user);
    const submittedRole = req.user.role;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: 'Answers are required' });
    }

    const report = await DynamicReport.findById(id);
    if (!report || !report.isActive) {
      return res.status(404).json({ success: false, message: 'Report not found or inactive' });
    }

    const existing = await DynamicReportSubmission.findOne({ reportId: id, submittedBy: userId });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already submitted this report' });
    }

    const submission = await DynamicReportSubmission.create({
      reportId: id,
      templateRootId: report.templateRootId || report._id,
      month: report.month,
      year: report.year,
      submittedBy: userId,
      submittedRole,
      answers
    });

    return res.status(201).json({ success: true, data: submission });
  } catch (error) {
    console.error('[DynamicReports] Submit error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;

