const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const { query, withTransaction } = require('../config/database');
const logger = require('../utils/logger');

// Safely initialize Razorpay only if keys are present
let razorpay = null;
const isRazorpayEnabled = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;

if (isRazorpayEnabled) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    logger.info('✓ Razorpay payment service initialized');
  } catch (err) {
    logger.warn('Failed to initialize Razorpay:', err.message);
  }
} else {
  logger.warn('⚠ Razorpay payment service is DISABLED (missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET)');
}

// POST /api/payments/create-order - Create Razorpay order for product purchase
router.post('/create-order', authenticate, async (req, res) => {
  try {
    if (!isRazorpayEnabled) {
      return res.status(503).json({ 
        error: 'Payment service is currently disabled',
        message: 'Razorpay configuration is missing. Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET'
      });
    }

    const { amount, currency = 'INR', order_id, notes } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay uses paise
      currency,
      receipt: `order_${order_id || Date.now()}`,
      notes: notes || {}
    };

    const razorpayOrder = await razorpay.orders.create(options);

    if (order_id) {
      await query(
        'UPDATE orders SET razorpay_order_id = $1 WHERE id = $2',
        [razorpayOrder.id, order_id]
      );
    }

    res.json({
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    logger.error('Create Razorpay order error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// POST /api/payments/verify - Verify payment and update order
router.post('/verify', authenticate, async (req, res) => {
  try {
    if (!isRazorpayEnabled) {
      return res.status(503).json({ 
        error: 'Payment service is currently disabled',
        message: 'Razorpay configuration is missing'
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Update order payment status
    await query(
      `UPDATE orders SET
       payment_status = 'paid',
       razorpay_payment_id = $1,
       status = 'confirmed',
       updated_at = NOW()
       WHERE id = $2 OR razorpay_order_id = $3`,
      [razorpay_payment_id, order_id, razorpay_order_id]
    );

    // Add timeline entry
    const orderRes = await query('SELECT * FROM orders WHERE razorpay_order_id = $1', [razorpay_order_id]);
    if (orderRes.rows.length > 0) {
      const order = orderRes.rows[0];
      await query(
        `INSERT INTO order_timeline (order_id, status, message) VALUES ($1, 'confirmed', 'Payment received. Order confirmed.')`,
        [order.id]
      );

      // Update boutique revenue
      await query(
        'UPDATE boutiques SET total_revenue = total_revenue + $1 WHERE id = $2',
        [order.total_amount, order.boutique_id]
      );
    }

    res.json({ success: true, message: 'Payment verified successfully' });
  } catch (err) {
    logger.error('Verify payment error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// POST /api/payments/buy-credits - Purchase AI credits
router.post('/buy-credits', authenticate, async (req, res) => {
  try {
    if (!isRazorpayEnabled) {
      return res.status(503).json({ 
        error: 'Payment service is currently disabled',
        message: 'Razorpay configuration is missing. Credit purchase is not available'
      });
    }

    const { package_id, boutique_id } = req.body;

    const packageRes = await query('SELECT * FROM credit_packages WHERE id = $1 AND is_active = true', [package_id]);
    if (packageRes.rows.length === 0) return res.status(404).json({ error: 'Credit package not found' });

    const pkg = packageRes.rows[0];
    const totalCredits = pkg.credits + (pkg.bonus_credits || 0);

    const options = {
      amount: Math.round(pkg.price * 100),
      currency: 'INR',
      receipt: `credits_${boutique_id}_${Date.now()}`,
      notes: { type: 'credits', package_id, boutique_id, credits: totalCredits }
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.json({
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      package: pkg,
      total_credits: totalCredits
    });
  } catch (err) {
    logger.error('Buy credits error:', err);
    res.status(500).json({ error: 'Failed to initiate credit purchase' });
  }
});

// POST /api/payments/verify-credits - Verify credit purchase payment
router.post('/verify-credits', authenticate, async (req, res) => {
  try {
    if (!isRazorpayEnabled) {
      return res.status(503).json({ 
        error: 'Payment service is currently disabled',
        message: 'Razorpay configuration is missing'
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, boutique_id, package_id } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const packageRes = await query('SELECT * FROM credit_packages WHERE id = $1', [package_id]);
    if (packageRes.rows.length === 0) return res.status(404).json({ error: 'Package not found' });

    const pkg = packageRes.rows[0];
    const totalCredits = pkg.credits + (pkg.bonus_credits || 0);

    await withTransaction(async (client) => {
      // Add credits
      await client.query(
        'UPDATE boutiques SET ai_credits = ai_credits + $1 WHERE id = $2',
        [totalCredits, boutique_id]
      );

      // Record transaction
      await client.query(
        `INSERT INTO credit_transactions (boutique_id, type, credits, description, reference_id)
         VALUES ($1, 'purchase', $2, $3, $4)`,
        [boutique_id, totalCredits, `Purchased ${pkg.name}: ${pkg.credits} + ${pkg.bonus_credits} bonus credits`, razorpay_payment_id]
      );
    });

    const boutiqueRes = await query('SELECT ai_credits FROM boutiques WHERE id = $1', [boutique_id]);

    res.json({
      success: true,
      credits_added: totalCredits,
      total_credits: boutiqueRes.rows[0].ai_credits,
      message: `${totalCredits} AI credits added successfully!`
    });
  } catch (err) {
    logger.error('Verify credits payment error:', err);
    res.status(500).json({ error: 'Credit purchase verification failed' });
  }
});

// POST /api/payments/subscribe - Subscribe to a plan
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    if (!isRazorpayEnabled) {
      return res.status(503).json({ 
        error: 'Payment service is currently disabled',
        message: 'Razorpay configuration is missing. Subscription is not available'
      });
    }

    const { plan_id, boutique_id, period = 'monthly' } = req.body;

    const planRes = await query('SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true', [plan_id]);
    if (planRes.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });

    const plan = planRes.rows[0];
    const amount = period === 'yearly' ? plan.price_yearly : plan.price_monthly;

    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `sub_${boutique_id}_${Date.now()}`,
      notes: { type: 'subscription', plan_id, boutique_id, period }
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.json({
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      plan
    });
  } catch (err) {
    logger.error('Subscribe error:', err);
    res.status(500).json({ error: 'Failed to initiate subscription' });
  }
});

// POST /api/payments/verify-subscription
router.post('/verify-subscription', authenticate, async (req, res) => {
  try {
    if (!isRazorpayEnabled) {
      return res.status(503).json({ 
        error: 'Payment service is currently disabled',
        message: 'Razorpay configuration is missing'
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, boutique_id, plan_id, period } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const expiresAt = new Date();
    if (period === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    await query(
      `UPDATE boutiques SET subscription_plan_id = $1, subscription_status = 'active',
       subscription_expires_at = $2, updated_at = NOW() WHERE id = $3`,
      [plan_id, expiresAt, boutique_id]
    );

    res.json({ success: true, message: 'Subscription activated', expires_at: expiresAt });
  } catch (err) {
    logger.error('Verify subscription error:', err);
    res.status(500).json({ error: 'Subscription verification failed' });
  }
});

module.exports = router;
