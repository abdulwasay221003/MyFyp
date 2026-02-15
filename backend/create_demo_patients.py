#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Create Demo Patients for Presentation/Testing

This script creates multiple demo patients with simulated health data.
Perfect for showing doctors how the system works with multiple patients.
"""

import firebase_admin
from firebase_admin import credentials, db, auth as firebase_auth
import time
import sys
import io

# Set UTF-8 encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Initialize Firebase Admin (reuse existing connection)
try:
    cred = credentials.Certificate("firebase_key.json")
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://health-sync-dev-default-rtdb.firebaseio.com/'
    })
    print("[OK] Firebase Admin initialized")
except Exception as e:
    print(f"[WARNING] Firebase already initialized or error: {e}")

# Demo patients with different health profiles
DEMO_PATIENTS = [
    {
        "email": "john.doe@demo.com",
        "password": "demo123",
        "fullName": "John Doe",
        "patientId": "P2",
        "profile": {
            "dateOfBirth": "1985-05-15",
            "gender": "male",
            "height": 175,
            "weight": 75,
            "cholesterol": "normal",
            "smoking": False,
            "diabetes": False,
            "active": True
        },
        "riskLevel": "low"  # Low risk patient
    },
    {
        "email": "jane.smith@demo.com",
        "password": "demo123",
        "fullName": "Jane Smith",
        "patientId": "P3",
        "profile": {
            "dateOfBirth": "1970-08-22",
            "gender": "female",
            "height": 165,
            "weight": 90,
            "cholesterol": "high",
            "smoking": True,
            "diabetes": True,
            "active": False
        },
        "riskLevel": "high"  # High risk patient
    },
    {
        "email": "bob.wilson@demo.com",
        "password": "demo123",
        "fullName": "Bob Wilson",
        "patientId": "P4",
        "profile": {
            "dateOfBirth": "1978-03-10",
            "gender": "male",
            "height": 180,
            "weight": 85,
            "cholesterol": "borderline",
            "smoking": False,
            "diabetes": False,
            "active": True
        },
        "riskLevel": "moderate"  # Moderate risk patient
    },
    {
        "email": "alice.brown@demo.com",
        "password": "demo123",
        "fullName": "Alice Brown",
        "patientId": "P5",
        "profile": {
            "dateOfBirth": "1995-11-30",
            "gender": "female",
            "height": 160,
            "weight": 60,
            "cholesterol": "normal",
            "smoking": False,
            "diabetes": False,
            "active": True
        },
        "riskLevel": "low"  # Low risk patient
    },
    {
        "email": "mike.johnson@demo.com",
        "password": "demo123",
        "fullName": "Mike Johnson",
        "patientId": "P6",
        "profile": {
            "dateOfBirth": "1965-07-18",
            "gender": "male",
            "height": 170,
            "weight": 95,
            "cholesterol": "high",
            "smoking": True,
            "diabetes": False,
            "active": False
        },
        "riskLevel": "high"  # High risk patient
    }
]

def create_demo_patient(patient_data):
    """
    Create a single demo patient with all required data
    """
    email = patient_data["email"]
    password = patient_data["password"]
    full_name = patient_data["fullName"]
    patient_id = patient_data["patientId"]
    profile = patient_data["profile"]

    print(f"\n{'='*60}")
    print(f"Creating: {full_name} ({email})")
    print(f"{'='*60}")

    try:
        # Step 1: Create Firebase Auth user
        try:
            user = firebase_auth.create_user(
                email=email,
                password=password,
                display_name=full_name
            )
            uid = user.uid
            print(f"[OK] Auth user created: {uid}")
        except firebase_auth.EmailAlreadyExistsError:
            # User already exists, get their UID
            user = firebase_auth.get_user_by_email(email)
            uid = user.uid
            print(f"[WARNING] User already exists: {uid}")

        # Step 2: Create user profile in database
        user_ref = db.reference(f'users/{uid}')
        user_ref.set({
            "email": email,
            "fullName": full_name,
            "role": "patient",
            "patientId": patient_id,
            "dataSource": "simulated",  # Demo patients use simulated data
            "createdAt": int(time.time() * 1000),
            **profile  # Include all profile data
        })
        print(f"[OK] User profile created in /users/{uid}")

        # Step 3: Create patient mappings
        db.reference(f'patient_mappings/{patient_id}').set(uid)
        print(f"[OK] Patient mapping created: {patient_id} -> {uid}")

        # Step 4: Create patient info
        db.reference(f'patient_info/{patient_id}').set({
            "name": full_name,
            "email": email,
            "uid": uid
        })
        print(f"[OK] Patient info created for {patient_id}")

        print(f"[SUCCESS] {full_name} created with Patient ID: {patient_id}")
        return {
            "uid": uid,
            "email": email,
            "name": full_name,
            "patientId": patient_id
        }

    except Exception as e:
        print(f"[ERROR] creating {full_name}: {e}")
        return None

def start_simulation_for_patient(uid, risk_level):
    """
    Start health data simulation for a patient
    """
    import requests

    try:
        response = requests.post(
            "http://127.0.0.1:5000/start_simulation",
            json={
                "patient_id": uid,
                "risk_level": risk_level  # Pass risk level to simulator
            },
            timeout=5
        )

        if response.status_code == 200:
            print(f"[OK] Simulation started for {uid} (Risk: {risk_level})")
            return True
        else:
            print(f"[WARNING] Simulation failed: {response.text}")
            return False

    except Exception as e:
        print(f"[WARNING] Could not start simulation: {e}")
        print(f"   Make sure Flask is running on http://127.0.0.1:5000")
        return False

def main():
    print("=" * 60)
    print("DEMO PATIENTS SETUP")
    print("=" * 60)
    print()
    print("This will create 5 demo patients with simulated health data.")
    print("Perfect for presentations and demonstrations!")
    print()
    print("Demo patients:")
    for p in DEMO_PATIENTS:
        print(f"  • {p['fullName']} ({p['patientId']}) - {p['riskLevel'].upper()} risk")
    print()

    response = input("Continue? (y/n): ")
    if response.lower() != 'y':
        print("Cancelled.")
        return

    print()
    print("Creating demo patients...")
    print()

    created_patients = []

    for patient_data in DEMO_PATIENTS:
        result = create_demo_patient(patient_data)
        if result:
            created_patients.append({
                **result,
                "riskLevel": patient_data["riskLevel"]
            })
        time.sleep(1)  # Small delay between creations

    print()
    print("=" * 60)
    print("STARTING SIMULATIONS")
    print("=" * 60)
    print()
    print("Note: Flask must be running for simulations to work")
    print()

    for patient in created_patients:
        start_simulation_for_patient(patient["uid"], patient["riskLevel"])
        time.sleep(0.5)

    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print()
    print(f"[SUCCESS] Created {len(created_patients)} demo patients:")
    for p in created_patients:
        print(f"   - {p['name']:20} -> {p['patientId']:5} ({p['riskLevel']:8} risk)")
    print()
    print("All demo patients have:")
    print("  - Email: [name]@demo.com")
    print("  - Password: demo123")
    print("  - Patient IDs: P2-P6")
    print()
    print("Next steps:")
    print("  1. Login as doctor on website")
    print("  2. Add patients: P2, P3, P4, P5, P6")
    print("  3. View their health data (simulated)")
    print("  4. Show ML predictions (different risk levels)")
    print()
    print("Note: P1 (shah@gmail.com) remains for REAL watch data!")

if __name__ == "__main__":
    main()
