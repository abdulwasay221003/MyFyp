# Amazfit Pace Health Sync App

Android app that syncs Amazfit Pace health data from Health Connect to Firebase.

## Data Flow

```
Amazfit Pace → Zepp App → Google Fit → Health Connect → This App → Firebase
```

## Metrics Synced (6 Total)

1. **Heart Rate** - Average BPM from last hour
2. **Steps** - Total from last 24 hours
3. **Calories** - Total burned from last 24 hours
4. **Distance** - Total km from last 24 hours
5. **Sleep** - Total hours from last night
6. **Workout** - Latest exercise session details

## Prerequisites

1. Android Studio installed
2. Physical Android phone or emulator (API 33+)
3. Firebase project with Realtime Database
4. Amazfit Pace watch paired with Zepp app
5. Google Fit app installed
6. Health Connect app installed

## Setup Instructions

### 1. Get Firebase Config

1. Go to Firebase Console → Your Project
2. Add Android app with package name: `com.healthsync.connector`
3. Download `google-services.json`
4. Place it in: `android-companion-app/app/google-services.json`

### 2. Open in Android Studio

1. Open Android Studio
2. Open this folder: `android-companion-app`
3. Wait for Gradle sync to complete

### 3. Connect Device

**Physical Phone:**
- Enable Developer Options (tap Build Number 7 times)
- Enable USB Debugging
- Connect via USB
- Allow debugging on phone

**Emulator:**
- Tools → Device Manager
- Create Pixel 5 with API 33
- Start emulator

### 4. Build & Run

1. Click green ▶️ RUN button
2. Wait for build (~1 minute)
3. App installs automatically

### 5. Configure App (On Device)

1. Open "Health Connect Sync" app
2. Click "Request Health Connect Permissions"
3. Grant all 6 permissions:
   - Heart Rate
   - Steps
   - Calories
   - Distance
   - Sleep
   - Exercise
4. Click "Start Background Sync"

### 6. Configure Health Data Flow

**On your Android phone:**

1. **Zepp App** (for Amazfit Pace):
   - Open Zepp app
   - Ensure watch is synced
   - Enable Health Connect sync in Zepp settings

2. **Google Fit**:
   - Open Google Fit
   - Connect to Health Connect
   - Grant permissions

3. **Health Connect**:
   - Open Health Connect
   - Verify data from Google Fit is visible
   - Grant permissions to this app

## Firebase Structure

Data is written to:

```
health_data/
  {userId}/
    {timestamp}/
      heartRate: 72
      steps: 8432
      calories: 425.5
      distance: 5.2
      sleepHours: 7.5
      workout: {
        exerciseType: "RUNNING"
        durationMinutes: 32
        title: "Morning Run"
      }
      timestamp: 1234567890
      source: "amazfit_pace"
```

## How It Works

1. **Background Service**: Runs every 15 minutes (Android minimum)
2. **Reads Health Connect**: Fetches latest data from last 24 hours
3. **Uploads to Firebase**: Writes to your existing database
4. **Real-time Updates**: Your website dashboard automatically receives data

## Testing

1. Wear your Amazfit Pace watch
2. Do some activity (walk, run, sleep)
3. Open Zepp app → Sync watch
4. Wait 1-2 minutes for Google Fit sync
5. Open this app → Click "Start Background Sync"
6. Check Firebase Console → Realtime Database
7. Look for: `health_data/{uid}/{timestamp}`

## Troubleshooting

### No data in Firebase?
- Check Health Connect has data from Google Fit
- Check Zepp app has synced with watch
- Check app has all 6 permissions granted
- Check phone has internet connection

### Health Connect not available?
- Install from Google Play Store
- Requires Android 9+ (API 28+)

### Watch data not syncing?
- Open Zepp app and manually sync
- Check Google Fit is connected to Health Connect
- Wait 2-3 minutes for data propagation

## Technical Details

- **Language**: Kotlin
- **Min SDK**: 28 (Android 9)
- **Target SDK**: 34 (Android 14)
- **Dependencies**:
  - Health Connect Client
  - Firebase Realtime Database
  - Firebase Auth
  - WorkManager
  - Coroutines

## File Structure

```
app/src/main/java/com/healthsync/connector/
├── MainActivity.kt              # Main UI
├── HealthConnectManager.kt      # Health Connect API
└── FirebaseSyncWorker.kt        # Background sync

app/
├── google-services.json         # Firebase config (YOU ADD THIS)
├── build.gradle.kts             # Dependencies
└── src/main/AndroidManifest.xml # Permissions
```

## Build Time

Total: ~5 minutes
- Open project: 1 min
- Build: 1 min
- Configure: 2 min
- Test: 1 min

## Notes

- Sync runs every 15 minutes (Android WorkManager minimum)
- First sync happens immediately after clicking "Start Sync"
- App works in background even when closed
- Minimal battery impact (~1-2% per day)
- No personal data stored locally (uploads directly to Firebase)

## Support

Check Android Studio Logcat for detailed logs:
- Tag: `HealthConnectManager` - Health Connect operations
- Tag: `FirebaseSyncWorker` - Firebase sync operations
- Tag: `MainActivity` - UI operations

Look for ✅ (success) or ❌ (error) messages in logs.
