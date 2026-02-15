package com.healthsync.connector

import android.content.Context
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.units.Energy
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.temporal.ChronoUnit

class HealthConnectManager(private val context: Context) {

    private val healthConnectClient by lazy { HealthConnectClient.getOrCreate(context) }

    companion object {
        private const val TAG = "HealthConnectManager"

        // Permissions for Health Connect - Works with ANY wearable/fitness app
        // Compatible with: Fitbit, Samsung Galaxy Watch, Garmin, Amazfit, Wear OS,
        // Google Fit, Samsung Health, Strava, and 1000+ other devices/apps
        val PERMISSIONS = setOf(
            HealthPermission.getReadPermission(HeartRateRecord::class),
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
            HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
            HealthPermission.getReadPermission(DistanceRecord::class),
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            HealthPermission.getReadPermission(ExerciseSessionRecord::class)
        )
    }

    suspend fun hasAllPermissions(): Boolean {
        return withContext(Dispatchers.IO) {
            val granted = healthConnectClient.permissionController.getGrantedPermissions()
            PERMISSIONS.all { it in granted }
        }
    }

    // 1. Heart Rate - Get CURRENT reading (most recent) from ANY fitness app (universal)
    suspend fun getHeartRate(): Int? {
        return withContext(Dispatchers.IO) {
            try {
                val now = Instant.now()
                // Get last 6 hours only for most recent/current reading
                val sixHoursAgo = now.minus(6, ChronoUnit.HOURS)

                val request = ReadRecordsRequest(
                    recordType = HeartRateRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(sixHoursAgo, now)
                )

                val response = healthConnectClient.readRecords(request)

                Log.d(TAG, "========== HEART RATE DEBUG ==========")
                Log.d(TAG, "Total HR records found: ${response.records.size}")

                if (response.records.isNotEmpty()) {
                    // Filter out Google Fit to avoid duplicates (it copies data from other sources)
                    val nonDuplicateRecords = response.records.filter {
                        it.metadata.dataOrigin.packageName != "com.google.android.apps.fitness"
                    }

                    val recordsToUse = if (nonDuplicateRecords.isNotEmpty()) nonDuplicateRecords else response.records
                    val allSamples = recordsToUse.flatMap { it.samples }

                    if (allSamples.isNotEmpty()) {
                        // Get MOST RECENT reading (not average!)
                        val currentHR = allSamples.last().beatsPerMinute.toInt()

                        Log.d(TAG, "✅ CURRENT HEART RATE (All sources except Google Fit): $currentHR bpm")
                        Log.d(TAG, "======================================")
                        currentHR
                    } else {
                        Log.w(TAG, "⚠️ No heart rate samples found")
                        Log.d(TAG, "======================================")
                        null
                    }
                } else {
                    Log.d(TAG, "❌ No heart rate data found at all")
                    Log.d(TAG, "======================================")
                    null
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error reading heart rate", e)
                null
            }
        }
    }

    // 2. Steps - Get total from TODAY ONLY (from ANY fitness app - universal)
    suspend fun getSteps(): Long? {
        return withContext(Dispatchers.IO) {
            try {
                val now = Instant.now()
                // Get today's data starting from midnight
                val startOfToday = now.atZone(java.time.ZoneId.systemDefault())
                    .toLocalDate()
                    .atStartOfDay(java.time.ZoneId.systemDefault())
                    .toInstant()

                Log.d(TAG, "========== TIME RANGE DEBUG ==========")
                Log.d(TAG, "Current time (now): $now")
                Log.d(TAG, "Start of today (midnight): $startOfToday")
                Log.d(TAG, "Timezone: ${java.time.ZoneId.systemDefault()}")
                Log.d(TAG, "======================================")

                val request = ReadRecordsRequest(
                    recordType = StepsRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(startOfToday, now)
                )

                val response = healthConnectClient.readRecords(request)
                if (response.records.isNotEmpty()) {
                    Log.d(TAG, "========== STEPS DEBUG ==========")
                    Log.d(TAG, "Total records found: ${response.records.size}")

                    val todayDateString = now.atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString()

                    Log.d(TAG, "Today's date: $todayDateString")

                    response.records.forEach { record ->
                        val recordDate = record.startTime.atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString()
                        val isToday = recordDate == todayDateString

                        Log.d(TAG, "Record: ${record.count} steps from ${record.metadata.dataOrigin.packageName}")
                        Log.d(TAG, "  Start Time: ${record.startTime}")
                        Log.d(TAG, "  Record Date: $recordDate")
                        Log.d(TAG, "  Is Today?: ${if (isToday) "✅ YES" else "❌ NO (OLD DATA)"}")
                    }

                    // Filter out Google Fit - only use Zepp/watch data for accuracy
                    val nonDuplicateRecords = response.records.filter {
                        it.metadata.dataOrigin.packageName != "com.google.android.apps.fitness"
                    }

                    Log.d(TAG, "After filtering Google Fit: ${nonDuplicateRecords.size} records remaining")

                    val totalSteps = nonDuplicateRecords.sumOf { it.count }

                    Log.d(TAG, "✅ FINAL STEPS (Zepp only): $totalSteps")
                    Log.d(TAG, "=================================")
                    totalSteps
                } else {
                    Log.d(TAG, "No steps data found")
                    null
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error reading steps", e)
                null
            }
        }
    }

    // 3. Calories Burned - Get TOTAL from TODAY ONLY (from ANY fitness app - universal)
    suspend fun getCalories(): Double? {
        return withContext(Dispatchers.IO) {
            try {
                val now = Instant.now()
                // Get today's data starting from midnight
                val startOfToday = now.atZone(java.time.ZoneId.systemDefault())
                    .toLocalDate()
                    .atStartOfDay(java.time.ZoneId.systemDefault())
                    .toInstant()

                Log.d(TAG, "========== CALORIES TIME RANGE ==========")
                Log.d(TAG, "Searching from: $startOfToday")
                Log.d(TAG, "Searching to: $now")
                Log.d(TAG, "========================================")

                val request = ReadRecordsRequest(
                    recordType = TotalCaloriesBurnedRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(startOfToday, now)
                )

                val response = healthConnectClient.readRecords(request)

                Log.d(TAG, "========== CALORIES DEBUG ==========")
                Log.d(TAG, "Total calories records found: ${response.records.size}")

                if (response.records.isNotEmpty()) {
                    // Log EVERY record in detail with DATE CHECK
                    val todayDateString = now.atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString()

                    Log.d(TAG, "Today's date: $todayDateString")
                    Log.d(TAG, "Filtering records that START on or after midnight today")

                    response.records.forEachIndexed { index, record ->
                        val recordDate = record.startTime.atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString()
                        val isToday = recordDate == todayDateString

                        Log.d(TAG, "Record #$index:")
                        Log.d(TAG, "  Source: ${record.metadata.dataOrigin.packageName}")
                        Log.d(TAG, "  Calories: ${record.energy.inKilocalories} kcal")
                        Log.d(TAG, "  Start Time: ${record.startTime}")
                        Log.d(TAG, "  Record Date: $recordDate")
                        Log.d(TAG, "  Is Today?: ${if (isToday) "✅ YES" else "❌ NO (OLD DATA)"}")
                    }

                    // Filter out Google Fit to avoid duplicates (it copies data from other sources)
                    Log.d(TAG, "--- Grouped by Source ---")
                    response.records.groupBy { it.metadata.dataOrigin.packageName }
                        .forEach { (source, records) ->
                            val count = records.sumOf { it.energy.inKilocalories }
                            val status = if (source == "com.google.android.apps.fitness") "❌ IGNORING" else "✅ USING"
                            Log.d(TAG, "$status $source: $count kcal (${records.size} records)")
                        }

                    // Accept ANY fitness app EXCEPT Google Fit
                    val nonDuplicateRecords = response.records.filter {
                        it.metadata.dataOrigin.packageName != "com.google.android.apps.fitness"
                    }

                    Log.d(TAG, "After filtering Google Fit: ${nonDuplicateRecords.size} records remaining")

                    val totalCalories = nonDuplicateRecords.sumOf { it.energy.inKilocalories }

                    Log.d(TAG, "✅ FINAL TOTAL CALORIES (Zepp/other sources only): $totalCalories kcal from ${nonDuplicateRecords.size} records")
                    Log.d(TAG, "===================================")
                    totalCalories
                } else {
                    Log.d(TAG, "❌ No calories data found at all")
                    Log.d(TAG, "===================================")
                    null
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error reading calories", e)
                null
            }
        }
    }

    // 4. Distance - Get total from TODAY ONLY (from ANY fitness app - universal)
    suspend fun getDistance(): Double? {
        return withContext(Dispatchers.IO) {
            try {
                val now = Instant.now()
                // Get today's data starting from midnight
                val startOfToday = now.atZone(java.time.ZoneId.systemDefault())
                    .toLocalDate()
                    .atStartOfDay(java.time.ZoneId.systemDefault())
                    .toInstant()

                Log.d(TAG, "========== DISTANCE TIME RANGE ==========")
                Log.d(TAG, "Searching from: $startOfToday to: $now")
                Log.d(TAG, "=========================================")

                val request = ReadRecordsRequest(
                    recordType = DistanceRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(startOfToday, now)
                )

                val response = healthConnectClient.readRecords(request)
                if (response.records.isNotEmpty()) {
                    val todayDateString = now.atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString()

                    Log.d(TAG, "Today's date: $todayDateString")
                    Log.d(TAG, "Total distance records: ${response.records.size}")

                    response.records.forEach { record ->
                        val recordDate = record.startTime.atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString()
                        val isToday = recordDate == todayDateString

                        Log.d(TAG, "Distance record: ${record.distance.inMeters / 1000.0} km")
                        Log.d(TAG, "  Start Time: ${record.startTime}")
                        Log.d(TAG, "  Record Date: $recordDate")
                        Log.d(TAG, "  Is Today?: ${if (isToday) "✅ YES" else "❌ NO (OLD DATA)"}")
                        Log.d(TAG, "  Source: ${record.metadata.dataOrigin.packageName}")
                    }

                    // Filter out Google Fit to avoid duplicates (it copies data from other sources)
                    val nonDuplicateRecords = response.records.filter {
                        it.metadata.dataOrigin.packageName != "com.google.android.apps.fitness"
                    }

                    Log.d(TAG, "After filtering Google Fit: ${nonDuplicateRecords.size} records remaining")

                    val totalMeters = nonDuplicateRecords.sumOf { it.distance.inMeters }
                    val totalKm = totalMeters / 1000.0

                    Log.d(TAG, "✅ FINAL DISTANCE (Zepp/other sources only): $totalKm km from ${nonDuplicateRecords.size} records")
                    totalKm
                } else null
            } catch (e: Exception) {
                Log.e(TAG, "Error reading distance", e)
                null
            }
        }
    }

    // 5. Sleep Duration - Get from last night (in hours)
    suspend fun getSleepHours(): Double? {
        return withContext(Dispatchers.IO) {
            try {
                val now = Instant.now()
                val oneDayAgo = now.minus(1, ChronoUnit.DAYS)

                val request = ReadRecordsRequest(
                    recordType = SleepSessionRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(oneDayAgo, now)
                )

                val response = healthConnectClient.readRecords(request)
                if (response.records.isNotEmpty()) {
                    // Use ALL sources - Health Connect handles deduplication
                    val totalMinutes = response.records.sumOf {
                        ChronoUnit.MINUTES.between(it.startTime, it.endTime)
                    }
                    val totalHours = totalMinutes / 60.0

                    Log.d(TAG, "✅ SLEEP: $totalHours hours from ${response.records.size} sources")
                    totalHours
                } else null
            } catch (e: Exception) {
                Log.e(TAG, "Error reading sleep", e)
                null
            }
        }
    }

    // 6. Workout Metrics - Get ALL exercise sessions from TODAY ONLY (separated by type)
    suspend fun getWorkoutMetrics(): List<Map<String, Any>>? {
        return withContext(Dispatchers.IO) {
            try {
                val now = Instant.now()
                // Get today's workouts only
                val startOfToday = now.atZone(java.time.ZoneId.systemDefault())
                    .toLocalDate()
                    .atStartOfDay(java.time.ZoneId.systemDefault())
                    .toInstant()

                val request = ReadRecordsRequest(
                    recordType = ExerciseSessionRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(startOfToday, now)
                )

                val response = healthConnectClient.readRecords(request)

                Log.d(TAG, "========== WORKOUT DEBUG ==========")
                Log.d(TAG, "Total workout records found: ${response.records.size}")

                if (response.records.isNotEmpty()) {
                    // Filter out Google Fit duplicates
                    val nonDuplicateRecords = response.records.filter {
                        it.metadata.dataOrigin.packageName != "com.google.android.apps.fitness"
                    }

                    // Convert each workout to a map with details
                    val workouts = nonDuplicateRecords.map { workout ->
                        val durationMinutes = ChronoUnit.MINUTES.between(workout.startTime, workout.endTime)
                        val exerciseTypeName = getExerciseTypeName(workout.exerciseType)

                        Log.d(TAG, "Workout: $exerciseTypeName - $durationMinutes mins")
                        Log.d(TAG, "  Time: ${workout.startTime} to ${workout.endTime}")
                        Log.d(TAG, "  Source: ${workout.metadata.dataOrigin.packageName}")

                        mapOf(
                            "exerciseType" to exerciseTypeName,
                            "durationMinutes" to durationMinutes,
                            "title" to (workout.title ?: exerciseTypeName),
                            "startTime" to workout.startTime.toString(),
                            "endTime" to workout.endTime.toString()
                        )
                    }

                    Log.d(TAG, "✅ WORKOUTS TODAY: ${workouts.size} workouts")
                    Log.d(TAG, "===================================")
                    workouts
                } else {
                    Log.d(TAG, "No workouts found for today")
                    Log.d(TAG, "===================================")
                    null
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error reading workout", e)
                null
            }
        }
    }

    // Helper function to convert exercise type code to readable name
    // Based on Health Connect ExerciseSessionRecord types
    private fun getExerciseTypeName(exerciseType: Int): String {
        return when (exerciseType) {
            // Most common exercises (supported by Amazfit Pace)
            79 -> "Walking"
            80 -> "Running"
            8 -> "Cycling"
            73 -> "Swimming"
            77 -> "Yoga"
            56 -> "Weightlifting"

            // Additional exercises (may be available on advanced watches)
            2 -> "Badminton"
            5 -> "Basketball"
            7 -> "Biking"
            9 -> "Calisthenics"
            11 -> "Dancing"
            12 -> "Elliptical"
            13 -> "Exercise Class"
            16 -> "Football (American)"
            17 -> "Football (Australian)"
            18 -> "Football (Soccer)"
            20 -> "Frisbee"
            23 -> "Golf"
            24 -> "Guided Breathing"
            25 -> "Gymnastics"
            26 -> "Handball"
            27 -> "High Intensity Interval Training"
            28 -> "Hiking"
            29 -> "Ice Hockey"
            30 -> "Ice Skating"
            32 -> "Martial Arts"
            33 -> "Meditation"
            36 -> "Paddling"
            37 -> "Paragliding"
            38 -> "Pilates"
            40 -> "Racquetball"
            41 -> "Rock Climbing"
            42 -> "Roller Hockey"
            43 -> "Rowing"
            44 -> "Rowing Machine"
            45 -> "Rugby"
            46 -> "Running (Treadmill)"
            48 -> "Sailing"
            49 -> "Scuba Diving"
            50 -> "Skating"
            51 -> "Skiing"
            52 -> "Snowboarding"
            53 -> "Snowshoeing"
            54 -> "Squash"
            55 -> "Stair Climbing"
            57 -> "Strength Training"
            58 -> "Stretching"
            59 -> "Surfing"
            61 -> "Table Tennis"
            62 -> "Tennis"
            64 -> "Volleyball"
            65 -> "Water Polo"

            else -> "Exercise (Type $exerciseType)"
        }
    }

    // Collect ALL health data at once
    suspend fun getAllHealthData(): Map<String, Any?> {
        return withContext(Dispatchers.IO) {
            mapOf(
                "heartRate" to getHeartRate(),
                "steps" to getSteps(),
                "calories" to getCalories(),
                "distance" to getDistance(),
                "sleepHours" to getSleepHours(),
                "workout" to getWorkoutMetrics(),
                "timestamp" to System.currentTimeMillis()
            )
        }
    }
}
