# Health Sync - Demo Quick Reference Card

## Quick Start (2 Minutes Setup)

### Terminal 1 - Backend
```bash
cd backend
python app.py
```
Expected: "Running on http://127.0.0.1:5000"

### Terminal 2 - Website
```bash
npm run dev
```
Expected: "Local: http://localhost:5173"

---

## Demo Script

### 1. Patient Login
- Email: (your test patient email)
- Show Dashboard with live health metrics
- Show charts in History page
- Show Alerts page

### 2. Doctor Login
- Email: (your test doctor email)
- Notice: Only Dashboard & Profile visible initially
- Enter Patient ID (e.g., "P1")
- Now History & Alerts appear

### 3. ML Predictions (in Dashboard)
- Stress Level: 1-10 scale
- Sleep Quality: 1-10 scale
- Heart Rate Status: Normal/Bradycardia/Tachycardia

---

## Key Technical Points to Explain

### Architecture
```
Amazfit Watch → Zepp App → Health Connect → Our App → Firebase → Website
```

### ML Models
- **Algorithm:** Random Forest (scikit-learn)
- **Training Data:** Kaggle Sleep Health Dataset (374 samples)
- **Features:** Heart Rate, Steps, Sleep Duration, Activity Level
- **Outputs:** Stress Level, Sleep Quality, HR Anomaly

### Technologies Used
| Component | Technology |
|-----------|------------|
| Frontend | React, TypeScript, Tailwind CSS |
| Backend | Python Flask |
| Database | Firebase Realtime Database |
| ML | scikit-learn (Random Forest) |
| Android | Kotlin, Health Connect API |
| Watch | Amazfit (via Zepp + Health Connect) |

---

## If Something Goes Wrong

### "Models not loaded" error
```bash
cd backend
python train_health_models.py   # Retrain models
python app.py                   # Restart backend
```

### Website blank/error
```bash
npm install    # Reinstall packages
npm run dev    # Restart
```

### No data showing
- Check Firebase console for data
- Verify correct Patient ID
- Check browser console (F12) for errors

---

## Firebase Data Paths

```
/users/{uid}           → User profile
/health_data/{pid}/current → Latest health reading
/health_data/{pid}/history → All historical readings
/patient_ids/{pid}     → Maps Patient ID to Firebase UID
```

---

## Files You Might Need to Edit

| Need | File |
|------|------|
| Change Firebase config | `src/firebase.ts` |
| Modify Dashboard | `src/pages/Dashboard.tsx` |
| Change ML model | `backend/train_health_models.py` |
| Add API endpoint | `backend/app.py` |

---

## Keyboard Shortcuts (VSCode)

- `Ctrl+`` ` - Open terminal
- `Ctrl+Shift+P` - Command palette
- `Ctrl+P` - Quick file open
- `F5` - Start debugging

---

*Print this page for quick reference during demo!*
