const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      'SELECT id, email, name, role, is_active, avatar_url FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    logger.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
    }
    next();
  };
};

const requireAdmin = requireRole('admin');
const requireOwner = requireRole('owner', 'admin');
const requireCustomer = requireRole('customer', 'owner', 'admin');

// Attach boutique to owner requests
const attachBoutique = async (req, res, next) => {
  try {
    if (req.user.role === 'owner') {
      const result = await query(
        'SELECT * FROM boutiques WHERE owner_id = $1 LIMIT 1',
        [req.user.id]
      );
      if (result.rows.length > 0) {
        req.boutique = result.rows[0];
      }
    }
    next();
  } catch (err) {
    logger.error('Attach boutique error:', err);
    next(err);
  }
};

module.exports = { authenticate, requireRole, requireAdmin, requireOwner, requireCustomer, attachBoutique };
