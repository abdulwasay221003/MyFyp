# START FLASK SERVER - REQUIRED FOR PATIENT ID MAPPING

## ⚠️ IMPORTANT: Flask MUST be running for Patient ID assignment!

Without Flask running, new patients will NOT get Patient IDs (P1, P2, etc.) and doctors cannot add them.

## How to Start Flask Server

### Step 1: Open Terminal
Open a terminal/command prompt in the project folder

### Step 2: Navigate to backend folder
```bash
cd backend
```

### Step 3: Start Flask
```bash
python app.py
```

**Expected Output:**
```
 * Serving Flask app 'app'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment.
 * Running on http://127.0.0.1:5000
Press CTRL+C to quit
```

### Step 4: Keep it running
**DO NOT CLOSE THIS TERMINAL!** Flask must stay running in the background.

---

## Now Assign Patient ID to Existing Users

### For shah@gmail.com (existing user):
Open a **NEW terminal** (keep Flask running):
```bash
cd c:\Users\Admin\Desktop\health-path-monitor-main
python assign_existing_patient.py
```

This will assign Patient ID to shah@gmail.com.

### For wasay (new user who just signed up):
If wasay signed up when Flask was NOT running:
1. Edit `assign_existing_patient.py`
2. Change line 6 to:
```python
EMAIL = "wasay@example.com"  # Or whatever email wasay used
```
3. Run:
```bash
python assign_existing_patient.py
```

---

## How to Check if Flask is Running

Open browser and go to: http://127.0.0.1:5000

You should see a message or error page (not "Cannot connect").

---

## Common Issues

### Issue 1: "Could not connect to simulation server"
**Solution:** Flask is not running. Start Flask using steps above.

### Issue 2: Patient has no Patient ID
**Solution:**
1. Start Flask
2. Run `assign_existing_patient.py` with their email

### Issue 3: Port 5000 already in use
**Solution:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Then restart Flask
python app.py
```

---

## After Flask is Running

1. ✅ New patient signups will automatically get Patient IDs (P1, P2, P3, etc.)
2. ✅ Patient IDs will be saved in `patient_mappings` table
3. ✅ Doctors can add patients by their Patient ID
4. ✅ Health data simulation will work

---

## Quick Test

After starting Flask, try signing up a test patient:
1. Go to website login page
2. Click "Sign Up"
3. Enter email: test@example.com
4. Enter name: Test User
5. Select role: Patient
6. Click "Sign Up"

You should see:
- "Account created"
- "Patient ID assigned: P1" (or P2, P3, etc.)
- No "Could not connect" errors

Check Firebase database:
- `patient_mappings/P1` should exist
- `users/{uid}/patientId` should be "P1"
- Doctor can now add "P1" in their dashboard
