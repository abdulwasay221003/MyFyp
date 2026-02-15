// import { useEffect, useState } from "react";
// import { Sidebar } from "@/components/Sidebar";
// import { Card } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { ref, onValue } from "firebase/database";
// import { database } from "../firebase";
// import { AlertCircle, CheckCircle, Info, Activity, Heart, Thermometer, Droplet } from "lucide-react";

// // Alert interface
// interface AlertItem {
//   id: string;
//   type: string;
//   message: string;
//   severity: "low" | "moderate" | "high";
//   timestamp: number;
//   read?: boolean;
// }

// export default function Alerts() {
//   const [alerts, setAlerts] = useState<AlertItem[]>([]);

//   useEffect(() => {
//     const userId = "testuser1"; // Change when you add auth
//     const dataRef = ref(database, `health_data/${userId}`);

//     onValue(dataRef, (snapshot) => {
//       const data = snapshot.val();
//       if (!data) return;

//       const newAlerts: AlertItem[] = [];
//       Object.entries(data).forEach(([key, r]: any) => {
//         const ts = r.timestamp || Date.now();

//         // Heart Rate Alerts
//         if (r.heartRate > 120)
//           newAlerts.push({
//             id: key,
//             type: "Heart Rate",
//             message: `High heart rate detected: ${r.heartRate} BPM`,
//             severity: "high",
//             timestamp: ts,
//           });
//         else if (r.heartRate < 60)
//           newAlerts.push({
//             id: key,
//             type: "Heart Rate",
//             message: `Low heart rate detected: ${r.heartRate} BPM`,
//             severity: "moderate",
//             timestamp: ts,
//           });

//         // Oxygen Alerts
//         if (r.spo2 < 94)
//           newAlerts.push({
//             id: key,
//             type: "SpO₂",
//             message: `Low blood oxygen level: ${r.spo2}%`,
//             severity: "high",
//             timestamp: ts,
//           });

//         // Temperature Alerts
//         if (r.temperature > 100.4)
//           newAlerts.push({
//             id: key,
//             type: "Temperature",
//             message: `Fever detected: ${r.temperature}°F`,
//             severity: "high",
//             timestamp: ts,
//           });

//         // Blood Pressure Alerts
//         if (r.bloodPressure) {
//           const [sys, dia] = r.bloodPressure.split("/").map((n: string) => parseInt(n));
//           if (sys > 140 || dia > 90)
//             newAlerts.push({
//               id: key,
//               type: "Blood Pressure",
//               message: `High blood pressure detected: ${sys}/${dia} mmHg`,
//               severity: "moderate",
//               timestamp: ts,
//             });
//         }
//       });

//       setAlerts(newAlerts.reverse());
//     });
//   }, []);

//   const markAsRead = (id: string) => {
//     setAlerts((prev) =>
//       prev.map((alert) =>
//         alert.id === id ? { ...alert, read: true } : alert
//       )
//     );
//   };

//   const severityConfig = {
//     low: {
//       className: "bg-success-light text-success border-success/20",
//       badge: "bg-success text-success-foreground",
//       icon: Info,
//     },
//     moderate: {
//       className: "bg-warning-light text-warning border-warning/20",
//       badge: "bg-warning text-warning-foreground",
//       icon: AlertCircle,
//     },
//     high: {
//       className: "bg-danger-light text-danger border-danger/20",
//       badge: "bg-danger text-danger-foreground",
//       icon: AlertCircle,
//     },
//   };

//   const iconMap = {
//     "Heart Rate": Heart,
//     "SpO₂": Droplet,
//     "Temperature": Thermometer,
//     "Blood Pressure": Activity,
//   };

//   return (
//     <div className="flex h-screen w-full">
//       <Sidebar />
//       <main className="flex-1 overflow-auto">
//         <div className="max-w-5xl mx-auto p-6 lg:p-8 lg:ml-0 ml-16">
//           {/* Header */}
//           <div className="mb-8">
//             <h1 className="text-3xl font-bold text-foreground mb-2">Health Alerts</h1>
//             <p className="text-muted-foreground">
//               Stay informed about your health status in real time
//             </p>
//           </div>

//           {/* Alerts Section */}
//           {alerts.length === 0 ? (
//             <p>No alerts at the moment ✅</p>
//           ) : (
//             <div className="space-y-4">
//               {alerts.map((alert) => {
//                 const config = severityConfig[alert.severity];
//                 const Icon = config.icon;
//                 const DataIcon =
//                   iconMap[alert.type as keyof typeof iconMap] || Activity;

//                 return (
//                   <Card
//                     key={alert.id}
//                     className={`p-5 shadow-custom-md transition-all ${
//                       alert.read ? "opacity-60" : ""
//                     }`}
//                   >
//                     <div className="flex items-start gap-4">
//                       <div className={`p-3 rounded-lg ${config.className} border`}>
//                         <DataIcon className="h-5 w-5" />
//                       </div>

//                       <div className="flex-1">
//                         <div className="flex items-start justify-between mb-2">
//                           <div className="flex items-center gap-3">
//                             <h3 className="font-semibold text-foreground">{alert.type}</h3>
//                             <Badge className={config.badge}>
//                               {alert.severity.toUpperCase()}
//                             </Badge>
//                           </div>
//                           {!alert.read && (
//                             <button
//                               onClick={() => markAsRead(alert.id)}
//                               className="text-sm text-primary hover:underline"
//                             >
//                               Mark as Read
//                             </button>
//                           )}
//                         </div>
//                         <p className="text-sm text-muted-foreground mb-1">
//                           {alert.message}
//                         </p>
//                         <p className="text-xs text-muted-foreground">
//                           {new Date(alert.timestamp).toLocaleString()}
//                         </p>
//                       </div>

//                       {alert.read && (
//                         <CheckCircle className="h-5 w-5 text-success" />
//                       )}
//                     </div>
//                   </Card>
//                 );
//               })}
//             </div>
//           )}
//         </div>
//       </main>
//     </div>
//   );
// }





import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ref, onValue, set, get } from "firebase/database";
import { database } from "../firebase";
import { AlertCircle, CheckCircle, Info, Activity, Heart, Thermometer, Droplet, Footprints, Moon, Dumbbell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePatient } from "@/contexts/PatientContext";
import { resolvePatientId } from "@/lib/patientUtils";

interface AlertItem {
  id: string;
  type: string;
  message: string;
  severity: "low" | "moderate" | "high";
  timestamp: number;
  read?: boolean;
}

// Generate unique alert ID based on data key and alert type
const generateAlertId = (dataKey: string, alertType: string): string => {
  return `${dataKey}_${alertType.replace(/\s+/g, '_')}`;
};

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [readAlerts, setReadAlerts] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const { patientId } = usePatient();
  const [resolvedUid, setResolvedUid] = useState<string | null>(null);

  const effectiveId = user?.role === "doctor" ? resolvedUid : user?.uid;

  // Resolve patient ID to Firebase UID for doctors
  useEffect(() => {
    if (user?.role === "doctor" && patientId) {
      resolvePatientId(patientId).then(setResolvedUid);
    } else if (user?.uid) {
      // For patients and any other role, use their own UID
      setResolvedUid(user.uid);
    }
  }, [patientId, user]);

  // Load read status from Firebase
  useEffect(() => {
    if (!effectiveId) return;
    const readRef = ref(database, `notifications_read/${effectiveId}`);
    const unsub = onValue(readRef, (snapshot) => {
      const data = snapshot.val();
      setReadAlerts(data || {});
    });
    return () => unsub();
  }, [effectiveId]);

  useEffect(() => {
    if (!effectiveId) { setAlerts([]); return; }
    // Read from /history for all historical alert data
    const dataRef = ref(database, `health_data/${effectiveId}/history`);
    const unsub = onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setAlerts([]); return; }
      const newAlerts: AlertItem[]  = [];
      Object.entries(data).forEach(([key, r]: any) => {
        const ts = r.timestamp || Date.now();

        // Handle workout - can be number, object, or array from real watch
        let workoutMinutes = 0;
        if (typeof r.workout === 'number') {
          workoutMinutes = r.workout;
        } else if (Array.isArray(r.workout)) {
          // Real watch data has workout as array - sum all durations
          workoutMinutes = r.workout.reduce((total: number, w: any) => total + (w?.durationMinutes ?? 0), 0);
        } else if (typeof r.workout === 'object' && r.workout !== null) {
          workoutMinutes = r.workout.durationMinutes ?? 0;
        }

        // Handle sleepHours - ensure it's a number
        const sleepHrs = typeof r.sleepHours === 'number' ? r.sleepHours : 0;

        // Check all critical conditions based on watch data - only HIGH and MODERATE severity (no "low/normal")
        if (r.heartRate > 120) newAlerts.push({ id: generateAlertId(key, "Heart Rate High"), type: "Heart Rate", message: `High heart rate: ${r.heartRate} BPM`, severity: "high", timestamp: ts });
        else if (r.heartRate < 50) newAlerts.push({ id: generateAlertId(key, "Heart Rate VeryLow"), type: "Heart Rate", message: `Very low heart rate: ${r.heartRate} BPM`, severity: "high", timestamp: ts });
        else if (r.heartRate < 60) newAlerts.push({ id: generateAlertId(key, "Heart Rate Low"), type: "Heart Rate", message: `Low heart rate: ${r.heartRate} BPM`, severity: "moderate", timestamp: ts });

        // Activity alerts
        if (r.steps < 1000) newAlerts.push({ id: generateAlertId(key, "Activity VeryLow"), type: "Activity", message: `Very low activity: ${r.steps} steps`, severity: "high", timestamp: ts });
        else if (r.steps < 3000) newAlerts.push({ id: generateAlertId(key, "Activity Low"), type: "Activity", message: `Low activity: ${r.steps} steps`, severity: "moderate", timestamp: ts });

        // Sleep alerts
        if (sleepHrs > 0 && sleepHrs < 4) newAlerts.push({ id: generateAlertId(key, "Sleep Severe"), type: "Sleep", message: `Severe sleep deprivation: ${sleepHrs.toFixed(1)} hours`, severity: "high", timestamp: ts });
        else if (sleepHrs > 0 && sleepHrs < 6) newAlerts.push({ id: generateAlertId(key, "Sleep Insufficient"), type: "Sleep", message: `Insufficient sleep: ${sleepHrs.toFixed(1)} hours`, severity: "moderate", timestamp: ts });
        else if (sleepHrs > 10) newAlerts.push({ id: generateAlertId(key, "Sleep Excessive"), type: "Sleep", message: `Excessive sleep: ${sleepHrs.toFixed(1)} hours`, severity: "moderate", timestamp: ts });

        // Workout alerts - removed as "no workout" is too common and not a risk
      });
      setAlerts(newAlerts.reverse());
    });
    return () => unsub();
  }, [effectiveId]);

  // Mark alert as read - persist to Firebase
  const markAsRead = async (alertId: string) => {
    if (!effectiveId) return;
    const readRef = ref(database, `notifications_read/${effectiveId}/${alertId}`);
    await set(readRef, true);
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!effectiveId) return;
    const updates: Record<string, boolean> = {};
    alerts.forEach(a => {
      if (!readAlerts[a.id]) {
        updates[a.id] = true;
      }
    });
    if (Object.keys(updates).length > 0) {
      const readRef = ref(database, `notifications_read/${effectiveId}`);
      const currentData = await get(readRef);
      const merged = { ...(currentData.val() || {}), ...updates };
      await set(readRef, merged);
    }
  };

  const iconMap = { "Heart Rate": Heart, "SpO₂": Droplet, "Temperature": Thermometer, "Blood Pressure": Activity, "Activity": Footprints, "Sleep": Moon, "Exercise": Dumbbell };
  const config = { high: "bg-danger text-danger-foreground", moderate: "bg-warning text-warning-foreground", low: "bg-success text-success-foreground" };

  // Count unread alerts
  const unreadCount = alerts.filter(a => !readAlerts[a.id]).length;

  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 lg:p-8 lg:ml-0 ml-16">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-foreground">Health Notifications</h1>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-primary hover:underline font-medium"
              >
                Mark All as Read ({unreadCount})
              </button>
            )}
          </div>
          {!effectiveId ? (
            <p className="text-muted-foreground">Enter a User ID first.</p>
          ) : alerts.length === 0 ? (
            <p className="text-muted-foreground">No risk alerts - all health metrics are normal!</p>
          ) : (
            <div className="space-y-4">
              {alerts.map((a) => {
                const Icon = iconMap[a.type as keyof typeof iconMap] || Info;
                const isRead = readAlerts[a.id];
                return (
                  <Card key={a.id} className={`p-5 flex items-start gap-4 ${isRead ? 'opacity-60' : ''}`}>
                    <div className={`p-3 rounded-lg ${config[a.severity]} border`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{a.type}</h3>
                          <Badge className={config[a.severity]}>{a.severity.toUpperCase()}</Badge>
                        </div>
                        {!isRead && <button onClick={() => markAsRead(a.id)} className="text-sm text-primary hover:underline">Mark as Read</button>}
                      </div>
                      <p className="text-sm text-muted-foreground">{a.message}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</p>
                    </div>
                    {isRead && <CheckCircle className="h-5 w-5 text-success" />}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}



// // src/pages/Alerts.tsx
// import { useEffect, useState } from "react";
// import { Sidebar } from "@/components/Sidebar";
// import { Card } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { ref, onValue } from "firebase/database";
// import { database } from "../firebase";
// import { AlertCircle, CheckCircle, Info, Activity, Heart, Thermometer, Droplet } from "lucide-react";
// import { useAuth } from "@/contexts/AuthContext";

// interface AlertItem {
//   id: string;
//   type: string;
//   message: string;
//   severity: "low" | "moderate" | "high";
//   timestamp: number;
//   read?: boolean;
// }

// export default function Alerts() {
//   const [alerts, setAlerts] = useState<AlertItem[]>([]);
//   const { user } = useAuth();

//   useEffect(() => {
//     const userId = user?.uid ?? "testuser1";
//     const dataRef = ref(database, `health_data/${userId}`);

//     const unsub = onValue(dataRef, (snapshot) => {
//       const data = snapshot.val();
//       if (!data) { setAlerts([]); return; }

//       const newAlerts: AlertItem[] = [];
//       Object.entries(data).forEach(([key, r]: any) => {
//         const ts = r.timestamp || Date.now();
//         if (r.heartRate > 120) newAlerts.push({ id: key, type: "Heart Rate", message: `High heart rate: ${r.heartRate} BPM`, severity: "high", timestamp: ts });
//         else if (r.heartRate < 60) newAlerts.push({ id: key, type: "Heart Rate", message: `Low heart rate: ${r.heartRate} BPM`, severity: "moderate", timestamp: ts });
//         if (r.spo2 < 94) newAlerts.push({ id: key, type: "SpO₂", message: `Low oxygen: ${r.spo2}%`, severity: "high", timestamp: ts });
//         if (r.temperature > 100.4) newAlerts.push({ id: key, type: "Temperature", message: `Fever: ${r.temperature}°F`, severity: "high", timestamp: ts });
//         if (r.bloodPressure) {
//           const [sys, dia] = r.bloodPressure.split("/").map((n: string) => parseInt(n));
//           if (sys > 140 || dia > 90) newAlerts.push({ id: key, type: "Blood Pressure", message: `High BP: ${sys}/${dia} mmHg`, severity: "moderate", timestamp: ts });
//         }
//       });

//       setAlerts(newAlerts.reverse());
//     });

//     return () => unsub();
//   }, [user?.uid]);

//   const markAsRead = (id: string) => {
//     setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
//   };

//   const severityConfig = {
//     low: { className: "bg-success-light text-success border-success/20", badge: "bg-success text-success-foreground", icon: Info },
//     moderate: { className: "bg-warning-light text-warning border-warning/20", badge: "bg-warning text-warning-foreground", icon: AlertCircle },
//     high: { className: "bg-danger-light text-danger border-danger/20", badge: "bg-danger text-danger-foreground", icon: AlertCircle },
//   };

//   const iconMap = { "Heart Rate": Heart, "SpO₂": Droplet, "Temperature": Thermometer, "Blood Pressure": Activity };

//   return (
//     <div className="flex h-screen w-full">
//       <Sidebar />
//       <main className="flex-1 overflow-auto">
//         <div className="max-w-5xl mx-auto p-6 lg:p-8 lg:ml-0 ml-16">
//           <div className="mb-8">
//             <h1 className="text-3xl font-bold text-foreground mb-2">Health Alerts</h1>
//             <p className="text-muted-foreground">Stay informed about your health status in real time</p>
//           </div>

//           {alerts.length === 0 ? (
//             <p>No alerts at the moment ✅</p>
//           ) : (
//             <div className="space-y-4">
//               {alerts.map((alert) => {
//                 const config = severityConfig[alert.severity];
//                 const DataIcon = iconMap[alert.type as keyof typeof iconMap] || Activity;
//                 return (
//                   <Card key={alert.id} className={`p-5 shadow-custom-md transition-all ${alert.read ? "opacity-60" : ""}`}>
//                     <div className="flex items-start gap-4">
//                       <div className={`p-3 rounded-lg ${config.className} border`}>
//                         <DataIcon className="h-5 w-5" />
//                       </div>
//                       <div className="flex-1">
//                         <div className="flex items-start justify-between mb-2">
//                           <div className="flex items-center gap-3">
//                             <h3 className="font-semibold text-foreground">{alert.type}</h3>
//                             <Badge className={config.badge}>{alert.severity.toUpperCase()}</Badge>
//                           </div>
//                           {!alert.read && (
//                             <button onClick={() => markAsRead(alert.id)} className="text-sm text-primary hover:underline">Mark as Read</button>
//                           )}
//                         </div>
//                         <p className="text-sm text-muted-foreground mb-1">{alert.message}</p>
//                         <p className="text-xs text-muted-foreground">{new Date(alert.timestamp).toLocaleString()}</p>
//                       </div>
//                       {alert.read && <CheckCircle className="h-5 w-5 text-success" />}
//                     </div>
//                   </Card>
//                 );
//               })}
//             </div>
//           )}
//         </div>
//       </main>
//     </div>
//   );
// }
