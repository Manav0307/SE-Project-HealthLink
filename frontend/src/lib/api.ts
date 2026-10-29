/**
 * Axios API client with standardized snake_case parameters
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
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

export default api

// ── Typed API calls ────────────────────────────────────────────────────────
export const dashboardApi = {
  getSummary: (patient_id: string) => api.get(`/dashboard/summary/${patient_id}`),
}

export const appointmentsApi = {
  list: (status?: string, patient_id?: string) => api.get("/appointments", { params: { status, patient_id } }),
  cancel: (id: string, reason?: string) => api.patch(`/appointments/${id}/cancel`, { reason }),
  reschedule: (id: string, new_slot_id: string) => api.post(`/appointments/${id}/reschedule`, { new_slot_id }),
  getRescheduleOptions: (id: string) => api.get(`/appointments/${id}/reschedule-options`),
  getSummary: (id: string) => api.get(`/appointments/${id}/summary`),
}

export const slotsApi = {
  getAvailable: (date: string, doctor_id?: string) => api.get("/slots/available", { params: { date, doctor_id } }),
  getRecommended: (patient_id: string) => api.get(`/slots/recommended/${patient_id}`),
  reserve: (slot_id: string, patient_id: string) => api.post("/slots/reserve", { slot_id, patient_id }),
  confirm: (lock_id: string, slot_id: string, patient_id: string, appointment_type: string, doctor_id?: string) =>
    api.post("/slots/confirm", { lock_id, slot_id, patient_id, appointment_type, doctor_id }),
}

export const patientsApi = {
  getProfile: (patient_id: string) => api.get(`/patients/${patient_id}/profile`),
  getBehaviorInsights: (patient_id: string) => api.get(`/patients/${patient_id}/behavior-insights`),
  updatePersonalInfo: (patient_id: string, data: object) => api.patch(`/patients/${patient_id}/personal-info`, data),
}

export const queueApi = {
  getPosition: (appointment_id: string) => api.get(`/queue/position/${appointment_id}`),
  getStatus: (clinic_id: string) => api.get(`/queue/status/${clinic_id}`),
  checkIn: (appointment_id: string) => api.post("/queue/checkin", { appointment_id }),
}
