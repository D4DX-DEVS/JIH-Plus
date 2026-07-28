const express = require('express');
const jwt = require('jsonwebtoken');
const DistrictAdmin = require('../../models/ihthisabi/DistrictAdmin');
const User = require('../../models/ihthisabi/User');
const Submission = require('../../models/ihthisabi/Submission');
const AlternativeSubmit = require('../../models/ihthisabi/alternativeSubmit');
const UnitAdminReply = require('../../models/ihthisabi/UnitAdminReply');
const { protect } = require('../../middlewares/ihthisabi/auth');
const {
  getHiddenQuarterFilter,
  getArchivedQuarterFilter,
  getAvailableSubmissionQuarter,
  isQuarterHidden
} = require('../../utils/quarterHelper');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');

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

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeLocationValue = (value = '') => String(value)
  .replace(/\s*\([^)]*\)\s*/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const buildLocationVariants = (value = '') => {
  const raw = String(value || '').trim();
  const normalized = normalizeLocationValue(value);
  return [...new Set([raw, normalized].filter(Boolean))];
};

const buildExactMatch = (value = '') => {
  const variants = buildLocationVariants(value);
  if (variants.length === 0) return null;

  if (variants.length === 1) {
    return { $regex: `^${escapeRegex(variants[0])}$`, $options: 'i' };
  }

  return {
    $in: variants.map((variant) => new RegExp(`^${escapeRegex(variant)}$`, 'i'))
  };
};

// Resolve the member/submission scope for a district admin, optionally narrowed
// to a single area within the district (used by the Members/Submissions filters).
const getDistrictAdminScope = (districtAdmin, { area } = {}) => {
  const districtMatch = buildExactMatch(districtAdmin.district);
  const areaMatch = area ? buildExactMatch(area) : null;

  const memberQuery = districtMatch
    ? { role: 'rukn', district: districtMatch, ...(areaMatch ? { area: areaMatch } : {}) }
    : { role: 'rukn', district: '__no_matching_district__' };

  const submissionQuery = districtMatch
    ? { district: districtMatch, ...(areaMatch ? { area: areaMatch } : {}) }
    : { district: '__no_matching_district__' };

  return { memberQuery, submissionQuery };
};

// Walk back one submission quarter, skipping hidden quarters (mirrors admin.js)
const getPreviousAvailableQuarter = (quarter, year) => {
  let prevQuarter = quarter - 1;
  let prevYear = year;
  if (prevQuarter < 1) {
    prevQuarter = 4;
    prevYear -= 1;
  }
  while (isQuarterHidden(prevQuarter)) {
    prevQuarter -= 1;
    if (prevQuarter < 1) {
      prevQuarter = 4;
      prevYear -= 1;
    }
  }
  return { quarter: prevQuarter, year: prevYear };
};

const buildPeriodQuery = (quarter, year) => ({
  'submissionPeriod.quarter': quarter,
  'submissionPeriod.year': year
});

// Count regular + alternative submissions for a scope and period (admin parity)
const countPeriodSubmissions = async (scopeQuery, quarter, year) => {
  const periodQuery = buildPeriodQuery(quarter, year);
  const [normal, alternative] = await Promise.all([
    Submission.countDocuments({ $and: [scopeQuery, periodQuery] }),
    AlternativeSubmit.countDocuments({ $and: [scopeQuery, periodQuery] })
  ]);
  return normal + alternative;
};

const requireDistrictAdmin = async (req, res) => {
  if (req.user.role !== 'districtAdmin') {
    res.status(403).json({
      success: false,
      message: 'Access denied. District admin access required.'
    });
    return null;
  }

  const districtAdmin = await DistrictAdmin.findById(req.user.userId);
  if (!districtAdmin) {
    res.status(404).json({
      success: false,
      message: 'District admin not found'
    });
    return null;
  }

  return districtAdmin;
};

// @desc    District Admin Login
// @route   POST /api/districtadmin/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { district, ruknId } = req.body;

    if (!district || !ruknId) {
      return res.status(400).json({
        success: false,
        message: 'District and RUKN ID are required'
      });
    }

    const districtAdmin = await DistrictAdmin.findOne({
      ruknId,
      district: buildExactMatch(district)
    });

    if (!districtAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your district and RUKN ID.'
      });
    }

    if (!districtAdmin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account is deactivated. Please contact main admin.'
      });
    }

    districtAdmin.lastLogin = new Date();
    await districtAdmin.save();

    const token = jwt.sign(
      {
        userId: districtAdmin._id,
        role: 'districtAdmin',
        district: districtAdmin.district,
        ruknId: districtAdmin.ruknId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      success: true,
      message: 'District Admin login successful',
      data: {
        user: {
          id: districtAdmin._id,
          role: 'districtAdmin',
          ruknId: districtAdmin.ruknId,
          name: districtAdmin.name,
          district: districtAdmin.district,
          contactNo: districtAdmin.contactNo,
          emailId: districtAdmin.emailId
        },
        token
      }
    });
  } catch (error) {
    console.error('District Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @desc    Get district admin profile
// @route   GET /api/districtadmin/me
// @access  Private (District Admin)
router.get('/me', protect, async (req, res) => {
  try {
    const districtAdmin = await requireDistrictAdmin(req, res);
    if (!districtAdmin) return;

    res.json({
      success: true,
      data: {
        user: {
          id: districtAdmin._id,
          role: 'districtAdmin',
          ruknId: districtAdmin.ruknId,
          name: districtAdmin.name,
          district: districtAdmin.district,
          contactNo: districtAdmin.contactNo,
          emailId: districtAdmin.emailId,
          lastLogin: districtAdmin.lastLogin
        }
      }
    });
  } catch (error) {
    console.error('Get district admin profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get distinct areas under this district (for filter dropdowns)
// @route   GET /api/districtadmin/areas
// @access  Private (District Admin)
router.get('/areas', protect, async (req, res) => {
  try {
    const districtAdmin = await requireDistrictAdmin(req, res);
    if (!districtAdmin) return;

    const { memberQuery } = getDistrictAdminScope(districtAdmin);
    const areas = await User.distinct('area', memberQuery);

    res.json({
      success: true,
      data: {
        areas: areas.filter(Boolean).sort()
      }
    });
  } catch (error) {
    console.error('Get district admin areas error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Detailed breakdown for a single area: all members, submitted and pending
//          for a given quarter (defaults to the current submission quarter)
// @route   GET /api/districtadmin/areas/:area/details
// @access  Private (District Admin)
router.get('/areas/:area/details', protect, async (req, res) => {
  try {
    const districtAdmin = await requireDistrictAdmin(req, res);
    if (!districtAdmin) return;

    const area = req.params.area;
    const current = getAvailableSubmissionQuarter(new Date());
    let quarter = parseInt(req.query.quarter, 10);
    let year = parseInt(req.query.year, 10);
    if (!quarter || !year || quarter < 1 || quarter > 4) {
      quarter = current.quarter;
      year = current.year;
    }

    // 'Unspecified' rows in the breakdown represent members with no area set
    const isUnspecified = area === 'Unspecified';
    const { memberQuery, submissionQuery } = getDistrictAdminScope(
      districtAdmin,
      isUnspecified ? {} : { area }
    );
    if (isUnspecified) {
      const noArea = { $in: [null, ''] };
      memberQuery.area = noArea;
      submissionQuery.area = noArea;
    }
    const periodQuery = buildPeriodQuery(quarter, year);

    const section = ['all', 'submitted', 'pending'].includes(req.query.section) ? req.query.section : 'all';
    const { search = '' } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const [members, submissions, altSubmissions] = await Promise.all([
      User.find(memberQuery)
        .select('ruknId name gender unit area contactNo emailId lastLogin createdAt')
        .sort({ name: 1 })
        .lean(),
      Submission.find({ $and: [submissionQuery, periodQuery] })
        .select('userId submittedBy ruknId ruknName unit status createdAt')
        .lean(),
      AlternativeSubmit.find({ $and: [submissionQuery, periodQuery] })
        .select('userId ruknName type reason createdAt')
        .lean()
    ]);

    // Map each member to their submission (regular first, then alternative)
    const submissionByUser = new Map();
    submissions.forEach((s) => {
      [s.userId, s.submittedBy].filter(Boolean).forEach((id) => {
        if (!submissionByUser.has(String(id))) {
          submissionByUser.set(String(id), {
            submissionId: s._id,
            status: s.status,
            submittedAt: s.createdAt,
            type: 'regular'
          });
        }
      });
    });
    altSubmissions.forEach((s) => {
      if (s.userId && !submissionByUser.has(String(s.userId))) {
        submissionByUser.set(String(s.userId), {
          submissionId: s._id,
          status: 'alternative',
          submittedAt: s.createdAt,
          type: 'alternative',
          altType: s.type
        });
      }
    });

    const allMembers = [];
    const submittedMembers = [];
    const pendingMembers = [];
    members.forEach((member) => {
      const submission = submissionByUser.get(String(member._id));
      const memberWithSubmission = { ...member, submission: submission || null };
      allMembers.push(memberWithSubmission);
      if (submission) {
        submittedMembers.push(memberWithSubmission);
      } else {
        pendingMembers.push(memberWithSubmission);
      }
    });

    // Tab badge counts always reflect the full (unsearched) section sizes
    const totalMembers = allMembers.length;
    const submittedCount = submittedMembers.length;
    const pendingCount = pendingMembers.length;

    const sectionList = section === 'submitted' ? submittedMembers
      : section === 'pending' ? pendingMembers
      : allMembers;

    const searchedList = search
      ? sectionList.filter((member) => {
          const q = search.toLowerCase();
          return [member.name, member.ruknId, member.unit, member.contactNo]
            .some((v) => v && String(v).toLowerCase().includes(q));
        })
      : sectionList;

    const pageItems = searchedList.slice(skip, skip + limit);

    res.json({
      success: true,
      data: {
        district: districtAdmin.district,
        area,
        period: { quarter, year },
        section,
        totalMembers,
        submittedCount,
        pendingCount,
        items: pageItems,
        pagination: buildPaginationMeta(searchedList.length, page, limit)
      }
    });
  } catch (error) {
    console.error('Get district admin area details error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get dashboard statistics for the district (overview + area breakdown)
// @route   GET /api/districtadmin/dashboard
// @access  Private (District Admin)
router.get('/dashboard', protect, async (req, res) => {
  try {
    const districtAdmin = await requireDistrictAdmin(req, res);
    if (!districtAdmin) return;

    const { memberQuery, submissionQuery } = getDistrictAdminScope(districtAdmin);

    // Current submission quarter = previous completed quarter (admin parity)
    const current = getAvailableSubmissionQuarter(new Date());
    const previous = getPreviousAvailableQuarter(current.quarter, current.year);

    // Optional quarter/year filter — scopes the area breakdown (defaults to current)
    let breakdownQuarter = parseInt(req.query.quarter, 10);
    let breakdownYear = parseInt(req.query.year, 10);
    if (!breakdownQuarter || !breakdownYear || breakdownQuarter < 1 || breakdownQuarter > 4) {
      breakdownQuarter = current.quarter;
      breakdownYear = current.year;
    }
    const breakdownPeriodQuery = buildPeriodQuery(breakdownQuarter, breakdownYear);

    const [
      totalMembers,
      currentQuarterSubmissions,
      previousQuarterSubmissions,
      submittedCount,
      reviewedCount,
      approvedCount,
      availableYears
    ] = await Promise.all([
      User.countDocuments(memberQuery),
      countPeriodSubmissions(submissionQuery, current.quarter, current.year),
      countPeriodSubmissions(submissionQuery, previous.quarter, previous.year),
      Submission.countDocuments({ $and: [submissionQuery, buildPeriodQuery(current.quarter, current.year)], status: 'submitted' }),
      Submission.countDocuments({ $and: [submissionQuery, buildPeriodQuery(current.quarter, current.year)], status: 'reviewed' }),
      Submission.countDocuments({ $and: [submissionQuery, buildPeriodQuery(current.quarter, current.year)], status: 'approved' }),
      Submission.distinct('submissionPeriod.year', submissionQuery)
    ]);

    const completionRate = totalMembers > 0
      ? Math.round((currentQuarterSubmissions / totalMembers) * 100)
      : 0;

    const quarterChangePercent = previousQuarterSubmissions > 0
      ? Math.round(((currentQuarterSubmissions - previousQuarterSubmissions) / previousQuarterSubmissions) * 100)
      : currentQuarterSubmissions > 0 ? 100 : 0;

    const recentSubmissions = await Submission.find({
      ...submissionQuery,
      ...req.quarterFilter
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('status periodDisplay submissionPeriod ruknName ruknId area unit createdAt');

    // Members-per-area breakdown, sorted by member count descending
    const membersByArea = await User.aggregate([
      { $match: memberQuery },
      { $group: { _id: { $ifNull: ['$area', 'Unspecified'] }, memberCount: { $sum: 1 } } },
      { $sort: { memberCount: -1 } }
    ]);

    // Submissions-per-area breakdown for the selected quarter (regular + alternative)
    const areaAggPipeline = [
      { $match: { $and: [submissionQuery, breakdownPeriodQuery] } },
      { $group: { _id: { $ifNull: ['$area', 'Unspecified'] }, submissionCount: { $sum: 1 } } }
    ];
    const [submissionsByArea, altByArea] = await Promise.all([
      Submission.aggregate(areaAggPipeline),
      AlternativeSubmit.aggregate(areaAggPipeline)
    ]);

    const submissionsByAreaMap = new Map(submissionsByArea.map((row) => [row._id, row.submissionCount]));
    altByArea.forEach((row) => {
      submissionsByAreaMap.set(row._id, (submissionsByAreaMap.get(row._id) || 0) + row.submissionCount);
    });
    const areaBreakdown = membersByArea.map((row) => {
      const submissionCount = submissionsByAreaMap.get(row._id) || 0;
      return {
        area: row._id,
        memberCount: row.memberCount,
        submissionCount,
        completionRate: row.memberCount > 0 ? Math.round((submissionCount / row.memberCount) * 100) : 0
      };
    });

    // Quarterly trend (regular + alternative) for charts, respecting hidden/archived quarters
    const trendPipeline = [
      { $match: { $and: [submissionQuery, req.quarterFilter] } },
      {
        $group: {
          _id: { year: '$submissionPeriod.year', quarter: '$submissionPeriod.quarter' },
          count: { $sum: 1 }
        }
      }
    ];
    const [trendNormal, trendAlt] = await Promise.all([
      Submission.aggregate(trendPipeline),
      AlternativeSubmit.aggregate(trendPipeline)
    ]);
    const trendMap = new Map();
    [...trendNormal, ...trendAlt].forEach((row) => {
      if (!row._id?.year || !row._id?.quarter) return;
      const key = `${row._id.year}-${row._id.quarter}`;
      trendMap.set(key, (trendMap.get(key) || 0) + row.count);
    });
    const trend = [...trendMap.entries()]
      .map(([key, count]) => {
        const [year, quarter] = key.split('-').map(Number);
        return { year, quarter, count, label: `Q${quarter} ${year}` };
      })
      .sort((a, b) => (a.year - b.year) || (a.quarter - b.quarter))
      .slice(-6);

    res.json({
      success: true,
      data: {
        district: districtAdmin.district,
        stats: {
          totalMembers,
          currentQuarterSubmissions,
          previousQuarterSubmissions,
          quarterChangePercent,
          submittedCount,
          reviewedCount,
          approvedCount,
          completionRate,
          currentQuarter: current.quarter,
          currentYear: current.year,
          prevQuarter: previous.quarter,
          prevYear: previous.year
        },
        breakdownPeriod: { quarter: breakdownQuarter, year: breakdownYear },
        availableYears: availableYears.filter(Boolean).sort((a, b) => b - a),
        areaBreakdown,
        trend,
        recentSubmissions
      }
    });
  } catch (error) {
    console.error('Get district admin dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get all members under this district (with area filter + sort)
// @route   GET /api/districtadmin/members
// @access  Private (District Admin)
router.get('/members', protect, async (req, res) => {
  try {
    const districtAdmin = await requireDistrictAdmin(req, res);
    if (!districtAdmin) return;

    const { search = '', area = '', sortBy = 'createdAt', sortDir = 'desc' } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const { memberQuery } = getDistrictAdminScope(districtAdmin, { area });

    const match = { ...memberQuery };
    if (search) {
      const searchRegex = { $regex: escapeRegex(search), $options: 'i' };
      match.$or = [
        { name: searchRegex },
        { ruknId: searchRegex },
        { unit: searchRegex },
        { area: searchRegex }
      ];
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    const sortableFields = ['name', 'area', 'unit', 'submissionCount', 'createdAt'];
    const field = sortableFields.includes(sortBy) ? sortBy : 'createdAt';

    // Single aggregation: filter, compute each member's submission count via
    // $lookup, sort (including by the computed submissionCount), then page —
    // instead of fetching every district member and sorting/slicing in JS.
    const [result] = await User.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'submissions',
          let: { uid: '$_id' },
          pipeline: [
            { $match: { $expr: { $or: [{ $eq: ['$submittedBy', '$$uid'] }, { $eq: ['$userId', '$$uid'] }] } } },
            { $count: 'count' }
          ],
          as: 'submissionCountArr'
        }
      },
      { $addFields: { submissionCount: { $ifNull: [{ $arrayElemAt: ['$submissionCountArr.count', 0] }, 0] } } },
      { $sort: { [field]: dir } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                ruknId: 1, name: 1, gender: 1, unit: 1, district: 1, area: 1,
                contactNo: 1, emailId: 1, country: 1, lastLogin: 1, createdAt: 1, role: 1, submissionCount: 1
              }
            }
          ],
          totalCount: [{ $count: 'count' }]
        }
      }
    ]);

    const total = result.totalCount[0]?.count || 0;

    res.json({
      success: true,
      data: {
        members: result.data,
        totalCount: total,
        district: districtAdmin.district,
        pagination: buildPaginationMeta(total, page, limit)
      }
    });
  } catch (error) {
    console.error('Get district admin members error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get detailed member information
// @route   GET /api/districtadmin/members/:id
// @access  Private (District Admin)
router.get('/members/:id', protect, async (req, res) => {
  try {
    const districtAdmin = await requireDistrictAdmin(req, res);
    if (!districtAdmin) return;

    const { memberQuery } = getDistrictAdminScope(districtAdmin);
    const member = await User.findOne({ _id: req.params.id, ...memberQuery })
      .select('ruknId name gender unit district area contactNo emailId country lastLogin createdAt');

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found or not under your district'
      });
    }

    const submissions = await Submission.find({
      $or: [{ submittedBy: member._id }, { userId: member._id }]
    })
      .select('status period submissionPeriod periodDisplay form createdAt updatedAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        member: {
          ...member.toObject(),
          totalSubmissions: submissions.length,
          submittedCount: submissions.filter((s) => s.status === 'submitted').length,
          reviewedCount: submissions.filter((s) => s.status === 'reviewed').length,
          approvedCount: submissions.filter((s) => s.status === 'approved').length,
          latestSubmission: submissions[0] || null
        },
        submissions,
        district: districtAdmin.district
      }
    });
  } catch (error) {
    console.error('Get district admin member details error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get all submissions from members under this district (area filter + sort)
// @route   GET /api/districtadmin/submissions
// @access  Private (District Admin)
router.get('/submissions', protect, async (req, res) => {
  try {
    const districtAdmin = await requireDistrictAdmin(req, res);
    if (!districtAdmin) return;

    const { search = '', area = '', status = '', sortBy = 'createdAt', sortDir = 'desc' } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const { submissionQuery } = getDistrictAdminScope(districtAdmin, { area });

    const query = { ...submissionQuery, ...req.quarterFilter };
    if (status) query.status = status;
    if (search) {
      const searchRegex = { $regex: escapeRegex(search), $options: 'i' };
      query.$or = [
        { ruknName: searchRegex },
        { ruknId: searchRegex },
        { unit: searchRegex },
        { area: searchRegex }
      ];
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    const sortableFields = ['ruknName', 'area', 'unit', 'status', 'createdAt'];
    const field = sortableFields.includes(sortBy) ? sortBy : 'createdAt';

    const [submissions, total] = await Promise.all([
      Submission.find(query)
        .select('_id submittedBy userId ruknName ruknId unit area submissionPeriod periodDisplay createdAt status adminReply')
        .populate({ path: 'submittedBy', select: 'ruknId name' })
        .populate({ path: 'userId', select: 'ruknId name' })
        .sort({ [field]: dir })
        .skip(skip)
        .limit(limit)
        .lean(),
      Submission.countDocuments(query)
    ]);

    const trimmedSubmissions = submissions.map((submission) => ({
      submissionId: submission._id,
      userId: submission.userId?._id || submission.submittedBy?._id || null,
      ruknId: submission.ruknId || submission.submittedBy?.ruknId || submission.userId?.ruknId || 'N/A',
      ruknName: submission.ruknName || submission.submittedBy?.name || submission.userId?.name || 'Unknown Member',
      unit: submission.unit,
      area: submission.area,
      quarter: submission.periodDisplay,
      status: submission.status,
      createdAt: submission.createdAt,
      adminReply: submission.adminReply
    }));

    res.json({
      success: true,
      data: {
        submissions: trimmedSubmissions,
        pagination: buildPaginationMeta(total, page, limit)
      }
    });
  } catch (error) {
    console.error('Get district admin submissions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get submission details
// @route   GET /api/districtadmin/submissions/:id
// @access  Private (District Admin)
router.get('/submissions/:id', protect, async (req, res) => {
  try {
    const districtAdmin = await requireDistrictAdmin(req, res);
    if (!districtAdmin) return;

    const { submissionQuery } = getDistrictAdminScope(districtAdmin);
    const submission = await Submission.findOne({ _id: req.params.id, ...submissionQuery })
      .populate('submittedBy', 'ruknId name unit district area')
      .populate('userId', 'ruknId name unit district area')
      .populate('adminReply.repliedBy', 'username name');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found or access denied'
      });
    }

    res.json({ success: true, data: { submission } });
  } catch (error) {
    console.error('Get district admin submission details error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Update district admin profile
// @route   PUT /api/districtadmin/profile
// @access  Private (District Admin)
router.put('/profile', protect, async (req, res) => {
  try {
    if (req.user.role !== 'districtAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. District admin access required.'
      });
    }

    const allowedUpdates = ['name', 'contactNo', 'emailId'];
    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    const districtAdmin = await DistrictAdmin.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: districtAdmin._id,
          role: 'districtAdmin',
          ruknId: districtAdmin.ruknId,
          name: districtAdmin.name,
          district: districtAdmin.district,
          contactNo: districtAdmin.contactNo,
          emailId: districtAdmin.emailId
        }
      }
    });
  } catch (error) {
    console.error('District admin profile update error:', error);
    res.status(500).json({ success: false, message: 'Server error during profile update' });
  }
});

// @desc    Change password
// @route   PUT /api/districtadmin/change-password
// @access  Private (District Admin)
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const districtAdmin = await DistrictAdmin.findById(req.user.userId).select('+password');
    const isCurrentPasswordValid = await districtAdmin.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    districtAdmin.password = newPassword;
    await districtAdmin.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('District admin change password error:', error);
    res.status(500).json({ success: false, message: 'Server error during password change' });
  }
});

// @desc    Get admin replies for all units under this district
// @route   GET /api/districtadmin/replies
// @access  Private (District Admin)
router.get('/replies', protect, async (req, res) => {
  try {
    const districtAdmin = await requireDistrictAdmin(req, res);
    if (!districtAdmin) return;

    const { page, limit, skip } = parsePagination(req.query);
    const replyQuery = { district: buildExactMatch(districtAdmin.district), ...req.quarterFilter };

    const [replies, total] = await Promise.all([
      UnitAdminReply.find(replyQuery)
        .populate('repliedBy', 'username name')
        .sort({ repliedAt: -1 })
        .skip(skip)
        .limit(limit),
      UnitAdminReply.countDocuments(replyQuery)
    ]);

    res.json({
      success: true,
      data: {
        replies: replies.map((reply) => ({
          id: reply._id,
          unit: reply.unit,
          district: reply.district,
          year: reply.submissionPeriod.year,
          quarter: reply.submissionPeriod.quarter,
          periodDisplay: reply.periodDisplay,
          formattedMessage: reply.formattedMessage,
          repliedBy: reply.repliedBy,
          repliedAt: reply.repliedAt,
          whatsappSent: reply.whatsappSent,
          whatsappSentAt: reply.whatsappSentAt,
          createdAt: reply.createdAt
        })),
        totalCount: total,
        pagination: buildPaginationMeta(total, page, limit)
      }
    });
  } catch (error) {
    console.error('Get district admin replies error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get alternative submissions from members under this district
// @route   GET /api/districtadmin/alternative-submissions
// @access  Private (District Admin)
router.get('/alternative-submissions', protect, async (req, res) => {
  try {
    const districtAdmin = await requireDistrictAdmin(req, res);
    if (!districtAdmin) return;

    const { area = '' } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const { memberQuery } = getDistrictAdminScope(districtAdmin, { area });
    const members = await User.find(memberQuery).select('_id');
    const memberIds = members.map((m) => m._id);

    const altQuery = { userId: { $in: memberIds }, ...req.quarterFilter };
    const [alternativeSubmissions, total] = await Promise.all([
      AlternativeSubmit.find(altQuery)
        .populate('userId', 'ruknId name district area unit')
        .populate('adminReply.repliedBy', 'username name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('type district area unit ruknName reason submissionPeriod periodDisplay adminReply createdAt updatedAt'),
      AlternativeSubmit.countDocuments(altQuery)
    ]);

    res.json({
      success: true,
      data: {
        alternativeSubmissions,
        district: districtAdmin.district,
        totalCount: total,
        pagination: buildPaginationMeta(total, page, limit)
      }
    });
  } catch (error) {
    console.error('Get district admin alternative submissions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
