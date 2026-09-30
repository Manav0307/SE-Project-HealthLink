// ── Patient types ──────────────────────────────────────────────────────────
export interface Patient {
  patient_id: string
  name: string
  sex: string | null
  gender: string | null
  age: number | null
  dob: string | null
  insurance: string | null
  email: string | null
  blood_type: string | null
  emergency_contact: string | null
  active_status: string | null
  reliability_grade: string
  punctuality_score: number
  avg_wait_time_min: number
  two_fa_enabled: boolean
  biometric_enabled: boolean
  primary_doctor_id: string | null
}

export interface BehaviorInsights {
  avg_wait_time_min: number
  punctuality_score: number
  reliability_grade: string
  reliability_percentile: number
  total_appointments: number
  no_show_count: number
}

// ── Appointment types ──────────────────────────────────────────────────────
export type AppointmentPortalStatus = "upcoming" | "completed" | "missed" | "cancelled"
export type AppointmentCSVStatus = "attended" | "did not attend"

export interface Appointment {
  appointment_id: string
  slot_id: string
  appointment_date: string
  appointment_time: string
  portal_status: AppointmentPortalStatus
  appointment_type: string
  reschedule_count: number
  waiting_time: number | null
  appointment_duration: number | null
  doctor_id: string | null
  summary_url: string | null
  doctor?: Doctor
}

// ── Slot types ─────────────────────────────────────────────────────────────
export type SlotStatus = "free" | "locked" | "booked"
export type TrafficLevel = "low" | "medium" | "peak"

export interface Slot {
  slot_id: string
  appointment_date: string
  appointment_time: string
  status: SlotStatus
  duration_min: number
  predicted_wait_min: number
  no_show_probability: number
  traffic_level: TrafficLevel
  is_recommended: boolean
}

// ── Doctor types ───────────────────────────────────────────────────────────
export interface Doctor {
  doctor_id: string
  name: string
  specialization: string
  rating: number
  profile_image_url: string | null
  avg_session_duration_min: number
}

// ── Queue types ────────────────────────────────────────────────────────────
export type QueuePhase = "waiting" | "in_progress" | "called" | "done"

export interface QueuePosition {
  queue_id: string
  position: number
  total_in_queue: number
  status: QueuePhase
  eta_seconds: number
  estimated_arrival: string
}

export interface QueueStatus {
  clinic_id: string
  active_session: boolean
  total_waiting: number
  avg_wait_min: number
  delay_reasons: string[]
  traffic_level: TrafficLevel
}

// ── Dashboard types ────────────────────────────────────────────────────────
export interface DashboardSummary {
  patient_name: string
  upcoming_appointment: {
    appointment_id: string
    appointment_date: string
    appointment_time: string
    doctor_name: string
    appointment_type: string
    location: string
  } | null
  clinic_status: {
    total_ahead: number
    total_in_queue: number
    traffic_level: TrafficLevel
  }
  unread_alerts: Alert[]
  health_metric_snapshot: Record<string, number>
}

export interface Alert {
  notification_id: string
  title: string
  message: string
  is_read: boolean
}

// ── Reschedule types ───────────────────────────────────────────────────────
export interface RescheduleOption {
  slot_id: string
  date_label: string
  time_label: string
  predicted_wait_min: number
  wait_reduction_pct: number
  traffic_level: TrafficLevel
  description: string
  is_best_choice: boolean
}
