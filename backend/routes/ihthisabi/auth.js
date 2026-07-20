const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../../models/ihthisabi/User');
const UnitAdmin = require('../../models/ihthisabi/UnitAdmin');
const { generateToken, protect } = require('../../middlewares/ihthisabi/auth');
const { validate, schemas } = require('../../middlewares/ihthisabi/validation');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

const router = express.Router();

// @desc    Unified Login - Auto-detects Unit Admin or Member
// @route   POST /api/auth/unified-login
// @access  Public
router.post('/unified-login', async (req, res) => {
  try {
    const { ruknId } = req.body;

    console.log('Unified login attempt with RUKN ID:', ruknId);

    // Validate required field
    if (!ruknId) {
      return res.status(400).json({
        success: false,
        message: 'RUKN ID is required'
      });
    }

    // Ensure database connection is ready before querying to avoid buffer timeouts
    if (ihthisabiConnection.readyState !== 1) {
      console.error(
        'Unified login blocked: IHTHISABI MongoDB not connected',
        { readyState: ihthisabiConnection.readyState }
      );
      return res.status(503).json({
        success: false,
        message: 'Login temporarily unavailable. Please try again in a moment.'
      });
    }

    // First, check if it's a Unit Admin
    const UnitAdmin = require('../../models/ihthisabi/UnitAdmin');
    const unitAdmin = await UnitAdmin.findOne({ ruknId: ruknId });

    if (unitAdmin) {
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
          ruknId: unitAdmin.ruknId,
          name: unitAdmin.name
        },
        process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
      );

      console.log('Unit Admin login successful:', unitAdmin.name, unitAdmin.ruknId);

      return res.json({
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
    }

    // If not a Unit Admin, check if it's a regular Member
    const user = await User.findOne({
      ruknId: ruknId,
      role: 'rukn'
    }).populate('abroadCountry');

    if (!user) {
      console.log('No user found with RUKN ID:', ruknId);
      return res.status(401).json({
        success: false,
        message: 'Invalid RUKN ID. Please check your credentials.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account is deactivated. Please contact admin.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = await generateToken(user._id);

    console.log('Member login successful:', user.name, user.ruknId);

    return res.json({
      success: true,
      message: 'Member login successful',
      data: {
        user: {
          id: user._id,
          role: user.role,
          ruknId: user.ruknId,
          name: user.name,
          gender: user.gender,
          unit: user.unit,
          district: user.district,
          area: user.area,
          contactNo: user.contactNo,
          emailId: user.emailId,
          country: user.country,
          isAbroad: user.isAbroad,
          abroadCountry: user.abroadCountry ? { _id: user.abroadCountry._id, title: user.abroadCountry.title } : null
        },
        token
      }
    });
  } catch (error) {
    console.error('Unified login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @desc    Admin Login
// @route   POST /api/auth/admin/login
// @access  Public
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("IHTHISABI Admin login request", email, password);
    console.log("Expected email:", process.env.IHTHISABI_ADMIN_EMAIL);
    console.log("Expected password:", process.env.IHTHISABI_ADMIN_PASSWORD);
    console.log("All env vars:", Object.keys(process.env).filter(key => key.includes('ADMIN')));
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    // Check if email matches IHTHISABI admin email from env
    if (email !== process.env.IHTHISABI_ADMIN_EMAIL) {
      console.log("Email mismatch:", email, "!=", process.env.IHTHISABI_ADMIN_EMAIL);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check if password matches IHTHISABI admin password from env (plain text comparison)
    if (password !== process.env.IHTHISABI_ADMIN_PASSWORD) {
      console.log("Password mismatch:", password, "!=", process.env.IHTHISABI_ADMIN_PASSWORD);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token with consistent structure
    const token = jwt.sign(
      { 
        userId: 'admin',
        email: process.env.IHTHISABI_ADMIN_EMAIL || 'admin@ihthisabi.com', 
        isAdmin: true,
        role: 'admin'
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    // Decode the token to verify its contents
    const decodedToken = jwt.decode(token);
    console.log('IHTHISABI Admin login successful - Token generated:', {
      hasSecret: !!process.env.JWT_SECRET,
      expireTime: process.env.JWT_EXPIRE || '30d',
      tokenLength: token.length,
      decodedContents: decodedToken
    });

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        user: {
          email: process.env.IHTHISABI_ADMIN_EMAIL || 'admin@ihthisabi.com',
          role: 'admin',
          isAdmin: true
        }
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    // Check if it's an admin user (from JWT token)
    if (req.user.isAdmin && req.user.email === process.env.IHTHISABI_ADMIN_EMAIL) {
      // Get token from header and decode to get issued time (iat)
      let lastLogin = new Date(); // Default to current time
      
      try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
          const decoded = jwt.decode(token);
          if (decoded && decoded.iat) {
            // iat is in seconds, convert to milliseconds
            lastLogin = new Date(decoded.iat * 1000);
          }
        }
      } catch (e) {
        console.log('Could not decode token for lastLogin:', e.message);
        // Use current time as fallback
        lastLogin = new Date();
      }
      
      return res.json({
        success: true,
        data: {
          user: {
            id: 'admin',
            role: 'admin',
            username: 'admin',
            email: process.env.IHTHISABI_ADMIN_EMAIL || 'admin@ihthisabi.com',
            name: 'Administrator',
            isAdmin: true,
            lastLogin: lastLogin
          }
        }
      });
    }

    // Check if it's a unitAdmin
    if (req.user.role === 'unitAdmin' && req.user.userId) {
      const UnitAdmin = require('../../models/ihthisabi/UnitAdmin');
      const unitAdmin = await UnitAdmin.findById(req.user.userId);

      if (!unitAdmin) {
        return res.status(404).json({
          success: false,
          message: 'Unit admin not found'
        });
      }

      return res.json({
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
            lastLogin: unitAdmin.lastLogin
          }
        }
      });
    }

    // Regular user from database
    const user = await User.findById(req.user._id).populate('abroadCountry');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          role: user.role,
          ruknId: user.ruknId,
          unit: user.unit,
          name: user.name,
          district: user.district,
          area: user.area,
          contactNo: user.contactNo,
          emailId: user.emailId,
          country: user.country,
          isAbroad: user.isAbroad,
          abroadCountry: user.abroadCountry ? { _id: user.abroadCountry._id, title: user.abroadCountry.title } : null,
          lastLogin: user.lastLogin
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get help desk context for current user
// @route   GET /api/auth/helpdesk
// @access  Private
router.get('/helpdesk', protect, async (req, res) => {
  try {
    let unitAdmin = null;

    if (req.user.role === 'rukn' && req.user.unit) {
      const matchedUnitAdmin = await UnitAdmin.findOne({
        unit: req.user.unit,
        isActive: true
      }).select('name ruknId unit district area contactNo emailId');

      if (matchedUnitAdmin) {
        unitAdmin = {
          id: matchedUnitAdmin._id,
          name: matchedUnitAdmin.name,
          unit: matchedUnitAdmin.unit,
          district: matchedUnitAdmin.district,
          area: matchedUnitAdmin.area,
          contactNo: matchedUnitAdmin.contactNo,
          emailId: matchedUnitAdmin.emailId
        };
      }
    }

    return res.json({
      success: true,
      data: {
        role: req.user.role,
        unitAdmin
      }
    });
  } catch (error) {
    console.error('Get help desk context error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const allowedUpdates = ['district', 'area', 'unit', 'name', 'contactNo', 'emailId', 'country'];
    const updates = {};

    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    // Only allow updates for rukn users
    if (req.user.role !== 'rukn') {
      return res.status(403).json({
        success: false,
        message: 'Only rukn users can update their profile'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          role: user.role,
          username: user.username,
          district: user.district,
          area: user.area,
          unit: user.unit,
          name: user.name
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
// @route   PUT /api/auth/change-password
// @access  Private
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

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

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

module.exports = router;
