# simulator.py
import requests
import time
from firebase_admin import credentials, db, initialize_app

# Initialize Firebase admin so we can read /users
cred = credentials.Certificate("firebase_key.json")
initialize_app(cred, {
    "databaseURL": "https://health-sync-dev-default-rtdb.firebaseio.com/"
})

while True:
    users_ref = db.reference("users")
    users = users_ref.get() or {}

    for uid, user_data in users.items():
        if user_data.get("role") == "patient":
            try:
                # Call Flask endpoint to push a single reading for this patient UID
                response = requests.get(f"http://127.0.0.1:5000/send_data", params={"patient_id": uid}, timeout=5)
                print(uid, response.json())
            except Exception as e:
                print(f"Error calling send_data for {uid}: {e}")

    time.sleep(5)
