import { Sidebar } from '@/components/Sidebar';
import { CombinedHealthHistogram } from '@/components/CombinedHealthHistogram';
import { Button } from '@/components/ui/button';
import { Download, Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ref, onValue } from "firebase/database";
import { database } from "../firebase";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePatient } from "@/contexts/PatientContext";
import { resolvePatientId } from "@/lib/patientUtils";

interface HealthReading {
  heartRate: number;
  steps: number;
  calories: number;
  distance: number;
  sleepHours: number;
  workout: number;
  timestamp: number;
}

const ITEMS_PER_PAGE = 25; // Show 25 items per page

export default function HealthHistory() {
  const { user } = useAuth();
  const { patientId } = usePatient();
  const [readings, setReadings] = useState<HealthReading[]>([]);
  const [resolvedUid, setResolvedUid] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const effectiveId = user?.role === "doctor" ? resolvedUid : user?.uid;

  // Resolve patient ID to Firebase UID for doctors
  useEffect(() => {
    if (user?.role === "doctor" && patientId) {
      resolvePatientId(patientId).then(setResolvedUid);
    } else if (user?.role === "patient") {
      setResolvedUid(user.uid);
    }
  }, [patientId, user]);

  useEffect(() => {
    if (!effectiveId) { setReadings([]); return; }
    // Read from /history for all historical data
    const dataRef = ref(database, `health_data/${effectiveId}/history`);
    const unsub = onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return setReadings([]);
      const formatted = Object.values(data).map((r: any) => {
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

        return {
          heartRate: r.heartRate || 0,
          steps: r.steps || 0,
          calories: r.calories || 0,
          distance: r.distance || 0,
          sleepHours: typeof r.sleepHours === 'number' ? r.sleepHours : 0,
          workout: workoutMinutes,
          timestamp: r.timestamp || Date.now(),
        };
      });
      setReadings(formatted.reverse());
    });
    return () => unsub();
  }, [effectiveId]);

  const handleExport = () => {
    if (!readings.length) return;
    const csv = [
      ['Date', 'Heart Rate', 'Steps', 'Calories', 'Distance', 'Sleep', 'Workout'],
      ...readings.map(r => [
        new Date(r.timestamp).toLocaleString(),
        r.heartRate,
        r.steps,
        r.calories,
        r.distance,
        r.sleepHours,
        r.workout,
      ]),
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${effectiveId || 'user'}_health_history.csv`;
    a.click();
  };

  // Get current page readings for both table and histogram
  const currentPageReadings = readings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Prepare chart data from current page readings (synced with table)
  const chartData = currentPageReadings.map((r) => ({
    date: new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    heartRate: r.heartRate,
    steps: r.steps,
    calories: r.calories,
    distance: r.distance,
    sleepHours: r.sleepHours,
    workout: r.workout,
  })).reverse(); // Reverse to show oldest to newest in charts

  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 lg:p-8 lg:ml-0 ml-16">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Health History</h1>
            <Button onClick={handleExport} className="gap-2 gradient-primary" disabled={!readings.length}>
              <Download className="h-4 w-4" /> Export Data
            </Button>
          </div>

          {!effectiveId ? (
            <p className="text-muted-foreground">Enter a User ID first to view their health history.</p>
          ) : !readings.length ? (
            <p className="text-muted-foreground">No health data available yet.</p>
          ) : (
            <>
              {/* Combined Histogram for all 4 health metrics */}
              <div className="mb-8">
                <CombinedHealthHistogram data={chartData} />
              </div>

              {/* Table with watch data - Full History with Pagination */}
              <Card className="p-6 shadow-custom-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    All Health Readings ({readings.length} total)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {Math.ceil(readings.length / ITEMS_PER_PAGE)}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Heart Rate</TableHead>
                        <TableHead>Steps</TableHead>
                        <TableHead>Calories</TableHead>
                        <TableHead>Distance</TableHead>
                        <TableHead>Sleep</TableHead>
                        <TableHead>Workout</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentPageReadings.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-muted-foreground">
                              {(currentPage - 1) * ITEMS_PER_PAGE + i + 1}
                            </TableCell>
                            <TableCell>{new Date(r.timestamp).toLocaleString()}</TableCell>
                            <TableCell>{r.heartRate} BPM</TableCell>
                            <TableCell>{r.steps.toLocaleString()}</TableCell>
                            <TableCell>{r.calories} kcal</TableCell>
                            <TableCell>{r.distance.toFixed(2)} km</TableCell>
                            <TableCell>{r.sleepHours.toFixed(1)} h</TableCell>
                            <TableCell>{r.workout} min</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {readings.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, readings.length)} of {readings.length} entries
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="px-3 py-1 text-sm font-medium">
                        {currentPage} / {Math.ceil(readings.length / ITEMS_PER_PAGE)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(readings.length / ITEMS_PER_PAGE), p + 1))}
                        disabled={currentPage === Math.ceil(readings.length / ITEMS_PER_PAGE)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.ceil(readings.length / ITEMS_PER_PAGE))}
                        disabled={currentPage === Math.ceil(readings.length / ITEMS_PER_PAGE)}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
