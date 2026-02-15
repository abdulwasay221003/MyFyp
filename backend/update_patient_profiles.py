"""
Update P1, P2, P3 patient profiles with complete data for ML testing
"""
from firebase_admin import credentials, db, initialize_app

# Initialize Firebase (if not already initialized)
try:
    cred = credentials.Certificate("firebase_key.json")
    initialize_app(cred, {
        "databaseURL": "https://health-sync-dev-default-rtdb.firebaseio.com/"
    })
except Exception as e:
    print(f"Firebase already initialized or error: {e}")

def update_patient_profiles():
    """Update P1, P2, P3 with complete profile data"""

    # Get patient mappings
    mappings_ref = db.reference("patient_mappings")
    mappings = mappings_ref.get()

    if not mappings:
        print("❌ No patient mappings found!")
        return

    # Patient profiles for testing
    test_profiles = {
        "P1": {
            # LOW RISK - Young healthy female
            "dateOfBirth": "1995-05-15",
            "gender": "Female",
            "height": 165,
            "weight": 60,
            "cholesterol": 180,
            "bloodGroup": "O+",
            "diabetes": "No",
            "smoking": "Never",
            "active": True,
            "phone": "555-0001"
        },
        "P2": {
            # MODERATE RISK - Middle-aged with some risk factors
            "dateOfBirth": "1975-08-20",
            "gender": "Male",
            "height": 175,
            "weight": 85,
            "cholesterol": 220,
            "bloodGroup": "A+",
            "diabetes": "Pre-Diabetes",
            "smoking": "Former",
            "active": True,
            "phone": "555-0002"
        },
        "P3": {
            # HIGH RISK - Elderly with multiple risk factors
            "dateOfBirth": "1960-03-10",
            "gender": "Male",
            "height": 170,
            "weight": 95,
            "cholesterol": 260,
            "bloodGroup": "AB+",
            "diabetes": "Type 2",
            "smoking": "Current",
            "active": False,
            "phone": "555-0003"
        }
    }

    print("=" * 70)
    print("UPDATING PATIENT PROFILES FOR ML TESTING")
    print("=" * 70)
    print()

    for patient_id, profile_data in test_profiles.items():
        if patient_id not in mappings:
            print(f"[WARNING] {patient_id} not found in mappings, skipping...")
            continue

        firebase_uid = mappings[patient_id]

        # Get existing user data
        user_ref = db.reference(f"users/{firebase_uid}")
        existing_data = user_ref.get()

        if not existing_data:
            print(f"[WARNING] {patient_id} user data not found, skipping...")
            continue

        # Merge existing data with new profile data
        updated_data = {**existing_data, **profile_data}

        # Update in Firebase
        user_ref.set(updated_data)

        # Calculate expected risk level
        age = 2025 - int(profile_data["dateOfBirth"].split("-")[0])
        bmi = profile_data["weight"] / ((profile_data["height"] / 100) ** 2)

        risk_description = ""
        if patient_id == "P1":
            risk_description = f"LOW RISK (Age: {age}, BMI: {bmi:.1f})"
        elif patient_id == "P2":
            risk_description = f"MODERATE RISK (Age: {age}, BMI: {bmi:.1f}, Pre-Diabetes)"
        elif patient_id == "P3":
            risk_description = f"HIGH RISK (Age: {age}, BMI: {bmi:.1f}, Diabetes + Smoking)"

        print(f"[OK] Updated {patient_id} -> {risk_description}")
        print(f"   Name: {existing_data.get('fullName', 'Unknown')}")
        print(f"   Email: {existing_data.get('email', 'Unknown')}")
        print(f"   DOB: {profile_data['dateOfBirth']}")
        print(f"   Gender: {profile_data['gender']}")
        print(f"   Height: {profile_data['height']} cm")
        print(f"   Weight: {profile_data['weight']} kg")
        print(f"   Cholesterol: {profile_data['cholesterol']} mg/dL")
        print(f"   Diabetes: {profile_data['diabetes']}")
        print()

    print("=" * 70)
    print("PATIENT PROFILES UPDATED!")
    print("=" * 70)
    print()
    print("You can now:")
    print("1. Login as doctor")
    print("2. Enter P1, P2, or P3")
    print("3. Go to Dashboard")
    print("4. See ML prediction card with risk assessment")
    print()
    print("Expected Results:")
    print("  P1 → LOW RISK (~10-20% probability)")
    print("  P2 → MODERATE RISK (~40-60% probability)")
    print("  P3 → HIGH RISK (~70-90% probability)")
    print()

if __name__ == "__main__":
    update_patient_profiles()
