"""
Health Deterioration Detection Model - UNSUPERVISED
====================================================
Analyzes PAST 7 days to detect TREND-BASED DETERIORATION
NO future prediction - only detects declining patterns

Models:
1. Isolation Forest - Detects abnormal trend patterns
2. Statistical Trend Analysis - Calculates slopes and changes

PANEL-APPROVED APPROACH:
- No manual labels
- No future value prediction
- Only detects if health is DECLINING based on past data
- Unsupervised learning from FitBit dataset

Author: Health Sync FYP Project
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import pickle
import os
import warnings
warnings.filterwarnings('ignore')

# Paths
BASE_PATH = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_PATH, "..", "ML model doc", "mturkfitbit_export_4.12.16-5.12.16", "Fitabase Data 4.12.16-5.12.16")


def load_time_series_data():
    """Load FitBit data with time-series structure for trend analysis"""
    print("=" * 60)
    print("LOADING TIME-SERIES DATA FOR TREND ANALYSIS")
    print("=" * 60)

    # Load Daily Activity
    activity_file = os.path.join(DATASET_PATH, "dailyActivity_merged.csv")
    print(f"\nLoading: dailyActivity_merged.csv")
    df_activity = pd.read_csv(activity_file)

    # Load Sleep Data
    sleep_file = os.path.join(DATASET_PATH, "sleepDay_merged.csv")
    print(f"Loading: sleepDay_merged.csv")
    df_sleep = pd.read_csv(sleep_file)

    # Load Heart Rate Data
    heartrate_file = os.path.join(DATASET_PATH, "heartrate_seconds_merged.csv")
    print(f"Loading: heartrate_seconds_merged.csv")
    df_hr = pd.read_csv(heartrate_file)

    # Process Heart Rate - daily average per user
    df_hr['Date'] = pd.to_datetime(df_hr['Time']).dt.date
    df_hr_daily = df_hr.groupby(['Id', 'Date'])['Value'].mean().reset_index()
    df_hr_daily.columns = ['Id', 'Date', 'AvgHeartRate']

    # Process dates
    df_activity['Date'] = pd.to_datetime(df_activity['ActivityDate']).dt.date
    df_sleep['Date'] = pd.to_datetime(df_sleep['SleepDay']).dt.date

    # Merge all datasets
    df = pd.merge(df_activity, df_sleep[['Id', 'Date', 'TotalMinutesAsleep']],
                  on=['Id', 'Date'], how='left')
    df = pd.merge(df, df_hr_daily, on=['Id', 'Date'], how='left')

    # Calculate derived features
    df['SleepHours'] = df['TotalMinutesAsleep'] / 60
    df['ActiveMinutes'] = df['VeryActiveMinutes'] + df['FairlyActiveMinutes']

    # Fill missing values
    df['SleepHours'] = df['SleepHours'].fillna(df['SleepHours'].median())
    df['AvgHeartRate'] = df['AvgHeartRate'].fillna(df['AvgHeartRate'].median())

    # Sort by user and date for time-series
    df = df.sort_values(['Id', 'Date'])

    print(f"\nTotal records: {len(df)}")
    print(f"Unique users: {df['Id'].nunique()}")

    return df


def create_trend_features(df, window_size=7):
    """
    Create TREND features from past N days
    NO LABELS - just feature extraction for pattern detection
    """
    print("\n" + "=" * 60)
    print(f"CREATING TREND FEATURES (Window: {window_size} days)")
    print("For DETERIORATION DETECTION - Not prediction!")
    print("=" * 60)

    feature_cols = ['AvgHeartRate', 'TotalSteps', 'Calories', 'TotalDistance', 'SleepHours', 'ActiveMinutes']

    all_trend_features = []
    all_user_ids = []

    # Group by user
    for user_id, user_data in df.groupby('Id'):
        user_data = user_data.sort_values('Date').reset_index(drop=True)

        if len(user_data) < window_size:
            continue

        # Create trend features for each window
        for i in range(len(user_data) - window_size + 1):
            window = user_data.iloc[i:i+window_size][feature_cols].values
            trend_features = calculate_trend_features(window, feature_cols)
            all_trend_features.append(trend_features)
            all_user_ids.append(user_id)

    print(f"Created {len(all_trend_features)} trend feature vectors")

    return np.array(all_trend_features), all_user_ids


def calculate_trend_features(window, feature_names):
    """
    Extract TREND features from a time window
    These features capture: Is health DECLINING or STABLE?
    """
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

        # 6. Trend consistency (how consistent is the decline/improvement)
        diffs = np.diff(col_data)
        if len(diffs) > 0:
            trend_consistency = np.mean(diffs)
        else:
            trend_consistency = 0
        features.append(trend_consistency)

    return np.array(features)


def train_deterioration_detector(X_trends):
    """
    Train UNSUPERVISED Deterioration Detector
    Uses Isolation Forest - NO LABELS NEEDED!

    This model learns what "normal" trends look like,
    then flags unusual/deteriorating patterns as anomalies.
    """
    print("\n" + "=" * 60)
    print("TRAINING DETERIORATION DETECTOR (UNSUPERVISED)")
    print("Using Isolation Forest - NO manual labels!")
    print("=" * 60)

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_trends)

    # Train Isolation Forest
    # contamination = expected % of "deteriorating" patterns
    detector = IsolationForest(
        n_estimators=100,
        contamination=0.15,  # ~15% of patterns are deteriorating
        random_state=42,
        n_jobs=-1
    )

    detector.fit(X_scaled)

    # Get anomaly scores for analysis
    anomaly_scores = detector.decision_function(X_scaled)
    predictions = detector.predict(X_scaled)

    # Count results
    normal_count = (predictions == 1).sum()
    deteriorating_count = (predictions == -1).sum()

    print(f"\nResults on training data:")
    print(f"  Normal Trends: {normal_count} ({normal_count/len(predictions)*100:.1f}%)")
    print(f"  Deteriorating Trends: {deteriorating_count} ({deteriorating_count/len(predictions)*100:.1f}%)")

    return detector, scaler, anomaly_scores


def train_trend_pattern_clustering(X_trends):
    """
    Train K-Means to find NATURAL trend pattern groups
    UNSUPERVISED - Model learns patterns itself
    """
    print("\n" + "=" * 60)
    print("TRAINING TREND PATTERN CLUSTERING (UNSUPERVISED)")
    print("Finding natural groups of health trends")
    print("=" * 60)

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_trends)

    # Find optimal clusters
    print("\nFinding optimal clusters...")
    best_k = 3
    best_score = -1

    for k in range(2, 5):
        kmeans_temp = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels_temp = kmeans_temp.fit_predict(X_scaled)
        score = silhouette_score(X_scaled, labels_temp)
        print(f"  K={k}: Silhouette Score = {score:.4f}")
        if score > best_score:
            best_score = score
            best_k = k

    print(f"\nOptimal clusters: {best_k}")

    # Train final model
    kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(X_scaled)

    # Analyze clusters to assign meaningful names
    # Based on trend slopes (are metrics declining or improving?)
    cluster_info = analyze_trend_clusters(X_trends, cluster_labels, best_k)

    return kmeans, scaler, cluster_info


def analyze_trend_clusters(X_trends, labels, n_clusters):
    """
    Analyze what each cluster represents based on trend patterns
    NO manual labels - just analyzing learned patterns
    """
    print("\n" + "-" * 40)
    print("ANALYZING TREND CLUSTERS")
    print("-" * 40)

    # Feature indices for slopes (every 6th feature starting from index 2)
    # Features per variable: mean, std, slope, change_rate, recent, consistency
    hr_slope_idx = 2
    steps_slope_idx = 8
    sleep_slope_idx = 26

    cluster_stats = []

    for cluster_id in range(n_clusters):
        mask = labels == cluster_id
        cluster_data = X_trends[mask]

        stats = {
            'cluster': cluster_id,
            'count': mask.sum(),
            'hr_slope': np.mean(cluster_data[:, hr_slope_idx]),
            'steps_slope': np.mean(cluster_data[:, steps_slope_idx]),
            'sleep_slope': np.mean(cluster_data[:, sleep_slope_idx]),
        }

        # Calculate overall health score (positive = improving, negative = declining)
        # Steps increasing = good, HR decreasing = good (generally), Sleep stable/increasing = good
        health_score = stats['steps_slope'] * 0.001 - stats['hr_slope'] * 0.5 + stats['sleep_slope'] * 2

        stats['health_score'] = health_score
        cluster_stats.append(stats)

    # Sort by health score (best to worst)
    cluster_stats.sort(key=lambda x: x['health_score'], reverse=True)

    # Assign names based on ranking
    cluster_names = {}
    for i, stats in enumerate(cluster_stats):
        if i == 0:
            name = "Stable/Improving"
            color = "green"
            severity = 0
        elif i == len(cluster_stats) - 1:
            name = "Severe Deterioration"
            color = "red"
            severity = 2
        else:
            name = "Mild Deterioration"
            color = "yellow"
            severity = 1

        cluster_names[stats['cluster']] = {
            'name': name,
            'color': color,
            'severity': severity
        }

        print(f"\nCluster {stats['cluster']} -> {name}")
        print(f"  Records: {stats['count']}")
        print(f"  HR Slope: {stats['hr_slope']:.2f} BPM/day")
        print(f"  Steps Slope: {stats['steps_slope']:.0f} steps/day")
        print(f"  Sleep Slope: {stats['sleep_slope']:.2f} hrs/day")
        print(f"  Health Score: {stats['health_score']:.2f}")

    return cluster_names


def save_models(detector, det_scaler, cluster_model, cluster_scaler, cluster_names):
    """Save all trained models"""
    print("\n" + "=" * 60)
    print("SAVING MODELS")
    print("=" * 60)

    # Save Isolation Forest detector
    with open('trend_detector.pkl', 'wb') as f:
        pickle.dump(detector, f)
    print("Saved: trend_detector.pkl")

    # Save detector scaler
    with open('trend_detector_scaler.pkl', 'wb') as f:
        pickle.dump(det_scaler, f)
    print("Saved: trend_detector_scaler.pkl")

    # Save trend clustering model
    with open('trend_cluster_model.pkl', 'wb') as f:
        pickle.dump(cluster_model, f)
    print("Saved: trend_cluster_model.pkl")

    # Save cluster scaler
    with open('trend_cluster_scaler.pkl', 'wb') as f:
        pickle.dump(cluster_scaler, f)
    print("Saved: trend_cluster_scaler.pkl")

    # Save cluster names
    with open('trend_cluster_names.pkl', 'wb') as f:
        pickle.dump(cluster_names, f)
    print("Saved: trend_cluster_names.pkl")

    # Save model info
    with open('trend_model_info.txt', 'w') as f:
        f.write("Health Deterioration Detection Model\n")
        f.write("=" * 50 + "\n\n")
        f.write("PURPOSE: Detect health DETERIORATION from past trends\n")
        f.write("NOT future prediction - just pattern detection!\n\n")
        f.write("APPROACH: 100% UNSUPERVISED\n")
        f.write("- No manual labels\n")
        f.write("- No future value prediction\n")
        f.write("- Model learns normal patterns from FitBit data\n\n")
        f.write("INPUT: Past 7 days of watch data\n")
        f.write("OUTPUT:\n")
        f.write("  1. Deterioration Status (Normal/Mild/Severe)\n")
        f.write("  2. Anomaly Score\n")
        f.write("  3. Trend Analysis (slopes)\n\n")
        f.write("MODELS USED:\n")
        f.write("  1. Isolation Forest (Anomaly Detection)\n")
        f.write("  2. K-Means Clustering (Pattern Grouping)\n\n")
        f.write("FEATURES (per variable):\n")
        f.write("  - Mean, Std, Slope, Change Rate, Recent Value, Consistency\n")
    print("Saved: trend_model_info.txt")


def test_deterioration_detection():
    """Test with sample trend patterns"""
    print("\n" + "=" * 60)
    print("TESTING DETERIORATION DETECTION")
    print("=" * 60)

    # Load models
    with open('trend_detector.pkl', 'rb') as f:
        detector = pickle.load(f)
    with open('trend_detector_scaler.pkl', 'rb') as f:
        det_scaler = pickle.load(f)
    with open('trend_cluster_model.pkl', 'rb') as f:
        cluster_model = pickle.load(f)
    with open('trend_cluster_scaler.pkl', 'rb') as f:
        cluster_scaler = pickle.load(f)
    with open('trend_cluster_names.pkl', 'rb') as f:
        cluster_names = pickle.load(f)

    feature_names = ['AvgHeartRate', 'TotalSteps', 'Calories', 'TotalDistance', 'SleepHours', 'ActiveMinutes']

    # Test Case 1: DECLINING health (should detect deterioration)
    declining_week = np.array([
        [75, 8000, 2000, 6.0, 7.5, 45],  # Day 1 - Good
        [77, 7000, 1900, 5.5, 7.0, 40],
        [79, 6000, 1800, 5.0, 6.5, 35],
        [82, 5000, 1700, 4.5, 6.0, 30],
        [85, 4000, 1600, 4.0, 5.5, 25],
        [88, 3000, 1500, 3.5, 5.0, 20],
        [92, 2000, 1400, 3.0, 4.5, 15],  # Day 7 - Declining
    ])

    # Test Case 2: STABLE health
    stable_week = np.array([
        [72, 7500, 1900, 5.5, 7.2, 35],
        [73, 7200, 1850, 5.3, 7.0, 33],
        [71, 7800, 1950, 5.6, 7.3, 38],
        [72, 7400, 1880, 5.4, 7.1, 36],
        [73, 7600, 1920, 5.5, 7.2, 37],
        [71, 7300, 1870, 5.4, 7.0, 34],
        [72, 7500, 1900, 5.5, 7.1, 35],  # Stable throughout
    ])

    # Test Case 3: IMPROVING health
    improving_week = np.array([
        [85, 4000, 1500, 3.5, 5.5, 15],  # Day 1 - Poor
        [82, 5000, 1600, 4.0, 6.0, 20],
        [80, 6000, 1700, 4.5, 6.5, 25],
        [78, 7000, 1800, 5.0, 7.0, 30],
        [76, 7500, 1900, 5.5, 7.3, 35],
        [74, 8000, 2000, 6.0, 7.5, 40],
        [72, 8500, 2100, 6.5, 7.8, 45],  # Day 7 - Improving
    ])

    test_cases = [
        ("DECLINING Health (Should detect deterioration)", declining_week),
        ("STABLE Health (Should be normal)", stable_week),
        ("IMPROVING Health (Should be normal/good)", improving_week),
    ]

    for name, week_data in test_cases:
        print(f"\n{name}")
        print("-" * 50)

        # Calculate trend features
        trend_features = calculate_trend_features(week_data, feature_names)

        # Isolation Forest detection
        X_det = det_scaler.transform([trend_features])
        is_anomaly = detector.predict(X_det)[0] == -1
        anomaly_score = detector.decision_function(X_det)[0]

        # Cluster classification
        X_cluster = cluster_scaler.transform([trend_features])
        cluster_id = cluster_model.predict(X_cluster)[0]
        cluster_info = cluster_names[cluster_id]

        print(f"  Deterioration Status: {cluster_info['name']}")
        print(f"  Anomaly Detected: {'Yes' if is_anomaly else 'No'}")
        print(f"  Anomaly Score: {anomaly_score:.3f}")
        print(f"  Severity Level: {cluster_info['severity']} (0=Normal, 1=Mild, 2=Severe)")

        # Show trend analysis
        hr_slope = trend_features[2]
        steps_slope = trend_features[8]
        sleep_slope = trend_features[26]

        print(f"  Trend Analysis:")
        print(f"    HR: {'Rising' if hr_slope > 0.5 else 'Falling' if hr_slope < -0.5 else 'Stable'} ({hr_slope:+.1f} BPM/day)")
        print(f"    Steps: {'Rising' if steps_slope > 100 else 'Falling' if steps_slope < -100 else 'Stable'} ({steps_slope:+.0f}/day)")
        print(f"    Sleep: {'Rising' if sleep_slope > 0.1 else 'Falling' if sleep_slope < -0.1 else 'Stable'} ({sleep_slope:+.2f} hrs/day)")


if __name__ == "__main__":
    print("\n")
    print("*" * 60)
    print("*  HEALTH SYNC - DETERIORATION DETECTION MODEL             *")
    print("*  UNSUPERVISED - No manual labels!                        *")
    print("*  Detects declining trends - NOT future prediction!       *")
    print("*" * 60)

    # Load time-series data
    df = load_time_series_data()

    # Create trend features (7-day window)
    X_trends, user_ids = create_trend_features(df, window_size=7)

    # Train Isolation Forest (Anomaly Detection)
    detector, det_scaler, anomaly_scores = train_deterioration_detector(X_trends)

    # Train K-Means (Trend Pattern Clustering)
    cluster_model, cluster_scaler, cluster_names = train_trend_pattern_clustering(X_trends)

    # Save models
    save_models(detector, det_scaler, cluster_model, cluster_scaler, cluster_names)

    # Test
    test_deterioration_detection()

    print("\n" + "=" * 60)
    print("TRAINING COMPLETE!")
    print("=" * 60)
    print("\nPANEL-APPROVED APPROACH:")
    print("  - 100% Unsupervised (Isolation Forest + K-Means)")
    print("  - NO manual labels")
    print("  - NO future prediction")
    print("  - Only detects if health is DECLINING")
    print("  - Based on past 7 days trend analysis")
    print("\nFiles created:")
    print("  - trend_detector.pkl (Isolation Forest)")
    print("  - trend_detector_scaler.pkl")
    print("  - trend_cluster_model.pkl (K-Means)")
    print("  - trend_cluster_scaler.pkl")
    print("  - trend_cluster_names.pkl")
    print("=" * 60)
