/**
 * Axios API client with JWT interceptor
 * Automatically refreshes token on 401
 */
import axios from "axios"
import { useAuthStore } from "@/store/auth-store"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // Auth errors: just clear the token, no redirect needed (login page removed)
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

export default api

// ── Typed API calls ────────────────────────────────────────────────────────
export const dashboardApi = {
  getSummary: (patientId: string) => api.get(`/dashboard/summary/${patientId}`),
}

export const appointmentsApi = {
  list: (status?: string) => api.get("/appointments", { params: { status } }),
  cancel: (id: string, reason?: string) => api.patch(`/appointments/${id}/cancel`, { reason }),
  reschedule: (id: string, newSlotId: string) => api.post(`/appointments/${id}/reschedule`, { new_slot_id: newSlotId }),
  getRescheduleOptions: (id: string) => api.get(`/appointments/${id}/reschedule-options`),
  getSummary: (id: string) => api.get(`/appointments/${id}/summary`),
}

export const slotsApi = {
  getAvailable: (date: string, doctorId?: string) => api.get("/slots/available", { params: { date, doctorId } }),
  getRecommended: (patientId: string) => api.get(`/slots/recommended/${patientId}`),
  reserve: (slotId: string, patientId: string) => api.post("/slots/reserve", { slot_id: slotId, patient_id: patientId }),
  confirm: (lockId: string, slotId: string, patientId: string, type: string, doctorId?: string) =>
    api.post("/slots/confirm", { lock_id: lockId, slot_id: slotId, patient_id: patientId, appointment_type: type, doctor_id: doctorId }),
}

export const patientsApi = {
  getProfile: (id: string) => api.get(`/patients/${id}/profile`),
  getBehaviorInsights: (id: string) => api.get(`/patients/${id}/behavior-insights`),
  updatePersonalInfo: (id: string, data: object) => api.patch(`/patients/${id}/personal-info`, data),
  enable2FA: () => api.post("/auth/2fa/enable"),
  disable2FA: () => api.post("/auth/2fa/disable"),
}

export const queueApi = {
  getPosition: (appointmentId: string) => api.get(`/queue/position/${appointmentId}`),
  getStatus: (clinicId: string) => api.get(`/queue/status/${clinicId}`),
  checkIn: (appointmentId: string) => api.post("/queue/checkin", { appointment_id: appointmentId }),
}
