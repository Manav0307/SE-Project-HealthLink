import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Patient } from "@/types"

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
      patient: null,
      setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),
      setPatient: (patient) => set({ patient }),
      updatePatient: (fields) =>
        set((state) => ({
          patient: state.patient ? { ...state.patient, ...fields } : null,
        })),
      logout: () => set({ accessToken: null, refreshToken: null, patient: null }),
    }),
    { name: "healthlink-auth" }
  )
)
