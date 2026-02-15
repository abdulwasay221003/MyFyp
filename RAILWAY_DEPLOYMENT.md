# Railway Deployment Guide - Health Sync FYP

## Quick Deploy Links
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/AbcDef)

## Repository Structure
```
MyFyp/
├── backend/              # Flask ML API
│   ├── Dockerfile
│   ├── app.py
│   ├── requirements.txt
│   └── *.pkl (ML models)
├── src/                  # React frontend
├── android-companion-app/  # Android app (for Google Play)
├── Dockerfile            # Frontend Dockerfile
└── package.json
```

## Step-by-Step Deployment

### 1. Deploy Backend (Flask API)
1. Go to [Railway](https://railway.app/new)
2. Click **"Deploy from GitHub repo"**
3. Select **`abdulwasay221003/MyFyp`**
4. **Root Directory**: `backend`
5. Railway auto-detects `backend/Dockerfile`
6. Add environment variables:
   - `FLASK_ENV=production`
   - `PORT=5000`
7. **CRITICAL**: Upload `firebase_key.json`:
   - Go to Variables → Raw Editor
   - Copy content of your local `backend/firebase_key.json`
   - Or use Railway CLI to upload file
8. Deploy and copy the URL (e.g., `https://backend-xxxx.up.railway.app`)

### 2. Deploy Frontend (React Website)
1. In same Railway project, click **"+ New Service"**
2. Select **`abdulwasay221003/MyFyp`** again
3. **Root Directory**: `/` (leave empty or enter `/`)
4. Railway auto-detects `Dockerfile`
5. Add environment variables:
   - `NODE_ENV=production`
   - `VITE_BACKEND_URL=https://backend-xxxx.up.railway.app` (use URL from step 1)
6. Deploy and copy the URL (e.g., `https://frontend-xxxx.up.railway.app`)

### 3. Test Deployment
- **Backend**: `https://backend-xxxx.up.railway.app/get_all_patients`
- **Frontend**: `https://frontend-xxxx.up.railway.app`

## Firebase Credentials Setup

### Option 1: Railway CLI (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Upload firebase key
railway up backend/firebase_key.json
```

### Option 2: Environment Variable
Add to backend service variables:
```bash
FIREBASE_CREDENTIALS='{"type":"service_account","project_id":"health-sync-dev",...}'
```

Then update `backend/app.py` line 26:
```python
import json
import os

firebase_creds = os.getenv('FIREBASE_CREDENTIALS')
if firebase_creds:
    cred = credentials.Certificate(json.loads(firebase_creds))
else:
    cred = credentials.Certificate("firebase_key.json")
```

## Environment Variables Summary

### Backend Service
```
FLASK_ENV=production
PORT=5000
```

### Frontend Service
```
NODE_ENV=production
VITE_BACKEND_URL=<your-backend-railway-url>
```

## Troubleshooting

### Backend won't start?
- Check logs: Railway Dashboard → Backend Service → Deployments → View Logs
- Verify all `.pkl` files are present in backend folder
- Ensure Firebase credentials are uploaded

### Frontend can't connect to backend?
- Check `VITE_BACKEND_URL` is set correctly
- Test backend URL directly in browser
- Check CORS settings in `backend/app.py`

### Models not loading?
- Verify all 9 `.pkl` files exist in backend folder
- Check Railway build logs for errors
- Ensure Docker image includes all model files

## Port Configuration
- **Backend**: Port 5000 (set by Railway automatically via `$PORT`)
- **Frontend**: Port 8080 (configured in Dockerfile)

## Custom Domain (Optional)
1. Go to Railway service → Settings → Domains
2. Click "Add Custom Domain"
3. Add your domain and configure DNS records

## Cost Estimation
- **Free Tier**: $5 credit/month
- Expected usage: ~$3-5/month for both services
- Upgrade to Developer plan if needed ($20/month)
