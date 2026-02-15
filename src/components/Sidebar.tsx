import { Link, useLocation } from 'react-router-dom';
import { Activity, History, Bell, LogOut, Menu, Moon, Sun, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ref, onValue } from 'firebase/database';
import { database } from '@/firebase';
import { usePatient } from '@/contexts/PatientContext';
import { resolvePatientId } from '@/lib/patientUtils';

// Generate unique alert ID based on data key and alert type (must match Alerts.tsx)
const generateAlertId = (dataKey: string, alertType: string): string => {
  return `${dataKey}_${alertType.replace(/\s+/g, '_')}`;
};

export const Sidebar = () => {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { patientId } = usePatient();
  const [alertCount, setAlertCount] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [effectiveId, setEffectiveId] = useState<string | null>(null);

  // Resolve effective user ID
  useEffect(() => {
    const resolveId = async () => {
      if (user?.role === 'doctor' && patientId) {
        const uid = await resolvePatientId(patientId);
        setEffectiveId(uid);
      } else if (user?.uid) {
        setEffectiveId(user.uid);
      } else {
        setEffectiveId(null);
      }
    };
    resolveId();
  }, [user, patientId]);

  // Get real-time UNREAD alert count from Firebase - only risk alerts (HIGH/MODERATE severity)
  useEffect(() => {
    if (!effectiveId) {
      setAlertCount(0);
      return;
    }

    // We need to listen to both health history AND read status
    const historyRef = ref(database, `health_data/${effectiveId}/history`);
    const readRef = ref(database, `notifications_read/${effectiveId}`);

    let historyData: Record<string, any> | null = null;
    let readData: Record<string, boolean> = {};

    const calculateUnreadCount = () => {
      if (!historyData) {
        setAlertCount(0);
        return;
      }

      // Generate all alert IDs from history data (same logic as Alerts.tsx)
      const alertIds: string[] = [];

      Object.entries(historyData).forEach(([key, r]: [string, any]) => {
        // Handle sleepHours
        const sleepHrs = typeof r.sleepHours === 'number' ? r.sleepHours : 0;

        // Heart rate alerts (HIGH severity)
        if (r.heartRate > 120) alertIds.push(generateAlertId(key, "Heart Rate High"));
        else if (r.heartRate < 50) alertIds.push(generateAlertId(key, "Heart Rate VeryLow"));
        else if (r.heartRate < 60) alertIds.push(generateAlertId(key, "Heart Rate Low"));

        // Activity alerts
        if (r.steps < 1000) alertIds.push(generateAlertId(key, "Activity VeryLow"));
        else if (r.steps < 3000) alertIds.push(generateAlertId(key, "Activity Low"));

        // Sleep alerts
        if (sleepHrs > 0 && sleepHrs < 4) alertIds.push(generateAlertId(key, "Sleep Severe"));
        else if (sleepHrs > 0 && sleepHrs < 6) alertIds.push(generateAlertId(key, "Sleep Insufficient"));
        else if (sleepHrs > 10) alertIds.push(generateAlertId(key, "Sleep Excessive"));
      });

      // Count unread alerts
      const unreadCount = alertIds.filter(id => !readData[id]).length;
      setAlertCount(unreadCount);
    };

    const unsubHistory = onValue(historyRef, (snapshot) => {
      historyData = snapshot.val();
      calculateUnreadCount();
    });

    const unsubRead = onValue(readRef, (snapshot) => {
      readData = snapshot.val() || {};
      calculateUnreadCount();
    });

    return () => {
      unsubHistory();
      unsubRead();
    };
  }, [effectiveId]);

  useEffect(() => {
    // Check for saved theme preference
    const isDark = localStorage.getItem('health-sync-theme') === 'dark';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('health-sync-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('health-sync-theme', 'light');
    }
  };

  // Check if doctor has a patient selected
  const isDoctor = user?.role === 'doctor';
  const hasPatientSelected = isDoctor && patientId;

  // Navigation items - for doctors, hide Health History and Notifications when no patient selected
  const navItems = [
    { path: '/dashboard', icon: Activity, label: 'Dashboard', alwaysShow: true },
    { path: '/history', icon: History, label: 'Health History', alwaysShow: !isDoctor }, // Hide for doctor without patient
    { path: '/alerts', icon: Bell, label: 'Notifications', badge: alertCount, alwaysShow: !isDoctor }, // Hide for doctor without patient
    { path: '/profile', icon: User, label: 'Profile', alwaysShow: true },
  ].filter(item => item.alwaysShow || hasPatientSelected);

  const NavContent = () => (
    <>
      <div className="px-6 py-8 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Health Sync
        </h1>
        <p className="text-sm text-sidebar-foreground/70 mt-1">
          Personal Health Monitor
        </p>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-custom-sm'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-6 border-t border-sidebar-border space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={toggleTheme}
        >
          {darkMode ? (
            <>
              <Sun className="h-5 w-5" />
              Light Mode
            </>
          ) : (
            <>
              <Moon className="h-5 w-5" />
              Dark Mode
            </>
          )}
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-3 text-danger hover:text-danger"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shadow-custom-md">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-sidebar">
            <div className="h-full flex flex-col">
              <NavContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 bg-sidebar border-r border-sidebar-border shadow-custom-lg h-screen sticky top-0">
        <NavContent />
      </aside>
    </>
  );
};
