const jwt = require('jsonwebtoken');
const userAuth = require('./userAuth');
const adminAuth = require('./adminAuth');

const unifiedAuth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided, authorization denied' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify token with JWT_SECRET (both admin and user tokens use the same secret)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if it's an admin token or user token
      if (decoded.isAdmin) {
        // This is an admin token - set user info from admin data
        req.user = {
          role: 'admin',
          email: decoded.email,
          isAdmin: true
        };
      } else {
        // This is a user token - use as is
        req.user = decoded;
      }
      
      return next();
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token is not valid' 
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

module.exports = unifiedAuth;
