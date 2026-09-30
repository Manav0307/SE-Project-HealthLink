"use client"
import AppShell from "@/components/layout/AppShell"
import { useState, useEffect } from "react"
import { useAuthStore } from "@/store/auth-store"
import { useBookingStore } from "@/store/booking-store"
import { queueApi } from "@/lib/api"
import type { QueueStatus } from "@/types"

export default function QueuePage() {
  const { patient } = useAuthStore()
  const { localAppointments } = useBookingStore()
  const [clinicStatus, setClinicStatus] = useState<QueueStatus | null>(null)
  const [loading, setLoading] = useState(true)

  // Count upcoming local appointments to affect queue numbers
  const upcomingCount = localAppointments.filter((a) => a.portal_status === "upcoming").length
  // Compute average wait based on bookings
  const baseWait = 5
  const perPatientWait = 3.5
  const computedWait = Math.round(baseWait + upcomingCount * perPatientWait)
  const computedTraffic: "low" | "medium" | "peak" =
    upcomingCount <= 2 ? "low" : upcomingCount <= 5 ? "medium" : "peak"

  useEffect(() => {
    fetchQueueData()
    const interval = setInterval(fetchQueueData, 15000)
    return () => clearInterval(interval)
  }, [patient?.patient_id, upcomingCount])

  const fetchQueueData = async () => {
    try {
      const statusRes = await queueApi.getStatus("clinic_01")
      // Merge API data with local booking impact
      const apiData = statusRes.data as QueueStatus
      setClinicStatus({
        ...apiData,
        total_waiting: (apiData.total_waiting || 0) + upcomingCount,
        avg_wait_min: Math.max(apiData.avg_wait_min || 0, computedWait),
        traffic_level: upcomingCount > 3 ? computedTraffic : apiData.traffic_level,
      })
    } catch {
      // Demo fallback using local booking data
      setClinicStatus({
        clinic_id: "clinic_01",
        active_session: upcomingCount > 0,
        total_waiting: upcomingCount,
        avg_wait_min: computedWait,
        delay_reasons: upcomingCount > 4
          ? ["High appointment volume", "Extended consultation sessions"]
          : upcomingCount > 2
            ? ["Moderate patient flow"]
            : [],
        traffic_level: computedTraffic,
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="animate-fade-in flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#dadada] border-t-black rounded-full animate-spin mx-auto mb-4" />
            <p className="hl-label">Loading queue status...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  const totalWaiting = clinicStatus?.total_waiting ?? upcomingCount
  const avgWait = clinicStatus?.avg_wait_min ?? computedWait
  const trafficLevel = clinicStatus?.traffic_level ?? computedTraffic
  const delayReasons = clinicStatus?.delay_reasons ?? []

  // Get today's appointments for the "Your Appointments Today" section
  const todayStr = new Date().toISOString().split("T")[0]
  const todaysAppointments = localAppointments.filter(
    (a) => a.portal_status === "upcoming"
  )

  const formatTime = (time: string) => {
    if (!time) return ""
    const [h, m] = time.split(":").map(Number)
    if (isNaN(h) || isNaN(m)) return time
    const ampm = h >= 12 ? "PM" : "AM"
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`
  }

  return (
    <AppShell>
      <div className="animate-fade-in space-y-8 max-w-5xl">
        <div className="grid grid-cols-[1fr_340px] gap-8">
          {/* ── Queue Status Hero ──────────────────────── */}
          <section className="glass-card p-10 text-center">
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                trafficLevel === "peak" ? "bg-[#ffdad6]" :
                trafficLevel === "medium" ? "bg-[#fff3e0]" :
                "bg-[#e8f5e9]"
              }`}>
                <span className={`material-symbols-outlined text-[32px] ${
                  trafficLevel === "peak" ? "text-[#ba1a1a]" :
                  trafficLevel === "medium" ? "text-[#e65100]" :
                  "text-[#2e7d32]"
                }`}>hourglass_empty</span>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-black tracking-tight mb-2">Clinic Queue</h1>
            <p className="text-sm text-[#777777] mb-6">
              {totalWaiting > 0
                ? `${totalWaiting} patient${totalWaiting !== 1 ? "s" : ""} currently in the queue`
                : "No patients currently waiting"}
            </p>

            <div className="flex gap-6 justify-center mb-6">
              <div className="bg-[#f3f3f4] rounded-2xl px-8 py-5 text-center min-w-[140px]">
                <p className="text-4xl font-bold text-black tracking-tight">{totalWaiting}</p>
                <p className="hl-label mt-1">Patients Waiting</p>
              </div>
              <div className="bg-[#f3f3f4] rounded-2xl px-8 py-5 text-center min-w-[140px]">
                <p className="text-4xl font-bold text-black tracking-tight">{avgWait}</p>
                <p className="hl-label mt-1">Avg Wait (min)</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full animate-pulse-soft ${
                trafficLevel === "peak" ? "bg-[#ba1a1a]" :
                trafficLevel === "medium" ? "bg-[#e65100]" :
                "bg-[#2e7d32]"
              }`} />
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${
                trafficLevel === "peak" ? "bg-[#ffdad6] text-[#ba1a1a]" :
                trafficLevel === "medium" ? "bg-[#fff3e0] text-[#e65100]" :
                "bg-[#e8f5e9] text-[#2e7d32]"
              }`}>
                {trafficLevel} traffic
              </span>
            </div>

            {/* Live Queue Bar Visualization */}
            {totalWaiting > 0 && (
              <div className="mt-8 max-w-md mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-[0.05em] text-[#777777] font-semibold">Queue Load</span>
                  <span className="text-[10px] uppercase tracking-[0.05em] text-[#777777] font-semibold">{Math.min(totalWaiting * 10, 100)}%</span>
                </div>
                <div className="h-3 bg-[#eeeeee] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      trafficLevel === "peak" ? "bg-[#ba1a1a]" :
                      trafficLevel === "medium" ? "bg-[#e65100]" :
                      "bg-[#2e7d32]"
                    }`}
                    style={{ width: `${Math.min(totalWaiting * 10, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </section>

          {/* ── Right sidebar ─────────────────────────────── */}
          <div className="space-y-6">
            {/* Current Status */}
            <section className="hl-card p-6">
              <h3 className="hl-section-title mb-5">Current Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${totalWaiting > 0 ? "bg-black animate-pulse-soft" : "bg-[#c6c6c6]"}`} />
                    <span className="text-sm font-medium text-[#1a1c1c]">Active Session</span>
                  </div>
                  <span className={totalWaiting > 0 ? "hl-badge-in-progress" : "hl-badge-waiting"}>
                    {totalWaiting > 0 ? "In Progress" : "None"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#c6c6c6]" />
                    <span className="text-sm font-medium text-[#1a1c1c]">Waiting</span>
                  </div>
                  <span className="hl-badge-waiting">{totalWaiting} patients</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#c6c6c6]" />
                    <span className="text-sm font-medium text-[#1a1c1c]">Est. Wait</span>
                  </div>
                  <span className="hl-badge-waiting">{avgWait} min</span>
                </div>
              </div>
            </section>

            {/* Why the wait? */}
            <section className="hl-card p-6">
              <h3 className="hl-section-title mb-5">Why the Wait?</h3>
              <div className="space-y-4">
                {delayReasons.length > 0 ? delayReasons.map((reason, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#e65100]">
                      {i === 0 ? "bar_chart" : "medical_services"}
                    </span>
                    <p className="text-sm text-[#1a1c1c]">{reason}</p>
                  </div>
                )) : (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#2e7d32]">check_circle</span>
                    <p className="text-sm text-[#777777]">No significant delays at this time</p>
                  </div>
                )}
              </div>
            </section>

            {/* Your Upcoming Appointments Affecting Queue */}
            {todaysAppointments.length > 0 && (
              <section className="hl-card p-6">
                <h3 className="hl-section-title mb-4">Your Appointments</h3>
                <div className="space-y-3">
                  {todaysAppointments.slice(0, 4).map((appt) => (
                    <div key={appt.appointment_id} className="flex items-center gap-3 bg-[#f3f3f4] rounded-xl px-3 py-2.5">
                      <span className="material-symbols-outlined text-[16px] text-[#474747]">event</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1a1c1c] truncate">{appt.appointment_type}</p>
                        <p className="text-[10px] text-[#777777]">{formatTime(appt.appointment_time)}</p>
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-[#1565c0] bg-[#e3f2fd] px-2 py-0.5 rounded-full">
                        Upcoming
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* ── Info Cards ──────────────────────────────── */}
        <div className="grid grid-cols-3 gap-6">
          {[
            {
              icon: "verified",
              title: "Priority Care",
              desc: "Your insurance pre-approval is verified and active.",
              action: "View Details",
              dark: false,
            },
            {
              icon: "chat",
              title: "Need Assistance?",
              desc: "Message the front desk if you need to step out briefly.",
              action: "Contact Desk",
              dark: false,
            },
            {
              icon: "auto_awesome",
              title: "Digital Prep",
              desc: "Complete your intake form while you wait to save 5 minutes.",
              action: "Start Form",
              dark: true,
            },
          ].map((card, i) => (
            <div
              key={i}
              className={`${card.dark ? 'hl-card-dark' : 'hl-card'} p-6 group hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer flex flex-col`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${card.dark ? 'bg-white/10' : 'bg-[#f3f3f4] group-hover:bg-[#e8e8e8]'} transition-colors`}>
                <span className={`material-symbols-outlined text-[20px] ${card.dark ? 'text-white' : 'text-[#474747]'}`}>{card.icon}</span>
              </div>
              <p className={`text-sm font-bold mb-1 ${card.dark ? 'text-white' : 'text-black'}`}>{card.title}</p>
              <p className={`text-xs leading-relaxed flex-1 ${card.dark ? 'text-white/60' : 'text-[#777777]'}`}>{card.desc}</p>
              <button className={`mt-4 text-xs font-semibold uppercase tracking-[0.05em] ${card.dark ? 'text-white border-white/30' : 'text-[#1a1c1c]'} border-b pb-0.5 hover:opacity-70 transition-opacity self-start`}>
                {card.action}
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
