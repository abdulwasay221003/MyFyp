# 🚀 DEPLOY TO RAILWAY - STEP BY STEP GUIDE

**Repository:** https://github.com/abdulwasay221003/MyFyp
**Status:** ✅ Ready for deployment

---

## 📋 BEFORE YOU START

**You need:**
- Railway account (sign up with GitHub at https://railway.app)
- Your `firebase_key.json` file location:
  `C:\Users\hp\Documents\health-path-monitor-main (1)\health-path-monitor-main\backend\firebase_key.json`

---

## 🔧 STEP 1: DEPLOY BACKEND FIRST

### 1.1 Create Backend Service
1. Go to **https://railway.app/new**
2. Click **"Deploy from GitHub repo"**
3. Select **`abdulwasay221003/MyFyp`**
4. Grant permissions if asked

### 1.2 Configure Backend
- **Service Name:** `health-sync-backend`
- **Root Directory:** `backend`
- Click **Deploy**

### 1.3 Add Environment Variables
Go to **Variables** tab, add:
```
FLASK_ENV=production
PORT=5000
```

### 1.4 Upload Firebase Credentials (CRITICAL!)

**Option A - Railway CLI (Easiest):**
```bash
npm install -g @railway/cli
railway login
railway link
railway up backend/firebase_key.json
```

**Option B - Manual Upload:**
1. Open your local `backend/firebase_key.json`
2. Copy all contents
3. In Railway → Variables → RAW Editor
4. Create variable `FIREBASE_CREDENTIALS` and paste content

### 1.5 Get Backend URL
1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. **SAVE THIS URL!** You'll need it for frontend
4. Example: `https://health-sync-backend-production.up.railway.app`

### 1.6 Test Backend
Open in browser:
```
https://your-backend-url.up.railway.app/get_all_patients
```
Should return: `{"patients": []}`

---

## 🌐 STEP 2: DEPLOY FRONTEND

### 2.1 Add Frontend Service
1. In **same Railway project**, click **"+ New"**
2. Click **"GitHub Repo"**
3. Select **`abdulwasay221003/MyFyp`** again

### 2.2 Configure Frontend
- **Service Name:** `health-sync-frontend`
- **Root Directory:** `/` (or leave empty)
- Click **Deploy**

### 2.3 Add Environment Variables
Go to **Variables** tab, add:
```
NODE_ENV=production
VITE_BACKEND_URL=<PASTE YOUR BACKEND URL HERE>
```

**Example:**
```
VITE_BACKEND_URL=https://health-sync-backend-production.up.railway.app
```

### 2.4 Get Frontend URL
1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. **THIS IS YOUR WEBSITE!**
4. Example: `https://health-sync-frontend-production.up.railway.app`

### 2.5 Test Frontend
Open in browser:
```
https://your-frontend-url.up.railway.app
```
Should show **Health Sync Login Page**

---

## ✅ VERIFICATION

**Backend Test:**
- ✅ `/get_all_patients` returns JSON
- ✅ No errors in Railway logs

**Frontend Test:**
- ✅ Login page loads
- ✅ Can register/login
- ✅ Dashboard displays

**Integration Test:**
- ✅ Create account works
- ✅ Data saves to Firebase
- ✅ No CORS errors

---

## 🐛 TROUBLESHOOTING

### Backend won't start?
- Check **Deployments** → **Logs**
- Verify `firebase_key.json` uploaded
- Confirm all `.pkl` files exist

### Frontend blank page?
- Press F12 → Check Console for errors
- Verify `VITE_BACKEND_URL` is correct
- Test backend URL directly

### Firebase errors?
- Re-upload `firebase_key.json`
- Check Firebase credentials are valid

---

## 📊 RAILWAY PROJECT STRUCTURE

```
Your Railway Project
├── Backend Service
│   ├── URL: https://backend-xxxx.up.railway.app
│   ├── Port: 5000
│   └── Root: /backend
│
└── Frontend Service
    ├── URL: https://frontend-xxxx.up.railway.app
    ├── Port: 8080
    └── Root: /
```

---

## 💰 COST

- **Free Tier:** $5/month credit
- **Expected Usage:** $3-5/month
- **Upgrade:** Developer plan $20/month if needed

---

## 🎯 WHAT'S DEPLOYED

**Backend (Flask):**
- ✅ ML models (9 .pkl files)
- ✅ Firebase Admin SDK
- ✅ REST API endpoints
- ✅ Patient management
- ✅ Health predictions

**Frontend (React):**
- ✅ Login/Register
- ✅ Patient Dashboard
- ✅ Doctor Dashboard
- ✅ Health charts
- ✅ Alerts system

**NOT Deployed (Yet):**
- ❌ Android App (needs Google Play Store separately)

---

## 📱 NEXT: GOOGLE PLAY STORE

After Railway deployment works:

1. Open Android Studio
2. Load `android-companion-app/` folder
3. Update backend URL in app
4. Build → Generate Signed Bundle
5. Upload to Google Play Console

---

## 🔗 IMPORTANT LINKS

- **GitHub Repo:** https://github.com/abdulwasay221003/MyFyp
- **Railway Dashboard:** https://railway.app/dashboard
- **Firebase Console:** https://console.firebase.google.com
- **Backend Code:** See `backend/app.py`
- **Frontend Code:** See `src/` folder

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Railway account created
- [ ] Backend service deployed
- [ ] Firebase credentials uploaded
- [ ] Backend URL saved
- [ ] Backend tested successfully
- [ ] Frontend service deployed
- [ ] Frontend environment variables set
- [ ] Frontend URL saved
- [ ] Frontend tested successfully
- [ ] Login/Register works
- [ ] Data syncs with Firebase

---

**🎉 Once both services show "SUCCESS" in Railway, your FYP is LIVE!**
