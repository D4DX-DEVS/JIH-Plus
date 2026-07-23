const express = require('express');
const jwt = require('jsonwebtoken');
const UnitAdmin = require('../../models/ihthisabi/UnitAdmin');
const User = require('../../models/ihthisabi/User');
const Submission = require('../../models/ihthisabi/Submission');
const AlternativeSubmit = require('../../models/ihthisabi/alternativeSubmit');
const ApplicationForm = require('../../models/ihthisabi/ApplicationForm');
const UnitAdminReply = require('../../models/ihthisabi/UnitAdminReply');
const { generateToken, protect } = require('../../middlewares/ihthisabi/auth');
const { migrateStaticToDynamic } = require('../../utils/staticToDynamicMigration');
const { 
  getAvailableSubmissionQuarter,
  validateSubmissionQuarter,
  isQuarterHidden,
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

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeUnitValue = (value = '') => String(value)
  .replace(/\s*\([^)]*\)\s*/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const buildUnitVariants = (unitValue = '') => {
  const raw = String(unitValue || '').trim();
  const normalized = normalizeUnitValue(unitValue);
  return [...new Set([raw, normalized].filter(Boolean))];
};

const buildUnitExactMatch = (unitValue = '') => {
  const variants = buildUnitVariants(unitValue);
  if (variants.length === 0) return null;

  if (variants.length === 1) {
    return { $regex: `^${escapeRegex(variants[0])}$`, $options: 'i' };
  }

  return {
    $in: variants.map((variant) => new RegExp(`^${escapeRegex(variant)}$`, 'i'))
  };
};

const buildUnitScopedUserQuery = (unitValue = '') => {
  const unitMatch = buildUnitExactMatch(unitValue);
  return unitMatch
    ? { role: 'rukn', unit: unitMatch }
    : { role: 'rukn', unit: '__no_matching_unit__' };
};

const buildUnitScopedSubmissionQuery = (unitValue = '') => {
  const unitMatch = buildUnitExactMatch(unitValue);
  return unitMatch
    ? { unit: unitMatch }
    : { unit: '__no_matching_unit__' };
};

// Resolve the correct member/submission scope for a unit admin. Abroad unit admins
// are linked to their unit via the `abroadUnit` ObjectId ref (abroad Users store
// unit:'-' as a placeholder and blank district/area, so the domestic string-based
// queries above never match them) — so abroad scope is resolved via that ref
// instead of a unit-name match.
const getUnitAdminScope = async (unitAdmin) => {
  if (unitAdmin.isAbroad) {
    const memberQuery = { role: 'rukn', isAbroad: true, abroadUnit: unitAdmin.abroadUnit };
    const memberIds = await User.find(memberQuery).distinct('_id');
    return {
      memberQuery,
      submissionQuery: { userId: { $in: memberIds } },
      memberIds
    };
  }

  const unitName = unitAdmin.unit;
  const abroadUserIds = await User.find({ unit: unitName, isAbroad: true }).distinct('_id');
  return {
    memberQuery: buildUnitScopedUserQuery(unitName),
    submissionQuery: {
      ...buildUnitScopedSubmissionQuery(unitName),
      ...(abroadUserIds.length > 0 ? { userId: { $nin: abroadUserIds } } : {})
    },
    memberIds: null
  };
};

// ==================== DEBUG/TEST ENDPOINTS ====================

// @desc    Debug endpoint to test token validation
// @route   POST /api/unitadmin/debug/validate-token
// @access  Public (for debugging)
router.post('/debug/validate-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required in request body'
      });
    }

    console.log('[DEBUG] Testing token validation');
    console.log('[DEBUG] Token (first 50 chars):', token.substring(0, 50) + '...');
    console.log('[DEBUG] Token length:', token.length);
    console.log('[DEBUG] JWT_SECRET exists:', !!process.env.JWT_SECRET);

    try {
      // Decode without verification first
      const decodedWithoutVerify = jwt.decode(token, { complete: true });
      console.log('[DEBUG] Token decoded (without verify):', JSON.stringify(decodedWithoutVerify, null, 2));

      // Now verify
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('[DEBUG] Token verified successfully:', JSON.stringify(decoded, null, 2));

      // Check user in database
      let user = null;
      if (decoded.role === 'unitAdmin' && decoded.userId) {
        user = await UnitAdmin.findById(decoded.userId).select('-password');
      } else if (decoded.userId && decoded.userId !== 'admin') {
        user = await User.findById(decoded.userId).select('-password');
      }

      return res.json({
        success: true,
        message: 'Token is valid',
        data: {
          decoded,
          user: user ? {
            id: user._id,
            role: decoded.role,
            isActive: user.isActive,
            name: user.name || user.ruknName
          } : null,
          tokenInfo: {
            expiresAt: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
            issuedAt: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null,
            isExpired: decoded.exp ? decoded.exp < Date.now() / 1000 : false
          }
        }
      });
    } catch (error) {
      console.error('[DEBUG] Token validation error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Token validation failed',
        error: {
          name: error.name,
          message: error.message,
          expiredAt: error.expiredAt ? new Date(error.expiredAt).toISOString() : null
        }
      });
    }
  } catch (error) {
    console.error('[DEBUG] Debug endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Debug endpoint to test request headers
// @route   GET /api/unitadmin/debug/headers
// @access  Public (for debugging)
router.get('/debug/headers', async (req, res) => {
  try {
    return res.json({
      success: true,
      message: 'Request headers debug info',
      data: {
        headers: req.headers,
        authorization: req.headers.authorization,
        'x-auth-token': req.headers['x-auth-token'],
        tokenExtracted: req.headers.authorization?.startsWith('Bearer') 
          ? req.headers.authorization.split(' ')[1]?.substring(0, 20) + '...'
          : null
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Unit Admin Login
// @route   POST /api/unitadmin/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { unit, ruknId } = req.body;

    console.log('Unit Admin login attempt:', { unit, ruknId });

    // Validate required fields
    if (!unit || !ruknId) {
      return res.status(400).json({
        success: false,
        message: 'Unit and RUKN ID are required'
      });
    }

    // Find unit admin by RUKN ID and unit
    const unitAdmin = await UnitAdmin.findOne({
      ruknId: ruknId,
      unit: unit
    });

    if (!unitAdmin) {
      console.log('Unit Admin not found with provided credentials');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your unit and RUKN ID.'
      });
    }

    // Check if unit admin is active
    if (!unitAdmin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account is deactivated. Please contact main admin.'
      });
    }

    // Update last login
    unitAdmin.lastLogin = new Date();
    await unitAdmin.save();

    // Generate token with unit admin role
    const token = jwt.sign(
      { 
        userId: unitAdmin._id,
        role: 'unitAdmin',
        unit: unitAdmin.unit,
        ruknId: unitAdmin.ruknId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    console.log('Unit Admin login successful:', unitAdmin.name, unitAdmin.ruknId);

    res.json({
      success: true,
      message: 'Unit Admin login successful',
      data: {
        user: {
          id: unitAdmin._id,
          role: 'unitAdmin',
          ruknId: unitAdmin.ruknId,
          name: unitAdmin.name,
          unit: unitAdmin.unit,
          district: unitAdmin.district,
          contactNo: unitAdmin.contactNo,
          emailId: unitAdmin.emailId
        },
        token
      }
    });
  } catch (error) {
    console.error('Unit Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @desc    Get unit admin profile
// @route   GET /api/unitadmin/me
// @access  Private (Unit Admin)
router.get('/me', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const unitAdmin = await UnitAdmin.findById(req.user.userId);

    if (!unitAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Unit admin not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: unitAdmin._id,
          role: 'unitAdmin',
          ruknId: unitAdmin.ruknId,
          name: unitAdmin.name,
          unit: unitAdmin.unit,
          district: unitAdmin.district,
          area: unitAdmin.area,
          contactNo: unitAdmin.contactNo,
          emailId: unitAdmin.emailId,
          lastLogin: unitAdmin.lastLogin,
          isAbroad: !!unitAdmin.isAbroad
        }
      }
    });
  } catch (error) {
    console.error('Get unit admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get all members under this unit
// @route   GET /api/unitadmin/members
// @access  Private (Unit Admin)
router.get('/members', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const unitAdmin = await UnitAdmin.findById(req.user.userId);
    if (!unitAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Unit admin not found'
      });
    }

    // Match unit names defensively because uploaded unit admin rows are not always normalized
    const unitName = unitAdmin.unit;
    console.log('Unit Admin Unit:', unitName);

    const { memberQuery } = await getUnitAdminScope(unitAdmin);

    // Fetch all users from User model with this unit name
    const members = await User.find(memberQuery)
      .select('ruknId name gender unit district area contactNo emailId country lastLogin createdAt role')
      .sort({ createdAt: -1 });

    console.log(`Found ${members.length} users in unit: ${unitName}`);

    // Get submission counts for each member
    const membersWithSubmissionCounts = await Promise.all(
      members.map(async (member) => {
        const submissionCount = await Submission.countDocuments({
          $or: [
            { submittedBy: member._id },
            { userId: member._id }
          ]
        });
        
        console.log(`Member ${member.name} (${member._id}): ${submissionCount} submissions`);
        
        return {
          ...member.toObject(),
          submissionCount
        };
      })
    );

    res.json({
      success: true,
      data: {
        members: membersWithSubmissionCounts,
        totalCount: members.length,
        unit: unitName
      }
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get dashboard statistics
// @route   GET /api/unitadmin/dashboard
// @access  Private (Unit Admin)
router.get('/dashboard', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const unitAdmin = await UnitAdmin.findById(req.user.userId);
    if (!unitAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Unit admin not found'
      });
    }

    // Get total members count
    const { memberQuery, submissionQuery } = await getUnitAdminScope(unitAdmin);

    const totalMembers = await User.countDocuments(memberQuery);

    // Get total submissions count
    const totalSubmissions = await Submission.countDocuments({
      ...submissionQuery,
      ...req.quarterFilter
    });

    // Get submissions by status
    const submittedCount = await Submission.countDocuments({
      ...submissionQuery,
      status: 'submitted',
      ...req.quarterFilter
    });

    const pendingCount = await Submission.countDocuments({
      ...submissionQuery,
      status: 'pending',
      ...req.quarterFilter
    });

    const draftCount = await Submission.countDocuments({
      ...submissionQuery,
      status: 'draft',
      ...req.quarterFilter
    });

    // Get recent submissions (last 5)
    const recentSubmissions = await Submission.find({
      ...submissionQuery,
      ...req.quarterFilter
    })
    .populate('submittedBy', 'ruknId name')
    .sort({ createdAt: -1 })
    .limit(5)
    .select('status period submittedBy createdAt ruknName');

    // Get members with submission counts
    const membersWithSubmissions = await User.aggregate([
      {
        $match: memberQuery
      },
      {
        $lookup: {
          from: 'submissions',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$submittedBy', '$$userId'] },
                    { $eq: ['$userId', '$$userId'] }
                  ]
                },
                ...req.quarterFilter
              }
            }
          ],
          as: 'submissions'
        }
      },
      {
        $project: {
          name: 1,
          ruknId: 1,
          submissionCount: { $size: '$submissions' },
          lastSubmission: { $max: '$submissions.createdAt' }
        }
      },
      {
        $sort: { submissionCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Calculate completion rate
    const completionRate = totalMembers > 0 ? Math.round((submittedCount / totalMembers) * 100) : 0;

    // Add periodDisplay to recent submissions
    // The periodDisplay is a virtual field in the model, so we need to ensure it's included
    const recentSubmissionsWithPeriod = recentSubmissions.map(submission => {
      const submissionObj = submission.toObject();
      // Use the virtual periodDisplay if available, otherwise calculate from submissionPeriod
      const periodDisplay = submissionObj.periodDisplay || 
        (submission.submissionPeriod 
          ? (() => {
              const quarterInfo = {
                1: 'Q1 (Jan-Mar)',
                2: 'Q2 (Apr-Jun)', 
                3: 'Q3 (Jul-Sep)',
                4: 'Q4 (Oct-Dec)'
              };
              const quarter = submission.submissionPeriod.quarter || 
                Math.ceil((submission.submissionPeriod.month || 1) / 3);
              return `${quarterInfo[quarter] || `Q${quarter}`} ${submission.submissionPeriod.year}`;
            })()
          : 'N/A');
      
      return {
        ...submissionObj,
        periodDisplay
      };
    });

    res.json({
      success: true,
      data: {
        unit: unitAdmin.unit,
        stats: {
          totalMembers,
          totalSubmissions,
          submittedCount,
          pendingCount,
          draftCount,
          completionRate
        },
        recentSubmissions: recentSubmissionsWithPeriod,
        topContributors: membersWithSubmissions
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get detailed member information
// @route   GET /api/unitadmin/members/:id
// @access  Private (Unit Admin)
router.get('/members/:id', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const unitAdmin = await UnitAdmin.findById(req.user.userId);
    if (!unitAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Unit admin not found'
      });
    }

    // Get member details
    const { memberQuery } = await getUnitAdminScope(unitAdmin);
    const member = await User.findOne({
      _id: req.params.id,
      ...memberQuery
    }).select('ruknId name gender unit district area contactNo emailId country lastLogin createdAt');

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found or not under your unit'
      });
    }

    // Get member's submissions
    const submissions = await Submission.find({
      $or: [
        { submittedBy: member._id },
        { userId: member._id }
      ]
    })
    .select('status period form createdAt updatedAt')
    .sort({ createdAt: -1 });

    // Calculate statistics
    const totalSubmissions = submissions.length;
    const submittedCount = submissions.filter(s => s.status === 'submitted').length;
    const pendingCount = submissions.filter(s => s.status === 'pending').length;
    const draftCount = submissions.filter(s => s.status === 'draft').length;

    // Get latest submission
    const latestSubmission = submissions.length > 0 ? submissions[0] : null;

    res.json({
      success: true,
      data: {
        member: {
          ...member.toObject(),
          totalSubmissions,
          submittedCount,
          pendingCount,
          draftCount,
          latestSubmission
        },
        submissions,
        unit: unitAdmin.unit
      }
    });
  } catch (error) {
    console.error('Get member details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get all submissions from members under this unit (lightweight listing)
// @route   GET /api/unitadmin/submissions
// @access  Private (Unit Admin)
router.get('/submissions', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const unitAdmin = await UnitAdmin.findById(req.user.userId);
    if (!unitAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Unit admin not found'
      });
    }

    const search = req.query.search || '';
    const status = req.query.status || '';

    const { submissionQuery } = await getUnitAdminScope(unitAdmin);

    // Build search query
    let searchQuery = {
      ...submissionQuery,
      ...req.quarterFilter
    };

    if (status) {
      searchQuery.status = status;
    }

    // Fetch all submissions (no pagination - frontend will handle pagination)
    let submissions = await Submission.find(searchQuery)
      .select('_id submittedBy userId ruknName ruknId submissionPeriod periodDisplay createdAt status adminReply')
      .populate({
        path: 'submittedBy',
        select: 'ruknId name district area'
      })
      .populate({
        path: 'userId',
        select: 'ruknId name district area'
      })
      .populate('adminReply.repliedBy', 'username name')
      .sort({ createdAt: -1 })
      .lean();

    // Filter by search term if provided
    if (search) {
      const searchLower = search.toLowerCase();
      submissions = submissions.filter((submission) => {
        // Check multiple sources for search
        const ruknName = submission.ruknName || submission.submittedBy?.name || submission.userId?.name || '';
        const ruknId = submission.submittedBy?.ruknId || submission.userId?.ruknId || '';
        const district = submission.submittedBy?.district || submission.userId?.district || '';
        const area = submission.submittedBy?.area || submission.userId?.area || '';
        
        return (
          ruknName.toLowerCase().includes(searchLower) ||
          ruknId.toLowerCase().includes(searchLower) ||
          district.toLowerCase().includes(searchLower) ||
          area.toLowerCase().includes(searchLower)
        );
      });
    }

    // Helper to compute quarter string
    const computeQuarter = (submission) => {
      if (submission.periodDisplay) return submission.periodDisplay;

      const quarterInfo = {
        1: 'Q1 (Jan-Mar)',
        2: 'Q2 (Apr-Jun)',
        3: 'Q3 (Jul-Sep)',
        4: 'Q4 (Oct-Dec)'
      };

      if (submission.submissionPeriod) {
        const quarter =
          submission.submissionPeriod.quarter ||
          Math.ceil((submission.submissionPeriod.month || 1) / 3);
        const year = submission.submissionPeriod.year || '';
        return `${quarterInfo[quarter] || `Q${quarter}`} ${year}`.trim();
      }

      return 'N/A';
    };

    // Collect ALL IDs that need lookup (for submissions without stored ruknId)
    // We'll try both UnitAdmin and User models to find the ruknId
    const allIdsNeedingLookup = new Set();
    submissions.forEach((submission) => {
      // Skip lookup if submission already has stored ruknId (check for truthy, non-empty value)
      const storedRuknId = submission.ruknId;
      const hasStoredRuknId = storedRuknId && 
                              typeof storedRuknId === 'string' && 
                              storedRuknId.trim() !== '';
      if (hasStoredRuknId) {
        return;
      }
      
      // Collect all IDs from this submission (submittedBy and userId)
      // Handle both populated objects and ObjectId strings
      if (submission.submittedBy) {
        const submittedById = submission.submittedBy._id?.toString() || 
                              (typeof submission.submittedBy === 'string' ? submission.submittedBy : submission.submittedBy.toString());
        if (submittedById && !submission.submittedBy.ruknId) {
          allIdsNeedingLookup.add(submittedById);
        }
      }
      if (submission.userId) {
        const userIdId = submission.userId._id?.toString() || 
                         (typeof submission.userId === 'string' ? submission.userId : submission.userId.toString());
        if (userIdId && !submission.userId.ruknId) {
          allIdsNeedingLookup.add(userIdId);
        }
      }
    });

    // Batch fetch from both UnitAdmin and User models
    let unitAdminRuknIdMap = {};
    let userRuknIdMap = {};
    
    if (allIdsNeedingLookup.size > 0) {
      const mongoose = require('mongoose');
      const allIdsArray = Array.from(allIdsNeedingLookup).map(id => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch (e) {
          return null;
        }
      }).filter(id => id !== null);

      if (allIdsArray.length > 0) {
        // Fetch from both UnitAdmin and User models in parallel for better performance
        const [unitAdmins, users] = await Promise.all([
          UnitAdmin.find({
            _id: { $in: allIdsArray }
          }).select('_id ruknId name').lean(),
          User.find({
            _id: { $in: allIdsArray }
          }).select('_id ruknId name').lean()
        ]);

        // Map UnitAdmin results
        unitAdmins.forEach((unitAdmin) => {
          unitAdminRuknIdMap[unitAdmin._id.toString()] = {
            ruknId: unitAdmin.ruknId,
            name: unitAdmin.name
          };
        });

        // Map User results
        users.forEach((user) => {
          // Only add if ruknId exists (some users might not have ruknId)
          if (user.ruknId) {
            userRuknIdMap[user._id.toString()] = {
              ruknId: user.ruknId,
              name: user.name
            };
          }
        });

        // Debug logging
        console.log(`[Submissions] Looked up ${allIdsArray.length} IDs: Found ${unitAdmins.length} UnitAdmins, ${users.length} Users`);
        if (unitAdmins.length > 0) {
          console.log(`[Submissions] UnitAdmin ruknIds found:`, unitAdmins.map(u => ({ id: u._id.toString(), ruknId: u.ruknId, name: u.name })));
        }
        if (users.length > 0) {
          console.log(`[Submissions] User ruknIds found:`, users.filter(u => u.ruknId).map(u => ({ id: u._id.toString(), ruknId: u.ruknId, name: u.name })));
        }
      }
    }

    const trimmedSubmissions = submissions.map((submission) => {
      // Get IDs for lookup
      const submittedById = submission.submittedBy?._id?.toString() || submission.submittedBy?.toString();
      const userIdId = submission.userId?._id?.toString() || submission.userId?.toString();
      
      // Check if submission belongs to the logged-in unit admin (by ID or by name match)
      const belongsToLoggedInUnitAdmin = submittedById === req.user.userId?.toString() || 
                                         userIdId === req.user.userId?.toString() ||
                                         submission.submittedBy?._id?.toString() === req.user.userId?.toString() ||
                                         submission.userId?._id?.toString() === req.user.userId?.toString();
      
      // Get ruknName from multiple possible sources
      let ruknName = submission.ruknName || 
                     submission.submittedBy?.name || 
                     submission.userId?.name ||
                     unitAdminRuknIdMap[submittedById]?.name ||
                     unitAdminRuknIdMap[userIdId]?.name ||
                     userRuknIdMap[submittedById]?.name ||
                     userRuknIdMap[userIdId]?.name ||
                     (belongsToLoggedInUnitAdmin ? unitAdmin.name : 'Unknown Member');
      
      // Check if stored ruknName or computed ruknName matches the logged-in unit admin's name (case-insensitive)
      // Use stored ruknName first, then fall back to computed ruknName
      const storedRuknName = submission.ruknName?.trim() || '';
      const computedRuknName = ruknName?.trim() || '';
      const nameMatchesLoggedInUnitAdmin = unitAdmin.name && (
        (storedRuknName && storedRuknName.toLowerCase() === unitAdmin.name.trim().toLowerCase()) ||
        (computedRuknName && computedRuknName.toLowerCase() === unitAdmin.name.trim().toLowerCase())
      );
      
      // Get ruknId from multiple possible sources (priority: stored ruknId field > submittedBy > userId > UnitAdmin lookup > User lookup > logged-in unit admin profile by ID > logged-in unit admin profile by name match)
      let ruknId = submission.ruknId || // First check the stored ruknId field
                   submission.submittedBy?.ruknId || 
                   submission.userId?.ruknId ||
                   unitAdminRuknIdMap[submittedById]?.ruknId ||
                   unitAdminRuknIdMap[userIdId]?.ruknId ||
                   userRuknIdMap[submittedById]?.ruknId ||
                   userRuknIdMap[userIdId]?.ruknId ||
                   (belongsToLoggedInUnitAdmin ? unitAdmin.ruknId : null) || // Use logged-in unit admin's ruknId if submission belongs to them by ID
                   (nameMatchesLoggedInUnitAdmin ? unitAdmin.ruknId : 'N/A'); // Use logged-in unit admin's ruknId if name matches
      
      // Debug logging for submissions with N/A ruknId
      if (ruknId === 'N/A') {
        console.log(`[Submissions] N/A ruknId for submission ${submission._id}:`, {
          storedRuknId: submission.ruknId,
          submittedById,
          userIdId,
          ruknName,
          loggedInUnitAdminName: unitAdmin.name,
          submittedByRuknId: submission.submittedBy?.ruknId,
          userIdRuknId: submission.userId?.ruknId,
          unitAdminLookupSubmittedBy: unitAdminRuknIdMap[submittedById]?.ruknId,
          unitAdminLookupUserId: unitAdminRuknIdMap[userIdId]?.ruknId,
          userLookupSubmittedBy: userRuknIdMap[submittedById]?.ruknId,
          userLookupUserId: userRuknIdMap[userIdId]?.ruknId,
          belongsToLoggedInUnitAdmin,
          nameMatchesLoggedInUnitAdmin,
          loggedInUnitAdminRuknId: unitAdmin.ruknId
        });
      }
      
      return {
        submissionId: submission._id,
        userId: userIdId || submittedById || null, // Include userId in response
        ruknId,
        ruknName,
        quarter: computeQuarter(submission),
        status: submission.status,
        createdAt: submission.createdAt,
        adminReply: submission.adminReply,
        periodDisplay: submission.periodDisplay || computeQuarter(submission),
        submissionPeriod: submission.submissionPeriod || null,
        unit: submission.submittedBy?.unit || submission.userId?.unit || submission.unit
      };
    });

    res.json({
      success: true,
      data: {
        submissions: trimmedSubmissions
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

// @desc    Get submission details
// @route   GET /api/unitadmin/submissions/:id
// @access  Private (Unit Admin)
router.get('/submissions/:id', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const unitAdmin = await UnitAdmin.findById(req.user.userId);
    if (!unitAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Unit admin not found'
      });
    }

    const { memberIds } = await getUnitAdminScope(unitAdmin);
    const submissionMatch = unitAdmin.isAbroad
      ? { _id: req.params.id, userId: { $in: memberIds } }
      : { _id: req.params.id, unit: unitAdmin.unit };

    const submission = await Submission.findOne(submissionMatch)
      .populate('submittedBy', 'ruknId name unit isAbroad')
      .populate('userId', 'ruknId name unit isAbroad')
      .populate('adminReply.repliedBy', 'username name');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found or access denied'
      });
    }

    // Domestic admins must never see abroad members' submissions (abroad admins are
    // already scoped to their own abroad unit via the memberIds match above)
    if (!unitAdmin.isAbroad) {
      const submissionUser = submission.userId || submission.submittedBy;
      if (submissionUser && submissionUser.isAbroad) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This submission belongs to an abroad member.'
        });
      }
    }

    res.json({
      success: true,
      data: {
        submission
      }
    });
  } catch (error) {
    console.error('Get submission details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update unit admin profile
// @route   PUT /api/unitadmin/profile
// @access  Private (Unit Admin)
router.put('/profile', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const allowedUpdates = ['name', 'contactNo', 'emailId'];
    const updates = {};

    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    const unitAdmin = await UnitAdmin.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: unitAdmin._id,
          role: 'unitAdmin',
          ruknId: unitAdmin.ruknId,
          name: unitAdmin.name,
          unit: unitAdmin.unit,
          district: unitAdmin.district,
          area: unitAdmin.area,
          contactNo: unitAdmin.contactNo,
          emailId: unitAdmin.emailId
        }
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile update'
    });
  }
});

// @desc    Change password
// @route   PUT /api/unitadmin/change-password
// @access  Private (Unit Admin)
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

    // Get unit admin with password
    const unitAdmin = await UnitAdmin.findById(req.user.userId).select('+password');

    // Check current password
    const isCurrentPasswordValid = await unitAdmin.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    unitAdmin.password = newPassword;
    await unitAdmin.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password change'
    });
  }
});

// @desc    Get all users (for debugging)
// @route   GET /api/unitadmin/debug/users
// @access  Private (Unit Admin)
router.get('/debug/users', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const { limit = 100 } = req.query;

    // Get all users for debugging
    const allUsers = await User.find({})
      .select('ruknId name gender unit district area contactNo emailId country role createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Get unique units
    const units = await User.distinct('unit');
    const roles = await User.distinct('role');

    res.json({
      success: true,
      data: {
        users: allUsers,
        totalCount: allUsers.length,
        units: units,
        roles: roles,
        debug: {
          unitAdminUnit: req.user.unit,
          searchQuery: { unit: req.user.unit }
        }
      }
    });
  } catch (error) {
    console.error('Debug users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Debug submissions and members
// @route   GET /api/unitadmin/debug/submissions
// @access  Private (Unit Admin)
router.get('/debug/submissions', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const unitAdmin = await UnitAdmin.findById(req.user.userId);
    if (!unitAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Unit admin not found'
      });
    }

    // Get all submissions for this unit
    const allSubmissions = await Submission.find({
      unit: unitAdmin.unit,
      ...req.quarterFilter
    }).select('userId submittedBy unit ruknName status createdAt');

    // Get all members for this unit
    const allMembers = await User.find({
      unit: unitAdmin.unit,
      role: 'rukn'
    }).select('_id ruknId name unit district area contactNo emailId country');

    // Check submission counts for each member
    const memberSubmissionCounts = await Promise.all(
      allMembers.map(async (member) => {
        const countBySubmittedBy = await Submission.countDocuments({
          submittedBy: member._id
        });
        const countByUserId = await Submission.countDocuments({
          userId: member._id
        });
        const countByUnit = await Submission.countDocuments({
          unit: unitAdmin.unit,
          $or: [
            { submittedBy: member._id },
            { userId: member._id }
          ]
        });

        return {
          member: {
            _id: member._id,
            ruknId: member.ruknId,
            name: member.name
          },
          counts: {
            bySubmittedBy: countBySubmittedBy,
            byUserId: countByUserId,
            byUnitAndUser: countByUnit
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        unitAdmin: {
          unit: unitAdmin.unit,
          name: unitAdmin.name
        },
        totalSubmissions: allSubmissions.length,
        totalMembers: allMembers.length,
        submissions: allSubmissions,
        members: allMembers,
        memberSubmissionCounts,
        debug: {
          unitAdminUnit: req.user.unit,
          searchQuery: { unit: req.user.unit }
        }
      }
    });
  } catch (error) {
    console.error('Debug submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ==================== UNIT ADMIN FORM SUBMISSION ROUTES ====================

// @desc    Submit form for unit admin
// @route   POST /api/unitadmin/submit-form
// @access  Private (Unit Admin)
router.post('/submit-form', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const unitAdmin = await UnitAdmin.findById(req.user.userId);
    if (!unitAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Unit admin not found'
      });
    }

    const { district, area, unit, ruknName, form, quarter, year, submissionPeriod, dynamicFormId, dynamicFormData } = req.body;
    const isDynamicSubmission = !!(dynamicFormId && dynamicFormData);

    // DEBUG: Log incoming request
    console.log('[UnitAdmin Submit] Incoming request body submissionPeriod:', JSON.stringify(submissionPeriod));
    console.log('[UnitAdmin Submit] isDynamicSubmission:', isDynamicSubmission);
    console.log('[UnitAdmin Submit] Top-level quarter:', quarter, 'year:', year);

    // Determine submission period with validation (block current quarter)
    // Support both top-level (quarter, year) and nested (submissionPeriod) formats
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    let finalSubmissionPeriod;

    // If submissionPeriod is provided as a complete object, use it directly (after validation)
    if (submissionPeriod && submissionPeriod.year && submissionPeriod.quarter) {
      const validation = validateSubmissionQuarter(submissionPeriod.quarter, submissionPeriod.year, currentDate);
      if (!validation.valid) {
        console.warn('UnitAdmin submission blocked (current/future quarter):', {
          userId: req.user.userId,
          quarter: submissionPeriod.quarter,
          year: submissionPeriod.year,
          reason: validation.reason
        });
        return res.status(400).json({
          success: false,
          message: validation.reason || 'Submission for the current quarter is not allowed. Please submit after the quarter ends.'
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
          console.warn('UnitAdmin submission blocked (current/future quarter):', {
            userId: req.user.userId,
            quarter: providedQuarter,
            year: providedYear,
            reason: validation.reason
          });
          return res.status(400).json({
            success: false,
            message: validation.reason || 'Submission for the current quarter is not allowed. Please submit after the quarter ends.'
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
    console.log('[UnitAdmin Submit] Final submissionPeriod to be saved:', JSON.stringify(finalSubmissionPeriod));

    // Check if Q3 is disabled
    if (isQuarterHidden(submissionQuarter)) {
      return res.status(400).json({
        success: false,
        message: 'Q3 submissions are currently disabled.'
      });
    }

    // CRITICAL: Check if unit admin has already submitted alternative submission for this quarter
    const existingAlternativeSubmission = await AlternativeSubmit.findOne({
      userId: req.user.userId,
      'submissionPeriod.year': submissionYear,
      'submissionPeriod.quarter': submissionQuarter
    });

    if (existingAlternativeSubmission) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an alternative submission for this quarter. Cannot submit regular submission for the same quarter.'
      });
    }

    // Check if unit admin has already submitted regular submission for this quarter
    const existingSubmission = await Submission.findOne({
      userId: req.user.userId,
      'submissionPeriod.year': submissionYear,
      'submissionPeriod.quarter': submissionQuarter
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted for this quarter'
      });
    }

    // Build submission data
    const submissionData = {
      userId: req.user.userId,
      submittedBy: req.user.userId,
      district: district || unitAdmin.district,
      area: area || unitAdmin.area,
      unit: unit || unitAdmin.unit,
      ruknName: ruknName || unitAdmin.name,
      ruknId: unitAdmin.ruknId,
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
      submissionData.form = form;
    }

    // Create submission for unit admin
    const submission = await Submission.create(submissionData);

    // Populate user details
    await submission.populate('userId', 'username name');
    await submission.populate('submittedBy', 'username name');

    // DEBUG: Log saved submission period
    console.log('[UnitAdmin Submit] Saved submission submissionPeriod:', JSON.stringify(submission.submissionPeriod));
    console.log('[UnitAdmin Submit] Saved submission periodDisplay:', submission.periodDisplay);

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
    console.error('Unit admin submission error:', error);
    
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

// @desc    Get unit admin's own submissions
// @route   GET /api/unitadmin/my-submissions
// @access  Private (Unit Admin)
router.get('/my-submissions', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const { page = 1, limit = 10, year, month } = req.query;

    // Build query for unit admin's own submissions
    const query = { 
      userId: req.user.userId,
      ...req.quarterFilter
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

    // Auto-migrate any static submissions to dynamic format
    for (const submission of submissions) {
      if (!submission.dynamicFormId && submission.form) {
        await migrateStaticToDynamic(submission);
      }
    }

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
    console.error('Get unit admin submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get specific unit admin submission
// @route   GET /api/unitadmin/my-submissions/:id
// @access  Private (Unit Admin)
router.get('/my-submissions/:id', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const submission = await Submission.findOne({
      _id: req.params.id,
      userId: req.user.userId
    })
      .populate('userId', 'username name district area unit')
      .populate('submittedBy', 'username name district area unit')
      .populate('reviewedBy', 'username name');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found or access denied'
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
    console.error('Get unit admin submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update unit admin submission
// @route   PUT /api/unitadmin/my-submissions/:id
// @access  Private (Unit Admin)
router.put('/my-submissions/:id', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const { district, area, unit, ruknName, form, dynamicFormId, dynamicFormData } = req.body;
    const isDynamicSubmission = !!(dynamicFormId && dynamicFormData);

    const submission = await Submission.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found or access denied'
      });
    }

    // Update submission
    submission.district = district || submission.district;
    submission.area = area || submission.area;
    submission.unit = unit || submission.unit;
    submission.ruknName = ruknName || submission.ruknName;

    if (isDynamicSubmission) {
      submission.dynamicFormId = dynamicFormId;
      submission.dynamicFormData = dynamicFormData;
    } else {
      submission.form = form || submission.form;
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
    console.error('Update unit admin submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during update'
    });
  }
});

// @desc    Delete unit admin submission
// @route   DELETE /api/unitadmin/my-submissions/:id
// @access  Private (Unit Admin)
router.delete('/my-submissions/:id', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const submission = await Submission.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found or access denied'
      });
    }

    await Submission.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    console.error('Delete unit admin submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get unit admin submission statistics
// @route   GET /api/unitadmin/my-stats
// @access  Private (Unit Admin)
router.get('/my-stats', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const currentYear = new Date().getFullYear();
    
    // Get current year submissions
    const currentYearSubmissions = await Submission.find({
      userId: req.user.userId,
      'submissionPeriod.year': currentYear,
      ...req.quarterFilter
    }).sort({ 'submissionPeriod.quarter': 1 });

    // Calculate statistics
    const totalSubmissions = currentYearSubmissions.length;
    const completedQuarters = currentYearSubmissions.map(s => s.submissionPeriod.quarter);
    const availableQuarters = isQuarterHidden(3) ? [1, 2, 4] : [1, 2, 3, 4];
    const pendingQuarters = availableQuarters.filter(quarter => !completedQuarters.includes(quarter));

    // Get average scores for various metrics
    const avgHadithCount = currentYearSubmissions.length > 0 
      ? currentYearSubmissions.reduce((sum, s) => sum + s.form.hadithCount, 0) / currentYearSubmissions.length 
      : 0;

    const avgNewMembers = currentYearSubmissions.length > 0
      ? currentYearSubmissions.reduce((sum, s) => sum + s.form.newMembers, 0) / currentYearSubmissions.length
      : 0;

    const avgScoreCount = currentYearSubmissions.length > 0
      ? currentYearSubmissions.reduce((sum, s) => sum + s.form.scoreCount, 0) / currentYearSubmissions.length
      : 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalSubmissions,
          completedQuarters,
          pendingQuarters,
          completionRate: Math.round((totalSubmissions / availableQuarters.length) * 100),
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
          hadithCount: s.form.hadithCount,
          newMembers: s.form.newMembers,
          scoreCount: s.form.scoreCount
        }))
      }
    });
  } catch (error) {
    console.error('Get unit admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get unit admin replies (structured replies from admin)
// @route   GET /api/unitadmin/replies
// @access  Private (Unit Admin)
router.get('/replies', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const unitAdmin = await UnitAdmin.findById(req.user.userId);
    if (!unitAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Unit admin not found'
      });
    }

    // Get all replies for this unit
    const replies = await UnitAdminReply.find({ 
      unit: unitAdmin.unit,
      ...req.quarterFilter
    })
      .populate('repliedBy', 'username name')
      .sort({ repliedAt: -1 });

    res.json({
      success: true,
      data: {
        replies: replies.map(reply => ({
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
        totalCount: replies.length
      }
    });
  } catch (error) {
    console.error('Get unit admin replies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get alternative submissions from members under this unit
// @route   GET /api/unitadmin/alternative-submissions
// @access  Private (Unit Admin)
router.get('/alternative-submissions', protect, async (req, res) => {
  try {
    // Check if user is unit admin
    if (req.user.role !== 'unitAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unit admin access required.'
      });
    }

    const unitAdmin = await UnitAdmin.findById(req.user.userId);
    if (!unitAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Unit admin not found'
      });
    }

    const AlternativeSubmit = require('../../models/ihthisabi/alternativeSubmit');
    const User = require('../../models/ihthisabi/User');

    // Get all users in this unit (scoped correctly for abroad vs domestic admins)
    const { memberQuery } = await getUnitAdminScope(unitAdmin);
    const unitMembers = await User.find(memberQuery).select('_id');
    const memberIds = unitMembers.map(m => m._id);

    // Get alternative submissions from these members (excluding abroad)
    const alternativeSubmissions = await AlternativeSubmit.find({
      userId: { $in: memberIds },
      ...req.quarterFilter
    })
      .populate('userId', 'ruknId name district area unit')
      .populate('adminReply.repliedBy', 'username name')
      .sort({ createdAt: -1 })
      .select('type district area unit ruknName reason submissionPeriod periodDisplay adminReply createdAt updatedAt');

    res.json({
      success: true,
      data: {
        alternativeSubmissions,
        unit: unitAdmin.unit,
        totalCount: alternativeSubmissions.length
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

module.exports = router;
