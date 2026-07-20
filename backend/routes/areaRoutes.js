const express = require('express');
const router = express.Router();
const AreaSurvey = require('../models/areaSurvey');
const UnitSurvey = require('../models/unitSurvey');
const userAuth = require('../middlewares/userAuth');
const axios = require('axios');
const OpenAI = require('openai');

let openaiClient = null;
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Create area survey
router.post('/surveys', userAuth, async (req, res) => {
  try {
    const surveyData = {
      ...req.body,
      submittedBy: req.user.areaId,
      submittedAt: new Date()
    };
    console.log(surveyData);
    const survey = new AreaSurvey(surveyData);
    await survey.save();
    console.log('Area survey created successfully');
    res.status(201).json({
      success: true,
      message: 'Area survey created successfully',
      data: survey
    });
  } catch (error) {
    console.error('Error creating area survey:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating area survey',
      error: error.message
    });
  }
});

// Get area surveys
router.get('/surveys', userAuth, async (req, res) => {
  try {
    const { areaId, districtId, month } = req.query;
    const user = req.user;
    console.log('user:', user);
    console.log('Area surveys request:', { areaId, districtId, user: { id: user.id, role: user.role, userType: user.userType, district: user.district, districtId: user.districtId, districtName: user.districtName, areaId: user.areaId, area: user.area, areaName: user.areaName } });

    let query = {};
    
    // Role-based filtering
    if (user.role === 'area') {
      // Area admin - show only their area's surveys
      if (user.areaName) {
        query.area = user.areaName;
        console.log('Area admin filtering by areaName:', user.areaName);
      }
      // Also filter by district if available (JWT token uses 'district', not 'districtName')
      if (user.district) {
        query.district = user.district;
        console.log('Area admin also filtering by district:', user.district);
      }
    } else if (user.role === 'district') {
      // District admin - show all area surveys in their district
      if (user.district) {
        query.district = user.district;
        console.log('District admin filtering by district:', user.district);
      }
    } else if (user.userType === 'user') {
      // Regular user - show surveys for their district
      if (user.district) {
        query.district = user.district;
        console.log('Regular user filtering by district:', user.district);
      }
    }

    // Override with specific filters if provided in query params
    // Only apply if not already set by user's role
    if (districtId && !query.district) {
      query.district = districtId;
      console.log('Filtering surveys by requested district:', districtId);
    }

    // Don't override area if it's already set by the user's areaName
    // The 'area' field in database stores area NAME, not area ID
    if (areaId && !query.area) {
      // If areaId is provided, we need to convert it to areaName
      // For now, just skip this since area users already have their area set
      console.log('Area ID provided but area already filtered by user role');
    }

    // Add month filter if provided
    if (month) {
      query.month = month;
      console.log('Filtering surveys by month:', month);
    }

    console.log('Final query:', query);
    
    // Debug: Let's see what area surveys exist in the database
    const allAreaSurveys = await AreaSurvey.find({}).limit(5);
    console.log('Sample area surveys in database:', allAreaSurveys.map(s => ({ district: s.district, area: s.area, month: s.month })));
    
    const surveys = await AreaSurvey.find(query)
      .sort({ submittedAt: -1 });
      
    console.log('Found surveys:', surveys.length);

    res.json({
      success: true,
      data: surveys
    });
  } catch (error) {
    console.error('Error fetching area surveys:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching area surveys',
      error: error.message
    });
  }
});

// Get single area survey
router.get('/surveys/:id', userAuth, async (req, res) => {
  try {
    const survey = await AreaSurvey.findById(req.params.id);

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Area survey not found'
      });
    }

    res.json({
      success: true,
      data: survey
    });
  } catch (error) {
    console.error('Error fetching area survey:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching area survey',
      error: error.message
    });
  }
});

// Update area survey
router.put('/surveys/:id', userAuth, async (req, res) => {
  try {
    console.log('Update area survey request:', {
      surveyId: req.params.id,
      user: {
        id: req.user.id,
        areaId: req.user.areaId,
        role: req.user.role
      },
      body: req.body
    });

    const survey = await AreaSurvey.findById(req.params.id);

    if (!survey) {
      console.log('Survey not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Area survey not found'
      });
    }

    console.log('Found survey:', {
      id: survey._id,
      submittedBy: survey.submittedBy,
      userAreaId: req.user.areaId,
      userRole: req.user.role
    });

    // Check if user can edit this survey
    // For area surveys, we check if the user's areaId matches the submittedBy field
    // or if the user is an admin
    if (survey.submittedBy !== req.user.areaId && req.user.role !== 'admin') {
      console.log('Authorization failed:', {
        surveySubmittedBy: survey.submittedBy,
        userAreaId: req.user.areaId,
        userRole: req.user.role
      });
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this survey'
      });
    }

    const updatedSurvey = await AreaSurvey.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    console.log('Survey updated successfully:', updatedSurvey._id);

    res.json({
      success: true,
      message: 'Area survey updated successfully',
      data: updatedSurvey
    });
  } catch (error) {
    console.error('Error updating area survey:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating area survey',
      error: error.message
    });
  }
});

// Delete area survey
router.delete('/surveys/:id', userAuth, async (req, res) => {
  try {
    const survey = await AreaSurvey.findById(req.params.id);

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Area survey not found'
      });
    }

    // Check if user can delete this survey
    // For area surveys, we check if the user's areaId matches the submittedBy field
    // or if the user is an admin
    if (survey.submittedBy !== req.user.areaId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this survey'
      });
    }

    await AreaSurvey.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Area survey deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting area survey:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting area survey',
      error: error.message
    });
  }
});

// Get area survey statistics
router.get('/statistics', userAuth, async (req, res) => {
  try {
    const { areaId, districtId } = req.query;
    const user = req.user;

    let query = {};
    
    // If user is area admin, filter by their areaName
    if (user.role === 'area' && user.areaName) {
      query.area = user.areaName;
    }
    
    // If user is district admin, filter by their district
    if (user.role === 'district' && user.district) {
      query.district = user.district;
    }

    // If specific area or district is requested
    if (areaId) {
      query.area = user.areaName || user.area || areaId;
    }
    if (districtId) {
      query.district = user.district || districtId;
    }

    const totalSurveys = await AreaSurvey.countDocuments(query);
    
    // Get surveys for current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const surveysThisMonth = await AreaSurvey.countDocuments({
      ...query,
      reportPeriod: {
        $regex: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
      }
    });

    // Get unique areas that have submitted surveys
    const activeAreas = await AreaSurvey.distinct('area', query);

    res.json({
      success: true,
      data: {
        totalSurveys,
        surveysThisMonth,
        activeAreas: activeAreas.length
      }
    });
  } catch (error) {
    console.error('Error fetching area statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching area statistics',
      error: error.message
    });
  }
});

// Get area statistics with AI summary
router.get('/statistics/ai-summary', userAuth, async (req, res) => {
  try {
    const { areaId } = req.query;
    const user = req.user;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    let query = {};
    
    // If user is area admin, filter by their areaName
    if (user.role === 'area' && user.areaName) {
      query.area = user.areaName;
    }
    
    // If user is district admin, filter by their district
    if (user.role === 'district' && user.district) {
      query.district = user.district;
    }

    // If specific area is requested
    if (areaId) {
      query.area = user.areaName || user.area || areaId;
    }

    // Get area surveys
    console.log('Area surveys query:', query);
    const areaSurveys = await AreaSurvey.find(query).sort({ submittedAt: -1 });
    console.log('Found area surveys:', areaSurveys.length);
    
    // Get unit surveys for this area directly from local database (no external dependency)
    let unitSurveys = [];
    try {
      const unitSurveysQuery = { submissionLevel: 'unit' };
      // Prefer precise matches if available
      if (areaId) {
        unitSurveysQuery.$or = [
          { areaId: areaId },
          { area: query.area }
        ];
      } else if (query.area) {
        unitSurveysQuery.area = query.area;
      }
      if (query.district) {
        unitSurveysQuery.district = query.district;
      }

      console.log('Unit surveys query:', unitSurveysQuery);
      unitSurveys = await UnitSurvey.find(unitSurveysQuery).sort({ submittedAt: -1 });
      console.log('Found unit surveys in database:', unitSurveys.length);
    } catch (error) {
      console.error('Error fetching unit surveys:', error);
    }

    // Calculate statistics
    const currentMonthSurveys = areaSurveys.filter(s => {
      const surveyDate = new Date(s.submittedAt);
      return surveyDate.getMonth() === currentMonth && 
             surveyDate.getFullYear() === currentYear;
    });

    const currentMonthUnitSurveys = unitSurveys.filter(s => {
      const surveyDate = new Date(s.submittedAt);
      return surveyDate.getMonth() === currentMonth && 
             surveyDate.getFullYear() === currentYear;
    });

    const totalWorkers = unitSurveys.reduce((sum, survey) => {
      return sum + (survey.workers?.rukkun || 0) + 
             (survey.workers?.karkun || 0) + 
             (survey.workers?.activeAssociate || 0);
    }, 0);

    const totalNewMembers = unitSurveys.reduce((sum, survey) => {
      return sum + (survey.partB?.newJIHMembers?.male || 0) + 
             (survey.partB?.newJIHMembers?.female || 0);
    }, 0);

    const activeUnits = new Set(unitSurveys.map(s => s.unitId || s.component)).size;

    const stats = {
      areaName: user.areaName || areaId,
      totalAreaSurveys: areaSurveys.length,
      totalUnitSurveys: unitSurveys.length,
      currentMonthAreaSurveys: currentMonthSurveys.length,
      currentMonthUnitSurveys: currentMonthUnitSurveys.length,
      totalWorkers: totalWorkers,
      totalNewMembers: totalNewMembers,
      activeUnits: activeUnits,
      totalUnits: unitSurveys.length > 0 ? new Set(unitSurveys.map(s => s.unitId || s.component)).size : 0
    };

    console.log('Final stats:', stats);

    // Generate AI summary
    let summary = null;
    try {
      if (openaiClient) {
        const prompt = `Area: ${stats.areaName}
Area Surveys: ${stats.totalAreaSurveys} total, ${stats.currentMonthAreaSurveys} this month
Unit Surveys: ${stats.totalUnitSurveys} total, ${stats.currentMonthUnitSurveys} this month
Total Workers: ${stats.totalWorkers}
New Members: ${stats.totalNewMembers}
Active Units: ${stats.activeUnits} out of ${stats.totalUnits} total units

Please provide a clear, easy-to-understand summary of this area's performance in 4-5 sentences. Focus on key achievements, current month activity, and areas for improvement.`;

        const completion = await openaiClient.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.5,
          messages: [
            { role: 'system', content: 'You are an assistant that writes clear, easy-to-understand summaries of area statistics for area administrators. Write 4-5 sentences in simple language. Include: (1) overall performance snapshot, (2) current month activity, (3) key achievements or concerns, (4) one actionable recommendation. Use positive, encouraging tone while being honest about areas needing improvement.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 300
        });
        summary = completion.choices?.[0]?.message?.content?.trim() || null;
      }
    } catch (e) {
      console.error('OpenAI summary (area) error:', e.message);
    }

    if (!summary) {
      summary = `${stats.areaName} has submitted ${stats.totalAreaSurveys} area surveys and ${stats.totalUnitSurveys} unit surveys. This month, ${stats.currentMonthAreaSurveys} area surveys and ${stats.currentMonthUnitSurveys} unit surveys were submitted. The area has ${stats.totalWorkers} total workers and ${stats.totalNewMembers} new members. ${stats.activeUnits} out of ${stats.totalUnits} units are actively submitting surveys.`;
    }

    res.json({
      success: true,
      stats,
      summary
    });

  } catch (error) {
    console.error('Error fetching area statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching area statistics',
      error: error.message
    });
  }
});

module.exports = router;
