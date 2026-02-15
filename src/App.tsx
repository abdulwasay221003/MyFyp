// // src/App.tsx
// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { AuthProvider, useAuth } from "@/contexts/AuthContext";
// import { PatientProvider } from "@/contexts/PatientContext";
// import Auth from "@/pages/Auth";
// import Dashboard from "@/pages/Dashboard";
// import HealthHistory from "@/pages/HealthHistory";
// import Alerts from "@/pages/Alerts";
// import NotFound from "@/pages/NotFound";

// const queryClient = new QueryClient();

// const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
//   const { user } = useAuth(); // safe because AuthProvider wraps below
//   if (!user) return <Navigate to="/" replace />;
//   return <>{children}</>;
// };

// export default function App() {
//   return (
//     <QueryClientProvider client={queryClient}>
//       <TooltipProvider>
//         {/* AuthProvider MUST wrap everything that uses useAuth */}
//         <AuthProvider>
//           <PatientProvider>
//             <BrowserRouter>
//               <Toaster />
//               <Sonner />
//               <Routes>
//                 <Route path="/" element={<Auth />} />
//                 <Route
//                   path="/dashboard"
//                   element={
//                     <ProtectedRoute>
//                       <Dashboard />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/history"
//                   element={
//                     <ProtectedRoute>
//                       <HealthHistory />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/alerts"
//                   element={
//                     <ProtectedRoute>
//                       <Alerts />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route path="*" element={<NotFound />} />
//               </Routes>
//             </BrowserRouter>
//           </PatientProvider>
//         </AuthProvider>
//       </TooltipProvider>
//     </QueryClientProvider>
//   );
// }



// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PatientProvider } from "@/contexts/PatientContext";

// Pages
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import DoctorDashboard from "@/pages/DoctorDashboard";
import PatientDetailView from "@/pages/PatientDetailView";
import HealthHistory from "@/pages/HealthHistory";
import Alerts from "@/pages/Alerts";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// 🔒 Protect routes that need authentication
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* AuthProvider wraps everything that uses useAuth */}
        <AuthProvider>
          <PatientProvider>
            <BrowserRouter>
              {/* Toast / Notifications */}
              <Toaster />
              <Sonner />

              {/* Application Routes */}
              <Routes>
                {/* Auth / Login Pages */}
                <Route path="/" element={<Auth />} />
                <Route path="/auth" element={<Auth />} />

                {/* Patient Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/history"
                  element={
                    <ProtectedRoute>
                      <HealthHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/alerts"
                  element={
                    <ProtectedRoute>
                      <Alerts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                {/* Doctor Protected Routes */}
                <Route
                  path="/doctor/dashboard"
                  element={
                    <ProtectedRoute>
                      <DoctorDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/doctor/patient/:patientUid"
                  element={
                    <ProtectedRoute>
                      <PatientDetailView />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </PatientProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
