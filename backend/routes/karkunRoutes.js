const express = require('express');
const KarkunForm = require('../models/karkunForm');
const userAuth = require('../middlewares/userAuth');
const adminAuth = require('../middlewares/adminAuth');
const jwt = require('jsonwebtoken');
const { uploadToDigitalOcean } = require('../middlewares/digitalOceanCdn');
const router = express.Router();

// Allow either admin token or user token
const allowAdminOrUser = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  //console.log('allowAdminOrUser - Token received:', token ? 'Yes' : 'No');
  
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
   // console.log('allowAdminOrUser - Decoded token:', { isAdmin: decoded?.isAdmin, state: decoded?.state });
    
    if (decoded?.isAdmin) {
      req.user = req.user || {};
      req.user.state = decoded.state || 'State';
     // console.log('allowAdminOrUser - Admin user authenticated');
      return next();
    }
  } catch (e) {
   // console.log('allowAdminOrUser - Admin check failed, falling back to userAuth:', e.message);
   // // fallthrough to userAuth
  }
  return userAuth(req, res, next);
};

// ====== SUBMIT NEW KARKUN FORM (External User - Public) ======
router.post('/submit', async (req, res) => {
  try {
    const formData = req.body;
    console.log("Karkun formdata");
    // Validate compulsory books requirement
    const hasCompulsoryBook = formData.compulsoryBooks?.book1 || 
                             formData.compulsoryBooks?.book2 || 
                             formData.compulsoryBooks?.book3;
    
    if (!hasCompulsoryBook) {
      return res.status(400).json({
        success: false,
        message: 'കുറ്റാപ്പ് ആയി വായിക്കേണ്ട പുസ്തകങ്ങളിൽ ഏതെങ്കിലും ഒന്നെങ്കിലും തിരഞ്ഞെടുക്കണം!'
      });
    }
    
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
          
          console.log('Uploading Karkun photo to DigitalOcean:', { mimeType, size: buffer.length });
          photoUrl = await uploadToDigitalOcean(buffer, fileName, mimeType);
          console.log('Photo uploaded successfully:', photoUrl);
        }
      } catch (uploadError) {
        console.error('Failed to upload Karkun photo:', uploadError);
        // Continue without photo if upload fails
      }
    }
    
    // Create new Karkun form with initial status
    const newForm = new KarkunForm({
      ...formData,
      photo: photoUrl || formData.photo,
      status: 'pending',
      verification: {
        unitAdmin: { status: 'pending' },
        areaAdmin: { status: 'pending' },
        districtAdmin: { status: 'pending' }
      }
    });
    
    const savedForm = await newForm.save();
    
    res.status(201).json({
      success: true,
      message: 'Karkun form submitted successfully. Waiting for unit admin verification.',
      data: savedForm
    });
    
  } catch (error) {
    console.error('Karkun form submission error:', error);
    
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

// ====== GET KARKUN FORMS FOR AUTHENTICATED UNIT (by unitId or unit name) ======
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
      orClauses.push({ halkhaName: unitNameRegex });
      orClauses.push({ localUnit: unitNameRegex });
      orClauses.push({ submittedBy: unitNameRegex });
    }

    const query = orClauses.length > 0 ? { $or: orClauses } : {};

    // Optional additional narrowing by area/district if available on token
    if (area) query.area = new RegExp(`^${escapeRegExp(area)}$`, 'i');
    if (district) query.district = new RegExp(`^${escapeRegExp(district)}$`, 'i');


    
    const forms = await KarkunForm.find(query).sort({ submittedAt: -1 });
    
    res.json({
      success: true,
      message: 'Karkun forms for unit retrieved successfully',
      count: forms.length,
      data: forms
    });
  } catch (error) {
    console.error('Get my unit Karkun forms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving unit forms'
    });
  }
});

// ====== GET KARKUN FORMS FOR AUTHENTICATED AREA (by area/district) ======
router.get('/area/mine', userAuth, async (req, res) => {
  try {
    const { areaName, district } = { areaName: req.user.areaName || req.user.area, district: req.user.district };
    const query = {};
    if (areaName) query.area = new RegExp(`^${escapeRegExp(areaName)}$`, 'i');
    if (district) query.district = new RegExp(`^${escapeRegExp(district)}$`, 'i');

    const forms = await KarkunForm.find(query).sort({ submittedAt: -1 });
    res.json({ success: true, message: 'Karkun forms for area retrieved successfully', count: forms.length, data: forms });
  } catch (error) {
    console.error('Get my area Karkun forms error:', error);
    res.status(500).json({ success: false, message: 'Server error while retrieving area forms' });
  }
});

// ====== GET KARKUN FORMS FOR AUTHENTICATED DISTRICT (by district)
router.get('/district/mine', userAuth, async (req, res) => {
  try {
    const { district } = req.user || {};
    const query = {};
    if (district) query.district = new RegExp(`^${escapeRegExp(district)}$`, 'i');
    const forms = await KarkunForm.find(query).sort({ submittedAt: -1 });
    res.json({ success: true, message: 'Karkun forms for district retrieved successfully', count: forms.length, data: forms });
  } catch (error) {
    console.error('Get my district Karkun forms error:', error);
    res.status(500).json({ success: false, message: 'Server error while retrieving district forms' });
  }
});

// ====== GET SINGLE KARKUN FORM BY ID ======
router.get('/:id', allowAdminOrUser, async (req, res) => {
  try {
    const form = await KarkunForm.findById(req.params.id);
    
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
    console.error('Get Karkun form error:', error);
    
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
    const { status, comments } = req.body;
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
    console.log("updateData", updateData);
    // If approved, move to area review
    if (status === 'approved') {
      updateData.status = 'unit_review';
      updateData['verification.areaAdmin.status'] = 'pending';
      // Autofill local unit section for print/view
      updateData.localUnitSignature = verifiedBy;
      updateData.localUnit = req.user.unitName || req.user.unit || '';
      updateData.localUnitDate = new Date().toISOString();
    } else {
      // If rejected, mark as rejected
      updateData.status = 'rejected';
    }
    
    const updatedForm = await KarkunForm.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    console.log("updatedForm", updatedForm);
    if (!updatedForm) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }
    
    res.json({
      success: true,
      message: `Form ${status} by unit admin. ${status === 'approved' ? 'Moved to area admin for review.' : 'Form rejected.'}`,
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

// ====== AREA ADMIN - VERIFY FORM ======
router.put('/:id/verify/area', userAuth, async (req, res) => {
  try {
    const { status, comments } = req.body;
    const verifiedBy = req.user.district || 'Area Admin';
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either approved or rejected'
      });
    }
    
    // Check if unit admin has approved
    const form = await KarkunForm.findById(req.params.id);
    if (form.verification.unitAdmin.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Unit admin must approve before area admin can review'
      });
    }
    
    const updateData = {
      'verification.areaAdmin.status': status,
      'verification.areaAdmin.verifiedBy': verifiedBy,
      'verification.areaAdmin.verifiedAt': new Date(),
      'verification.areaAdmin.comments': comments || '',
      updatedAt: new Date()
    };
    
    // If approved, move to district review
    if (status === 'approved') {
      updateData.status = 'area_review';
      updateData['verification.districtAdmin.status'] = 'pending';
      // Autofill area president section
      updateData.areaPresidentName = verifiedBy;
      updateData.areaPresidentSignature = verifiedBy;
      updateData.areaPresidentDate = new Date().toISOString();
    } else {
      // If rejected, mark as rejected
      updateData.status = 'rejected';
    }
    
    const updatedForm = await KarkunForm.findByIdAndUpdate(
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
      message: `Form ${status} by area admin. ${status === 'approved' ? 'Moved to district admin for review.' : 'Form rejected.'}`,
      data: updatedForm
    });
  } catch (error) {
    console.error('Area admin verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating form'
    });
  }
});

// ====== DISTRICT ADMIN - VERIFY FORM (Final Approval) ======
router.put('/:id/verify/district', userAuth, async (req, res) => {
  try {
    const { status, comments } = req.body;
    const verifiedBy = req.user.district || 'District Admin';
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either approved or rejected'
      });
    }
    
    // Check if area admin has approved
    const form = await KarkunForm.findById(req.params.id);
    if (form.verification.areaAdmin.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Area admin must approve before district admin can review'
      });
    }
    
    const updateData = {
      'verification.districtAdmin.status': status,
      'verification.districtAdmin.verifiedBy': verifiedBy,
      'verification.districtAdmin.verifiedAt': new Date(),
      'verification.districtAdmin.comments': comments || '',
      updatedAt: new Date()
    };
    
    // After district approves, move to state review (final approval at state)
    updateData.status = status === 'approved' ? 'state_review' : 'rejected';
    if (status === 'approved') {
      // Fill office use section
      const nowIso = new Date().toISOString();
      updateData.officeDate = nowIso;
      updateData.officeRegistrationDate = nowIso;
      // Use provided registrationNumber or generate a simple one
      const providedReg = req.body?.registrationNumber;
      if (providedReg && typeof providedReg === 'string' && providedReg.trim()) {
        updateData.registrationNumber = providedReg.trim();
      } else {
        updateData.registrationNumber = `JIH-${Date.now()}`;
      }
    }
    
    const updatedForm = await KarkunForm.findByIdAndUpdate(
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
      message: `Form ${status} by district admin. ${status === 'approved' ? 'Application fully approved!' : 'Form rejected.'}`,
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

    const form = await KarkunForm.findById(req.params.id);
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

    const updatedForm = await KarkunForm.findByIdAndUpdate(
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
    const forms = await KarkunForm.find({}).sort({ submittedAt: -1 });
    res.json({ success: true, message: 'Karkun forms for state retrieved successfully', count: forms.length, data: forms });
  } catch (error) {
    console.error('Get state Karkun forms error:', error);
    res.status(500).json({ success: false, message: 'Server error while retrieving state forms' });
  }
});

// ====== DELETE KARKUN FORM (Admin) ======
router.delete('/:id/admin', allowAdminOrUser, async (req, res) => {
  try {
    console.log('=== ADMIN DELETE ROUTE HIT ===');
    console.log('Admin delete request for Karkun form:', req.params.id);
    console.log('User info:', req.user);
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    
    const deletedForm = await KarkunForm.findByIdAndDelete(req.params.id);
    
    if (!deletedForm) {
      console.log('Karkun form not found with ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }
    
    console.log('Karkun form deleted successfully:', deletedForm._id);
    res.json({
      success: true,
      message: 'Form deleted successfully',
      data: deletedForm
    });
  } catch (error) {
    console.error('Delete Karkun form error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
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

// ====== DELETE KARKUN FORM (Protected) ======
router.delete('/:id', userAuth, async (req, res) => {
  try {
    const deletedForm = await KarkunForm.findByIdAndDelete(req.params.id);
    
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
    console.error('Delete Karkun form error:', error);
    
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
