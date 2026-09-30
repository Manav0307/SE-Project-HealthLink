"use client"
import AppShell from "@/components/layout/AppShell"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { dashboardApi } from "@/lib/api"
import type { DashboardSummary } from "@/types"

// Demo patient used when no real auth session exists
const DEMO_PATIENT = {
  patient_id: "00001",
  name: "Demo User",
  sex: "M",
  gender: "Male",
  age: 28,
  dob: "1998-01-15",
  insurance: "HealthPlus Gold",
  email: "demo@healthlink.app",
  blood_type: "O+",
  emergency_contact: "+1 555-0100",
  active_status: "Active",
  reliability_grade: "A",
  punctuality_score: 92.5,
  avg_wait_time_min: 8.3,
  two_fa_enabled: false,
  biometric_enabled: false,
  primary_doctor_id: "D001",
}

export default function DashboardPage() {
  const { patient: authPatient } = useAuthStore()
  const patient = authPatient ?? DEMO_PATIENT
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // No auth guard — dashboard is always accessible

  useEffect(() => {
    if (!patient?.patient_id) return
    const fetchData = async () => {
      try {
        setLoading(true)
        const { data } = await dashboardApi.getSummary(patient.patient_id)
        setSummary(data)
      } catch (err: any) {
        // If backend is unreachable, use demo data so the UI renders
        const isNetworkError = err.code === "ERR_NETWORK" || err.code === "ECONNABORTED"
        if (isNetworkError || err.response?.status === 500 || err.response?.status === 404) {
          setSummary({
            patient_name: patient.name,
            upcoming_appointment: {
              appointment_id: "APT-001",
              appointment_date: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
              appointment_time: "09:45:00",
              doctor_name: "Dr. Priya Sharma",
              appointment_type: "General Consultation",
              location: "Room 204 - Block B",
            },
            clinic_status: {
              total_ahead: 12,
              total_in_queue: 18,
              traffic_level: "medium" as const,
            },
            unread_alerts: [
              { notification_id: "N1", title: "Appointment Reminder", message: "Your next appointment is in 2 days", is_read: false },
              { notification_id: "N2", title: "Lab Results Ready", message: "Your blood work results are available", is_read: false },
              { notification_id: "N3", title: "Insurance Update", message: "Your HealthPlus Gold plan has been renewed", is_read: true },
            ],
            health_metric_snapshot: {
              heart_rate_variability: 68,
              resting_metabolism: 1720,
              sleep_quality_score: 82,
            },
          })
        } else {
          setError(err.response?.data?.detail || err.message || "Failed to load dashboard")
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [patient?.patient_id])



  if (loading) {
    return (
      <AppShell>
        <div className="animate-fade-in flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#dadada] border-t-black rounded-full animate-spin mx-auto mb-4" />
            <p className="hl-label">Loading dashboard...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="animate-fade-in flex items-center justify-center h-[60vh]">
          <div className="text-center max-w-md">
            <span className="material-symbols-outlined text-[48px] text-[#ba1a1a] mb-4 block">error</span>
            <p className="text-sm font-semibold text-[#ba1a1a] mb-2">Dashboard Error</p>
            <p className="text-xs text-[#777777]">{error}</p>
            <button onClick={() => window.location.reload()} className="hl-btn-primary text-xs mt-4">
              Retry
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  const upcoming = summary?.upcoming_appointment
  const clinic = summary?.clinic_status
  const alerts = summary?.unread_alerts || []
  const metrics = summary?.health_metric_snapshot || {}

  // Map metric keys to display info
  const metricDisplayMap: Record<string, { label: string; unit: string; icon: string }> = {
    heart_rate_variability: { label: "Heart Rate Variability", unit: "ms", icon: "favorite" },
    resting_metabolism: { label: "Resting Metabolism", unit: "kcal", icon: "local_fire_department" },
    sleep_quality_score: { label: "Sleep Quality Score", unit: "/100", icon: "bedtime" },
  }

  // Map alert icons
  const alertIcons = ["bolt", "sync", "mail", "notifications", "info"]

  // Format time from HH:MM:SS to 09:45 AM
  const formatTime = (timeStr: string) => {
    if (!timeStr) return { time: "--:--", ampm: "" }
    const [h, m] = timeStr.split(":").map(Number)
    if (isNaN(h) || isNaN(m)) return { time: "--:--", ampm: "" }
    const ampm = h >= 12 ? "PM" : "AM"
    const hour = h % 12 || 12
    return { time: `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`, ampm }
  }

  // Format date from YYYY-MM-DD to "Tuesday, Oct 24"
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const d = new Date(dateStr + "T00:00:00")
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
  }

  // Safely split doctor name into first/last parts for display
  const splitDoctorName = (name?: string) => {
    if (!name || name.trim().length === 0) return { first: "Dr.", last: "Specialist" }
    const parts = name.trim().split(" ")
    if (parts.length === 1) return { first: parts[0], last: "" }
    return { first: parts.slice(0, -1).join(" "), last: parts.slice(-1)[0] }
  }

  const timeFormatted = upcoming ? formatTime(upcoming.appointment_time) : null
  const doctorName = upcoming ? splitDoctorName(upcoming.doctor_name) : null

  return (
    <AppShell>
      <div className="animate-fade-in space-y-8">
        <div className="grid grid-cols-[1fr_340px] gap-8">
          {/* ── Upcoming Appointment Hero ────────────────── */}
          <section className="glass-card p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-[#e8e8e8]/40 to-transparent rounded-bl-[100%] pointer-events-none" />
            <p className="hl-section-title mb-5 relative z-10">Upcoming Appointment</p>

            {upcoming ? (
              <>
                <div className="flex items-start justify-between relative z-10">
                  <div className="space-y-4">
                    <h1 className="text-4xl font-bold tracking-[-0.02em] text-black leading-tight">
                      {doctorName?.first}
                      {doctorName?.last && <><br />{doctorName.last}</>}
                    </h1>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#474747]">{formatDate(upcoming.appointment_date)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-black tracking-tight">{timeFormatted?.time}</p>
                    <p className="text-sm text-[#474747] font-medium">{timeFormatted?.ampm}</p>
                  </div>
                </div>

                <div className="flex gap-10 mt-6 relative z-10">
                  <div>
                    <p className="hl-label mb-1">Procedure</p>
                    <p className="text-sm font-semibold text-[#1a1c1c]">{upcoming.appointment_type || "General Consultation"}</p>
                  </div>
                  <div>
                    <p className="hl-label mb-1">Location</p>
                    <p className="text-sm font-semibold text-[#1a1c1c]">{upcoming.location || "Clinic"}</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 relative z-10">
                  <Link href={`/appointments/${upcoming.appointment_id}/reschedule`}>
                    <button className="hl-btn-outline text-xs px-5 py-2.5">Reschedule</button>
                  </Link>
                  <Link href="/queue">
                    <button className="hl-btn-primary text-xs px-5 py-2.5">Pre-Checkin</button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="relative z-10 py-8 text-center">
                <span className="material-symbols-outlined text-[48px] text-[#c6c6c6] mb-3 block">calendar_today</span>
                <p className="text-sm text-[#777777]">No upcoming appointments</p>
                <Link href="/booking" className="hl-btn-primary text-xs px-5 py-2.5 mt-4 inline-flex">
                  Book Now
                </Link>
              </div>
            )}
          </section>

          {/* ── Right Column: Live Clinic + Quick Actions ── */}
          <div className="space-y-6">
            {/* Live Clinic Status */}
            <section className="hl-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-black animate-pulse-soft" />
                <p className="hl-section-title">Live Clinic Status</p>
              </div>
              <div className="flex gap-6 justify-center">
                <div className="bg-[#f3f3f4] rounded-2xl px-6 py-4 text-center min-w-[100px]">
                  <p className="text-3xl font-bold text-black tracking-tight">{clinic?.total_ahead ?? 0}</p>
                  <p className="hl-label mt-1">Wait Mins</p>
                </div>
                <div className="bg-[#f3f3f4] rounded-2xl px-6 py-4 text-center min-w-[100px]">
                  <p className="text-3xl font-bold text-black tracking-tight">
                    {String(clinic?.total_in_queue ?? 0).padStart(2, "0")}
                  </p>
                  <p className="hl-label mt-1">In Queue</p>
                </div>
              </div>
              {clinic?.traffic_level && (
                <div className="text-center mt-3">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${
                    clinic.traffic_level === "peak" ? "bg-[#ffdad6] text-[#ba1a1a]" :
                    clinic.traffic_level === "medium" ? "bg-[#fff3e0] text-[#e65100]" :
                    "bg-[#e8f5e9] text-[#2e7d32]"
                  }`}>
                    {clinic.traffic_level} traffic
                  </span>
                </div>
              )}
              <Link href="/queue" className="hl-btn-outline w-full mt-5 text-xs py-2.5 uppercase tracking-[0.06em] font-semibold">
                Enter Live Queue
              </Link>
            </section>

            {/* Quick Actions */}
            <section className="hl-card-dark p-6">
              <p className="text-[10px] uppercase tracking-[0.05em] text-[#c6c6c6] font-semibold mb-4">Quick Actions</p>
              <div className="space-y-2">
                {[
                  { label: "Book Appointment", icon: "arrow_forward", href: "/booking" },
                  { label: "View Appointments", icon: "event_note", href: "/appointments" },
                  { label: "My Profile", icon: "account_circle", href: "/profile" },
                ].map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition-all duration-200 text-sm text-white font-medium"
                  >
                    {action.label}
                    <span className="material-symbols-outlined text-[18px] text-white/60">{action.icon}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* ── Recent Alerts ─────────────────────────── */}
          <section className="hl-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="hl-section-title">Recent Alerts</h3>
              <button className="text-[10px] uppercase tracking-[0.05em] text-[#777777] font-medium hover:text-[#1a1c1c] transition-colors">
                Mark All Read
              </button>
            </div>
            <div className="space-y-5">
              {alerts.length > 0 ? alerts.map((alert, i) => (
                <div key={alert.notification_id} className="flex items-start gap-4 group cursor-pointer p-3 -mx-3 rounded-xl hover:bg-[#f3f3f4] transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[#f3f3f4] flex items-center justify-center shrink-0 group-hover:bg-[#e8e8e8] transition-colors">
                    <span className="material-symbols-outlined text-[20px] text-[#474747]">
                      {alertIcons[i % alertIcons.length]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1a1c1c]">{alert.title}</p>
                    <p className="text-xs text-[#777777] mt-0.5 leading-relaxed">{alert.message}</p>
                  </div>
                  {!alert.is_read && (
                    <span className="w-2 h-2 rounded-full bg-black mt-2 shrink-0" />
                  )}
                </div>
              )) : (
                <div className="text-center py-6">
                  <span className="material-symbols-outlined text-[32px] text-[#c6c6c6] mb-2 block">notifications_off</span>
                  <p className="text-xs text-[#777777]">No new alerts</p>
                </div>
              )}
            </div>
          </section>

          {/* ── Health Metrics Overview ────────────────── */}
          <section className="hl-card p-8">
            <h3 className="hl-section-title mb-6">Health Metrics Overview</h3>
            <div className="space-y-0">
              {Object.entries(metrics).map(([key, value], i) => {
                const display = metricDisplayMap[key] || { label: key, unit: "", icon: "monitoring" }
                return (
                  <div key={key} className="flex items-center justify-between group cursor-pointer rounded-xl py-4 px-3 -mx-3 hover:bg-[#f3f3f4] transition-colors">
                    <div className="flex items-center gap-2">
                      <p className="hl-label">{display.label}</p>
                    </div>
                    <p className="text-2xl font-bold text-black tracking-tight">
                      {typeof value === "number" ? value.toLocaleString() : value}
                      <span className="text-sm font-medium text-[#777777] ml-0.5">{display.unit}</span>
                    </p>
                  </div>
                )
              })}
              {Object.keys(metrics).length === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs text-[#777777]">No health metrics available</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
