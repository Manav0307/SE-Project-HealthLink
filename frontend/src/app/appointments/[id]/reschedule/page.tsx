"use client"
import AppShell from "@/components/layout/AppShell"
import { useState } from "react"
import Link from "next/link"

const suggestedSlots = [
  {
    id: "current",
    date: "Tue, Jan 24",
    time: "2:00 PM",
    waitTime: "45–60 min",
    traffic: "Peak Volume",
    isCurrent: true,
    isBest: false,
    description: "",
  },
  {
    id: "slot-1",
    date: "Wed, Jan 25",
    time: "9:15 AM",
    waitTime: "5–10m Wait",
    description: "Predicted wait time is 85% lower than your current slot.",
    isBest: true,
    isCurrent: false,
  },
  {
    id: "slot-2",
    date: "Thu, Jan 26",
    time: "11:30 AM",
    waitTime: "15–20m Wait",
    description: "Standard morning flow. Consistent and predictable throughput.",
    isBest: false,
    isCurrent: false,
  },
  {
    id: "slot-3",
    date: "Mon, Jan 30",
    time: "3:45 PM",
    waitTime: "20–25m Wait",
    description: "End of day slot. Reduced likelihood of clinical delays.",
    isBest: false,
    isCurrent: false,
  },
]

export default function ReschedulePage() {
  const [selectedSlot, setSelectedSlot] = useState("slot-1")

  const currentSlot = suggestedSlots.find(s => s.isCurrent)!
  const alternativeSlots = suggestedSlots.filter(s => !s.isCurrent)

  return (
    <AppShell>
      <div className="animate-fade-in space-y-8 max-w-5xl">
        {/* ── Back Link ────────────────────────────────── */}
        <Link href="/appointments" className="flex items-center gap-1 text-xs text-[#777777] hover:text-[#1a1c1c] transition-colors font-medium uppercase tracking-[0.05em]">
          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          Return to Appointment Details
        </Link>

        {/* ── Header ──────────────────────────────────── */}
        <div>
          <h1 className="text-4xl font-black tracking-[-0.02em] text-black">Reschedule Appointment</h1>
          <p className="text-sm text-[#474747] mt-2 leading-relaxed max-w-2xl">
            Optimization Engine: We&apos;ve analyzed clinic traffic to suggest times with the lowest waiting room impact for your visit.
          </p>
        </div>

        <div className="grid grid-cols-[1fr_300px] gap-8">
          {/* ── Left Column ───────────────────────────────── */}
          <div className="space-y-6">
            <div className="grid grid-cols-[280px_1fr] gap-6">
              {/* Current Slot */}
              <div className="space-y-4">
                <section className="hl-card p-6">
                  <p className="hl-section-title mb-4">Current Slot</p>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#f3f3f4] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px] text-[#474747]">calendar_today</span>
                    </div>
                    <div>
                      <p className="text-base font-bold text-black">{currentSlot.date}</p>
                      <p className="text-sm text-[#474747]">at {currentSlot.time}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4 pt-4 border-t border-[#eeeeee]">
                    <div className="flex items-center justify-between">
                      <span className="hl-label">Est. Wait Time</span>
                      <span className="text-xs font-bold text-[#ba1a1a]">{currentSlot.waitTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="hl-label">Clinic Traffic</span>
                      <span className="text-[10px] bg-[#ffdad6] text-[#ba1a1a] px-2 py-0.5 rounded-full font-bold">{currentSlot.traffic}</span>
                    </div>
                  </div>
                </section>

                {/* Clinic Image Card */}
                <div className="hl-card-dark p-5 rounded-[2rem] relative overflow-hidden min-h-[160px] flex flex-col justify-end">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-[#555] to-[#333] opacity-60" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-[#777] to-[#555] opacity-40" />
                  <p className="text-[10px] uppercase tracking-[0.1em] text-white/60 font-bold relative z-10">Clinic</p>
                  <p className="text-xs font-bold text-white bg-white/10 rounded-full px-3 py-1 inline-block relative z-10 mt-2 self-start">
                    North Medical Plaza
                  </p>
                </div>
              </div>

              {/* Recommended Alternatives */}
              <div>
                <p className="hl-section-title mb-4">Recommended Alternatives</p>
                <div className="space-y-3">
                  {alternativeSlots.map((slot) => {
                    const isSelected = selectedSlot === slot.id
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot.id)}
                        className={`
                          w-full text-left p-5 rounded-[1.5rem] transition-all duration-300 relative
                          ${isSelected
                            ? "bg-white ring-2 ring-black shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                            : "bg-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
                          }
                        `}
                        style={{ boxShadow: !isSelected ? '0 2px 8px rgba(0, 0, 0, 0.04)' : undefined }}
                      >
                        {slot.isBest && (
                          <span className="absolute top-3 right-3 bg-black text-white text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">arrow_back</span>
                            Best Choice
                          </span>
                        )}
                        <p className="text-lg font-black text-black">{slot.date}</p>
                        <p className="text-sm text-[#474747] font-medium">at {slot.time}</p>

                        {/* Wait bar */}
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 h-1 bg-[#eeeeee] rounded-full overflow-hidden">
                            <div className="h-full bg-black rounded-full" style={{ width: slot.isBest ? '15%' : slot.id === 'slot-2' ? '35%' : '45%' }} />
                          </div>
                          <span className="text-xs font-semibold text-[#474747] whitespace-nowrap">{slot.waitTime}</span>
                        </div>

                        <p className="text-xs text-[#777777] mt-2 leading-relaxed">{slot.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Manual Selection */}
            <div className="grid grid-cols-[1fr_1fr] gap-4">
              <div />
              <div className="rounded-[1.5rem] border-2 border-dashed border-[#c6c6c6] p-5 flex flex-col items-center justify-center text-center hover:border-[#777777] transition-colors cursor-pointer group">
                <span className="material-symbols-outlined text-[28px] text-[#c6c6c6] group-hover:text-[#474747] transition-colors mb-2">calendar_month</span>
                <p className="text-sm font-bold text-[#474747]">Manual Selection</p>
                <p className="hl-label mt-1">Browse All Availability</p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-[#777777] max-w-sm">
                Rescheduling will release your current slot immediately to other patients.
              </p>
              <div className="flex gap-3">
                <Link href="/appointments" className="hl-btn-outline text-xs px-6 py-3">Keep Current</Link>
                <button className="hl-btn-primary text-xs px-6 py-3">Confirm New Slot</button>
              </div>
            </div>
          </div>

          {/* ── Right Panel ───────────────────────────── */}
          <div className="space-y-6">
            {/* Doctor */}
            <div className="hl-card p-6">
              <p className="hl-section-title mb-4">Assigned Specialist</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#e8e8e8] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px] text-[#474747]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                </div>
                <div>
                  <p className="text-base font-bold text-black">Dr. Elena Kostic</p>
                  <p className="hl-label">Cardiology</p>
                </div>
              </div>
            </div>

            {/* Visit Type */}
            <div className="hl-card p-6">
              <p className="hl-section-title mb-4">Visit Type</p>
              <p className="text-base font-bold text-black mb-1">Follow-up Consultation</p>
              <p className="text-xs text-[#777777] leading-relaxed">
                Comprehensive review of recent test results and medication adjustment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
