"""
Debug script to see exactly what data format is in Firebase for Shah
"""
import firebase_admin
from firebase_admin import credentials, db
import os

# Initialize Firebase
if not firebase_admin._apps:
    cred_path = os.path.join(os.path.dirname(__file__), "firebase_key.json")
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {
        "databaseURL": "https://health-sync-dev-default-rtdb.firebaseio.com/"
    })

# Shah's UID from mapping
shah_uid = "PMtPmMkVdzaYdG9M8Xc1DjrMAaZ2"

# Get history data
history_ref = db.reference(f"health_data/{shah_uid}/history")
history_data = history_ref.get()

if history_data:
    sorted_dates = sorted(history_data.keys())[-6:]
    print(f"Last 6 history entries for Shah:\n")

    for date_key in sorted_dates:
        day_data = history_data[date_key]
        print(f"Key: {date_key}")
        print(f"  heartRate: {day_data.get('heartRate')} (type: {type(day_data.get('heartRate')).__name__})")
        print(f"  steps: {day_data.get('steps')} (type: {type(day_data.get('steps')).__name__})")
        print(f"  calories: {day_data.get('calories')} (type: {type(day_data.get('calories')).__name__})")
        print(f"  distance: {day_data.get('distance')} (type: {type(day_data.get('distance')).__name__})")
        print(f"  sleepHours: {day_data.get('sleepHours')} (type: {type(day_data.get('sleepHours')).__name__})")

        workout = day_data.get('workout')
        print(f"  workout: {workout} (type: {type(workout).__name__})")
        if isinstance(workout, list):
            print(f"    Array length: {len(workout)}")
            for i, w in enumerate(workout[:2]):  # Show first 2
                print(f"    [{i}]: {w}")
        elif isinstance(workout, dict):
            print(f"    Dict keys: {workout.keys()}")
        print()

# Get current data
current_ref = db.reference(f"health_data/{shah_uid}/current")
current_data = current_ref.get()

if current_data:
    print("Current data:")
    for key, value in current_data.items():
        print(f"  {key}: {value} (type: {type(value).__name__})")
