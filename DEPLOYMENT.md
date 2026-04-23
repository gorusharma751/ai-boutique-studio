# AI Boutique Studio - Simplified Deployment Guide

This guide provides the simplest strategy to get your project live.

## 🏗️ The Strategy (Simple & Scalable)

- **Frontend**: [Vercel](https://vercel.com) (Best for Next.js)
- **Backend**: [Render](https://render.com) (Best for Express/Node.js servers)
- **Database**: [Render PostgreSQL](https://render.com/docs/databases) (Simple, all-in-one platform) or [Supabase](https://supabase.com)

---

## 🚀 I have fixed the Vercel error!
The error you saw (`Due to builds existing in your configuration file...`) was because of the root `vercel.json`. I have **deleted** that file for you. 

**Now, when you redeploy on Vercel:**
1. Go to your Project Settings.
2. Set the **Root Directory** to `frontend`.
3. It will now build perfectly!

---

## 🗄️ Step 1: Database (Choose ONE)

### Option A: Render PostgreSQL (Simplest - same platform as backend)
1. In your [Render Dashboard](https://dashboard.render.com), click **New** → **PostgreSQL**.
2. Once created, copy the **Internal Database URL** for your backend.
3. Use Render's shell or a tool like DBeaver to run [schema.sql](file:///d:/0000MyCode/Other%20Projects/Gourav/ai-boutique-studio/backend/src/models/schema.sql).

### Option B: Supabase (Best Free Tier)
1. Create a project at [Supabase](https://supabase.com).
2. Use their **SQL Editor** to run [schema.sql](file:///d:/0000MyCode/Other%20Projects/Gourav/ai-boutique-studio/backend/src/models/schema.sql).
3. Copy the **Connection string** (URI).


---

## 🔌 Step 2: Backend (Render)

1. Create a **New Web Service** at [Render](https://render.com).
2. Connect your GitHub repository.
3. **Configuration**:
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. **Environment Variables**:
   - `DATABASE_URL`: (Your Supabase connection string)
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: (Any long random string)
   - `FRONTEND_URL`: (Your Vercel URL - you can update this later)
   - *Add other keys: CLOUDINARY_*, RAZORPAY_*, GEMINI_API_KEY*

---

## 🎨 Step 3: Frontend (Vercel)

1. Create a **New Project** at [Vercel](https://vercel.com).
2. Connect your GitHub repository.
3. **Configuration (CRITICAL)**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Next.js`
4. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: (Your Render backend URL, e.g., `https://ai-boutique-backend.onrender.com`)
   - `NEXT_PUBLIC_APP_URL`: (Your Vercel frontend URL)
5. Click **Deploy**.

---

## 💡 Why this setup?

- **Simple**: You don't have to manage servers or complex configurations.
- **Free/Cheap**: All three services have generous free tiers for starting out.
- **Reliable**: Your backend stays running on Render, while your frontend is fast on Vercel's global edge.

## 🐛 Troubleshooting "Vercel Failure"

If your Vercel deployment failed before, it was likely because:
1. It tried to build the **root** folder instead of the `frontend` folder.
2. It tried to use the old `vercel.json` which had conflicting settings.

**Fix**: I have removed the root `vercel.json`. When you redeploy on Vercel, make sure you set the **Root Directory** to `frontend` in the project settings.

---

**Happy Launching!** 🚀

