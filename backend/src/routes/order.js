const express = require('express');
const router = express.Router();
const { authenticate, requireOwner } = require('../middleware/auth');
const { query, withTransaction } = require('../config/database');
const logger = require('../utils/logger');
const { sendOrderConfirmationEmail, sendOrderStatusEmail } = require('../services/email');
const { v4: uuidv4 } = require('uuid');

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ABS-${timestamp}-${random}`;
};

// POST /api/orders - Place order
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      boutique_id, items, delivery_address, measurement_id,
      coupon_code, customization_notes, payment_method
    } = req.body;

    if (!boutique_id || !items?.length || !delivery_address) {
      return res.status(400).json({ error: 'Boutique, items and delivery address are required' });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await query('SELECT id, name, price, sale_price, thumbnail_url FROM products WHERE id = $1 AND is_active = true', [item.product_id]);
      if (product.rows.length === 0) return res.status(400).json({ error: `Product ${item.product_id} not found` });

      const p = product.rows[0];
      const unitPrice = p.sale_price || p.price;
      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product_id: p.id, name: p.name, thumbnail_url: p.thumbnail_url,
        quantity: item.quantity, unit_price: unitPrice, total: itemTotal,
        size: item.size, color: item.color, customization: item.customization
      });
    }

    // Apply coupon
    let discountAmount = 0;
    if (coupon_code) {
      const coupon = await query(
        `SELECT * FROM coupons WHERE boutique_id = $1 AND code = $2 AND is_active = true
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (usage_limit IS NULL OR used_count < usage_limit)
         AND min_order_amount <= $3`,
        [boutique_id, coupon_code.toUpperCase(), subtotal]
      );

      if (coupon.rows.length > 0) {
        const c = coupon.rows[0];
        if (c.type === 'percentage') {
          discountAmount = (subtotal * c.value) / 100;
          if (c.max_discount) discountAmount = Math.min(discountAmount, c.max_discount);
        } else {
          discountAmount = c.value;
        }
        await query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1', [c.id]);
      }
    }

    const taxAmount = (subtotal - discountAmount) * 0.05; // 5% GST
    const deliveryCharge = subtotal > 999 ? 0 : 99;
    const totalAmount = subtotal - discountAmount + taxAmount + deliveryCharge;

    const result = await withTransaction(async (client) => {
      const orderRes = await client.query(
        `INSERT INTO orders (order_number, customer_id, boutique_id, items, subtotal,
         discount_amount, tax_amount, delivery_charge, total_amount, coupon_code,
         measurement_id, delivery_address, payment_method, customization_notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [generateOrderNumber(), req.user.id, boutique_id, JSON.stringify(orderItems),
         subtotal, discountAmount, taxAmount, deliveryCharge, totalAmount, coupon_code,
         measurement_id, JSON.stringify(delivery_address), payment_method, customization_notes]
      );

      const order = orderRes.rows[0];

      // Add timeline entry
      await client.query(
        `INSERT INTO order_timeline (order_id, status, message) VALUES ($1, 'pending', 'Order placed successfully')`,
        [order.id]
      );

      // Update boutique stats
      await client.query(
        'UPDATE boutiques SET total_orders = total_orders + 1 WHERE id = $1',
        [boutique_id]
      );

      return order;
    });

    // Send confirmation email (non-blocking)
    sendOrderConfirmationEmail(req.user.email, req.user.name, result).catch(err =>
      logger.error('Order email error:', err)
    );

    // Send notification to boutique owner
    const boutiqueRes = await query('SELECT owner_id FROM boutiques WHERE id = $1', [boutique_id]);
    if (boutiqueRes.rows.length > 0) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, 'New Order Received', $2, 'info', $3)`,
        [boutiqueRes.rows[0].owner_id, `New order ${result.order_number} received`, `/owner/orders/${result.id}`]
      );
    }

    res.status(201).json({ order: result, message: 'Order placed successfully!' });
  } catch (err) {
    logger.error('Place order error:', err);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// GET /api/orders - Get orders (filtered by role)
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, boutique_id } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let i = 1;

    if (req.user.role === 'customer') {
      whereClause += ` AND o.customer_id = $${i++}`; params.push(req.user.id);
    } else if (req.user.role === 'owner') {
      const bResult = await query('SELECT id FROM boutiques WHERE owner_id = $1', [req.user.id]);
      if (bResult.rows.length > 0) {
        whereClause += ` AND o.boutique_id = $${i++}`; params.push(bResult.rows[0].id);
      }
    }

    if (status) { whereClause += ` AND o.status = $${i++}`; params.push(status); }
    if (boutique_id && req.user.role === 'admin') { whereClause += ` AND o.boutique_id = $${i++}`; params.push(boutique_id); }

    const result = await query(
      `SELECT o.*, u.name as customer_name, u.phone as customer_phone,
       b.name as boutique_name
       FROM orders o
       JOIN users u ON u.id = o.customer_id
       JOIN boutiques b ON b.id = o.boutique_id
       ${whereClause}
       ORDER BY o.created_at DESC LIMIT $${i} OFFSET $${i+1}`,
      [...params, limit, offset]
    );

    res.json({ orders: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id - Order detail with timeline
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
       b.name as boutique_name, b.phone as boutique_phone, b.whatsapp_number
       FROM orders o
       JOIN users u ON u.id = o.customer_id
       JOIN boutiques b ON b.id = o.boutique_id
       WHERE o.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const order = result.rows[0];

    // Check access
    if (req.user.role === 'customer' && order.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const timeline = await query(
      `SELECT ot.*, u.name as updated_by_name FROM order_timeline ot
       LEFT JOIN users u ON u.id = ot.created_by
       WHERE ot.order_id = $1 ORDER BY ot.created_at ASC`,
      [order.id]
    );

    res.json({ order, timeline: timeline.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status', authenticate, requireOwner, async (req, res) => {
  try {
    const { status, message, tracking_number } = req.body;
    const validStatuses = ['confirmed', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updates = ['status = $1', 'updated_at = NOW()'];
    const params = [status];
    let paramCount = 2;

    if (tracking_number) { updates.push(`tracking_number = $${paramCount++}`); params.push(tracking_number); }
    if (status === 'delivered') { updates.push(`delivered_at = NOW()`); }

    params.push(req.params.id);

    const result = await query(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    // Add timeline entry
    await query(
      `INSERT INTO order_timeline (order_id, status, message, created_by) VALUES ($1,$2,$3,$4)`,
      [req.params.id, status, message || `Order status updated to ${status}`, req.user.id]
    );

    // Notify customer
    const order = result.rows[0];
    await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, 'Order Update', $2, 'info', $3)`,
      [order.customer_id, `Your order ${order.order_number} is now ${status}`, `/customer/orders/${order.id}`]
    );

    res.json({ order: result.rows[0], message: 'Order status updated' });
  } catch (err) {
    logger.error('Update order status error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

module.exports = router;
