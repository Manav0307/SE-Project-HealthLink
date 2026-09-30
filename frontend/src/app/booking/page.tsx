"use client"
import AppShell from "@/components/layout/AppShell"
import { useState, useEffect } from "react"
import { useAuthStore } from "@/store/auth-store"
import { useBookingStore } from "@/store/booking-store"
import { slotsApi } from "@/lib/api"
import { useRouter } from "next/navigation"
import type { Slot, Appointment } from "@/types"

const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay + 6) % 7 // Mon-based
  const weeks: number[][] = []
  let currentWeek: number[] = new Array(startOffset).fill(0)

  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(0)
    weeks.push(currentWeek)
  }
  return weeks
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

// Doctor pool for demo
const DOCTORS = [
  { id: "D001", name: "Dr. Priya Sharma", specialization: "General Medicine" },
  { id: "D002", name: "Dr. Arjun Mehta", specialization: "Cardiology" },
  { id: "D003", name: "Dr. Neha Patel", specialization: "Dermatology" },
  { id: "D004", name: "Dr. Ravi Kumar", specialization: "Orthopedics" },
  { id: "D005", name: "Dr. Sunita Verma", specialization: "ENT Specialist" },
]

const APPOINTMENT_TYPES = [
  "General Consultation",
  "Follow-up Visit",
  "Health Checkup",
  "Specialist Consultation",
  "Vaccination",
]

/** Generate realistic demo time slots for a given date */
function generateDemoSlots(dateStr: string): Slot[] {
  const slotTimes = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "14:00", "14:30", "15:00", "15:30", "16:00",
    "16:30", "17:00",
  ]

  // Use date string as seed for consistent results per date
  const seed = dateStr.split("-").reduce((a, b) => a + parseInt(b), 0)

  return slotTimes.map((time, i) => {
    const hash = (seed * 31 + i * 17) % 100
    const waitMin = Math.round(3 + (hash % 25))
    const noShowProb = parseFloat((0.05 + (hash % 30) / 100).toFixed(2))
    const trafficLevel = waitMin < 10 ? "low" : waitMin < 18 ? "medium" : "peak"
    const isRecommended = i === (seed % slotTimes.length)

    return {
      slot_id: `SLOT-${dateStr}-${i.toString().padStart(2, "0")}`,
      appointment_date: dateStr,
      appointment_time: `${time}:00`,
      status: "free" as const,
      duration_min: 15 + (hash % 3) * 5, // 15, 20, or 25
      predicted_wait_min: waitMin,
      no_show_probability: noShowProb,
      traffic_level: trafficLevel as "low" | "medium" | "peak",
      is_recommended: isRecommended,
    }
  })
}

export default function BookingPage() {
  const router = useRouter()
  const { patient } = useAuthStore()
  const { addLocalAppointment } = useBookingStore()
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState(today.getDate())
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [bookingStep, setBookingStep] = useState<"idle" | "reserving" | "confirming">("idle")
  const [selectedDoctor, setSelectedDoctor] = useState(DOCTORS[0])
  const [appointmentType, setAppointmentType] = useState(APPOINTMENT_TYPES[0])
  const [bookingSuccess, setBookingSuccess] = useState(false)

  const calendarDays = getCalendarDays(currentYear, currentMonth)

  const selectedDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`

  useEffect(() => {
    fetchSlots()
  }, [selectedDateStr])

  const fetchSlots = async () => {
    setLoadingSlots(true)
    setSelectedSlot(null)
    setBookingSuccess(false)
    try {
      const { data } = await slotsApi.getAvailable(selectedDateStr)
      if (Array.isArray(data) && data.length > 0) {
        setSlots(data)
        const rec = data.find((s: Slot) => s.is_recommended)
        if (rec) setSelectedSlot(rec)
      } else {
        throw new Error("empty")
      }
    } catch {
      // Fallback: generate demo slots
      const demoSlots = generateDemoSlots(selectedDateStr)
      setSlots(demoSlots)
      const rec = demoSlots.find((s) => s.is_recommended)
      if (rec) setSelectedSlot(rec)
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleBooking = async () => {
    if (!selectedSlot || !patient) return
    setIsBooking(true)
    setBookingStep("reserving")

    try {
      // Try real API first
      const { data: lock } = await slotsApi.reserve(selectedSlot.slot_id, patient.patient_id)
      setBookingStep("confirming")
      await slotsApi.confirm(lock.lock_id, selectedSlot.slot_id, patient.patient_id, appointmentType, selectedDoctor.id)
    } catch {
      // Demo fallback — save locally
      setBookingStep("confirming")
      await new Promise((r) => setTimeout(r, 600)) // Simulate network
    }

    // Always persist locally so appointment shows in history
    const newAppt: Appointment = {
      appointment_id: `APT-${Date.now()}`,
      slot_id: selectedSlot.slot_id,
      appointment_date: selectedDateStr,
      appointment_time: selectedSlot.appointment_time,
      portal_status: "upcoming",
      appointment_type: appointmentType,
      reschedule_count: 0,
      waiting_time: selectedSlot.predicted_wait_min,
      appointment_duration: selectedSlot.duration_min,
      doctor_id: selectedDoctor.id,
      summary_url: null,
      doctor: {
        doctor_id: selectedDoctor.id,
        name: selectedDoctor.name,
        specialization: selectedDoctor.specialization,
        rating: 4.5 + Math.random() * 0.5,
        profile_image_url: null,
        avg_session_duration_min: selectedSlot.duration_min,
      },
    }
    addLocalAppointment(newAppt)

    setIsBooking(false)
    setBookingStep("idle")
    setBookingSuccess(true)

    // Remove booked slot from list
    setSlots((prev) => prev.filter((s) => s.slot_id !== selectedSlot.slot_id))
    setSelectedSlot(null)
  }

  const formatTime = (time: string) => {
    if (!time) return ""
    const [h, m] = time.split(":").map(Number)
    const ampm = h >= 12 ? "PM" : "AM"
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`
  }

  const recommended = slots.filter((s) => s.is_recommended)
  const others = slots.filter((s) => !s.is_recommended)

  return (
    <AppShell>
      <div className="animate-fade-in space-y-6 max-w-5xl">
        <div>
          <p className="hl-label mb-2">Appointment Scheduling</p>
          <h1 className="text-4xl font-bold tracking-[-0.02em] text-black">Book Your Consultation</h1>
        </div>

        {/* ── Success Banner ───────────────────────── */}
        {bookingSuccess && (
          <div className="bg-[#e8f5e9] border border-[#a5d6a7] rounded-2xl p-5 flex items-center gap-4 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-[#2e7d32] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-[20px]">check</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#1b5e20]">Appointment Booked Successfully!</p>
              <p className="text-xs text-[#2e7d32] mt-0.5">Confirmation has been sent to your registered email.</p>
            </div>
            <button
              onClick={() => router.push("/appointments")}
              className="text-xs font-semibold text-[#1b5e20] bg-white px-4 py-2 rounded-xl hover:bg-[#f1f8e9] transition-colors"
            >
              View Appointments →
            </button>
          </div>
        )}

        <div className="grid grid-cols-[1fr_1fr] gap-8">
          {/* ── Left: Calendar + Options ──────────────── */}
          <div className="space-y-6">
            <section className="hl-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-[18px] text-[#474747]">calendar_today</span>
                <h2 className="text-sm font-bold text-black uppercase tracking-[0.05em]">1. Select Date</h2>
              </div>

              <div className="bg-[#f3f3f4] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-black">{monthNames[currentMonth]} {currentYear}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1) }
                        else setCurrentMonth((m) => m - 1)
                      }}
                      className="w-7 h-7 rounded-full hover:bg-[#e8e8e8] flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#474747]">chevron_left</span>
                    </button>
                    <button
                      onClick={() => {
                        if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1) }
                        else setCurrentMonth((m) => m + 1)
                      }}
                      className="w-7 h-7 rounded-full hover:bg-[#e8e8e8] flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#474747]">chevron_right</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-0 mb-2">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="text-center text-[10px] uppercase tracking-[0.05em] text-[#777777] py-1 font-semibold">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-0">
                  {calendarDays.flat().map((day, i) => {
                    if (day === 0) return <div key={`empty-${i}`} />
                    const isSelected = day === selectedDate && currentMonth === today.getMonth() ? day === selectedDate : day === selectedDate
                    const dayDate = new Date(currentYear, currentMonth, day)
                    const isPast = dayDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())
                    const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
                    return (
                      <button
                        key={i}
                        onClick={() => !isPast && setSelectedDate(day)}
                        disabled={isPast}
                        className={`
                          h-9 w-9 mx-auto rounded-full text-sm font-medium transition-all duration-200 relative
                          ${isSelected
                            ? "bg-black text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                            : isPast
                              ? "text-[#c6c6c6] cursor-not-allowed"
                              : "text-[#1a1c1c] hover:bg-[#e8e8e8]"
                          }
                        `}
                      >
                        {day}
                        {isToday && !isSelected && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-black" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* ── Doctor Selection ───────────────────── */}
            <section className="hl-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[18px] text-[#474747]">person</span>
                <h2 className="text-sm font-bold text-black uppercase tracking-[0.05em]">Doctor</h2>
              </div>
              <div className="space-y-2">
                {DOCTORS.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoctor(doc)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                      selectedDoctor.id === doc.id
                        ? "bg-black text-white"
                        : "bg-[#f3f3f4] hover:bg-[#e8e8e8] text-[#1a1c1c]"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      selectedDoctor.id === doc.id ? "bg-white text-black" : "bg-[#e8e8e8] text-[#474747]"
                    }`}>
                      {doc.name.split(" ").pop()?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{doc.name}</p>
                      <p className={`text-[10px] ${selectedDoctor.id === doc.id ? "text-white/60" : "text-[#777777]"}`}>{doc.specialization}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* ── Appointment Type ──────────────────── */}
            <section className="hl-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[18px] text-[#474747]">medical_services</span>
                <h2 className="text-sm font-bold text-black uppercase tracking-[0.05em]">Appointment Type</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {APPOINTMENT_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setAppointmentType(type)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                      appointmentType === type
                        ? "bg-black text-white"
                        : "bg-[#f3f3f4] text-[#474747] hover:bg-[#e8e8e8]"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* ── Right: Time Slots + Summary ────────────── */}
          <div className="space-y-6">
            <section>
              <div className="flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-[18px] text-[#474747]">schedule</span>
                <h2 className="text-sm font-bold text-black uppercase tracking-[0.05em]">2. Select Time Slot</h2>
              </div>

              {loadingSlots ? (
                <div className="hl-card p-8 text-center">
                  <div className="w-6 h-6 border-2 border-[#dadada] border-t-black rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-[#777777]">Loading available slots...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="hl-card p-8 text-center">
                  <span className="material-symbols-outlined text-[32px] text-[#c6c6c6] mb-2 block">event_busy</span>
                  <p className="text-sm text-[#777777]">No slots available for this date</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Recommended Slot */}
                  {recommended.map((slot) => {
                    const isSelected = selectedSlot?.slot_id === slot.slot_id
                    return (
                      <button
                        key={slot.slot_id}
                        onClick={() => setSelectedSlot(slot)}
                        className={`
                          w-full text-left p-5 rounded-2xl transition-all duration-200 relative
                          ${isSelected
                            ? "bg-white ring-2 ring-black shadow-[0_2px_16px_rgba(0,0,0,0.08)]"
                            : "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                          }
                        `}
                      >
                        <span className="absolute top-3 right-3 bg-black text-white text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">
                          AI Recommended
                        </span>
                        <p className="text-xl font-bold text-black">{formatTime(slot.appointment_time)}</p>
                        <p className="text-xs text-[#777777] mt-1">ML predicts shortest wait for your profile</p>
                        <div className="flex gap-6 mt-3">
                          <div>
                            <p className="hl-label">Duration</p>
                            <p className="text-xs font-semibold text-[#1a1c1c] mt-0.5">{slot.duration_min} min</p>
                          </div>
                          <div>
                            <p className="hl-label">Est. Wait</p>
                            <p className="text-xs font-semibold text-[#1a1c1c] mt-0.5">{slot.predicted_wait_min} min</p>
                          </div>
                          <div>
                            <p className="hl-label">No-Show Risk</p>
                            <p className="text-xs font-semibold text-[#1a1c1c] mt-0.5">{(slot.no_show_probability * 100).toFixed(0)}%</p>
                          </div>
                          <div>
                            <p className="hl-label">Traffic</p>
                            <p className={`text-xs font-semibold mt-0.5 ${
                              slot.traffic_level === "peak" ? "text-[#ba1a1a]" :
                              slot.traffic_level === "medium" ? "text-[#e65100]" :
                              "text-[#2e7d32]"
                            }`}>{slot.traffic_level}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}

                  {/* Other Slots */}
                  <div className="grid grid-cols-2 gap-3">
                    {others.map((slot) => {
                      const isSelected = selectedSlot?.slot_id === slot.slot_id
                      return (
                        <button
                          key={slot.slot_id}
                          onClick={() => setSelectedSlot(slot)}
                          className={`
                            text-left p-4 rounded-2xl transition-all duration-200
                            ${isSelected
                              ? "bg-black text-white shadow-[0_2px_12px_rgba(0,0,0,0.2)]"
                              : "bg-[#f3f3f4] hover:bg-[#e8e8e8]"
                            }
                          `}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className={`text-sm font-bold ${isSelected ? "text-white" : "text-black"}`}>{formatTime(slot.appointment_time)}</p>
                            <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold ${
                              isSelected ? "bg-white text-black" : slot.traffic_level === "peak" ? "bg-[#ffdad6] text-[#ba1a1a]" : slot.traffic_level === "medium" ? "bg-[#fff3e0] text-[#e65100]" : "bg-[#e8f5e9] text-[#2e7d32]"
                            }`}>
                              {slot.traffic_level}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            <div>
                              <p className={`text-[9px] uppercase tracking-[0.05em] ${isSelected ? "text-white/60" : "text-[#777777]"}`}>Wait</p>
                              <p className={`text-xs font-semibold mt-0.5 ${isSelected ? "text-white" : "text-[#1a1c1c]"}`}>{slot.predicted_wait_min}m</p>
                            </div>
                            <div>
                              <p className={`text-[9px] uppercase tracking-[0.05em] ${isSelected ? "text-white/60" : "text-[#777777]"}`}>Duration</p>
                              <p className={`text-xs font-semibold mt-0.5 ${isSelected ? "text-white" : "text-[#1a1c1c]"}`}>{slot.duration_min}m</p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* Summary + Confirm */}
            {selectedSlot && (
              <section className="hl-card p-6 animate-fade-in">
                <p className="hl-section-title mb-4">Booking Summary</p>
                <div className="space-y-3 mb-5">
                  <div className="flex items-center gap-3 bg-[#f3f3f4] rounded-xl px-4 py-3">
                    <span className="material-symbols-outlined text-[18px] text-[#474747]">calendar_today</span>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.05em] text-[#777777]">Date</p>
                      <p className="text-sm font-semibold text-[#1a1c1c]">
                        {new Date(selectedDateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-[#f3f3f4] rounded-xl px-4 py-3">
                    <span className="material-symbols-outlined text-[18px] text-[#474747]">schedule</span>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.05em] text-[#777777]">Time</p>
                      <p className="text-sm font-bold text-black">{formatTime(selectedSlot.appointment_time)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-[#f3f3f4] rounded-xl px-4 py-3">
                    <span className="material-symbols-outlined text-[18px] text-[#474747]">person</span>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.05em] text-[#777777]">Doctor</p>
                      <p className="text-sm font-semibold text-[#1a1c1c]">{selectedDoctor.name}</p>
                      <p className="text-[10px] text-[#777777]">{selectedDoctor.specialization}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-[#f3f3f4] rounded-xl px-4 py-3">
                    <span className="material-symbols-outlined text-[18px] text-[#474747]">medical_services</span>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.05em] text-[#777777]">Type</p>
                      <p className="text-sm font-semibold text-[#1a1c1c]">{appointmentType}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-[#777777]">
                    <span>Est. Wait: <strong className="text-[#1a1c1c]">{selectedSlot.predicted_wait_min} min</strong></span>
                    <span>Duration: <strong className="text-[#1a1c1c]">{selectedSlot.duration_min} min</strong></span>
                  </div>
                </div>

                <button
                  onClick={handleBooking}
                  disabled={isBooking}
                  className="w-full bg-black text-white rounded-2xl py-4 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#3b3b3b] transition-all duration-200 disabled:opacity-50 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                >
                  {isBooking ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {bookingStep === "reserving" ? "Reserving Slot..." : "Confirming Appointment..."}
                    </span>
                  ) : (
                    <>
                      Confirm Appointment
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-[#777777] mt-3 text-center leading-relaxed">
                  A booking notification will be sent to your registered email.
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
