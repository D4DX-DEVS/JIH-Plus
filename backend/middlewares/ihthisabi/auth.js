const jwt = require('jsonwebtoken');
const User = require('../../models/ihthisabi/User');
const UnitAdmin = require('../../models/ihthisabi/UnitAdmin');
const DistrictAdmin = require('../../models/ihthisabi/DistrictAdmin');


// Generate JWT token
const generateToken = async (userId) => {
  // Get user data to include location info in token
  const user = await User.findById(userId).select('ruknId unit name role');
  
  const payload = {
    userId,
    ruknId: user?.ruknId,
    unit: user?.unit,
    name: user?.name,
    role: user?.role
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully:', decoded);
      // Check if this is an admin token
      if (decoded.isAdmin && decoded.role === 'admin' && decoded.userId === 'admin') {
        // Create a mock user object for admin
        req.user = {
          _id: 'admin',
          role: 'admin',
          email: decoded.email,
          isAdmin: true,
          isActive: true
        };
        console.log('Admin token validated successfully:', req.user);
        return next();
      }

      // Check if this is a unit admin token
      if (decoded.role === 'unitAdmin' && decoded.userId) {
        console.log('Processing unit admin token for userId:', decoded.userId);
        const unitAdmin = await UnitAdmin.findById(decoded.userId).select('-password');

        if (!unitAdmin) {
          return res.status(401).json({
            success: false,
            message: 'No unit admin found with this token'
          });
        }

        if (!unitAdmin.isActive) {
          return res.status(401).json({
            success: false,
            message: 'Unit admin account is deactivated'
          });
        }

        req.user = {
          userId: unitAdmin._id,
          role: 'unitAdmin',
          unit: unitAdmin.unit,
          ruknId: unitAdmin.ruknId,
          name: unitAdmin.name,
          isActive: unitAdmin.isActive
        };
        console.log('Unit admin token validated successfully:', req.user);
        return next();
      }

      // Check if this is a district admin token
      if (decoded.role === 'districtAdmin' && decoded.userId) {
        console.log('Processing district admin token for userId:', decoded.userId);
        const districtAdmin = await DistrictAdmin.findById(decoded.userId).select('-password');

        if (!districtAdmin) {
          return res.status(401).json({
            success: false,
            message: 'No district admin found with this token'
          });
        }

        if (!districtAdmin.isActive) {
          return res.status(401).json({
            success: false,
            message: 'District admin account is deactivated'
          });
        }

        req.user = {
          userId: districtAdmin._id,
          role: 'districtAdmin',
          district: districtAdmin.district,
          ruknId: districtAdmin.ruknId,
          name: districtAdmin.name,
          isActive: districtAdmin.isActive
        };
        console.log('District admin token validated successfully:', req.user);
        return next();
      }

      // Handle regular user tokens
      if (decoded.userId && decoded.userId !== 'admin') {
        console.log('Processing regular user token for userId:', decoded.userId);
        // Get user from token
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'No user found with this token'
          });
        }

        if (!user.isActive) {
          return res.status(401).json({
            success: false,
            message: 'User account is deactivated'
          });
        }

        // Add location data from token to user object
        req.user = {
          ...user.toObject(),
         
          unit: decoded.unit || user.unit,
          name: decoded.name || user.name,
          role: decoded.role || user.role
        };
        return next();
      }

      // If token doesn't have userId or isAdmin, it's invalid
      console.log('Token validation failed - no matching criteria:', {
        hasUserId: !!decoded.userId,
        userId: decoded.userId,
        isAdmin: decoded.isAdmin,
        role: decoded.role
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });

    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('Authorize middleware - User role:', req.user?.role, 'Required roles:', roles);
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user?.role || 'unknown'} is not authorized to access this route`
      });
    }
    next();
  };
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Token invalid, but continue without user
        console.log('Invalid token in optional auth:', error.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};
    
module.exports = {
  generateToken,
  protect,
  authorize,
  optionalAuth
};
