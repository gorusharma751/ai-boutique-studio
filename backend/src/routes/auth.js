const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/email');
const crypto = require('crypto');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer', phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check existing user
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const allowedRoles = ['customer', 'owner'];
    const userRole = allowedRoles.includes(role) ? role : 'customer';

    const passwordHash = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, phone, email_verify_token)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, created_at`,
      [name, email.toLowerCase(), passwordHash, userRole, phone, verifyToken]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name).catch(err => logger.error('Welcome email error:', err));

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    logger.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query(
      'SELECT id, name, email, password_hash, role, is_active, avatar_url FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account suspended. Contact support.' });
    }

    if (!user.password_hash) {
      return res.status(400).json({ error: 'Please login with Google' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_url: user.avatar_url }
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential, role = 'customer' } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Find or create user
    let result = await query(
      'SELECT id, name, email, role, is_active, avatar_url FROM users WHERE google_id = $1 OR email = $2',
      [googleId, email.toLowerCase()]
    );

    let user;
    if (result.rows.length === 0) {
      const allowedRoles = ['customer', 'owner'];
      const userRole = allowedRoles.includes(role) ? role : 'customer';

      result = await query(
        `INSERT INTO users (name, email, google_id, avatar_url, role, email_verified)
         VALUES ($1, $2, $3, $4, $5, true) RETURNING id, name, email, role, avatar_url`,
        [name, email.toLowerCase(), googleId, picture, userRole]
      );
      user = result.rows[0];

      sendWelcomeEmail(user.email, user.name).catch(err => logger.error('Welcome email error:', err));
    } else {
      user = result.rows[0];
      if (!user.is_active) {
        return res.status(403).json({ error: 'Account suspended' });
      }
      // Update Google ID if not set
      await query(
        'UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2), last_login = NOW() WHERE id = $3',
        [googleId, picture, user.id]
      );
    }

    const token = generateToken(user.id);

    res.json({
      message: 'Google login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_url: user.avatar_url }
    });
  } catch (err) {
    logger.error('Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.avatar_url, u.created_at,
       b.id as boutique_id, b.name as boutique_name, b.status as boutique_status, b.ai_credits
       FROM users u
       LEFT JOIN boutiques b ON b.owner_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    logger.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await query('SELECT id, name FROM users WHERE email = $1', [email.toLowerCase()]);

    if (result.rows.length === 0) {
      return res.json({ message: 'If email exists, reset link sent' });
    }

    const user = result.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
      [resetToken, expires, user.id]
    );

    await sendPasswordResetEmail(email, user.name, resetToken);
    res.json({ message: 'Password reset link sent to your email' });
  } catch (err) {
    logger.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    const result = await query(
      'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await query(
      'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
      [passwordHash, result.rows[0].id]
    );

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    logger.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const result = await query(
      'UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), updated_at = NOW() WHERE id = $3 RETURNING id, name, email, phone, avatar_url, role',
      [name, phone, req.user.id]
    );
    res.json({ user: result.rows[0], message: 'Profile updated' });
  } catch (err) {
    logger.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
