require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { pool } = require('./config/database');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const boutiqueRoutes = require('./routes/boutique');
const productRoutes = require('./routes/product');
const orderRoutes = require('./routes/order');
const customerRoutes = require('./routes/customer');
const aiRoutes = require('./routes/ai');
const paymentRoutes = require('./routes/payment');
const measurementRoutes = require('./routes/measurement');
const marketingRoutes = require('./routes/marketing');
const creditRoutes = require('./routes/credit');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
}

// Welcome route
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 AI Boutique Studio API is Live!', 
    docs: 'Check /api/health for system status',
    version: '1.0.0' 
  });
});

// Health check
app.get(['/health', '/api/health'], async (req, res) => {
  try {
    // If database connection is not established yet, handle gracefully
    if (!pool) {
       return res.json({ status: 'healthy', timestamp: new Date().toISOString(), db: 'local/sqlite' });
    }
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString(), db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', db: 'disconnected', error: err.message });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/boutiques', boutiqueRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/ai', aiRoutes);
// Conditionally load payment routes only if Razorpay keys are configured
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  app.use('/api/payments', paymentRoutes);
  logger.info('✓ Payment routes loaded');
} else {
  logger.warn('⚠ Payment routes DISABLED - Razorpay not configured');
  // Return 503 for payment endpoint attempts
  app.use('/api/payments', (req, res) => {
    res.status(503).json({ 
      error: 'Payment service is not available',
      message: 'Razorpay is not configured in this deployment'
    });
  });
}
app.use('/api/measurements', measurementRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/credits', creditRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 AI Boutique Studio API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Database URI: ${process.env.DATABASE_URL ? 'Configured' : 'Missing'}`);
});

module.exports = app;
