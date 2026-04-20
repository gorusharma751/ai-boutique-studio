# AI Boutique Studio 🎭✨
### India's Premier AI-Powered Boutique Marketplace

A complete multi-tenant SaaS platform for boutique owners and customers with AI virtual try-on, Gemini chatbot, Razorpay payments, and full admin control.

---

## 🏗️ Architecture

```
ai-boutique-studio/
├── frontend/          # Next.js 14 + TailwindCSS + ShadCN
└── backend/           # Node.js + Express.js
```

**Deployment:**
- Frontend → **Vercel**
- Backend  → **Railway**
- Database → **Supabase (PostgreSQL)**
- Storage  → **Cloudinary**

---

## ⚙️ Tech Stack

| Layer        | Technology                            |
|-------------|---------------------------------------|
| Frontend     | Next.js 14, TailwindCSS, ShadCN UI   |
| Backend      | Node.js, Express.js                   |
| Database     | PostgreSQL (Supabase)                 |
| Auth         | JWT + Google OAuth 2.0               |
| Payments     | Razorpay                              |
| Storage      | Cloudinary                            |
| AI Chatbot   | Google Gemini 1.5 Flash + LangChain  |
| AI Try-On    | Replicate (IDM-VTON / Stable Diffusion)|
| Email        | Nodemailer (Gmail SMTP)               |
| State        | Zustand                               |
| Charts       | Recharts                              |

---

## 🚀 Quick Start

### 1. Clone and install

```bash
git clone https://github.com/yourusername/ai-boutique-studio.git
cd ai-boutique-studio

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Database Setup (Supabase)

1. Go to [supabase.com](https://supabase.com) → Create new project
2. Go to **SQL Editor**
3. Copy and run the contents of `backend/src/models/schema.sql`
4. Copy your **Database URL** from Settings → Database → Connection string

### 3. Backend Environment Variables

```bash
cd backend
cp .env.example .env
```

Fill in your `.env`:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Supabase
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres

# JWT
JWT_SECRET=your-super-secret-key-minimum-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your-secret

# Gemini AI
GEMINI_API_KEY=your-gemini-key

# Replicate (for AI Try-On)
REPLICATE_API_TOKEN=r8_xxx

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="AI Boutique Studio <noreply@aiboutiquestudio.com>"
```

### 4. Frontend Environment Variables

```bash
cd frontend
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx
```

### 5. Run Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Runs on http://localhost:5000

# Terminal 2 - Frontend
cd frontend
npm run dev
# Runs on http://localhost:3000
```

---

## 🔑 Getting API Keys

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Add authorized origins: `http://localhost:3000`, `https://yourdomain.com`
5. Add redirect URIs: `http://localhost:3000/login`

### Cloudinary
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Dashboard → API Keys
3. Copy Cloud Name, API Key, API Secret

### Razorpay
1. Sign up at [razorpay.com](https://razorpay.com)
2. Settings → API Keys → Generate Test Keys

### Gemini AI
1. Go to [Google AI Studio](https://aistudio.google.com)
2. Get API Key → Create API Key

### Replicate (AI Try-On)
1. Sign up at [replicate.com](https://replicate.com)
2. Account Settings → API Tokens → Create token

### Gmail SMTP
1. Google Account → Security → 2-Step Verification (enable)
2. Security → App Passwords → Generate password
3. Use that password as `EMAIL_PASS`

---

## 📋 User Roles

### 👑 Admin
- Login: `admin@aiboutiquestudio.com` / `Admin@123456`
- Approve/reject/suspend boutiques
- Manage subscription plans and AI credit pricing
- View platform analytics and all orders
- Add bonus credits to any boutique
- Control platform settings

### 🏪 Boutique Owner
- Register with role "owner"
- Create boutique profile (pending admin approval)
- Upload products (stitched/custom/unstitched)
- Manage orders with 7-stage status updates
- Enable/disable AI features
- Buy AI credits via Razorpay
- Create discount coupons
- Send email campaigns to customers
- View measurement appointments

### 🛍️ Customer
- Browse boutiques and products
- AI Virtual Try-On (uploads photo + selects dress)
- AI Fashion Chatbot powered by Gemini
- Save body measurements or book home appointment
- Place orders with Razorpay payment
- Track order status in real-time

---

## 🤖 AI Features

### Virtual Try-On
- Customer uploads their photo
- Selects a product with AI try-on enabled
- AI generates a realistic image of customer wearing the dress
- Uses **IDM-VTON** model on Replicate
- Costs **2 AI credits** per try-on
- Generated images stored in Cloudinary

### Fashion Chatbot
- Powered by **Google Gemini 1.5 Flash**
- Has context about boutique's products
- Gives personalized fashion advice
- Works in Hindi and English
- Costs **1 AI credit** per message

### AI Credit System
- Boutiques buy credit packages via Razorpay:
  - Starter: 50 credits → ₹99
  - Value: 200 + 20 bonus → ₹349 (Popular)
  - Pro: 500 + 75 bonus → ₹799
- Credits never expire
- Admin can add bonus credits manually

---

## 🌐 Deployment

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
```

Set environment variables in Vercel dashboard.

### Backend → Railway

1. Create account at [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Add all backend environment variables
4. Railway auto-detects Node.js and deploys

### Database → Already on Supabase ✓

---

## 📱 Mobile Optimization

The app is fully responsive:
- **Mobile**: Bottom navigation, compact cards, full-screen modals
- **Desktop**: Full sidebar dashboard, data tables, multi-column layouts
- **Tablet**: Adaptive grid layouts

---

## 🎨 Theme System

- Light/Dark mode toggle in navbar and sidebar
- System preference detection
- Persistent theme preference
- Purple/Pink brand colors

---

## 📞 Support

For issues, check:
1. Backend logs: `backend/logs/error.log`
2. API health: `http://localhost:5000/health`
3. Database: Supabase Dashboard → Table Editor

---

## 📄 License

MIT License — Built with ❤️ for Indian boutique owners
