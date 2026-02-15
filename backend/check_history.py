"""
Quick script to check what history data exists in Firebase
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

# List ALL users
print("="*60)
print("ALL USERS IN DATABASE:")
print("="*60)
users_ref = db.reference("users")
users_data = users_ref.get()

if users_data:
    for uid, user_data in users_data.items():
        name = user_data.get("fullName", "Unknown")
        patient_id = user_data.get("patientId", "NOT ASSIGNED")
        role = user_data.get("role", "unknown")
        print(f"  {name} | UID: {uid[:15]}... | PatientID: {patient_id} | Role: {role}")

# Check ALL health_data
print("\n" + "="*60)
print("ALL HEALTH DATA IN DATABASE:")
print("="*60)

health_ref = db.reference("health_data")
all_health = health_ref.get()

if all_health:
    for uid, data in all_health.items():
        print(f"\n[UID: {uid}]")
        if isinstance(data, dict):
            if "current" in data:
                current = data["current"]
                print(f"  Current: HR={current.get('heartRate')}, Steps={current.get('steps')}")
            if "history" in data:
                history = data["history"]
                if isinstance(history, dict):
                    print(f"  History: {len(history)} entries")
                    # Show first and last
                    sorted_keys = sorted(history.keys())
                    if sorted_keys:
                        print(f"    First: {sorted_keys[0]}")
                        print(f"    Last: {sorted_keys[-1]}")
                elif isinstance(history, list):
                    valid = [h for h in history if h]
                    print(f"  History: {len(valid)} entries (list format)")
else:
    print("No health_data in database!")

print("\n" + "="*60)
print("PATIENT MAPPINGS:")
print("="*60)

mappings_ref = db.reference("patient_mappings")
mappings = mappings_ref.get()

if mappings:
    for pid, uid in mappings.items():
        print(f"  {pid} -> {uid}")
else:
    print("No patient_mappings found!")

print("\n" + "="*60)
print("Done!")
