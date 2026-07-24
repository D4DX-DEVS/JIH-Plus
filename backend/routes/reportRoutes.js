const express = require('express');
const router = express.Router();
const Report = require('../models/report');
const ReportSubmission = require('../models/reportSubmission');
const District = require('../models/district');
const AreaMaster = require('../models/area');
const UnitMaster = require('../models/unit');
const adminAuth = require('../middlewares/adminAuth');
const userAuth = require('../middlewares/userAuth');

const VALID_REPORT_FOR = ['district', 'area', 'unit'];
const VALID_TYPES = ['monthly', 'special', 'yearly', 'quarterly'];

/**
 * Resolve submission userIds from the correct location-master collections.
 * The userId stored in ReportSubmission is the _id of District / AreaMaster / UnitMaster,
 * NOT the User collection, so normal populate() returns null.
 * @param {object[]} submissions - lean submission documents (userId still as ObjectId)
 * @returns {object[]} submissions with userId replaced by a display-info object
 */
async function resolveSubmissionUsers(submissions) {
  const userIds = [...new Set(
    submissions.map(s => s.userId?.toString()).filter(Boolean)
  )];
  if (userIds.length === 0) return submissions;

  const [districtDocs, areaDocs, unitDocs] = await Promise.all([
    District.find({ _id: { $in: userIds } }).select('name uniqueCode').lean(),
    AreaMaster.find({ _id: { $in: userIds } })
      .populate('districtId', 'name')
      .select('name uniqueCode districtId')
      .lean(),
    UnitMaster.find({ _id: { $in: userIds } })
      .populate('districtId', 'name')
      .populate('areaId', 'name')
      .select('name uniqueCode districtId areaId')
      .lean(),
  ]);

  const userMap = {};
  districtDocs.forEach(d => {
    userMap[d._id.toString()] = {
      districtName: d.name,
      areaName: '',
      unitName: '',
      accessCode: d.uniqueCode,
      type: 'district'
    };
  });
  areaDocs.forEach(a => {
    userMap[a._id.toString()] = {
      districtName: a.districtId?.name || '',
      areaName: a.name,
      unitName: '',
      accessCode: a.uniqueCode,
      type: 'area'
    };
  });
  unitDocs.forEach(u => {
    userMap[u._id.toString()] = {
      districtName: u.districtId?.name || '',
      areaName: u.areaId?.name || '',
      unitName: u.name,
      accessCode: u.uniqueCode,
      type: 'unit'
    };
  });

  return submissions.map(s => ({
    ...s,
    userId: s.userId ? (userMap[s.userId.toString()] || null) : null
  }));
}

// Derive stats from a report (supports both pages[] and legacy parts[])
function computeReportStats(report) {
  if (report.pages && report.pages.length > 0) {
    return {
      pageCount: report.pages.length,
      fieldCount: report.pages.reduce((t, p) => t + (p.fields ? p.fields.length : 0), 0),
      legacy: false
    };
  }
  return {
    pageCount: report.parts ? report.parts.length : 0,
    fieldCount: report.parts
      ? report.parts.reduce((t, p) => t + (p.questions ? p.questions.length : 0), 0)
      : 0,
    legacy: true
  };
}

// ===== ADMIN ROUTES =====

// @desc    Create a new report
// @route   POST /api/admin/reports
// @access  Private (Admin only)
router.post('/admin/reports', adminAuth, async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ success: false, message: 'Request body is missing' });
    }

    const { type, reportFor, title, description, pages, parts } = req.body;

    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: `type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    if (!reportFor || !VALID_REPORT_FOR.includes(reportFor)) {
      return res.status(400).json({ success: false, message: `reportFor must be one of: ${VALID_REPORT_FOR.join(', ')}` });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const hasPages = Array.isArray(pages) && pages.length > 0;
    const hasParts = Array.isArray(parts) && parts.length > 0;
    if (!hasPages && !hasParts) {
      return res.status(400).json({ success: false, message: 'At least one page (or part for legacy) is required' });
    }

    if (hasPages) {
      for (const pg of pages) {
        if (!pg.title || !pg.title.trim()) {
          return res.status(400).json({ success: false, message: 'Each page must have a title' });
        }
        if (!Array.isArray(pg.fields)) {
          return res.status(400).json({ success: false, message: 'Each page must have a fields array' });
        }
        for (const field of pg.fields) {
          if (!field.label || !field.type) {
            return res.status(400).json({ success: false, message: 'Each field must have label and type' });
          }
        }
      }
    }

    const titleBase = title.trim();
    let finalTitle = titleBase;
    let scheduledFor = null;
    let month = null;
    let year = null;
    let recurringMonthly = false;
    let recurringYearly = false;

    if (type === 'monthly') {
      recurringMonthly = true;
      const now = new Date();
      scheduledFor = now;
      month = now.getMonth() + 1;
      year = now.getFullYear();
      const monthName = now.toLocaleString('en-US', { month: 'long' });
      const suffix = `${monthName} ${year}`;
      if (!titleBase.toLowerCase().includes(suffix.toLowerCase())) {
        finalTitle = `${titleBase} - ${suffix}`;
      }
    }

    if (type === 'yearly') {
      recurringYearly = true;
      const now = new Date();
      year = now.getFullYear();
      // Available from Jan 1 of the current year (or now if created mid-year)
      scheduledFor = now;
      const suffix = `${year}`;
      if (!titleBase.includes(suffix)) {
        finalTitle = `${titleBase} - ${year}`;
      }
    }

    const reportData = {
      type,
      reportFor,
      title: finalTitle,
      titleBase,
      description: description || '',
      createdBy: req.admin.id || req.admin._id,
      version: 1,
      isPublished: false,
      ...(hasPages && { pages }),
      ...(hasParts && !hasPages && { parts }),
      ...(type === 'monthly' && { scheduledFor, recurringMonthly, month, year }),
      ...(type === 'yearly' && { scheduledFor, recurringYearly, year })
    };

    const report = new Report(reportData);
    const savedReport = await report.save();

    if (type === 'monthly' && !savedReport.templateRootId) {
      await Report.findByIdAndUpdate(savedReport._id, { templateRootId: savedReport._id });
      savedReport.templateRootId = savedReport._id;
    }

    if (type === 'yearly' && !savedReport.templateRootId) {
      await Report.findByIdAndUpdate(savedReport._id, { templateRootId: savedReport._id });
      savedReport.templateRootId = savedReport._id;
    }

    res.status(201).json({ success: true, message: 'Report created successfully', data: savedReport.toObject() });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ success: false, message: 'Error creating report', error: error.message });
  }
});

// @desc    Get all reports
// @route   GET /api/admin/reports
// @access  Public
router.get('/admin/reports', async (req, res) => {
  try {
    const { type, reportFor, isActive, page = 1, limit = 20, templateOnly } = req.query;
    const query = {};

    if (type) query.type = type;
    if (reportFor) query.reportFor = reportFor;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (templateOnly === 'true') query.recurringMonthly = true;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Report.countDocuments(query);
    const reports = await Report.find(query)
      .select('type reportFor title titleBase isActive pages parts createdAt scheduledFor month year recurringMonthly version isPublished')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const simplified = reports.map(r => {
      const { pageCount, fieldCount, legacy } = computeReportStats(r);
      return {
        _id: r._id,
        title: r.title,
        titleBase: r.titleBase,
        type: r.type,
        reportFor: r.reportFor || 'district',
        isActive: r.isActive,
        version: r.version || 1,
        isPublished: r.isPublished || false,
        scheduledFor: r.scheduledFor,
        month: r.month,
        year: r.year,
        recurringMonthly: r.recurringMonthly || false,
        pageCount,
        fieldCount,
        legacy,
        createdAt: r.createdAt
      };
    });

    res.json({
      success: true,
      count: simplified.length,
      totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
      hasPrevPage: pageNum > 1,
      data: simplified
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, message: 'Error fetching reports', error: error.message });
  }
});

// @desc    List reports for the consolidation filter (no pagination, trimmed fields)
// @route   GET /api/admin/reports/for-consolidation
// @access  Private (Admin only)
router.get('/admin/reports/for-consolidation', adminAuth, async (req, res) => {
  try {
    const { type, reportFor, month, year } = req.query;
    const query = {};
    if (type && VALID_TYPES.includes(type)) query.type = type;
    if (reportFor && VALID_REPORT_FOR.includes(reportFor)) query.reportFor = reportFor;
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);

    const reports = await Report.find(query)
      .select('_id title titleBase type reportFor month year scheduledFor isPublished')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .lean();

    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Error fetching reports for consolidation:', error);
    res.status(500).json({ success: false, message: 'Error fetching reports', error: error.message });
  }
});

// @desc    Get consolidation data for a specific report
// @route   GET /api/admin/reports/consolidation
// @access  Private (Admin only)
router.get('/admin/reports/consolidation', adminAuth, async (req, res) => {
  try {
    const { reportId, districtId, areaId } = req.query;

    if (!reportId) {
      return res.status(400).json({ success: false, message: 'reportId is required' });
    }

    const report = await Report.findById(reportId)
      .select('reportFor title type month year')
      .lean();
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const { reportFor } = report;

    // Fetch all active locations of the relevant type
    let locations = [];
    if (reportFor === 'district') {
      const docs = await District.find({ isActive: true })
        .select('_id name uniqueCode')
        .lean();
      locations = docs.map(d => ({ _id: d._id, name: d.name, accessCode: d.uniqueCode }));
    } else if (reportFor === 'area') {
      const filter = { isActive: true };
      if (districtId) filter.districtId = districtId;
      const docs = await AreaMaster.find(filter)
        .populate('districtId', 'name')
        .select('_id name uniqueCode districtId')
        .lean();
      locations = docs.map(a => ({
        _id: a._id,
        name: a.name,
        accessCode: a.uniqueCode,
        districtName: a.districtId?.name || ''
      }));
    } else if (reportFor === 'unit') {
      const filter = { isActive: true };
      if (districtId) filter.districtId = districtId;
      if (areaId) filter.areaId = areaId;
      const docs = await UnitMaster.find(filter)
        .populate('districtId', 'name')
        .populate('areaId', 'name')
        .select('_id name uniqueCode districtId areaId')
        .lean();
      locations = docs.map(u => ({
        _id: u._id,
        name: u.name,
        accessCode: u.uniqueCode,
        districtName: u.districtId?.name || '',
        areaName: u.areaId?.name || ''
      }));
    }

    // Fetch all submissions for this report
    const submissions = await ReportSubmission.find({ reportId })
      .select('userId status submittedAt createdAt')
      .lean();

    // Build a map: locationId -> submission
    const submissionMap = {};
    submissions.forEach(s => {
      if (s.userId) submissionMap[s.userId.toString()] = s;
    });

    // Categorize into submitted / pending / notStarted
    const submitted = [];
    const pending = [];
    const notStarted = [];

    locations.forEach(loc => {
      const sub = submissionMap[loc._id.toString()];
      const info = {
        _id: loc._id,
        name: loc.name,
        accessCode: loc.accessCode,
        districtName: loc.districtName || '',
        areaName: loc.areaName || ''
      };
      if (!sub) {
        notStarted.push(info);
      } else if (sub.status === 'submitted') {
        submitted.push({ ...info, submittedAt: sub.submittedAt });
      } else {
        pending.push({ ...info, startedAt: sub.createdAt });
      }
    });

    const total = locations.length;
    const submissionRate = total > 0 ? Math.round((submitted.length / total) * 100) : 0;

    res.json({
      success: true,
      report: {
        _id: report._id,
        title: report.title,
        type: report.type,
        reportFor: report.reportFor,
        month: report.month,
        year: report.year
      },
      stats: {
        total,
        submittedCount: submitted.length,
        pendingCount: pending.length,
        notStartedCount: notStarted.length,
        submissionRate
      },
      submitted,
      pending,
      notStarted
    });
  } catch (error) {
    console.error('Error fetching consolidation:', error);
    res.status(500).json({ success: false, message: 'Error fetching consolidation data', error: error.message });
  }
});

// @desc    Get single report by ID
// @route   GET /api/admin/reports/:id
// @access  Private (Admin only)
router.get('/admin/reports/:id', adminAuth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('createdBy', 'accessCode type districtName areaName unitName')
      .lean();

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ success: false, message: 'Error fetching report', error: error.message });
  }
});

// @desc    Update report
// @route   PUT /api/admin/reports/:id
// @access  Private (Admin only)
router.put('/admin/reports/:id', adminAuth, async (req, res) => {
  try {
    const { type, reportFor, title, description, pages, parts, isActive, recurringMonthly, recurringQuarterly, startDate } = req.body;

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (type && VALID_TYPES.includes(type)) report.type = type;
    if (reportFor && VALID_REPORT_FOR.includes(reportFor)) report.reportFor = reportFor;
    if (title && title.trim()) report.title = title.trim();
    if (description !== undefined) report.description = description;
    if (isActive !== undefined) report.isActive = isActive;
    if (recurringMonthly !== undefined) report.recurringMonthly = recurringMonthly;
    if (recurringQuarterly !== undefined) report.recurringQuarterly = recurringQuarterly;
    if (startDate !== undefined) report.quarterStartDate = startDate ? new Date(startDate) : null;

    if (Array.isArray(pages) && pages.length > 0) {
      report.pages = pages;
    } else if (Array.isArray(parts) && parts.length > 0) {
      report.parts = parts;
    }

    report.version = (report.version || 1) + 1;
    const savedReport = await report.save();

    res.json({ success: true, message: 'Report updated successfully', data: savedReport.toObject() });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ success: false, message: 'Error updating report', error: error.message });
  }
});

// @desc    Publish / Unpublish a report
// @route   PATCH /api/admin/reports/:id/publish
// @access  Private (Admin only)
router.patch('/admin/reports/:id/publish', adminAuth, async (req, res) => {
  try {
    const { isPublished } = req.body;
    if (typeof isPublished !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isPublished must be a boolean' });
    }
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    report.isPublished = isPublished;
    if (isPublished) report.publishedAt = new Date();
    await report.save();

    res.json({
      success: true,
      message: isPublished ? 'Report published' : 'Report unpublished',
      data: { isPublished: report.isPublished, publishedAt: report.publishedAt }
    });
  } catch (error) {
    console.error('Error publishing report:', error);
    res.status(500).json({ success: false, message: 'Error updating publish status', error: error.message });
  }
});

// @desc    Delete report
// @route   DELETE /api/admin/reports/:id
// @access  Private (Admin only)
router.delete('/admin/reports/:id', adminAuth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const submissionsCount = await ReportSubmission.countDocuments({ reportId: req.params.id });
    if (submissionsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${submissionsCount} submission(s) exist for this report.`
      });
    }

    await Report.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting report',
      error: error.message
    });
  }
});

// @desc    Clone a report (creates a draft copy without submissions)
// @route   POST /api/admin/reports/:id/clone
// @access  Private (Admin only)
router.post('/admin/reports/:id/clone', adminAuth, async (req, res) => {
  try {
    const source = await Report.findById(req.params.id).lean();
    if (!source) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const clonedTitle = `Copy of ${source.titleBase || source.title}`;

    const cloneData = {
      type: source.type,
      reportFor: source.reportFor,
      title: clonedTitle,
      titleBase: clonedTitle,
      description: source.description || '',
      createdBy: req.admin.id || req.admin._id,
      version: 1,
      isPublished: false,
      isActive: true,
      recurringMonthly: false,
      recurringYearly: false,
    };

    if (source.pages && source.pages.length > 0) {
      cloneData.pages = source.pages;
    } else if (source.parts && source.parts.length > 0) {
      cloneData.parts = source.parts;
    }

    const cloned = new Report(cloneData);
    const saved = await cloned.save();

    res.status(201).json({ success: true, message: 'Report cloned successfully', data: saved.toObject() });
  } catch (error) {
    console.error('Error cloning report:', error);
    res.status(500).json({ success: false, message: 'Error cloning report', error: error.message });
  }
});

// ===== USER ROUTES =====

// @desc    Get active reports for users
// @route   GET /api/user/reports
// @access  Private (User only)
router.get('/user/reports', userAuth, async (req, res) => {
  try {
    const userLevel = req.user.role || req.user.type;
    if (!VALID_REPORT_FOR.includes(userLevel)) {
      return res.status(403).json({ success: false, message: 'Invalid user level for report access' });
    }

    const { type } = req.query;
    const query = { isActive: true, reportFor: userLevel };
    if (type && VALID_TYPES.includes(type)) query.type = type;

    const reports = await Report.find(query)
      .select('type reportFor title description isActive version isPublished pages parts createdAt scheduledFor month year')
      .sort({ createdAt: -1 })
      .lean();

    const userId = req.user.id || req.user._id || req.user.userId;
    const reportIds = reports.map(r => r._id);
    const submissions = await ReportSubmission.find({ userId, reportId: { $in: reportIds } })
      .select('reportId status submittedAt').lean();

    const submissionMap = {};
    submissions.forEach(s => { submissionMap[String(s.reportId)] = s; });

    const enriched = reports.map(r => {
      const { pageCount, fieldCount } = computeReportStats(r);
      const sub = submissionMap[String(r._id)] || null;
      return { ...r, pageCount, fieldCount, submission: sub, status: sub?.status || 'pending' };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({ success: false, message: 'Error fetching reports', error: error.message });
  }
});

// @desc    Get single report by ID for users
// @route   GET /api/user/reports/:id
// @access  Private (User only)
router.get('/user/reports/:id', userAuth, async (req, res) => {
  try {
    const userLevel = req.user.role || req.user.type;
    const report = await Report.findOne({
      _id: req.params.id,
      isActive: true,
      reportFor: userLevel
    }).lean();

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found or inactive' });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ success: false, message: 'Error fetching report', error: error.message });
  }
});

// @desc    Get report + user's submission
// @route   GET /api/user/reports/:id/view
// @access  Private (User only)
router.get('/user/reports/:id/view', userAuth, async (req, res) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.id || req.user._id || req.user.userId;
    const userLevel = req.user.role || req.user.type;

    if (!VALID_REPORT_FOR.includes(userLevel)) {
      return res.status(403).json({ success: false, message: 'Invalid user level' });
    }

    const report = await Report.findOne({ _id: reportId, isActive: true, reportFor: userLevel }).lean();
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found or inactive' });
    }

    const submission = await ReportSubmission.findOne({ reportId, userId }).lean();
    res.json({ success: true, data: { report, submission: submission || null } });
  } catch (error) {
    console.error('Error fetching report/submission:', error);
    res.status(500).json({ success: false, message: 'Error fetching report', error: error.message });
  }
});

// @desc    Submit or save draft
// @route   POST /api/user/reports/:id/submit
// @access  Private (User only)
router.post('/user/reports/:id/submit', userAuth, async (req, res) => {
  try {
    const { formData = {}, answers = [], status = 'submitted', lastPage } = req.body || {};
    const reportId = req.params.id;
    const userId = req.user.id || req.user._id || req.user.userId;
    const userLevel = req.user.role || req.user.type;

    if (!userId) return res.status(403).json({ success: false, message: 'Unable to determine user ID' });
    if (!VALID_REPORT_FOR.includes(userLevel)) {
      return res.status(403).json({ success: false, message: 'Invalid user level' });
    }

    const report = await Report.findOne({ _id: reportId, isActive: true, reportFor: userLevel });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found or inactive' });

    const updatePayload = {
      status,
      reportVersion: report.version || 1,
      submittedAt: status === 'submitted' ? new Date() : null,
      ...(report.month != null && { month: report.month }),
      ...(report.year != null && { year: report.year }),
      ...(Number.isInteger(lastPage) && lastPage >= 0 && { lastPage })
    };
    if (Object.keys(formData).length > 0) {
      updatePayload.formData = formData;
    } else if (Array.isArray(answers) && answers.length > 0) {
      updatePayload.answers = answers;
    }

    const submission = await ReportSubmission.findOneAndUpdate(
      { reportId: report._id, userId },
      { $set: updatePayload, $setOnInsert: { reportId: report._id, userId } },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: status === 'submitted' ? 'Report submitted successfully' : 'Report saved as draft',
      data: submission
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ success: false, message: 'Error submitting report', error: error.message });
  }
});

// @desc    Update an existing submission
// @route   PUT /api/user/reports/:id/submission
// @access  Private (User only)
router.put('/user/reports/:id/submission', userAuth, async (req, res) => {
  try {
    const { formData = {}, answers = [], status, lastPage } = req.body || {};
    const reportId = req.params.id;
    const userId = req.user.id || req.user._id || req.user.userId;
    const userLevel = req.user.role || req.user.type;

    if (!VALID_REPORT_FOR.includes(userLevel)) {
      return res.status(403).json({ success: false, message: 'Invalid user level' });
    }

    const report = await Report.findOne({ _id: reportId, isActive: true, reportFor: userLevel });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found or inactive' });

    const existingSubmission = await ReportSubmission.findOne({ reportId, userId });
    if (!existingSubmission) {
      return res.status(404).json({ success: false, message: 'No existing submission found' });
    }

    const nextStatus = status || existingSubmission.status || 'pending';
    const update = {
      status: nextStatus,
      reportVersion: report.version || 1,
      submittedAt: nextStatus === 'submitted' ? new Date() : existingSubmission.submittedAt,
      ...(report.month != null && { month: report.month }),
      ...(report.year != null && { year: report.year }),
      ...(Number.isInteger(lastPage) && lastPage >= 0 && { lastPage })
    };
    if (Object.keys(formData).length > 0) {
      update.formData = formData;
    } else if (Array.isArray(answers) && answers.length > 0) {
      update.answers = answers;
    }

    const updatedSubmission = await ReportSubmission.findOneAndUpdate(
      { reportId, userId },
      { $set: update },
      { new: true }
    );

    res.json({ success: true, message: 'Submission updated successfully', data: updatedSubmission });
  } catch (error) {
    console.error('Error updating submission:', error);
    res.status(500).json({ success: false, message: 'Error updating submission', error: error.message });
  }
});

// @desc    Delete user's own submission
// @route   DELETE /api/user/reports/:id/submission
// @access  Private (User only)
router.delete('/user/reports/:id/submission', userAuth, async (req, res) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.id || req.user._id || req.user.userId;

    const deleted = await ReportSubmission.findOneAndDelete({ reportId, userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'No submission found to delete' });
    }

    res.json({ success: true, message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ success: false, message: 'Error deleting submission', error: error.message });
  }
});

// @desc    Get all submissions for a report (Admin)
// @route   GET /api/admin/reports/:id/submissions
// @access  Private (Admin only)
router.get('/admin/reports/:id/submissions', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const reportId = req.params.id;

    const query = { reportId };
    if (status) query.status = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await ReportSubmission.countDocuments(query);
    const rawSubmissions = await ReportSubmission.find(query)
      .populate('reportId', 'type reportFor title description pages parts version month year')
      .sort({ submittedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const submissions = await resolveSubmissionUsers(rawSubmissions);

    res.json({
      success: true,
      count: submissions.length,
      totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      data: submissions
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ success: false, message: 'Error fetching submissions', error: error.message });
  }
});

// @desc    Get all submissions across reports (with filters)
// @route   GET /api/admin/report-submissions
// @access  Private (Admin only)
router.get('/admin/report-submissions', adminAuth, async (req, res) => {
  try {
    const { reportId, reportType, reportFor, status, month, year, page = 1, limit = 20 } = req.query;

    const reportFilter = {};
    if (reportType) reportFilter.type = reportType;
    if (reportFor) reportFilter.reportFor = reportFor;
    // Filter by month/year at the report level when no direct submission fields present
    if (month && !year) reportFilter.month = Number(month);
    if (year && !month) reportFilter.year = Number(year);
    if (month && year) { reportFilter.month = Number(month); reportFilter.year = Number(year); }

    let matchingReportIds = null;
    if (Object.keys(reportFilter).length > 0) {
      const matchingReports = await Report.find(reportFilter).select('_id').lean();
      matchingReportIds = matchingReports.map(r => r._id);
    }

    const submissionQuery = {};
    if (reportId) {
      submissionQuery.reportId = reportId;
    } else if (matchingReportIds) {
      submissionQuery.reportId = { $in: matchingReportIds };
    }
    if (status) submissionQuery.status = status;
    // Also allow direct filtering on denormalized submission fields
    if (month && !reportType && !reportFor) submissionQuery.month = Number(month);
    if (year && !reportType && !reportFor) submissionQuery.year = Number(year);

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await ReportSubmission.countDocuments(submissionQuery);
    const rawSubmissions = await ReportSubmission.find(submissionQuery)
      .populate('reportId', 'type reportFor title description pages parts version month year')
      .sort({ submittedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const submissions = await resolveSubmissionUsers(rawSubmissions);

    // Optional full roster (all districts/areas/units with parent names) so the
    // admin dashboard can list which locations have vs. have not submitted.
    let roster;
    if (req.query.includeRoster) {
      const [districts, areas, units] = await Promise.all([
        District.find().select('name').lean(),
        AreaMaster.find().populate('districtId', 'name').select('name districtId').lean(),
        UnitMaster.find().populate('districtId', 'name').populate('areaId', 'name').select('name districtId areaId').lean(),
      ]);
      roster = {
        districts: districts.map(d => ({ name: d.name })),
        areas: areas.map(a => ({ name: a.name, districtName: a.districtId?.name })),
        units: units.map(u => ({ name: u.name, districtName: u.districtId?.name, areaName: u.areaId?.name })),
      };
    }

    res.json({
      success: true,
      count: submissions.length,
      totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
      hasPrevPage: pageNum > 1,
      data: submissions,
      ...(roster && { roster })
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ success: false, message: 'Error fetching submissions', error: error.message });
  }
});

// @desc    Get report submissions scoped to the requesting user's hierarchy
// @route   GET /api/user/report-submissions
// @access  Private (District / Area / Unit users)
// The userId stored on a ReportSubmission is the District/Area/Unit master _id.
// A district user sees its own + every area & unit under it; an area user sees
// its own + every unit under it; a unit user sees only its own submissions.
router.get('/user/report-submissions', userAuth, async (req, res) => {
  try {
    const role = req.user.role || req.user.type;
    if (!VALID_REPORT_FOR.includes(role)) {
      return res.status(403).json({ success: false, message: 'Invalid user level' });
    }

    const districtId = req.user.districtId || req.user.districtMasterId;
    const areaId = req.user.areaId || req.user.areaMasterId;
    const unitId = req.user.unitId || req.user.unitMasterId;
    const selfId = req.user.id || req.user._id || req.user.userId;

    // Build the set of location-master ids whose submissions this user may view,
    // and the roster of unit/area names under this scope (used by the dashboard
    // to list which units/areas have vs. have not submitted).
    let scopeIds = [];
    const roster = { units: [], areas: [] };
    if (role === 'unit') {
      scopeIds = [unitId || selfId].filter(Boolean);
    } else if (role === 'area') {
      const units = await UnitMaster.find({ areaId: areaId || selfId }).select('_id name').lean();
      scopeIds = [areaId || selfId, ...units.map(u => u._id)].filter(Boolean);
      roster.units = units.map(u => ({ name: u.name }));
    } else if (role === 'district') {
      const dId = districtId || selfId;
      const [areas, units] = await Promise.all([
        AreaMaster.find({ districtId: dId }).select('_id name').lean(),
        UnitMaster.find({ districtId: dId }).populate('areaId', 'name').select('_id name areaId').lean(),
      ]);
      scopeIds = [dId, ...areas.map(a => a._id), ...units.map(u => u._id)].filter(Boolean);
      roster.areas = areas.map(a => ({ name: a.name }));
      roster.units = units.map(u => ({ name: u.name, areaName: u.areaId?.name }));
    }

    if (scopeIds.length === 0) {
      return res.json({ success: true, count: 0, data: [], roster });
    }

    const { reportType, reportFor, status, limit = 1000 } = req.query;

    // Restrict to reports of the requested type (and optionally reportFor).
    let matchingReportIds = null;
    const reportFilter = {};
    if (reportType && VALID_TYPES.includes(reportType)) reportFilter.type = reportType;
    if (reportFor && VALID_REPORT_FOR.includes(reportFor)) reportFilter.reportFor = reportFor;
    if (Object.keys(reportFilter).length > 0) {
      const matchingReports = await Report.find(reportFilter).select('_id').lean();
      matchingReportIds = matchingReports.map(r => r._id);
    }

    const submissionQuery = { userId: { $in: scopeIds } };
    if (matchingReportIds) submissionQuery.reportId = { $in: matchingReportIds };
    if (status) submissionQuery.status = status;

    const rawSubmissions = await ReportSubmission.find(submissionQuery)
      .populate('reportId', 'type reportFor title description pages parts version month year')
      .sort({ submittedAt: -1, createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    const submissions = await resolveSubmissionUsers(rawSubmissions);

    res.json({ success: true, count: submissions.length, data: submissions, roster });
  } catch (error) {
    console.error('Error fetching scoped submissions:', error);
    res.status(500).json({ success: false, message: 'Error fetching submissions', error: error.message });
  }
});

module.exports = router;
