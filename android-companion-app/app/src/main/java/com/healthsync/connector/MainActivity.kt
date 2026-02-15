package com.healthsync.connector

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import androidx.work.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.FirebaseDatabase
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

/**
 * Main Activity - Entry point of the app
 *
 * This activity:
 * 1. Checks if Health Connect is available
 * 2. Requests permissions
 * 3. Starts background sync worker
 * 4. Displays status to user
 */
class MainActivity : AppCompatActivity() {

    private lateinit var healthConnectManager: HealthConnectManager
    private lateinit var statusText: TextView
    private lateinit var permissionsButton: Button
    private lateinit var startSyncButton: Button
    private lateinit var syncNowButton: Button
    private lateinit var checkSyncStatusButton: Button
    private lateinit var logoutButton: Button
    private lateinit var userNameText: TextView
    private lateinit var patientIdText: TextView
    private lateinit var auth: FirebaseAuth

    // Register permission launcher BEFORE onCreate
    private val requestPermissions = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        lifecycleScope.launch {
            val hasAll = healthConnectManager.hasAllPermissions()
            if (hasAll) {
                statusText.text = "✅ All permissions granted!"
                startSyncButton.isEnabled = true
                syncNowButton.isEnabled = true
                showToast("Permissions granted successfully")
            } else {
                statusText.text = "❌ Some permissions were denied"
                showToast("Please grant all permissions for the app to work")
            }
        }
    }

    companion object {
        private const val TAG = "MainActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize Firebase
        auth = FirebaseAuth.getInstance()

        // Initialize views
        statusText = findViewById(R.id.statusText)
        permissionsButton = findViewById(R.id.btnRequestPermissions)
        startSyncButton = findViewById(R.id.btnStartSync)
        syncNowButton = findViewById(R.id.btnSyncNow)
        checkSyncStatusButton = findViewById(R.id.btnCheckSyncStatus)
        logoutButton = findViewById(R.id.btnLogout)
        userNameText = findViewById(R.id.userNameText)
        patientIdText = findViewById(R.id.patientIdText)

        // Load user info from Firebase
        loadUserInfo()

        // Initialize Health Connect Manager
        healthConnectManager = HealthConnectManager(this)

        // Check if Health Connect is available on this device
        checkHealthConnectAvailability()

        // Set up button click listeners
        permissionsButton.setOnClickListener {
            requestHealthConnectPermissions()
        }

        startSyncButton.setOnClickListener {
            startBackgroundSync()
        }

        syncNowButton.setOnClickListener {
            syncNowManually()
        }

        checkSyncStatusButton.setOnClickListener {
            checkWorkManagerStatus()
        }

        logoutButton.setOnClickListener {
            logoutUser()
        }

        // Update status
        updateStatus()
    }

    /**
     * Logout user and go back to login screen
     * Allows switching to a different account
     */
    private fun logoutUser() {
        // Stop any running background sync
        WorkManager.getInstance(this).cancelUniqueWork("HealthDataSync")

        // Sign out from Firebase
        auth.signOut()

        // Show message
        showToast("Logged out successfully")

        // Go back to login screen
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    /**
     * Load user info from Firebase and display name + patient ID
     */
    private fun loadUserInfo() {
        val currentUser = auth.currentUser ?: return

        val database = FirebaseDatabase.getInstance()
        database.getReference("users").child(currentUser.uid).get()
            .addOnSuccessListener { snapshot ->
                if (snapshot.exists()) {
                    val fullName = snapshot.child("fullName").getValue(String::class.java) ?: "User"
                    val patientId = snapshot.child("patientId").getValue(String::class.java) ?: "N/A"

                    userNameText.text = "Welcome, $fullName"
                    patientIdText.text = "Patient ID: $patientId"
                }
            }
    }

    /**
     * Check if Health Connect is installed and available
     */
    private fun checkHealthConnectAvailability() {
        val availability = HealthConnectClient.getSdkStatus(this)

        when (availability) {
            HealthConnectClient.SDK_AVAILABLE -> {
                statusText.text = "✅ Health Connect is available"
                permissionsButton.isEnabled = true
            }
            HealthConnectClient.SDK_UNAVAILABLE -> {
                statusText.text = "❌ Health Connect is not available on this device"
                showToast("Please install Health Connect from Google Play")
                permissionsButton.isEnabled = false
            }
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                statusText.text = "⚠️ Health Connect needs to be updated"
                showToast("Please update Health Connect app")
                permissionsButton.isEnabled = false
            }
            else -> {
                statusText.text = "⚠️ Unknown Health Connect status"
                permissionsButton.isEnabled = false
            }
        }
    }

    /**
     * Request Health Connect permissions
     */
    private fun requestHealthConnectPermissions() {
        requestPermissions.launch(HealthConnectManager.PERMISSIONS)
    }

    /**
     * Start background sync using WorkManager
     * Syncs every 15 minutes automatically
     */
    private fun startBackgroundSync() {
        // Create periodic work request (15 minutes - Android minimum)
        val workRequest = PeriodicWorkRequestBuilder<FirebaseSyncWorker>(
            15, TimeUnit.MINUTES  // 15 minutes for automatic background sync
        )
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .setBackoffCriteria(
                BackoffPolicy.LINEAR,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .build()

        // Enqueue the work
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "HealthDataSync",
            ExistingPeriodicWorkPolicy.REPLACE,
            workRequest
        )

        statusText.text = "✅ Automatic sync started!\n" +
                "⏰ Syncs every 15 minutes\n" +
                "💡 Use 'SYNC NOW' button for quick demos\n\n" +
                "First sync will happen in 15 minutes"

        showToast("Automatic sync enabled (15 min intervals)")
    }

    /**
     * Run one-time immediate sync for testing
     */
    private fun runImmediateSync() {
        val oneTimeWork = OneTimeWorkRequestBuilder<FirebaseSyncWorker>()
            .build()

        WorkManager.getInstance(this).enqueue(oneTimeWork)

        showToast("Running immediate sync...")
    }

    /**
     * Manual sync button - for demos and testing
     * Syncs immediately without waiting for background schedule
     */
    private fun syncNowManually() {
        lifecycleScope.launch {
            try {
                statusText.text = "⚡ Syncing now..."
                syncNowButton.isEnabled = false

                // Check if user is authenticated
                val currentUser = auth.currentUser
                if (currentUser == null) {
                    statusText.text = "❌ Please login first"
                    showToast("You need to login to sync data")
                    syncNowButton.isEnabled = true
                    return@launch
                }

                // Get current health data
                val healthData = healthConnectManager.getAllHealthData()

                // Upload directly to Firebase (no delay)
                uploadToFirebaseManually(currentUser.uid, healthData)

                showToast("✅ Data synced to Firebase!")
                statusText.text = "✅ Manual sync complete!\n" +
                        "Steps: ${healthData["steps"] ?: "N/A"}\n" +
                        "Calories: ${healthData["calories"] ?: "N/A"} kcal\n" +
                        "Distance: ${healthData["distance"] ?: "N/A"} km\n" +
                        "Heart Rate: ${healthData["heartRate"] ?: "N/A"} bpm"

                syncNowButton.isEnabled = true
            } catch (e: Exception) {
                statusText.text = "❌ Sync failed: ${e.message}"
                syncNowButton.isEnabled = true
                showToast("Error: ${e.message}")
            }
        }
    }

    /**
     * Upload health data directly to Firebase (for manual sync)
     * Same as FirebaseSyncWorker but called directly for instant sync
     */
    private suspend fun uploadToFirebaseManually(userId: String, healthData: Map<String, Any?>) {
        try {
            val timestamp = System.currentTimeMillis()
            val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault())
            val readableTimestamp = dateFormat.format(Date(timestamp))

            val dateOnlyFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val todayDate = dateOnlyFormat.format(Date(timestamp))

            val firebaseData = mutableMapOf<String, Any>()

            // Log what we received from Health Connect
            android.util.Log.d(TAG, "--- Manual Sync: Raw Health Data ---")
            android.util.Log.d(TAG, "Heart Rate: ${healthData["heartRate"]}")
            android.util.Log.d(TAG, "Steps: ${healthData["steps"]}")
            android.util.Log.d(TAG, "Calories: ${healthData["calories"]}")
            android.util.Log.d(TAG, "Distance: ${healthData["distance"]}")

            // Store simple values directly - NO nested maps, NO extra fields
            healthData["heartRate"]?.let { firebaseData["heartRate"] = it }
            healthData["steps"]?.let { firebaseData["steps"] = it }
            healthData["calories"]?.let { firebaseData["calories"] = it }
            healthData["distance"]?.let { firebaseData["distance"] = it }
            healthData["sleepHours"]?.let { firebaseData["sleepHours"] = it }
            healthData["workout"]?.let { firebaseData["workout"] = it }

            android.util.Log.d(TAG, "--- Manual Sync: Firebase Data ---")
            android.util.Log.d(TAG, "Firebase Data: $firebaseData")

            firebaseData["timestamp"] = timestamp
            firebaseData["readableTime"] = readableTimestamp
            firebaseData["source"] = "amazfit_pace"

            val database = FirebaseDatabase.getInstance()

            // 1. Update CURRENT
            database.getReference("health_data")
                .child(userId)
                .child("current")
                .setValue(firebaseData).await()

            // 2. Update DAILY summary
            database.getReference("health_data")
                .child(userId)
                .child("daily")
                .child(todayDate)
                .setValue(firebaseData).await()

            // 3. Create NEW HISTORY entry
            database.getReference("health_data")
                .child(userId)
                .child("history")
                .child(timestamp.toString())
                .setValue(firebaseData).await()

        } catch (e: Exception) {
            throw e
        }
    }

    /**
     * Update status text with current app state
     */
    private fun updateStatus() {
        lifecycleScope.launch {
            val hasPermissions = healthConnectManager.hasAllPermissions()

            if (hasPermissions) {
                statusText.append("\n✅ Permissions: Granted")
                startSyncButton.isEnabled = true
            } else {
                statusText.append("\n⚠️ Permissions: Not granted")
                startSyncButton.isEnabled = false
            }

            // Check if user is signed in to Firebase
            val currentUser = auth.currentUser
            if (currentUser != null) {
                statusText.append("\n✅ Firebase: Connected")
            } else {
                statusText.append("\n⚠️ Firebase: Please login first")
                showToast("You need to login on the website first")
            }
        }
    }

    /**
     * Check if WorkManager automatic sync is running
     * Shows detailed status about the background sync
     */
    private fun checkWorkManagerStatus() {
        val workManager = WorkManager.getInstance(this@MainActivity)

        // Use LiveData observer instead of Future
        workManager.getWorkInfosForUniqueWorkLiveData("HealthDataSync").observe(this) { workInfos ->
            if (workInfos.isEmpty()) {
                statusText.text = "❌ Auto-sync NOT running!\n\nPress 'Start Background Sync' button to enable it."
                showToast("Auto-sync is NOT active")
            } else {
                val workInfo = workInfos[0]
                val state = workInfo.state
                val runAttemptCount = workInfo.runAttemptCount
                val nextScheduleTime = workInfo.nextScheduleTimeMillis

                val timeUntilNext = if (nextScheduleTime > 0) {
                    val minutesUntilNext = (nextScheduleTime - System.currentTimeMillis()) / 1000 / 60
                    "$minutesUntilNext minutes"
                } else {
                    "Unknown"
                }

                statusText.text = """
                    ✅ Auto-Sync Status: $state

                    📊 Run Count: $runAttemptCount times

                    ⏰ Next Sync In: $timeUntilNext

                    💡 Check your notifications to see when syncs happen!
                """.trimIndent()

                showToast("Auto-sync is running! Next in $timeUntilNext")
            }
        }
    }

    /**
     * Helper function to show toast messages
     */
    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
}
