import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Patient } from "@/types"

export const DEFAULT_PATIENT: Patient = {
  patient_id: "00001",
  name: "Alex Morgan",
  sex: "M",
  gender: "Male",
  age: 28,
  dob: "1998-01-15",
  insurance: "Blue Cross Blue Shield",
  email: "alex.morgan@healthlink.com",
  blood_type: "O+",
  emergency_contact: "+1 555-0199",
  active_status: "Active",
  reliability_grade: "A",
  punctuality_score: 95.0,
  avg_wait_time_min: 5.0,
  two_fa_enabled: false,
  biometric_enabled: false,
  primary_doctor_id: "D001",
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  patient: Patient | null
  setTokens: (access: string, refresh: string) => void
  setPatient: (patient: Patient) => void
  updatePatient: (fields: Partial<Patient>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      patient: DEFAULT_PATIENT,
      setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),
      setPatient: (patient) => set({ patient }),
      updatePatient: (fields) =>
        set((state) => ({
          patient: state.patient ? { ...state.patient, ...fields } : { ...DEFAULT_PATIENT, ...fields },
        })),
      logout: () => set({ accessToken: null, refreshToken: null, patient: DEFAULT_PATIENT }),
    }),
    { name: "healthlink-auth" }
  )
)
