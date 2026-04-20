const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { query } = require('../config/database');
const logger = require('../utils/logger');

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/dashboard - Platform analytics
router.get('/dashboard', async (req, res) => {
  try {
    const [users, boutiques, orders, revenue, credits] = await Promise.all([
      query('SELECT COUNT(*) as total, role FROM users GROUP BY role'),
      query("SELECT COUNT(*) as total, status FROM boutiques GROUP BY status"),
      query("SELECT COUNT(*) as total, status FROM orders GROUP BY status"),
      query("SELECT SUM(total_amount) as total FROM orders WHERE payment_status = 'paid'"),
      query("SELECT SUM(credits) as total FROM credit_transactions WHERE type = 'purchase'")
    ]);

    // Monthly revenue for chart
    const monthlyRevenue = await query(`
      SELECT DATE_TRUNC('month', created_at) as month, SUM(total_amount) as revenue, COUNT(*) as orders
      FROM orders WHERE payment_status = 'paid' AND created_at > NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month
    `);

    // Recent activity
    const recentBoutiques = await query(
      `SELECT b.*, u.name as owner_name FROM boutiques b
       JOIN users u ON u.id = b.owner_id ORDER BY b.created_at DESC LIMIT 5`
    );

    const recentOrders = await query(
      `SELECT o.*, u.name as customer_name, b.name as boutique_name FROM orders o
       JOIN users u ON u.id = o.customer_id
       JOIN boutiques b ON b.id = o.boutique_id
       ORDER BY o.created_at DESC LIMIT 10`
    );

    res.json({
      stats: {
        users: users.rows,
        boutiques: boutiques.rows,
        orders: orders.rows,
        total_revenue: revenue.rows[0]?.total || 0,
        total_credits_sold: credits.rows[0]?.total || 0
      },
      monthly_revenue: monthlyRevenue.rows,
      recent_boutiques: recentBoutiques.rows,
      recent_orders: recentOrders.rows
    });
  } catch (err) {
    logger.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/admin/boutiques - All boutiques management
router.get('/boutiques', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (status) {
      whereClause += ` AND b.status = $${paramCount++}`;
      params.push(status);
    }
    if (search) {
      whereClause += ` AND (b.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    const result = await query(
      `SELECT b.*, u.name as owner_name, u.email as owner_email,
       COUNT(p.id) as product_count, COUNT(o.id) as order_count
       FROM boutiques b
       JOIN users u ON u.id = b.owner_id
       LEFT JOIN products p ON p.boutique_id = b.id
       LEFT JOIN orders o ON o.boutique_id = b.id
       ${whereClause}
       GROUP BY b.id, u.name, u.email
       ORDER BY b.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const countRes = await query(
      `SELECT COUNT(*) FROM boutiques b JOIN users u ON u.id = b.owner_id ${whereClause}`,
      params
    );

    res.json({
      boutiques: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch boutiques' });
  }
});

// PATCH /api/admin/boutiques/:id/status - Approve/reject/suspend boutique
router.patch('/boutiques/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    const validStatuses = ['pending', 'active', 'suspended', 'rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await query(
      'UPDATE boutiques SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Boutique not found' });

    // Notify boutique owner
    const boutique = result.rows[0];
    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [boutique.owner_id, `Boutique ${status}`,
       `Your boutique "${boutique.name}" has been ${status}. ${reason || ''}`,
       status === 'active' ? 'success' : 'warning']
    );

    res.json({ boutique: result.rows[0], message: `Boutique ${status} successfully` });
  } catch (err) {
    logger.error('Update boutique status error:', err);
    res.status(500).json({ error: 'Failed to update boutique status' });
  }
});

// GET /api/admin/users - All users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (role) {
      whereClause += ` AND role = $${paramCount++}`;
      params.push(role);
    }
    if (search) {
      whereClause += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    const result = await query(
      `SELECT id, name, email, role, phone, is_active, last_login, created_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const countRes = await query(`SELECT COUNT(*) FROM users ${whereClause}`, params);

    res.json({
      users: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/admin/users/:id/status - Activate/deactivate user
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { is_active } = req.body;
    const result = await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, is_active',
      [is_active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0], message: `User ${is_active ? 'activated' : 'deactivated'}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// GET /api/admin/plans - Subscription plans
router.get('/plans', async (req, res) => {
  try {
    const result = await query('SELECT * FROM subscription_plans ORDER BY price_monthly');
    res.json({ plans: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// POST /api/admin/plans - Create plan
router.post('/plans', async (req, res) => {
  try {
    const { name, description, price_monthly, price_yearly, features, max_products, max_ai_credits } = req.body;
    const result = await query(
      `INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features, max_products, max_ai_credits)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description, price_monthly, price_yearly, JSON.stringify(features), max_products, max_ai_credits]
    );
    res.status(201).json({ plan: result.rows[0], message: 'Plan created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// PUT /api/admin/plans/:id - Update plan
router.put('/plans/:id', async (req, res) => {
  try {
    const { name, description, price_monthly, price_yearly, features, max_products, max_ai_credits, is_active } = req.body;
    const result = await query(
      `UPDATE subscription_plans SET name=$1, description=$2, price_monthly=$3, price_yearly=$4,
       features=$5, max_products=$6, max_ai_credits=$7, is_active=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [name, description, price_monthly, price_yearly, JSON.stringify(features), max_products, max_ai_credits, is_active, req.params.id]
    );
    res.json({ plan: result.rows[0], message: 'Plan updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// GET /api/admin/credit-packages - Credit packages
router.get('/credit-packages', async (req, res) => {
  try {
    const result = await query('SELECT * FROM credit_packages ORDER BY credits');
    res.json({ packages: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch credit packages' });
  }
});

// POST /api/admin/credit-packages - Create credit package
router.post('/credit-packages', async (req, res) => {
  try {
    const { name, credits, price, bonus_credits, is_popular } = req.body;
    const result = await query(
      'INSERT INTO credit_packages (name, credits, price, bonus_credits, is_popular) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, credits, price, bonus_credits || 0, is_popular || false]
    );
    res.status(201).json({ package: result.rows[0], message: 'Credit package created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create credit package' });
  }
});

// GET /api/admin/settings
router.get('/settings', async (req, res) => {
  try {
    const result = await query('SELECT * FROM platform_settings ORDER BY key');
    res.json({ settings: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/admin/settings
router.put('/settings', async (req, res) => {
  try {
    const { settings } = req.body; // Array of {key, value}
    const updates = settings.map(s =>
      query(
        'UPDATE platform_settings SET value = $1, updated_by = $2, updated_at = NOW() WHERE key = $3',
        [s.value, req.user.id, s.key]
      )
    );
    await Promise.all(updates);
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET /api/admin/orders - All orders
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    if (status) {
      whereClause += ` AND o.status = $1`;
      params.push(status);
    }

    const result = await query(
      `SELECT o.*, u.name as customer_name, b.name as boutique_name
       FROM orders o
       JOIN users u ON u.id = o.customer_id
       JOIN boutiques b ON b.id = o.boutique_id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({ orders: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST /api/admin/boutiques/:id/add-credits - Add AI credits to boutique
router.post('/boutiques/:id/add-credits', async (req, res) => {
  try {
    const { credits, reason } = req.body;
    await query(
      'UPDATE boutiques SET ai_credits = ai_credits + $1 WHERE id = $2',
      [credits, req.params.id]
    );
    await query(
      `INSERT INTO credit_transactions (boutique_id, type, credits, description)
       VALUES ($1, 'bonus', $2, $3)`,
      [req.params.id, credits, reason || 'Admin bonus credits']
    );
    res.json({ message: `${credits} credits added successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add credits' });
  }
});

module.exports = router;
