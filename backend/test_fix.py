"""
Test that the data processing fix works correctly
"""
import firebase_admin
from firebase_admin import credentials, db
import os
import numpy as np

# Initialize Firebase
if not firebase_admin._apps:
    cred_path = os.path.join(os.path.dirname(__file__), "firebase_key.json")
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {
        "databaseURL": "https://health-sync-dev-default-rtdb.firebaseio.com/"
    })

# Helper function to safely extract workout minutes
def get_workout_minutes(data):
    """Handle workout - can be number, object, or array from real watch"""
    workout = data.get('workout', 0)
    if isinstance(workout, (int, float)):
        return float(workout)
    elif isinstance(workout, list):
        # Real watch data has workout as array - sum all durations
        return float(sum(w.get('durationMinutes', 0) for w in workout if isinstance(w, dict)))
    elif isinstance(workout, dict):
        return float(workout.get('durationMinutes', 0))
    return 0.0

# Shah's UID from mapping
shah_uid = "PMtPmMkVdzaYdG9M8Xc1DjrMAaZ2"

# Get history data
history_ref = db.reference(f"health_data/{shah_uid}/history")
history_data = history_ref.get()

# Get current data
current_ref = db.reference(f"health_data/{shah_uid}/current")
current_data = current_ref.get()

# Build 7-day data array
seven_day_data = []

if history_data:
    sorted_dates = sorted(history_data.keys())[-6:]
    print(f"Processing {len(sorted_dates)} history entries...")

    for date_key in sorted_dates:
        day_data = history_data[date_key]
        entry = [
            float(day_data.get('heartRate', 70) or 70),
            float(day_data.get('steps', 5000) or 5000),
            float(day_data.get('calories', 200) or 200),
            float(day_data.get('distance', 3.0) or 3.0),
            float(day_data.get('sleepHours', 7.0) or 7.0),  # Handle None
            get_workout_minutes(day_data)  # Handle array workout
        ]
        seven_day_data.append(entry)
        print(f"  {date_key}: {entry}")

if current_data:
    entry = [
        float(current_data.get('heartRate', 70) or 70),
        float(current_data.get('steps', 5000) or 5000),
        float(current_data.get('calories', 200) or 200),
        float(current_data.get('distance', 3.0) or 3.0),
        float(current_data.get('sleepHours', 7.0) or 7.0),
        get_workout_minutes(current_data)
    ]
    seven_day_data.append(entry)
    print(f"  Current: {entry}")

print(f"\nTotal entries: {len(seven_day_data)}")

# Pad to 7 days if needed
while len(seven_day_data) < 7:
    seven_day_data.insert(0, seven_day_data[0])

# Convert to numpy array
try:
    window = np.array(seven_day_data)
    print(f"\nNumpy array shape: {window.shape}")
    print(f"Array dtype: {window.dtype}")
    print("\nSUCCESS! Data can be converted to numpy array!")
    print(f"\nFirst row: {window[0]}")
    print(f"Last row: {window[-1]}")
except Exception as e:
    print(f"\nERROR: {e}")
