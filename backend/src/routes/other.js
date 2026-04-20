// ============================================================
// MEASUREMENT ROUTES
// ============================================================
const express = require('express');
const measurementRouter = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');
const logger = require('../utils/logger');

measurementRouter.get('/', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM measurements WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );
    res.json({ measurements: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch measurements' });
  }
});

measurementRouter.post('/', authenticate, async (req, res) => {
  try {
    const { name, chest, waist, hips, shoulder, sleeve_length, dress_length, neck, inseam, notes, boutique_id } = req.body;

    // Set as default if first measurement
    const existing = await query('SELECT id FROM measurements WHERE customer_id = $1', [req.user.id]);
    const isDefault = existing.rows.length === 0;

    const result = await query(
      `INSERT INTO measurements (customer_id, boutique_id, name, chest, waist, hips, shoulder, sleeve_length, dress_length, neck, inseam, notes, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.user.id, boutique_id, name || 'My Measurements', chest, waist, hips, shoulder, sleeve_length, dress_length, neck, inseam, notes, isDefault]
    );
    res.status(201).json({ measurement: result.rows[0], message: 'Measurements saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save measurements' });
  }
});

measurementRouter.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, chest, waist, hips, shoulder, sleeve_length, dress_length, neck, inseam, notes, is_default } = req.body;
    if (is_default) {
      await query('UPDATE measurements SET is_default = false WHERE customer_id = $1', [req.user.id]);
    }
    const result = await query(
      `UPDATE measurements SET name=COALESCE($1,name), chest=$2, waist=$3, hips=$4, shoulder=$5,
       sleeve_length=$6, dress_length=$7, neck=$8, inseam=$9, notes=$10, is_default=COALESCE($11,is_default), updated_at=NOW()
       WHERE id=$12 AND customer_id=$13 RETURNING *`,
      [name, chest, waist, hips, shoulder, sleeve_length, dress_length, neck, inseam, notes, is_default, req.params.id, req.user.id]
    );
    res.json({ measurement: result.rows[0], message: 'Measurements updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update measurements' });
  }
});

// Book measurement appointment
measurementRouter.post('/appointments', authenticate, async (req, res) => {
  try {
    const { boutique_id, scheduled_at, address, phone, notes } = req.body;
    const result = await query(
      `INSERT INTO measurement_appointments (customer_id, boutique_id, scheduled_at, address, phone, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, boutique_id, scheduled_at, address, phone, notes]
    );

    // Notify boutique owner
    const boutiqueRes = await query('SELECT owner_id, name FROM boutiques WHERE id = $1', [boutique_id]);
    if (boutiqueRes.rows.length > 0) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'New Measurement Appointment', $2, 'info')`,
        [boutiqueRes.rows[0].owner_id, `New measurement appointment booked at ${address} on ${new Date(scheduled_at).toLocaleDateString()}`]
      );
    }

    res.status(201).json({ appointment: result.rows[0], message: 'Appointment booked successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// GET boutique appointments (owner)
measurementRouter.get('/appointments/boutique/:boutique_id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT ma.*, u.name as customer_name, u.phone as customer_phone, u.email as customer_email
       FROM measurement_appointments ma
       JOIN users u ON u.id = ma.customer_id
       WHERE ma.boutique_id = $1 ORDER BY ma.scheduled_at ASC`,
      [req.params.boutique_id]
    );
    res.json({ appointments: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// ============================================================
// MARKETING ROUTES
// ============================================================
const marketingRouter = express.Router();
const { requireOwner } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// Coupons
marketingRouter.get('/coupons/:boutique_id', authenticate, requireOwner, async (req, res) => {
  try {
    const result = await query('SELECT * FROM coupons WHERE boutique_id = $1 ORDER BY created_at DESC', [req.params.boutique_id]);
    res.json({ coupons: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

marketingRouter.post('/coupons', authenticate, requireOwner, async (req, res) => {
  try {
    const { boutique_id, code, type, value, min_order_amount, max_discount, usage_limit, expires_at } = req.body;
    const result = await query(
      `INSERT INTO coupons (boutique_id, code, type, value, min_order_amount, max_discount, usage_limit, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [boutique_id, code.toUpperCase(), type, value, min_order_amount || 0, max_discount, usage_limit, expires_at]
    );
    res.status(201).json({ coupon: result.rows[0], message: 'Coupon created' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Coupon code already exists' });
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

marketingRouter.patch('/coupons/:id', authenticate, requireOwner, async (req, res) => {
  try {
    const { is_active } = req.body;
    const result = await query('UPDATE coupons SET is_active = $1 WHERE id = $2 RETURNING *', [is_active, req.params.id]);
    res.json({ coupon: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

// Validate coupon (public)
marketingRouter.post('/coupons/validate', async (req, res) => {
  try {
    const { boutique_id, code, order_amount } = req.body;
    const result = await query(
      `SELECT * FROM coupons WHERE boutique_id = $1 AND code = $2 AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (usage_limit IS NULL OR used_count < usage_limit)
       AND min_order_amount <= $3`,
      [boutique_id, code.toUpperCase(), order_amount]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invalid or expired coupon' });
    const c = result.rows[0];
    let discount = c.type === 'percentage' ? (order_amount * c.value / 100) : c.value;
    if (c.max_discount) discount = Math.min(discount, c.max_discount);
    res.json({ coupon: c, discount, message: `Coupon applied! You save ₹${discount.toFixed(2)}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

// Email Campaigns
marketingRouter.get('/campaigns/:boutique_id', authenticate, requireOwner, async (req, res) => {
  try {
    const result = await query('SELECT * FROM email_campaigns WHERE boutique_id = $1 ORDER BY created_at DESC', [req.params.boutique_id]);
    res.json({ campaigns: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

marketingRouter.post('/campaigns', authenticate, requireOwner, async (req, res) => {
  try {
    const { boutique_id, name, subject, content } = req.body;
    const result = await query(
      `INSERT INTO email_campaigns (boutique_id, name, subject, content) VALUES ($1,$2,$3,$4) RETURNING *`,
      [boutique_id, name, subject, content]
    );
    res.status(201).json({ campaign: result.rows[0], message: 'Campaign created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Send campaign
marketingRouter.post('/campaigns/:id/send', authenticate, requireOwner, async (req, res) => {
  try {
    const campaign = await query('SELECT * FROM email_campaigns WHERE id = $1', [req.params.id]);
    if (campaign.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });

    const c = campaign.rows[0];

    // Get customers who ordered from this boutique
    const customers = await query(
      `SELECT DISTINCT u.email, u.name FROM users u
       JOIN orders o ON o.customer_id = u.id
       WHERE o.boutique_id = $1`,
      [c.boutique_id]
    );

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    let sentCount = 0;
    for (const customer of customers.rows) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: customer.email,
          subject: c.subject,
          html: `<h2>Dear ${customer.name},</h2>${c.content}`
        });
        sentCount++;
      } catch (err) {
        logger.error(`Failed to send email to ${customer.email}:`, err);
      }
    }

    await query(
      `UPDATE email_campaigns SET status = 'sent', sent_count = $1, recipients_count = $2, sent_at = NOW() WHERE id = $3`,
      [sentCount, customers.rows.length, req.params.id]
    );

    res.json({ message: `Campaign sent to ${sentCount} customers`, sent_count: sentCount });
  } catch (err) {
    logger.error('Send campaign error:', err);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

// WhatsApp share link
marketingRouter.post('/whatsapp-share', authenticate, async (req, res) => {
  try {
    const { product_id, boutique_id } = req.body;
    const product = await query('SELECT name, price, thumbnail_url FROM products WHERE id = $1', [product_id]);
    const boutique = await query('SELECT name, whatsapp_number, slug FROM boutiques WHERE id = $1', [boutique_id]);

    if (product.rows.length === 0 || boutique.rows.length === 0) {
      return res.status(404).json({ error: 'Product or boutique not found' });
    }

    const p = product.rows[0];
    const b = boutique.rows[0];
    const message = `Check out this amazing dress! 👗\n\n*${p.name}*\nPrice: ₹${p.price}\n\nShop at ${b.name}: ${process.env.FRONTEND_URL}/boutique/${b.slug}`;
    const whatsappUrl = `https://wa.me/${b.whatsapp_number}?text=${encodeURIComponent(message)}`;

    res.json({ whatsapp_url: whatsappUrl, message });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate WhatsApp link' });
  }
});

// ============================================================
// CREDIT ROUTES
// ============================================================
const creditRouter = express.Router();

creditRouter.get('/packages', async (req, res) => {
  try {
    const result = await query('SELECT * FROM credit_packages WHERE is_active = true ORDER BY credits');
    res.json({ packages: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch credit packages' });
  }
});

creditRouter.get('/transactions/:boutique_id', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM credit_transactions WHERE boutique_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.params.boutique_id]
    );
    res.json({ transactions: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

creditRouter.get('/balance/:boutique_id', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT ai_credits FROM boutiques WHERE id = $1', [req.params.boutique_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Boutique not found' });
    res.json({ credits: result.rows[0].ai_credits });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch credit balance' });
  }
});

// ============================================================
// CUSTOMER ROUTES
// ============================================================
const customerRouter = express.Router();

customerRouter.get('/profile', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, phone, avatar_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const orders = await query(
      'SELECT COUNT(*) as total_orders, SUM(total_amount) as total_spent FROM orders WHERE customer_id = $1 AND payment_status = $2',
      [req.user.id, 'paid']
    );
    res.json({ user: result.rows[0], stats: orders.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

customerRouter.get('/notifications', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
    res.json({ notifications: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

customerRouter.get('/unread-count', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

module.exports = { measurementRouter, marketingRouter, creditRouter, customerRouter };
