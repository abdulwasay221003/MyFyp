# Health Sync - Complete Project Guide
## Final Year Project Documentation

---

## Project Overview

Health Sync is a health monitoring system with THREE components:

1. **Website** (React + TypeScript) - Dashboard for viewing health data
2. **Backend** (Python Flask) - ML predictions API
3. **Android App** (Kotlin) - Syncs data from Amazfit watch via Health Connect

---

## Project Structure

```
health-path-monitor-main/
├── src/                    # Website (React/TypeScript)
│   ├── pages/              # Main pages
│   │   ├── Dashboard.tsx   # Health data display
│   │   ├── History.tsx     # Health history
│   │   ├── Alerts.tsx      # Notifications
│   │   ├── Profile.tsx     # User profile
│   │   └── Login.tsx       # Login page
│   ├── components/         # UI components
│   │   └── Sidebar.tsx     # Navigation sidebar
│   ├── contexts/           # React contexts
│   │   ├── AuthContext.tsx # Authentication
│   │   └── PatientContext.tsx # Patient selection (for doctors)
│   └── lib/                # Utilities
│       └── patientUtils.ts # Patient ID resolution
│
├── backend/                # Python Flask Backend
│   ├── app.py              # Main Flask API
│   ├── train_health_models.py  # ML training script
│   ├── new dataset/        # Training data
│   │   └── Sleep_health_and_lifestyle_dataset.csv
│   ├── stress_level_model.pkl    # Trained model
│   ├── stress_level_scaler.pkl   # Data scaler
│   ├── sleep_quality_model.pkl   # Trained model
│   ├── sleep_quality_scaler.pkl  # Data scaler
│   └── heart_rate_rules.pkl      # HR anomaly rules
│
└── android/                # Android App (Kotlin)
    └── HealthSync/
        └── app/src/main/java/com/healthsync/app/
            ├── MainActivity.kt
            ├── HealthSyncWorker.kt  # Background sync
            └── ...
```

---

## How Each Component Works

### 1. Website (React + TypeScript)

**Purpose:** Display health data, alerts, and predictions for patients and doctors.

**Key Files:**
- `src/pages/Dashboard.tsx` - Shows current health metrics (Heart Rate, Steps, Sleep, etc.)
- `src/pages/History.tsx` - Shows historical health data with charts
- `src/pages/Alerts.tsx` - Shows health alerts/notifications
- `src/components/Sidebar.tsx` - Navigation menu

**How it works:**
1. User logs in (Patient or Doctor)
2. Website reads data from Firebase Realtime Database
3. For doctors: They select a patient using Patient ID
4. Data is displayed with charts and metrics

**To Run Website:**
```bash
cd health-path-monitor-main
npm install          # Install dependencies (first time only)
npm run dev          # Start development server
```
Website will open at: http://localhost:5173

---

### 2. Backend (Python Flask)

**Purpose:** Provide ML predictions for Stress Level and Sleep Quality.

**Key Files:**
- `backend/app.py` - Main Flask API with endpoints
- `backend/train_health_models.py` - Script to train ML models

**ML Models:**
1. **Stress Level Prediction** - Predicts stress (1-10) based on health data
2. **Sleep Quality Prediction** - Predicts sleep quality (1-10)
3. **Heart Rate Anomaly Detection** - Rule-based (Bradycardia/Tachycardia)

**Input Features (from watch):**
- Heart Rate (bpm)
- Daily Steps
- Sleep Duration (hours)
- Physical Activity Level (minutes)

**API Endpoints:**
- `POST /predict_health` - Get predictions for health data
- `GET /get_health_predictions/<patient_id>` - Get predictions for a patient

**To Run Backend:**
```bash
cd backend
pip install flask flask-cors firebase-admin scikit-learn pandas numpy  # First time
python app.py
```
Backend runs at: http://localhost:5000

---

### 3. Android App (Kotlin)

**Purpose:** Sync health data from Amazfit watch to Firebase.

**How it works:**
1. User wears Amazfit watch
2. Watch syncs to Zepp app on phone
3. Zepp app writes data to Health Connect
4. Our app reads from Health Connect
5. Data is uploaded to Firebase

**Key Files:**
- `HealthSyncWorker.kt` - Background sync worker
- `MainActivity.kt` - Main app screen

**Data Synced:**
- Heart Rate
- Steps
- Sleep Duration
- Calories

---

## Firebase Database Structure

```
Firebase Realtime Database
│
├── users/
│   └── {userId}/
│       ├── email
│       ├── fullName
│       ├── role (patient/doctor)
│       ├── patientId (e.g., "P1", "P2")
│       └── ... (profile data)
│
├── health_data/
│   └── {patientId}/
│       ├── current/          # Latest reading
│       │   ├── heartRate
│       │   ├── steps
│       │   ├── sleepHours
│       │   └── timestamp
│       │
│       ├── daily/            # Daily summaries
│       │   └── {date}/
│       │       ├── avgHeartRate
│       │       ├── totalSteps
│       │       └── ...
│       │
│       └── history/          # All readings
│           └── {timestamp}/
│               ├── heartRate
│               ├── steps
│               └── ...
│
└── patient_ids/              # Patient ID mapping
    └── {patientId}/
        └── odJ24MBN...       # Firebase UID
```

---

## User Roles

### Patient
- Can view their own health data
- Can see Dashboard, History, Alerts, Profile
- Has a unique Patient ID (e.g., "P1", "P2")

### Doctor
- Can view any patient's data by entering Patient ID
- Initially sees only Dashboard and Profile
- After selecting patient: Can see History and Alerts

---

## ML Model Details

### Training Data
Dataset: Sleep Health and Lifestyle Dataset (Kaggle)
Location: `backend/new dataset/Sleep_health_and_lifestyle_dataset.csv`

### Features Used
| Feature | Description | Source |
|---------|-------------|--------|
| Heart Rate | Beats per minute | Amazfit Watch |
| Daily Steps | Step count | Amazfit Watch |
| Sleep Duration | Hours slept | Amazfit Watch |
| Physical Activity | Minutes active | Calculated |

### Predictions
| Prediction | Range | Model |
|------------|-------|-------|
| Stress Level | 1-10 | Random Forest |
| Sleep Quality | 1-10 | Random Forest |
| HR Anomaly | Normal/Bradycardia/Tachycardia | Rule-based |

### Heart Rate Rules
- **Normal:** 60-100 bpm
- **Bradycardia (Low HR):** < 60 bpm
- **Tachycardia (High HR):** > 100 bpm

---

## Setting Up on New Laptop

### Requirements
1. Node.js (v18+) - For website
2. Python (3.8+) - For backend
3. Android Studio - For Android app
4. Git (optional)

### Step 1: Copy Project
Copy the entire `health-path-monitor-main` folder to new laptop.

### Step 2: Setup Website
```bash
cd health-path-monitor-main
npm install
npm run dev
```

### Step 3: Setup Backend
```bash
cd backend
pip install flask flask-cors firebase-admin scikit-learn pandas numpy
python app.py
```

### Step 4: Setup Android (if needed)
1. Open `android/HealthSync` in Android Studio
2. Sync Gradle
3. Build and run on device

---

## Important Files to Know

| File | Purpose |
|------|---------|
| `src/firebase.ts` | Firebase configuration |
| `src/contexts/AuthContext.tsx` | User authentication |
| `src/contexts/PatientContext.tsx` | Patient selection for doctors |
| `backend/app.py` | Flask API with all endpoints |
| `backend/train_health_models.py` | ML model training |

---

## Common Commands

```bash
# Website
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production

# Backend
pip install -r requirements.txt  # Install Python packages
python app.py                    # Start Flask server
python train_health_models.py    # Retrain ML models

# Android
./gradlew assembleDebug    # Build APK
```

---

## Troubleshooting

### Website not loading
- Check if `npm install` was run
- Check console for errors (F12)
- Verify Firebase config in `src/firebase.ts`

### Backend errors
- Ensure all .pkl model files exist in backend/
- Check Python packages are installed
- Verify Firebase credentials

### No health data showing
- Check Firebase database has data
- Verify patient ID is correct
- Check browser console for errors

---

## For FYP Demonstration

1. **Start Backend First:**
   ```bash
   cd backend && python app.py
   ```

2. **Start Website:**
   ```bash
   cd health-path-monitor-main && npm run dev
   ```

3. **Demo Flow:**
   - Login as Patient → Show Dashboard with health data
   - Show History page with charts
   - Show Alerts/Notifications
   - Login as Doctor → Select patient by ID
   - Show ML predictions (Stress, Sleep Quality)

4. **Key Points to Mention:**
   - Real-time data from Amazfit smartwatch
   - Health Connect integration on Android
   - ML predictions for health insights
   - Role-based access (Patient/Doctor)
   - Firebase for cloud storage

---

## Contact & Resources

- Firebase Console: https://console.firebase.google.com
- Health Connect: https://developer.android.com/health-connect
- Dataset: Kaggle Sleep Health and Lifestyle Dataset

---

*This guide was created for FYP submission. Good luck!*
