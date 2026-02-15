"""
Health Pattern Learning Model - UNSUPERVISED
=============================================
Uses FitBit Dataset - ONLY Smartwatch Variables (No Manual Input)
NO MANUAL LABELS - Model learns patterns itself!

Models:
1. K-Means Clustering - Finds natural health pattern groups
2. Isolation Forest - Detects abnormal patterns

Author: Health Sync FYP Project
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.metrics import silhouette_score
import pickle
import os
import warnings
warnings.filterwarnings('ignore')

# Paths to dataset files
BASE_PATH = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_PATH, "..", "ML model doc", "mturkfitbit_export_4.12.16-5.12.16", "Fitabase Data 4.12.16-5.12.16")


def load_and_prepare_data():
    """Load and merge all FitBit data files"""
    print("=" * 60)
    print("LOADING FITBIT DATASET")
    print("=" * 60)

    # Load Daily Activity (main dataset)
    activity_file = os.path.join(DATASET_PATH, "dailyActivity_merged.csv")
    print(f"\nLoading: dailyActivity_merged.csv")
    df_activity = pd.read_csv(activity_file)
    print(f"  Rows: {len(df_activity)}")

    # Load Sleep Data
    sleep_file = os.path.join(DATASET_PATH, "sleepDay_merged.csv")
    print(f"Loading: sleepDay_merged.csv")
    df_sleep = pd.read_csv(sleep_file)
    print(f"  Rows: {len(df_sleep)}")

    # Load Heart Rate Data
    heartrate_file = os.path.join(DATASET_PATH, "heartrate_seconds_merged.csv")
    print(f"Loading: heartrate_seconds_merged.csv")
    df_hr = pd.read_csv(heartrate_file)
    print(f"  Rows: {len(df_hr)}")

    # Process Heart Rate - get daily average per user
    print("\nProcessing data...")
    df_hr['Date'] = pd.to_datetime(df_hr['Time']).dt.date
    df_hr_daily = df_hr.groupby(['Id', 'Date'])['Value'].mean().reset_index()
    df_hr_daily.columns = ['Id', 'Date', 'AvgHeartRate']

    # Process dates
    df_activity['Date'] = pd.to_datetime(df_activity['ActivityDate']).dt.date
    df_sleep['Date'] = pd.to_datetime(df_sleep['SleepDay']).dt.date

    # Merge all datasets
    df_merged = pd.merge(df_activity, df_sleep[['Id', 'Date', 'TotalMinutesAsleep']],
                         on=['Id', 'Date'], how='left')
    df_merged = pd.merge(df_merged, df_hr_daily, on=['Id', 'Date'], how='left')

    # Calculate derived features
    df_merged['SleepHours'] = df_merged['TotalMinutesAsleep'] / 60
    df_merged['ActiveMinutes'] = df_merged['VeryActiveMinutes'] + df_merged['FairlyActiveMinutes']

    # Fill missing values with median (not arbitrary values)
    df_merged['SleepHours'] = df_merged['SleepHours'].fillna(df_merged['SleepHours'].median())
    df_merged['AvgHeartRate'] = df_merged['AvgHeartRate'].fillna(df_merged['AvgHeartRate'].median())

    # Remove rows with missing values
    df_merged = df_merged.dropna(subset=['TotalSteps', 'Calories', 'TotalDistance'])

    print(f"\nFinal dataset: {len(df_merged)} records")

    return df_merged


def train_clustering_model(df):
    """
    Train K-Means Clustering - MODEL LEARNS PATTERNS ITSELF
    No manual labels! Model finds natural groupings in data.
    """
    print("\n" + "=" * 60)
    print("TRAINING CLUSTERING MODEL (UNSUPERVISED)")
    print("Model will LEARN patterns itself - NO manual labels!")
    print("=" * 60)

    # Features (ONLY watch variables)
    feature_columns = [
        'AvgHeartRate',
        'TotalSteps',
        'Calories',
        'TotalDistance',
        'SleepHours',
        'ActiveMinutes'
    ]

    print(f"\nFeatures: {feature_columns}")

    X = df[feature_columns].values

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Find optimal number of clusters using silhouette score
    print("\nFinding optimal clusters...")
    best_k = 3
    best_score = -1

    for k in range(2, 6):
        kmeans_temp = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels_temp = kmeans_temp.fit_predict(X_scaled)
        score = silhouette_score(X_scaled, labels_temp)
        print(f"  K={k}: Silhouette Score = {score:.4f}")
        if score > best_score:
            best_score = score
            best_k = k

    print(f"\nOptimal clusters: {best_k}")

    # Train final K-Means model
    print("\n" + "-" * 40)
    print(f"Training K-Means with {best_k} clusters...")
    print("-" * 40)

    kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(X_scaled)

    # Analyze what each cluster represents
    df['Cluster'] = cluster_labels

    print("\n" + "=" * 60)
    print("CLUSTER ANALYSIS (Model learned these patterns!)")
    print("=" * 60)

    cluster_stats = []
    for cluster_id in range(best_k):
        cluster_data = df[df['Cluster'] == cluster_id]
        stats = {
            'cluster': cluster_id,
            'count': len(cluster_data),
            'avg_steps': cluster_data['TotalSteps'].mean(),
            'avg_sleep': cluster_data['SleepHours'].mean(),
            'avg_hr': cluster_data['AvgHeartRate'].mean(),
            'avg_active': cluster_data['ActiveMinutes'].mean(),
            'avg_calories': cluster_data['Calories'].mean()
        }
        cluster_stats.append(stats)

    # Sort clusters by health indicators (steps + active minutes)
    cluster_stats.sort(key=lambda x: x['avg_steps'] + x['avg_active'], reverse=True)

    # Assign meaningful names based on learned patterns
    cluster_names = {}
    for i, stats in enumerate(cluster_stats):
        if i == 0:
            name = "Healthy Pattern"
            color = "green"
        elif i == len(cluster_stats) - 1:
            name = "High Risk Pattern"
            color = "red"
        else:
            name = "Moderate Risk Pattern"
            color = "yellow"

        cluster_names[stats['cluster']] = {'name': name, 'color': color, 'rank': i}

        print(f"\nCluster {stats['cluster']} -> {name}")
        print(f"  Records: {stats['count']}")
        print(f"  Avg Steps: {stats['avg_steps']:.0f}")
        print(f"  Avg Sleep: {stats['avg_sleep']:.1f} hours")
        print(f"  Avg Heart Rate: {stats['avg_hr']:.0f} BPM")
        print(f"  Avg Active Minutes: {stats['avg_active']:.0f} min")
        print(f"  Avg Calories: {stats['avg_calories']:.0f}")

    return kmeans, scaler, cluster_names, X_scaled


def train_anomaly_model(X_scaled):
    """Train Isolation Forest for anomaly detection"""
    print("\n" + "-" * 40)
    print("Training Anomaly Detection (Isolation Forest)")
    print("-" * 40)

    anomaly_model = IsolationForest(
        n_estimators=100,
        contamination=0.1,
        random_state=42
    )

    anomaly_model.fit(X_scaled)

    anomaly_pred = anomaly_model.predict(X_scaled)
    n_anomalies = (anomaly_pred == -1).sum()
    print(f"Anomalies detected: {n_anomalies} ({n_anomalies/len(X_scaled)*100:.1f}%)")

    return anomaly_model


def save_models(kmeans, scaler, anomaly_model, cluster_names):
    """Save all models"""
    print("\n" + "=" * 60)
    print("SAVING MODELS")
    print("=" * 60)

    # Save clustering model
    with open('health_cluster_model.pkl', 'wb') as f:
        pickle.dump(kmeans, f)
    print("Saved: health_cluster_model.pkl")

    # Save scaler
    with open('health_scaler.pkl', 'wb') as f:
        pickle.dump(scaler, f)
    print("Saved: health_scaler.pkl")

    # Save anomaly model
    with open('anomaly_model.pkl', 'wb') as f:
        pickle.dump(anomaly_model, f)
    print("Saved: anomaly_model.pkl")

    # Save cluster names mapping
    with open('cluster_names.pkl', 'wb') as f:
        pickle.dump(cluster_names, f)
    print("Saved: cluster_names.pkl")

    # Save feature info
    with open('model_features.txt', 'w') as f:
        f.write("Health Pattern Learning Model\n")
        f.write("=" * 50 + "\n\n")
        f.write("UNSUPERVISED LEARNING - No Manual Labels!\n")
        f.write("Model learns patterns from data itself.\n\n")
        f.write("Features (order matters):\n")
        features = ['AvgHeartRate', 'TotalSteps', 'Calories', 'TotalDistance', 'SleepHours', 'ActiveMinutes']
        for i, feat in enumerate(features):
            f.write(f"  {i+1}. {feat}\n")
        f.write(f"\nCluster Mapping:\n")
        for cluster_id, info in cluster_names.items():
            f.write(f"  Cluster {cluster_id}: {info['name']}\n")
    print("Saved: model_features.txt")


def test_predictions(kmeans, scaler, anomaly_model, cluster_names):
    """Test with sample data"""
    print("\n" + "=" * 60)
    print("TESTING PREDICTIONS")
    print("=" * 60)

    test_cases = [
        {"name": "Active Healthy Person", "data": [70, 12000, 2500, 8.0, 7.5, 60]},
        {"name": "Average Person", "data": [75, 6000, 1800, 4.0, 6.5, 20]},
        {"name": "Sedentary Person", "data": [85, 2000, 1400, 1.5, 5.0, 5]},
        {"name": "Extreme Case", "data": [110, 500, 1100, 0.3, 3.0, 0]},
    ]

    print("\nFeature order: [HR, Steps, Calories, Distance, Sleep, ActiveMin]")

    for case in test_cases:
        X = np.array([case['data']])
        X_scaled = scaler.transform(X)

        # Cluster prediction
        cluster = kmeans.predict(X_scaled)[0]
        cluster_info = cluster_names[cluster]

        # Distance to cluster center (confidence-like)
        distances = kmeans.transform(X_scaled)[0]
        min_dist = distances[cluster]
        max_dist = max(distances)
        confidence = (1 - min_dist / max_dist) * 100

        # Anomaly detection
        is_anomaly = anomaly_model.predict(X_scaled)[0] == -1

        print(f"\n{case['name']}:")
        print(f"  Input: {case['data']}")
        print(f"  Pattern: {cluster_info['name']}")
        print(f"  Confidence: {confidence:.1f}%")
        print(f"  Anomaly: {'Yes - Unusual Pattern!' if is_anomaly else 'No - Normal'}")


if __name__ == "__main__":
    print("\n")
    print("*" * 60)
    print("*  HEALTH SYNC - UNSUPERVISED ML MODEL TRAINING           *")
    print("*  No Manual Labels - Model Learns Patterns Itself!       *")
    print("*" * 60)

    # Load data
    df = load_and_prepare_data()

    # Train clustering model (UNSUPERVISED - no labels!)
    kmeans, scaler, cluster_names, X_scaled = train_clustering_model(df)

    # Train anomaly detection
    anomaly_model = train_anomaly_model(X_scaled)

    # Save models
    save_models(kmeans, scaler, anomaly_model, cluster_names)

    # Test predictions
    test_predictions(kmeans, scaler, anomaly_model, cluster_names)

    print("\n" + "=" * 60)
    print("TRAINING COMPLETE!")
    print("=" * 60)
    print("\nKey Points:")
    print("  - NO manual labels used")
    print("  - Model learned patterns from FitBit data")
    print("  - K-Means found natural health groups")
    print("  - Isolation Forest detects abnormal patterns")
    print("\nFiles created:")
    print("  - health_cluster_model.pkl")
    print("  - health_scaler.pkl")
    print("  - anomaly_model.pkl")
    print("  - cluster_names.pkl")
    print("=" * 60)
