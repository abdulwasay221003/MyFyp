// src/pages/DoctorDashboard.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get, set, remove } from "firebase/database";
import { database } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Stethoscope,
  UserPlus,
  Users,
  Trash2,
  Eye,
  Heart,
  Activity
} from "lucide-react";

interface Patient {
  uid: string;
  patientId: string;
  name: string;
  email: string;
}

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [patientIdInput, setPatientIdInput] = useState("");
  const [myPatients, setMyPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPatients, setFetchingPatients] = useState(true);

  // Redirect if not doctor
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    } else if (user.role !== "doctor") {
      toast.error("Access denied. Supervisors only.");
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Fetch doctor's patients on load
  useEffect(() => {
    if (user && user.role === "doctor") {
      fetchMyPatients();
    }
  }, [user]);

  const fetchMyPatients = async () => {
    if (!user) return;

    setFetchingPatients(true);
    try {
      // Use same path as Dashboard: doctor_patient_lists
      const doctorPatientsRef = ref(database, `doctor_patient_lists/${user.uid}`);
      const snapshot = await get(doctorPatientsRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        // Handle both array and object formats
        const patientList = Array.isArray(data) ? data : Object.values(data);

        // Convert to Patient format
        const patients: Patient[] = patientList.map((p: any) => ({
          uid: p.firebase_uid,
          patientId: p.simple_id || p.patientId || "",
          name: p.name || "Unknown",
          email: p.email || ""
        }));

        setMyPatients(patients);
      } else {
        setMyPatients([]);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast.error("Failed to load users");
    } finally {
      setFetchingPatients(false);
    }
  };

  const handleAddPatient = async () => {
    if (!patientIdInput.trim()) {
      toast.error("Please enter a User ID");
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      // Find patient by ID
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);

      if (!snapshot.exists()) {
        toast.error("No users found in database");
        setLoading(false);
        return;
      }

      const users = snapshot.val();
      let foundPatient: Patient | null = null;
      let foundUid = "";

      for (const uid in users) {
        const userData = users[uid];
        if (userData.patientId === patientIdInput.trim() && userData.role === "patient") {
          foundPatient = {
            uid,
            patientId: userData.patientId,
            name: userData.fullName || "Unknown",
            email: userData.email || ""
          };
          foundUid = uid;
          break;
        }
      }

      if (!foundPatient) {
        toast.error(`User ID "${patientIdInput}" not found`);
        setLoading(false);
        return;
      }

      // Check if already added
      if (myPatients.some(p => p.patientId === patientIdInput.trim())) {
        toast.warning("User already in your list");
        setLoading(false);
        return;
      }

      // Add to doctor's patient list using same path as Dashboard
      const currentList = myPatients.map(p => ({
        firebase_uid: p.uid,
        simple_id: p.patientId,
        name: p.name,
        email: p.email
      }));

      const newPatient = {
        firebase_uid: foundUid,
        simple_id: foundPatient.patientId,
        name: foundPatient.name,
        email: foundPatient.email
      };

      const updatedList = [...currentList, newPatient];
      await set(ref(database, `doctor_patient_lists/${user.uid}`), updatedList);

      toast.success(`User ${foundPatient.name} added successfully!`);
      setPatientIdInput("");
      await fetchMyPatients();
    } catch (error: any) {
      console.error("Error adding patient:", error);
      toast.error(error.message || "Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePatient = async (patientId: string) => {
    if (!user) return;

    const patient = myPatients.find(p => p.patientId === patientId);
    if (!confirm(`Remove user ${patient?.name || patientId} from your list?`)) {
      return;
    }

    try {
      // Remove from doctor's patient list using same path as Dashboard
      const updatedList = myPatients
        .filter(p => p.patientId !== patientId)
        .map(p => ({
          firebase_uid: p.uid,
          simple_id: p.patientId,
          name: p.name,
          email: p.email
        }));

      await set(ref(database, `doctor_patient_lists/${user.uid}`), updatedList);
      toast.success("User removed");
      await fetchMyPatients();
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error("Failed to remove user");
    }
  };

  const handleViewPatient = (patientUid: string, patientId: string) => {
    // Navigate to main dashboard with patient context
    // The dashboard will show exact same design for doctor viewing patient
    navigate(`/dashboard?patient=${patientId}`);
  };

  if (!user) return null;

  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 lg:p-8 lg:ml-0 ml-16">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Supervisor Dashboard</h1>
            <p className="text-muted-foreground">{user.fullName}</p>
          </div>

        {/* Add User Section */}
        <Card className="p-6 mb-8 shadow-custom-lg bg-card/80 backdrop-blur">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Add User</h2>
          </div>
          <div className="flex gap-3">
            <Input
              placeholder="Enter User ID (e.g., P1)"
              value={patientIdInput}
              onChange={(e) => setPatientIdInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddPatient()}
              className="flex-1"
              disabled={loading}
            />
            <Button
              onClick={handleAddPatient}
              disabled={loading}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {loading ? "Adding..." : "Add User"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Enter the unique User ID to add them to your list
          </p>
        </Card>

        {/* My Users Section */}
        <Card className="p-6 shadow-custom-lg bg-card/80 backdrop-blur">
          <div className="flex items-center gap-2 mb-6">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">My Users</h2>
            <span className="ml-auto text-sm text-muted-foreground">
              {myPatients.length} {myPatients.length === 1 ? "user" : "users"}
            </span>
          </div>

          {fetchingPatients ? (
            <div className="text-center py-12">
              <Activity className="h-8 w-8 text-primary animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : myPatients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No users added yet</p>
              <p className="text-sm text-muted-foreground/70">
                Add users using their User ID above
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {myPatients.map((patient) => (
                <div
                  key={patient.patientId}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-card/70 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Heart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{patient.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        ID: {patient.patientId}
                      </p>
                      <p className="text-xs text-muted-foreground/70">{patient.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleViewPatient(patient.uid, patient.patientId)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemovePatient(patient.patientId)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        </div>
      </main>
    </div>
  );
}
