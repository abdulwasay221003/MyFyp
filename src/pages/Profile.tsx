import { useAuth } from "@/contexts/AuthContext";
import { ref, get, update } from "firebase/database";
import { database } from "@/firebase";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const userRef = ref(database, `users/${user.uid}`);
    get(userRef).then(snapshot => {
      if (snapshot.exists()) setProfile(snapshot.val());
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const userRef = ref(database, `users/${user.uid}`);
    await update(userRef, profile);
    toast.success("Profile updated successfully!");
  };

  if (!user) return null;
  if (loading) return <p className="text-center mt-10 text-muted-foreground">Loading profile...</p>;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Card className="p-6 max-w-3xl mx-auto shadow-custom-md border border-border/50">
          <h1 className="text-3xl font-bold mb-4 text-foreground">My Profile</h1>
          <p className="text-muted-foreground mb-6">
            View and edit your personal details below.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Full Name</label>
              <input
                className="w-full p-2 border rounded bg-background text-foreground"
                value={profile.fullName || ""}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              />
            </div>

            {/* Email (non-editable) */}
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Email</label>
              <input
                className="w-full p-2 border rounded bg-gray-100 text-gray-800"
                value={user?.email || ""}
                disabled
              />
            </div>

            {/* User ID (for users only) */}
            {profile.role === "patient" && profile.patientId && (
              <div>
                <label className="block text-sm text-muted-foreground mb-1">User ID</label>
                <input
                  className="w-full p-2 border rounded bg-gray-100 text-gray-800 font-mono font-bold"
                  value={profile.patientId || "Not assigned"}
                  disabled
                />
              </div>
            )}

            {/* Conditional fields for Supervisor */}
            {profile.role === "doctor" ? (
              <>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Specialization</label>
                  <input
                    className="w-full p-2 border rounded bg-background text-foreground"
                    value={profile.specialization || ""}
                    onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Experience (years)</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded bg-background text-foreground"
                    value={profile.experienceYears || ""}
                    onChange={(e) => setProfile({ ...profile, experienceYears: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-muted-foreground mb-1">Hospital / Clinic</label>
                  <input
                    className="w-full p-2 border rounded bg-background text-foreground"
                    value={profile.hospital || ""}
                    onChange={(e) => setProfile({ ...profile, hospital: e.target.value })}
                  />
                </div>
              </>
            ) : (
              // User profile fields - only essential data needed
              <>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Date of Birth</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded bg-background text-foreground"
                    value={profile.dateOfBirth || ""}
                    onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Gender</label>
                  <select
                    className="w-full p-2 border rounded bg-background text-foreground"
                    value={profile.gender || ""}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Height (cm)</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded bg-background text-foreground"
                    value={profile.height || ""}
                    onChange={(e) => setProfile({ ...profile, height: e.target.value })}
                    placeholder="e.g., 170"
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-2 border rounded bg-background text-foreground"
                    value={profile.weight || ""}
                    onChange={(e) => setProfile({ ...profile, weight: e.target.value })}
                    placeholder="e.g., 70.5"
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Blood Group</label>
                  <select
                    className="w-full p-2 border rounded bg-background text-foreground"
                    value={profile.bloodGroup || ""}
                    onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Contact Number</label>
                  <input
                    className="w-full p-2 border rounded bg-background text-foreground"
                    value={profile.phone || ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <Button className="mt-6 w-full md:w-auto" onClick={handleSave}>
            Save Changes
          </Button>
        </Card>
      </main>
    </div>
  );
}
