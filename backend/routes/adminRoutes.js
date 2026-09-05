const express = require('express');
const jwt = require('jsonwebtoken');
const adminAuth = require('../middlewares/adminAuth');
const Form = require('../models/form');
// Include level-specific monthly models
const DistrictSurvey = require('../models/districtSurvey');
const AreaSurvey = require('../models/areaSurvey');
const UnitSurvey = require('../models/unitSurvey');
const District = require('../models/district');
const AreaMaster = require('../models/area');
const UnitMaster = require('../models/unit');
const Report = require('../models/report');
const ReportSubmission = require('../models/reportSubmission');

const router = express.Router();
const OpenAI = require('openai');

// Initialize OpenAI client if API key exists
let openaiClient = null;
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Admin Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if email matches admin email from env
    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password matches admin password from env (plain text comparison)
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        email: process.env.ADMIN_EMAIL, 
        isAdmin: true 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      admin: {
        email: process.env.ADMIN_EMAIL
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin profile route
router.get('/profile', adminAuth, async (req, res) => {
  try {
    const adminPayload = req.admin || {};
    res.json({
      message: 'Admin profile fetched successfully',
      admin: {
        email: adminPayload.email || process.env.ADMIN_EMAIL || '',
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin profile fetch error:', error);
    res.status(500).json({ message: 'Server error fetching admin profile' });
  }
});


// Get all forms (Admin can see all forms from all users)
router.get('/forms', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, district, submittedBy } = req.query;
    
    // Build filter object
    const filter = {};
    if (district) filter.district = { $regex: district, $options: 'i' };
    if (submittedBy) filter.submittedBy = submittedBy;
    
    const forms = await Form.find(filter)
      .sort({ submittedAt: -1 }) // Most recent first
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await Form.countDocuments(filter);
    
    res.json({
      message: 'Forms retrieved successfully',
      forms: forms,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalForms: total,
      formsInCurrentPage: forms.length
    });

  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({ message: 'Server error while retrieving forms' });
  }
});

// Get a specific form by ID (Admin can view any form)
router.get('/forms/:id', adminAuth, async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    res.json({
      message: 'Form retrieved successfully',
      form: form
    });

  } catch (error) {
    console.error('Get form error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid form ID' });
    }
    
    res.status(500).json({ message: 'Server error while retrieving form' });
  }
});


// Delete a specific form by ID (Admin can delete any form)
router.delete('/forms/:id', adminAuth, async (req, res) => {
  try {
    const deletedForm = await Form.findByIdAndDelete(req.params.id);

    if (!deletedForm) {
      return res.status(404).json({ message: 'Form not found' });
    }

    res.json({
      message: 'Form deleted successfully',
      deletedForm: deletedForm
    });

  } catch (error) {
    console.error('Delete form error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid form ID' });
    }
    
    res.status(500).json({ message: 'Server error while deleting form' });
  }
});




// ===== MONTHLY SURVEY ADMIN ROUTES =====


// Get all monthly surveys across levels (district, area, unit)
router.get('/monthly-surveys/all-levels', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, district, submittedBy, month, level } = req.query;

    // Build base filters
    const buildFilter = () => {
      const filter = {};
      if (district) filter.district = { $regex: district, $options: 'i' };
      if (month) filter.month = month;
      return filter;
    };

    const baseFilter = buildFilter();

    // Fetch per-level surveys based on optional level filter
    const fetchDistrict = async () => {
      if (level && level !== 'district') return [];
      const f = { ...baseFilter };
      if (submittedBy) f.submittedBy = submittedBy;
      return DistrictSurvey.find(f).sort({ submittedAt: -1 });
    };
    const fetchArea = async () => {
      if (level && level !== 'area') return [];
      const f = { ...baseFilter };
      if (submittedBy) f.submittedBy = submittedBy;
      return AreaSurvey.find(f).sort({ submittedAt: -1 });
    };
    const fetchUnit = async () => {
      if (level && level !== 'unit') return [];
      const f = { ...baseFilter };
      if (submittedBy) f.submittedBy = submittedBy;
      return UnitSurvey.find(f).sort({ submittedAt: -1 });
    };

    const [districtSurveys, areaSurveys, unitSurveys] = await Promise.all([
      fetchDistrict(),
      fetchArea(),
      fetchUnit()
    ]);

    // Merge and enrich
    const allSurveys = [
      ...districtSurveys.map(s => ({ ...s.toObject(), submissionLevel: 'district', submittedByName: s.district })),
      ...areaSurveys.map(s => ({ 
        ...s.toObject(), 
        submissionLevel: 'area', 
        submittedByName: s.area || `Area Admin (${s.submittedBy})`, // Use area name if available, fallback to descriptive text
        areaName: s.area 
      })),
      ...unitSurveys.map(s => ({ ...s.toObject(), submissionLevel: 'unit', submittedByName: s.component, unitName: s.component, areaName: s.area }))
    ].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    const totalSurveys = allSurveys.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginated = allSurveys.slice(startIndex, endIndex);

    const stats = {
      district: districtSurveys.length,
      area: areaSurveys.length,
      unit: unitSurveys.length,
      total: totalSurveys
    };

    res.json({
      message: 'All-level monthly surveys retrieved successfully',
      surveys: paginated,
      totalPages: Math.ceil(totalSurveys / limit),
      currentPage: parseInt(page),
      totalSurveys,
      stats
    });
  } catch (error) {
    console.error('Get all-level monthly surveys error:', error);
    res.status(500).json({ message: 'Server error while retrieving all-level monthly surveys' });
  }
});



// Get one monthly survey by level + id. Lets the detail pages survive a page
// refresh / direct link instead of depending on router state from the list.
router.get('/monthly-surveys/:level/:id', adminAuth, async (req, res) => {
  try {
    const { level, id } = req.params;
    const Model = { district: DistrictSurvey, area: AreaSurvey, unit: UnitSurvey }[level];
    if (!Model) {
      return res.status(400).json({ message: 'Invalid survey level' });
    }
    const doc = await Model.findById(id);
    if (!doc) {
      return res.status(404).json({ message: 'Monthly survey not found' });
    }
    const s = doc.toObject();
    const survey =
      level === 'district' ? { ...s, submissionLevel: 'district', submittedByName: s.district }
      : level === 'area' ? { ...s, submissionLevel: 'area', submittedByName: s.area || `Area Admin (${s.submittedBy})`, areaName: s.area }
      : { ...s, submissionLevel: 'unit', submittedByName: s.component, unitName: s.component, areaName: s.area };
    res.json({ message: 'Monthly survey retrieved successfully', survey });
  } catch (error) {
    console.error('Get monthly survey by id error:', error);
    res.status(500).json({ message: 'Server error while retrieving monthly survey' });
  }
});

// Delete a specific monthly survey by ID (Admin can delete any monthly survey)
router.delete('/monthly-surveys/:id', adminAuth, async (req, res) => {
  try {
    const surveyId = req.params.id;
    let deletedSurvey = null;
    let surveyType = '';

    // Try to find and delete from each collection
    // First try DistrictSurvey
    deletedSurvey = await DistrictSurvey.findByIdAndDelete(surveyId);
    if (deletedSurvey) {
      surveyType = 'district';
    } else {
      // Try AreaSurvey
      deletedSurvey = await AreaSurvey.findByIdAndDelete(surveyId);
      if (deletedSurvey) {
        surveyType = 'area';
      } else {
        // Try UnitSurvey
        deletedSurvey = await UnitSurvey.findByIdAndDelete(surveyId);
        if (deletedSurvey) {
          surveyType = 'unit';
        }
      }
    }

    if (!deletedSurvey) {
      return res.status(404).json({ message: 'Monthly survey not found' });
    }

    res.json({
      message: `${surveyType} survey deleted successfully`,
      deletedSurvey: deletedSurvey,
      surveyType: surveyType
    });

  } catch (error) {
    console.error('Delete monthly survey error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid survey ID' });
    }
    
    res.status(500).json({ message: 'Server error while deleting monthly survey' });
  }
});


// Alias: Get main admin statistics at /api/admin/stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const allYearlySurveys = await Form.find();
    
    // Query all monthly survey types
    const [districtMonthlySurveys, areaMonthlySurveys, unitMonthlySurveys] = await Promise.all([
      DistrictSurvey.find({
        submittedAt: { 
          $gte: new Date(currentYear, 0, 1),
          $lte: new Date(currentYear, 11, 31)
        }
      }),
      AreaSurvey.find({
        submittedAt: { 
          $gte: new Date(currentYear, 0, 1),
          $lte: new Date(currentYear, 11, 31)
        }
      }),
      UnitSurvey.find({
        submittedAt: { 
          $gte: new Date(currentYear, 0, 1),
          $lte: new Date(currentYear, 11, 31)
        }
      })
    ]);
    
    // Combine all monthly surveys
    const allMonthlySurveys = [
      ...districtMonthlySurveys,
      ...areaMonthlySurveys,
      ...unitMonthlySurveys
    ];

    const districtStats = {};

    allYearlySurveys.forEach(survey => {
      if (!districtStats[survey.district]) {
        districtStats[survey.district] = {
          district: survey.district,
          yearly: null,
          monthly: []
        };
      }
      districtStats[survey.district].yearly = {
        totalPopulation: survey.partA?.totalPopulation || 0,
        submittedBy: survey.submittedBy,
        submittedAt: survey.submittedAt
      };
    });

    allMonthlySurveys.forEach(survey => {
      if (!districtStats[survey.district]) {
        districtStats[survey.district] = {
          district: survey.district,
          yearly: null,
          monthly: []
        };
      }
      districtStats[survey.district].monthly.push({
        month: survey.month,
        submittedBy: survey.submittedBy,
        submittedAt: survey.submittedAt
      });
    });

    const overallStats = {
      totalDistricts: Object.keys(districtStats).length,
      totalYearlySurveys: allYearlySurveys.length,
      totalMonthlySurveys: allMonthlySurveys.length,
      totalPopulation: allYearlySurveys.reduce((sum, s) => sum + (s.partA?.totalPopulation || 0), 0),
      monthlySubmissionsByMonth: allMonthlySurveys.reduce((acc, survey) => {
        acc[survey.month] = (acc[survey.month] || 0) + 1;
        return acc;
      }, {}),
      districtComparison: Object.values(districtStats).map(district => ({
        district: district.district,
        yearlySubmitted: !!district.yearly,
        monthlyCount: district.monthly.length
      }))
    };

    // Generate natural language summary via OpenAI (optional)
    let summary = null;
    try {
      if (openaiClient) {
        const prompt = buildMainSummaryPrompt({ overall: overallStats, districts: districtStats });
        const completion = await openaiClient.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.5,
          messages: [
            { role: 'system', content: 'You are an assistant that writes clear, detailed, plain-language summaries for non-technical readers. Write 5-7 sentences. Include: (1) brief national/overall snapshot, (2) top and bottom districts by capacity or submissions, (3) monthly trend direction, (4) any stability or outliers, (5) one concrete next step for coordination. Avoid jargon and long lists of numbers; prefer qualitative comparisons.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 420
        });
        summary = completion.choices?.[0]?.message?.content?.trim() || null;
      }
    } catch (e) {
      console.error('OpenAI summary (admin alias) error:', e.message);
    }
    if (!summary) {
      summary = buildMainFallbackSummary({ overall: overallStats });
    }

    res.json({
      message: 'Main admin statistics retrieved successfully',
      stats: {
        overall: overallStats,
        districts: districtStats
      },
      summary
    });
  } catch (error) {
    console.error('Get main stats error:', error);
    res.status(500).json({ message: 'Server error while retrieving main statistics' });
  }
});



// Admin survey update routes (for editing surveys from admin dashboard)

// Update District Survey (Admin)
router.put('/district-surveys/:id', adminAuth, async (req, res) => {
  try {
    const surveyData = req.body;
    const admin = req.admin;
    
    const updatedSurvey = await DistrictSurvey.findByIdAndUpdate(
      req.params.id,
      {
        ...surveyData,
        updatedAt: new Date(),
        updatedBy: admin.email
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedSurvey) {
      return res.status(404).json({
        success: false,
        message: 'District survey not found'
      });
    }
    
    res.json({
      success: true,
      message: 'District survey updated successfully',
      data: updatedSurvey
    });
  } catch (error) {
    console.error('Admin district survey update error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during district survey update'
    });
  }
});

// Update Area Survey (Admin)
router.put('/area-surveys/:id', adminAuth, async (req, res) => {
  try {
    const surveyData = req.body;
    const admin = req.admin;
    
    const updatedSurvey = await AreaSurvey.findByIdAndUpdate(
      req.params.id,
      {
        ...surveyData,
        updatedAt: new Date(),
        updatedBy: admin.email
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedSurvey) {
      return res.status(404).json({
        success: false,
        message: 'Area survey not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Area survey updated successfully',
      data: updatedSurvey
    });
  } catch (error) {
    console.error('Admin area survey update error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during area survey update'
    });
  }
});

// Update Unit Survey (Admin)
router.put('/unit-surveys/:id', adminAuth, async (req, res) => {
  try {
    const surveyData = req.body;
    const admin = req.admin;
    
    const updatedSurvey = await UnitSurvey.findByIdAndUpdate(
      req.params.id,
      {
        ...surveyData,
        updatedAt: new Date(),
        updatedBy: admin.email
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedSurvey) {
      return res.status(404).json({
        success: false,
        message: 'Unit survey not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Unit survey updated successfully',
      survey: updatedSurvey
    });
  } catch (error) {
    console.error('Admin unit survey update error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during unit survey update'
    });
  }
});

// ─── Expansion Portal Dashboard Overview ─────────────────────────────────────
// GET /api/admin/dashboard/overview
router.get('/dashboard/overview', adminAuth, async (req, res) => {
  try {
    const [
      districtCount,
      areaCount,
      unitCount,
      activeReports,
      totalSubmissions,
      submittedCount,
      pendingCount
    ] = await Promise.all([
      District.countDocuments({ isActive: true }),
      AreaMaster.countDocuments({ isActive: true }),
      UnitMaster.countDocuments({ isActive: true }),
      Report.find({ isActive: true }).select('reportFor type').lean(),
      ReportSubmission.countDocuments({}),
      ReportSubmission.countDocuments({ status: 'submitted' }),
      ReportSubmission.countDocuments({ status: 'pending' })
    ]);

    const activeReportCount = activeReports.length;
    const districtReports = activeReports.filter(r => r.reportFor === 'district').length;
    const areaReports = activeReports.filter(r => r.reportFor === 'area').length;
    const unitReports = activeReports.filter(r => r.reportFor === 'unit').length;

    const yearlyReports = activeReports.filter(r => r.type === 'yearly').length;
    const monthlyReports = activeReports.filter(r => r.type === 'monthly').length;
    const specialReports = activeReports.filter(r => r.type === 'special').length;

    res.json({
      success: true,
      data: {
        locations: {
          districts: districtCount,
          areas: areaCount,
          units: unitCount,
          total: districtCount + areaCount + unitCount
        },
        reports: {
          total: activeReportCount,
          byLevel: {
            district: districtReports,
            area: areaReports,
            unit: unitReports
          },
          byType: {
            yearly: yearlyReports,
            monthly: monthlyReports,
            special: specialReports
          }
        },
        submissions: {
          total: totalSubmissions,
          submitted: submittedCount,
          pending: pendingCount
        }
      }
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard data' });
  }
});

module.exports = router;

// ===== Helper: Prompt builder =====
function buildMainSummaryPrompt(stats) {
  const overall = stats.overall || {};
  const comp = overall.districtComparison || [];
  const topByMonthly = [...comp].sort((a,b) => (b.monthlyCount||0) - (a.monthlyCount||0))[0]?.district || 'N/A';
  const bottomByMonthly = [...comp].sort((a,b) => (a.monthlyCount||0) - (b.monthlyCount||0))[0]?.district || 'N/A';
  const monthlyGrowthHint = (overall.totalMonthlySurveys || 0) >= (overall.totalYearlySurveys || 0) ? 'Monthly activity looks strong compared to yearly totals.' : 'Monthly activity trails yearly totals.';

  return [
    `Overall districts: ${overall.totalDistricts || 0}. Yearly surveys: ${overall.totalYearlySurveys || 0}. Monthly surveys: ${overall.totalMonthlySurveys || 0}.`,
    `Most monthly submissions: ${topByMonthly}.`,
    `Lower submissions observed in: ${bottomByMonthly} (monthly submissions).`,
    `${monthlyGrowthHint} Write 5-7 simple sentences highlighting these insights in plain language and end with one short recommendation for coordination across districts.`
  ].join(' ');
}

function buildMainFallbackSummary(stats) {
  const overall = stats.overall || {};
  const totalYearly = overall.totalYearlySurveys || 0;
  const totalMonthly = overall.totalMonthlySurveys || 0;
  const monthlyVsYearly = totalMonthly > totalYearly ? 'stronger than' : totalMonthly < totalYearly ? 'behind' : 'on par with';
  const totalDistricts = overall.totalDistricts || 0;
  return `Across ${totalDistricts} districts, monthly survey activity is ${monthlyVsYearly} yearly totals, indicating ${totalMonthly >= totalYearly ? 'healthy engagement' : 'room to improve monthly cadence'}. Participation overall appears ${totalMonthly >= totalYearly ? 'steady to growing' : 'steady with gaps'}. Focus on sharing practices from stronger districts and supporting those with fewer submissions.`;
}
