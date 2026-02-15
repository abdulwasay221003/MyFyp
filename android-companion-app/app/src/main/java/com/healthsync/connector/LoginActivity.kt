package com.healthsync.connector

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.FirebaseDatabase

class LoginActivity : AppCompatActivity() {

    private lateinit var fullNameLayout: TextInputLayout
    private lateinit var fullNameInput: TextInputEditText
    private lateinit var emailInput: TextInputEditText
    private lateinit var passwordInput: TextInputEditText
    private lateinit var primaryActionButton: Button
    private lateinit var toggleModeButton: Button
    private lateinit var statusText: TextView
    private lateinit var auth: FirebaseAuth

    // Track whether we're in signup mode or login mode
    private var isSignupMode = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        // Initialize Firebase Auth
        auth = FirebaseAuth.getInstance()

        // Check if user is already logged in
        if (auth.currentUser != null) {
            goToMainActivity()
            return
        }

        // Initialize views
        fullNameLayout = findViewById(R.id.fullNameLayout)
        fullNameInput = findViewById(R.id.fullNameInput)
        emailInput = findViewById(R.id.emailInput)
        passwordInput = findViewById(R.id.passwordInput)
        primaryActionButton = findViewById(R.id.btnPrimaryAction)
        toggleModeButton = findViewById(R.id.btnToggleMode)
        statusText = findViewById(R.id.statusText)

        // Set up button listeners
        primaryActionButton.setOnClickListener {
            val email = emailInput.text.toString().trim()
            val password = passwordInput.text.toString().trim()
            val fullName = fullNameInput.text.toString().trim()

            if (isSignupMode) {
                if (validateSignupInput(fullName, email, password)) {
                    signupUser(fullName, email, password)
                }
            } else {
                if (validateLoginInput(email, password)) {
                    loginUser(email, password)
                }
            }
        }

        toggleModeButton.setOnClickListener {
            toggleMode()
        }
    }

    /**
     * Toggle between login and signup mode
     */
    private fun toggleMode() {
        isSignupMode = !isSignupMode
        statusText.text = ""

        if (isSignupMode) {
            // Switch to signup mode
            fullNameLayout.visibility = View.VISIBLE
            primaryActionButton.text = "Sign Up"
            primaryActionButton.setBackgroundColor(resources.getColor(android.R.color.holo_green_dark, null))
            toggleModeButton.text = "Already have an account? Login"
        } else {
            // Switch to login mode
            fullNameLayout.visibility = View.GONE
            primaryActionButton.text = "Login"
            primaryActionButton.setBackgroundColor(resources.getColor(android.R.color.holo_blue_dark, null))
            toggleModeButton.text = "Don't have an account? Sign Up"
        }
    }

    private fun validateLoginInput(email: String, password: String): Boolean {
        if (email.isEmpty()) {
            statusText.text = "Please enter your email"
            return false
        }

        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            statusText.text = "Please enter a valid email"
            return false
        }

        if (password.isEmpty()) {
            statusText.text = "Please enter your password"
            return false
        }

        if (password.length < 6) {
            statusText.text = "Password must be at least 6 characters"
            return false
        }

        return true
    }

    private fun validateSignupInput(fullName: String, email: String, password: String): Boolean {
        if (fullName.isEmpty()) {
            statusText.text = "Please enter your full name"
            return false
        }

        if (fullName.length < 2) {
            statusText.text = "Full name must be at least 2 characters"
            return false
        }

        return validateLoginInput(email, password)
    }

    private fun loginUser(email: String, password: String) {
        statusText.text = "Logging in..."
        primaryActionButton.isEnabled = false
        toggleModeButton.isEnabled = false

        auth.signInWithEmailAndPassword(email, password)
            .addOnSuccessListener {
                statusText.text = "Login successful!"
                Toast.makeText(this, "Welcome back!", Toast.LENGTH_SHORT).show()
                goToMainActivity()
            }
            .addOnFailureListener { e ->
                statusText.text = "Login failed: ${e.message}"
                primaryActionButton.isEnabled = true
                toggleModeButton.isEnabled = true
            }
    }

    private fun signupUser(fullName: String, email: String, password: String) {
        statusText.text = "Creating account..."
        primaryActionButton.isEnabled = false
        toggleModeButton.isEnabled = false

        // Firebase Auth automatically checks for duplicate emails
        auth.createUserWithEmailAndPassword(email, password)
            .addOnSuccessListener { result ->
                val userId = result.user?.uid ?: return@addOnSuccessListener

                val database = FirebaseDatabase.getInstance()

                // Get patient_mappings to find the next available ID (SAME table as website)
                database.getReference("patient_mappings").get()
                    .addOnSuccessListener { snapshot ->
                        // Find the highest existing patient number
                        var maxPatientNum = 0
                        snapshot.children.forEach { child ->
                            val key = child.key ?: return@forEach
                            if (key.startsWith("P")) {
                                val num = key.substring(1).toIntOrNull() ?: 0
                                if (num > maxPatientNum) maxPatientNum = num
                            }
                        }
                        val nextPatientId = "P${maxPatientNum + 1}"

                        // Create all entries using SAME structure as website
                        createPatientEntries(database, userId, fullName, email, nextPatientId)
                    }
                    .addOnFailureListener { e ->
                        // If patient_mappings doesn't exist yet, start with P1
                        createPatientEntries(database, userId, fullName, email, "P1")
                    }
            }
            .addOnFailureListener { e ->
                statusText.text = "Signup failed: ${e.message}"
                Toast.makeText(this, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                primaryActionButton.isEnabled = true
                toggleModeButton.isEnabled = true
            }
    }

    /**
     * Create patient entries in Firebase using SAME structure as website:
     * - users/{uid} = {email, fullName, role, patientId, dataSource, createdAt}
     * - patient_mappings/{P1} = firebase_uid (just the string, not object)
     * - patient_info/{P1} = {name, email, uid}
     */
    private fun createPatientEntries(
        database: FirebaseDatabase,
        userId: String,
        fullName: String,
        email: String,
        patientId: String
    ) {
        val createdAt = System.currentTimeMillis()

        // 1. Create user profile in /users/{uid} (same as website)
        val userData = mapOf(
            "email" to email,
            "role" to "patient",
            "fullName" to fullName,
            "dataSource" to "watch",  // App signups use real watch data
            "patientId" to patientId,
            "createdAt" to createdAt
        )

        // 2. patient_info/{P1} = {name, email, uid} (same as website - key is P1, not uid)
        val patientInfo = mapOf(
            "name" to fullName,
            "email" to email,
            "uid" to userId
        )

        // Write all entries (patient_mappings stores just the uid string)
        val updates = hashMapOf<String, Any>(
            "users/$userId" to userData,
            "patient_mappings/$patientId" to userId,  // Just the UID string, not an object
            "patient_info/$patientId" to patientInfo  // Key is P1, not firebase_uid
        )

        database.reference.updateChildren(updates)
            .addOnSuccessListener {
                statusText.text = "Account created! Your ID: $patientId"
                Toast.makeText(this, "Welcome, $fullName! Your Patient ID is $patientId", Toast.LENGTH_LONG).show()
                goToMainActivity()
            }
            .addOnFailureListener { e ->
                statusText.text = "Error creating profile: ${e.message}"
                primaryActionButton.isEnabled = true
                toggleModeButton.isEnabled = true
            }
    }

    private fun goToMainActivity() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
        finish()
    }
}
