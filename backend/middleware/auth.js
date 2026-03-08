/**
 * Arbre IT Support and Solution
 * Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const { config } = require('../config');
const auditLogger = require('./audit-logger');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
        organization: 'Arbre IT Support and Solution'
      });
    }

    const decoded = jwt.verify(token, config.security.jwtSecret);
    
    req.user = {
      id: decoded.userId,
      role: decoded.role || 'standard',
      email: decoded.email
    };
    
    req.sessionId = decoded.sessionId || `sess_${Date.now()}`;
    
    auditLogger.info('User authenticated', {
      userId: req.user.id,
      role: req.user.role,
      path: req.path
    });

    next();
  } catch (error) {
    auditLogger.warn('Authentication failed', {
      error: error.message,
      ip: req.ip,
      path: req.path
    });
    
    res.status(401).json({
      error: 'Invalid token',
      organization: 'Arbre IT Support and Solution'
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      auditLogger.warn('Unauthorized access attempt', {
        userId: req.user?.id,
        requiredRoles: roles,
        actualRole: req.user?.role
      });
      
      return res.status(403).json({
        error: 'Insufficient privileges',
        organization: 'Arbre IT Support and Solution'
      });
    }
    next();
  };
};

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
