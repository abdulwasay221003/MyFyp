package com.healthsync.connector

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.FirebaseDatabase
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.*

/**
 * Firebase Sync Worker
 *
 * Background service that:
 * 1. Reads health data from Health Connect
 * 2. Uploads it to Firebase Realtime Database
 * 3. Runs periodically (every 15 minutes)
 */
class FirebaseSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    private val healthConnectManager = HealthConnectManager(context)
    private val auth = FirebaseAuth.getInstance()
    private val database = FirebaseDatabase.getInstance()

    companion object {
        private const val TAG = "FirebaseSyncWorker"
        private const val NOTIFICATION_CHANNEL_ID = "health_sync_channel"
        private const val NOTIFICATION_ID = 1001
    }

    /**
     * Main work function - called by WorkManager
     */
    override suspend fun doWork(): Result {
        val currentTime = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        Log.d(TAG, "🔔 ========== SYNC STARTED at $currentTime ==========")

        // Show notification that sync started
        showNotification("Syncing health data...", "Started at $currentTime")

        return try {
            // 1. Check if user is authenticated
            val currentUser = auth.currentUser
            if (currentUser == null) {
                Log.w(TAG, "User not authenticated. Please login on the website first.")
                return Result.failure()
            }

            val userId = currentUser.uid
            Log.d(TAG, "Syncing data for user: $userId")

            // 2. Check if we have permissions
            if (!healthConnectManager.hasAllPermissions()) {
                Log.w(TAG, "Missing Health Connect permissions")
                return Result.failure()
            }

            // 3. Read all health data from Health Connect
            val healthData = healthConnectManager.getAllHealthData()
            Log.d(TAG, "Health data collected: $healthData")

            // 4. Upload to Firebase
            uploadToFirebase(userId, healthData)

            val endTime = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
            val steps = healthData["steps"] ?: "N/A"

            Log.d(TAG, "✅ Sync completed successfully at $endTime")
            Log.d(TAG, "📊 Data: Steps=$steps")
            Log.d(TAG, "========================================")

            // Show success notification
            showNotification(
                "✅ Sync Complete",
                "Steps: $steps at $endTime"
            )

            Result.success()

        } catch (e: Exception) {
            Log.e(TAG, "❌ Error during sync", e)
            showNotification("❌ Sync Failed", e.message ?: "Unknown error")
            Result.retry() // Retry on error
        }
    }

    /**
     * Upload health data to Firebase Realtime Database
     * Stores in THREE places:
     * 1. /current - Latest real-time data (always overwritten)
     * 2. /daily/YYYY-MM-DD - Latest data for today (overwritten throughout the day)
     * 3. /history/{timestamp} - NEW separate entry for EACH sync (never overwritten)
     */
    private suspend fun uploadToFirebase(userId: String, healthData: Map<String, Any?>) {
        try {
            val timestamp = System.currentTimeMillis()

            // Format timestamp to readable date and time
            val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault())
            val readableTimestamp = dateFormat.format(Date(timestamp))

            // Get today's date for daily history (YYYY-MM-DD format)
            val dateOnlyFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val todayDate = dateOnlyFormat.format(Date(timestamp))

            // Convert health data to Firebase format - SIMPLE VALUES ONLY
            val firebaseData = mutableMapOf<String, Any>()

            // Log what we received from Health Connect
            Log.d(TAG, "--- Raw Health Data Received ---")
            Log.d(TAG, "Heart Rate: ${healthData["heartRate"]}")
            Log.d(TAG, "Steps: ${healthData["steps"]}")
            Log.d(TAG, "Calories: ${healthData["calories"]}")
            Log.d(TAG, "Distance: ${healthData["distance"]}")

            // Store simple values directly - NO nested maps, NO extra fields
            healthData["heartRate"]?.let { firebaseData["heartRate"] = it }
            healthData["steps"]?.let { firebaseData["steps"] = it }
            healthData["calories"]?.let { firebaseData["calories"] = it }
            healthData["distance"]?.let { firebaseData["distance"] = it }
            healthData["sleepHours"]?.let { firebaseData["sleepHours"] = it }
            healthData["workout"]?.let { firebaseData["workout"] = it }

            // Log what we're sending to Firebase
            Log.d(TAG, "--- Data Being Sent to Firebase ---")
            Log.d(TAG, "Firebase Data: $firebaseData")

            firebaseData["timestamp"] = timestamp
            firebaseData["readableTime"] = readableTimestamp
            firebaseData["source"] = "amazfit_pace"

            // 1. Update CURRENT real-time data (OVERWRITTEN each sync)
            val currentRef = database.getReference("health_data")
                .child(userId)
                .child("current")

            currentRef.setValue(firebaseData).await()
            Log.d(TAG, "✅ Current data updated: health_data/$userId/current")

            // 2. Update DAILY summary (OVERWRITTEN throughout the day, one entry per date)
            val dailyRef = database.getReference("health_data")
                .child(userId)
                .child("daily")
                .child(todayDate)

            dailyRef.setValue(firebaseData).await()
            Log.d(TAG, "✅ Daily summary updated: health_data/$userId/daily/$todayDate")

            // 3. Create NEW HISTORY entry (NEVER overwritten, separate entry for each sync)
            val historyRef = database.getReference("health_data")
                .child(userId)
                .child("history")
                .child(timestamp.toString())

            historyRef.setValue(firebaseData).await()
            Log.d(TAG, "✅ History entry created: health_data/$userId/history/$timestamp")
            Log.d(TAG, "Readable time: $readableTimestamp")

        } catch (e: Exception) {
            Log.e(TAG, "❌ Error uploading to Firebase", e)
            throw e
        }
    }

    /**
     * Show notification to user when sync happens
     * This helps you SEE when the 15-minute automatic sync is working
     */
    private fun showNotification(title: String, message: String) {
        val notificationManager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create notification channel for Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Health Data Sync",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Shows when health data syncs to Firebase"
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Build notification
        val notification = NotificationCompat.Builder(applicationContext, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_popup_sync)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(NOTIFICATION_ID, notification)
    }
}
