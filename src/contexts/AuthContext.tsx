// // src/contexts/AuthContext.tsx
// import React, { createContext, useContext, useEffect, useState } from "react";
// import {
//   createUserWithEmailAndPassword,
//   signInWithEmailAndPassword,
//   onAuthStateChanged,
//   signOut,
// } from "firebase/auth";
// import { ref, set, get, child } from "firebase/database";
// import { auth, database } from "../firebase";

// interface User {
//   uid: string;
//   email: string;
//   fullName: string;
//   role: "doctor" | "patient";
// }

// interface AuthContextType {
//   user: User | null;
//   signup: (
//     email: string,
//     password: string,
//     role: "doctor" | "patient",
//     fullName: string
//   ) => Promise<string>;
//   login: (email: string, password: string) => Promise<void>;
//   logout: () => Promise<void>;
//   isAuthenticated: boolean;
//   loading: boolean;
// }

// const AuthContext = createContext<AuthContextType | null>(null);
// export const useAuth = () => useContext(AuthContext)!;

// export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [user, setUser] = useState<User | null>(null);
//   const [loading, setLoading] = useState(true);

//   // 🔹 Signup — returns UID
//   const signup = async (
//     email: string,
//     password: string,
//     role: "doctor" | "patient",
//     fullName: string
//   ): Promise<string> => {
//     const cred = await createUserWithEmailAndPassword(auth, email, password);
//     const uid = cred.user.uid;

//     await set(ref(database, `users/${uid}`), { email, fullName, role });
//     setUser({ uid, email, fullName, role });

//     return uid; // for Flask trigger
//   };

//   // 🔹 Login
//   const login = async (email: string, password: string) => {
//     const cred = await signInWithEmailAndPassword(auth, email, password);
//     const uid = cred.user.uid;
//     const snap = await get(child(ref(database), `users/${uid}`));

//     if (snap.exists()) {
//       const data = snap.val();
//       setUser({ uid, email: data.email, fullName: data.fullName, role: data.role });
//     }
//   };

//   // 🔹 Logout
//   const logout = async () => {
//     await signOut(auth);
//     setUser(null);
//   };

//   // 🔹 Observe user state
//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
//       if (firebaseUser) {
//         const snap = await get(child(ref(database), `users/${firebaseUser.uid}`));
//         if (snap.exists()) {
//           const data = snap.val();
//           setUser({
//             uid: firebaseUser.uid,
//             email: data.email,
//             fullName: data.fullName,
//             role: data.role,
//           });
//         }
//       } else {
//         setUser(null);
//       }
//       setLoading(false);
//     });
//     return unsubscribe;
//   }, []);

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         signup,
//         login,
//         logout,
//         isAuthenticated: !!user,
//         loading,
//       }}
//     >
//       {!loading && children}
//     </AuthContext.Provider>
//   );
// };


// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { ref, set, get, child } from "firebase/database";
import { auth, database } from "../firebase";

interface User {
  uid: string;
  email: string;
  fullName: string;
  role: "doctor" | "patient";
  patientId?: string; // Simple patient ID like P1, P2, etc.
}

interface AuthContextType {
  user: User | null;
  signup: (email: string, password: string, role: "doctor" | "patient", fullName: string) => Promise<string>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => useContext(AuthContext)!;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Observe auth changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          const snap = await get(child(ref(database), `users/${fbUser.uid}`));
          const data = snap.exists() ? snap.val() : null;
          const u: User = {
            uid: fbUser.uid,
            email: fbUser.email || "",
            fullName: data?.fullName || "",
            role: data?.role || "patient",
            patientId: data?.patientId || undefined, // Load patient ID (P1, P2, etc.)
          };
          setUser(u);
          // persist small session for quick access (optional)
          localStorage.setItem("health-sync-user", JSON.stringify(u));
        } catch (err) {
          console.error("AuthObserver: failed to read user", err);
        }
      } else {
        setUser(null);
        localStorage.removeItem("health-sync-user");
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Sign up — returns uid for further actions (e.g. trigger simulator)
  const signup = async (email: string, password: string, role: "doctor" | "patient", fullName: string): Promise<string> => {
    // Firebase Auth will handle duplicate email checking automatically
    // If email exists, createUserWithEmailAndPassword will throw error
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    await set(ref(database, `users/${uid}`), { email, fullName, role });
    // set local user immediately
    setUser({ uid, email, fullName, role });
    localStorage.setItem("health-sync-user", JSON.stringify({ uid, email, fullName, role }));
    return uid;
  };

  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will pick up and set user — but read DB to immediately have role
    const uid = cred.user.uid;
    const snap = await get(child(ref(database), `users/${uid}`));
    if (snap.exists()) {
      const data = snap.val();
      const u: User = {
        uid,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        patientId: data.patientId || undefined, // Load patient ID (P1, P2, etc.)
      };
      setUser(u);
      localStorage.setItem("health-sync-user", JSON.stringify(u));
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem("health-sync-user");
  };

  return (
    <AuthContext.Provider value={{ user, signup, login, logout, loading, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
