-- AI Boutique Studio - Complete Database Schema
-- Run this on Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'owner', 'customer')),
  google_id VARCHAR(255) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  email_verify_token VARCHAR(255),
  reset_password_token VARCHAR(255),
  reset_password_expires TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- SUBSCRIPTION PLANS
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  features JSONB DEFAULT '[]',
  max_products INTEGER DEFAULT 50,
  max_ai_credits INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- BOUTIQUES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS boutiques (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  images JSONB DEFAULT '[]',
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  country VARCHAR(100) DEFAULT 'India',
  google_business_url TEXT,
  google_maps_embed TEXT,
  google_place_id VARCHAR(255),
  whatsapp_number VARCHAR(20),
  instagram_url TEXT,
  facebook_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  ai_chatbot_enabled BOOLEAN DEFAULT true,
  ai_tryon_enabled BOOLEAN DEFAULT true,
  ai_stylist_enabled BOOLEAN DEFAULT true,
  subscription_plan_id UUID REFERENCES subscription_plans(id),
  subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
  subscription_expires_at TIMESTAMP,
  ai_credits INTEGER DEFAULT 50,
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('stitched', 'custom', 'unstitched')),
  price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2),
  fabric VARCHAR(100),
  colors JSONB DEFAULT '[]',
  sizes JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  thumbnail_url TEXT,
  customization_options JSONB DEFAULT '{}',
  category VARCHAR(100),
  tags JSONB DEFAULT '[]',
  stock INTEGER DEFAULT 0,
  sku VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  ai_tryon_enabled BOOLEAN DEFAULT true,
  views INTEGER DEFAULT 0,
  total_sold INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- MEASUREMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  boutique_id UUID REFERENCES boutiques(id),
  name VARCHAR(100) DEFAULT 'My Measurements',
  chest DECIMAL(5,2),
  waist DECIMAL(5,2),
  hips DECIMAL(5,2),
  shoulder DECIMAL(5,2),
  sleeve_length DECIMAL(5,2),
  dress_length DECIMAL(5,2),
  neck DECIMAL(5,2),
  inseam DECIMAL(5,2),
  notes TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- MEASUREMENT APPOINTMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS measurement_appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES users(id),
  boutique_id UUID NOT NULL REFERENCES boutiques(id),
  scheduled_at TIMESTAMP NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES users(id),
  boutique_id UUID NOT NULL REFERENCES boutiques(id),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled', 'refunded')),
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  delivery_charge DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  coupon_code VARCHAR(50),
  measurement_id UUID REFERENCES measurements(id),
  delivery_address JSONB NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method VARCHAR(50),
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  customization_notes TEXT,
  estimated_delivery TIMESTAMP,
  delivered_at TIMESTAMP,
  tracking_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ORDER HISTORY / TIMELINE
-- =====================================================
CREATE TABLE IF NOT EXISTS order_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  message TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- AI TRY-ON IMAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_tryon_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES users(id),
  boutique_id UUID REFERENCES boutiques(id),
  product_id UUID REFERENCES products(id),
  customer_photo_url TEXT NOT NULL,
  product_image_url TEXT NOT NULL,
  generated_image_url TEXT,
  status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  credits_used INTEGER DEFAULT 2,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- AI CHAT CONVERSATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES users(id),
  boutique_id UUID REFERENCES boutiques(id),
  session_id VARCHAR(255),
  messages JSONB DEFAULT '[]',
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- AI CREDIT PACKAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  credits INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  bonus_credits INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- CREDIT TRANSACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'usage', 'bonus', 'refund')),
  credits INTEGER NOT NULL,
  description TEXT,
  reference_id VARCHAR(255),
  balance_after INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- COUPONS
-- =====================================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(boutique_id, code)
);

-- =====================================================
-- REVIEWS
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES users(id),
  boutique_id UUID REFERENCES boutiques(id),
  product_id UUID REFERENCES products(id),
  order_id UUID REFERENCES orders(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(255),
  comment TEXT,
  images JSONB DEFAULT '[]',
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- EMAIL CAMPAIGNS
-- =====================================================
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PLATFORM SETTINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  type VARCHAR(20) DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_boutiques_owner ON boutiques(owner_id);
CREATE INDEX IF NOT EXISTS idx_boutiques_status ON boutiques(status);
CREATE INDEX IF NOT EXISTS idx_boutiques_slug ON boutiques(slug);
CREATE INDEX IF NOT EXISTS idx_products_boutique ON products(boutique_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_boutique ON orders(boutique_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_measurements_customer ON measurements(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_boutique ON credit_transactions(boutique_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- =====================================================
-- DEFAULT DATA
-- =====================================================
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features, max_products, max_ai_credits) VALUES
('Starter', 'Perfect for new boutiques', 999, 9990, '["50 Products", "50 AI Credits/month", "Basic Analytics", "WhatsApp Share", "Email Support"]', 50, 50),
('Professional', 'For growing boutiques', 2499, 24990, '["500 Products", "200 AI Credits/month", "Advanced Analytics", "AI Chatbot", "AI Try-On", "Email Campaigns", "Priority Support"]', 500, 200),
('Enterprise', 'For established boutiques', 4999, 49990, '["Unlimited Products", "500 AI Credits/month", "Full Analytics", "All AI Features", "Custom Domain", "Dedicated Support", "API Access"]', -1, 500)
ON CONFLICT DO NOTHING;

INSERT INTO credit_packages (name, credits, price, bonus_credits, is_popular) VALUES
('Starter Pack', 50, 99, 0, false),
('Value Pack', 200, 349, 20, true),
('Pro Pack', 500, 799, 75, false)
ON CONFLICT DO NOTHING;

INSERT INTO platform_settings (key, value, type, description) VALUES
('tryon_credit_cost', '2', 'number', 'AI credits consumed per try-on'),
('chatbot_credit_cost', '1', 'number', 'AI credits consumed per chatbot message'),
('platform_commission', '5', 'number', 'Platform commission percentage on orders'),
('trial_days', '14', 'number', 'Free trial duration in days'),
('max_images_per_product', '10', 'number', 'Maximum product images allowed'),
('maintenance_mode', 'false', 'boolean', 'Enable/disable maintenance mode')
ON CONFLICT (key) DO NOTHING;
