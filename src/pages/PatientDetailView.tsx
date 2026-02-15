// src/pages/PatientDetailView.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Heart, Activity, Droplet, Thermometer, ArrowLeft, AlertCircle, Footprints, Flame, MapPin, Moon, Dumbbell } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ref, onValue, get } from "firebase/database";
import { database } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface HealthReading {
  heartRate: number;
  steps: number;
  calories: number;
  distance: number;
  sleepHours: number;
  workout: number;
  timestamp: number;
  source?: string;
}

interface PatientProfile {
  fullName: string;
  email: string;
  patientId?: string;
  dateOfBirth?: string;
  gender?: string;
  height?: number;
  weight?: number;
  cholesterol?: string;
  smoking?: boolean;
  diabetes?: boolean;
  active?: boolean;
}

function calculateRiskLevel(reading: HealthReading) {
  if (!reading) return "low";
  const { heartRate, steps, sleepHours } = reading;

  // Calculate risk based on heart rate, activity level, and sleep
  if (
    heartRate > 120 ||  // Very high heart rate
    heartRate < 50 ||   // Very low heart rate (bradycardia)
    steps < 1000 ||     // Very sedentary
    sleepHours < 4      // Severe sleep deprivation
  )
    return "high";

  if (
    heartRate > 100 ||  // Elevated heart rate
    heartRate < 55 ||   // Low heart rate
    steps < 3000 ||     // Sedentary
    sleepHours < 6      // Insufficient sleep
  )
    return "moderate";

  return "low";
}

export default function PatientDetailView() {
  const { patientUid } = useParams<{ patientUid: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reading, setReading] = useState<HealthReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [mlPrediction, setMlPrediction] = useState<any>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);

  // Redirect if not doctor
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    } else if (user.role !== "doctor") {
      toast.error("Access denied. Supervisors only.");
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Fetch patient profile
  useEffect(() => {
    if (!patientUid) return;

    const userRef = ref(database, `users/${patientUid}`);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setPatientProfile({
          fullName: data.fullName || "Unknown",
          email: data.email || "",
          patientId: data.patientId,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          height: data.height,
          weight: data.weight,
          cholesterol: data.cholesterol,
          smoking: data.smoking,
          diabetes: data.diabetes,
          active: data.active,
        });
      } else {
        toast.error("User not found");
        navigate("/doctor/dashboard");
      }
    });
  }, [patientUid, navigate]);

  // Fetch patient's current health data
  useEffect(() => {
    if (!patientUid) return;

    setLoading(true);
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const dataRef = ref(database, `health_data/${patientUid}/current`);
    const unsub = onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const newReading: HealthReading = {
          heartRate: data.heartRate ?? 0,
          steps: data.steps ?? 0,
          calories: data.calories ?? 0,
          distance: data.distance ?? 0,
          sleepHours: data.sleepHours ?? 0,
          workout: data.workout ?? 0,
          timestamp: data.timestamp ?? Date.now(),
          source: data.source ?? "unknown",
        };
        setReading(newReading);
      } else {
        setReading(null);
      }
      setLoading(false);
      clearTimeout(loadingTimeout);
    });

    return () => {
      unsub();
      clearTimeout(loadingTimeout);
    };
  }, [patientUid]);

  // Fetch ML prediction for patient
  useEffect(() => {
    if (!patientUid || !reading || !patientProfile) {
      setMlPrediction(null);
      return;
    }

    const fetchPrediction = async () => {
      setLoadingPrediction(true);
      try {
        const requestData = {
          patient_id: patientUid,
          profile: {
            dateOfBirth: patientProfile.dateOfBirth,
            gender: patientProfile.gender,
            height: patientProfile.height,
            weight: patientProfile.weight,
            cholesterol: patientProfile.cholesterol,
            smoking: patientProfile.smoking,
            diabetes: patientProfile.diabetes,
            active: patientProfile.active !== false,
          },
          vitals: {
            systolic: reading.bloodPressureSystolic,
            diastolic: reading.bloodPressureDiastolic,
          },
        };

        const response = await fetch("http://localhost:5000/predict_cardio_risk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        });

        if (response.ok) {
          const prediction = await response.json();
          setMlPrediction(prediction);
        } else {
          const errorData = await response.json();
          if (errorData.error === "PROFILE_INCOMPLETE") {
            setMlPrediction({
              error: "PROFILE_INCOMPLETE",
              message: errorData.message,
              missing_fields: errorData.missing_fields,
            });
          } else {
            console.error("ML prediction failed:", errorData);
            setMlPrediction(null);
          }
        }
      } catch (error) {
        console.error("Error fetching ML prediction:", error);
        setMlPrediction(null);
      } finally {
        setLoadingPrediction(false);
      }
    };

    fetchPrediction();
  }, [patientUid, reading, patientProfile]);

  if (!user || user.role !== "doctor") return null;

  if (loading || !patientProfile) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (!reading) {
    return (
      <div className="min-h-screen gradient-primary">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Button
            variant="outline"
            onClick={() => navigate("/doctor/dashboard")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="text-center space-y-4 mt-12">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground">No Health Data Available</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              No health data found for {patientProfile.fullName}. The user needs to
              connect their health monitoring device.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const riskLevel = calculateRiskLevel(reading);
  const statusMap = {
    low: { label: "Low Risk", className: "bg-success text-success-foreground" },
    moderate: { label: "Moderate Risk", className: "bg-warning text-warning-foreground" },
    high: { label: "High Risk", className: "bg-danger text-danger-foreground" },
  };
  const status = statusMap[riskLevel];

  return (
    <div className="min-h-screen gradient-primary">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => navigate("/doctor/dashboard")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              User: {patientProfile.fullName}
            </h1>
            <div className="flex gap-4 text-sm text-muted-foreground">
              {patientProfile.patientId && (
                <>
                  <span className="font-mono font-semibold text-primary">
                    ID: {patientProfile.patientId}
                  </span>
                  <span>•</span>
                </>
              )}
              <span>{patientProfile.email}</span>
            </div>
            <p className="text-muted-foreground mt-2">
              Last updated: {new Date(reading.timestamp).toLocaleString()}
            </p>
          </div>
          <Badge className={`text-lg px-6 py-2 ${status.className}`}>{status.label}</Badge>
        </div>

        {/* Metric Cards - Watch Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Heart Rate"
            value={reading.heartRate}
            unit="BPM"
            icon={Heart}
            status={
              reading.heartRate >= 60 && reading.heartRate <= 100
                ? "normal"
                : reading.heartRate > 100
                ? "warning"
                : "danger"
            }
            trend="stable"
            animate
          />
          <MetricCard
            title="Steps"
            value={reading.steps.toLocaleString()}
            unit="steps"
            icon={Footprints}
            status={
              reading.steps >= 8000
                ? "normal"
                : reading.steps >= 5000
                ? "warning"
                : "danger"
            }
            trend={reading.steps >= 8000 ? "up" : "down"}
          />
          <MetricCard
            title="Calories"
            value={reading.calories}
            unit="kcal"
            icon={Flame}
            status={
              reading.calories >= 300
                ? "normal"
                : reading.calories >= 150
                ? "warning"
                : "danger"
            }
            trend="stable"
          />
          <MetricCard
            title="Distance"
            value={reading.distance.toFixed(2)}
            unit="km"
            icon={MapPin}
            status={
              reading.distance >= 5
                ? "normal"
                : reading.distance >= 2
                ? "warning"
                : "danger"
            }
            trend="stable"
          />
          <MetricCard
            title="Sleep"
            value={reading.sleepHours.toFixed(1)}
            unit="hours"
            icon={Moon}
            status={
              reading.sleepHours >= 7 && reading.sleepHours <= 9
                ? "normal"
                : reading.sleepHours >= 6
                ? "warning"
                : "danger"
            }
            trend="stable"
          />
          <MetricCard
            title="Workout"
            value={reading.workout}
            unit="min"
            icon={Dumbbell}
            status={
              reading.workout >= 30
                ? "normal"
                : reading.workout >= 15
                ? "warning"
                : "danger"
            }
            trend={reading.workout >= 30 ? "up" : "down"}
          />
        </div>

        {/* ML Prediction Card */}
        {mlPrediction && (
          <div className="mb-8">
            {mlPrediction.error === "PROFILE_INCOMPLETE" ? (
              <div className="p-6 rounded-xl shadow-custom-md border-2 border-orange-500 bg-orange-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="h-8 w-8 text-orange-500" />
                  <h3 className="text-xl font-bold text-foreground">
                    User Profile Incomplete
                  </h3>
                </div>

                <p className="text-foreground mb-4">{mlPrediction.message}</p>

                <div className="bg-background/30 p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Missing required fields:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {mlPrediction.missing_fields?.map((field: string) => (
                      <li key={field}>
                        {field
                          .charAt(0)
                          .toUpperCase() + field.slice(1).replace(/([A-Z])/g, " $1")}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                  <p className="text-sm text-foreground">
                    <strong>Note:</strong> Please ask the user (
                    <strong>{patientProfile.fullName}</strong>) to complete their health
                    profile to enable ML risk assessment.
                  </p>
                </div>
              </div>
            ) : (
              <div
                className={`p-6 rounded-xl shadow-custom-md border-2 ${
                  mlPrediction.risk_level === "HIGH"
                    ? "border-red-500 bg-red-500/10"
                    : mlPrediction.risk_level === "MODERATE"
                    ? "border-yellow-500 bg-yellow-500/10"
                    : "border-green-500 bg-green-500/10"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Activity className="h-6 w-6" />
                    Long-term Cardiovascular Risk Assessment
                  </h3>
                  <Badge
                    className={`text-lg px-4 py-1 ${
                      mlPrediction.risk_level === "HIGH"
                        ? "bg-red-600 text-white"
                        : mlPrediction.risk_level === "MODERATE"
                        ? "bg-yellow-600 text-white"
                        : "bg-green-600 text-white"
                    }`}
                  >
                    {mlPrediction.risk_level} RISK
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-background/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Disease Probability</p>
                    <p className="text-2xl font-bold text-foreground">
                      {(mlPrediction.probability * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="bg-background/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Age</p>
                    <p className="text-2xl font-bold text-foreground">
                      {Math.round(mlPrediction.factors.age)} years
                    </p>
                  </div>

                  <div className="bg-background/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">BMI</p>
                    <p className="text-2xl font-bold text-foreground">
                      {mlPrediction.factors.bmi}
                    </p>
                  </div>

                  <div className="bg-background/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Blood Pressure</p>
                    <p className="text-2xl font-bold text-foreground">
                      {mlPrediction.factors.blood_pressure}
                    </p>
                  </div>

                  <div className="bg-background/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Smoking</p>
                    <p className="text-2xl font-bold text-foreground">
                      {mlPrediction.factors.smoking ? "Yes" : "No"}
                    </p>
                  </div>

                  <div className="bg-background/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Diabetes</p>
                    <p className="text-2xl font-bold text-foreground">
                      {mlPrediction.factors.diabetes ? "Yes" : "No"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-background/30 rounded-lg">
                  <p className="text-sm text-foreground">
                    <strong>Assessment:</strong> This prediction estimates the user's
                    long-term risk of developing cardiovascular disease based on their profile,
                    lifestyle factors, and current vitals.
                    {mlPrediction.risk_level === "HIGH" &&
                      " Recommend comprehensive health assessment and intervention."}
                    {mlPrediction.risk_level === "MODERATE" &&
                      " Consider lifestyle modifications and regular monitoring."}
                    {mlPrediction.risk_level === "LOW" &&
                      " User is maintaining good cardiovascular health."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Health Summary & Quick Tips */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="gradient-card p-6 rounded-xl shadow-custom-md border border-border/50">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Current Health Summary
            </h3>
            <p className="text-sm text-foreground mb-3">
              User's current vitals are{" "}
              {riskLevel === "low"
                ? "within normal ranges"
                : riskLevel === "moderate"
                ? "showing some concerns"
                : "outside normal ranges"}
              . This assessment is based on the latest health data from their connected device.
            </p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Heart className="h-3 w-3" />
                <span>Heart Rate: {reading.heartRate} BPM {reading.heartRate >= 60 && reading.heartRate <= 100 ? "✓ Normal" : "⚠ Check"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Footprints className="h-3 w-3" />
                <span>Steps: {reading.steps.toLocaleString()} {reading.steps >= 8000 ? "✓ Great!" : reading.steps >= 5000 ? "⚠ Keep going" : "⚠ Too low"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Moon className="h-3 w-3" />
                <span>Sleep: {reading.sleepHours.toFixed(1)}h {reading.sleepHours >= 7 && reading.sleepHours <= 9 ? "✓ Good" : "⚠ Improve"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Dumbbell className="h-3 w-3" />
                <span>Workout: {reading.workout} min {reading.workout >= 30 ? "✓ Excellent" : "⚠ Try more"}</span>
              </div>
            </div>
          </div>

          <div className="gradient-card p-6 rounded-xl shadow-custom-md border border-border/50">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Recommendations</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {reading.steps < 8000 && (
                <li>✓ Encourage user to reach 8,000-10,000 steps daily</li>
              )}
              {reading.sleepHours < 7 && (
                <li>✓ User needs 7-9 hours of sleep for better recovery</li>
              )}
              {reading.workout < 30 && (
                <li>✓ Recommend 30+ minutes of exercise per day</li>
              )}
              {reading.calories < 300 && (
                <li>✓ Suggest increasing physical activity</li>
              )}
              {reading.heartRate > 100 && (
                <li>✓ Elevated heart rate - consider stress management</li>
              )}
              {reading.steps >= 8000 && reading.sleepHours >= 7 && reading.workout >= 30 && (
                <>
                  <li>✓ User is maintaining excellent health habits</li>
                  <li>✓ Continue monitoring and encouraging healthy lifestyle</li>
                  <li>✓ Consider setting new fitness goals</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
