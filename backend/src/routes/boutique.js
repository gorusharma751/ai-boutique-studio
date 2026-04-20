const express = require('express');
const router = express.Router();
const { authenticate, requireOwner } = require('../middleware/auth');
const { query, withTransaction } = require('../config/database');
const logger = require('../utils/logger');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'ai-boutique/boutiques', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/boutiques - Public listing
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 12, search, city, featured } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE b.status = 'active'";
    const params = [];
    let paramCount = 1;

    if (search) {
      whereClause += ` AND (b.name ILIKE $${paramCount} OR b.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    if (city) {
      whereClause += ` AND b.city ILIKE $${paramCount}`;
      params.push(`%${city}%`);
      paramCount++;
    }
    if (featured === 'true') {
      whereClause += ' AND b.is_featured = true';
    }

    const result = await query(
      `SELECT b.id, b.name, b.slug, b.description, b.logo_url, b.banner_url, b.city, b.state,
       b.rating, b.total_reviews, b.is_featured, b.ai_tryon_enabled, b.ai_chatbot_enabled,
       b.whatsapp_number, COUNT(p.id) as product_count
       FROM boutiques b
       LEFT JOIN products p ON p.boutique_id = b.id AND p.is_active = true
       ${whereClause}
       GROUP BY b.id
       ORDER BY b.is_featured DESC, b.rating DESC, b.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const countRes = await query(
      `SELECT COUNT(*) FROM boutiques b ${whereClause}`,
      params
    );

    res.json({
      boutiques: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit)
    });
  } catch (err) {
    logger.error('Get boutiques error:', err);
    res.status(500).json({ error: 'Failed to fetch boutiques' });
  }
});

// GET /api/boutiques/:slug - Public boutique detail
router.get('/:slug', async (req, res) => {
  try {
    const result = await query(
      `SELECT b.*, u.name as owner_name
       FROM boutiques b
       JOIN users u ON u.id = b.owner_id
       WHERE b.slug = $1 AND b.status = 'active'`,
      [req.params.slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Boutique not found' });
    }

    const boutique = result.rows[0];

    // Get products
    const products = await query(
      `SELECT id, name, type, price, sale_price, thumbnail_url, images, fabric, colors, is_featured, ai_tryon_enabled
       FROM products WHERE boutique_id = $1 AND is_active = true ORDER BY is_featured DESC, created_at DESC`,
      [boutique.id]
    );

    // Get reviews
    const reviews = await query(
      `SELECT r.*, u.name as customer_name, u.avatar_url
       FROM reviews r JOIN users u ON u.id = r.customer_id
       WHERE r.boutique_id = $1 AND r.is_approved = true
       ORDER BY r.created_at DESC LIMIT 10`,
      [boutique.id]
    );

    res.json({ boutique, products: products.rows, reviews: reviews.rows });
  } catch (err) {
    logger.error('Get boutique detail error:', err);
    res.status(500).json({ error: 'Failed to fetch boutique' });
  }
});

// POST /api/boutiques - Create boutique (owner)
router.post('/', authenticate, requireOwner, async (req, res) => {
  try {
    const existing = await query('SELECT id FROM boutiques WHERE owner_id = $1', [req.user.id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You already have a boutique' });
    }

    const {
      name, description, phone, email, address, city, state, pincode,
      whatsapp_number, instagram_url, facebook_url, google_business_url
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Boutique name is required' });

    // Generate unique slug
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingSlug = await query('SELECT id FROM boutiques WHERE slug = $1', [slug]);
    if (existingSlug.rows.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const result = await query(
      `INSERT INTO boutiques (owner_id, name, slug, description, phone, email, address, city, state,
       pincode, whatsapp_number, instagram_url, facebook_url, google_business_url, status, ai_credits)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', 50)
       RETURNING *`,
      [req.user.id, name, slug, description, phone, email, address, city, state,
       pincode, whatsapp_number, instagram_url, facebook_url, google_business_url]
    );

    res.status(201).json({
      boutique: result.rows[0],
      message: 'Boutique created successfully! Pending admin approval.'
    });
  } catch (err) {
    logger.error('Create boutique error:', err);
    res.status(500).json({ error: 'Failed to create boutique' });
  }
});

// PUT /api/boutiques/:id - Update boutique
router.put('/:id', authenticate, requireOwner, async (req, res) => {
  try {
    const boutique = await query(
      'SELECT id, owner_id FROM boutiques WHERE id = $1',
      [req.params.id]
    );

    if (boutique.rows.length === 0) return res.status(404).json({ error: 'Boutique not found' });
    if (boutique.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      name, description, phone, email, address, city, state, pincode,
      whatsapp_number, instagram_url, facebook_url, google_business_url, google_maps_embed,
      ai_chatbot_enabled, ai_tryon_enabled, ai_stylist_enabled
    } = req.body;

    const result = await query(
      `UPDATE boutiques SET
       name = COALESCE($1, name), description = COALESCE($2, description),
       phone = COALESCE($3, phone), email = COALESCE($4, email),
       address = COALESCE($5, address), city = COALESCE($6, city),
       state = COALESCE($7, state), pincode = COALESCE($8, pincode),
       whatsapp_number = COALESCE($9, whatsapp_number),
       instagram_url = COALESCE($10, instagram_url),
       facebook_url = COALESCE($11, facebook_url),
       google_business_url = COALESCE($12, google_business_url),
       google_maps_embed = COALESCE($13, google_maps_embed),
       ai_chatbot_enabled = COALESCE($14, ai_chatbot_enabled),
       ai_tryon_enabled = COALESCE($15, ai_tryon_enabled),
       ai_stylist_enabled = COALESCE($16, ai_stylist_enabled),
       updated_at = NOW()
       WHERE id = $17 RETURNING *`,
      [name, description, phone, email, address, city, state, pincode,
       whatsapp_number, instagram_url, facebook_url, google_business_url, google_maps_embed,
       ai_chatbot_enabled, ai_tryon_enabled, ai_stylist_enabled, req.params.id]
    );

    res.json({ boutique: result.rows[0], message: 'Boutique updated successfully' });
  } catch (err) {
    logger.error('Update boutique error:', err);
    res.status(500).json({ error: 'Failed to update boutique' });
  }
});

// POST /api/boutiques/:id/upload-logo
router.post('/:id/upload-logo', authenticate, requireOwner, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    await query('UPDATE boutiques SET logo_url = $1, updated_at = NOW() WHERE id = $2', [req.file.path, req.params.id]);
    res.json({ logo_url: req.file.path, message: 'Logo uploaded successfully' });
  } catch (err) {
    logger.error('Upload logo error:', err);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// POST /api/boutiques/:id/upload-banner
router.post('/:id/upload-banner', authenticate, requireOwner, upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    await query('UPDATE boutiques SET banner_url = $1, updated_at = NOW() WHERE id = $2', [req.file.path, req.params.id]);
    res.json({ banner_url: req.file.path, message: 'Banner uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload banner' });
  }
});

// GET /api/boutiques/:id/dashboard - Owner dashboard stats
router.get('/:id/dashboard', authenticate, requireOwner, async (req, res) => {
  try {
    const [orders, revenue, products, customers, credits] = await Promise.all([
      query('SELECT COUNT(*) as total, status FROM orders WHERE boutique_id = $1 GROUP BY status', [req.params.id]),
      query('SELECT SUM(total_amount) as total FROM orders WHERE boutique_id = $1 AND payment_status = $2', [req.params.id, 'paid']),
      query('SELECT COUNT(*) as total FROM products WHERE boutique_id = $1 AND is_active = true', [req.params.id]),
      query('SELECT COUNT(DISTINCT customer_id) as total FROM orders WHERE boutique_id = $1', [req.params.id]),
      query('SELECT ai_credits FROM boutiques WHERE id = $1', [req.params.id])
    ]);

    const recentOrders = await query(
      `SELECT o.*, u.name as customer_name FROM orders o
       JOIN users u ON u.id = o.customer_id
       WHERE o.boutique_id = $1 ORDER BY o.created_at DESC LIMIT 5`,
      [req.params.id]
    );

    res.json({
      stats: {
        orders: orders.rows,
        total_revenue: revenue.rows[0]?.total || 0,
        total_products: products.rows[0]?.total || 0,
        total_customers: customers.rows[0]?.total || 0,
        ai_credits: credits.rows[0]?.ai_credits || 0
      },
      recent_orders: recentOrders.rows
    });
  } catch (err) {
    logger.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
