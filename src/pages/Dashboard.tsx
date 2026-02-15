import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Heart, Activity, Droplet, RefreshCcw, UserPlus, X, Users, AlertCircle, ArrowLeft, Bell, Footprints, Flame, MapPin, Moon, Dumbbell } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { MetricCard } from "@/components/MetricCard";
import { Badge } from "@/components/ui/badge";
import { ref, onValue, get } from "firebase/database";
import { database } from "../firebase";
import { usePatient } from "@/contexts/PatientContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  resolvePatientId,
  getPatientInfo,
  addPatientToList,
  removePatientFromList,
  PatientInfo
} from "@/lib/patientUtils";

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

function calculateRiskLevel(reading: HealthReading) {
  if (!reading) return "low";
  const { heartRate, steps, sleepHours } = reading;

  if (
    heartRate > 120 ||
    heartRate < 50 ||
    steps < 1000 ||
    sleepHours < 4
  )
    return "high";

  if (
    heartRate > 100 ||
    heartRate < 55 ||
    steps < 3000 ||
    sleepHours < 6
  )
    return "moderate";

  return "low";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [reading, setReading] = useState<HealthReading | null>(null);
  const [loading, setLoading] = useState(true);
  const { patientId, setPatientId } = usePatient();
  const [patientInput, setPatientInput] = useState("");
  const { user } = useAuth();
  const [patientName, setPatientName] = useState<string | null>(null);
  const [simpleId, setSimpleId] = useState<string | null>(null);
  const [patientList, setPatientList] = useState<PatientInfo[]>([]);
  const [showPatientList, setShowPatientList] = useState(true);
  const [resolvedUid, setResolvedUid] = useState<string | null>(null);

  // NEW ML Prediction State (Watch-Only Variables)
  const [healthPrediction, setHealthPrediction] = useState<any>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [showPredictionModal, setShowPredictionModal] = useState(false);

  // TREND & DETERIORATION DETECTION State (Unsupervised - No Future Prediction)
  const [deteriorationResult, setDeteriorationResult] = useState<any>(null);
  const [loadingDeterioration, setLoadingDeterioration] = useState(false);
  const [showDeteriorationModal, setShowDeteriorationModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [criticalAlertsCount, setCriticalAlertsCount] = useState(0);

  const effectiveId = user?.role === "doctor" ? resolvedUid : user?.uid;

  // Auto-set patientId from URL query param
  useEffect(() => {
    const patientFromUrl = searchParams.get("patient");
    if (patientFromUrl && user?.role === "doctor") {
      setPatientId(patientFromUrl);
    }
  }, [searchParams, user, setPatientId]);

  // Load doctor's patient list
  useEffect(() => {
    if (user?.role === "doctor" && user.uid) {
      const listRef = ref(database, `doctor_patient_lists/${user.uid}`);
      const unsub = onValue(listRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const patients = Array.isArray(data) ? data : Object.values(data);
          setPatientList(patients as PatientInfo[]);
        } else {
          setPatientList([]);
        }
      });
      return () => unsub();
    }
  }, [user]);

  // Resolve patient ID
  useEffect(() => {
    if (user?.role === "doctor" && patientId) {
      resolvePatientId(patientId).then((uid) => {
        setResolvedUid(uid);
      });
      getPatientInfo(patientId).then((info) => {
        if (info) {
          setPatientName(info.name);
          setSimpleId(info.simple_id);
        }
      });
    } else if (user?.role === "patient") {
      setResolvedUid(user.uid);
    }
  }, [patientId, user]);

  // Fetch health data
  useEffect(() => {
    setReading(null);
    setLoading(true);
    if (!effectiveId) {
      setLoading(false);
      return;
    }

    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const dataRef = ref(database, `health_data/${effectiveId}/current`);
    const unsub = onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setReading(null);
        setLoading(false);
        clearTimeout(loadingTimeout);
        return;
      }

      let workoutMinutes = 0;
      if (typeof data.workout === 'number') {
        workoutMinutes = data.workout;
      } else if (Array.isArray(data.workout)) {
        workoutMinutes = data.workout.reduce((total: number, w: any) => {
          return total + (w?.durationMinutes ?? 0);
        }, 0);
      } else if (typeof data.workout === 'object' && data.workout !== null) {
        workoutMinutes = data.workout.durationMinutes ?? 0;
      }

      const newReading: HealthReading = {
        heartRate: data.heartRate ?? 0,
        steps: data.steps ?? 0,
        calories: data.calories ?? 0,
        distance: data.distance ?? 0,
        sleepHours: data.sleepHours ?? 0,
        workout: workoutMinutes,
        timestamp: data.timestamp ?? Date.now(),
        source: data.source ?? "unknown",
      };
      setReading(newReading);
      setLoading(false);
      clearTimeout(loadingTimeout);
    });
    return () => {
      unsub();
      clearTimeout(loadingTimeout);
    };
  }, [effectiveId]);

  // Monitor critical alerts
  useEffect(() => {
    if (!effectiveId) {
      setCriticalAlertsCount(0);
      return;
    }

    const dataRef = ref(database, `health_data/${effectiveId}/current`);
    const unsub = onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setCriticalAlertsCount(0);
        return;
      }

      let criticalCount = 0;
      if (data.heartRate > 120 || data.heartRate < 50) criticalCount++;
      if (data.steps < 1000) criticalCount++;
      if (typeof data.sleepHours === 'number' && data.sleepHours > 0 && data.sleepHours < 4) criticalCount++;

      setCriticalAlertsCount(criticalCount);
    });

    return () => unsub();
  }, [effectiveId]);

  // Fetch patient name
  useEffect(() => {
    if (!effectiveId) {
      setPatientName(null);
      return;
    }

    const userRef = ref(database, `users/${effectiveId}`);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setPatientName(data.fullName || "Unnamed User");
      } else {
        setPatientName(null);
      }
    });
  }, [effectiveId]);

  // NEW: Handler to fetch ML predictions (Watch-Only Variables - No Manual Input)
  const handleGetPredictions = async () => {
    if (!effectiveId || !reading) {
      toast.error("No health data available");
      return;
    }

    setLoadingPrediction(true);
    setShowPredictionModal(true);

    try {
      // Send ONLY watch variables - NO manual input required
      const requestData = {
        patient_id: patientId || effectiveId,
        health_data: {
          heartRate: reading.heartRate,
          steps: reading.steps,
          calories: reading.calories,
          distance: reading.distance,
          sleepHours: reading.sleepHours,
          workout: reading.workout
        }
      };

      const response = await fetch('http://localhost:5000/predict_health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const prediction = await response.json();
        setHealthPrediction(prediction);
      } else {
        const errorData = await response.json();
        console.error('Health prediction failed:', errorData);
        if (errorData.status === 'models_not_loaded') {
          toast.error("ML models not trained yet. Please train the model first.");
        } else {
          toast.error("Failed to get predictions");
        }
        setHealthPrediction(null);
      }
    } catch (error) {
      console.error('Error fetching health prediction:', error);
      toast.error("Error connecting to prediction service");
      setHealthPrediction(null);
    } finally {
      setLoadingPrediction(false);
    }
  };

  // NEW: Handler to fetch DETERIORATION DETECTION (Trend-based Unsupervised ML)
  const handleDetectDeterioration = async () => {
    if (!effectiveId) {
      toast.error("No user selected");
      return;
    }

    setLoadingDeterioration(true);
    setShowDeteriorationModal(true);

    try {
      const requestData = {
        patient_id: patientId || effectiveId
      };

      const response = await fetch('http://localhost:5000/detect_deterioration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const result = await response.json();
        setDeteriorationResult(result);
      } else {
        const errorData = await response.json();
        console.error('Deterioration detection failed:', errorData);
        if (errorData.status === 'models_not_loaded') {
          toast.error("Trend models not trained. Run train_trend_model.py first.");
        } else if (errorData.error === 'Insufficient history data') {
          toast.error(`Need at least 3 days of history. Currently have ${errorData.days_available || 0} days.`);
        } else {
          toast.error("Failed to detect deterioration");
        }
        setDeteriorationResult(null);
      }
    } catch (error) {
      console.error('Error detecting deterioration:', error);
      toast.error("Error connecting to detection service");
      setDeteriorationResult(null);
    } finally {
      setLoadingDeterioration(false);
    }
  };

  // Handler to add patient to list
  const handleAddToList = async () => {
    if (!user?.uid || !patientInput.trim()) {
      toast.error("Please enter a patient ID");
      return;
    }

    const info = await getPatientInfo(patientInput.trim());
    if (info) {
      const newList = await addPatientToList(user.uid, info);
      setPatientList(newList);
      setPatientInput("");
      toast.success(`User ${info.name} added to your list`);
    } else {
      toast.error("User not found. Please check the ID and try again.");
    }
  };

  // Handler to remove patient from list
  const handleRemoveFromList = async (patientUid: string) => {
    if (!user?.uid) return;
    const patient = patientList.find(p => p.firebase_uid === patientUid);
    const newList = await removePatientFromList(user.uid, patientUid);
    setPatientList(newList);
    if (patient) {
      toast.success(`${patient.name} removed from your list`);
    }
  };

  // Handler to select patient from list
  const handleSelectPatient = (patient: PatientInfo) => {
    setPatientId(patient.simple_id || patient.firebase_uid);
    setShowPatientList(false);
  };

  // Doctor's patient list screen
  if (user?.role === "doctor" && !patientId) {
    const filteredPatients = patientList.filter(patient =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.simple_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="flex h-screen w-full">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Supervisor Dashboard</h1>
            <p className="text-slate-400">Manage and monitor all users</p>
          </div>

          <div className="mb-6 flex gap-4 items-center">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search users by name, ID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 pl-10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Users className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
            </div>

            <button
              onClick={handleAddToList}
              disabled={!patientInput.trim()}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap"
            >
              <UserPlus className="h-5 w-5" />
              Add User
            </button>
          </div>

          <div className="mb-6 bg-slate-800/40 border border-slate-700 rounded-lg p-4">
            <label className="text-sm text-slate-400 mb-2 block">Add User by ID:</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={patientInput}
                onChange={(e) => setPatientInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && patientInput.trim()) {
                    handleAddToList();
                  }
                }}
                placeholder="Enter User ID (e.g., P1, P2)"
                className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
            <div className="bg-slate-800/80 px-6 py-4 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">
                All Users ({filteredPatients.length})
              </h2>
            </div>

            {filteredPatients.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No users in your list</p>
                <p className="text-slate-500 text-sm mt-2">
                  {searchQuery ? 'Try a different search term' : 'Add users using the input above'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {filteredPatients.map((patient) => (
                  <div
                    key={patient.firebase_uid}
                    className="p-6 hover:bg-slate-700/30 transition group flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{patient.name}</h3>
                      <div className="flex gap-4 text-sm text-slate-400">
                        <span>ID: {patient.simple_id || 'N/A'}</span>
                        <span>•</span>
                        <span>{patient.email || 'No email'}</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSelectPatient(patient)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                      >
                        View Profile
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromList(patient.firebase_uid);
                        }}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/30 rounded-lg font-medium transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Activity className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading user data...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!reading) {
    return (
      <div className="flex h-screen w-full">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground">
              {user?.role === "doctor" ? "No Data Available" : "Waiting for Health Data"}
            </h2>
            <p className="text-muted-foreground max-w-md">
              {user?.role === "doctor"
                ? `No health data found for user ${patientId}. Please check the User ID or start the health monitoring.`
                : "Please ensure your health monitoring device is connected and sending data."}
            </p>
            {user?.role === "doctor" && (
              <Button
                variant="outline"
                size="default"
                onClick={() => setPatientId(null)}
                className="mt-4"
              >
                <RefreshCcw className="h-4 w-4 mr-2" /> Go Back to User Selection
              </Button>
            )}
          </div>
        </main>
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
    <div className="flex h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 lg:p-8 lg:ml-0 ml-16">
          {/* Back Button for Doctor */}
          {user?.role === "doctor" && (
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={() => setPatientId(null)}
                className="flex items-center gap-2 hover:bg-slate-700/50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to User List
              </Button>
            </div>
          )}

          {/* Header */}
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">
                {user?.role === "doctor"
                  ? `Supervisor Dashboard`
                  : `Welcome, ${patientName || "User"}`}
              </h1>

              {user?.role === "doctor" && patientName && (
                <p className="text-muted-foreground mb-1">
                  Viewing data for: <span className="font-semibold">{patientName}</span>{" "}
                  {simpleId && <span className="text-blue-400 font-mono">({simpleId})</span>}
                </p>
              )}

              {user?.role === "patient" && user?.patientId && (
                <p className="text-muted-foreground mb-1">
                  User ID: <span className="text-blue-400 font-mono font-semibold">{user.patientId}</span>
                </p>
              )}

              <p className="text-muted-foreground">
                Last updated: {new Date(reading.timestamp).toLocaleString()}
              </p>
            </div>

            <Badge className={`text-lg px-6 py-2 ${status.className}`}>{status.label}</Badge>
          </div>

          {/* Metric cards - Watch Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          {/* ML Predictions Buttons */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current State Analysis */}
            <Button
              onClick={handleGetPredictions}
              disabled={loadingPrediction}
              className="py-6 text-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              {loadingPrediction ? (
                <span className="flex items-center gap-2">
                  <Activity className="h-5 w-5 animate-spin" />
                  Analyzing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Current Health Analysis
                </span>
              )}
            </Button>

            {/* Deterioration Detection - TREND BASED UNSUPERVISED */}
            <Button
              onClick={handleDetectDeterioration}
              disabled={loadingDeterioration}
              className="py-6 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {loadingDeterioration ? (
                <span className="flex items-center gap-2">
                  <Activity className="h-5 w-5 animate-spin" />
                  Detecting Trends...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Detect Health Deterioration
                </span>
              )}
            </Button>
          </div>
          <div className="text-center mt-2 space-y-1">
            <p className="text-sm text-muted-foreground">
              <span className="text-blue-400">Current Analysis:</span> Analyzes today's data using ML clustering
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="text-purple-400">Deterioration Detection:</span> Analyzes past trends to detect declining health patterns
            </p>
          </div>

          {/* ML Prediction Results Modal */}
          {showPredictionModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Activity className="h-6 w-6" />
                    ML Health Predictions
                  </h3>
                  <button onClick={() => setShowPredictionModal(false)} className="text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {loadingPrediction ? (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Analyzing your smartwatch data with ML models...</p>
                    <p className="text-xs text-slate-500 mt-2">Using Unsupervised Learning - No manual labels!</p>
                  </div>
                ) : healthPrediction && healthPrediction.predictions ? (
                  <div className="space-y-6">
                    {/* Health Pattern Prediction - Clear Status Display */}
                    {healthPrediction.predictions.health_pattern && (
                      <div className={`p-5 rounded-lg border-2 ${
                        healthPrediction.predictions.health_pattern.pattern === "Healthy Pattern" ? "border-green-500 bg-green-500/10" :
                        healthPrediction.predictions.health_pattern.pattern === "Moderate Risk Pattern" ? "border-yellow-500 bg-yellow-500/10" :
                        "border-red-500 bg-red-500/10"
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Heart className="h-5 w-5" />
                            Your Health Status
                          </h4>
                        </div>

                        {/* Clear Health Status - Easy to understand */}
                        <div className="text-center py-4">
                          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-3 ${
                            healthPrediction.predictions.health_pattern.pattern === "Healthy Pattern" ? "bg-green-500" :
                            healthPrediction.predictions.health_pattern.pattern === "Moderate Risk Pattern" ? "bg-yellow-500" :
                            "bg-red-500"
                          }`}>
                            <Heart className="h-10 w-10 text-white" />
                          </div>
                          <p className={`text-2xl font-bold mb-2 ${
                            healthPrediction.predictions.health_pattern.pattern === "Healthy Pattern" ? "text-green-400" :
                            healthPrediction.predictions.health_pattern.pattern === "Moderate Risk Pattern" ? "text-yellow-400" :
                            "text-red-400"
                          }`}>
                            {healthPrediction.predictions.health_pattern.pattern === "Healthy Pattern" ? "Good Health" :
                             healthPrediction.predictions.health_pattern.pattern === "Moderate Risk Pattern" ? "Needs Attention" :
                             "Health Risk Detected"}
                          </p>
                          <p className="text-sm text-slate-300">
                            {healthPrediction.predictions.health_pattern.pattern === "Healthy Pattern"
                              ? "Your health metrics are looking great! Keep up the good work."
                              : healthPrediction.predictions.health_pattern.pattern === "Moderate Risk Pattern"
                              ? "Some metrics need improvement. Consider being more active."
                              : "Your health pattern shows concerning metrics. Please consult a healthcare professional."}
                          </p>
                        </div>

                        {/* Confidence as a simple bar */}
                        <div className="mt-4 pt-4 border-t border-slate-600">
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>Confidence Level</span>
                            <span>{healthPrediction.predictions.health_pattern.confidence}%</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                healthPrediction.predictions.health_pattern.pattern === "Healthy Pattern" ? "bg-green-500" :
                                healthPrediction.predictions.health_pattern.pattern === "Moderate Risk Pattern" ? "bg-yellow-500" :
                                "bg-red-500"
                              }`}
                              style={{ width: `${healthPrediction.predictions.health_pattern.confidence}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-slate-500 mt-2 text-center">
                            {healthPrediction.predictions.health_pattern.confidence >= 70
                              ? "High confidence - Clear pattern detected"
                              : healthPrediction.predictions.health_pattern.confidence >= 40
                              ? "Moderate confidence - Pattern is partially matching"
                              : "Low confidence - Your pattern is between categories"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Anomaly Detection - Simplified */}
                    {healthPrediction.predictions.anomaly && (
                      <div className={`p-5 rounded-lg border-2 ${
                        healthPrediction.predictions.anomaly.is_anomaly ? "border-red-500 bg-red-500/10" : "border-blue-500 bg-blue-500/10"
                      }`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            healthPrediction.predictions.anomaly.is_anomaly ? "bg-red-500" : "bg-blue-500"
                          }`}>
                            <AlertCircle className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-white">
                              {healthPrediction.predictions.anomaly.is_anomaly ? "Unusual Change Detected" : "Consistent Pattern"}
                            </h4>
                            <p className="text-sm text-slate-400">
                              {healthPrediction.predictions.anomaly.is_anomaly ? "Today's data is different from your usual" : "Today's data matches your usual pattern"}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-300 bg-slate-700/50 p-3 rounded-lg">
                          {healthPrediction.predictions.anomaly.is_anomaly
                            ? "Your today's health data is different from your usual pattern. This could indicate a sudden change in activity or health."
                            : "Your metrics today are similar to your usual readings. This shows consistency in your daily routine."}
                        </p>
                        {/* Explain when High Risk + Consistent Pattern */}
                        {!healthPrediction.predictions.anomaly.is_anomaly &&
                         healthPrediction.predictions.health_pattern?.pattern !== "Healthy Pattern" && (
                          <p className="text-xs text-yellow-400 mt-2 italic">
                            Note: "Consistent Pattern" means no sudden change today - but your overall health status above still needs attention.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Recommendations */}
                    {healthPrediction.recommendations && healthPrediction.recommendations.length > 0 && (
                      <div className="p-5 rounded-lg border border-blue-500/50 bg-blue-500/10">
                        <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                          <Dumbbell className="h-5 w-5 text-blue-400" />
                          What You Can Do
                        </h4>
                        <ul className="space-y-2">
                          {healthPrediction.recommendations.map((rec: string, i: number) => (
                            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                              <span className="text-blue-400 mt-0.5">✓</span> {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Watch Data Used - Simplified */}
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                      <p className="text-xs text-slate-400 mb-3 font-semibold">Your Watch Data:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-800 p-2 rounded text-center">
                          <p className="text-lg font-bold text-white">{healthPrediction.watch_data?.heart_rate}</p>
                          <p className="text-xs text-slate-400">Heart Rate (BPM)</p>
                        </div>
                        <div className="bg-slate-800 p-2 rounded text-center">
                          <p className="text-lg font-bold text-white">{healthPrediction.watch_data?.steps?.toLocaleString()}</p>
                          <p className="text-xs text-slate-400">Steps</p>
                        </div>
                        <div className="bg-slate-800 p-2 rounded text-center">
                          <p className="text-lg font-bold text-white">{healthPrediction.watch_data?.calories}</p>
                          <p className="text-xs text-slate-400">Calories</p>
                        </div>
                        <div className="bg-slate-800 p-2 rounded text-center">
                          <p className="text-lg font-bold text-white">{healthPrediction.watch_data?.distance}</p>
                          <p className="text-xs text-slate-400">Distance (km)</p>
                        </div>
                        <div className="bg-slate-800 p-2 rounded text-center">
                          <p className="text-lg font-bold text-white">{healthPrediction.watch_data?.sleep_hours}</p>
                          <p className="text-xs text-slate-400">Sleep (hrs)</p>
                        </div>
                        <div className="bg-slate-800 p-2 rounded text-center">
                          <p className="text-lg font-bold text-white">{healthPrediction.watch_data?.workout_minutes}</p>
                          <p className="text-xs text-slate-400">Workout (min)</p>
                        </div>
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                      <p className="text-xs text-slate-400">
                        <strong>Disclaimer:</strong> These predictions are based on ML models trained on smartwatch data.
                        This is a preventive health monitoring tool, not a diagnostic device.
                        Please consult a healthcare professional for medical concerns.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <p className="text-slate-400">ML models not loaded. Please ensure the model is trained.</p>
                    <p className="text-sm text-slate-500 mt-2">Run: python train_health_model.py</p>
                  </div>
                )}

                <div className="mt-6">
                  <Button onClick={() => setShowPredictionModal(false)} className="w-full">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* DETERIORATION DETECTION Modal - Trend-Based Unsupervised ML */}
          {showDeteriorationModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Activity className="h-6 w-6 text-purple-400" />
                    Health Deterioration Detection
                  </h3>
                  <button onClick={() => setShowDeteriorationModal(false)} className="text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {loadingDeterioration ? (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-purple-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Analyzing health trends...</p>
                    <p className="text-xs text-slate-500 mt-2">Using Unsupervised ML - No manual labels!</p>
                  </div>
                ) : deteriorationResult && deteriorationResult.detection ? (
                  <div className="space-y-6">
                    {/* Trend Summary */}
                    <div className="p-5 rounded-lg border border-slate-600 bg-slate-700/30">
                      <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-400" />
                        Trend Analysis ({deteriorationResult.analysis_period})
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-slate-400 text-xs">Avg Heart Rate</p>
                          <p className="text-xl font-bold text-white">{deteriorationResult.trend_summary?.avg_heart_rate?.toFixed(0)} BPM</p>
                          <p className={`text-xs ${
                            deteriorationResult.trend_summary?.heart_rate_trend === 'increasing' ? 'text-red-400' :
                            deteriorationResult.trend_summary?.heart_rate_trend === 'decreasing' ? 'text-green-400' :
                            'text-slate-400'
                          }`}>
                            Trend: {deteriorationResult.trend_summary?.heart_rate_trend}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-slate-400 text-xs">Avg Steps</p>
                          <p className="text-xl font-bold text-white">{deteriorationResult.trend_summary?.avg_steps?.toFixed(0)}</p>
                          <p className={`text-xs ${
                            deteriorationResult.trend_summary?.steps_trend === 'increasing' ? 'text-green-400' :
                            deteriorationResult.trend_summary?.steps_trend === 'decreasing' ? 'text-red-400' :
                            'text-slate-400'
                          }`}>
                            Trend: {deteriorationResult.trend_summary?.steps_trend}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-slate-400 text-xs">Avg Sleep</p>
                          <p className="text-xl font-bold text-white">{deteriorationResult.trend_summary?.avg_sleep?.toFixed(1)} hrs</p>
                          <p className={`text-xs ${
                            deteriorationResult.trend_summary?.sleep_trend === 'increasing' ? 'text-green-400' :
                            deteriorationResult.trend_summary?.sleep_trend === 'decreasing' ? 'text-red-400' :
                            'text-slate-400'
                          }`}>
                            Trend: {deteriorationResult.trend_summary?.sleep_trend}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Deterioration Status (K-Means Clustering) */}
                    {deteriorationResult.detection.deterioration_status && (
                      <div className={`p-5 rounded-lg border-2 ${
                        deteriorationResult.detection.deterioration_status.color === "green" ? "border-green-500 bg-green-500/10" :
                        deteriorationResult.detection.deterioration_status.color === "yellow" ? "border-yellow-500 bg-yellow-500/10" :
                        "border-red-500 bg-red-500/10"
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Deterioration Status
                          </h4>
                          <Badge className={`${
                            deteriorationResult.detection.deterioration_status.color === "green" ? "bg-green-600" :
                            deteriorationResult.detection.deterioration_status.color === "yellow" ? "bg-yellow-600" :
                            "bg-red-600"
                          } text-white px-3 py-1`}>
                            {deteriorationResult.detection.deterioration_status.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-300 mb-3">
                          {deteriorationResult.detection.deterioration_status.status === "Stable/Improving"
                            ? "Your health trends are stable or improving. Keep up the good work!"
                            : deteriorationResult.detection.deterioration_status.status === "Mild Deterioration"
                            ? "Some declining patterns detected. Consider improving your activity and sleep habits."
                            : "Significant declining trends detected. Please consult a healthcare provider."}
                        </p>
                        <p className="text-xs text-slate-400 italic">
                          {deteriorationResult.detection.deterioration_status.method}
                        </p>
                      </div>
                    )}

                    {/* Anomaly Detection (Isolation Forest) */}
                    {deteriorationResult.detection.anomaly && (
                      <div className={`p-5 rounded-lg border-2 ${
                        deteriorationResult.detection.anomaly.is_anomaly ? "border-red-500 bg-red-500/10" : "border-green-500 bg-green-500/10"
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Anomaly Detection
                          </h4>
                          <Badge className={`${
                            deteriorationResult.detection.anomaly.is_anomaly ? "bg-red-600" : "bg-green-600"
                          } text-white px-3 py-1`}>
                            {deteriorationResult.detection.anomaly.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-300 mb-2">
                          {deteriorationResult.detection.anomaly.is_anomaly
                            ? "Unusual health pattern detected! Your recent trends deviate significantly from normal patterns."
                            : "Your health trends are within normal ranges based on learned patterns."}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>Anomaly Score: {(deteriorationResult.detection.anomaly.anomaly_score * 100).toFixed(1)}%</span>
                        </div>
                        <p className="text-xs text-slate-400 italic mt-2">
                          {deteriorationResult.detection.anomaly.method}
                        </p>
                      </div>
                    )}

                    {/* ML-Based Recommendations */}
                    {deteriorationResult.recommendations && deteriorationResult.recommendations.length > 0 && (
                      <div className="p-5 rounded-lg border border-slate-600 bg-slate-700/30">
                        <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                          <Dumbbell className="h-5 w-5" />
                          Recommendations
                        </h4>
                        <ul className="space-y-3">
                          {deteriorationResult.recommendations.map((rec: any, i: number) => (
                            <li key={i} className={`text-sm p-3 rounded-lg ${
                              rec.priority === 'high' ? 'bg-red-500/20 border border-red-500/30' :
                              rec.priority === 'medium' ? 'bg-yellow-500/20 border border-yellow-500/30' :
                              'bg-slate-600/30 border border-slate-600'
                            }`}>
                              <p className="text-slate-200">{rec.message}</p>
                              <p className="text-xs text-slate-400 mt-1">Based on: {rec.based_on}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Disclaimer */}
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                      <p className="text-xs text-slate-400">
                        <strong>How it works:</strong> This analysis uses unsupervised ML (Isolation Forest + K-Means)
                        to detect deterioration patterns in your health trends. No manual labels are used -
                        the model learns patterns from real FitBit data. This is for monitoring only, not diagnosis.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <p className="text-slate-400">Unable to detect deterioration patterns.</p>
                    <p className="text-sm text-slate-500 mt-2">
                      Ensure you have at least 3 days of history data and run train_trend_model.py
                    </p>
                  </div>
                )}

                <div className="mt-6">
                  <Button onClick={() => setShowDeteriorationModal(false)} className="w-full">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Summary + Quick Tips */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="gradient-card p-6 rounded-xl shadow-custom-md border border-border/50">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Health Summary (Real-time)</h3>
              <p className="text-sm text-foreground mb-3">
                Your current vitals are{" "}
                {riskLevel === "low"
                  ? "within normal ranges"
                  : riskLevel === "moderate"
                  ? "showing some concerns"
                  : "outside normal ranges"}
                . This assessment is based on your latest smartwatch readings.
              </p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Heart className="h-3 w-3" />
                  <span>Heart Rate: {reading.heartRate} BPM {reading.heartRate >= 60 && reading.heartRate <= 100 ? "- Normal" : "- Check"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Footprints className="h-3 w-3" />
                  <span>Steps: {reading.steps.toLocaleString()} {reading.steps >= 8000 ? "- Great!" : reading.steps >= 5000 ? "- Keep going" : "- Too low"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Moon className="h-3 w-3" />
                  <span>Sleep: {reading.sleepHours.toFixed(1)}h {reading.sleepHours >= 7 && reading.sleepHours <= 9 ? "- Good" : "- Improve"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-3 w-3" />
                  <span>Workout: {reading.workout} min {reading.workout >= 30 ? "- Excellent" : "- Try more"}</span>
                </div>
              </div>
            </div>
            <div className="gradient-card p-6 rounded-xl shadow-custom-md border border-border/50">
              <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                Tips & Recommendations
                {healthPrediction && (
                  <span className="text-xs font-normal text-blue-400 bg-blue-400/20 px-2 py-0.5 rounded">ML-Powered</span>
                )}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {/* ML-Based Recommendations */}
                {healthPrediction?.recommendations?.map((rec: string, i: number) => (
                  <li key={`ml-${i}`} className="flex items-start gap-2">
                    <Activity className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}

                {/* Real-time Data Tips (when no ML prediction yet) */}
                {!healthPrediction && (
                  <>
                    {reading.steps < 8000 && (
                      <li className="flex items-start gap-2">
                        <Footprints className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <span>Try to reach 8,000-10,000 steps daily for optimal health</span>
                      </li>
                    )}
                    {reading.sleepHours < 7 && (
                      <li className="flex items-start gap-2">
                        <Moon className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                        <span>Aim for 7-9 hours of sleep for better recovery</span>
                      </li>
                    )}
                    {reading.workout < 30 && (
                      <li className="flex items-start gap-2">
                        <Dumbbell className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>Target 30+ minutes of exercise per day</span>
                      </li>
                    )}
                    {reading.calories < 300 && (
                      <li className="flex items-start gap-2">
                        <Flame className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        <span>Increase activity to burn more calories</span>
                      </li>
                    )}
                    {reading.heartRate > 100 && (
                      <li className="flex items-start gap-2">
                        <Heart className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span>Elevated heart rate - consider relaxation techniques</span>
                      </li>
                    )}
                    {reading.steps >= 8000 && reading.sleepHours >= 7 && reading.workout >= 30 && (
                      <>
                        <li className="flex items-start gap-2">
                          <Activity className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Great job! Keep maintaining your healthy lifestyle</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Droplet className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                          <span>Stay hydrated throughout the day</span>
                        </li>
                      </>
                    )}
                  </>
                )}

                {/* Prompt to get ML predictions */}
                {!healthPrediction && (
                  <li className="flex items-start gap-2 pt-2 border-t border-border/50 mt-2">
                    <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <span>Click "Get ML Health Predictions" above for AI-powered analysis</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
