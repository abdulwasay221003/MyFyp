# backend/app.py
from flask import Flask, request, jsonify
import time
from firebase_admin import credentials, db, initialize_app
from flask_cors import CORS
import numpy as np
from datetime import datetime
import os
import json

# -----------------------------------------------------------------------------
# Initialize Flask + CORS
# -----------------------------------------------------------------------------
app = Flask(__name__)
CORS(app, supports_credentials=True)  # allows frontend (Vite) to call Flask

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

# -----------------------------------------------------------------------------
# Firebase Admin SDK connection
# -----------------------------------------------------------------------------
# Check if Firebase credentials are in environment variable (Railway deployment)
firebase_creds = os.getenv('FIREBASE_CREDENTIALS')
if firebase_creds:
    print("Loading Firebase credentials from environment variable...")
    cred_dict = json.loads(firebase_creds)
    cred = credentials.Certificate(cred_dict)
else:
    print("Loading Firebase credentials from file...")
    cred = credentials.Certificate("firebase_key.json")

initialize_app(cred, {
    "databaseURL": "https://health-sync-dev-default-rtdb.firebaseio.com/"
})

# -----------------------------------------------------------------------------
# ML Models - UNSUPERVISED (No Manual Labels!)
# Uses ONLY smartwatch variables: heartRate, steps, calories, distance, sleepHours, workout
# Model learns patterns from FitBit data itself
# -----------------------------------------------------------------------------
health_cluster_model = None
health_scaler = None
anomaly_model = None
cluster_names = None

# TREND DETERIORATION DETECTION MODELS (UNSUPERVISED - No Future Prediction)
trend_detector = None  # Isolation Forest
trend_detector_scaler = None
trend_cluster_model = None  # K-Means
trend_cluster_scaler = None
trend_cluster_names = None

def load_ml_models():
    """Load trained ML models for health prediction"""
    global health_cluster_model, health_scaler, anomaly_model, cluster_names
    global trend_detector, trend_detector_scaler, trend_cluster_model, trend_cluster_scaler, trend_cluster_names

    try:
        import pickle

        # Health Cluster Model (Unsupervised - K-Means)
        if os.path.exists('health_cluster_model.pkl') and os.path.exists('health_scaler.pkl'):
            with open('health_cluster_model.pkl', 'rb') as f:
                health_cluster_model = pickle.load(f)
            with open('health_scaler.pkl', 'rb') as f:
                health_scaler = pickle.load(f)
            print("Health Cluster Model loaded successfully!")
        else:
            print("WARNING: Health Cluster Model not found. Run train_health_model.py first.")

        # Cluster Names Mapping
        if os.path.exists('cluster_names.pkl'):
            with open('cluster_names.pkl', 'rb') as f:
                cluster_names = pickle.load(f)
            print("Cluster Names loaded successfully!")

        # Anomaly Detection Model (Unsupervised - Isolation Forest)
        if os.path.exists('anomaly_model.pkl'):
            with open('anomaly_model.pkl', 'rb') as f:
                anomaly_model = pickle.load(f)
            print("Anomaly Detection Model loaded successfully!")
        else:
            print("WARNING: Anomaly Model not found. Run train_health_model.py first.")

        # TREND DETERIORATION DETECTION MODELS (Unsupervised)
        if os.path.exists('trend_detector.pkl'):
            with open('trend_detector.pkl', 'rb') as f:
                trend_detector = pickle.load(f)
            print("Trend Detector (Isolation Forest) loaded successfully!")

        if os.path.exists('trend_detector_scaler.pkl'):
            with open('trend_detector_scaler.pkl', 'rb') as f:
                trend_detector_scaler = pickle.load(f)

        if os.path.exists('trend_cluster_model.pkl'):
            with open('trend_cluster_model.pkl', 'rb') as f:
                trend_cluster_model = pickle.load(f)
            print("Trend Cluster Model (K-Means) loaded successfully!")

        if os.path.exists('trend_cluster_scaler.pkl'):
            with open('trend_cluster_scaler.pkl', 'rb') as f:
                trend_cluster_scaler = pickle.load(f)

        if os.path.exists('trend_cluster_names.pkl'):
            with open('trend_cluster_names.pkl', 'rb') as f:
                trend_cluster_names = pickle.load(f)
            print("Trend Cluster Names loaded successfully!")

    except Exception as e:
        print(f"ERROR loading ML models: {e}")

# Load models on startup
load_ml_models()

# -----------------------------------------------------------------------------
# Helper function to resolve patient ID (simple or firebase UID)
# -----------------------------------------------------------------------------
def resolve_patient_id(patient_id_input):
    """
    Accept either simple ID (P1, P2, p1, p2) or Firebase UID.
    Returns actual Firebase UID.
    """
    if not patient_id_input:
        return None

    # Handle both uppercase and lowercase patient IDs (P1, p1, P2, p2, etc.)
    patient_id_upper = patient_id_input.upper()
    if patient_id_upper.startswith('P') and len(patient_id_upper) <= 4:
        mapping_ref = db.reference(f"patient_mappings/{patient_id_upper}")
        uid = mapping_ref.get()
        if uid:
            print(f"DEBUG: Resolved {patient_id_input} -> {uid}")
            return uid
        # If not in mappings, try to find in users table
        users_ref = db.reference("users")
        users = users_ref.get()
        if users:
            for uid, user_data in users.items():
                if user_data.get("patientId", "").upper() == patient_id_upper:
                    print(f"DEBUG: Found {patient_id_input} in users table -> {uid}")
                    return uid
        print(f"DEBUG: Patient {patient_id_input} not found")
        return None
    # Assume it's a Firebase UID
    return patient_id_input

# -----------------------------------------------------------------------------
# Patient Management Routes
# -----------------------------------------------------------------------------
@app.route("/resolve_patient", methods=["POST"])
def resolve_patient():
    """Resolve a simple patient ID (P1) to Firebase UID and patient info"""
    data = request.get_json(force=True)
    patient_input = data.get("patient_id")
    if not patient_input:
        return jsonify({"error": "Missing patient_id"}), 400

    resolved_uid = resolve_patient_id(patient_input)
    if not resolved_uid:
        return jsonify({"error": "Patient not found"}), 404

    patient_info_ref = db.reference(f"patient_info/{patient_input}")
    patient_info = patient_info_ref.get()

    if not patient_info:
        user_ref = db.reference(f"users/{resolved_uid}")
        user_data = user_ref.get()
        if user_data:
            patient_info = {
                "name": user_data.get("fullName", "Unknown"),
                "email": user_data.get("email", ""),
                "uid": resolved_uid
            }

    return jsonify({
        "simple_id": patient_input if patient_input.startswith('P') else None,
        "firebase_uid": resolved_uid,
        "patient_info": patient_info
    })

@app.route("/get_all_patients", methods=["GET"])
def get_all_patients():
    """Get all patients with their simple IDs"""
    patient_mappings_ref = db.reference("patient_mappings")
    mappings = patient_mappings_ref.get() or {}

    patient_info_ref = db.reference("patient_info")
    patient_info = patient_info_ref.get() or {}

    patients = []
    for simple_id, uid in mappings.items():
        info = patient_info.get(simple_id, {})
        patients.append({
            "simple_id": simple_id,
            "firebase_uid": uid,
            "name": info.get("name", "Unknown"),
            "email": info.get("email", "")
        })

    return jsonify({"patients": patients})

@app.route("/assign_patient_id", methods=["POST"])
def assign_patient_id():
    """Automatically assign a simple patient ID (P1, P2, etc.) to a new patient"""
    data = request.get_json(force=True)
    firebase_uid = data.get("firebase_uid")
    patient_name = data.get("name", "Unknown")
    patient_email = data.get("email", "")

    if not firebase_uid:
        return jsonify({"error": "Missing firebase_uid"}), 400

    patient_mappings_ref = db.reference("patient_mappings")
    mappings = patient_mappings_ref.get() or {}

    for simple_id, uid in mappings.items():
        if uid == firebase_uid:
            return jsonify({
                "simple_id": simple_id,
                "firebase_uid": firebase_uid,
                "message": "Patient already has an ID"
            })

    max_patient_num = 0
    for simple_id in mappings.keys():
        if simple_id.startswith("P"):
            try:
                num = int(simple_id[1:])
                max_patient_num = max(max_patient_num, num)
            except:
                pass

    new_patient_num = max_patient_num + 1
    new_simple_id = f"P{new_patient_num}"

    db.reference(f"patient_mappings/{new_simple_id}").set(firebase_uid)
    db.reference(f"patient_info/{new_simple_id}").set({
        "name": patient_name,
        "email": patient_email,
        "uid": firebase_uid
    })
    db.reference(f"users/{firebase_uid}/patientId").set(new_simple_id)

    print(f"Assigned {new_simple_id} to {patient_name} (UID: {firebase_uid[:20]}...)")

    return jsonify({
        "simple_id": new_simple_id,
        "firebase_uid": firebase_uid,
        "message": "Patient ID assigned successfully"
    })

@app.route("/assign_patient_id_to_existing", methods=["POST"])
def assign_patient_id_to_existing():
    """Manually assign Patient ID to existing users who signed up before the ID system"""
    data = request.get_json(force=True)
    email = data.get("email")

    if not email:
        return jsonify({"error": "Missing email"}), 400

    users_ref = db.reference("users")
    users = users_ref.get() or {}

    firebase_uid = None
    user_data = None
    for uid, udata in users.items():
        if udata.get("email") == email:
            firebase_uid = uid
            user_data = udata
            break

    if not firebase_uid:
        return jsonify({"error": f"User with email {email} not found"}), 404

    if user_data.get("patientId"):
        return jsonify({
            "message": "User already has Patient ID",
            "patientId": user_data.get("patientId"),
            "firebase_uid": firebase_uid
        })

    patient_mappings_ref = db.reference("patient_mappings")
    mappings = patient_mappings_ref.get() or {}

    max_patient_num = 0
    for simple_id in mappings.keys():
        if simple_id.startswith("P"):
            try:
                num = int(simple_id[1:])
                max_patient_num = max(max_patient_num, num)
            except:
                pass

    new_patient_num = max_patient_num + 1
    new_simple_id = f"P{new_patient_num}"

    db.reference(f"patient_mappings/{new_simple_id}").set(firebase_uid)
    db.reference(f"patient_info/{new_simple_id}").set({
        "name": user_data.get("fullName", "Unknown"),
        "email": email,
        "uid": firebase_uid
    })
    db.reference(f"users/{firebase_uid}/patientId").set(new_simple_id)
    db.reference(f"users/{firebase_uid}/dataSource").set("watch")

    print(f"Manually assigned {new_simple_id} to {email} (UID: {firebase_uid[:20]}...) - dataSource: watch")

    return jsonify({
        "simple_id": new_simple_id,
        "firebase_uid": firebase_uid,
        "email": email,
        "dataSource": "watch",
        "message": "Patient ID assigned successfully to existing user (dataSource: watch)"
    })


# -----------------------------------------------------------------------------
# NEW ML Prediction System - Uses ONLY Smartwatch Variables
# NO manual input required (age, gender, BMI, etc. NOT needed)
# -----------------------------------------------------------------------------

@app.route("/predict_health", methods=["POST"])
def predict_health():
    """
    ML Health Prediction Endpoint - Uses ONLY Smartwatch Variables

    Input (from watch):
    {
        "patient_id": "P1" or Firebase UID,
        "health_data": {
            "heartRate": 72,
            "steps": 8000,
            "calories": 350,
            "distance": 5.2,
            "sleepHours": 7.5,
            "workout": 45
        }
    }

    Output:
    {
        "health_risk_state": "Healthy" / "Moderate Risk" / "High Risk",
        "anomaly_detected": true/false,
        "recommendations": [...]
    }
    """
    try:
        data = request.get_json(force=True)
        patient_id_input = data.get("patient_id")
        health_data = data.get("health_data", {})

        # Resolve patient ID
        patient_id = resolve_patient_id(patient_id_input) if patient_id_input else None

        # If health_data not provided, fetch from Firebase
        if patient_id and not health_data:
            health_ref = db.reference(f"health_data/{patient_id}/current")
            health_data = health_ref.get() or {}

        if not health_data:
            return jsonify({"error": "No health data available"}), 400

        # Extract ONLY watch variables (no manual input)
        heart_rate = health_data.get("heartRate", 70)
        steps = health_data.get("steps", 5000)
        calories = health_data.get("calories", 200)
        distance = health_data.get("distance", 3.0)
        sleep_hours = health_data.get("sleepHours", 7.0)
        workout_minutes = health_data.get("workout", 0)

        result = {
            "patient_id": patient_id_input,
            "timestamp": datetime.now().isoformat(),
            "watch_data": {
                "heart_rate": heart_rate,
                "steps": steps,
                "calories": calories,
                "distance": distance,
                "sleep_hours": sleep_hours,
                "workout_minutes": workout_minutes
            },
            "predictions": {}
        }

        # Check if ML models are loaded
        if health_cluster_model is None:
            return jsonify({
                "error": "ML models not trained yet. Please run train_health_model.py first.",
                "status": "models_not_loaded"
            }), 503

        # Prepare feature vector (ONLY watch variables)
        # Order: heartRate, steps, calories, distance, sleepHours, workout
        X = np.array([[heart_rate, steps, calories, distance, sleep_hours, workout_minutes]])

        # Scale features
        X_scaled = health_scaler.transform(X)

        # Model 1: Health Pattern Clustering (UNSUPERVISED - No Manual Labels!)
        cluster_id = health_cluster_model.predict(X_scaled)[0]

        # Get cluster info
        cluster_info = cluster_names.get(cluster_id, {"name": "Unknown", "color": "gray"})

        # Calculate confidence based on distance to cluster centers
        distances = health_cluster_model.transform(X_scaled)[0]
        min_dist = distances[cluster_id]
        max_dist = max(distances)
        confidence = (1 - min_dist / max_dist) * 100 if max_dist > 0 else 50

        result["predictions"]["health_pattern"] = {
            "pattern": cluster_info['name'],
            "cluster_id": int(cluster_id),
            "confidence": round(confidence, 1),
            "color": cluster_info['color'],
            "method": "K-Means Clustering (Unsupervised)"
        }

        # Model 2: Anomaly Detection (UNSUPERVISED)
        if anomaly_model is not None:
            anomaly_score = anomaly_model.decision_function(X_scaled)[0]
            is_anomaly = anomaly_model.predict(X_scaled)[0] == -1

            result["predictions"]["anomaly"] = {
                "is_anomaly": bool(is_anomaly),
                "anomaly_score": round(float(anomaly_score), 3),
                "status": "Abnormal Pattern Detected" if is_anomaly else "Normal Pattern",
                "method": "Isolation Forest (Unsupervised)"
            }

        # Generate recommendations based on watch data patterns
        recommendations = []

        if steps < 5000:
            recommendations.append("Increase daily steps - aim for at least 8,000 steps")
        if sleep_hours < 6:
            recommendations.append("Sleep duration is low - aim for 7-9 hours")
        if heart_rate > 100:
            recommendations.append("Elevated resting heart rate - consider relaxation techniques")
        if workout_minutes < 20:
            recommendations.append("Increase physical activity - aim for 30+ minutes daily")
        if calories < 150:
            recommendations.append("Low calorie burn indicates sedentary behavior")

        if not recommendations:
            recommendations.append("Great job! Your health patterns look good. Keep it up!")

        result["recommendations"] = recommendations

        print(f"Health Prediction for {patient_id_input}: {cluster_info['name']} (Confidence: {confidence:.1f}%)")

        return jsonify(result)

    except Exception as e:
        print(f"ERROR in health prediction: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/get_health_prediction/<patient_id>", methods=["GET"])
def get_health_prediction(patient_id):
    """
    Get health prediction for a patient using their latest watch data.
    Convenience endpoint - no POST body needed.
    """
    try:
        resolved_id = resolve_patient_id(patient_id)
        if not resolved_id:
            return jsonify({"error": "Patient not found"}), 404

        # Fetch latest health data from watch
        health_ref = db.reference(f"health_data/{resolved_id}/current")
        health_data = health_ref.get()

        if not health_data:
            return jsonify({"error": "No health data available for this patient"}), 404

        # Call the main prediction function
        from flask import g
        with app.test_request_context(json={
            "patient_id": patient_id,
            "health_data": health_data
        }):
            return predict_health()

    except Exception as e:
        print(f"ERROR getting health prediction: {e}")
        return jsonify({"error": str(e)}), 500


# -----------------------------------------------------------------------------
# TREND-BASED DETERIORATION DETECTION - UNSUPERVISED ML
# Analyzes past 7 days to detect if health is DECLINING
# NO future prediction - only pattern detection!
# -----------------------------------------------------------------------------

def calculate_trend_features(window):
    """
    Extract trend features from 7-day window of health data
    Same calculation as training - consistency is critical for ML
    """
    feature_names = ['AvgHeartRate', 'TotalSteps', 'Calories', 'TotalDistance', 'SleepHours', 'ActiveMinutes']
    features = []

    for i, name in enumerate(feature_names):
        col_data = window[:, i]

        # 1. Mean (average level)
        features.append(np.mean(col_data))

        # 2. Standard Deviation (variability)
        features.append(np.std(col_data))

        # 3. Trend Slope (is it increasing/decreasing?)
        x = np.arange(len(col_data))
        if np.std(col_data) > 0:
            slope = np.polyfit(x, col_data, 1)[0]
        else:
            slope = 0
        features.append(slope)

        # 4. Change Rate (end vs start)
        if col_data[0] != 0:
            change_rate = (col_data[-1] - col_data[0]) / col_data[0]
        else:
            change_rate = 0
        features.append(change_rate)

        # 5. Recent value (most recent day)
        features.append(col_data[-1])

        # 6. Trend consistency
        diffs = np.diff(col_data)
        if len(diffs) > 0:
            trend_consistency = np.mean(diffs)
        else:
            trend_consistency = 0
        features.append(trend_consistency)

    return np.array(features)


@app.route("/detect_deterioration", methods=["POST"])
def detect_deterioration():
    """
    TREND-BASED DETERIORATION DETECTION - UNSUPERVISED ML

    This endpoint:
    1. Fetches PAST 7 days of health data from Firebase
    2. Analyzes TRENDS (increasing/decreasing patterns)
    3. Detects if health is DECLINING

    NO future prediction - only detects current deterioration status!
    Panel-approved: 100% Unsupervised (Isolation Forest + K-Means)
    """
    try:
        data = request.get_json(force=True)
        patient_id_input = data.get("patient_id")

        # Resolve patient ID
        patient_id = resolve_patient_id(patient_id_input) if patient_id_input else None
        if not patient_id:
            return jsonify({"error": "Patient not found"}), 404

        # Fetch 7-day history from Firebase
        history_ref = db.reference(f"health_data/{patient_id}/history")
        history_data = history_ref.get()

        # Also get current data
        current_ref = db.reference(f"health_data/{patient_id}/current")
        current_data = current_ref.get()

        # Debug logging
        print(f"DEBUG: Fetching history for patient_id={patient_id}")
        print(f"DEBUG: history_data exists={history_data is not None}, entries={len(history_data) if history_data else 0}")
        print(f"DEBUG: current_data exists={current_data is not None}")

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

        # Build 7-day data array
        seven_day_data = []

        if history_data:
            sorted_dates = sorted(history_data.keys())[-6:]
            print(f"DEBUG: Using {len(sorted_dates)} history entries: {sorted_dates}")
            for date_key in sorted_dates:
                day_data = history_data[date_key]
                seven_day_data.append([
                    float(day_data.get('heartRate', 70) or 70),
                    float(day_data.get('steps', 5000) or 5000),
                    float(day_data.get('calories', 200) or 200),
                    float(day_data.get('distance', 3.0) or 3.0),
                    float(day_data.get('sleepHours', 7.0) or 7.0),
                    get_workout_minutes(day_data)
                ])

        if current_data:
            seven_day_data.append([
                float(current_data.get('heartRate', 70) or 70),
                float(current_data.get('steps', 5000) or 5000),
                float(current_data.get('calories', 200) or 200),
                float(current_data.get('distance', 3.0) or 3.0),
                float(current_data.get('sleepHours', 7.0) or 7.0),
                get_workout_minutes(current_data)
            ])

        print(f"DEBUG: Total entries built: {len(seven_day_data)}")

        if len(seven_day_data) < 3:
            print(f"DEBUG: INSUFFICIENT DATA - only {len(seven_day_data)} entries")
            return jsonify({
                "error": "Insufficient history data",
                "message": "Need at least 3 days of data for trend analysis",
                "days_available": len(seven_day_data)
            }), 400

        while len(seven_day_data) < 7:
            seven_day_data.insert(0, seven_day_data[0])

        window = np.array(seven_day_data)

        # Check if trend models are loaded
        if trend_detector is None or trend_cluster_model is None:
            return jsonify({
                "error": "Trend models not loaded. Run train_trend_model.py first.",
                "status": "models_not_loaded"
            }), 503

        # Calculate trend features
        trend_features = calculate_trend_features(window)

        # Extract slope values for trend display
        hr_slope = trend_features[2]
        steps_slope = trend_features[8]
        sleep_slope = trend_features[26]

        result = {
            "patient_id": patient_id_input,
            "timestamp": datetime.now().isoformat(),
            "analysis_period": f"Last {len(seven_day_data)} days",
            "past_data_summary": {
                "avg_heart_rate": round(float(np.mean(window[:, 0])), 1),
                "avg_steps": round(float(np.mean(window[:, 1])), 0),
                "avg_sleep": round(float(np.mean(window[:, 4])), 1),
                "heart_rate_trend": "increasing" if hr_slope > 0.5 else ("decreasing" if hr_slope < -0.5 else "stable"),
                "steps_trend": "increasing" if steps_slope > 100 else ("decreasing" if steps_slope < -100 else "stable"),
                "sleep_trend": "increasing" if sleep_slope > 0.1 else ("decreasing" if sleep_slope < -0.1 else "stable"),
            },
            "trend_slopes": {
                "heart_rate": round(float(hr_slope), 2),
                "steps": round(float(steps_slope), 0),
                "sleep": round(float(sleep_slope), 2)
            },
            "detection": {}
        }

        # DETECTION 1: Isolation Forest (Anomaly Detection)
        X_det = trend_detector_scaler.transform([trend_features])
        is_anomaly = trend_detector.predict(X_det)[0] == -1
        anomaly_score = trend_detector.decision_function(X_det)[0]

        result["detection"]["anomaly"] = {
            "is_anomaly": bool(is_anomaly),
            "anomaly_score": round(float(anomaly_score), 3),
            "status": "Abnormal Trend Detected" if is_anomaly else "Normal Trend",
            "method": "Isolation Forest (Unsupervised)"
        }

        # DETECTION 2: K-Means Clustering (Deterioration Status)
        X_cluster = trend_cluster_scaler.transform([trend_features])
        cluster_id = trend_cluster_model.predict(X_cluster)[0]
        cluster_info = trend_cluster_names.get(cluster_id, {"name": "Unknown", "color": "gray", "severity": 1})

        result["detection"]["deterioration_status"] = {
            "status": cluster_info['name'],
            "color": cluster_info['color'],
            "severity": cluster_info['severity'],
            "interpretation": get_deterioration_interpretation(cluster_info['severity'], trend_features),
            "method": "K-Means Clustering (Unsupervised)"
        }

        # Generate recommendations based on detected trends
        result["recommendations"] = generate_deterioration_recommendations(
            cluster_info['severity'], trend_features, is_anomaly
        )

        print(f"Deterioration Detection for {patient_id_input}: {cluster_info['name']}")

        return jsonify(result)

    except Exception as e:
        print(f"ERROR in deterioration detection: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def get_deterioration_interpretation(severity, trend_features):
    """Generate interpretation based on detected deterioration status"""
    hr_slope = trend_features[2]
    steps_slope = trend_features[8]
    sleep_slope = trend_features[26]

    interpretations = {
        0: "Your health metrics are stable or improving over the past week. No deterioration detected.",
        1: "The ML model detected mild declining trends in your recent data. Some metrics show slight decline.",
        2: "The ML model detected significant deterioration patterns. Multiple health metrics are declining."
    }

    base = interpretations.get(severity, "Unable to interpret status.")

    details = []
    if hr_slope > 1:
        details.append("Heart rate trending upward")
    if steps_slope < -500:
        details.append("Daily steps declining")
    if sleep_slope < -0.3:
        details.append("Sleep hours decreasing")

    if details:
        return base + " Specifically: " + ", ".join(details) + "."
    return base


def generate_deterioration_recommendations(severity, trend_features, is_anomaly):
    """Generate recommendations based on detected deterioration"""
    recommendations = []

    hr_slope = trend_features[2]
    steps_slope = trend_features[8]
    sleep_slope = trend_features[26]

    if severity == 2:
        recommendations.append({
            "priority": "high",
            "message": "Significant health deterioration detected. Consider consulting a healthcare provider.",
            "based_on": "7-day trend analysis shows multiple declining metrics"
        })

    if is_anomaly:
        recommendations.append({
            "priority": "high",
            "message": "Unusual health pattern detected. Your recent trends differ significantly from normal.",
            "based_on": "Isolation Forest anomaly detection"
        })

    if hr_slope > 1:
        recommendations.append({
            "priority": "medium",
            "message": "Your heart rate has been trending upward. Consider stress management.",
            "based_on": f"Heart rate slope: +{hr_slope:.1f} BPM/day"
        })

    if steps_slope < -500:
        recommendations.append({
            "priority": "medium",
            "message": "Your daily activity is declining. Try to increase movement gradually.",
            "based_on": f"Steps slope: {steps_slope:.0f} steps/day"
        })

    if sleep_slope < -0.3:
        recommendations.append({
            "priority": "medium",
            "message": "Sleep duration trending down. Prioritize consistent sleep schedule.",
            "based_on": f"Sleep slope: {sleep_slope:.2f} hours/day"
        })

    if len(recommendations) == 0:
        recommendations.append({
            "priority": "low",
            "message": "Your health trends look stable! Keep maintaining your current habits.",
            "based_on": "No deterioration detected in 7-day analysis"
        })

    return recommendations


# -----------------------------------------------------------------------------
# Run Flask
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("Starting Health Sync Flask Server")
    print("=" * 60)
    print("ML System: Watch-Only Variables (No Manual Input)")
    print("Features: heartRate, steps, calories, distance, sleepHours, workout")
    print("Models: Health Risk State (Supervised) + Anomaly Detection (Unsupervised)")
    print("=" * 60)

    app.run(debug=True, host="0.0.0.0", port=5000, use_reloader=False)
