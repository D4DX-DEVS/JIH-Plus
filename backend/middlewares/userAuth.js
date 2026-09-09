const { verifyTenantJwt } = require('../config/tenantContext');

const userAuth = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify token
    const decoded = verifyTenantJwt(token, req);
    
    // Check if the decoded token contains user info
    if (!decoded.isUser) {
      return res.status(403).json({ message: 'Access denied. User privileges required.' });
    }

    // Add user info to request object
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = userAuth;
