const express = require('express');
const router = express.Router();
const DistrictSurvey = require('../models/districtSurvey');
const userAuth = require('../middlewares/userAuth');

// Create district survey
router.post('/surveys', userAuth, async (req, res) => {
  try {
    console.log('User object from token:', req.user);
    
    // Get submittedBy from various possible fields
    // For district users, we can use the district name as submittedBy since it's unique
    const submittedBy = req.user.districtId || req.user.district || req.user.id || req.user.userId || req.user._id;
    
    if (!submittedBy) {
      return res.status(400).json({
        success: false,
        message: 'Unable to identify user. Please log in again.',
        error: 'Missing user identification'
      });
    }
    
    const surveyData = {
      ...req.body,
      submittedBy: submittedBy,
      submittedAt: new Date()
    };
    console.log('District survey data:', surveyData);
    console.log('Part D categories:', surveyData.partD?.categories);
    console.log('Part D categoriesCounts:', surveyData.partD?.categoriesCounts);
    const survey = new DistrictSurvey(surveyData);
    await survey.save();

    res.status(201).json({
      success: true,
      message: 'District survey created successfully',
      data: survey
    });
  } catch (error) {
    console.error('Error creating district survey:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating district survey',
      error: error.message
    });
  }
});

// Get district surveys
router.get('/surveys', userAuth, async (req, res) => {
  try {
    const { districtId } = req.query;
    const user = req.user;
    console.log('user:', user);
    console.log('District surveys request:', { districtId, user: { id: user.id, role: user.role, districtId: user.districtId, districtName: user.districtName } });

    let query = {};
    
    // If user is district admin, filter by their district
    if (user.role === 'district' && (user.districtName || user.district)) {
      query.district = user.districtName || user.district;
      console.log('District admin filtering by district:', user.districtName || user.district);
    }
    
    // If user is state admin, they can see all district surveys
    if (user.role === 'state' || user.role === 'admin') {
      // No additional filtering needed for state/admin users
      console.log('State/Admin user - showing all district surveys');
    }

    // If specific district is requested
    if (districtId) {
      const districtName = user.districtName || user.district || districtId;
      query.district = districtName;
      console.log('Filtering surveys by district name:', districtName);
    }

    console.log('Final query:', query);
    
    const surveys = await DistrictSurvey.find(query)
      .sort({ submittedAt: -1 });
      
    console.log('Found district surveys:', surveys.length);

    res.json({
      success: true,
      data: surveys
    });
  } catch (error) {
    console.error('Error fetching district surveys:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching district surveys',
      error: error.message
    });
  }
});

// Get single district survey
router.get('/surveys/:id', userAuth, async (req, res) => {
  try {
    const survey = await DistrictSurvey.findById(req.params.id);

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'District survey not found'
      });
    }

    res.json({
      success: true,
      data: survey
    });
  } catch (error) {
    console.error('Error fetching district survey:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching district survey',
      error: error.message
    });
  }
});

// Update district survey
router.put('/surveys/:id', userAuth, async (req, res) => {
  try {
    console.log('Update district survey request:', {
      surveyId: req.params.id,
      user: {
        id: req.user.id,
        districtId: req.user.districtId,
        role: req.user.role
      },
      body: req.body
    });

    const survey = await DistrictSurvey.findById(req.params.id);

    if (!survey) {
      console.log('District survey not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'District survey not found'
      });
    }

    console.log('Found district survey:', {
      id: survey._id,
      submittedBy: survey.submittedBy,
      userDistrictId: req.user.districtId,
      userRole: req.user.role
    });

    // Check if user can edit this survey
    // For district surveys, we check if the user's district matches the submittedBy field
    // or if the user is an admin/state user
    if (survey.submittedBy !== req.user.districtId && 
        survey.submittedBy !== req.user.district &&
        survey.submittedBy !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'state') {
      console.log('Authorization failed:', {
        surveySubmittedBy: survey.submittedBy,
        userDistrictId: req.user.districtId,
        userRole: req.user.role
      });
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this survey'
      });
    }

    const updatedSurvey = await DistrictSurvey.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    console.log('District survey updated successfully:', updatedSurvey._id);

    res.json({
      success: true,
      message: 'District survey updated successfully',
      data: updatedSurvey
    });
  } catch (error) {
    console.error('Error updating district survey:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating district survey',
      error: error.message
    });
  }
});

// Delete district survey
router.delete('/surveys/:id', userAuth, async (req, res) => {
  try {
    const survey = await DistrictSurvey.findById(req.params.id);
    console.log('survey:', survey);
    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'District survey not found'
      });
    }

    // Check if user can delete this survey
    // For district surveys, we check if the user's district matches the submittedBy field
    // or if the user is an admin/state user
    if (survey.submittedBy !== req.user.districtId && 
        survey.submittedBy !== req.user.district &&
        survey.submittedBy !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'state') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this survey'
      });
    }

    await DistrictSurvey.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'District survey deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting district survey:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting district survey',
      error: error.message
    });
  }
});

// Get district survey statistics
router.get('/statistics', userAuth, async (req, res) => {
  try {
    const { districtId } = req.query;
    const user = req.user;

    let query = {};
    
    // If user is district admin, filter by their district
    if (user.role === 'district' && (user.districtName || user.district)) {
      query.district = user.districtName || user.district;
    }
    
    // If user is state admin, they can see all district surveys
    if (user.role === 'state' || user.role === 'admin') {
      // No additional filtering needed for state/admin users
    }

    // If specific district is requested
    if (districtId) {
      query.district = user.districtName || user.district || districtId;
    }

    const totalSurveys = await DistrictSurvey.countDocuments(query);
    
    // Get surveys for current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const surveysThisMonth = await DistrictSurvey.countDocuments({
      ...query,
      month: ['January', 'February', 'March', 'April', 'May', 'June', 
              'July', 'August', 'September', 'October', 'November', 'December'][currentMonth]
    });

    // Get unique districts that have submitted surveys
    const activeDistricts = await DistrictSurvey.distinct('district', query);

    res.json({
      success: true,
      data: {
        totalSurveys,
        surveysThisMonth,
        activeDistricts: activeDistricts.length
      }
    });
  } catch (error) {
    console.error('Error fetching district statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching district statistics',
      error: error.message
    });
  }
});

module.exports = router;
