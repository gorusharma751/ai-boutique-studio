# AI Boutique Studio - Deployment Guide

## 🚀 Quick Start

This project is ready for deployment on **Vercel** (frontend), **Render** (backend), and **Supabase** (database).

---

## 📋 Prerequisites

1. **Supabase Account** - https://supabase.com
   - Create a new project
   - Get your PostgreSQL connection string

2. **Render Account** - https://render.com (for backend)
   - Create account and link GitHub repo

3. **Vercel Account** - https://vercel.com (for frontend)
   - Create account and link GitHub repo

---

## 🗄️ Step 1: Setup Supabase Database

1. Go to https://supabase.com and create a project
2. Navigate to **Project Settings** → **Database** → **Connection string**
3. Copy the PostgreSQL connection string:
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   ```
4. Keep this safe - you'll need it for both Render and Vercel

---

## 🔌 Step 2: Deploy Backend on Render

### Option A: Using render.yaml (Automatic)

1. Push your code to GitHub
2. Go to https://render.com/dashboard
3. Click **New** → **Web Service**
4. Connect your GitHub repository
5. Render will auto-detect `render.yaml`
6. Set environment variables:
   - `DATABASE_URL`: Your Supabase connection string
   - `NODE_ENV`: `production`
   - Other API keys (Cloudinary, Razorpay, Gemini, etc.)

### Option B: Manual Setup

1. Create a new Web Service on Render
2. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `backend`

---

## 🎨 Step 3: Deploy Frontend on Vercel

1. Go to https://vercel.com/new
2. Select your GitHub repository
3. Configure Project:
   - **Framework**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

4. Set Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
   NEXT_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key-id
   NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
   ```

5. Deploy!

---

## 🔐 Environment Variables Setup

### Backend (.env)

```env
# Server
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app

# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# JWT
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Razorpay
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="AI Boutique Studio <noreply@aiboutiquestudio.com>"

# Admin
ADMIN_EMAIL=admin@aiboutiquestudio.com
ADMIN_PASSWORD=your-secure-password

# Credits
TRYON_CREDIT_COST=2
CHATBOT_CREDIT_COST=1
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key-id
NEXT_PUBLIC_APP_NAME=AI Boutique Studio
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
```

---

## 🧪 Testing Before Deployment

### Local Testing

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Run backend
cd backend && npm run dev

# Run frontend (in new terminal)
cd frontend && npm run dev
```

Access:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Health Check: http://localhost:5000/health

---

## ✅ Post-Deployment Checklist

- [ ] Database connection verified
- [ ] Backend health endpoint responding
- [ ] Frontend loading without errors
- [ ] Login working
- [ ] API requests working
- [ ] Email notifications working
- [ ] File uploads to Cloudinary working
- [ ] Payment gateway responding
- [ ] AI features working

---

## 🔄 Continuous Deployment

Both Render and Vercel support automatic deployment on git push:

1. Render will auto-redeploy when you push to your main branch
2. Vercel will auto-redeploy when you push to your main branch

---

## 🐛 Troubleshooting

### Backend not connecting to database
- Verify DATABASE_URL is correct
- Check Supabase network access is enabled
- Ensure SSL is configured for production

### Frontend can't reach backend
- Check NEXT_PUBLIC_API_URL is correct
- Verify CORS is enabled on backend
- Check backend is running

### Email not sending
- Verify Gmail app password (not account password)
- Enable 2FA and create app password
- Check EMAIL_USER and EMAIL_PASS are correct

---

## 📞 Support

For issues, check:
1. Render logs: https://dashboard.render.com
2. Vercel logs: https://vercel.com/dashboard
3. Supabase logs: https://app.supabase.com

---

**Happy Deploying!** 🎉
