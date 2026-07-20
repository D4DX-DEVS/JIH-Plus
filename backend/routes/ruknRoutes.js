const express = require('express');
const RuknForm = require('../models/ruknForm');
const userAuth = require('../middlewares/userAuth');
const jwt = require('jsonwebtoken');
const { uploadToDigitalOcean } = require('../middlewares/digitalOceanCdn');
const router = express.Router();

// Allow either admin token or user token
const allowAdminOrUser = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded?.isAdmin) {
      req.user = req.user || {};
      req.user.state = decoded.state || 'State';
      return next();
    }
  } catch (e) {
    // fallthrough to userAuth
  }
  return userAuth(req, res, next);
};

// ====== SUBMIT NEW RUKN FORM (External User - Public) ======
router.post('/submit', async (req, res) => {
  try {
    const formData = req.body;
    console.log("Rukn form data received");
    
    // Handle photo upload if present (base64 data URL)
    let photoUrl = null;
    if (formData.photo && formData.photo.startsWith('data:image/')) {
      try {
        // Extract base64 data and mime type
        const matches = formData.photo.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const fileName = `photo-${Date.now()}`;
          
          console.log('Uploading Rukn photo to DigitalOcean:', { mimeType, size: buffer.length });
          photoUrl = await uploadToDigitalOcean(buffer, fileName, mimeType);
          console.log('Photo uploaded successfully:', photoUrl);
        }
      } catch (uploadError) {
        console.error('Failed to upload Rukn photo:', uploadError);
        // Continue without photo if upload fails
      }
    }
    
    // Create new Rukn form with initial status
    const newForm = new RuknForm({
      ...formData,
      photo: photoUrl || formData.photo,
      status: 'pending',
      verification: {
        unitAdmin: { status: 'pending' },
        // area verification removed
        districtAdmin: { status: 'pending' }
      }
    });
    
    const savedForm = await newForm.save();
    console.log("savedForm", savedForm);
    res.status(201).json({
      success: true,
      message: 'Rukn form submitted successfully. Waiting for unit admin verification.',
      data: savedForm
    });
    
  } catch (error) {
    console.error('Rukn form submission error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during form submission'
    });
  }
});

// ====== GET RUKN FORMS FOR MY UNIT (regex match like karkun) ======
const escapeRegExp = (text = '') => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
router.get('/unit/mine', userAuth, async (req, res) => {
  try {
    const user = req.user || {};
    const { unitId, unitName, area, district } = user;
    console.log("user", user);
    
    const orClauses = [];
    if (unitId) {
      orClauses.push({ unitId });
    }
    if (unitName) {
      const unitNameRegex = new RegExp(`^${escapeRegExp(unitName)}$`, 'i');
      orClauses.push({ unitName: unitNameRegex });
      orClauses.push({ submittedBy: unitNameRegex });
    }

    const query = orClauses.length > 0 ? { $or: orClauses } : {};
    
    // Optional additional narrowing by area/district if available on token
    if (area) query.areaName = new RegExp(`^${escapeRegExp(area)}$`, 'i');
    if (district) query.districtName = new RegExp(`^${escapeRegExp(district)}$`, 'i');

    const forms = await RuknForm.find(query).sort({ submittedAt: -1 });

    res.json({
      success: true,
      message: 'Rukn forms for unit retrieved successfully',
      count: forms.length,
      data: forms
    });
  } catch (error) {
    console.error('Get my unit Rukn forms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving unit forms'
    });
  }
});

// (Area-level listing removed)

// ====== GET RUKN FORMS FOR MY DISTRICT ======
router.get('/district/mine', userAuth, async (req, res) => {
  try {
    const { district } = req.user || {};
    const query = {};
    if (district) query.districtName = new RegExp(`^${escapeRegExp(district)}$`, 'i');
    
    const forms = await RuknForm.find(query).sort({ submittedAt: -1 });
    res.json({ success: true, message: 'Rukn forms for district retrieved successfully', count: forms.length, data: forms });
  } catch (error) {
    console.error('Get my district Rukn forms error:', error);
    res.status(500).json({ success: false, message: 'Server error while retrieving district forms' });
  }
});

// ====== GET SINGLE RUKN FORM BY ID ======
router.get('/:id', allowAdminOrUser, async (req, res) => {
  try {
    const form = await RuknForm.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Form retrieved successfully',
      data: form
    });
  } catch (error) {
    console.error('Get Rukn form error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid form ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving form'
    });
  }
});

// ====== UNIT ADMIN - VERIFY FORM ======
router.put('/:id/verify/unit', userAuth, async (req, res) => {
  try {
    const { status, comments, opinion } = req.body;
    console.log("req.user", req.user);
    const verifiedBy = req.user.unitName || req.user.unitId || 'Unit Admin';
    console.log("verifiedBy", verifiedBy);
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either approved or rejected'
      });
    }
    
    const updateData = {
      'verification.unitAdmin.status': status,
      'verification.unitAdmin.verifiedBy': verifiedBy,
      'verification.unitAdmin.verifiedAt': new Date(),
      'verification.unitAdmin.comments': comments || '',
      updatedAt: new Date()
    };

    const adminResponsibility = req.user.role === 'unit' ? 'പ്രാദേശിക അമീർ' : 'Unit Admin';
    const adminMobile = req.user.mobile || req.user.phone || req.user.contactNumber || req.user.contact || '';

    updateData['localAmeer.signature'] = verifiedBy;
    updateData['localAmeer.name'] = verifiedBy;
    updateData['localAmeer.responsibility'] = adminResponsibility;
    updateData['localAmeer.date'] = new Date().toISOString();

    if (adminMobile) {
      updateData['localAmeer.mobile'] = adminMobile;
    }
    
    // If approved, move directly to district review (area step removed)
    if (status === 'approved') {
      updateData.status = 'district_review';
      updateData['verification.districtAdmin.status'] = 'pending';
      updateData.localUnit = req.user.unitName || req.user.unit || '';
    } else {
      // If rejected, mark as rejected
      updateData.status = 'rejected';
    }
    
    const updatedForm = await RuknForm.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedForm) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }
    
    res.json({
      success: true,
      message: `Form ${status} by unit admin. ${status === 'approved' ? 'Moved to district admin for review.' : 'Form rejected.'}`,
      data: updatedForm
    });
  } catch (error) {
    console.error('Unit admin verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating form'
    });
  }
});

// ====== AREA ADMIN - VERIFY FORM (REMOVED) ======

// ====== DISTRICT ADMIN - VERIFY FORM (Moves to State Review) ======
router.put('/:id/verify/district', userAuth, async (req, res) => {
  try {
    const { status, comments } = req.body;
    const verifiedBy = req.user.name || req.user.fullName || req.user.username || req.user.district || 'District Admin';
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either approved or rejected'
      });
    }
    
    // Check if unit admin has approved (area step removed)
    const form = await RuknForm.findById(req.params.id);
    if (form.verification.unitAdmin.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Unit admin must approve before district admin can review'
      });
    }
    
    const updateData = {
      'verification.districtAdmin.status': status,
      'verification.districtAdmin.verifiedBy': verifiedBy,
      'verification.districtAdmin.verifiedAt': new Date(),
      'verification.districtAdmin.comments': comments || '',
      updatedAt: new Date()
    };

    if (typeof opinion === 'string') {
      updateData['districtPresident.opinion'] = opinion;
    }
    
    // After district approves, move to state review (final approval at state)
    updateData.status = status === 'approved' ? 'state_review' : 'rejected';
    
    if (status === 'approved') {
      // Autofill district president section for print/view
      const nowIso = new Date().toISOString();
      updateData['districtPresident.name'] = verifiedBy;
      updateData['districtPresident.signature'] = verifiedBy;
      updateData['districtPresident.date'] = nowIso;

      // Autofill regional nazim section (next stage)
      updateData['regionalNazim.date'] = nowIso;
      updateData['regionalNazim.name'] = verifiedBy;
      updateData['regionalNazim.signature'] = verifiedBy;
    }
    
    const updatedForm = await RuknForm.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedForm) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }
    
    res.json({
      success: true,
      message: `Form ${status} by district admin. ${status === 'approved' ? 'Moved to state admin for final review.' : 'Form rejected.'}`,
      data: updatedForm
    });
  } catch (error) {
    console.error('District admin verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating form'
    });
  }
});

// ====== STATE ADMIN - VERIFY FORM (Final Approval) ======
router.put('/:id/verify/state', allowAdminOrUser, async (req, res) => {
  try {
    const { status, comments } = req.body;
    const verifiedBy = req.user.state || 'State Admin';

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either approved or rejected'
      });
    }

    const form = await RuknForm.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    if (form.verification.districtAdmin.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'District admin must approve before state admin can review'
      });
    }

    const updateData = {
      'verification.stateAdmin.status': status,
      'verification.stateAdmin.verifiedBy': verifiedBy,
      'verification.stateAdmin.verifiedAt': new Date(),
      'verification.stateAdmin.comments': comments || '',
      updatedAt: new Date(),
      status: status === 'approved' ? 'approved' : 'rejected'
    };

    const updatedForm = await RuknForm.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: `Form ${status} by state admin.`,
      data: updatedForm
    });
  } catch (error) {
    console.error('State admin verification error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating form' });
  }
});

// ====== STATE - LIST ALL/MINE ======
router.get('/state/mine', allowAdminOrUser, async (req, res) => {
  try {
    const forms = await RuknForm.find({}).sort({ submittedAt: -1 });
    res.json({ success: true, message: 'Rukn forms for state retrieved successfully', count: forms.length, data: forms });
  } catch (error) {
    console.error('Get state Rukn forms error:', error);
    res.status(500).json({ success: false, message: 'Server error while retrieving state forms' });
  }
});

// ====== DELETE RUKN FORM (Admin) ======
router.delete('/:id/admin', allowAdminOrUser, async (req, res) => {
  try {
    console.log('=== ADMIN DELETE ROUTE HIT ===');
    console.log('Admin delete request for Rukn form:', req.params.id);
    console.log('User info:', req.user);
    
    const deletedForm = await RuknForm.findByIdAndDelete(req.params.id);
    
    if (!deletedForm) {
      console.log('Rukn form not found with ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }
    
    console.log('Rukn form deleted successfully:', deletedForm._id);
    res.json({
      success: true,
      message: 'Form deleted successfully',
      data: deletedForm
    });
  } catch (error) {
    console.error('Delete Rukn form error:', error);
    console.error('Error stack:', error.stack);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid form ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while deleting form',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ====== DELETE RUKN FORM (Protected) ======
router.delete('/:id', userAuth, async (req, res) => {
  try {
    const deletedForm = await RuknForm.findByIdAndDelete(req.params.id);
    
    if (!deletedForm) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Form deleted successfully',
      data: deletedForm
    });
  } catch (error) {
    console.error('Delete Rukn form error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid form ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while deleting form'
    });
  }
});

module.exports = router;
