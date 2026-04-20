const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"AI Boutique Studio" <noreply@aiboutiquestudio.com>',
      to,
      subject,
      html
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error(`Email send failed to ${to}:`, err.message);
    throw err;
  }
};

const sendWelcomeEmail = async (email, name) => {
  await sendEmail({
    to: email,
    subject: 'Welcome to AI Boutique Studio! 🎉',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:28px;">AI Boutique Studio</h1>
          <p style="color:#e9d5ff;margin:8px 0 0;">Your Fashion. Reimagined with AI.</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#1f2937;">Welcome, ${name}! 👋</h2>
          <p style="color:#6b7280;line-height:1.6;">Thank you for joining AI Boutique Studio — India's premier AI-powered boutique marketplace.</p>
          <p style="color:#6b7280;line-height:1.6;">Start exploring hundreds of boutiques, try on dresses virtually, and get personalized fashion advice from our AI stylist.</p>
          <a href="${process.env.FRONTEND_URL}" style="display:inline-block;background:#7c3aed;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Explore Now →</a>
        </div>
        <div style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">© 2024 AI Boutique Studio. All rights reserved.</p>
        </div>
      </div>
    `
  });
};

const sendOrderConfirmationEmail = async (email, name, order) => {
  await sendEmail({
    to: email,
    subject: `Order Confirmed — ${order.order_number} 🎉`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#7c3aed;padding:32px;text-align:center;">
          <h1 style="color:#fff;margin:0;">Order Confirmed!</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1f2937;">Hi ${name},</h2>
          <p style="color:#6b7280;">Your order has been placed successfully!</p>
          <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;">
            <p style="margin:4px 0;"><strong>Order Number:</strong> ${order.order_number}</p>
            <p style="margin:4px 0;"><strong>Total:</strong> ₹${order.total_amount}</p>
            <p style="margin:4px 0;"><strong>Status:</strong> Confirmed</p>
          </div>
          <a href="${process.env.FRONTEND_URL}/customer/orders/${order.id}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Track Order →</a>
        </div>
      </div>
    `
  });
};

const sendPasswordResetEmail = async (email, name, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Reset Your Password — AI Boutique Studio',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#7c3aed;padding:32px;text-align:center;">
          <h1 style="color:#fff;margin:0;">Password Reset</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1f2937;">Hi ${name},</h2>
          <p style="color:#6b7280;">You requested a password reset. Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Reset Password →</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      </div>
    `
  });
};

const sendOrderStatusEmail = async (email, name, order, status) => {
  const statusMessages = {
    confirmed: 'Your order has been confirmed! 🎉',
    in_production: 'Your outfit is being crafted with care! ✂️',
    ready: 'Your order is ready for pickup/dispatch! 📦',
    shipped: `Your order is on its way! Tracking: ${order.tracking_number || 'N/A'} 🚚`,
    delivered: 'Your order has been delivered! Enjoy! 🎊'
  };
  await sendEmail({
    to: email,
    subject: `Order Update — ${order.order_number}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#7c3aed;padding:32px;text-align:center;">
          <h1 style="color:#fff;margin:0;">Order Update</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1f2937;">Hi ${name},</h2>
          <p style="color:#374151;font-size:16px;">${statusMessages[status] || `Your order status: ${status}`}</p>
          <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:20px 0;">
            <p style="margin:4px 0;"><strong>Order:</strong> ${order.order_number}</p>
            <p style="margin:4px 0;"><strong>Status:</strong> ${status.replace('_', ' ').toUpperCase()}</p>
          </div>
          <a href="${process.env.FRONTEND_URL}/customer/orders/${order.id}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;">Track Order →</a>
        </div>
      </div>
    `
  });
};

module.exports = { sendEmail, sendWelcomeEmail, sendOrderConfirmationEmail, sendPasswordResetEmail, sendOrderStatusEmail };
