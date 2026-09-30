"use client"
import AppShell from "@/components/layout/AppShell"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { useBookingStore } from "@/store/booking-store"
import { appointmentsApi } from "@/lib/api"
import type { Appointment } from "@/types"

export default function AppointmentsPage() {
  const { patient } = useAuthStore()
  const { localAppointments, cancelLocalAppointment } = useBookingStore()
  const [apiUpcoming, setApiUpcoming] = useState<Appointment[]>([])
  const [apiPast, setApiPast] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAppointments()
  }, [patient?.patient_id])

  const fetchAppointments = async () => {
    if (!patient?.patient_id) return
    try {
      setLoading(true)
      const [upRes, compRes, missedRes] = await Promise.all([
        appointmentsApi.list("upcoming"),
        appointmentsApi.list("completed"),
        appointmentsApi.list("missed"),
      ])
      setApiUpcoming(upRes.data)
      setApiPast([...compRes.data, ...missedRes.data])
    } catch {
      // API unavailable — will use local data only
      setApiUpcoming([])
      setApiPast([])
    } finally {
      setLoading(false)
    }
  }

  // Merge local + API appointments, local ones first
  const allUpcoming = [
    ...localAppointments.filter((a) => a.portal_status === "upcoming"),
    ...apiUpcoming.filter(
      (a) => !localAppointments.some((la) => la.appointment_id === a.appointment_id)
    ),
  ]

  const allPast = [
    ...localAppointments.filter((a) => a.portal_status === "completed" || a.portal_status === "missed" || a.portal_status === "cancelled"),
    ...apiPast.filter(
      (a) => !localAppointments.some((la) => la.appointment_id === a.appointment_id)
    ),
  ]

  const handleCancel = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return
    setCancellingId(appointmentId)
    try {
      // Try API cancel
      await appointmentsApi.cancel(appointmentId, "Patient requested cancellation")
    } catch {
      // Fallback: cancel locally
    }
    cancelLocalAppointment(appointmentId)
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
    if (appt.doctor_id) return `Doctor ${appt.doctor_id}`
    return "Specialist"
  }

  const getSpecialization = (appt: Appointment) => {
    return appt.doctor?.specialization || ""
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
            <p className="hl-label">Loading appointments...</p>
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

        {/* ── Stats ───────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Upcoming", value: allUpcoming.length, icon: "event_upcoming", color: "text-[#1565c0]" },
            { label: "Completed", value: allPast.filter((a) => a.portal_status === "completed").length, icon: "check_circle", color: "text-[#2e7d32]" },
            { label: "Cancelled", value: allPast.filter((a) => a.portal_status === "cancelled").length, icon: "cancel", color: "text-[#777777]" },
            { label: "Total", value: allUpcoming.length + allPast.length, icon: "event_note", color: "text-black" },
          ].map((stat) => (
            <div key={stat.label} className="hl-card p-4 text-center">
              <span className={`material-symbols-outlined text-[24px] ${stat.color} mb-1 block`}>{stat.icon}</span>
              <p className="text-2xl font-bold text-black">{stat.value}</p>
              <p className="hl-label mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Upcoming Journey ─────────────────────────── */}
        <section>
          <h2 className="hl-section-title mb-5">Upcoming Appointments</h2>
          {allUpcoming.length > 0 ? (
            <div className="grid grid-cols-2 gap-6">
              {allUpcoming.map((appt, i) => (
                <div
                  key={appt.appointment_id}
                  className="hl-card p-6 group hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#e8e8e8] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[24px] text-[#474747]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                    </div>
                    <span className={`text-[9px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${statusBadge("upcoming")}`}>
                      Upcoming
                    </span>
                  </div>

                  <p className="text-xs text-[#777777] font-semibold uppercase tracking-[0.05em] mb-1">{getDoctorDisplay(appt)}</p>
                  {getSpecialization(appt) && (
                    <p className="text-[10px] text-[#999] mb-1">{getSpecialization(appt)}</p>
                  )}
                  <h3 className="text-lg font-bold text-black mb-3">{appt.appointment_type}</h3>

                  <div className="flex items-center gap-4 text-xs text-[#777777]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      {formatDate(appt.appointment_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {formatTime(appt.appointment_time)}
                    </span>
                  </div>

                  {(appt.waiting_time !== null || appt.appointment_duration !== null) && (
                    <div className="flex gap-4 mt-3 text-xs">
                      {appt.waiting_time !== null && (
                        <span className="text-[#777777]">
                          Est. Wait: <span className="font-semibold text-[#1a1c1c]">{Math.round(appt.waiting_time)} min</span>
                        </span>
                      )}
                      {appt.appointment_duration !== null && (
                        <span className="text-[#777777]">
                          Duration: <span className="font-semibold text-[#1a1c1c]">{Math.round(appt.appointment_duration)} min</span>
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => handleCancel(appt.appointment_id)}
                      disabled={cancellingId === appt.appointment_id}
                      className="text-xs text-[#777777] hover:text-[#ba1a1a] transition-colors px-4 py-2 rounded-full hover:bg-[#ffdad6]/30 font-medium uppercase tracking-[0.03em] disabled:opacity-50"
                    >
                      {cancellingId === appt.appointment_id ? "Cancelling..." : "Cancel"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="hl-card p-8 text-center">
              <span className="material-symbols-outlined text-[48px] text-[#c6c6c6] mb-3 block">event_available</span>
              <p className="text-sm text-[#777777] mb-4">No upcoming appointments</p>
              <Link href="/booking" className="hl-btn-primary text-xs px-5 py-2.5">Book Appointment</Link>
            </div>
          )}
        </section>

        {/* ── Clinical History / Past ─────────────────── */}
        <section>
          <h2 className="hl-section-title mb-5">Clinical History</h2>
          {allPast.length > 0 ? (
            <div className="grid grid-cols-3 gap-6">
              {allPast.map((appt) => (
                <div key={appt.appointment_id} className="hl-card p-6 group hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#f3f3f4] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[24px] text-[#777777]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                    </div>
                    <span className={`text-[9px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${statusBadge(appt.portal_status)}`}>
                      {appt.portal_status === "completed" ? "Completed" : appt.portal_status === "cancelled" ? "Cancelled" : "Missed"}
                    </span>
                  </div>

                  <p className="hl-label mb-1">{getDoctorDisplay(appt)}</p>
                  <h3 className="text-base font-bold text-[#474747] mb-2">{appt.appointment_type}</h3>

                  <div className="flex items-center gap-1 text-xs text-[#777777]">
                    <span className="material-symbols-outlined text-[14px]">
                      {appt.portal_status === "completed" ? "check_circle" : appt.portal_status === "cancelled" ? "cancel" : "warning"}
                    </span>
                    {formatDate(appt.appointment_date)} • {formatTime(appt.appointment_time)}
                  </div>

                  <div className="mt-4">
                    {appt.portal_status === "completed" ? (
                      <button className="hl-btn-outline text-xs px-4 py-2 w-full">View Summary</button>
                    ) : appt.portal_status === "cancelled" ? (
                      <Link href="/booking" className="hl-btn-outline text-xs px-4 py-2 w-full text-center block">
                        Rebook
                      </Link>
                    ) : (
                      <Link href="/booking" className="hl-btn-outline text-xs px-4 py-2 w-full text-center block">
                        Rebook Now
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="hl-card p-6 text-center">
              <p className="text-xs text-[#777777]">No past appointments yet</p>
            </div>
          )}

          {/* Schedule New Care CTA */}
          <Link
            href="/booking"
            className="rounded-[2rem] border-2 border-dashed border-[#c6c6c6] p-6 flex items-center justify-center text-center hover:border-[#777777] hover:bg-white/50 transition-all duration-300 cursor-pointer group mt-6"
          >
            <div>
              <span className="material-symbols-outlined text-[32px] text-[#c6c6c6] group-hover:text-[#474747] transition-colors mb-2 block">add</span>
              <p className="hl-section-title mb-1">Schedule New Care</p>
              <p className="text-xs text-[#777777]">Find a specialist and book your next consultation</p>
            </div>
          </Link>
        </section>
      </div>
    </AppShell>
  )
}
