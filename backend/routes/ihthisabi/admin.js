const express = require('express');
const Submission = require('../../models/ihthisabi/Submission');
const AlternativeSubmit = require('../../models/ihthisabi/alternativeSubmit');
const ApplicationForm = require('../../models/ihthisabi/ApplicationForm');
const User = require('../../models/ihthisabi/User');
const ArchivedQuarter = require('../../models/ihthisabi/ArchivedQuarter');
const UnitAdmin = require('../../models/ihthisabi/UnitAdmin');
const DistrictAdmin = require('../../models/ihthisabi/DistrictAdmin');
const UnitAdminReply = require('../../models/ihthisabi/UnitAdminReply');
const UnitAdminMessage = require('../../models/ihthisabi/UnitAdminMessage');
const ReplyTemplate = require('../../models/ihthisabi/ReplyTemplate');
const AbroadCountry = require('../../models/ihthisabi/AbroadCountry');
const AbroadArea = require('../../models/ihthisabi/AbroadArea');
const AbroadUnit = require('../../models/ihthisabi/AbroadUnit');
const LocationMaster = require('../../models/ihthisabi/LocationMaster');
const { protect, authorize } = require('../../middlewares/ihthisabi/auth');
const upload = require('../../middlewares/ihthisabi/upload');
const { parseExcelFile, parseMembersExcelFile, parseUnitAdminExcelFile, buildMemberTemplateWorkbook } = require('../../utils/excelParser');
const { sendWhatsAppMessage, formatReplyMessage, formatStructuredReplyMessage } = require('../../utils/whatsapp');
const { enqueueBroadcast, getBroadcastJob } = require('../../utils/whatsappBroadcastQueue');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const escapeRegexSubmissions = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// All admin routes require admin role
router.use(protect);
router.use(authorize('admin', 'mainAdmin'));

// Test route to verify admin access
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Admin routes are working',
    user: req.user
  });
});

// @desc    List submissions (summary only, lightweight)
// @route   GET /api/admin/submissions
// @access  Private (Admin only)
router.get('/submissions', async (req, res) => {
  try {
    const { userId, district, area, unit, status, quarter, year, search } = req.query;
    const { page: pageNum, limit: limitNum } = parsePagination(req.query);

    // Exclude abroad users so their submissions appear only in the abroad view
    const abroadUsers = await User.find({ isAbroad: true }).select('_id').lean();
    const abroadUserIds = abroadUsers.map(u => u._id);

    const match = {};
    if (userId) {
      // Cast to ObjectId for aggregation pipeline (no auto-cast unlike Mongoose queries)
      const mongoose = require('mongoose');
      const userObjId = mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : userId;
      match.$or = [
        { userId: userObjId },
        { submittedBy: userObjId }
      ];
      // When filtering by a specific user, show their submissions regardless of abroad status
    } else {
      // Apply abroad exclusion only for general list (not per-user view)
      if (abroadUserIds.length > 0) {
        match.userId = { $nin: abroadUserIds };
      }
    }
    if (quarter) match['submissionPeriod.quarter'] = parseInt(quarter, 10);
    if (year) match['submissionPeriod.year'] = parseInt(year, 10);
    if (status) match.status = status;

    // District/area/unit/search filter on the RESOLVED location (current rukn location
    // via the lookups below), matching the semantics the frontend used to apply client-side.
    const resolvedMatch = {};
    if (district) resolvedMatch.district = district;
    if (area) resolvedMatch.area = area;
    if (unit) resolvedMatch.unit = unit;
    if (search) resolvedMatch.ruknName = { $regex: escapeRegexSubmissions(search), $options: 'i' };

    const pipeline = [
      { $match: match }, // Q3 submissions are visible in admin list view
      // Minimal lookup for current rukn location (no deep population)
      {
        $lookup: {
          from: 'users',
          let: { uid: '$userId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
            { $project: { district: 1, area: 1, unit: 1, name: 1, username: 1 } }
          ],
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      // Fallback lookup for unit admin submissions (userId references unitadmins collection)
      {
        $lookup: {
          from: 'unitadmins',
          let: { uid: '$userId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
            { $project: { district: 1, area: 1, unit: 1, name: 1, ruknId: 1 } }
          ],
          as: 'unitAdminUser'
        }
      },
      { $unwind: { path: '$unitAdminUser', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          district: { $ifNull: ['$user.district', { $ifNull: ['$unitAdminUser.district', '$district'] }] },
          area: { $ifNull: ['$user.area', { $ifNull: ['$unitAdminUser.area', '$area'] }] },
          unit: { $ifNull: ['$user.unit', { $ifNull: ['$unitAdminUser.unit', '$unit'] }] },
          location: {
            $let: {
              vars: {
                d: { $ifNull: ['$user.district', { $ifNull: ['$unitAdminUser.district', '$district'] }] },
                a: { $ifNull: ['$user.area', { $ifNull: ['$unitAdminUser.area', '$area'] }] },
                u: { $ifNull: ['$user.unit', { $ifNull: ['$unitAdminUser.unit', '$unit'] }] }
              },
              in: {
                $trim: {
                  input: {
                    $replaceAll: {
                      input: {
                        $trim: {
                          input: {
                            $concat: [
                              { $ifNull: ['$$d', ''] },
                              ' - ',
                              { $ifNull: ['$$a', ''] },
                              ' - ',
                              { $ifNull: ['$$u', ''] }
                            ]
                          }
                        }
                      },
                      find: ' -  - ',
                      replacement: ''
                    }
                  }
                }
              }
            }
          },
          ruknName: {
            $ifNull: [
              '$ruknName',
              { $ifNull: ['$user.name', { $ifNull: ['$unitAdminUser.name', '$user.username'] }] }
            ]
          },
          periodDisplay: {
            $cond: [
              { $ifNull: ['$submissionPeriod.year', false] },
              {
                $concat: [
                  'Q',
                  {
                    $toString: {
                      $cond: [
                        { $ifNull: ['$submissionPeriod.quarter', false] },
                        '$submissionPeriod.quarter',
                        {
                          $ceil: {
                            $divide: [
                              { $ifNull: ['$submissionPeriod.month', 1] },
                              3
                            ]
                          }
                        }
                      ]
                    }
                  },
                  ' ',
                  { $toString: '$submissionPeriod.year' }
                ]
              },
              'N/A'
            ]
          }
        }
      },
      // Filter on resolved (post-lookup) district/area/unit/name, matching the
      // semantics the frontend used to apply client-side over the full dataset.
      ...(Object.keys(resolvedMatch).length > 0 ? [{ $match: resolvedMatch }] : []),
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum },
            {
              $project: {
                _id: 0,
                id: '$_id',
                ruknName: 1,
                district: 1,
                area: 1,
                unit: 1,
                location: 1,
                submissionPeriod: 1,
                periodDisplay: 1,
                status: { $ifNull: ['$status', 'submitted'] },
                submittedAt: '$createdAt'
              }
            }
          ],
          total: [{ $count: 'count' }]
        }
      }
    ];

    const [result] = await Submission.aggregate(pipeline);
    const total = result?.total?.[0]?.count || 0;
    const submissions = result?.data || [];

    res.json({
      success: true,
      data: {
        submissions,
        pagination: buildPaginationMeta(total, pageNum, limitNum)
      }
    });
  } catch (error) {
    console.error('Get submissions (summary) error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Helper function to transform submission with location prioritization
const transformSubmissionWithLocation = (submission) => {
  // Get user - check if it's a populated object (has _id and is not just ObjectId)
  const userIdObj = submission.userId;
  const submittedByObj = submission.submittedBy;
  
  // Check if userId is populated (has _id property and is an object)
  const user = (userIdObj && typeof userIdObj === 'object' && userIdObj._id && userIdObj.district !== undefined)
    ? userIdObj
    : ((submittedByObj && typeof submittedByObj === 'object' && submittedByObj._id && submittedByObj.district !== undefined)
      ? submittedByObj
      : null);
  
  // ALWAYS prioritize rukn's current location from User collection for each field individually
  // Use user's location if user exists and has the field, otherwise fallback to submission's stored value
  const district = user && user.district !== undefined && user.district !== null && String(user.district).trim()
    ? String(user.district).trim()
    : ((submission.district || '').trim());
  const area = user && user.area !== undefined && user.area !== null && String(user.area).trim()
    ? String(user.area).trim()
    : ((submission.area || '').trim());
  const unit = user && user.unit !== undefined && user.unit !== null && String(user.unit).trim()
    ? String(user.unit).trim()
    : ((submission.unit || 'Unknown').trim());
  
  // Build location display from current values
  const locationDisplay = [district, area, unit].filter(Boolean).join(' - ') || 'N/A';
  
  // Create transformed submission object
  const transformed = submission.toObject ? submission.toObject() : { ...submission };
  
  // Override location fields with prioritized values
  transformed.district = district;
  transformed.area = area;
  transformed.unit = unit;
  transformed.locationDisplay = locationDisplay;
  
  // Debug logging for Hamsa submissions
  if (transformed.ruknName && transformed.ruknName.toLowerCase().includes('hamsa')) {
    console.log(`[DEBUG Hamsa Single] Submission ${transformed._id}:`, {
      period: transformed.submissionPeriod,
      userDistrict: user?.district,
      submissionDistrict: submission.district,
      finalDistrict: district,
      submissionUnit: submission.unit,
      userUnit: user?.unit,
      finalUnit: unit,
      finalLocation: locationDisplay
    });
  }
  
  return transformed;
};

// @desc    Get single submission by ID (with location prioritization)
// @route   GET /api/admin/submissions/:id
// @access  Private (Admin only)
router.get('/submissions/:id', async (req, res) => {
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

    // Transform submission with location prioritization
    const transformedSubmission = transformSubmissionWithLocation(submission);

    res.json({
      success: true,
      data: {
        submission: transformedSubmission
      }
    });
  } catch (error) {
    console.error('Get submission by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Add or update admin reply to a submission
// @route   POST /api/admin/submissions/:id/reply
// @access  Private (Admin only)
router.post('/submissions/:id/reply', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reply message is required'
      });
    }

    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Update or create admin reply
    submission.adminReply = {
      message: message.trim(),
      repliedBy: req.user.userId,
      repliedAt: new Date()
    };

    await submission.save();

    // Populate repliedBy for response
    await submission.populate('adminReply.repliedBy', 'username name');

    // Send WhatsApp message to unit admin
    let whatsappResult = null;
    let ruknWhatsappResult = null; // Track sending status to the rukn (submission owner)
    try {
      // Find unit admin for this submission's unit
      const unitAdmin = await UnitAdmin.findOne({ unit: submission.unit });
      
      if (unitAdmin && unitAdmin.contactNo && unitAdmin.contactNo.trim()) {
        const formattedMessage = formatReplyMessage(submission, message.trim());
        whatsappResult = await sendWhatsAppMessage(unitAdmin.contactNo, formattedMessage);
        
        if (whatsappResult.success) {
          console.log(`WhatsApp message sent successfully to unit admin: ${unitAdmin.name} (${unitAdmin.contactNo})`);
        } else {
          console.warn(`Failed to send WhatsApp message to unit admin: ${unitAdmin.name}`, whatsappResult.error);
        }
      } else {
        console.warn(`No contact number found for unit admin of unit: ${submission.unit}`);
      }
    } catch (whatsappError) {
      // Log error but don't fail the reply - WhatsApp is optional
      console.error('Error sending WhatsApp message:', whatsappError);
    }

    // Send WhatsApp message to the rukn (submission owner) - non-blocking
    try {
      // Fetch rukn user to get contact number
      const ruknUser = submission.userId
        ? await User.findById(submission.userId).select('contactNo name username')
        : null;

      if (ruknUser && ruknUser.contactNo && ruknUser.contactNo.trim()) {
        const formattedRuknMessage =
          `Feedback to your tri month Ihtisabi report\n\n${message.trim()}\n\n` +
          'Secretary\nTharbiya Vakupp\nJamaat-e-Islami Hind\nKerala';
        ruknWhatsappResult = await sendWhatsAppMessage(ruknUser.contactNo, formattedRuknMessage);

        if (ruknWhatsappResult.success) {
          console.log(
            `WhatsApp message sent successfully to rukn: ${ruknUser.name || ruknUser.username} (${ruknUser.contactNo})`
          );
        } else {
          console.warn(
            `Failed to send WhatsApp message to rukn: ${ruknUser.name || ruknUser.username}`,
            ruknWhatsappResult.error
          );
        }
      } else {
        console.warn('No contact number found for rukn of this submission');
      }
    } catch (ruknWhatsappError) {
      // Log error but don't fail the reply - WhatsApp is optional
      console.error('Error sending WhatsApp message to rukn:', ruknWhatsappError);
    }

    res.json({
      success: true,
      message: 'Reply added successfully',
      data: {
        submission: {
          id: submission._id,
          adminReply: submission.adminReply
        },
        unitAdminWhatsappSent: whatsappResult?.success || false,
        ruknWhatsappSent: ruknWhatsappResult?.success || false,
        // Backward compatibility
        whatsappSent: whatsappResult?.success || false
      }
    });
  } catch (error) {
    console.error('Add admin reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

const { getQuarterFromMonth, getOpenQuarter, filterHiddenQuarters, getHiddenQuarterFilter, isQuarterHidden, getAvailableSubmissionQuarter } = require('../../utils/quarterHelper');

// Helper function to get current quarter (for display/statistics)
// Note: For new submissions, use getOpenQuarter() instead
const getCurrentQuarter = () => {
  const currentMonth = new Date().getMonth() + 1; // 1-12
  return getQuarterFromMonth(currentMonth);
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin only)
router.get('/dashboard/stats', async (req, res) => {
  try {
    const now = new Date();

    // "Current quarter" for the dashboard = the submission quarter (last completed quarter)
    // e.g. when we're in Q2 2026 (Apr-Jun), people submit Q1 2026 data, so Q1 2026 is "current"
    const { quarter: currentQuarter, year: currentYear } = getAvailableSubmissionQuarter(now);

    // Helper: get previous available quarter, skipping hidden quarters
    const getPreviousAvailableQuarter = (q, y) => {
      let prevQ = q - 1;
      let prevY = y;
      if (prevQ === 0) { prevQ = 4; prevY = y - 1; }
      if (isQuarterHidden(prevQ)) {
        prevQ = prevQ - 1;
        if (prevQ === 0) { prevQ = 4; prevY = prevY - 1; }
      }
      return { quarter: prevQ, year: prevY };
    };

    const { quarter: prevQuarter, year: prevYear } = getPreviousAvailableQuarter(currentQuarter, currentYear);

    // Current quarter submissions count
    // Total = normal/abroad submissions (Submission collection) + alternative submissions (AlternativeSubmit collection)
    const currentQuarterNormalSubmissions = await Submission.countDocuments({
      'submissionPeriod.year': currentYear,
      'submissionPeriod.quarter': currentQuarter
    });
    const currentQuarterAlternativeSubmissions = await AlternativeSubmit.countDocuments({
      'submissionPeriod.year': currentYear,
      'submissionPeriod.quarter': currentQuarter
    });
    const currentQuarterSubmissions = currentQuarterNormalSubmissions + currentQuarterAlternativeSubmissions;

    // Previous quarter submissions count (same combined logic)
    const previousQuarterNormalSubmissions = await Submission.countDocuments({
      'submissionPeriod.year': prevYear,
      'submissionPeriod.quarter': prevQuarter
    });
    const previousQuarterAlternativeSubmissions = await AlternativeSubmit.countDocuments({
      'submissionPeriod.year': prevYear,
      'submissionPeriod.quarter': prevQuarter
    });
    const previousQuarterSubmissions = previousQuarterNormalSubmissions + previousQuarterAlternativeSubmissions;

    // Quarter-over-quarter % change
    const quarterChangePercent = previousQuarterSubmissions > 0
      ? Math.round(((currentQuarterSubmissions - previousQuarterSubmissions) / previousQuarterSubmissions) * 100)
      : currentQuarterSubmissions > 0 ? 100 : 0;

    // Gender breakdown of current quarter submissions (via join to users)
    const currentQuarterGenderAgg = await Submission.aggregate([
      {
        $match: {
          'submissionPeriod.year': currentYear,
          'submissionPeriod.quarter': currentQuarter
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userDoc'
        }
      },
      { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$userDoc.gender', 'Unknown'] },
          count: { $sum: 1 }
        }
      }
    ]);
    // Same gender breakdown for alternative submissions, so Male + Female reconciles with the combined total above
    const currentQuarterAltGenderAgg = await AlternativeSubmit.aggregate([
      {
        $match: {
          'submissionPeriod.year': currentYear,
          'submissionPeriod.quarter': currentQuarter
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userDoc'
        }
      },
      { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$userDoc.gender', 'Unknown'] },
          count: { $sum: 1 }
        }
      }
    ]);
    const currentQuarterMale = (currentQuarterGenderAgg.find(g => g._id === 'Male')?.count || 0)
      + (currentQuarterAltGenderAgg.find(g => g._id === 'Male')?.count || 0);
    const currentQuarterFemale = (currentQuarterGenderAgg.find(g => g._id === 'Female')?.count || 0)
      + (currentQuarterAltGenderAgg.find(g => g._id === 'Female')?.count || 0);

    // Total rukn users (active) with gender breakdown
    const totalUsersGenderAgg = await User.aggregate([
      {
        $match: {
          role: 'rukn',
          $or: [{ isActive: true }, { isActive: { $exists: false } }]
        }
      },
      {
        $group: {
          _id: { $ifNull: ['$gender', 'Unknown'] },
          count: { $sum: 1 }
        }
      }
    ]);
    const maleUsers = totalUsersGenderAgg.find(g => g._id === 'Male')?.count || 0;
    const femaleUsers = totalUsersGenderAgg.find(g => g._id === 'Female')?.count || 0;
    const totalRuknUsers = totalUsersGenderAgg.reduce((sum, g) => sum + g.count, 0);

    res.json({
      success: true,
      data: {
        totalRuknUsers,
        maleUsers,
        femaleUsers,
        currentQuarterSubmissions,
        currentQuarterMale,
        currentQuarterFemale,
        previousQuarterSubmissions,
        prevQuarter,
        prevYear,
        currentQuarter,
        currentYear,
        quarterChangePercent
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Shared helper: current + previous available submission period (mirrors the
// logic in /dashboard/stats) — used by the district-stats route below.
const getDashboardPeriods = (now = new Date()) => {
  const { quarter: currentQuarter, year: currentYear } = getAvailableSubmissionQuarter(now);
  let prevQuarter = currentQuarter - 1;
  let prevYear = currentYear;
  if (prevQuarter === 0) { prevQuarter = 4; prevYear -= 1; }
  if (isQuarterHidden(prevQuarter)) {
    prevQuarter -= 1;
    if (prevQuarter === 0) { prevQuarter = 4; prevYear -= 1; }
  }
  return { currentQuarter, currentYear, prevQuarter, prevYear };
};

// @desc    District-wise submission stats: current vs previous period, combining
//          normal/abroad (Submission) + alternative (AlternativeSubmit) submissions
// @route   GET /api/admin/dashboard/district-stats
// @access  Private (Admin only)
router.get('/dashboard/district-stats', async (req, res) => {
  try {
    const { currentQuarter, currentYear, prevQuarter, prevYear } = getDashboardPeriods();

    const aggByDistrict = (Model, year, quarter) => Model.aggregate([
      { $match: { 'submissionPeriod.year': year, 'submissionPeriod.quarter': quarter } },
      { $group: { _id: '$district', count: { $sum: 1 } } }
    ]);

    const [curSub, curAlt, prevSub, prevAlt] = await Promise.all([
      aggByDistrict(Submission, currentYear, currentQuarter),
      aggByDistrict(AlternativeSubmit, currentYear, currentQuarter),
      aggByDistrict(Submission, prevYear, prevQuarter),
      aggByDistrict(AlternativeSubmit, prevYear, prevQuarter)
    ]);

    // Some historical rows have a raw Mongo ObjectId string stored in `district`
    // (a data-entry bug elsewhere, not something to display as a district).
    const isLikelyObjectId = (value) => /^[0-9a-f]{24}$/i.test(String(value || '').trim());
    // Different casings of the same district ("ERNAKULAM" / "Ernakulam") are the
    // same place — group on a normalized key so they don't show as separate bars.
    const normalizeDistrictKey = (value) => String(value || '').trim().toUpperCase();
    const titleCase = (value) => String(value || '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

    const mergeByDistrict = (...lists) => {
      const map = new Map(); // normalized key -> { count, label }
      lists.forEach(list => {
        list.forEach(({ _id, count }) => {
          const raw = String(_id || '').trim();
          if (!raw || isLikelyObjectId(raw)) return;
          const key = normalizeDistrictKey(raw);
          const existing = map.get(key);
          if (existing) {
            existing.count += count;
          } else {
            map.set(key, { count, label: titleCase(raw) });
          }
        });
      });
      return map;
    };

    const currentMap = mergeByDistrict(curSub, curAlt);
    const prevMap = mergeByDistrict(prevSub, prevAlt);

    const allKeys = Array.from(new Set([...currentMap.keys(), ...prevMap.keys()]));

    const districts = allKeys
      .map(key => {
        const current = currentMap.get(key)?.count || 0;
        const previous = prevMap.get(key)?.count || 0;
        const label = currentMap.get(key)?.label || prevMap.get(key)?.label || key;
        const changePercent = previous > 0
          ? Math.round(((current - previous) / previous) * 100)
          : (current > 0 ? 100 : 0);
        return { district: label, current, previous, changePercent };
      })
      // Most active districts first — makes a sensible default when the UI only
      // shows the top district's chart out of the box.
      .sort((a, b) => b.current - a.current || a.district.localeCompare(b.district));

    res.json({
      success: true,
      data: { districts, currentQuarter, currentYear, prevQuarter, prevYear }
    });
  } catch (error) {
    console.error('District stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Submitted vs pending units for the current period, optionally scoped
//          to a district and/or area. "All units" = union of units derived from
//          active rukn Users and admin-added LocationMaster rows (same source
//          used for the location dropdowns elsewhere in the app).
// @route   GET /api/admin/dashboard/units-status?district=&area=
// @access  Private (Admin only)
router.get('/dashboard/units-status', async (req, res) => {
  try {
    const { district, area } = req.query;
    const { currentQuarter, currentYear } = getDashboardPeriods();

    const userMatch = { role: 'rukn', isAbroad: { $ne: true }, unit: { $nin: [null, ''] } };
    if (district) userMatch.district = district;
    if (area) userMatch.area = area;

    const userUnits = await User.aggregate([
      { $match: userMatch },
      { $group: { _id: { district: '$district', area: '$area', unit: '$unit' } } }
    ]);

    const masterMatch = { type: 'unit', isActive: true };
    if (district) masterMatch.district = district;
    if (area) masterMatch.area = area;
    const masterUnits = await LocationMaster.find(masterMatch).select('name district area').lean();

    const unitMap = new Map();
    userUnits.forEach(({ _id }) => {
      if (!_id.district || !_id.area || !_id.unit) return;
      const key = `${_id.district}|${_id.area}|${_id.unit}`;
      unitMap.set(key, { district: _id.district, area: _id.area, unit: _id.unit });
    });
    masterUnits.forEach(row => {
      if (!row.district || !row.area || !row.name) return;
      const key = `${row.district}|${row.area}|${row.name}`;
      if (!unitMap.has(key)) unitMap.set(key, { district: row.district, area: row.area, unit: row.name });
    });

    const allUnits = Array.from(unitMap.values());

    const periodMatch = { 'submissionPeriod.year': currentYear, 'submissionPeriod.quarter': currentQuarter };
    if (district) periodMatch.district = district;
    if (area) periodMatch.area = area;

    const groupByUnit = (Model) => Model.aggregate([
      { $match: periodMatch },
      { $group: { _id: { district: '$district', area: '$area', unit: '$unit' } } }
    ]);

    const [subUnits, altUnits] = await Promise.all([
      groupByUnit(Submission),
      groupByUnit(AlternativeSubmit)
    ]);

    const submittedSet = new Set();
    [...subUnits, ...altUnits].forEach(({ _id }) => {
      submittedSet.add(`${_id.district}|${_id.area}|${_id.unit}`);
    });

    const submittedUnits = [];
    const pendingUnits = [];
    allUnits.forEach(u => {
      const key = `${u.district}|${u.area}|${u.unit}`;
      (submittedSet.has(key) ? submittedUnits : pendingUnits).push(u);
    });

    const byName = (a, b) => a.unit.localeCompare(b.unit);
    submittedUnits.sort(byName);
    pendingUnits.sort(byName);

    res.json({
      success: true,
      data: {
        currentQuarter,
        currentYear,
        totalUnits: allUnits.length,
        submittedCount: submittedUnits.length,
        pendingCount: pendingUnits.length,
        submittedUnits,
        pendingUnits
      }
    });
  } catch (error) {
    console.error('Units status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Consolidation stats with flexible filters
// @route   GET /api/admin/consolidation
// @access  Private (Admin only)
router.get('/consolidation', async (req, res) => {
  try {
    const {
      district,
      area,
      unit,
      year,
      quarter,
      // categorical filters
      quranStatus,
      islami,
      atma,
      baithulmaal,
      zakatPaid,
      recruitEffort,
      meqathService,
      skillUsage,
      jamaathAgenda,
      jamaathInfluence,
      weeklyMeeting,
      jamaathMeeting,
      grihameetings,
      thahreekiMeetings,
      // numeric range filters
      hadithMin,
      hadithMax,
      newMembersMin,
      newMembersMax,
      muslimRelationsMin,
      muslimRelationsMax,
      communityRelationsMin,
      communityRelationsMax,
      scoreCountMin,
      scoreCountMax
    } = req.query;

    // Build match filter
    const match = {};
    if (district) match.district = district;
    if (area) match.area = area;
    if (unit) match.unit = unit;
    if (year) match['submissionPeriod.year'] = Number(year);
    if (quarter) match['submissionPeriod.quarter'] = Number(quarter);

    if (quranStatus) match['form.quranStudy.status'] = quranStatus;
    if (islami !== undefined && islami !== null && String(islami).trim() !== '') {
      match['form.bookReading.islami'] = String(islami).trim();
    }
    if (atma !== undefined && atma !== null && String(atma).trim() !== '') {
      match['form.bookReading.atma'] = String(atma).trim();
    }
    if (baithulmaal) match['form.baithulmaal'] = baithulmaal;
    if (zakatPaid) match['form.zakatPaid'] = zakatPaid;
    if (recruitEffort) match['form.recruitEffort'] = recruitEffort;
    if (meqathService) match['form.meqathService'] = meqathService;
    if (skillUsage) match['form.skillUsage'] = skillUsage;
    if (jamaathAgenda) match['form.jamaathAgenda'] = jamaathAgenda;
    if (jamaathInfluence) match['form.jamaathInfluence'] = jamaathInfluence;

    // Build meeting filter conditions separately
    const meetingConditions = [];
    const othersConditions = [];

    // Weekly meeting filter
    if (weeklyMeeting === 'fullAttended') {
      meetingConditions.push(
        { 'form.weeklyMeeting.absent': 0 },
        { 'form.weeklyMeeting.leave': 0 }
      );
    } else if (weeklyMeeting === 'others') {
      othersConditions.push(
        { 'form.weeklyMeeting.absent': { $gt: 0 } },
        { 'form.weeklyMeeting.leave': { $gt: 0 } }
      );
    }

    // Jamaath meeting filter
    if (jamaathMeeting === 'fullAttended') {
      meetingConditions.push(
        { 'form.jamaathMeeting.absent': 0 },
        { 'form.jamaathMeeting.leave': 0 }
      );
    } else if (jamaathMeeting === 'others') {
      othersConditions.push(
        { 'form.jamaathMeeting.absent': { $gt: 0 } },
        { 'form.jamaathMeeting.leave': { $gt: 0 } }
      );
    }

    // Apply meeting conditions
    if (meetingConditions.length > 0) {
      meetingConditions.forEach(cond => {
        Object.assign(match, cond);
      });
    }

    // Apply "others" conditions - if we have both meeting conditions and others, use $and
    if (othersConditions.length > 0) {
      if (meetingConditions.length > 0) {
        // We have both fullAttended and others, need $and
        if (!match['$and']) match['$and'] = [];
        match['$and'].push({ $or: othersConditions });
      } else {
        // Only others conditions, use $or
        match['$or'] = othersConditions;
      }
    }

    // Griha meetings filter
    if (grihameetings !== undefined && grihameetings !== null && String(grihameetings).trim() !== '') {
      const gVal = Number(grihameetings);
      if (gVal === 0) {
        // Match documents where grihameetings is 0 OR the field is absent/null
        // (consistent with the breakdown that treats missing fields as 0)
        if (!match['$and']) match['$and'] = [];
        match['$and'].push({ $or: [
          { 'form.grihameetings': 0 },
          { 'form.grihameetings': { $exists: false } },
          { 'form.grihameetings': null }
        ]});
      } else {
        match['form.grihameetings'] = gVal;
      }
    }

    // Thahreeki meetings filter
    if (thahreekiMeetings !== undefined && thahreekiMeetings !== null && String(thahreekiMeetings).trim() !== '') {
      const tVal = Number(thahreekiMeetings);
      if (tVal === 0) {
        if (!match['$and']) match['$and'] = [];
        match['$and'].push({ $or: [
          { 'form.thahreekiMeetings': 0 },
          { 'form.thahreekiMeetings': { $exists: false } },
          { 'form.thahreekiMeetings': null }
        ]});
      } else {
        match['form.thahreekiMeetings'] = tVal;
      }
    }

    // Numeric range helpers
    const addRange = (path, minVal, maxVal) => {
      if (minVal !== undefined || maxVal !== undefined) {
        match[path] = {};
        if (minVal !== undefined) match[path]['$gte'] = Number(minVal);
        if (maxVal !== undefined) match[path]['$lte'] = Number(maxVal);
      }
    };

    addRange('form.hadithCount', hadithMin, hadithMax);
    addRange('form.newMembers', newMembersMin, newMembersMax);
    addRange('form.muslimRelations', muslimRelationsMin, muslimRelationsMax);
    addRange('form.communityRelations', communityRelationsMin, communityRelationsMax);
    addRange('form.scoreCount', scoreCountMin, scoreCountMax);

    // Apply hidden quarter filter only when no specific quarter is selected.
    // If a quarter is already in `match`, spreading getHiddenQuarterFilter() would
    // silently overwrite it with { $nin: [3] }, returning all non-Q3 quarters
    // instead of just the one the admin selected.
    const quarterOverrideFilter = quarter ? {} : getHiddenQuarterFilter();

    const pipeline = [
      { $match: { ...match, ...quarterOverrideFilter } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          // categorical breakdowns
          quranStatus: [
            { $group: { _id: '$form.quranStudy.status', count: { $sum: 1 } } },
            { $project: { _id: 0, k: { $ifNull: ['$_id', 'notSet'] }, v: '$count' } },
            { $match: { k: { $ne: null } } },
            { $group: { _id: null, map: { $push: { k: '$k', v: '$v' } } } },
            { $project: { _id: 0, map: { $arrayToObject: '$map' } } }
          ],
          bookReadingIslami: [
            { $group: { _id: '$form.bookReading.islami', count: { $sum: 1 } } },
            { $project: { _id: 0, k: { $ifNull: ['$_id', 'notSet'] }, v: '$count' } },
            { $match: { k: { $ne: null } } },
            { $group: { _id: null, map: { $push: { k: '$k', v: '$v' } } } },
            { $project: { _id: 0, map: { $arrayToObject: '$map' } } }
          ],
          bookReadingAtma: [
            { $group: { _id: '$form.bookReading.atma', count: { $sum: 1 } } },
            { $project: { _id: 0, k: { $ifNull: ['$_id', 'notSet'] }, v: '$count' } },
            { $match: { k: { $ne: null } } },
            { $group: { _id: null, map: { $push: { k: '$k', v: '$v' } } } },
            { $project: { _id: 0, map: { $arrayToObject: '$map' } } }
          ],
          baithulmaal: [
            { $group: { _id: '$form.baithulmaal', count: { $sum: 1 } } },
            { $project: { _id: 0, k: { $ifNull: ['$_id', 'notSet'] }, v: '$count' } },
            { $match: { k: { $ne: null } } },
            { $group: { _id: null, map: { $push: { k: '$k', v: '$v' } } } },
            { $project: { _id: 0, map: { $arrayToObject: '$map' } } }
          ],
          zakatPaid: [
            { $group: { _id: '$form.zakatPaid', count: { $sum: 1 } } },
            { $project: { _id: 0, k: { $ifNull: ['$_id', 'notSet'] }, v: '$count' } },
            { $match: { k: { $ne: null } } },
            { $group: { _id: null, map: { $push: { k: '$k', v: '$v' } } } },
            { $project: { _id: 0, map: { $arrayToObject: '$map' } } }
          ],
          recruitEffort: [
            { $group: { _id: '$form.recruitEffort', count: { $sum: 1 } } },
            { $project: { _id: 0, k: { $ifNull: ['$_id', 'notSet'] }, v: '$count' } },
            { $match: { k: { $ne: null } } },
            { $group: { _id: null, map: { $push: { k: '$k', v: '$v' } } } },
            { $project: { _id: 0, map: { $arrayToObject: '$map' } } }
          ],
          meqathService: [
            { $group: { _id: '$form.meqathService', count: { $sum: 1 } } },
            { $project: { _id: 0, k: { $ifNull: ['$_id', 'notSet'] }, v: '$count' } },
            { $match: { k: { $ne: null } } },
            { $group: { _id: null, map: { $push: { k: '$k', v: '$v' } } } },
            { $project: { _id: 0, map: { $arrayToObject: '$map' } } }
          ],
          skillUsage: [
            { $group: { _id: '$form.skillUsage', count: { $sum: 1 } } },
            { $project: { _id: 0, k: { $ifNull: ['$_id', 'notSet'] }, v: '$count' } },
            { $match: { k: { $ne: null } } },
            { $group: { _id: null, map: { $push: { k: '$k', v: '$v' } } } },
            { $project: { _id: 0, map: { $arrayToObject: '$map' } } }
          ],
          jamaathAgenda: [
            { $group: { _id: '$form.jamaathAgenda', count: { $sum: 1 } } },
            { $project: { _id: 0, k: { $ifNull: ['$_id', 'notSet'] }, v: '$count' } },
            { $match: { k: { $ne: null } } },
            { $group: { _id: null, map: { $push: { k: '$k', v: '$v' } } } },
            { $project: { _id: 0, map: { $arrayToObject: '$map' } } }
          ],
          jamaathInfluence: [
            { $group: { _id: '$form.jamaathInfluence', count: { $sum: 1 } } },
            { $project: { _id: 0, k: { $ifNull: ['$_id', 'notSet'] }, v: '$count' } },
            { $match: { k: { $ne: null } } },
            { $group: { _id: null, map: { $push: { k: '$k', v: '$v' } } } },
            { $project: { _id: 0, map: { $arrayToObject: '$map' } } }
          ],
          weeklyMeeting: [
            {
              $group: {
                _id: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$form.weeklyMeeting.absent', 0] },
                        { $eq: ['$form.weeklyMeeting.leave', 0] }
                      ]
                    },
                    then: 'fullAttended',
                    else: 'others'
                  }
                },
                count: { $sum: 1 }
              }
            },
            { $match: { _id: { $ne: null, $exists: true } } },
            { $project: { _id: 0, k: { $toString: '$_id' }, v: '$count' } },
            { $match: { k: { $ne: null, $exists: true } } },
            { $group: { _id: null, map: { $push: { k: '$k', v: '$v' } } } },
            { $project: { _id: 0, map: { $arrayToObject: '$map' } } }
          ],
          jamaathMeeting: [
            {
              $group: {
                _id: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$form.jamaathMeeting.absent', 0] },
                        { $eq: ['$form.jamaathMeeting.leave', 0] }
                      ]
                    },
                    then: 'fullAttended',
                    else: 'others'
                  }
                },
                count: { $sum: 1 }
              }
            },
            { $match: { _id: { $ne: null, $exists: true } } },
            { $project: { _id: 0, k: { $toString: '$_id' }, v: '$count' } },
            { $match: { k: { $ne: null, $exists: true } } },
            { $group: { _id: null, map: { $push: { k: '$k', v: '$v' } } } },
            { $project: { _id: 0, map: { $arrayToObject: '$map' } } }
          ],
          grihameetings: [
            // Use $ifNull so that submissions without this field (older records)
            // are counted as 0 rather than being excluded by a $type:'number' filter.
            { $group: { _id: { $ifNull: ['$form.grihameetings', 0] }, count: { $sum: 1 } } },
            { $project: { _id: 0, k: { $toString: '$_id' }, v: '$count' } },
            { $group: { _id: null, map: { $push: { k: '$k', v: '$v' } } } },
            { $project: { _id: 0, map: { $arrayToObject: '$map' } } }
          ],
          thahreekiMeetings: [
            { $group: { _id: { $ifNull: ['$form.thahreekiMeetings', 0] }, count: { $sum: 1 } } },
            { $project: { _id: 0, k: { $toString: '$_id' }, v: '$count' } },
            { $group: { _id: null, map: { $push: { k: '$k', v: '$v' } } } },
            { $project: { _id: 0, map: { $arrayToObject: '$map' } } }
          ],
          // numeric sums and meeting totals
          numericSums: [
            { $group: {
              _id: null,
              hadithCount: { $sum: { $ifNull: ['$form.hadithCount', 0] } },
              grihameetings: { $sum: { $ifNull: ['$form.grihameetings', 0] } },
              thahreekiMeetings: { $sum: { $ifNull: ['$form.thahreekiMeetings', 0] } },
              newMembers: { $sum: { $ifNull: ['$form.newMembers', 0] } },
              muslimRelations: { $sum: { $ifNull: ['$form.muslimRelations', 0] } },
              communityRelations: { $sum: { $ifNull: ['$form.communityRelations', 0] } },
              scoreCount: { $sum: { $ifNull: ['$form.scoreCount', 0] } },
              weekly_hadir: { $sum: { $ifNull: ['$form.weeklyMeeting.hadir', 0] } },
              weekly_leave: { $sum: { $ifNull: ['$form.weeklyMeeting.leave', 0] } },
              weekly_absent: { $sum: { $ifNull: ['$form.weeklyMeeting.absent', 0] } },
              jamaath_hadir: { $sum: { $ifNull: ['$form.jamaathMeeting.hadir', 0] } },
              jamaath_leave: { $sum: { $ifNull: ['$form.jamaathMeeting.leave', 0] } },
              jamaath_absent: { $sum: { $ifNull: ['$form.jamaathMeeting.absent', 0] } }
            } },
            { $project: { _id: 0 } }
          ]
        }
      }
    ];

    const [result] = await Submission.aggregate(pipeline);

    const total = result.total?.[0]?.count || 0;
    res.json({
      success: true,
      data: {
        total,
        breakdown: {
          quranStatus: result.quranStatus?.[0]?.map || {},
          bookReading: {
            islami: result.bookReadingIslami?.[0]?.map || {},
            atma: result.bookReadingAtma?.[0]?.map || {}
          },
          baithulmaal: result.baithulmaal?.[0]?.map || {},
          zakatPaid: result.zakatPaid?.[0]?.map || {},
          recruitEffort: result.recruitEffort?.[0]?.map || {},
          meqathService: result.meqathService?.[0]?.map || {},
          skillUsage: result.skillUsage?.[0]?.map || {},
          jamaathAgenda: result.jamaathAgenda?.[0]?.map || {},
          jamaathInfluence: result.jamaathInfluence?.[0]?.map || {},
          weeklyMeeting: result.weeklyMeeting?.[0]?.map || {},
          jamaathMeeting: result.jamaathMeeting?.[0]?.map || {},
          grihameetings: result.grihameetings?.[0]?.map || {},
          thahreekiMeetings: result.thahreekiMeetings?.[0]?.map || {}
        },
        sums: result.numericSums?.[0] || {
          hadithCount: 0,
          grihameetings: 0,
          thahreekiMeetings: 0,
          newMembers: 0,
          muslimRelations: 0,
          communityRelations: 0,
          scoreCount: 0,
          weekly_hadir: 0,
          weekly_leave: 0,
          weekly_absent: 0,
          jamaath_hadir: 0,
          jamaath_leave: 0,
          jamaath_absent: 0
        }
      }
    });
  } catch (error) {
    console.error('Consolidation error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Dynamic form consolidation stats
// @route   GET /api/admin/consolidation/dynamic
// @access  Private (Admin only)
router.get('/consolidation/dynamic', async (req, res) => {
  try {
    const { quarter, year, district, area, unit, questionId, questionValue, questionValueMin, questionValueMax } = req.query;

    if (!quarter || !year) {
      return res.status(400).json({
        success: false,
        message: 'Quarter and year are required for dynamic form consolidation'
      });
    }

    const appForm = await ApplicationForm.findOne({
      quarter: Number(quarter),
      year: Number(year),
      status: 'published'
    });

    if (!appForm) {
      return res.status(404).json({
        success: false,
        message: 'No published dynamic form found for this quarter'
      });
    }

    // Base match: all dynamic submissions for this quarter (regardless of whether dynamicFormId was saved)
    const baseMatch = {
      'submissionPeriod.quarter': Number(quarter),
      'submissionPeriod.year': Number(year),
      dynamicFormData: { $ne: null }
    };
    if (district) baseMatch.district = district;
    if (area) baseMatch.area = area;
    if (unit) baseMatch.unit = unit;

    // Filtered match: add optional question filter on top of base match
    const filteredMatch = { ...baseMatch };
    if (questionId) {
      const questionDef = appForm.questions.find(q => q.questionId === questionId);
      if (questionDef?.answerType === 'number' && (questionValueMin || questionValueMax)) {
        filteredMatch[`dynamicFormData.${questionId}`] = {};
        if (questionValueMin) filteredMatch[`dynamicFormData.${questionId}`].$gte = Number(questionValueMin);
        if (questionValueMax) filteredMatch[`dynamicFormData.${questionId}`].$lte = Number(questionValueMax);
      } else if (questionValue !== undefined && questionValue !== '') {
        // Radio/dropdown/checkbox/star values are stored as strings by the submission form
        // (handleDynamicFieldChange stores e.target.value which is always a string).
        // Only coerce to Number for explicit 'number' answer-type questions.
        if (questionDef?.answerType === 'number') {
          filteredMatch[`dynamicFormData.${questionId}`] = Number(questionValue);
        } else {
          filteredMatch[`dynamicFormData.${questionId}`] = questionValue;
        }
      }
    }

    const totalMatching = await Submission.countDocuments(filteredMatch);
    const totalForQuarter = await Submission.countDocuments({
      'submissionPeriod.quarter': Number(quarter),
      'submissionPeriod.year': Number(year),
      ...(district ? { district } : {}),
      ...(area ? { area } : {}),
      ...(unit ? { unit } : {})
    });

    const breakdowns = {};
    for (const question of appForm.questions) {
      const qId = question.questionId;
      if (['radio', 'dropdown', 'checkbox', 'star'].includes(question.answerType)) {
        const pipeline = [
          { $match: baseMatch },
          { $group: {
            _id: `$dynamicFormData.${qId}`,
            count: { $sum: 1 }
          }},
          { $project: { _id: 0, value: { $convert: { input: '$_id', to: 'string', onError: 'other', onNull: 'notSet' } }, count: 1 } }
        ];
        const results = await Submission.aggregate(pipeline);
        breakdowns[qId] = {};
        results.forEach(r => { breakdowns[qId][r.value] = r.count; });
      } else if (question.answerType === 'number') {
        const pipeline = [
          { $match: baseMatch },
          { $group: {
            _id: null,
            sum: { $sum: { $ifNull: [`$dynamicFormData.${qId}`, 0] } },
            avg: { $avg: { $ifNull: [`$dynamicFormData.${qId}`, 0] } },
            min: { $min: `$dynamicFormData.${qId}` },
            max: { $max: `$dynamicFormData.${qId}` }
          }},
          { $project: { _id: 0 } }
        ];
        const results = await Submission.aggregate(pipeline);
        breakdowns[qId] = results[0] || { sum: 0, avg: 0, min: 0, max: 0 };
      } else if (question.answerType === 'group') {
        const groupAcc = {};
        if (question.subFields) {
          question.subFields.forEach(sf => {
            groupAcc[sf.fieldId + '_sum'] = { $sum: { $ifNull: [`$dynamicFormData.${qId}.${sf.fieldId}`, 0] } };
          });
        }
        if (Object.keys(groupAcc).length > 0) {
          const pipeline = [
            { $match: baseMatch },
            { $group: { _id: null, ...groupAcc } },
            { $project: { _id: 0 } }
          ];
          const results = await Submission.aggregate(pipeline);
          breakdowns[qId] = results[0] || {};
        }
      }
    }

    res.json({
      success: true,
      data: {
        total: totalMatching,
        totalForQuarter,
        form: appForm,
        breakdowns
      }
    });
  } catch (error) {
    console.error('Dynamic consolidation error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Simple endpoint to check raw submission counts
// @route   GET /api/admin/debug/raw-counts
// @access  Private (Admin only)
router.get('/debug/raw-counts', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Get raw counts
    const totalSubmissions = await Submission.countDocuments(getHiddenQuarterFilter());
    const currentYearSubmissions = await Submission.countDocuments({ 
      'submissionPeriod.year': currentYear,
      ...getHiddenQuarterFilter()
    });
    const submissionsWithYear = await Submission.countDocuments({ 
      'submissionPeriod.year': { $exists: true },
      ...getHiddenQuarterFilter()
    });
    const submissionsWithoutYear = await Submission.countDocuments({ 
      'submissionPeriod.year': { $exists: false },
      ...getHiddenQuarterFilter()
    });
    
    // Get all submissions to check for duplicates
    const allSubmissions = await Submission.find(getHiddenQuarterFilter());
    
    // Check for duplicates by ruknName and period
    const submissionMap = new Map();
    const duplicates = [];
    
    allSubmissions.forEach((sub, index) => {
      const key = `${sub.ruknName}-${sub.submissionPeriod?.year}-${sub.submissionPeriod?.quarter}`;
      if (submissionMap.has(key)) {
        duplicates.push({
          original: submissionMap.get(key),
          duplicate: { index, id: sub._id, ruknName: sub.ruknName, period: sub.submissionPeriod }
        });
      } else {
        submissionMap.set(key, { index, id: sub._id, ruknName: sub.ruknName, period: sub.submissionPeriod });
      }
    });
    
    // Get sample submissions to check data structure
    const sampleSubmissions = await Submission.find({}).limit(5).select('submissionPeriod createdAt ruknName');
    
    res.json({
      success: true,
      data: {
        currentYear,
        totalSubmissions,
        currentYearSubmissions,
        submissionsWithYear,
        submissionsWithoutYear,
        uniqueSubmissions: submissionMap.size,
        duplicatesFound: duplicates.length,
        sampleSubmissions,
        firstFewDuplicates: duplicates.slice(0, 3)
      }
    });
  } catch (error) {
    console.error('Raw counts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Migration endpoint to fix quarter data for existing submissions
// @route   POST /api/admin/migrate-quarters
// @access  Private (Admin only)
router.post('/migrate-quarters', async (req, res) => {
  try {
    console.log('Starting quarter migration...');
    
    // Get all submissions
    const allSubmissions = await Submission.find({});
    console.log(`Found ${allSubmissions.length} submissions to migrate`);
    
    let updatedCount = 0;
    let errors = [];
    
    for (const submission of allSubmissions) {
      try {
        const createdDate = new Date(submission.createdAt);
        const createdMonth = createdDate.getMonth() + 1;
        const createdYear = createdDate.getFullYear();
        const expectedQuarter = Math.ceil(createdMonth / 3);
        
        // Check if quarter needs to be updated
        const needsUpdate = 
          !submission.submissionPeriod?.quarter ||
          submission.submissionPeriod.quarter !== expectedQuarter ||
          submission.submissionPeriod.year !== createdYear ||
          submission.submissionPeriod.month !== createdMonth;
        
        if (needsUpdate) {
          submission.submissionPeriod = {
            year: createdYear,
            month: createdMonth,
            quarter: expectedQuarter
          };
          
          await submission.save();
          updatedCount++;
          
          console.log(`Updated submission ${submission._id}: ${submission.ruknName} - Q${expectedQuarter} ${createdYear}`);
        }
      } catch (error) {
        errors.push({
          submissionId: submission._id,
          error: error.message
        });
      }
    }
    
    console.log(`Migration completed. Updated ${updatedCount} submissions.`);
    
    res.json({
      success: true,
      data: {
        totalSubmissions: allSubmissions.length,
        updatedCount,
        errors: errors.length > 0 ? errors : null
      }
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
});

// @desc    Debug endpoint to check data counts
// @route   GET /api/admin/debug/counts
// @access  Private (Admin only)
router.get('/debug/counts', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentQuarter = getCurrentQuarter();

    // Get all users
    const allUsers = await User.find({});
    const ruknUsers = await User.find({ role: 'rukn' });
    const adminUsers = await User.find({ role: 'admin' });

    // Get all submissions
    const allSubmissions = await Submission.find(getHiddenQuarterFilter());
    const currentYearSubmissions = await Submission.find({ 
      'submissionPeriod.year': currentYear,
      ...getHiddenQuarterFilter()
    });
    const currentMonthSubmissions = await Submission.find({ 
      'submissionPeriod.year': currentYear,
      'submissionPeriod.month': currentMonth,
      ...getHiddenQuarterFilter()
    });
    const currentQuarterSubmissions = await Submission.find({ 
      'submissionPeriod.year': currentYear,
      'submissionPeriod.quarter': currentQuarter,
      ...getHiddenQuarterFilter() 
    });

    res.json({
      success: true,
      data: {
        users: {
          total: allUsers.length,
          rukn: ruknUsers.length,
          admin: adminUsers.length,
          ruknDetails: ruknUsers.map(u => ({
            id: u._id,
            username: u.username,
            name: u.name,
            isActive: u.isActive,
            unit: u.unit
          }))
        },
        submissions: {
          total: allSubmissions.length,
          currentYear: currentYearSubmissions.length,
          currentMonth: currentMonthSubmissions.length,
          currentQuarter: currentQuarterSubmissions.length,
          currentYearMonth: `${currentYear}-${currentMonth}`,
          currentYearQuarter: `${currentYear}-Q${currentQuarter}`,
          submissionDetails: currentQuarterSubmissions.map(s => ({
            id: s._id,
            ruknName: s.ruknName,
            period: s.submissionPeriod,
            status: s.status,
            createdAt: s.createdAt
          }))
        }
      }
    });
  } catch (error) {
    console.error('Debug counts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Download the model Excel file for bulk member upload
// @route   GET /api/ihthisabi/admin/members-template
// @access  Private (Admin only)
router.get('/members-template', (req, res) => {
  try {
    const buffer = buildMemberTemplateWorkbook();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="member-upload-template.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Member template error:', error);
    res.status(500).json({ success: false, message: 'Failed to build template', error: error.message });
  }
});

// @desc    Upload Excel file and create/update users
// @route   POST /api/admin/upload-excel
// @access  Private (Admin only)
router.post('/upload-excel', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('Processing uploaded file:', req.file.filename);

    // Parse Excel file
    const { users, skipped } = await parseMembersExcelFile(req.file.path);

    if (users.length === 0) {
      try { fs.unlinkSync(req.file.path); } catch { /* already gone */ }
      return res.status(400).json({
        success: false,
        message: skipped.length
          ? `No importable rows. ${skipped.length} row(s) were rejected — check the required columns against the model file.`
          : 'No valid user data found in Excel file',
        data: { totalProcessed: 0, created: 0, updated: 0, skipped }
      });
    }

    // Process users - create or update
    let created = 0;
    let updated = 0;
    let errors = [];

    for (const userData of users) {
      try {
        // Check if user already exists by RUKN ID
        const existingUser = await User.findOne({ ruknId: userData.ruknId });
        
        if (existingUser) {
          // Update existing user with all new fields
          await User.findByIdAndUpdate(existingUser._id, {
            name: userData.name,
            gender: userData.gender,
            district: userData.district,
            area: userData.area,
            unit: userData.unit,
            contactNo: userData.contactNo,
            emailId: userData.emailId,
            country: userData.country,
            isActive: true,
            $unset: { username: '' }
          });
          updated++;
        } else {
          // Create new user with all fields
          await User.create({
            role: 'rukn',
            ruknId: userData.ruknId,
            name: userData.name,
            gender: userData.gender,
            district: userData.district,
            area: userData.area,
            unit: userData.unit,
            contactNo: userData.contactNo,
            emailId: userData.emailId,
            country: userData.country,
            isActive: true
          });
          created++;
        }
      } catch (error) {
        console.error(`Error processing user ${userData.ruknId}:`, error);
        errors.push({
          ruknId: userData.ruknId,
          name: userData.name,
          error: error.message
        });
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.error('Error cleaning up uploaded file:', cleanupError);
    }

    res.json({
      success: true,
      message: 'Excel file processed successfully',
      data: {
        totalProcessed: users.length,
        created,
        updated,
        errors: errors.length > 0 ? errors : undefined,
        skipped: skipped.length > 0 ? skipped : undefined
      }
    });

  } catch (error) {
    console.error('Excel upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file after error:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error processing Excel file',
      error: error.message
    });
  }
});

// @desc    Get all users with Excel data
// @route   GET /api/admin/users
// @access  Private (Admin only)
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, unit, district, area, search } = req.query;
    const query = { role: 'rukn' };

    // Add filters
    if (unit) {
      query.unit = { $regex: unit, $options: 'i' };
    }
    if (district) {
      query.district = { $regex: district, $options: 'i' };
    }
    if (area) {
      query.area = { $regex: area, $options: 'i' };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { ruknId: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: buildPaginationMeta(total, parseInt(page), parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Users meta: distinct districts/units and counts
// @route   GET /api/admin/users/meta
// @access  Private (Admin only)
router.get('/users/meta', async (req, res) => {
  try {
    // Debug: Check all users first
    const allUsers = await User.find({});
    const ruknUsers = await User.find({ role: 'rukn' });
    const usersWithoutRole = await User.find({ role: { $exists: false } });
    
    console.log('Meta debug:', {
      allUsersCount: allUsers.length,
      ruknUsersCount: ruknUsers.length,
      usersWithoutRoleCount: usersWithoutRole.length,
      allUsersRoles: allUsers.map(u => ({ id: u._id, role: u.role, name: u.name }))
    });

    const [total, active, units] = await Promise.all([
      User.countDocuments({ role: 'rukn' }),
      User.countDocuments({ role: 'rukn', $or: [{ isActive: true }, { isActive: { $exists: false } }] }),
      User.distinct('unit', { role: 'rukn', unit: { $nin: [null, ''] } })
    ]);

    res.json({
      success: true,
      data: {
        totalUsers: total,
        activeUsers: active,
        units: units.sort()
      }
    });
  } catch (error) {
    console.error('Get users meta error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Test route
// @route   GET /api/admin/test-delete-all
// @access  Private (Admin only)
router.get('/test-delete-all', async (req, res) => {
  res.json({ success: true, message: 'Delete all route is working!' });
});

// @desc    Test delete-all route (GET)
// @route   GET /api/admin/delete-all-users
// @access  Private (Admin only)
router.get('/delete-all-users', async (req, res) => {
  res.json({ success: true, message: 'Delete all users route is accessible!' });
});

// @desc    Delete all users
// @route   DELETE /api/admin/delete-all-users
// @access  Private (Admin only)
router.delete('/delete-all-users', async (req, res) => {
  try {
    console.log('DELETE ALL USERS route hit!');
    // Get count before deletion for response
    const totalUsers = await User.countDocuments({ role: 'rukn' });

    if (totalUsers === 0) {
      return res.json({
        success: true,
        message: 'No users to delete',
        data: {
          deletedCount: 0
        }
      });
    }

    // Delete all rukn users
    const result = await User.deleteMany({
      role: 'rukn'
    });

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} users`,
      data: {
        deletedCount: result.deletedCount,
        totalUsers
      }
    });
  } catch (error) {
    console.error('Delete all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get single user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('abroadCountry', 'title');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin user'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});




// @desc    Upload Unit Admin Excel file
// @route   POST /api/admin/upload-unitadmin-excel
// @access  Private (Admin only)
router.post('/upload-unitadmin-excel', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('Processing unit admin Excel file:', req.file.filename);

    // Parse Excel file for unit admin data
    const unitAdmins = await parseUnitAdminExcelFile(req.file.path);
    
    if (unitAdmins.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid unit admin data found in Excel file'
      });
    }

    // Process unit admins - create or update using bulk operations
    let created = 0;
    let updated = 0;
    let errors = [];

    console.log(`Processing ${unitAdmins.length} unit admins using bulk operations...`);

    // Get all existing RUKN IDs to determine which are updates vs creates
    const existingRuknIds = await UnitAdmin.find({ 
      ruknId: { $in: unitAdmins.map(admin => admin.ruknId) } 
    }).select('ruknId');
    
    const existingRuknIdSet = new Set(existingRuknIds.map(admin => admin.ruknId));
    
    // Separate into creates and updates
    const toCreate = [];
    const toUpdate = [];
    
    for (const adminData of unitAdmins) {
      if (existingRuknIdSet.has(adminData.ruknId)) {
        toUpdate.push(adminData);
      } else {
        toCreate.push({
          unit: adminData.unit,
          ruknId: adminData.ruknId,
          name: adminData.name,
          contactNo: adminData.contactNo,
          emailId: adminData.emailId,
          district: adminData.district,
          area: adminData.area || '',
          password: 'unitadmin123', // Default password
          isActive: true
        });
      }
    }

    console.log(`Creating ${toCreate.length} new unit admins, updating ${toUpdate.length} existing ones`);

    // Bulk create new unit admins
    if (toCreate.length > 0) {
      try {
        await UnitAdmin.insertMany(toCreate, { ordered: false });
        created = toCreate.length;
        console.log(`Successfully created ${created} unit admins`);
      } catch (error) {
        console.error('Bulk create error:', error);
        // Handle partial success
        if (error.writeErrors) {
          created = toCreate.length - error.writeErrors.length;
          error.writeErrors.forEach(writeError => {
            errors.push({
              ruknId: toCreate[writeError.index]?.ruknId,
              name: toCreate[writeError.index]?.name,
              error: writeError.errmsg
            });
          });
        }
      }
    }

    // Bulk update existing unit admins
    if (toUpdate.length > 0) {
      try {
        const bulkOps = toUpdate.map(adminData => ({
          updateOne: {
            filter: { ruknId: adminData.ruknId },
            update: {
              unit: adminData.unit,
              name: adminData.name,
              contactNo: adminData.contactNo,
              emailId: adminData.emailId,
              district: adminData.district,
              area: adminData.area || '',
              isActive: true
            }
          }
        }));
        
        const result = await UnitAdmin.bulkWrite(bulkOps);
        updated = result.modifiedCount;
        console.log(`Successfully updated ${updated} unit admins`);
      } catch (error) {
        console.error('Bulk update error:', error);
        // Handle partial success
        if (error.writeErrors) {
          updated = toUpdate.length - error.writeErrors.length;
          error.writeErrors.forEach(writeError => {
            errors.push({
              ruknId: toUpdate[writeError.index]?.ruknId,
              name: toUpdate[writeError.index]?.name,
              error: writeError.errmsg
            });
          });
        }
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.error('Error cleaning up uploaded file:', cleanupError);
    }

    res.json({
      success: true,
      message: 'Unit Admin Excel file processed successfully',
      data: {
        totalProcessed: unitAdmins.length,
        created,
        updated,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Unit Admin Excel upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file after error:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error processing Unit Admin Excel file',
      error: error.message
    });
  }
});

// @desc    Get all unit admins
// @route   GET /api/admin/unitadmins
// @access  Private (Admin only)
router.get('/unitadmins', async (req, res) => {
  try {
    console.log('GET /api/admin/unitadmins - User:', req.user);
    const { page = 1, limit = 10, unit, search, district, area } = req.query;
    const query = {};

    // Add filters
    if (unit) {
      query.unit = { $regex: unit, $options: 'i' };
    }
    if (district) {
      query.district = { $regex: district, $options: 'i' };
    }
    if (area) {
      query.area = { $regex: area, $options: 'i' };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { ruknId: { $regex: search, $options: 'i' } },
        { emailId: { $regex: search, $options: 'i' } }
      ];
    }

    const unitAdmins = await UnitAdmin.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await UnitAdmin.countDocuments(query);

    res.json({
      success: true,
      data: {
        unitAdmins,
        pagination: buildPaginationMeta(total, parseInt(page), parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get unit admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get all available districts
// @route   GET /api/admin/unitadmins/districts
// @access  Private (Admin only)
router.get('/unitadmins/districts', async (req, res) => {
  try {
    const districts = await UnitAdmin.distinct('district');
    res.json({
      success: true,
      data: {
        districts: districts.sort()
      }
    });
  } catch (error) {
    console.error('Get districts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get distinct areas for a district (for cascading unit selection)
// @route   GET /api/admin/unitadmins/areas?district=X
// @access  Private (Admin only)
router.get('/unitadmins/areas', async (req, res) => {
  try {
    const { district } = req.query;
    const filter = {};
    if (district) filter.district = district;
    const areas = await UnitAdmin.distinct('area', filter);
    res.json({
      success: true,
      data: {
        areas: areas.filter(Boolean).sort()
      }
    });
  } catch (error) {
    console.error('Get areas error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get distinct units for a district+area (for cascading unit selection)
// @route   GET /api/admin/unitadmins/units?district=X&area=Y
// @access  Private (Admin only)
router.get('/unitadmins/units', async (req, res) => {
  try {
    const { district, area } = req.query;
    const filter = {};
    if (district) filter.district = district;
    if (area) filter.area = area;
    const units = await UnitAdmin.distinct('unit', filter);
    res.json({
      success: true,
      data: {
        units: units.filter(Boolean).sort()
      }
    });
  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Delete all unit admins
// @route   DELETE /api/admin/unitadmins/delete-all
// @access  Private (Admin only)
router.delete('/unitadmins/delete-all', async (req, res) => {
  try {
    console.log('DELETE ALL UNIT ADMINS route hit!');
    console.log('Request user:', req.user);
    console.log('Request headers:', req.headers);
    
    // Get count before deletion for response
    const totalUnitAdmins = await UnitAdmin.countDocuments();

    if (totalUnitAdmins === 0) {
      return res.json({
        success: true,
        message: 'No unit admins to delete',
        data: {
          deletedCount: 0
        }
      });
    }

    // Delete all unit admins
    const result = await UnitAdmin.deleteMany({});

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} unit admins`,
      data: {
        deletedCount: result.deletedCount,
        totalUnitAdmins
      }
    });
  } catch (error) {
    console.error('Delete all unit admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Send WhatsApp message to all unit admins (super admin only)
// @route   POST /api/admin/unitadmins/whatsapp-broadcast
// @access  Private (Super Admin only)
router.post('/unitadmins/whatsapp-broadcast', async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can send broadcast messages'
      });
    }

    const { title, description } = req.body;

    if (!title || !title.trim() || !description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const messageBody = `*${trimmedTitle}*\n\n${trimmedDescription}`;

    const unitAdmins = await UnitAdmin.find({ isActive: true }).select('name contactNo unit isActive');
    const job = await enqueueBroadcast({
      title: trimmedTitle,
      description: trimmedDescription,
      recipients: unitAdmins,
      sentBy: {
        id: req.user?._id || req.user?.userId || 'admin',
        role: req.user?.role,
        email: req.user?.email
      }
    });

    res.json({
      success: true,
      message: 'Broadcast message queued for delivery',
      data: {
        broadcast: {
          id: job.id,
          title: job.title,
          description: job.description,
          totalRecipients: unitAdmins.length,
          status: job.status
        }
      }
    });
  } catch (error) {
    console.error('Unit admin broadcast error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get unit admin broadcast job status (super admin only)
// @route   GET /api/admin/unitadmins/whatsapp-broadcast/:id
// @access  Private (Super Admin only)
router.get('/unitadmins/whatsapp-broadcast/:id', async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can view broadcast status'
      });
    }

    const job = getBroadcastJob(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Broadcast job not found'
      });
    }

    res.json({
      success: true,
      data: {
        broadcast: {
          id: job.id,
          title: job.title,
          description: job.description,
          status: job.status,
          totalRecipients: job.recipients.length,
          sentCount: job.sentCount,
          failedCount: job.failedCount,
          missingContactCount: job.missingContactCount,
          failures: job.failures || []
        }
      }
    });
  } catch (error) {
    console.error('Broadcast status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get single unit admin by ID
// @route   GET /api/admin/unitadmins/:id
// @access  Private (Admin only)
router.get('/unitadmins/:id', async (req, res) => {
  try {
    const unitAdmin = await UnitAdmin.findById(req.params.id).select('-password');
    
    if (!unitAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Unit admin not found'
      });
    }

    res.json({
      success: true,
      data: {
        unitAdmin
      }
    });
  } catch (error) {
    console.error('Get unit admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ─── Helpers for dynamic-form → static field extraction ─────────────────────

// Map dynamic question to a known static-field category using question text keywords
function _identifyDynamicField(question) {
  const text = ((question.questionTextMl || question.questionText || '') + '').toLowerCase();
  const qId  = (question.questionId || '').toLowerCase();

  if (text.includes('ഖുർആൻ') || text.includes('quran') || qId.includes('quran')) return 'quranStudy';
  if (text.includes('ഹദീസ്') || text.includes('hadith') || qId.includes('hadith')) return 'hadithCount';
  // Weekly meeting – must not contain jamaath
  if ((text.includes('ആഴ്ചയോഗം') || (text.includes('ആഴ്ച') && text.includes('യോഗ')) || text.includes('weekly')) &&
      !text.includes('ജമാഅത്ത്')) return 'weeklyMeeting';
  if (text.includes('ജമാഅത്ത്') || text.includes('jamaath')) return 'jamaathMeeting';
  if (text.includes('ഗൃഹ') || text.includes('griha')) return 'grihaMeetings';
  if (text.includes('ബൈത') || text.includes('baith') || qId.includes('baith') ||
      text.includes('സക്കാത്ത') || text.includes('zakat') || qId.includes('zakat')) {
    // Only the choice-based "2% paid" field (radio/dropdown/checkbox with കൃത്യം/ഭാഗികം)
    // should drive baitulmalPaid classification. Number/text fields (e.g. "70% amount")
    // must be ignored to avoid overwriting the correct paid/defaulter status.
    if (['radio', 'dropdown', 'checkbox'].includes(question.answerType)) return 'baitulmal';
    return null;
  }
  if (text.includes('ദഅ്‌വ') || text.includes('ദഅ്വ') || text.includes('recruit') ||
      qId.includes('recruit') || (text.includes('ഉദ്യമ') && text.includes('മൂന്ന')) ||
      (text.includes('ശ്രമ') && text.includes('മൂന്ന'))) return 'recruitEffort';
  // 1:3 target – new halqa members (checkbox, values 0-3)
  if (text.includes('ഹൽക്ക') || text.includes('halqa') || text.includes('halka') ||
      (text.includes('1:3') && (text.includes('കൊണ്ടുവ') || text.includes('ലക്ഷ്യ') || text.includes('ആൾ')))) return 'newHalqaMembers';
  // 1:20 target – Muslim personal relations (number)
  if ((text.includes('1:20') || (text.includes('മുസ്ലിം') && text.includes('ബന്ധ'))) &&
      !text.includes('ഹൽക്ക')) return 'muslimRelations';
  // 1:10 target – community / fraternal relations (number)
  if (text.includes('1:10') || (text.includes('സദ്ദ') && text.includes('ബന്ധ')) ||
      (text.includes('സഹോദര') && text.includes('ബന്ധ'))) return 'communityRelations';
  // Quarterly visits / score count (number)
  if (text.includes('ത്രൈമാസ') || text.includes('quarterly') || qId.includes('quarterly') ||
      qId.includes('score') || (text.includes('നടത്തിയ') && text.includes('ഡൗ'))) return 'quarterlyVisits';
  if ((text.includes('ഇസ്‌ലാം') || text.includes('ഇസ്ലാം') || text.includes('ഇസ്ലാമിക') || text.includes('islami')) &&
      (text.includes('വായന') || text.includes('പുസ്തക') || text.includes('സാഹിത്യ'))) return 'bookReadingIslami';
  if ((text.includes('ആത്മ') || text.includes('atma') || text.includes('മദീന')) &&
      (text.includes('വായന') || text.includes('പുസ്തക') || text.includes('സാഹിത്യ'))) return 'bookReadingAtma';
  if (text.includes('വായന') || text.includes('book') || text.includes('പുസ്തക') || text.includes('സാഹിത്യ')) return 'bookReading';
  return null;
}

// Normalise a dynamic form answer value to the English equivalent used in static form
const _DYNAMIC_VAL_MAP = {
  'പൂർണം': 'complete', 'complete': 'complete',
  'കൃത്യം': 'complete',
  'ഭാഗികം': 'partial',  'partial': 'partial',
  'വായിച്ചില്ല': 'notread', 'notread': 'notread', 'none': 'none',
  'അപൂർണം': 'incomplete', 'incomplete': 'incomplete',
  'അതെ': 'yes', 'yes': 'yes',
  'ഇല്ല': 'no',  'no': 'no',
  'തൃപ്തികരം': 'satisfactory',    'satisfactory': 'satisfactory',
  'തൃപ്തികരമല്ല': 'unsatisfactory', 'unsatisfactory': 'unsatisfactory',
};
function _normDynVal(val) {
  if (val === null || val === undefined) return null;
  return _DYNAMIC_VAL_MAP[String(val)] || String(val);
}

// Find the absent-count subfield value in a dynamic group question answer
function _groupAbsent(val, subFields) {
  if (!val || typeof val !== 'object' || !subFields) return 0;
  for (const sf of subFields) {
    const lbl = ((sf.labelMl || sf.label || '') + '').toLowerCase();
    const fid = (sf.fieldId || '').toLowerCase();
    if (lbl.includes('absent') || lbl.includes('ഗ്ഹ') || fid.includes('absent')) {
      return Number(val[sf.fieldId || fid]) || 0;
    }
  }
  return 0;
}

// Build a static-equivalent `form` object from dynamicFormData + ApplicationForm questions
function _extractStaticFromDynamic(dynamicFormData, appFormQuestions) {
  const f = {};
  for (const question of appFormQuestions) {
    const fieldType = _identifyDynamicField(question);
    if (!fieldType) continue;
    const val = dynamicFormData[question.questionId];
    if (val === undefined || val === null) continue;

    if (fieldType === 'quranStudy') {
      f.quranStudy = { status: _normDynVal(val) || 'none' };
    } else if (fieldType === 'hadithCount') {
      f.hadithCount = Number(val) || 0;
    } else if (fieldType === 'weeklyMeeting') {
      if (question.answerType === 'group' && typeof val === 'object') {
        f.weeklyMeeting = { absent: _groupAbsent(val, question.subFields) };
      } else {
        f.weeklyMeeting = { absent: Number(val) || 0 };
      }
    } else if (fieldType === 'jamaathMeeting') {
      if (question.answerType === 'group' && typeof val === 'object') {
        f.jamaathMeeting = { absent: _groupAbsent(val, question.subFields) };
      } else {
        f.jamaathMeeting = { absent: Number(val) || 0 };
      }
    } else if (fieldType === 'grihaMeetings') {
      f.grihameetings = Number(val) || 0;
    } else if (fieldType === 'baitulmal') {
      // The stored value is option.value (set by admin), which could be any string.
      // Strategy: normalise the raw value; if that fails, fall back to checking
      // the option's label text directly from the ApplicationForm question options.
      const rawVal = String(val || '').trim();
      const norm = _normDynVal(rawVal);
      const selectedOpt = question.options?.find(o => o.value === rawVal);
      const optText = ((selectedOpt?.labelMl || selectedOpt?.label || '') + '').trim();
      const normLabel = _normDynVal(optText);
      // Paid: value or label normalises to 'complete', OR label text contains paid keywords
      const isPaid = norm === 'complete' || normLabel === 'complete' ||
        optText.includes('കൃത്യം') || optText.includes('പൂർണം') ||
        rawVal.includes('കൃത്യം') || rawVal.includes('പൂർണം');
      // Defaulter: not paid, and value or label normalises to 'partial', OR contains ഭാഗികം
      const isDefaulter = !isPaid && (
        norm === 'partial' || normLabel === 'partial' ||
        optText.includes('ഭാഗികം') || rawVal.includes('ഭാഗികം')
      );
      if (isPaid) {
        f._baitulmal2pct = 'paid';
      } else if (isDefaulter) {
        f._baitulmal2pct = 'defaulter';
      }
    } else if (fieldType === 'recruitEffort') {
      f.recruitEffort = _normDynVal(val);
    } else if (fieldType === 'newHalqaMembers') {
      f.newHalqaMembers = Number(val) || 0;
    } else if (fieldType === 'muslimRelations') {
      f.muslimRelations = Number(val) || 0;
    } else if (fieldType === 'communityRelations') {
      f.communityRelations = Number(val) || 0;
    } else if (fieldType === 'quarterlyVisits') {
      f.quarterlyVisits = Number(val) || 0;
    } else if (fieldType === 'bookReadingIslami') {
      if (!f.bookReading) f.bookReading = {};
      f.bookReading.islami = _normDynVal(val) || 'notread';
      f.bookReading._explicit = true;
    } else if (fieldType === 'bookReadingAtma') {
      if (!f.bookReading) f.bookReading = {};
      f.bookReading.atma = _normDynVal(val) || 'notread';
      f.bookReading._explicit = true;
    } else if (fieldType === 'bookReading') {
      if (!f.bookReading) f.bookReading = {};
      if (!f.bookReading.islami) f.bookReading.islami = _normDynVal(val) || 'notread';
      f.bookReading._explicit = true;
    }
  }
  return f;
}

// ─── Route ───────────────────────────────────────────────────────────────────

// @desc    Get aggregated submission data for unit admin reply
// @route   GET /api/admin/unit-reply-data
// @access  Private (Admin only)
router.get('/unit-reply-data', async (req, res) => {
  try {
    const { unit, year, quarter } = req.query;

    if (!unit || !year || !quarter) {
      return res.status(400).json({
        success: false,
        message: 'Unit, year, and quarter are required'
      });
    }

    const yearNum = parseInt(year);
    const quarterNum = parseInt(quarter);

    // Get all current members of this unit (to catch submissions stored under a
    // different unit name due to unit transfers)
    const currentUnitMembers = await User.find({ unit: unit }).select('_id').lean();
    const currentUnitMemberIds = currentUnitMembers.map(u => u._id);

    // Get all submissions for this unit and quarter:
    // - by stored unit name (normal case)
    // - by current unit membership (catches transferred members)
    const [unitSubmissions, memberSubmissions, alternativeSubmissions] = await Promise.all([
      Submission.find({
        unit: unit,
        'submissionPeriod.year': yearNum,
        'submissionPeriod.quarter': quarterNum,
        ...getHiddenQuarterFilter()
      })
        .populate('userId', 'name ruknId')
        .populate('submittedBy', 'name ruknId')
        .sort({ createdAt: -1 }),
      Submission.find({
        userId: { $in: currentUnitMemberIds },
        unit: { $ne: unit },
        'submissionPeriod.year': yearNum,
        'submissionPeriod.quarter': quarterNum,
        ...getHiddenQuarterFilter()
      })
        .populate('userId', 'name ruknId')
        .populate('submittedBy', 'name ruknId')
        .sort({ createdAt: -1 }),
      AlternativeSubmit.find({
        unit: unit,
        'submissionPeriod.year': yearNum,
        'submissionPeriod.quarter': quarterNum
      }).sort({ createdAt: -1 })
    ]);

    // Merge, deduplicating by submission _id
    const seenIds = new Set(unitSubmissions.map(s => String(s._id)));
    const submissions = [...unitSubmissions];
    for (const s of memberSubmissions) {
      if (!seenIds.has(String(s._id))) {
        seenIds.add(String(s._id));
        submissions.push(s);
      }
    }

    const emptyAgg = {
      submittedMembers: [],
      quranStudyCompleted: [],
      quranStudyNotCompleted: [],
      hadithReadingCompleted: [],
      hadithReadingNotCompleted: [],
      bookReadingCompleted: [],
      bookReadingNotCompleted: [],
      weeklyMeetingAbsentees: [],
      jamaathMeetingAbsentees: [],
      grihaMeetingsThreeOrMore: [],
      grihaMeetingsLessThanThree: [],
      baitulmalDefaulters: [],
      presentationEffort: { satisfactory: [], unsatisfactory: [] }
    };

    if (submissions.length === 0 && alternativeSubmissions.length === 0) {
      return res.json({
        success: true,
        data: { unit, year: yearNum, quarter: quarterNum, submissions: [], aggregatedData: emptyAgg }
      });
    }

    // Pre-load any ApplicationForms needed for dynamic submissions
    const appFormCache = {};
    const dynamicFormIds = [...new Set(
      submissions.filter(s => s.dynamicFormId).map(s => String(s.dynamicFormId))
    )];
    if (dynamicFormIds.length > 0) {
      const appForms = await ApplicationForm.find({ _id: { $in: dynamicFormIds } }).lean();
      appForms.forEach(af => { appFormCache[String(af._id)] = af; });
    }

    // Aggregate data
    const submittedMembers = [];
    const quranStudyCompleted = [];
    const quranStudyNotCompleted = [];
    const hadithReadingCompleted = [];
    const hadithReadingNotCompleted = [];
    const bookReadingCompleted = [];
    const bookReadingNotCompleted = [];
    const weeklyMeetingAbsentees = [];
    const jamaathMeetingAbsentees = [];
    const grihaMeetingsThreeOrMore = [];
    const grihaMeetingsLessThanThree = [];
    const baitulmalDefaulters = [];
    const baitulmalPaid = [];
    const weeklyMeetingPresent = [];
    const jamaathMeetingPresent = [];
    const presentationSatisfactory = [];
    const presentationUnsatisfactory = [];
    const newHalqaMembersOnePlus = [];
    const newHalqaMembersZero = [];
    const muslimRelationsOnePlus = [];
    const muslimRelationsZero = [];
    const communityRelationsOnePlus = [];
    const communityRelationsZero = [];
    const quarterlyVisitsOnePlus = [];
    const quarterlyVisitsZero = [];

    submissions.forEach(submission => {
      const memberName = (submission.ruknName || submission.userId?.name || submission.submittedBy?.name || 'Unknown').toUpperCase();

      // Submitted members
      if (!submittedMembers.includes(memberName)) submittedMembers.push(memberName);

      // Resolve effective form fields:
      // For dynamic submissions, extract static-equivalent fields from dynamicFormData.
      // Merge over base form so static defaults don't pollute dynamic results.
      let form = Object.assign({}, submission.form || {});
      if (submission.dynamicFormData && submission.dynamicFormId) {
        const appForm = appFormCache[String(submission.dynamicFormId)];
        if (appForm && appForm.questions && appForm.questions.length) {
          const extracted = _extractStaticFromDynamic(submission.dynamicFormData, appForm.questions);
          // Merge extracted fields (override static defaults for this submission)
          if (extracted.quranStudy) form.quranStudy = extracted.quranStudy;
          if (extracted.hadithCount !== undefined) form.hadithCount = extracted.hadithCount;
          if (extracted.weeklyMeeting) form.weeklyMeeting = extracted.weeklyMeeting;
          if (extracted.jamaathMeeting) form.jamaathMeeting = extracted.jamaathMeeting;
          if (extracted.grihameetings !== undefined) form.grihameetings = extracted.grihameetings;
          if (extracted._baitulmal2pct) form._baitulmal2pct = extracted._baitulmal2pct;
          if (extracted.recruitEffort !== undefined) form.recruitEffort = extracted.recruitEffort;
          if (extracted.newHalqaMembers !== undefined) form.newHalqaMembers = extracted.newHalqaMembers;
          if (extracted.muslimRelations !== undefined) form.muslimRelations = extracted.muslimRelations;
          if (extracted.communityRelations !== undefined) form.communityRelations = extracted.communityRelations;
          if (extracted.quarterlyVisits !== undefined) form.quarterlyVisits = extracted.quarterlyVisits;
          if (extracted.bookReading) {
            form.bookReading = Object.assign({}, form.bookReading || {}, extracted.bookReading);
          }
        }
      }

      // Quran study
      if (form.quranStudy?.status === 'complete') {
        if (!quranStudyCompleted.includes(memberName)) quranStudyCompleted.push(memberName);
        // upgrade: remove from notCompleted if present
        const qIdx = quranStudyNotCompleted.indexOf(memberName);
        if (qIdx !== -1) quranStudyNotCompleted.splice(qIdx, 1);
      } else if (form.quranStudy?.status === 'none' || form.quranStudy?.status === 'partial') {
        // only add to notCompleted if not already in completed
        if (!quranStudyCompleted.includes(memberName) && !quranStudyNotCompleted.includes(memberName))
          quranStudyNotCompleted.push(memberName);
      }

      // Hadith reading
      if (form.hadithCount > 0) {
        if (!hadithReadingCompleted.includes(memberName)) hadithReadingCompleted.push(memberName);
        const hIdx = hadithReadingNotCompleted.indexOf(memberName);
        if (hIdx !== -1) hadithReadingNotCompleted.splice(hIdx, 1);
      } else {
        if (!hadithReadingCompleted.includes(memberName) && !hadithReadingNotCompleted.includes(memberName))
          hadithReadingNotCompleted.push(memberName);
      }

      // Book reading: only classify if user explicitly answered (not just Mongoose defaults)
      const hasBookReadingData = (
        submission.dynamicFormData
          ? (form.bookReading && (form.bookReading._explicit === true))
          : (submission.form && submission.form.bookReading !== undefined)
      );
      if (hasBookReadingData) {
        // Check only the subfields that actually exist in the data
        const br = form.bookReading || {};
        const hasIslami = br.islami && br.islami !== 'notread';
        const hasAtma   = br.atma   && br.atma   !== 'notread';
        const islamiOk  = !hasIslami || br.islami === 'complete';
        const atmaOk    = !hasAtma   || br.atma   === 'complete';
        const anyFieldPresent = hasIslami || hasAtma;

        if (anyFieldPresent && islamiOk && atmaOk) {
          if (!bookReadingCompleted.includes(memberName)) bookReadingCompleted.push(memberName);
          const bIdx = bookReadingNotCompleted.indexOf(memberName);
          if (bIdx !== -1) bookReadingNotCompleted.splice(bIdx, 1);
        } else if (anyFieldPresent) {
          if (!bookReadingCompleted.includes(memberName) && !bookReadingNotCompleted.includes(memberName))
            bookReadingNotCompleted.push(memberName);
        }
      }

      // Weekly meeting
      const absentCount = form.weeklyMeeting?.absent || 0;
      if (absentCount > 0) {
        const existing = weeklyMeetingAbsentees.find(a => a.name === memberName);
        if (existing) {
          existing.absentCount += absentCount;
        } else {
          weeklyMeetingAbsentees.push({ name: memberName, leaveCount: 0, absentCount });
        }
      } else if (form.weeklyMeeting !== undefined) {
        if (!weeklyMeetingPresent.includes(memberName)) weeklyMeetingPresent.push(memberName);
      }

      // Jamaath meeting
      const jamaathAbsent = form.jamaathMeeting?.absent || 0;
      if (jamaathAbsent > 0) {
        if (!jamaathMeetingAbsentees.includes(memberName)) jamaathMeetingAbsentees.push(memberName);
      } else if (form.jamaathMeeting !== undefined) {
        if (!jamaathMeetingPresent.includes(memberName)) jamaathMeetingPresent.push(memberName);
      }

      // Griha meetings (threshold: 2)
      const grihaMeetingsCount = form.grihameetings || 0;
      if (grihaMeetingsCount >= 2) {
        if (!grihaMeetingsThreeOrMore.includes(memberName)) grihaMeetingsThreeOrMore.push(memberName);
        const gIdx = grihaMeetingsLessThanThree.indexOf(memberName);
        if (gIdx !== -1) grihaMeetingsLessThanThree.splice(gIdx, 1);
      } else {
        if (!grihaMeetingsThreeOrMore.includes(memberName) && !grihaMeetingsLessThanThree.includes(memberName))
          grihaMeetingsLessThanThree.push(memberName);
      }

      // Baitulmal — only the single 2%-paid choice question (കൃത്യം/ഭാഗികം) counts.
      // Dynamic: _baitulmal2pct is set only from the radio/dropdown question; 70% amount field never reaches here.
      // Static: use baithulmaal but ONLY 'complete'/'partial' — 'incomplete' is the Mongoose default, not an explicit answer.
      if (form._baitulmal2pct === 'paid') {
        if (!baitulmalPaid.includes(memberName)) baitulmalPaid.push(memberName);
        const bm1 = baitulmalDefaulters.indexOf(memberName);
        if (bm1 !== -1) baitulmalDefaulters.splice(bm1, 1);
      } else if (form._baitulmal2pct === 'defaulter') {
        if (!baitulmalDefaulters.includes(memberName)) baitulmalDefaulters.push(memberName);
        const bm2 = baitulmalPaid.indexOf(memberName);
        if (bm2 !== -1) baitulmalPaid.splice(bm2, 1);
      } else if (!submission.dynamicFormId) {
        // Static form only: explicit 'complete' → paid, explicit 'partial' → defaulter
        if (form.baithulmaal === 'complete') {
          if (!baitulmalPaid.includes(memberName)) baitulmalPaid.push(memberName);
        } else if (form.baithulmaal === 'partial') {
          if (!baitulmalDefaulters.includes(memberName)) baitulmalDefaulters.push(memberName);
        }
      }

      // Presentation effort
      if (form.recruitEffort === 'satisfactory') {
        if (!presentationSatisfactory.includes(memberName)) presentationSatisfactory.push(memberName);
        const pIdx = presentationUnsatisfactory.indexOf(memberName);
        if (pIdx !== -1) presentationUnsatisfactory.splice(pIdx, 1);
      } else if (form.recruitEffort === 'unsatisfactory') {
        if (!presentationSatisfactory.includes(memberName) && !presentationUnsatisfactory.includes(memberName))
          presentationUnsatisfactory.push(memberName);
      }

      // 1:3 target – new halqa members (checkbox, values 0-3)
      if (form.newHalqaMembers !== undefined) {
        if (Number(form.newHalqaMembers) >= 1) {
          if (!newHalqaMembersOnePlus.includes(memberName)) newHalqaMembersOnePlus.push(memberName);
        } else {
          if (!newHalqaMembersZero.includes(memberName)) newHalqaMembersZero.push(memberName);
        }
      }

      // 1:20 target – Muslim personal relations (number)
      if (form.muslimRelations !== undefined) {
        if (Number(form.muslimRelations) >= 1) {
          if (!muslimRelationsOnePlus.includes(memberName)) muslimRelationsOnePlus.push(memberName);
        } else {
          if (!muslimRelationsZero.includes(memberName)) muslimRelationsZero.push(memberName);
        }
      }

      // 1:10 target – community / fraternal relations (number)
      if (form.communityRelations !== undefined) {
        if (Number(form.communityRelations) >= 1) {
          if (!communityRelationsOnePlus.includes(memberName)) communityRelationsOnePlus.push(memberName);
        } else {
          if (!communityRelationsZero.includes(memberName)) communityRelationsZero.push(memberName);
        }
      }

      // Quarterly visits / score count (number)
      if (form.quarterlyVisits !== undefined) {
        if (Number(form.quarterlyVisits) >= 1) {
          if (!quarterlyVisitsOnePlus.includes(memberName)) quarterlyVisitsOnePlus.push(memberName);
        } else {
          if (!quarterlyVisitsZero.includes(memberName)) quarterlyVisitsZero.push(memberName);
        }
      }
    });

    weeklyMeetingAbsentees.sort((a, b) => b.absentCount - a.absentCount);

    // Include alternative submission members (Aged/Patient) in submittedMembers list
    alternativeSubmissions.forEach(altSub => {
      const memberName = (altSub.ruknName || 'Unknown').toUpperCase();
      if (!submittedMembers.includes(memberName)) submittedMembers.push(memberName);
    });

    const district = submissions[0]?.district || alternativeSubmissions[0]?.district || '';

    res.json({
      success: true,
      data: {
        unit,
        district,
        year: yearNum,
        quarter: quarterNum,
        totalSubmissions: submissions.length + alternativeSubmissions.length,
        aggregatedData: {
          submittedMembers,
          quranStudyCompleted,
          quranStudyNotCompleted,
          hadithReadingCompleted,
          hadithReadingNotCompleted,
          bookReadingCompleted,
          bookReadingNotCompleted,
          weeklyMeetingAbsentees,
          weeklyMeetingPresent,
          jamaathMeetingAbsentees,
          jamaathMeetingPresent,
          grihaMeetingsThreeOrMore,
          grihaMeetingsLessThanThree,
          baitulmalDefaulters,
          baitulmalPaid,
          presentationEffort: {
            satisfactory: presentationSatisfactory,
            unsatisfactory: presentationUnsatisfactory
          },
          newHalqaMembersOnePlus,
          newHalqaMembersZero,
          muslimRelationsOnePlus,
          muslimRelationsZero,
          communityRelationsOnePlus,
          communityRelationsZero,
          quarterlyVisitsOnePlus,
          quarterlyVisitsZero
        }
      }
    });
  } catch (error) {
    console.error('Get unit reply data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Send structured reply to unit admin
// @route   POST /api/admin/unit-reply
// @access  Private (Admin only)
router.post('/unit-reply', async (req, res) => {
  try {
    const {
      unit,
      year,
      quarter,
      replyData,
      formattedMessage
    } = req.body;

    if (!unit || !year || !quarter || !formattedMessage) {
      return res.status(400).json({
        success: false,
        message: 'Unit, year, quarter, and formatted message are required'
      });
    }

    // Check if Q3 is disabled
    if (isQuarterHidden(parseInt(quarter))) {
      return res.status(400).json({
        success: false,
        message: 'Q3 submissions are currently disabled, replies cannot be sent for Q3.'
      });
    }

    // Find unit admin
    const unitAdmin = await UnitAdmin.findOne({ unit });
    if (!unitAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Unit admin not found for this unit'
      });
    }

    // Get district from submissions
    const submission = await Submission.findOne({
      unit,
      'submissionPeriod.year': parseInt(year),
      'submissionPeriod.quarter': parseInt(quarter)
    });
    const district = submission?.district || '';

    // Create or update reply
    const reply = await UnitAdminReply.findOneAndUpdate(
      {
        unit,
        'submissionPeriod.year': parseInt(year),
        'submissionPeriod.quarter': parseInt(quarter)
      },
      {
        unit,
        district,
        submissionPeriod: {
          year: parseInt(year),
          quarter: parseInt(quarter)
        },
        replyData: replyData || {},
        formattedMessage: formattedMessage.trim(),
        repliedBy: req.user.userId,
        repliedAt: new Date()
      },
      {
        new: true,
        upsert: true
      }
    ).populate('repliedBy', 'username name');

    // Send WhatsApp message
    let whatsappResult = null;
    try {
      if (unitAdmin.contactNo && unitAdmin.contactNo.trim()) {
        const formattedWhatsAppMessage = formatStructuredReplyMessage(unitAdmin, formattedMessage.trim());
        whatsappResult = await sendWhatsAppMessage(unitAdmin.contactNo, formattedWhatsAppMessage);
        
        if (whatsappResult.success) {
          reply.whatsappSent = true;
          reply.whatsappSentAt = new Date();
          await reply.save();
          console.log(`WhatsApp message sent successfully to unit admin: ${unitAdmin.name} (${unitAdmin.contactNo})`);
        } else {
          console.warn(`Failed to send WhatsApp message to unit admin: ${unitAdmin.name}`, whatsappResult.error);
        }
      } else {
        console.warn(`No contact number found for unit admin of unit: ${unit}`);
      }
    } catch (whatsappError) {
      console.error('Error sending WhatsApp message:', whatsappError);
    }

    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: {
        reply: {
          id: reply._id,
          unit: reply.unit,
          periodDisplay: reply.periodDisplay,
          repliedBy: reply.repliedBy,
          repliedAt: reply.repliedAt,
          whatsappSent: reply.whatsappSent || whatsappResult?.success || false
        },
        whatsappSent: whatsappResult?.success || false
      }
    });
  } catch (error) {
    console.error('Send unit reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Migrate Q4 submissions to Q3
// @route   POST /api/admin/migrate-q4-to-q3
// @access  Private (Admin only)
router.post('/migrate-q4-to-q3', async (req, res) => {
  try {
    console.log('Starting Q4 to Q3 migration...');
    
    // Find all submissions with quarter 4
    const q4Submissions = await Submission.find({ 'submissionPeriod.quarter': 4 });
    console.log(`Found ${q4Submissions.length} submissions with quarter 4`);
    
    if (q4Submissions.length === 0) {
      return res.json({
        success: true,
        message: 'No submissions found with quarter 4',
        data: {
          totalFound: 0,
          totalUpdated: 0
        }
      });
    }
    
    // Update each submission to quarter 3 and assign months 7, 8, or 9
    let updatedCount = 0;
    const updateResults = {
      month7: 0,
      month8: 0,
      month9: 0,
      errors: []
    };
    
    for (let i = 0; i < q4Submissions.length; i++) {
      const submission = q4Submissions[i];
      
      try {
        // Distribute months evenly: 7, 8, 9 in rotation
        const month = 7 + (i % 3); // Cycles through 7, 8, 9
        
        // Update the submission
        await Submission.updateOne(
          { _id: submission._id },
          {
            $set: {
              'submissionPeriod.quarter': 3,
              'submissionPeriod.month': month
            }
          }
        );
        
        updatedCount++;
        if (month === 7) updateResults.month7++;
        else if (month === 8) updateResults.month8++;
        else if (month === 9) updateResults.month9++;
      } catch (error) {
        console.error(`Error updating submission ${submission._id}:`, error);
        updateResults.errors.push({
          submissionId: submission._id,
          error: error.message
        });
      }
    }
    
    console.log(`Migration completed: ${updatedCount} submissions updated`);
    
    res.json({
      success: true,
      message: `Successfully migrated ${updatedCount} submissions from Q4 to Q3`,
      data: {
        totalFound: q4Submissions.length,
        totalUpdated: updatedCount,
        monthDistribution: {
          month7: updateResults.month7,
          month8: updateResults.month8,
          month9: updateResults.month9
        },
        errors: updateResults.errors.length > 0 ? updateResults.errors : undefined
      }
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
});

// ==================== ABROAD COUNTRY CRUD ====================

// @desc    List all abroad countries
// @route   GET /api/ihthisabi/admin/abroad-countries
// @access  Private (Admin only)
router.get('/abroad-countries', async (req, res) => {
  try {
    // Paginated when `page` is sent (list view); full list otherwise (dropdown consumers)
    if (req.query.page) {
      const { page, limit, skip } = parsePagination(req.query);
      const [countries, total] = await Promise.all([
        AbroadCountry.find().sort({ title: 1 }).skip(skip).limit(limit),
        AbroadCountry.countDocuments()
      ]);
      return res.json({ success: true, data: { countries, pagination: buildPaginationMeta(total, page, limit) } });
    }
    const countries = await AbroadCountry.find().sort({ title: 1 });
    res.json({ success: true, data: { countries } });
  } catch (error) {
    console.error('Get abroad countries error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Create abroad country
// @route   POST /api/ihthisabi/admin/abroad-countries
// @access  Private (Admin only)
router.post('/abroad-countries', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Country title is required' });
    }
    const existing = await AbroadCountry.findOne({ title: title.trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A country with this title already exists' });
    }
    const country = await AbroadCountry.create({ title: title.trim() });
    res.status(201).json({ success: true, data: { country } });
  } catch (error) {
    console.error('Create abroad country error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Update abroad country
// @route   PUT /api/ihthisabi/admin/abroad-countries/:id
// @access  Private (Admin only)
router.put('/abroad-countries/:id', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Country title is required' });
    }
    const country = await AbroadCountry.findByIdAndUpdate(
      req.params.id,
      { title: title.trim() },
      { new: true, runValidators: true }
    );
    if (!country) {
      return res.status(404).json({ success: false, message: 'Country not found' });
    }
    res.json({ success: true, data: { country } });
  } catch (error) {
    console.error('Update abroad country error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Delete abroad country
// @route   DELETE /api/ihthisabi/admin/abroad-countries/:id
// @access  Private (Admin only)
router.delete('/abroad-countries/:id', async (req, res) => {
  try {
    const country = await AbroadCountry.findById(req.params.id);
    if (!country) {
      return res.status(404).json({ success: false, message: 'Country not found' });
    }
    // Guard: check if members are still assigned
    const memberCount = await User.countDocuments({ abroadCountry: req.params.id });
    if (memberCount > 0) {
      return res.status(409).json({ success: false, message: `Cannot delete: ${memberCount} member(s) are assigned to this country. Reassign them first.` });
    }
    // Cascade: delete child areas and units
    const areas = await AbroadArea.find({ countryId: req.params.id }).select('_id').lean();
    const areaIds = areas.map(a => a._id);
    if (areaIds.length > 0) {
      await AbroadUnit.deleteMany({ areaId: { $in: areaIds } });
      await AbroadArea.deleteMany({ countryId: req.params.id });
    }
    await AbroadCountry.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Country deleted successfully' });
  } catch (error) {
    console.error('Delete abroad country error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==================== ABROAD AREA CRUD ====================

// @desc    List abroad areas (optionally filtered by country)
// @route   GET /api/ihthisabi/admin/abroad-areas
// @access  Private (Admin only)
router.get('/abroad-areas', async (req, res) => {
  try {
    const { country } = req.query;
    const filter = {};
    if (country) filter.countryId = country;

    if (req.query.page) {
      const { page, limit, skip } = parsePagination(req.query);
      const [areas, total] = await Promise.all([
        AbroadArea.find(filter).populate('countryId', 'title').sort({ title: 1 }).skip(skip).limit(limit).lean(),
        AbroadArea.countDocuments(filter)
      ]);
      return res.json({ success: true, data: { areas, pagination: buildPaginationMeta(total, page, limit) } });
    }

    const areas = await AbroadArea.find(filter)
      .populate('countryId', 'title')
      .sort({ title: 1 })
      .lean();
    res.json({ success: true, data: { areas } });
  } catch (error) {
    console.error('Get abroad areas error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Create abroad area
// @route   POST /api/ihthisabi/admin/abroad-areas
// @access  Private (Admin only)
router.post('/abroad-areas', async (req, res) => {
  try {
    const { title, countryId } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Area title is required' });
    }
    if (!countryId) {
      return res.status(400).json({ success: false, message: 'Country is required' });
    }
    const country = await AbroadCountry.findById(countryId);
    if (!country) {
      return res.status(404).json({ success: false, message: 'Country not found' });
    }
    const existing = await AbroadArea.findOne({ countryId, title: title.trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An area with this title already exists in this country' });
    }
    const area = await AbroadArea.create({ title: title.trim(), countryId });
    const populated = await AbroadArea.findById(area._id).populate('countryId', 'title');
    res.status(201).json({ success: true, data: { area: populated } });
  } catch (error) {
    console.error('Create abroad area error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Update abroad area
// @route   PUT /api/ihthisabi/admin/abroad-areas/:id
// @access  Private (Admin only)
router.put('/abroad-areas/:id', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Area title is required' });
    }
    const area = await AbroadArea.findById(req.params.id);
    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found' });
    }
    const duplicate = await AbroadArea.findOne({ countryId: area.countryId, title: title.trim(), _id: { $ne: area._id } });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'An area with this title already exists in this country' });
    }
    area.title = title.trim();
    await area.save();
    const updated = await AbroadArea.findById(area._id).populate('countryId', 'title');
    res.json({ success: true, data: { area: updated } });
  } catch (error) {
    console.error('Update abroad area error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Delete abroad area
// @route   DELETE /api/ihthisabi/admin/abroad-areas/:id
// @access  Private (Admin only)
router.delete('/abroad-areas/:id', async (req, res) => {
  try {
    const area = await AbroadArea.findById(req.params.id);
    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found' });
    }
    const memberCount = await User.countDocuments({ abroadArea: req.params.id });
    if (memberCount > 0) {
      return res.status(409).json({ success: false, message: `Cannot delete: ${memberCount} member(s) are assigned to this area. Reassign them first.` });
    }
    await AbroadUnit.deleteMany({ areaId: req.params.id });
    await AbroadArea.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Area deleted successfully' });
  } catch (error) {
    console.error('Delete abroad area error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==================== ABROAD UNIT CRUD ====================

// @desc    List abroad units (optionally filtered by area or country)
// @route   GET /api/ihthisabi/admin/abroad-units
// @access  Private (Admin only)
router.get('/abroad-units', async (req, res) => {
  try {
    const { area, country } = req.query;
    const filter = {};
    if (area) filter.areaId = area;
    if (country) filter.countryId = country;

    if (req.query.page) {
      const { page, limit, skip } = parsePagination(req.query);
      const [units, total] = await Promise.all([
        AbroadUnit.find(filter).populate('areaId', 'title').populate('countryId', 'title').sort({ title: 1 }).skip(skip).limit(limit).lean(),
        AbroadUnit.countDocuments(filter)
      ]);
      return res.json({ success: true, data: { units, pagination: buildPaginationMeta(total, page, limit) } });
    }

    const units = await AbroadUnit.find(filter)
      .populate('areaId', 'title')
      .populate('countryId', 'title')
      .sort({ title: 1 })
      .lean();
    res.json({ success: true, data: { units } });
  } catch (error) {
    console.error('Get abroad units error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Create abroad unit
// @route   POST /api/ihthisabi/admin/abroad-units
// @access  Private (Admin only)
router.post('/abroad-units', async (req, res) => {
  try {
    const { title, areaId, countryId } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Unit title is required' });
    }
    if (!areaId || !countryId) {
      return res.status(400).json({ success: false, message: 'Area and country are required' });
    }
    const area = await AbroadArea.findOne({ _id: areaId, countryId });
    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found in the specified country' });
    }
    const existing = await AbroadUnit.findOne({ areaId, title: title.trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A unit with this title already exists in this area' });
    }
    const unit = await AbroadUnit.create({ title: title.trim(), areaId, countryId });
    const populated = await AbroadUnit.findById(unit._id).populate('areaId', 'title').populate('countryId', 'title');
    res.status(201).json({ success: true, data: { unit: populated } });
  } catch (error) {
    console.error('Create abroad unit error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Update abroad unit
// @route   PUT /api/ihthisabi/admin/abroad-units/:id
// @access  Private (Admin only)
router.put('/abroad-units/:id', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Unit title is required' });
    }
    const unit = await AbroadUnit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }
    const duplicate = await AbroadUnit.findOne({ areaId: unit.areaId, title: title.trim(), _id: { $ne: unit._id } });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'A unit with this title already exists in this area' });
    }
    unit.title = title.trim();
    await unit.save();
    const updated = await AbroadUnit.findById(unit._id).populate('areaId', 'title').populate('countryId', 'title');
    res.json({ success: true, data: { unit: updated } });
  } catch (error) {
    console.error('Update abroad unit error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Delete abroad unit
// @route   DELETE /api/ihthisabi/admin/abroad-units/:id
// @access  Private (Admin only)
router.delete('/abroad-units/:id', async (req, res) => {
  try {
    const unit = await AbroadUnit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }
    const memberCount = await User.countDocuments({ abroadUnit: req.params.id });
    if (memberCount > 0) {
      return res.status(409).json({ success: false, message: `Cannot delete: ${memberCount} member(s) are assigned to this unit. Reassign them first.` });
    }
    await AbroadUnit.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Unit deleted successfully' });
  } catch (error) {
    console.error('Delete abroad unit error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==================== ABROAD UNIT ADMINS ====================

// @desc    List abroad unit admins only (isAbroad: true), optionally filtered by
//          abroad country/area/unit id
// @route   GET /api/ihthisabi/admin/abroad-unitadmins
// @access  Private (Admin only)
router.get('/abroad-unitadmins', async (req, res) => {
  try {
    const { country, area, unit, search } = req.query;
    const filter = { isAbroad: true };
    if (country) filter.abroadCountry = country;
    if (area) filter.abroadArea = area;
    if (unit) filter.abroadUnit = unit;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { ruknId: { $regex: search, $options: 'i' } }
      ];
    }

    if (req.query.page) {
      const { page, limit, skip } = parsePagination(req.query);
      const [unitAdmins, total] = await Promise.all([
        UnitAdmin.find(filter)
          .populate('abroadCountry', 'title').populate('abroadArea', 'title').populate('abroadUnit', 'title')
          .sort({ name: 1 }).skip(skip).limit(limit).lean(),
        UnitAdmin.countDocuments(filter)
      ]);
      return res.json({ success: true, data: { unitAdmins, pagination: buildPaginationMeta(total, page, limit) } });
    }

    const unitAdmins = await UnitAdmin.find(filter)
      .populate('abroadCountry', 'title')
      .populate('abroadArea', 'title')
      .populate('abroadUnit', 'title')
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, data: { unitAdmins } });
  } catch (error) {
    console.error('Get abroad unit admins error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Assign a unit admin (rukn) to an abroad unit
// @route   POST /api/ihthisabi/admin/abroad-unitadmins
// @access  Private (Admin only)
router.post('/abroad-unitadmins', async (req, res) => {
  try {
    const { abroadUnitId, ruknId, name, contactNo, emailId, password } = req.body;

    if (!abroadUnitId || !ruknId || !ruknId.trim() || !name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Abroad unit, Rukn ID and name are required' });
    }

    const abroadUnit = await AbroadUnit.findById(abroadUnitId).populate('areaId', 'title').populate('countryId', 'title');
    if (!abroadUnit) {
      return res.status(404).json({ success: false, message: 'Abroad unit not found' });
    }

    const existingRuknId = await UnitAdmin.findOne({ ruknId: ruknId.trim() });
    if (existingRuknId) {
      return res.status(409).json({ success: false, message: 'A unit admin with this Rukn ID already exists' });
    }

    const created = await UnitAdmin.create({
      unit: abroadUnit.title,
      district: abroadUnit.countryId?.title || '',
      area: abroadUnit.areaId?.title || '',
      ruknId: ruknId.trim(),
      name: name.trim(),
      contactNo: contactNo || '',
      emailId: emailId || '',
      password: password && password.trim() ? password.trim() : 'unitadmin123',
      isActive: true,
      isAbroad: true,
      abroadCountry: abroadUnit.countryId?._id || abroadUnit.countryId,
      abroadArea: abroadUnit.areaId?._id || abroadUnit.areaId,
      abroadUnit: abroadUnit._id
    });

    const populated = await UnitAdmin.findById(created._id)
      .populate('abroadCountry', 'title')
      .populate('abroadArea', 'title')
      .populate('abroadUnit', 'title');

    res.status(201).json({ success: true, data: { unitAdmin: populated } });
  } catch (error) {
    console.error('Create abroad unit admin error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Update an abroad unit admin's details
// @route   PUT /api/ihthisabi/admin/abroad-unitadmins/:id
// @access  Private (Admin only)
router.put('/abroad-unitadmins/:id', async (req, res) => {
  try {
    const { name, contactNo, emailId, password, isActive } = req.body;

    const unitAdmin = await UnitAdmin.findOne({ _id: req.params.id, isAbroad: true });
    if (!unitAdmin) {
      return res.status(404).json({ success: false, message: 'Abroad unit admin not found' });
    }

    if (name && name.trim()) unitAdmin.name = name.trim();
    if (contactNo !== undefined) unitAdmin.contactNo = contactNo;
    if (emailId !== undefined) unitAdmin.emailId = emailId;
    if (typeof isActive === 'boolean') unitAdmin.isActive = isActive;
    if (password && password.trim()) unitAdmin.password = password.trim();

    await unitAdmin.save();

    const updated = await UnitAdmin.findById(unitAdmin._id)
      .populate('abroadCountry', 'title')
      .populate('abroadArea', 'title')
      .populate('abroadUnit', 'title');

    res.json({ success: true, data: { unitAdmin: updated } });
  } catch (error) {
    console.error('Update abroad unit admin error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Remove an abroad unit admin assignment
// @route   DELETE /api/ihthisabi/admin/abroad-unitadmins/:id
// @access  Private (Admin only)
router.delete('/abroad-unitadmins/:id', async (req, res) => {
  try {
    const unitAdmin = await UnitAdmin.findOneAndDelete({ _id: req.params.id, isAbroad: true });
    if (!unitAdmin) {
      return res.status(404).json({ success: false, message: 'Abroad unit admin not found' });
    }
    res.json({ success: true, message: 'Abroad unit admin removed successfully' });
  } catch (error) {
    console.error('Delete abroad unit admin error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==================== UPDATE USER (isAbroad + abroadCountry) ====================

// @desc    Update user fields (isAbroad, abroadCountry, isActive)
// @route   PUT /api/ihthisabi/admin/users/:id
// @access  Private (Admin only)
router.put('/users/:id', async (req, res) => {
  try {
    const { isAbroad, abroadCountry, abroadArea, abroadUnit, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot modify admin user' });
    }

    if (typeof isAbroad === 'boolean') user.isAbroad = isAbroad;
    if (!user.isAbroad) {
      user.abroadCountry = null;
      user.abroadArea = null;
      user.abroadUnit = null;
    } else {
      if (abroadCountry !== undefined) user.abroadCountry = abroadCountry || null;
      if (abroadArea !== undefined) user.abroadArea = abroadArea || null;
      if (abroadUnit !== undefined) user.abroadUnit = abroadUnit || null;
    }
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();

    const updatedUser = await User.findById(req.params.id)
      .select('-password')
      .populate('abroadCountry', 'title')
      .populate('abroadArea', 'title')
      .populate('abroadUnit', 'title');

    res.json({ success: true, data: { user: updatedUser } });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==================== ABROAD SUBMISSIONS ====================

// @desc    List submissions from isAbroad=true users, grouped/filterable by country
// @route   GET /api/ihthisabi/admin/abroad-submissions
// @access  Private (Admin only)
router.get('/abroad-submissions', async (req, res) => {
  try {
    const { country, area, unit, status, quarter, year } = req.query;
    // Paginated when `page` is sent (list view); full list otherwise (the grouped
    // country/area/unit tree view needs every matching submission at once, so it
    // bypasses parsePagination's MAX_LIMIT clamp rather than being capped like a
    // normal page request).
    const isPaginated = Boolean(req.query.page);
    const { page: pageNum, limit: limitNum } = isPaginated
      ? parsePagination(req.query)
      : { page: 1, limit: 2000 };

    // Build user filter
    const userFilter = { isAbroad: true };
    if (country) userFilter.abroadCountry = country;
    if (area) userFilter.abroadArea = area;
    if (unit) userFilter.abroadUnit = unit;

    // Get abroad users with their country/area/unit info
    const abroadUsers = await User.find(userFilter)
      .select('_id name ruknId unit district area abroadCountry abroadArea abroadUnit')
      .populate('abroadCountry', 'title')
      .populate('abroadArea', 'title')
      .populate('abroadUnit', 'title')
      .lean();

    if (abroadUsers.length === 0) {
      return res.json({
        success: true,
        data: {
          submissions: [],
          countries: [],
          pagination: buildPaginationMeta(0, pageNum, limitNum)
        }
      });
    }

    const abroadUserIds = abroadUsers.map(u => u._id);
    const userMap = {};
    abroadUsers.forEach(u => { userMap[String(u._id)] = u; });

    // Build submission filter
    const submissionFilter = { userId: { $in: abroadUserIds } };
    if (status) submissionFilter.status = status;
    if (quarter) submissionFilter['submissionPeriod.quarter'] = parseInt(quarter, 10);
    if (year) submissionFilter['submissionPeriod.year'] = parseInt(year, 10);

    const total = await Submission.countDocuments(submissionFilter);
    const submissions = await Submission.find(submissionFilter)
      .select('_id userId ruknName ruknId submissionPeriod status adminReply createdAt unit district area')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Attach country/area/unit info and user info to each submission
    const enriched = submissions.map(sub => {
      const user = userMap[String(sub.userId)] || {};
      return {
        ...sub,
        abroadCountry: user.abroadCountry || null,
        abroadArea: user.abroadArea || null,
        abroadUnit: user.abroadUnit || null,
        ruknName: sub.ruknName || user.name || '',
        ruknId: sub.ruknId || user.ruknId || '',
        unit: sub.unit || user.unit || '',
        district: sub.district || user.district || '',
        area: sub.area || user.area || ''
      };
    });

    // Build countries summary (for sidebar/tabs)
    const allAbroadUsers = await User.find({ isAbroad: true })
      .select('abroadCountry abroadArea abroadUnit')
      .populate('abroadCountry', 'title')
      .populate('abroadArea', 'title')
      .populate('abroadUnit', 'title')
      .lean();
    const countrySummary = {};
    allAbroadUsers.forEach(u => {
      if (u.abroadCountry) {
        const key = String(u.abroadCountry._id);
        if (!countrySummary[key]) {
          countrySummary[key] = { _id: u.abroadCountry._id, title: u.abroadCountry.title, memberCount: 0 };
        }
        countrySummary[key].memberCount++;
      }
    });

    res.json({
      success: true,
      data: {
        submissions: enriched,
        countries: Object.values(countrySummary).sort((a, b) => a.title.localeCompare(b.title)),
        pagination: buildPaginationMeta(total, pageNum, limitNum)
      }
    });
  } catch (error) {
    console.error('Get abroad submissions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    List abroad members (users with isAbroad=true)
// @route   GET /api/ihthisabi/admin/abroad-members
// @access  Private (Admin only)
router.get('/abroad-members', async (req, res) => {
  try {
    const { country, area, unit } = req.query;
    const filter = { isAbroad: true };
    if (country) filter.abroadCountry = country;
    if (area) filter.abroadArea = area;
    if (unit) filter.abroadUnit = unit;

    if (req.query.page) {
      const { page, limit, skip } = parsePagination(req.query);
      const [members, total] = await Promise.all([
        User.find(filter)
          .select('-password')
          .populate('abroadCountry', 'title').populate('abroadArea', 'title').populate('abroadUnit', 'title')
          .sort({ name: 1 }).skip(skip).limit(limit).lean(),
        User.countDocuments(filter)
      ]);
      return res.json({ success: true, data: { members, pagination: buildPaginationMeta(total, page, limit) } });
    }

    const members = await User.find(filter)
      .select('-password')
      .populate('abroadCountry', 'title')
      .populate('abroadArea', 'title')
      .populate('abroadUnit', 'title')
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, data: { members } });
  } catch (error) {
    console.error('Get abroad members error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==================== DYNAMIC USER MANAGEMENT (Super Admin Only) ====================

// Helper: super admin guard
const requireSuperAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ success: false, message: 'Only super admin can perform this action' });
  }
  next();
};

// @desc    Create a new rukn user manually
// @route   POST /api/ihthisabi/admin/users
// @access  Private (Super Admin only)
router.post('/users', requireSuperAdmin, async (req, res) => {
  try {
    const { ruknId, name, gender, district, area, unit, contactNo, emailId, country, isAbroad, abroadCountry, abroadArea, abroadUnit, isActive } = req.body;

    if (!ruknId || !name) {
      return res.status(400).json({ success: false, message: 'ruknId and name are required' });
    }
    const isAbroadBool = isAbroad === true || isAbroad === 'true';
    if (!isAbroadBool && !unit) {
      return res.status(400).json({ success: false, message: 'unit is required for non-abroad members' });
    }

    const existing = await User.findOne({ ruknId: ruknId.trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with this Rukn ID already exists' });
    }

    const userData = {
      role: 'rukn',
      ruknId: ruknId.trim(),
      name: name.trim(),
      gender: gender || 'Male',
      district: district?.trim() || '',
      area: area?.trim() || '',
      unit: isAbroadBool ? (unit?.trim() || '-') : unit.trim(),
      contactNo: contactNo?.trim() || '',
      emailId: emailId?.trim() || '',
      country: country?.trim() || '',
      isAbroad: isAbroadBool,
      abroadCountry: isAbroadBool ? (abroadCountry || null) : null,
      abroadArea: isAbroadBool ? (abroadArea || null) : null,
      abroadUnit: isAbroadBool ? (abroadUnit || null) : null,
      isActive: isActive !== false && isActive !== 'false'
    };

    const user = await User.create(userData);
    const created = await User.findById(user._id)
      .select('-password')
      .populate('abroadCountry', 'title')
      .populate('abroadArea', 'title')
      .populate('abroadUnit', 'title');

    res.status(201).json({ success: true, message: 'User created successfully', data: { user: created } });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A user with this Rukn ID already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Full profile update for a user
// @route   PUT /api/ihthisabi/admin/users/:id/profile
// @access  Private (Super Admin only)
router.put('/users/:id/profile', requireSuperAdmin, async (req, res) => {
  try {
    const { ruknId, name, gender, district, area, unit, contactNo, emailId, country, isAbroad, abroadCountry, abroadArea, abroadUnit, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot modify admin user' });

    // Check ruknId uniqueness if changed
    if (ruknId && ruknId.trim() !== user.ruknId) {
      const duplicate = await User.findOne({ ruknId: ruknId.trim(), _id: { $ne: user._id } });
      if (duplicate) return res.status(409).json({ success: false, message: 'Rukn ID is already in use by another user' });
      user.ruknId = ruknId.trim();
    }

    if (name !== undefined) user.name = name.trim();
    if (gender !== undefined) user.gender = gender;
    if (district !== undefined) user.district = district.trim();
    if (area !== undefined) user.area = area.trim();
    if (unit !== undefined) user.unit = unit.trim();
    if (contactNo !== undefined) user.contactNo = contactNo.trim();
    if (emailId !== undefined) user.emailId = emailId.trim();
    if (country !== undefined) user.country = country.trim();
    if (typeof isAbroad === 'boolean') user.isAbroad = isAbroad;
    if (!user.isAbroad) {
      user.abroadCountry = null;
      user.abroadArea = null;
      user.abroadUnit = null;
    } else {
      if (abroadCountry !== undefined) user.abroadCountry = abroadCountry || null;
      if (abroadArea !== undefined) user.abroadArea = abroadArea || null;
      if (abroadUnit !== undefined) user.abroadUnit = abroadUnit || null;
    }
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();
    const updated = await User.findById(user._id)
      .select('-password')
      .populate('abroadCountry', 'title')
      .populate('abroadArea', 'title')
      .populate('abroadUnit', 'title');
    res.json({ success: true, message: 'User updated successfully', data: { user: updated } });
  } catch (error) {
    console.error('Update user profile error:', error);
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Rukn ID is already in use' });
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Transfer user to a different unit / area / district, or mark as abroad
// @route   PUT /api/ihthisabi/admin/users/:id/transfer
// @access  Private (Super Admin only)
router.put('/users/:id/transfer', requireSuperAdmin, async (req, res) => {
  try {
    const { district, area, unit, isAbroad, abroadCountry, abroadArea, abroadUnit } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot transfer admin user' });

    const previousLocation = {
      district: user.district, area: user.area, unit: user.unit,
      isAbroad: user.isAbroad, abroadCountry: user.abroadCountry,
      abroadArea: user.abroadArea, abroadUnit: user.abroadUnit
    };

    if (typeof isAbroad === 'boolean' && isAbroad) {
      // Transfer to abroad
      user.isAbroad = true;
      user.abroadCountry = abroadCountry || null;
      user.abroadArea = abroadArea || null;
      user.abroadUnit = abroadUnit || null;
    } else if (typeof isAbroad === 'boolean' && !isAbroad) {
      // Clear abroad status; apply new location
      user.isAbroad = false;
      user.abroadCountry = null;
      user.abroadArea = null;
      user.abroadUnit = null;
      if (!unit) return res.status(400).json({ success: false, message: 'Target unit is required when not marking as abroad' });
      if (district !== undefined) user.district = district.trim();
      if (area !== undefined) user.area = area.trim();
      user.unit = unit.trim();
    } else {
      // No abroad flag provided — treat as a pure location transfer
      if (!unit) return res.status(400).json({ success: false, message: 'Target unit is required' });
      if (district !== undefined) user.district = district.trim();
      if (area !== undefined) user.area = area.trim();
      user.unit = unit.trim();
    }

    await user.save();
    const updated = await User.findById(user._id)
      .select('-password')
      .populate('abroadCountry', 'title')
      .populate('abroadArea', 'title')
      .populate('abroadUnit', 'title');

    const destination = user.isAbroad
      ? `Abroad (${updated.abroadCountry?.title || 'Unknown'})`
      : `${user.district} / ${user.area} / ${user.unit}`;

    res.json({
      success: true,
      message: `User transferred to ${destination}`,
      data: { user: updated, previousLocation }
    });
  } catch (error) {
    console.error('Transfer user error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get members of a specific unit (for unit admin assignment)
// @route   GET /api/ihthisabi/admin/units/:unitName/members
// @access  Private (Admin only)
router.get('/units/:unitName/members', async (req, res) => {
  try {
    const unitName = decodeURIComponent(req.params.unitName);
    const members = await User.find({ unit: { $regex: new RegExp(`^${unitName}$`, 'i') }, role: 'rukn', isActive: true })
      .select('ruknId name contactNo emailId district area unit isActive')
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, data: { members, unit: unitName } });
  } catch (error) {
    console.error('Get unit members error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Create unit admin manually (super admin only)
// @route   POST /api/ihthisabi/admin/unitadmins
// @access  Private (Super Admin only)
router.post('/unitadmins', requireSuperAdmin, async (req, res) => {
  try {
    const { ruknId, name, unit, district, area, contactNo, emailId, password } = req.body;

    if (!ruknId || !name || !unit) {
      return res.status(400).json({ success: false, message: 'ruknId, name, and unit are required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existing = await UnitAdmin.findOne({ ruknId: ruknId.trim() });
    if (existing) return res.status(409).json({ success: false, message: 'A unit admin with this Rukn ID already exists' });

    const unitAdmin = await UnitAdmin.create({
      ruknId: ruknId.trim(),
      name: name.trim(),
      unit: unit.trim(),
      district: district?.trim() || '',
      area: area?.trim() || '',
      contactNo: contactNo?.trim() || '',
      emailId: emailId?.trim() || '',
      password,
      isActive: true
    });

    const created = await UnitAdmin.findById(unitAdmin._id).select('-password');
    res.status(201).json({ success: true, message: 'Unit admin created successfully', data: { unitAdmin: created } });
  } catch (error) {
    console.error('Create unit admin error:', error);
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Rukn ID is already in use' });
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Assign an existing member as unit admin (replaces current unit admin if any)
// @route   POST /api/ihthisabi/admin/unitadmins/assign-from-member
// @access  Private (Super Admin only)
router.post('/unitadmins/assign-from-member', requireSuperAdmin, async (req, res) => {
  try {
    const { userId, deactivatePrevious } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const member = await User.findById(userId);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    if (member.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot assign admin user as unit admin' });

    // Optionally deactivate existing unit admin for this unit
    if (deactivatePrevious) {
      await UnitAdmin.updateMany({ unit: member.unit }, { isActive: false });
    }

    // Use the member's ruknId as their password
    const password = member.ruknId;

    // Upsert: update if ruknId exists, else create
    let unitAdmin = await UnitAdmin.findOne({ ruknId: member.ruknId });
    if (unitAdmin) {
      unitAdmin.name = member.name;
      unitAdmin.unit = member.unit;
      unitAdmin.district = member.district || '';
      unitAdmin.area = member.area || '';
      unitAdmin.contactNo = member.contactNo || '';
      unitAdmin.emailId = member.emailId || '';
      unitAdmin.password = password; // will be hashed by pre-save
      unitAdmin.isActive = true;
      await unitAdmin.save();
    } else {
      unitAdmin = await UnitAdmin.create({
        ruknId: member.ruknId,
        name: member.name,
        unit: member.unit,
        district: member.district || '',
        area: member.area || '',
        contactNo: member.contactNo || '',
        emailId: member.emailId || '',
        password,
        isActive: true
      });
    }

    const result = await UnitAdmin.findById(unitAdmin._id).select('-password');
    res.json({ success: true, message: `${member.name} has been assigned as unit admin for ${member.unit}`, data: { unitAdmin: result } });
  } catch (error) {
    console.error('Assign unit admin error:', error);
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Rukn ID is already in use' });
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Full update for a unit admin
// @route   PUT /api/ihthisabi/admin/unitadmins/:id/profile
// @access  Private (Super Admin only)
router.put('/unitadmins/:id/profile', requireSuperAdmin, async (req, res) => {
  try {
    const { ruknId, name, unit, district, area, contactNo, emailId, isActive, password } = req.body;

    const unitAdmin = await UnitAdmin.findById(req.params.id);
    if (!unitAdmin) return res.status(404).json({ success: false, message: 'Unit admin not found' });

    // Check ruknId uniqueness if changed
    if (ruknId && ruknId.trim() !== unitAdmin.ruknId) {
      const duplicate = await UnitAdmin.findOne({ ruknId: ruknId.trim(), _id: { $ne: unitAdmin._id } });
      if (duplicate) return res.status(409).json({ success: false, message: 'Rukn ID is already in use' });
      unitAdmin.ruknId = ruknId.trim();
    }

    if (name !== undefined) unitAdmin.name = name.trim();
    if (unit !== undefined) unitAdmin.unit = unit.trim();
    if (district !== undefined) unitAdmin.district = district.trim();
    if (area !== undefined) unitAdmin.area = area.trim();
    if (contactNo !== undefined) unitAdmin.contactNo = contactNo.trim();
    if (emailId !== undefined) unitAdmin.emailId = emailId.trim();
    if (typeof isActive === 'boolean') unitAdmin.isActive = isActive;
    if (password && password.length >= 6) unitAdmin.password = password;

    await unitAdmin.save();
    const updated = await UnitAdmin.findById(unitAdmin._id).select('-password');
    res.json({ success: true, message: 'Unit admin updated successfully', data: { unitAdmin: updated } });
  } catch (error) {
    console.error('Update unit admin profile error:', error);
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Rukn ID is already in use' });
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Delete a single unit admin
// @route   DELETE /api/ihthisabi/admin/unitadmins/:id
// @access  Private (Super Admin only)
router.delete('/unitadmins/:id', requireSuperAdmin, async (req, res) => {
  try {
    const unitAdmin = await UnitAdmin.findByIdAndDelete(req.params.id);
    if (!unitAdmin) return res.status(404).json({ success: false, message: 'Unit admin not found' });

    res.json({ success: true, message: 'Unit admin deleted successfully' });
  } catch (error) {
    console.error('Delete unit admin error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==================== DISTRICT ADMIN MANAGEMENT ====================

// @desc    Get all district admins
// @route   GET /api/ihthisabi/admin/district-admins
// @access  Private (Admin only)
router.get('/district-admins', async (req, res) => {
  try {
    const { page = 1, limit = 10, district, search } = req.query;
    const query = {};

    if (district) {
      query.district = { $regex: district, $options: 'i' };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { ruknId: { $regex: search, $options: 'i' } },
        { emailId: { $regex: search, $options: 'i' } }
      ];
    }

    const districtAdmins = await DistrictAdmin.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DistrictAdmin.countDocuments(query);

    res.json({
      success: true,
      data: {
        districtAdmins,
        pagination: buildPaginationMeta(total, parseInt(page), parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get district admins error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get all districts that have a district admin assigned
// @route   GET /api/ihthisabi/admin/district-admins/districts
// @access  Private (Admin only)
router.get('/district-admins/districts', async (req, res) => {
  try {
    const districts = await DistrictAdmin.distinct('district');
    res.json({ success: true, data: { districts: districts.sort() } });
  } catch (error) {
    console.error('Get district admin districts error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get single district admin by ID
// @route   GET /api/ihthisabi/admin/district-admins/:id
// @access  Private (Admin only)
router.get('/district-admins/:id', async (req, res) => {
  try {
    const districtAdmin = await DistrictAdmin.findById(req.params.id).select('-password');
    if (!districtAdmin) {
      return res.status(404).json({ success: false, message: 'District admin not found' });
    }
    res.json({ success: true, data: { districtAdmin } });
  } catch (error) {
    console.error('Get district admin error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Create district admin manually (super admin only)
// @route   POST /api/ihthisabi/admin/district-admins
// @access  Private (Super Admin only)
router.post('/district-admins', requireSuperAdmin, async (req, res) => {
  try {
    const { ruknId, name, district, contactNo, emailId, password } = req.body;

    if (!ruknId || !name || !district) {
      return res.status(400).json({ success: false, message: 'ruknId, name, and district are required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existing = await DistrictAdmin.findOne({ ruknId: ruknId.trim() });
    if (existing) return res.status(409).json({ success: false, message: 'A district admin with this Rukn ID already exists' });

    const districtAdmin = await DistrictAdmin.create({
      ruknId: ruknId.trim(),
      name: name.trim(),
      district: district.trim(),
      contactNo: contactNo?.trim() || '',
      emailId: emailId?.trim() || '',
      password,
      isActive: true
    });

    const created = await DistrictAdmin.findById(districtAdmin._id).select('-password');
    res.status(201).json({ success: true, message: 'District admin created successfully', data: { districtAdmin: created } });
  } catch (error) {
    console.error('Create district admin error:', error);
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Rukn ID is already in use' });
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Full update for a district admin
// @route   PUT /api/ihthisabi/admin/district-admins/:id/profile
// @access  Private (Super Admin only)
router.put('/district-admins/:id/profile', requireSuperAdmin, async (req, res) => {
  try {
    const { ruknId, name, district, contactNo, emailId, isActive, password } = req.body;

    const districtAdmin = await DistrictAdmin.findById(req.params.id);
    if (!districtAdmin) return res.status(404).json({ success: false, message: 'District admin not found' });

    if (ruknId && ruknId.trim() !== districtAdmin.ruknId) {
      const duplicate = await DistrictAdmin.findOne({ ruknId: ruknId.trim(), _id: { $ne: districtAdmin._id } });
      if (duplicate) return res.status(409).json({ success: false, message: 'Rukn ID is already in use' });
      districtAdmin.ruknId = ruknId.trim();
    }

    if (name !== undefined) districtAdmin.name = name.trim();
    if (district !== undefined) districtAdmin.district = district.trim();
    if (contactNo !== undefined) districtAdmin.contactNo = contactNo.trim();
    if (emailId !== undefined) districtAdmin.emailId = emailId.trim();
    if (typeof isActive === 'boolean') districtAdmin.isActive = isActive;
    if (password && password.length >= 6) districtAdmin.password = password;

    await districtAdmin.save();
    const updated = await DistrictAdmin.findById(districtAdmin._id).select('-password');
    res.json({ success: true, message: 'District admin updated successfully', data: { districtAdmin: updated } });
  } catch (error) {
    console.error('Update district admin profile error:', error);
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Rukn ID is already in use' });
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Delete a single district admin
// @route   DELETE /api/ihthisabi/admin/district-admins/:id
// @access  Private (Super Admin only)
router.delete('/district-admins/:id', requireSuperAdmin, async (req, res) => {
  try {
    const districtAdmin = await DistrictAdmin.findByIdAndDelete(req.params.id);
    if (!districtAdmin) return res.status(404).json({ success: false, message: 'District admin not found' });

    res.json({ success: true, message: 'District admin deleted successfully' });
  } catch (error) {
    console.error('Delete district admin error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ── Reply Template (singleton) ─────────────────────────────────────────────

// GET /ihthisabi/admin/reply-template
// Returns the saved template, or { template: null } if never configured.
router.get('/reply-template', async (req, res) => {
  try {
    const template = await ReplyTemplate.getSingleton();
    res.json({
      success: true,
      data: { template: template ? { blocks: template.blocks, updatedAt: template.updatedAt } : null }
    });
  } catch (error) {
    console.error('Get reply template error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// PUT /ihthisabi/admin/reply-template
// Upserts the global reply template. Body: { blocks: [] }
router.put('/reply-template', async (req, res) => {
  try {
    const { blocks } = req.body;

    if (!Array.isArray(blocks) || blocks.length === 0) {
      return res.status(400).json({ success: false, message: 'blocks must be a non-empty array' });
    }

    // Validate each block
    for (const block of blocks) {
      if (!['static', 'data'].includes(block.type)) {
        return res.status(400).json({ success: false, message: `Invalid block type: ${block.type}` });
      }
      if (block.type === 'data') {
        if (!block.fieldKey || typeof block.fieldKey !== 'string') {
          return res.status(400).json({ success: false, message: 'Data blocks must have a fieldKey' });
        }
        if (!block.textTemplate || typeof block.textTemplate !== 'string') {
          return res.status(400).json({ success: false, message: 'Data blocks must have a textTemplate' });
        }
      }
    }

    const template = await ReplyTemplate.findOneAndUpdate(
      {},
      { blocks, updatedBy: String(req.user._id || req.user.id || ''), updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      data: { template: { blocks: template.blocks, updatedAt: template.updatedAt } }
    });
  } catch (error) {
    console.error('Save reply template error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ── Form Fields for Reply Template Builder ─────────────────────────────────

/**
 * Build a fieldKey → Malayalam label map from ApplicationForm questions.
 */
function _buildFieldLabels(questions) {
  const labels = {};
  for (const q of questions) {
    const fieldType = _identifyDynamicField(q);
    if (!fieldType) continue;
    const base = q.questionTextMl || q.questionText || '';
    if (fieldType === 'quranStudy') {
      labels.quranStudyCompleted    = `${base} - പൂർണം`;
      labels.quranStudyNotCompleted = `${base} - അപൂർണം`;
    } else if (fieldType === 'hadithCount') {
      labels.hadithReadingCompleted    = `${base} - 1+`;
      labels.hadithReadingNotCompleted = `${base} - 0`;
    } else if (fieldType === 'weeklyMeeting') {
      labels.weeklyMeetingPresent   = `${base} - ഹാജർ`;
      labels.weeklyMeetingAbsentees = `${base} - ആബ്സൻ്റ്`;
    } else if (fieldType === 'jamaathMeeting') {
      labels.jamaathMeetingPresent   = `${base} - ഹാജർ`;
      labels.jamaathMeetingAbsentees = `${base} - ആബ്സൻ്റ്`;
    } else if (fieldType === 'grihaMeetings') {
      labels.grihaMeetingsThreeOrMore    = `${base} - 2+`;
      labels.grihaMeetingsLessThanThree  = `${base} - 2ൽ കുറവ്`;
    } else if (fieldType === 'baitulmal') {
      labels.baitulmalPaid       = `${base} - അടച്ചവർ`;
      labels.baitulmalDefaulters = `${base} - അടക്കാത്തവർ`;
    } else if (fieldType === 'recruitEffort') {
      labels.presentationSatisfactory    = `${base} - തൃപ്തികരം`;
      labels.presentationUnsatisfactory  = `${base} - തൃപ്തികരമല്ല`;
    } else if (fieldType === 'newHalqaMembers') {
      labels.newHalqaMembersOnePlus = `${base} - 1+`;
      labels.newHalqaMembersZero    = `${base} - 0`;
    } else if (fieldType === 'muslimRelations') {
      labels.muslimRelationsOnePlus = `${base} - 1+`;
      labels.muslimRelationsZero    = `${base} - 0`;
    } else if (fieldType === 'communityRelations') {
      labels.communityRelationsOnePlus = `${base} - 1+`;
      labels.communityRelationsZero    = `${base} - 0`;
    } else if (fieldType === 'quarterlyVisits') {
      labels.quarterlyVisitsOnePlus = `${base} - 1+`;
      labels.quarterlyVisitsZero    = `${base} - 0`;
    } else if (['bookReadingIslami', 'bookReadingAtma', 'bookReading'].includes(fieldType)) {
      if (!labels.bookReadingCompleted)    labels.bookReadingCompleted    = `${base} - പൂർണം`;
      if (!labels.bookReadingNotCompleted) labels.bookReadingNotCompleted = `${base} - അപൂർണം`;
    }
  }
  return labels;
}

// GET /ihthisabi/admin/form-fields?quarter=X&year=Y
// Returns aggregated field keys with labels derived from the published
// ApplicationForm for that quarter, falling back to Malayalam defaults.
router.get('/form-fields', async (req, res) => {
  try {
    const quarterNum = parseInt(req.query.quarter) || 0;
    const yearNum    = parseInt(req.query.year)    || new Date().getFullYear();

    if (!quarterNum || quarterNum < 1 || quarterNum > 4) {
      return res.status(400).json({ success: false, message: 'quarter (1-4) is required' });
    }

    const FALLBACK_LABELS = {
      submittedMembers:          'റിപ്പോർട്ട് അയച്ചവർ',
      quranStudyCompleted:       'ഖുർആൻ പഠനം - പൂർണം',
      quranStudyNotCompleted:    'ഖുർആൻ പഠനം - അപൂർണം',
      hadithReadingCompleted:    'ഹദീസ് പഠനം - 1+',
      hadithReadingNotCompleted: 'ഹദീസ് പഠനം - 0',
      bookReadingCompleted:      'പുസ്തക വായന - പൂർണം',
      bookReadingNotCompleted:   'പുസ്തക വായന - അപൂർണം',
      weeklyMeetingPresent:     'ആഴ്ചയോഗം - ഹാജർ',
      weeklyMeetingAbsentees:    'ആഴ്ചയോഗം - ആബ്സൻ്റ്',
      jamaathMeetingPresent:     'ജമാഅത്ത് യോഗം - ഹാജർ',
      jamaathMeetingAbsentees:   'ജമാഅത്ത് യോഗം - ആബ്സൻ്റ്',
      grihaMeetingsThreeOrMore:  'ഗൃഹ യോഗം - 2+',
      grihaMeetingsLessThanThree:'ഗൃഹ യോഗം - 2ൽ കുറവ്',
      baitulmalPaid:             'ബൈത്തുൽമാൽ - അടച്ചവർ',
      baitulmalDefaulters:       'ബൈത്തുൽമാൽ - അടക്കാത്തവർ',
      presentationSatisfactory:  'ദഅ്‌വ ഉദ്യമം - തൃപ്തികരം',
      presentationUnsatisfactory:'ദഅ്‌വ ഉദ്യമം - തൃപ്തികരമല്ല',
      newHalqaMembersOnePlus:    '1:3 ഹൽക്ക - 1+',
      newHalqaMembersZero:       '1:3 ഹൽക്ക - 0',
      muslimRelationsOnePlus:    '1:20 മുസ്ലിം ബന്ധ - 1+',
      muslimRelationsZero:       '1:20 മുസ്ലിം ബന്ധ - 0',
      communityRelationsOnePlus: '1:10 സദ്ദഹോദര ബന്ധ - 1+',
      communityRelationsZero:    '1:10 സദ്ദഹോദര ബന്ധ - 0',
      quarterlyVisitsOnePlus:    'ത്രൈമാസ ഡൗ - 1+',
      quarterlyVisitsZero:       'ത്രൈമാസ ഡൗ - 0',
    };

    let formTitle = null;
    let fieldLabels = { ...FALLBACK_LABELS };

    // Try to find a published ApplicationForm for this quarter/year
    let appForm = await ApplicationForm.findOne({
      quarter: quarterNum,
      year: yearNum,
      status: 'published'
    }).lean();

    // Fall back to most recent published form for this quarter (any year)
    if (!appForm) {
      appForm = await ApplicationForm.findOne({
        quarter: quarterNum,
        status: 'published'
      }).sort({ year: -1 }).lean();
    }

    if (appForm && appForm.questions && appForm.questions.length > 0) {
      const derived = _buildFieldLabels(appForm.questions);
      fieldLabels = { ...FALLBACK_LABELS, ...derived };
      formTitle = appForm.title;
    }

    res.json({
      success: true,
      data: { quarter: quarterNum, year: yearNum, formTitle, fieldLabels }
    });
  } catch (error) {
    console.error('Get form fields error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==================== ARCHIVE QUARTER MANAGEMENT (Super Admin Only) ====================

// @desc    List all archived quarters
// @route   GET /api/ihthisabi/admin/archive-quarters
// @access  Private (Super Admin only)
router.get('/archive-quarters', requireSuperAdmin, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [archivedQuarters, total] = await Promise.all([
      ArchivedQuarter.find({}).sort({ year: -1, quarter: -1 }).skip(skip).limit(limit).lean(),
      ArchivedQuarter.countDocuments({})
    ]);

    res.json({
      success: true,
      data: archivedQuarters,
      pagination: buildPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('List archived quarters error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Archive a quarter (hide from unit admins and users)
// @route   POST /api/ihthisabi/admin/archive-quarters
// @access  Private (Super Admin only)
router.post('/archive-quarters', requireSuperAdmin, async (req, res) => {
  try {
    const { quarter, year } = req.body;
    const quarterNum = parseInt(quarter, 10);
    const yearNum = parseInt(year, 10);

    if (!quarterNum || quarterNum < 1 || quarterNum > 4) {
      return res.status(400).json({ success: false, message: 'Invalid quarter. Must be 1, 2, 3, or 4.' });
    }
    if (!yearNum || yearNum < 2020 || yearNum > 2100) {
      return res.status(400).json({ success: false, message: 'Invalid year.' });
    }

    const existing = await ArchivedQuarter.findOne({ quarter: quarterNum, year: yearNum });
    if (existing) {
      return res.status(409).json({ success: false, message: `Q${quarterNum} ${yearNum} is already archived.` });
    }

    const archived = await ArchivedQuarter.create({
      quarter: quarterNum,
      year: yearNum,
      archivedBy: req.user?.email || req.user?.username || 'admin',
      archivedAt: new Date()
    });

    res.status(201).json({ success: true, message: `Q${quarterNum} ${yearNum} archived successfully.`, data: archived });
  } catch (error) {
    console.error('Archive quarter error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Unarchive a quarter (restore visibility)
// @route   DELETE /api/ihthisabi/admin/archive-quarters/:id
// @access  Private (Super Admin only)
router.delete('/archive-quarters/:id', requireSuperAdmin, async (req, res) => {
  try {
    const archived = await ArchivedQuarter.findByIdAndDelete(req.params.id);
    if (!archived) {
      return res.status(404).json({ success: false, message: 'Archived quarter not found.' });
    }
    res.json({ success: true, message: `Q${archived.quarter} ${archived.year} unarchived successfully.` });
  } catch (error) {
    console.error('Unarchive quarter error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get rukn users who have NOT submitted for a specific quarter/year
// @route   GET /api/ihthisabi/admin/non-submitted
// @access  Private (Admin only)
router.get('/non-submitted', async (req, res) => {
  try {
    const { quarter, year, district, area, unit } = req.query;

    if (!quarter || !year) {
      return res.status(400).json({ success: false, message: 'Quarter and year are required' });
    }

    const quarterNum = parseInt(quarter, 10);
    const yearNum = parseInt(year, 10);

    if (isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
      return res.status(400).json({ success: false, message: 'Invalid quarter (1–4 required)' });
    }
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ success: false, message: 'Invalid year' });
    }

    // Build user filter — only active rukn, exclude abroad members
    const userFilter = { role: 'rukn', isAbroad: { $ne: true } };
    if (district && district !== 'all') userFilter.district = district;
    if (area && area !== 'all') userFilter.area = area;
    if (unit && unit !== 'all') userFilter.unit = unit;

    // Fetch all rukn users matching location filter
    const allRukns = await User.find(userFilter)
      .select('_id name ruknId district area unit')
      .lean();

    if (allRukns.length === 0) {
      const { page: emptyPage, limit: emptyLimit } = parsePagination(req.query);
      return res.json({
        success: true,
        data: {
          nonSubmitted: [],
          total: 0,
          totalRukns: 0,
          period: { quarter: quarterNum, year: yearNum },
          periodDisplay: `Q${quarterNum} ${yearNum}`,
          pagination: buildPaginationMeta(0, emptyPage, emptyLimit)
        }
      });
    }

    // Find all userIds who submitted for this quarter/year
    const submissions = await Submission.find({
      'submissionPeriod.quarter': quarterNum,
      'submissionPeriod.year': yearNum
    }).select('userId').lean();

    const submittedUserIds = new Set(submissions.map(s => String(s.userId)));

    // Unit admins submit with userId = UnitAdmin._id (not User._id).
    // Find unit admins who submitted and cross-reference by ruknId so their
    // corresponding User records are not listed as non-submitted.
    const submittedUnitAdmins = await UnitAdmin.find(
      { _id: { $in: Array.from(submittedUserIds) } }
    ).select('ruknId').lean();
    const submittedUnitAdminRuknIds = new Set(
      submittedUnitAdmins.map(ua => ua.ruknId).filter(Boolean)
    );

    // Members who have not submitted
    const nonSubmitted = allRukns
      .filter(u =>
        !submittedUserIds.has(String(u._id)) &&
        !(u.ruknId && submittedUnitAdminRuknIds.has(u.ruknId))
      )
      .map(u => ({
        id: u._id,
        name: u.name || 'Unknown',
        ruknId: u.ruknId || null,
        district: u.district || '',
        area: u.area || '',
        unit: u.unit || ''
      }));

    // The non-submitted set is a set-difference of two full collections, so it must be
    // computed in full before it can be paginated — slice the computed result below.
    const { page, limit, skip } = parsePagination(req.query);
    const total = nonSubmitted.length;
    const pagedNonSubmitted = nonSubmitted.slice(skip, skip + limit);

    res.json({
      success: true,
      data: {
        nonSubmitted: pagedNonSubmitted,
        total,
        totalRukns: allRukns.length,
        period: { quarter: quarterNum, year: yearNum },
        periodDisplay: `Q${quarterNum} ${yearNum}`,
        pagination: buildPaginationMeta(total, page, limit)
      }
    });
  } catch (error) {
    console.error('Non-submitted fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;