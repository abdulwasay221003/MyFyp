// Utility functions for patient ID management

import { ref, get, set, remove } from "firebase/database";
import { database } from "../firebase";

export interface PatientInfo {
  simple_id: string;
  firebase_uid: string;
  name: string;
  email: string;
}

/**
 * Resolve a patient ID (simple like "P1" or Firebase UID) to Firebase UID
 */
export async function resolvePatientId(patientInput: string): Promise<string | null> {
  if (!patientInput) return null;

  // If it starts with 'P', it's a simple ID - look it up in patient_mappings
  if (patientInput.startsWith('P')) {
    const mappingRef = ref(database, `patient_mappings/${patientInput}`);
    const snapshot = await get(mappingRef);
    if (snapshot.exists()) {
      return snapshot.val() as string;
    }
    return null;
  }

  // Otherwise, assume it's already a Firebase UID
  return patientInput;
}

/**
 * Get patient info by simple ID or Firebase UID
 */
export async function getPatientInfo(patientInput: string): Promise<PatientInfo | null> {
  const firebaseUid = await resolvePatientId(patientInput);
  if (!firebaseUid) return null;

  // Try to get info from patient_info first
  if (patientInput.startsWith('P')) {
    const infoRef = ref(database, `patient_info/${patientInput}`);
    const snapshot = await get(infoRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return {
        simple_id: patientInput,
        firebase_uid: firebaseUid,
        name: data.name || "Unknown",
        email: data.email || ""
      };
    }
  }

  // Fallback to users table
  const userRef = ref(database, `users/${firebaseUid}`);
  const userSnapshot = await get(userRef);
  if (userSnapshot.exists()) {
    const userData = userSnapshot.val();

    // Find simple ID from reverse lookup
    const mappingsRef = ref(database, "patient_mappings");
    const mappingsSnapshot = await get(mappingsRef);
    let simple_id = "";
    if (mappingsSnapshot.exists()) {
      const mappings = mappingsSnapshot.val();
      for (const [sid, uid] of Object.entries(mappings)) {
        if (uid === firebaseUid) {
          simple_id = sid;
          break;
        }
      }
    }

    return {
      simple_id: simple_id || "",
      firebase_uid: firebaseUid,
      name: userData.fullName || "Unknown",
      email: userData.email || ""
    };
  }

  return null;
}

/**
 * Get all patients with simple IDs
 */
export async function getAllPatients(): Promise<PatientInfo[]> {
  const mappingsRef = ref(database, "patient_mappings");
  const infoRef = ref(database, "patient_info");

  const [mappingsSnapshot, infoSnapshot] = await Promise.all([
    get(mappingsRef),
    get(infoRef)
  ]);

  if (!mappingsSnapshot.exists()) return [];

  const mappings = mappingsSnapshot.val() as Record<string, string>;
  const patientInfo = infoSnapshot.exists() ? infoSnapshot.val() : {};

  const patients: PatientInfo[] = [];

  for (const [simple_id, firebase_uid] of Object.entries(mappings)) {
    const info = patientInfo[simple_id] || {};
    patients.push({
      simple_id,
      firebase_uid,
      name: info.name || "Unknown",
      email: info.email || ""
    });
  }

  return patients.sort((a, b) => a.simple_id.localeCompare(b.simple_id));
}

/**
 * Save doctor's patient list to localStorage and Firebase
 */
export async function saveDoctorPatientList(doctorUid: string, patients: PatientInfo[]) {
  // Save to Firebase
  const listRef = ref(database, `doctor_patient_lists/${doctorUid}`);
  await set(listRef, patients);

  // Also save to localStorage for quick access
  localStorage.setItem(`doctor_patients_${doctorUid}`, JSON.stringify(patients));
}

/**
 * Get doctor's patient list from Firebase (source of truth)
 */
export async function getDoctorPatientList(doctorUid: string): Promise<PatientInfo[]> {
  // Always fetch from Firebase to ensure consistency
  const listRef = ref(database, `doctor_patient_lists/${doctorUid}`);
  const snapshot = await get(listRef);

  if (snapshot.exists()) {
    const data = snapshot.val();
    // Handle both array and object formats
    const patients = Array.isArray(data) ? data : Object.values(data);
    return patients as PatientInfo[];
  }

  return [];
}

/**
 * Add patient to doctor's list and remove from removed list
 */
export async function addPatientToList(doctorUid: string, patient: PatientInfo) {
  const currentList = await getDoctorPatientList(doctorUid);

  // Check if already in list
  if (currentList.some(p => p.firebase_uid === patient.firebase_uid)) {
    return currentList;
  }

  const newList = [...currentList, patient];
  await saveDoctorPatientList(doctorUid, newList);

  // Remove from removed list since admin manually re-added them
  await removeFromRemovedList(doctorUid, patient.firebase_uid);

  return newList;
}

/**
 * Remove patient from doctor's list and track as manually removed
 */
export async function removePatientFromList(doctorUid: string, patientUid: string) {
  const currentList = await getDoctorPatientList(doctorUid);
  const newList = currentList.filter(p => p.firebase_uid !== patientUid);
  await saveDoctorPatientList(doctorUid, newList);

  // Track this patient as manually removed so they don't get auto-added back
  await addToRemovedList(doctorUid, patientUid);

  return newList;
}

/**
 * Add patient to removed list (so they don't get auto-added back)
 */
async function addToRemovedList(doctorUid: string, patientUid: string) {
  const removedRef = ref(database, `doctor_removed_patients/${doctorUid}/${patientUid}`);
  await set(removedRef, true);
}

/**
 * Remove patient from removed list (when manually re-added by admin)
 */
async function removeFromRemovedList(doctorUid: string, patientUid: string) {
  const removedRef = ref(database, `doctor_removed_patients/${doctorUid}/${patientUid}`);
  await remove(removedRef);
}

/**
 * Get list of patient UIDs that admin has manually removed
 */
export async function getRemovedPatients(doctorUid: string): Promise<string[]> {
  const removedRef = ref(database, `doctor_removed_patients/${doctorUid}`);
  const snapshot = await get(removedRef);

  if (snapshot.exists()) {
    return Object.keys(snapshot.val());
  }

  return [];
}
