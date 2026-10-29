"use client"
import AppShell from "@/components/layout/AppShell"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useAuthStore, DEFAULT_PATIENT } from "@/store/auth-store"
import { appointmentsApi } from "@/lib/api"
import type { Appointment } from "@/types"

const DOCTORS_MAP: Record<string, { name: string; specialization: string }> = {
  D001: { name: "Dr. Priya Sharma", specialization: "General Medicine" },
  D002: { name: "Dr. Arjun Mehta", specialization: "Cardiology" },
  D003: { name: "Dr. Neha Patel", specialization: "Dermatology" },
  D004: { name: "Dr. Ravi Kumar", specialization: "Orthopedics" },
  D005: { name: "Dr. Sunita Verma", specialization: "ENT Specialist" },
}

export default function AppointmentsPage() {
  const { patient } = useAuthStore()
  const [apiUpcoming, setApiUpcoming] = useState<Appointment[]>([])
  const [apiPast, setApiPast] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAppointments()
  }, [patient?.patient_id])  // fires on mount and when patient changes

  const fetchAppointments = async () => {
    // Use patient from store, or fall back to the default showcase patient
    const patientId = patient?.patient_id || DEFAULT_PATIENT.patient_id
    if (!patientId) { setLoading(false); return }
    try {
      setLoading(true)
      const [upRes, compRes, missedRes] = await Promise.all([
        appointmentsApi.list("upcoming", patientId),
        appointmentsApi.list("completed", patientId),
        appointmentsApi.list("missed", patientId),
      ])
      setApiUpcoming(upRes.data || [])
      setApiPast([...(compRes.data || []), ...(missedRes.data || [])])
    } catch (err) {
      console.error("Error fetching appointments from database:", err)
      setApiUpcoming([])
      setApiPast([])
    } finally {
      setLoading(false)
    }
  }

  // Database is the single source of truth — no localStorage fallback
  const allUpcoming = apiUpcoming
  const allPast = apiPast

  const handleCancel = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return
    setCancellingId(appointmentId)
    try {
      await appointmentsApi.cancel(appointmentId, "Patient requested cancellation")
    } catch (err) {
      console.error("Cancel API error:", err)
    }
    await fetchAppointments()
    setCancellingId(null)
  }

  const formatTime = (time: string) => {
    if (!time) return ""
    const [h, m] = time.split(":").map(Number)
    if (isNaN(h) || isNaN(m)) return time
    const ampm = h >= 12 ? "PM" : "AM"
    const hour = h % 12 || 12
    return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const d = new Date(dateStr + "T00:00:00")
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
  }

  const getDoctorDisplay = (appt: Appointment) => {
    if (appt.doctor?.name) return appt.doctor.name
    if (appt.doctor_id && DOCTORS_MAP[appt.doctor_id]) return DOCTORS_MAP[appt.doctor_id].name
    if (appt.doctor_id) return `Doctor ${appt.doctor_id}`
    return "Specialist"
  }

  const getSpecialization = (appt: Appointment) => {
    if (appt.doctor?.specialization) return appt.doctor.specialization
    if (appt.doctor_id && DOCTORS_MAP[appt.doctor_id]) return DOCTORS_MAP[appt.doctor_id].specialization
    return ""
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-[#e3f2fd] text-[#1565c0]"
      case "completed":
        return "bg-[#e8f5e9] text-[#2e7d32]"
      case "missed":
        return "bg-[#fce4ec] text-[#c62828]"
      case "cancelled":
        return "bg-[#f3f3f4] text-[#777777]"
      default:
        return "bg-[#f3f3f4] text-[#777777]"
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="animate-fade-in flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#dadada] border-t-black rounded-full animate-spin mx-auto mb-4" />
            <p className="hl-label">Loading appointments from database...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="animate-fade-in space-y-8 max-w-5xl">
        {/* ── Header ──────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-[-0.02em] text-black">My Appointments</h1>
            <p className="text-sm text-[#474747] mt-2 leading-relaxed max-w-2xl">
              View and manage your upcoming consultations and clinical history.
            </p>
          </div>
          <Link
            href="/booking"
            className="bg-black text-white rounded-2xl px-6 py-3 text-sm font-semibold flex items-center gap-2 hover:bg-[#3b3b3b] transition-all shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Book New
          </Link>
        </div>

        {/* ── Upcoming Appointments ───────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1565c0]" />
            <h2 className="text-sm font-bold text-black uppercase tracking-[0.05em]">Upcoming Appointments</h2>
            <span className="text-xs text-[#777777] font-medium">({allUpcoming.length})</span>
          </div>

          {allUpcoming.length === 0 ? (
            <div className="hl-card p-8 text-center">
              <span className="material-symbols-outlined text-[36px] text-[#c6c6c6] mb-2 block">event_available</span>
              <p className="text-sm text-[#777777]">No upcoming appointments scheduled.</p>
              <Link href="/booking" className="hl-btn-primary text-xs px-5 py-2.5 mt-4 inline-flex">
                Book a Consultation
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {allUpcoming.map((appt) => (
                <div key={appt.appointment_id} className="hl-card p-6 flex items-center justify-between gap-6 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all">
                  <div className="flex items-center gap-5">
                    <div className="bg-[#f3f3f4] rounded-2xl p-4 text-center min-w-[70px]">
                      <p className="text-xs font-semibold text-[#777777] uppercase">
                        {new Date(appt.appointment_date + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                      </p>
                      <p className="text-2xl font-bold text-black">
                        {new Date(appt.appointment_date + "T00:00:00").getDate()}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-black">{getDoctorDisplay(appt)}</h3>
                        <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${statusBadge(appt.portal_status)}`}>
                          {appt.portal_status}
                        </span>
                      </div>
                      <p className="text-xs text-[#777777] mt-0.5">{getSpecialization(appt)} • {appt.appointment_type}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[#474747]">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-[#777777]">schedule</span>
                          {formatTime(appt.appointment_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-[#777777]">location_on</span>
                          West Wing, Room 402
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link href={`/appointments/${appt.appointment_id}/reschedule`}>
                      <button className="hl-btn-outline text-xs px-4 py-2">Reschedule</button>
                    </Link>
                    <button
                      onClick={() => handleCancel(appt.appointment_id)}
                      disabled={cancellingId === appt.appointment_id}
                      className="text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {cancellingId === appt.appointment_id ? "Cancelling..." : "Cancel"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Appointment History ──────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2e7d32]" />
            <h2 className="text-sm font-bold text-black uppercase tracking-[0.05em]">Consultation History</h2>
            <span className="text-xs text-[#777777] font-medium">({allPast.length})</span>
          </div>

          {allPast.length === 0 ? (
            <div className="hl-card p-8 text-center">
              <span className="material-symbols-outlined text-[36px] text-[#c6c6c6] mb-2 block">history</span>
              <p className="text-sm text-[#777777]">No past appointment records found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allPast.map((appt) => (
                <div key={appt.appointment_id} className="hl-card p-6 flex items-center justify-between gap-6 opacity-90 hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-5">
                    <div className="bg-[#f3f3f4] rounded-2xl p-4 text-center min-w-[70px]">
                      <p className="text-xs font-semibold text-[#777777] uppercase">
                        {new Date(appt.appointment_date + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                      </p>
                      <p className="text-2xl font-bold text-black">
                        {new Date(appt.appointment_date + "T00:00:00").getDate()}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-black">{getDoctorDisplay(appt)}</h3>
                        <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${statusBadge(appt.portal_status)}`}>
                          {appt.portal_status}
                        </span>
                      </div>
                      <p className="text-xs text-[#777777] mt-0.5">{getSpecialization(appt)} • {appt.appointment_type}</p>
                      <p className="text-[11px] text-[#777777] mt-1">
                        Completed at {formatTime(appt.appointment_time)} • Duration: {appt.appointment_duration || 15} mins
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-[#777777] bg-[#f3f3f4] px-3 py-1.5 rounded-xl">
                    Archived
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
