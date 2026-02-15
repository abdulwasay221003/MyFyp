// // src/pages/Auth.tsx
// import { useState, FormEvent } from "react";
// import { useNavigate } from "react-router-dom";
// import { Activity, Heart, Mail, Lock, User, Stethoscope, UserCircle } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Card } from "@/components/ui/card";
// import { toast } from "sonner";
// import { useAuth } from "@/contexts/AuthContext";

// export default function Auth() {
//   const [isLogin, setIsLogin] = useState(true);
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [fullName, setFullName] = useState("");
//   const [role, setRole] = useState<"doctor" | "patient">("patient");
//   const [loading, setLoading] = useState(false);
//   const { signup, login } = useAuth();
//   const navigate = useNavigate();

//   const validateInputs = () => {
//     if (!email.includes("@")) {
//       toast.error("Please enter a valid email address");
//       return false;
//     }
//     if (password.length < 6) {
//       toast.error("Password must be at least 6 characters long");
//       return false;
//     }
//     if (!isLogin && fullName.trim().length < 3) {
//       toast.error("Please enter a valid full name");
//       return false;
//     }
//     return true;
//   };

//   const handleSubmit = async (e: FormEvent) => {
//     e.preventDefault();
//     if (!validateInputs()) return;
//     setLoading(true);

//     try {
//       if (isLogin) {
//         await login(email, password);
//         toast.success("Welcome back!");
//         navigate("/dashboard");
//       } else {
//         const uid = await signup(email, password, role, fullName);
//         toast.success(`Account created successfully as a ${role}!`);

//         // Trigger Flask simulation for patients (optional)
//         if (role === "patient" && uid) {
//           try {
//             const res = await fetch("http://127.0.0.1:5000/start_simulation", {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               body: JSON.stringify({ patient_id: uid }),
//             });
//             if (res.ok) toast.success("Live health data simulation started!");
//             else toast.warning("Simulation not started. Check Flask server.");
//           } catch (err) {
//             console.error("Flask connection error:", err);
//             toast.warning("Could not connect to Flask. Check backend.");
//           }
//         }

//         // small delay to let auth state propagate
//         setTimeout(() => navigate("/dashboard"), 700);
//       }
//     } catch (error: any) {
//       toast.error(error.message || "Authentication failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center p-4 gradient-primary">
//       <div className="w-full max-w-md">
//         <div className="text-center mb-8">
//           <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-card shadow-glow mb-4 animate-pulse-slow">
//             <Heart className="h-8 w-8 text-primary animate-heartbeat" />
//           </div>
//           <h1 className="text-4xl font-bold text-primary-foreground mb-2">Health Sync</h1>
//           <p className="text-primary-foreground/80">Your Health Monitoring Portal</p>
//         </div>

//         <Card className="p-8 shadow-custom-lg bg-slate-900/60 backdrop-blur">
//           <div className="mb-6 text-center">
//             <h2 className="text-2xl font-bold text-foreground">
//               {isLogin ? "Welcome Back" : "Create Account"}
//             </h2>
//             <p className="text-muted-foreground mt-1">
//               {isLogin ? "Login to access your dashboard" : "Join as a doctor or patient"}
//             </p>
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-4">
//             {!isLogin && (
//               <>
//                 <div className="space-y-2">
//                   <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
//                   <div className="relative">
//                     <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
//                     <Input
//                       id="fullName"
//                       type="text"
//                       placeholder="John Doe"
//                       value={fullName}
//                       onChange={(e) => setFullName(e.target.value)}
//                       className="pl-10"
//                       required
//                     />
//                   </div>
//                 </div>

//                 <div className="space-y-2">
//                   <Label className="text-foreground">Select Role</Label>
//                   <div className="flex gap-4">
//                     <button
//                       type="button"
//                       onClick={() => setRole("doctor")}
//                       className={`flex-1 flex items-center justify-center gap-2 border rounded-lg py-2 ${
//                         role === "doctor" ? "border-blue-500 bg-blue-500/20 text-blue-400" : "border-gray-700 hover:bg-gray-800"
//                       }`}
//                     >
//                       <Stethoscope className="h-5 w-5" /> Doctor
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => setRole("patient")}
//                       className={`flex-1 flex items-center justify-center gap-2 border rounded-lg py-2 ${
//                         role === "patient" ? "border-green-500 bg-green-500/20 text-green-400" : "border-gray-700 hover:bg-gray-800"
//                       }`}
//                     >
//                       <UserCircle className="h-5 w-5" /> Patient
//                     </button>
//                   </div>
//                 </div>
//               </>
//             )}

//             <div className="space-y-2">
//               <Label htmlFor="email" className="text-foreground">Email Address</Label>
//               <div className="relative">
//                 <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
//                 <Input
//                   id="email"
//                   type="email"
//                   placeholder="you@example.com"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   className="pl-10"
//                   required
//                 />
//               </div>
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="password" className="text-foreground">Password</Label>
//               <div className="relative">
//                 <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
//                 <Input
//                   id="password"
//                   type="password"
//                   placeholder="••••••••"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   className="pl-10"
//                   required
//                   minLength={6}
//                 />
//               </div>
//             </div>

//             <Button
//               type="submit"
//               className="w-full gradient-primary shadow-glow hover:shadow-custom-lg transition-all"
//               disabled={loading}
//             >
//               <Activity className="mr-2 h-5 w-5" />
//               {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
//             </Button>
//           </form>

//           <div className="mt-6 text-center">
//             <button
//               type="button"
//               onClick={() => setIsLogin(!isLogin)}
//               className="text-sm text-primary hover:underline"
//             >
//               {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
//             </button>
//           </div>
//         </Card>

//         <p className="text-center text-primary-foreground/60 text-xs mt-6">
//           Secure & Encrypted Health Platform
//         </p>
//       </div>
//     </div>
//   );
// }



// src/pages/Auth.tsx
import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Heart, Mail, Lock, User, Shield, UserCircle, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ref, get } from "firebase/database";
import { database } from "@/firebase";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"doctor" | "patient">("patient");
  const [loginRole, setLoginRole] = useState<"doctor" | "patient">("patient"); // Role selection for login
  const [loading, setLoading] = useState(false);
  const { signup, login, logout } = useAuth();
  const navigate = useNavigate();

  const validateInputs = () => {
    if (!email.includes("@")) { toast.error("Enter a valid email"); return false; }

    // Gmail-only validation for BOTH login and signup
    if (!email.toLowerCase().endsWith("@gmail.com")) {
      toast.error("Only Gmail accounts (@gmail.com) are allowed");
      return false;
    }

    if (password.length < 6) { toast.error("Password must be >=6 chars"); return false; }
    if (!isLogin && fullName.trim().length < 3) { toast.error("Enter full name"); return false; }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    // No blocking needed - both doctors and patients use same login page

    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);

        // Wait for auth state to update
        await new Promise(resolve => setTimeout(resolve, 300));

        // Get user role and redirect accordingly
        const storedUser = localStorage.getItem("health-sync-user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);

          // Validate role matches what user selected
          if (loginRole === "doctor" && userData.role !== "doctor") {
            toast.error("This account is not registered as a Supervisor. Please select 'User' to login.");
            await logout();
            setLoading(false);
            return;
          }
          if (loginRole === "patient" && userData.role !== "patient") {
            toast.error("This account is not registered as a User. Please select 'Supervisor' to login.");
            await logout();
            setLoading(false);
            return;
          }

          if (userData.role === "doctor") {
            toast.success("Welcome back, Supervisor!");
            navigate("/doctor/dashboard");
          } else {
            toast.success("Welcome back!");
            navigate("/dashboard");
          }
        } else {
          // Fallback to user dashboard if role not found
          toast.success("Welcome back!");
          navigate("/dashboard");
        }
      } else {
        const uid = await signup(email, password, role, fullName);
        toast.success(`Account created as ${role === 'doctor' ? 'Supervisor' : 'User'}`);

        // If user (patient), assign simple ID - always use watch data (no demo)
        if (role === "patient" && uid) {
          try {
            // Assign a simple patient ID (P1, P2, etc.)
            const assignRes = await fetch("http://localhost:5000/assign_patient_id", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                firebase_uid: uid,
                name: fullName,
                email: email
              }),
            });

            if (assignRes.ok) {
              const assignData = await assignRes.json();
              const patientId = assignData.simple_id;
              toast.success(`Your ID assigned: ${patientId}`);

              // Save patientId - always use watch data
              const { ref, update } = await import("firebase/database");
              const { database } = await import("@/firebase");
              await update(ref(database, `users/${uid}`), {
                patientId: patientId,
                dataSource: "watch"  // Always use real watch data
              });
            }

            toast.success("Please login to mobile app and connect your watch!");
          } catch (err) {
            console.warn("Flask trigger failed", err);
          }

          // Redirect user to dashboard
          setTimeout(() => navigate("/dashboard"), 700);
        } else if (role === "doctor") {
          // Redirect supervisor to supervisor dashboard
          setTimeout(() => navigate("/doctor/dashboard"), 700);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);

      // Better error messages for common cases
      if (err.code === "auth/email-already-in-use") {
        toast.error("This email is already registered. Please login instead.");
      } else if (err.code === "auth/weak-password") {
        toast.error("Password is too weak. Use at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        toast.error("Invalid email address format.");
      } else if (err.code === "auth/wrong-password") {
        toast.error("Incorrect password. Please try again.");
      } else if (err.code === "auth/user-not-found") {
        toast.error("No account found with this email. Please sign up first.");
      } else {
        toast.error(err.message || "Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-primary">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-card shadow-glow mb-4 animate-pulse-slow">
            <Heart className="h-8 w-8 text-primary animate-heartbeat" />
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground mb-2">Health Sync</h1>
          <p className="text-primary-foreground/80">Your Health Monitoring Portal</p>
        </div>

        <Card className="p-8 shadow-custom-lg bg-slate-900/60 backdrop-blur">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-foreground">{isLogin ? "Welcome Back" : "Create Account"}</h2>
            <p className="text-muted-foreground mt-1">{isLogin ? "Login to access your dashboard" : "Join as a User or Supervisor"}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection - Show on BOTH Login and Signup */}
            <div className="space-y-2">
              <Label className="text-foreground">{isLogin ? "Login as:" : "Register as:"}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => isLogin ? setLoginRole("patient") : setRole("patient")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    (isLogin ? loginRole : role) === "patient"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted bg-card text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <UserCircle className="h-5 w-5" />
                  <span className="font-medium">User</span>
                </button>
                <button
                  type="button"
                  onClick={() => isLogin ? setLoginRole("doctor") : setRole("doctor")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    (isLogin ? loginRole : role) === "doctor"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted bg-card text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Supervisor</span>
                </button>
              </div>
            </div>

            {!isLogin && (
              <>
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input id="fullName" type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} />
              </div>
            </div>

            <Button type="submit" className="w-full gradient-primary shadow-glow hover:shadow-custom-lg transition-all" disabled={loading}>
              <Activity className="mr-2 h-5 w-5" />
              {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline">
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </Card>

        <p className="text-center text-primary-foreground/60 text-xs mt-6">Secure & Encrypted Health Platform</p>
      </div>
    </div>
  );
}
