const express = require('express');
const mongoose = require('mongoose');
const DynamicReport = require('../../models/ihthisabi/dynamicReport');
const DynamicReportSubmission = require('../../models/ihthisabi/DynamicReportSubmission');
const User = require('../../models/ihthisabi/User');
const UnitAdmin = require('../../models/ihthisabi/UnitAdmin');
const MekhalaNazim = require('../../models/ihthisabi/MekhalaNazim');
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

const SUBMITTER_ROLES = ['rukn', 'unitAdmin', 'mekhalaNazim'];

// Reports created before targeting existed carry no targetRoles; they stay visible
// to rukn and unitAdmin exactly as they were, and never to mekhalaNazim.
const LEGACY_TARGET_ROLES = ['rukn', 'unitAdmin'];

const normalizeTargetRoles = (value) => {
  if (value === undefined) return undefined;
  const list = Array.isArray(value) ? value : [value];
  const cleaned = [...new Set(list.filter((r) => SUBMITTER_ROLES.includes(r)))];
  return cleaned;
};

const reportTargets = (report, role) => {
  const targets = report?.targetRoles?.length ? report.targetRoles : LEGACY_TARGET_ROLES;
  return targets.includes(role);
};

// Resolve the submitter's name/scope from whichever collection owns that role.
const loadSubmitter = async (submittedBy, submittedRole) => {
  if (!submittedBy) return null;

  if (submittedRole === 'unitAdmin') {
    const unitAdmin = await UnitAdmin.findById(submittedBy).select('name unit ruknId').lean();
    return unitAdmin ? { ...unitAdmin, role: 'unitAdmin' } : null;
  }

  if (submittedRole === 'mekhalaNazim') {
    const nazim = await MekhalaNazim.findById(submittedBy)
      .select('name ruknId mekhala')
      .populate('mekhala', 'name')
      .lean();
    if (!nazim) return null;
    return {
      _id: nazim._id,
      name: nazim.name,
      ruknId: nazim.ruknId,
      mekhala: nazim.mekhala?.name || '',
      role: 'mekhalaNazim'
    };
  }

  if (submittedRole === 'rukn') {
    return await User.findById(submittedBy).select('name unit ruknId role').lean();
  }

  return null;
};

const CHOICE_FIELD_TYPES = ['select', 'dropdown', 'radio', 'checkbox', 'multiselect'];
const LAYOUT_FIELD_TYPES = ['title', 'html'];

// Pages-based payload. Drafts may be sparse; publishing demands a usable form.
const validatePagesPayload = (body, { publishing }) => {
  const { title, pages } = body;
  if (!title || !String(title).trim()) return 'Report title is required';
  if (!Array.isArray(pages)) return 'pages must be an array';

  const seenIds = new Set();
  let fieldCount = 0;

  for (const page of pages) {
    if (!Number.isInteger(page.id)) return 'Each page needs a numeric id';
    for (const field of page.fields || []) {
      if (!Number.isInteger(field.id)) return 'Each field needs a numeric id';
      if (seenIds.has(field.id)) return `Duplicate field id ${field.id}`;
      seenIds.add(field.id);
      if (!field.type) return 'Each field must have a type';
      fieldCount += 1;

      if (publishing) {
        if (!LAYOUT_FIELD_TYPES.includes(field.type) && !String(field.label || '').trim()) {
          return `Field #${field.id} needs a label before publishing`;
        }
        if (CHOICE_FIELD_TYPES.includes(field.type)) {
          const options = (field.options || []).filter((o) => String(o).trim());
          if (options.length === 0) return `Field "${field.label || field.id}" needs at least one option`;
        }
      }
    }
  }

  if (publishing && fieldCount === 0) return 'Add at least one field before publishing';
  return null;
};

// Legacy parts-based payload, kept for any caller still posting that shape.
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
    const { title, titleBase, description, parts, pages } = req.body;
    const usesPages = Array.isArray(pages);
    const isPublished = req.body.isPublished === true;

    const validationError = usesPages
      ? validatePagesPayload(req.body, { publishing: isPublished })
      : validateReportPayload(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const now = new Date();
    const creatorId = getCreatorId(req.user);

    const targetRoles = normalizeTargetRoles(req.body.targetRoles);
    if (!targetRoles || targetRoles.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one target user role' });
    }

    const report = await DynamicReport.create({
      title,
      titleBase: titleBase || title,
      description: description || '',
      ...(usesPages ? { pages } : { parts }),
      targetRoles,
      createdBy: creatorId,
      isActive: req.body.isActive !== false,
      isPublished,
      publishedAt: isPublished ? now : null,
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
    if (hasSubmissions && (req.body.parts || req.body.pages || req.body.type)) {
      return res.status(400).json({
        success: false,
        message: 'This report already has submissions; structure cannot be edited'
      });
    }

    const willPublish = req.body.isPublished === true;
    if (req.body.pages !== undefined) {
      const validationError = validatePagesPayload(
        { title: req.body.title ?? report.title, pages: req.body.pages },
        { publishing: willPublish }
      );
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }
    }

    const allowedFields = ['title', 'titleBase', 'description', 'isActive', 'scheduledFor', 'recurringMonthly', 'month', 'year', 'parts', 'pages'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        report[field] = req.body[field];
      }
    });

    if (req.body.isPublished !== undefined) {
      report.isPublished = willPublish;
      if (willPublish && !report.publishedAt) report.publishedAt = new Date();
      if (!willPublish) report.publishedAt = null;
    }

    if (req.body.targetRoles !== undefined) {
      const targetRoles = normalizeTargetRoles(req.body.targetRoles);
      if (!targetRoles.length) {
        return res.status(400).json({ success: false, message: 'Select at least one target user role' });
      }
      report.targetRoles = targetRoles;
    }

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
router.get('/', authorize('admin', 'unitAdmin', 'rukn', 'mekhalaNazim'), async (req, res) => {
  try {
    const now = new Date();
    const { includeTemplates, targetRole } = req.query;

    const query = { isActive: true };

    if (req.user.role === 'admin' && includeTemplates === 'true') {
      query.$or = [{ scheduledFor: { $lte: now } }, { recurringMonthly: true }];
    } else {
      query.scheduledFor = { $lte: now };
    }

    if (req.user.role !== 'admin') {
      // Unpublished drafts are admin-only. Reports authored before the publish
      // flag existed have no value stored and stay visible.
      query.isPublished = { $ne: false };
    }

    if (req.user.role === 'admin') {
      if (targetRole) query.targetRoles = targetRole;
    } else if (LEGACY_TARGET_ROLES.includes(req.user.role)) {
      // Legacy reports (no targetRoles) stay visible to rukn / unitAdmin
      query.$or = [
        { targetRoles: req.user.role },
        { targetRoles: { $in: [null, []] } }
      ];
    } else {
      query.targetRoles = req.user.role;
    }

    const reports = await DynamicReport.find(query)
      .select('-parts -pages')
      .sort({ createdAt: -1 })
      .limit(req.user.role === 'admin' ? 50 : 10);

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
    // Drafts are private work-in-progress and never surface to the admin.
    const query = { status: { $ne: 'draft' } };
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

    // Manually populate submittedBy — the id points at whichever collection owns the role
    const populatedSubmissions = await Promise.all(
      submissions.map(async (submission) => {
        const submittedByData = await loadSubmitter(submission.submittedBy, submission.submittedRole);

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

    if (submission.status === 'draft') {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Manually populate submittedBy — the id points at whichever collection owns the role
    const submittedByData = await loadSubmitter(submission.submittedBy, submission.submittedRole);

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

    // The report's pages travel with the submission so the admin view can label
    // formData values without a second round trip.
    const { reportId, ...submissionWithoutReportId } = submission;
    const report = await DynamicReport.findById(reportId)
      .select('title description pages')
      .lean();

    const submissionWithDetails = {
      ...submissionWithoutReportId,
      report: report || null,
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
router.get('/:id', authorize('admin', 'unitAdmin', 'rukn', 'mekhalaNazim'), async (req, res) => {
  try {
    const report = await DynamicReport.findById(req.params.id);
    if (!report || !report.isActive) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    if (req.user.role !== 'admin' && (!reportTargets(report, req.user.role) || report.isPublished === false)) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // The admin editor needs to know whether the structure is still editable.
    // Drafts count: rewriting questions under a saved draft would orphan its answers.
    if (req.user.role === 'admin') {
      const hasSubmissions = Boolean(await DynamicReportSubmission.exists({ reportId: report._id }));
      return res.json({ success: true, data: { ...report.toObject(), hasSubmissions } });
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
router.get('/my/submissions', authorize('unitAdmin', 'rukn', 'mekhalaNazim'), async (req, res) => {
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
router.get('/my/submissions/:id', authorize('unitAdmin', 'rukn', 'mekhalaNazim'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req.user);

    const submission = await DynamicReportSubmission.findById(id)
      .populate('reportId', 'title description month year parts pages')
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
router.put('/my/submissions/:id', authorize('unitAdmin', 'rukn', 'mekhalaNazim'), async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, formData, lastPage, status } = req.body;
    const userId = getUserId(req.user);
    const usesFormData = formData !== undefined && formData !== null;

    if (status !== undefined && !['draft', 'submitted'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be draft or submitted' });
    }

    if (usesFormData) {
      if (typeof formData !== 'object' || Array.isArray(formData)) {
        return res.status(400).json({ success: false, message: 'formData must be an object' });
      }
    } else if (!answers || !Array.isArray(answers)) {
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

    // A submitted report can be re-edited but never demoted back to a draft.
    const nextStatus = submission.status === 'submitted' ? 'submitted' : (status || submission.status);
    if (nextStatus === 'submitted') {
      const empty = usesFormData ? Object.keys(formData).length === 0 : answers.length === 0;
      if (empty) {
        return res.status(400).json({ success: false, message: 'Fill in the report before submitting' });
      }
    }

    if (usesFormData) submission.formData = formData;
    else submission.answers = answers;
    if (lastPage !== undefined) submission.lastPage = lastPage;
    submission.status = nextStatus;
    if (nextStatus === 'submitted' && !submission.submittedAt) {
      submission.submittedAt = new Date();
    }
    await submission.save();

    return res.json({
      success: true,
      message: nextStatus === 'draft' ? 'Draft saved' : 'Submission updated successfully',
      data: submission
    });
  } catch (error) {
    console.error('[DynamicReports] Edit submission error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ===== User: Delete own submission =====
router.delete('/my/submissions/:id', authorize('unitAdmin', 'rukn', 'mekhalaNazim'), async (req, res) => {
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
router.post('/:id/submit', authorize('unitAdmin', 'rukn', 'mekhalaNazim'), async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, formData, lastPage, status } = req.body;
    const userId = getUserId(req.user);
    const submittedRole = req.user.role;
    const nextStatus = status === 'draft' ? 'draft' : 'submitted';
    const usesFormData = formData !== undefined && formData !== null;

    if (usesFormData) {
      if (typeof formData !== 'object' || Array.isArray(formData)) {
        return res.status(400).json({ success: false, message: 'formData must be an object' });
      }
      if (nextStatus === 'submitted' && Object.keys(formData).length === 0) {
        return res.status(400).json({ success: false, message: 'Fill in the report before submitting' });
      }
    } else {
      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ success: false, message: 'Answers are required' });
      }
      if (nextStatus === 'submitted' && answers.length === 0) {
        return res.status(400).json({ success: false, message: 'Answers are required' });
      }
    }

    const report = await DynamicReport.findById(id);
    if (!report || !report.isActive) {
      return res.status(404).json({ success: false, message: 'Report not found or inactive' });
    }
    if (report.isPublished === false) {
      return res.status(403).json({ success: false, message: 'This report is not published yet' });
    }
    if (!reportTargets(report, submittedRole)) {
      return res.status(403).json({ success: false, message: 'This report is not assigned to your role' });
    }

    const existing = await DynamicReportSubmission.findOne({ reportId: id, submittedBy: userId });
    if (existing) {
      // A saved draft is picked back up here; an already-submitted report is edited
      // through PUT /my/submissions/:id instead.
      if (existing.status === 'submitted') {
        return res.status(409).json({ success: false, message: 'You have already submitted this report' });
      }
      if (usesFormData) existing.formData = formData;
      else existing.answers = answers;
      if (lastPage !== undefined) existing.lastPage = lastPage;
      existing.status = nextStatus;
      if (nextStatus === 'submitted') existing.submittedAt = new Date();
      await existing.save();
      return res.json({ success: true, data: existing });
    }

    const submission = await DynamicReportSubmission.create({
      reportId: id,
      templateRootId: report.templateRootId || report._id,
      // Monthly instances carry month/year; ad-hoc reports are 'special'.
      reportType: report.month && report.year ? 'monthly' : 'special',
      month: report.month,
      year: report.year,
      submittedBy: userId,
      submittedRole,
      status: nextStatus,
      submittedAt: nextStatus === 'submitted' ? new Date() : undefined,
      lastPage: lastPage || 0,
      ...(usesFormData ? { formData, answers: [] } : { answers })
    });

    return res.status(201).json({ success: true, data: submission });
  } catch (error) {
    console.error('[DynamicReports] Submit error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;

