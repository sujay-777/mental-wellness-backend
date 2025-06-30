const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Therapist = require('../models/Therapist');

const auth = async function(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if token has required fields
    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({ message: 'Invalid token structure' });
    }

    let user = null;
    
    if (decoded.role === 'therapist') {
      user = await Therapist.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ message: 'Therapist not found' });
      }
      req.user = user; // Use req.user for consistency
      req.user.role = 'therapist'; // Ensure role is set
    } else if (decoded.role === 'user' || decoded.role === 'admin') {
      user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      req.user = user;
    } else {
      return res.status(401).json({ message: 'Invalid user role' });
    }
    
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please login again' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Auth middleware error:', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    next();
  };
};

module.exports = { auth, checkRole };