// // src/contexts/PatientContext.tsx
// import React, { createContext, useContext, useState } from "react";

// type PatientContextType = {
//   patientId: string | null;
//   setPatientId: (id: string | null) => void;
// };

// const PatientContext = createContext<PatientContextType | undefined>(undefined);

// export const PatientProvider = ({ children }: { children: React.ReactNode }) => {
//   const [patientId, setPatientId] = useState<string | null>(null);
//   return (
//     <PatientContext.Provider value={{ patientId, setPatientId }}>
//       {children}
//     </PatientContext.Provider>
//   );
// };

// export const usePatient = () => {
//   const ctx = useContext(PatientContext);
//   if (!ctx) throw new Error("usePatient must be used within PatientProvider");
//   return ctx;
// };




// src/contexts/PatientContext.tsx
import React, { createContext, useContext, useState } from "react";

interface PatientContextType {
  patientId: string | null;
  setPatientId: (id: string | null) => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patientId, setPatientId] = useState<string | null>(null);
  return <PatientContext.Provider value={{ patientId, setPatientId }}>{children}</PatientContext.Provider>;
};

export const usePatient = () => {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error("usePatient must be used inside PatientProvider");
  return ctx;
};




// // src/contexts/PatientContext.tsx
// import React, { createContext, useContext, useState } from "react";

// interface PatientContextType {
//   patientId: string | null;
//   setPatientId: (id: string | null) => void;
// }

// const PatientContext = createContext<PatientContextType | undefined>(undefined);

// export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [patientId, setPatientId] = useState<string | null>(null);
//   return <PatientContext.Provider value={{ patientId, setPatientId }}>{children}</PatientContext.Provider>;
// };

// export const usePatient = () => {
//   const ctx = useContext(PatientContext);
//   if (!ctx) throw new Error("usePatient must be used inside PatientProvider");
//   return ctx;
// };
