# Demo Patients Setup Guide

## Quick Start

This guide will help you create 5 demo patients for your presentation.

### What You'll Get:
- **5 Demo Patients** with different health profiles
- **3 Risk Levels**: Low, Moderate, High
- **Simulated Health Data** updated every 10 seconds
- **Patient IDs**: P2, P3, P4, P5, P6
- **Your Real Data** (shah@gmail.com as P1) stays intact!

---

## Step 1: Start Flask Server

**Option A: Double-click** `start_flask.bat`

**Option B: Terminal**
```bash
cd backend
python app.py
```

Keep this window open! You should see:
```
* Running on http://127.0.0.1:5000
```

---

## Step 2: Run Demo Patient Creator

Open a **NEW terminal** and run:

```bash
cd backend
python create_demo_patients.py
```

When prompted "Continue? (y/n):", type **y** and press Enter.

---

## Step 3: What Gets Created

The script will create:

### Patient P2 - John Doe (LOW RISK)
- Email: john.doe@demo.com
- Age: 39, Male
- Healthy profile: Normal cholesterol, non-smoker, active

### Patient P3 - Jane Smith (HIGH RISK)
- Email: jane.smith@demo.com
- Age: 54, Female
- High risk: High cholesterol, smoker, diabetic, inactive

### Patient P4 - Bob Wilson (MODERATE RISK)
- Email: bob.wilson@demo.com
- Age: 46, Male
- Moderate risk: Borderline cholesterol, active

### Patient P5 - Alice Brown (LOW RISK)
- Email: alice.brown@demo.com
- Age: 29, Female
- Healthy profile: Young, active, normal vitals

### Patient P6 - Mike Johnson (HIGH RISK)
- Email: mike.johnson@demo.com
- Age: 59, Male
- High risk: High cholesterol, smoker, overweight

---

## Step 4: Add Patients to Doctor Dashboard

1. **Login as Doctor** on website
2. **Go to Doctor Dashboard**
3. **Add each patient** by entering their ID:
   - Enter: P2, click "Add Patient"
   - Enter: P3, click "Add Patient"
   - Enter: P4, click "Add Patient"
   - Enter: P5, click "Add Patient"
   - Enter: P6, click "Add Patient"

---

## Step 5: View Demo Data

Click "View" button next to any patient to see:
- Live simulated health data
- ML cardiovascular risk predictions
- Different risk levels based on patient profiles

---

## Demo Patient Login Credentials

All demo patients use:
- **Password**: demo123
- **Emails**: [name]@demo.com

Examples:
- john.doe@demo.com / demo123
- jane.smith@demo.com / demo123
- bob.wilson@demo.com / demo123
- alice.brown@demo.com / demo123
- mike.johnson@demo.com / demo123

---

## Troubleshooting

### "Cannot connect to Flask server"
**Solution:** Make sure Flask is running on http://127.0.0.1:5000

### "User already exists"
**Solution:** Demo patients already created! Just add them to your doctor dashboard.

### "Simulation failed"
**Solution:** Check Flask is running. Simulation will retry automatically.

---

## What About Your Real Data?

**Don't worry!** Your real watch data is safe:
- **shah@gmail.com** remains as **P1**
- Real watch data continues to work
- Demo patients (P2-P6) are separate
- You can delete demo patients anytime

---

## After Your Presentation

To clean up demo patients (optional):

1. Go to Firebase Console
2. Delete demo patient accounts from Authentication
3. Delete their data from Database

Or just leave them - they don't interfere with real patients!

---

## Summary

✅ Flask running → ✅ Run create_demo_patients.py → ✅ Add P2-P6 to doctor dashboard → ✅ Ready for presentation!

Your system now has:
- **P1 (shah@gmail.com)**: REAL watch data
- **P2-P6**: Simulated demo data with different risk profiles
