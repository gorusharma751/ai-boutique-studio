const express = require('express');
const productRouter = express.Router();
const { authenticate, requireOwner } = require('../middleware/auth');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'ai-boutique/products', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

productRouter.get('/', async (req, res) => {
  try {
    const { boutique_id, type, min_price, max_price, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE p.is_active = true';
    const params = [];
    let i = 1;
    if (boutique_id) { where += ` AND p.boutique_id = $${i++}`; params.push(boutique_id); }
    if (type) { where += ` AND p.type = $${i++}`; params.push(type); }
    if (min_price) { where += ` AND p.price >= $${i++}`; params.push(min_price); }
    if (max_price) { where += ` AND p.price <= $${i++}`; params.push(max_price); }
    if (search) { where += ` AND (p.name ILIKE $${i} OR p.description ILIKE $${i})`; params.push(`%${search}%`); i++; }
    const result = await query(
      `SELECT p.*, b.name as boutique_name, b.slug as boutique_slug FROM products p JOIN boutiques b ON b.id = p.boutique_id ${where} ORDER BY p.is_featured DESC, p.created_at DESC LIMIT $${i} OFFSET $${i+1}`,
      [...params, limit, offset]
    );
    res.json({ products: result.rows });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch products' }); }
});

productRouter.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, b.name as boutique_name, b.slug as boutique_slug, b.whatsapp_number FROM products p JOIN boutiques b ON b.id = p.boutique_id WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    await query('UPDATE products SET views = views + 1 WHERE id = $1', [req.params.id]);
    res.json({ product: result.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch product' }); }
});

productRouter.post('/', authenticate, requireOwner, async (req, res) => {
  try {
    const { boutique_id, name, description, type, price, sale_price, fabric, colors, sizes, images, thumbnail_url, category, customization_options, tags, stock, sku, ai_tryon_enabled } = req.body;
    const result = await query(
      `INSERT INTO products (boutique_id, name, description, type, price, sale_price, fabric, colors, sizes, images, thumbnail_url, category, customization_options, tags, stock, sku, ai_tryon_enabled) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [boutique_id, name, description, type, price, sale_price, fabric, JSON.stringify(colors||[]), JSON.stringify(sizes||[]), JSON.stringify(images||[]), thumbnail_url, category, JSON.stringify(customization_options||{}), JSON.stringify(tags||[]), stock||0, sku, ai_tryon_enabled!==false]
    );
    res.status(201).json({ product: result.rows[0], message: 'Product created' });
  } catch (err) { logger.error('Create product error:', err); res.status(500).json({ error: 'Failed to create product' }); }
});

productRouter.put('/:id', authenticate, requireOwner, async (req, res) => {
  try {
    const { name, description, price, sale_price, fabric, colors, sizes, images, thumbnail_url, stock, is_active, is_featured } = req.body;
    const result = await query(
      `UPDATE products SET name=COALESCE($1,name), description=COALESCE($2,description), price=COALESCE($3,price), sale_price=$4, fabric=COALESCE($5,fabric), stock=COALESCE($6,stock), is_active=COALESCE($7,is_active), is_featured=COALESCE($8,is_featured), updated_at=NOW() WHERE id=$9 RETURNING *`,
      [name, description, price, sale_price, fabric, stock, is_active, is_featured, req.params.id]
    );
    res.json({ product: result.rows[0], message: 'Product updated' });
  } catch (err) { res.status(500).json({ error: 'Failed to update product' }); }
});

productRouter.delete('/:id', authenticate, requireOwner, async (req, res) => {
  try {
    await query('UPDATE products SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
});

productRouter.post('/upload-image', authenticate, requireOwner, upload.array('images', 10), async (req, res) => {
  try {
    const urls = req.files.map(f => f.path);
    res.json({ images: urls });
  } catch (err) { res.status(500).json({ error: 'Upload failed' }); }
});

module.exports = productRouter;
