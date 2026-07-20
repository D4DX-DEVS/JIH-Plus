const express = require('express');
const userAuth = require('../middlewares/userAuth');
const UnitSurvey = require('../models/unitSurvey');

const router = express.Router();

// ===== UNIT SURVEY ROUTES =====

// Create new unit survey (POST)
router.post('/unit-survey', userAuth, async (req, res) => {
  try {
    const surveyData = req.body;
    const user = req.user;
    console.log("surveyData", surveyData);
    // Debug logging
    console.log('Unit survey submission - User data:', {
      unitId: user.unitId,
      district: user.district,
      districtName: user.districtName,
      districtId: user.districtId,
      area: user.area,
      areaName: user.areaName,
      areaId: user.areaId
    });
    console.log('Unit survey submission - Survey data:', {
      district: surveyData.district,
      area: surveyData.area,
      component: surveyData.component
    });
    
    // Debug counts data
    console.log('Unit survey submission - PartA authorityPersonsCounts:', surveyData.partA?.authorityPersonsCounts);
    console.log('Unit survey submission - PartB memberCategoriesCounts:', surveyData.partB?.memberCategoriesCounts);
    
    // Determine submission level and hierarchy
    // Prioritize district and area from form data, fallback to user data
    let hierarchyData = {
      submittedBy: user.unitId || user.district,
      district: surveyData.district || user.districtName || user.district,
      area: surveyData.area || user.areaName || user.area,
      component: surveyData.component || user.unitName || user.unitId,
      districtId: user.districtId || user.district,
      areaId: user.areaId,
      unitId: user.unitId,
      submissionLevel: 'unit'
    };
    
    console.log('Unit survey submission - Final hierarchy data:', hierarchyData);
    
    // Ensure required fields are never undefined - add final fallback
    if (!hierarchyData.district) {
      console.error('District is still undefined after all fallbacks. User data:', user);
      return res.status(400).json({
        message: 'District information is required but not available. Please contact support.',
        error: 'MISSING_DISTRICT_INFO'
      });
    }
    
    if (!hierarchyData.area) {
      console.error('Area is still undefined after all fallbacks. User data:', user);
      return res.status(400).json({
        message: 'Area information is required but not available. Please contact support.',
        error: 'MISSING_AREA_INFO'
      });
    }
    
    const newSurvey = new UnitSurvey({
      ...surveyData,
      ...hierarchyData,
      submittedAt: new Date()
    });

    const savedSurvey = await newSurvey.save();
    
    // Debug: Log what was actually saved
    console.log('Unit survey saved - PartA authorityPersonsCounts:', savedSurvey.partA?.authorityPersonsCounts);
    console.log('Unit survey saved - PartB memberCategoriesCounts:', savedSurvey.partB?.memberCategoriesCounts);
    
    res.status(201).json({
      message: 'Unit survey submitted successfully',
      survey: savedSurvey
    });

  } catch (error) {
    console.error('Unit survey submission error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ message: 'Server error during unit survey submission' });
  }
});

// Get all unit surveys submitted by the authenticated user (GET)
router.get('/unit-surveys', userAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, month, year } = req.query;
    const user = req.user;
    console.log('Unit surveys request - user:', { role: user.role, userType: user.userType, district: user.district, districtId: user.districtId, areaId: user.areaId, unitId: user.unitId });
    
    let query = {};
    
    // Build query based on user role
    if (user.role === 'unit') {
      query = { submittedBy: user.unitId, submissionLevel: 'unit' };
    } else if (user.role === 'area') {
      query = { areaId: user.areaId, submissionLevel: 'unit' };
    } else if (user.role === 'district' || user.userType === 'user') {
      query = { district: user.districtName || user.district, submissionLevel: 'unit' };
    }
    
    // Apply filters
    if (month) query.month = month;
    if (year) query.year = parseInt(year);
    
    console.log('Unit surveys final query:', query);
    
    // Debug: Let's see what unit surveys exist in the database
    const allUnitSurveys = await UnitSurvey.find({}).limit(5);
    console.log('Sample unit surveys in database:', allUnitSurveys.map(s => ({ district: s.district, area: s.area, component: s.component, month: s.month })));
    
    // Get surveys with pagination
    const totalSurveys = await UnitSurvey.countDocuments(query);
    const surveys = await UnitSurvey.find(query)
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    // Enrich with human-friendly submitter names
    const enrichedSurveys = surveys.map(s => {
      const sObj = s.toObject();
      sObj.submittedByName = sObj.component || sObj.submittedBy || 'Unknown Unit';
      sObj.areaName = sObj.area || sObj.areaName || undefined;
      return sObj;
    });

    res.json({
      message: 'Unit surveys retrieved successfully',
      surveys: enrichedSurveys,
      totalSurveys,
      totalPages: Math.ceil(totalSurveys / limit),
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('Get unit surveys error:', error);
    res.status(500).json({ message: 'Server error while retrieving unit surveys' });
  }
});

// Get unit surveys for a specific unit (for unit dashboard)
router.get('/unit-surveys/unit/:unitId', userAuth, async (req, res) => {
  try {
    const { unitId } = req.params;
    const { page = 1, limit = 10, month, year } = req.query;
    const user = req.user;
    
    console.log('=== Unit Surveys Request ===');
    console.log('URL unitId:', unitId);
    console.log('User unitId:', user.unitId);
    console.log('User unitName:', user.unitName);
    console.log('User role:', user.role);
    
    // First, let's check what surveys exist in the database
    const allSurveys = await UnitSurvey.find({ submissionLevel: 'unit' }).limit(10);
    console.log('Sample surveys in DB:', allSurveys.map(s => ({
      _id: s._id,
      unitId: s.unitId,
      submittedBy: s.submittedBy,
      component: s.component,
      district: s.district,
      area: s.area,
      month: s.month
    })));
    
    // Query by unitId, submittedBy, or component to catch all cases
    // Also try to match by user's unitId if available
    let query = {
      $or: [
        { unitId: unitId },
        { submittedBy: unitId },
        { component: unitId }
      ],
      submissionLevel: 'unit'
    };
    
    // If user has unitId, also try matching with that
    if (user.unitId && user.unitId !== unitId) {
      query.$or.push(
        { unitId: user.unitId },
        { submittedBy: user.unitId },
        { component: user.unitName || user.unitId }
      );
    }
    
    // Apply filters
    if (month) query.month = month;
    if (year) query.year = parseInt(year);
    
    console.log('Final query:', JSON.stringify(query, null, 2));
    
    // Get surveys with pagination
    const totalSurveys = await UnitSurvey.countDocuments(query);
    console.log('Total surveys found:', totalSurveys);
    
    const surveys = await UnitSurvey.find(query)
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    console.log('Surveys returned:', surveys.length);
    
    // Enrich surveys with user names
    const enrichedSurveys = surveys.map(survey => {
      const surveyObj = survey.toObject();
      
      // Use the component name (unit name) from the survey data
      surveyObj.submittedByName = survey.component || survey.submittedBy || 'Unknown Unit';
      
      return surveyObj;
    });
    
    res.json({
      message: 'Unit surveys retrieved successfully',
      surveys: enrichedSurveys,
      totalSurveys,
      totalPages: Math.ceil(totalSurveys / limit),
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('Get unit surveys error:', error);
    res.status(500).json({ message: 'Server error while retrieving unit surveys' });
  }
});

// Get a specific unit survey by ID (GET)
router.get('/unit-survey/:id', userAuth, async (req, res) => {
  try {
    const user = req.user;
    let query = { _id: req.params.id };
    
    // Add user-specific filtering
    if (user.role === 'unit') {
      query.submittedBy = user.unitId;
    } else if (user.role === 'area') {
      query.areaId = user.areaId;
    } else if (user.role === 'district' || user.userType === 'user') {
      query.district = user.district;
    }
    
    const survey = await UnitSurvey.findOne(query);

    if (!survey) {
      return res.status(404).json({ message: 'Unit survey not found' });
    }

    // Enrich with human-friendly submitter name
    const surveyObj = survey.toObject();
    surveyObj.submittedByName = surveyObj.component || surveyObj.submittedBy || 'Unknown Unit';
    surveyObj.areaName = surveyObj.area || surveyObj.areaName || undefined;

    res.json({
      message: 'Unit survey retrieved successfully',
      survey: surveyObj
    });

  } catch (error) {
    console.error('Get unit survey error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid survey ID' });
    }
    
    res.status(500).json({ message: 'Server error while retrieving unit survey' });
  }
});

// Update a specific unit survey by ID (PUT)
router.put('/unit-survey/:id', userAuth, async (req, res) => {
  try {
    const surveyData = req.body;
    const user = req.user;
    
    // Debug logging for updates
    console.log('Unit survey update - User data:', {
      unitId: user.unitId,
      district: user.district,
      districtName: user.districtName,
      districtId: user.districtId,
      area: user.area,
      areaName: user.areaName,
      areaId: user.areaId
    });
    console.log('Unit survey update - Survey data:', {
      district: surveyData.district,
      area: surveyData.area,
      component: surveyData.component
    });
    
    let query = { _id: req.params.id };
    
    // Add user-specific filtering
    if (user.role === 'unit') {
      query.submittedBy = user.unitId;
    } else if (user.role === 'area') {
      query.areaId = user.areaId;
    } else if (user.role === 'district' || user.userType === 'user') {
      query.district = user.district;
    }
    
    // Ensure required fields are present for updates
    const updateData = {
      ...surveyData,
      updatedAt: new Date(),
      updatedBy: user.unitId || user.district
    };
    
    // Ensure district, area, and component are set if not provided in surveyData
    if (!updateData.district) {
      updateData.district = user.districtName || user.district;
    }
    if (!updateData.area) {
      updateData.area = user.areaName || user.area;
    }
    if (!updateData.component) {
      updateData.component = user.unitName || user.unitId;
    }
    
    // Final validation
    if (!updateData.district) {
      console.error('District is undefined for update. User data:', user);
      return res.status(400).json({
        message: 'District information is required but not available. Please contact support.',
        error: 'MISSING_DISTRICT_INFO'
      });
    }
    
    if (!updateData.area) {
      console.error('Area is undefined for update. User data:', user);
      return res.status(400).json({
        message: 'Area information is required but not available. Please contact support.',
        error: 'MISSING_AREA_INFO'
      });
    }
    
    console.log('Unit survey update - Final update data:', updateData);
    
    const updatedSurvey = await UnitSurvey.findOneAndUpdate(
      query,
      updateData,
      {
        new: true, // Return the updated document
        runValidators: true // Run validation on update
      }
    );

    if (!updatedSurvey) {
      return res.status(404).json({ message: 'Unit survey not found' });
    }

    res.json({
      message: 'Unit survey updated successfully',
      survey: updatedSurvey
    });

  } catch (error) {
    console.error('Update unit survey error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid survey ID' });
    }
    
    res.status(500).json({ message: 'Server error while updating unit survey' });
  }
});

// Delete a specific unit survey by ID (DELETE)
router.delete('/unit-survey/:id', userAuth, async (req, res) => {
  try {
    const user = req.user;
    let query = { _id: req.params.id };
    
    // Add user-specific filtering
    if (user.role === 'unit') {
      query.submittedBy = user.unitId;
    } else if (user.role === 'area') {
      query.areaId = user.areaId;
    } else if (user.role === 'district' || user.userType === 'user') {
      query.district = user.district;
    }
    
    const deletedSurvey = await UnitSurvey.findOneAndDelete(query);

    if (!deletedSurvey) {
      return res.status(404).json({ message: 'Unit survey not found' });
    }

    res.json({
      message: 'Unit survey deleted successfully',
      deletedSurvey: deletedSurvey
    });

  } catch (error) {
    console.error('Delete unit survey error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid survey ID' });
    }
    
    res.status(500).json({ message: 'Server error while deleting unit survey' });
  }
});

// Get unit survey statistics
router.get('/unit-surveys/stats', userAuth, async (req, res) => {
  try {
    const user = req.user;
    const currentYear = new Date().getFullYear();
    
    let query = {};
    
    // Build query based on user role
    if (user.role === 'unit') {
      query = { submittedBy: user.unitId, submissionLevel: 'unit' };
    } else if (user.role === 'area') {
      query = { areaId: user.areaId, submissionLevel: 'unit' };
    } else if (user.role === 'district' || user.userType === 'user') {
      query = { district: user.districtName || user.district, submissionLevel: 'unit' };
    }
    
    // Get surveys for current year
    const yearQuery = { ...query, year: currentYear };
    const surveys = await UnitSurvey.find(yearQuery).sort({ submittedAt: -1 });
    
    // Calculate statistics
    const stats = {
      totalSurveys: surveys.length,
      surveysThisYear: surveys.length,
      surveysThisMonth: surveys.filter(s => {
        const surveyDate = new Date(s.submittedAt);
        const currentDate = new Date();
        return surveyDate.getMonth() === currentDate.getMonth() && 
               surveyDate.getFullYear() === currentDate.getFullYear();
      }).length,
      lastSubmission: surveys.length > 0 ? surveys[0].submittedAt : null,
      monthlyBreakdown: surveys.reduce((acc, survey) => {
        acc[survey.month] = (acc[survey.month] || 0) + 1;
        return acc;
      }, {}),
      totalWorkers: surveys.reduce((sum, survey) => {
        return sum + (survey.workers?.rukkun || 0) + 
               (survey.workers?.karkun || 0) + 
               (survey.workers?.activeAssociate || 0);
      }, 0),
      totalNewMembers: surveys.reduce((sum, survey) => {
        return sum + (survey.partB?.newJIHMembers?.male || 0) + 
               (survey.partB?.newJIHMembers?.female || 0);
      }, 0),
      publicMeetingAttendeesThisYear: surveys.reduce((acc, s) => {
        acc.male = (acc.male || 0) + (s.partC?.publicMeetingAttendees?.male || 0);
        acc.female = (acc.female || 0) + (s.partC?.publicMeetingAttendees?.female || 0);
        return acc;
      }, { male: 0, female: 0 }),
      growthTotalsThisYear: surveys.reduce((acc, s) => {
        // Handle both old format (single numbers) and new format (male/female objects)
        const partD = s.partD?.growthAcceleration || {};
        
        // Rukkun
        if (typeof partD.rukkun === 'object' && partD.rukkun !== null) {
          acc.rukkun = (acc.rukkun || 0) + (partD.rukkun.male || 0) + (partD.rukkun.female || 0);
        } else {
          acc.rukkun = (acc.rukkun || 0) + (partD.rukkun || 0);
        }
        
        // Karkun
        if (typeof partD.karkun === 'object' && partD.karkun !== null) {
          acc.karkun = (acc.karkun || 0) + (partD.karkun.male || 0) + (partD.karkun.female || 0);
        } else {
          acc.karkun = (acc.karkun || 0) + (partD.karkun || 0);
        }
        
        // Solidarity
        if (typeof partD.solidarity === 'object' && partD.solidarity !== null) {
          acc.solidarity = (acc.solidarity || 0) + (partD.solidarity.male || 0) + (partD.solidarity.female || 0);
        } else {
          acc.solidarity = (acc.solidarity || 0) + (partD.solidarity || 0);
        }
        
        // SIO
        if (typeof partD.sio === 'object' && partD.sio !== null) {
          acc.sio = (acc.sio || 0) + (partD.sio.male || 0) + (partD.sio.female || 0);
        } else {
          acc.sio = (acc.sio || 0) + (partD.sio || 0);
        }
        
        // GIO
        if (typeof partD.gio === 'object' && partD.gio !== null) {
          acc.gio = (acc.gio || 0) + (partD.gio.male || 0) + (partD.gio.female || 0);
        } else {
          acc.gio = (acc.gio || 0) + (partD.gio || 0);
        }
        
        return acc;
      }, { rukkun: 0, karkun: 0, solidarity: 0, sio: 0, gio: 0 }),
      
      // Add detailed breakdown by gender for Part D
      growthBreakdownByGender: surveys.reduce((acc, s) => {
        const partD = s.partD?.growthAcceleration || {};
        
        // Initialize structure if not exists
        if (!acc.rukkun) acc.rukkun = { male: 0, female: 0 };
        if (!acc.karkun) acc.karkun = { male: 0, female: 0 };
        if (!acc.solidarity) acc.solidarity = { male: 0, female: 0 };
        if (!acc.sio) acc.sio = { male: 0, female: 0 };
        if (!acc.gio) acc.gio = { male: 0, female: 0 };
        
        // Rukkun
        if (typeof partD.rukkun === 'object' && partD.rukkun !== null) {
          acc.rukkun.male += (partD.rukkun.male || 0);
          acc.rukkun.female += (partD.rukkun.female || 0);
        } else {
          // For backward compatibility, assume all are male if old format
          acc.rukkun.male += (partD.rukkun || 0);
        }
        
        // Karkun
        if (typeof partD.karkun === 'object' && partD.karkun !== null) {
          acc.karkun.male += (partD.karkun.male || 0);
          acc.karkun.female += (partD.karkun.female || 0);
        } else {
          acc.karkun.male += (partD.karkun || 0);
        }
        
        // Solidarity
        if (typeof partD.solidarity === 'object' && partD.solidarity !== null) {
          acc.solidarity.male += (partD.solidarity.male || 0);
          acc.solidarity.female += (partD.solidarity.female || 0);
        } else {
          acc.solidarity.male += (partD.solidarity || 0);
        }
        
        // SIO
        if (typeof partD.sio === 'object' && partD.sio !== null) {
          acc.sio.male += (partD.sio.male || 0);
          acc.sio.female += (partD.sio.female || 0);
        } else {
          acc.sio.male += (partD.sio || 0);
        }
        
        // GIO
        if (typeof partD.gio === 'object' && partD.gio !== null) {
          acc.gio.male += (partD.gio.male || 0);
          acc.gio.female += (partD.gio.female || 0);
        } else {
          acc.gio.male += (partD.gio || 0);
        }
        
        return acc;
      }, {})
    };

    res.json({
      message: 'Unit survey statistics retrieved successfully',
      stats: stats
    });

  } catch (error) {
    console.error('Get unit survey stats error:', error);
    res.status(500).json({ message: 'Server error while retrieving unit survey statistics' });
  }
});

module.exports = router;
