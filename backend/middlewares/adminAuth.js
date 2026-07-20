const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if the decoded token contains admin info
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Add admin info to request object
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = adminAuth;
