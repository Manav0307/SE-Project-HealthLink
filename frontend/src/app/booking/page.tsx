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

// Specialist Doctors matching database records
const DOCTORS = [
  { id: "D001", name: "Dr. Priya Sharma", specialization: "General Medicine" },
  { id: "D002", name: "Dr. Arjun Mehta", specialization: "Cardiology" },
  { id: "D003", name: "Dr. Neha Patel", specialization: "Dermatology" },
  { id: "D004", name: "Dr. Ravi Kumar", specialization: "Orthopedics" },
  { id: "D005", name: "Dr. Sunita Verma", specialization: "ENT Specialist" },
]

const APPOINTMENT_TYPES = [
  "General Consultation",
  "Routine Follow-up",
  "Health Checkup",
  "Specialist Consultation",
  "Vaccination",
]

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
  const [bookingError, setBookingError] = useState("")

  const calendarDays = getCalendarDays(currentYear, currentMonth)
  const selectedDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`

  // Fetch real available slots whenever selected date or doctor changes
  useEffect(() => {
    fetchSlots()
  }, [selectedDateStr, selectedDoctor.id])

  const fetchSlots = async () => {
    setLoadingSlots(true)
    setSelectedSlot(null)
    setBookingSuccess(false)
    setBookingError("")
    try {
      const { data } = await slotsApi.getAvailable(selectedDateStr, selectedDoctor.id)
      if (Array.isArray(data)) {
        setSlots(data)
        // Auto-select first slot that hasn't passed yet
        const firstBookable = data.find((s: Slot) => {
          const isToday =
            new Date().toDateString() === new Date(`${selectedDateStr}T00:00:00`).toDateString()
          if (!isToday) return true
          const [h, m] = s.appointment_time.split(":").map(Number)
          const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
          return h * 60 + m > nowMinutes
        })
        setSelectedSlot(firstBookable ?? null)
      } else {
        setSlots([])
      }
    } catch (err: any) {
      console.error("Error fetching slots:", err)
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleBooking = async () => {
    if (!selectedSlot || !patient) return
    setIsBooking(true)
    setBookingStep("reserving")
    setBookingError("")

    try {
      // 1. Reserve slot in database (15s lock)
      const { data: lock } = await slotsApi.reserve(selectedSlot.slot_id, patient.patient_id)
      setBookingStep("confirming")

      // 2. Confirm booking in database
      const { data: appt } = await slotsApi.confirm(
        lock.lock_id,
        selectedSlot.slot_id,
        patient.patient_id,
        appointmentType,
        selectedDoctor.id
      )

      // 3. Save to local store so appointment shows immediately across UI
      const confirmedAppt: Appointment = {
        ...appt,
        doctor: {
          doctor_id: selectedDoctor.id,
          name: selectedDoctor.name,
          specialization: selectedDoctor.specialization,
          rating: 4.9,
          profile_image_url: null,
          avg_session_duration_min: 15,
        },
      }
      addLocalAppointment(confirmedAppt)

      setBookingSuccess(true)

      // 4. Refetch database slots: the booked slot will be excluded from the database results!
      await fetchSlots()
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Booking failed. The slot may have just been taken."
      setBookingError(msg)
    } finally {
      setIsBooking(false)
      setBookingStep("idle")
    }
  }

  const formatTime = (time: string) => {
    if (!time) return ""
    const [h, m] = time.split(":").map(Number)
    const ampm = h >= 12 ? "PM" : "AM"
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`
  }

  // Returns true if this slot's time has already passed today
  const isSlotPast = (slot: Slot): boolean => {
    const isToday =
      currentYear === today.getFullYear() &&
      currentMonth === today.getMonth() &&
      selectedDate === today.getDate()
    if (!isToday) return false
    const [h, m] = slot.appointment_time.split(":").map(Number)
    const slotMinutes = h * 60 + m
    const nowMinutes = today.getHours() * 60 + today.getMinutes()
    return slotMinutes <= nowMinutes
  }

  const bookableSlots = slots.filter((s) => !isSlotPast(s))

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
              <p className="text-sm font-bold text-[#1b5e20]">Appointment Confirmed & Saved in Database!</p>
              <p className="text-xs text-[#2e7d32] mt-0.5">The slot has been reserved for you and removed from public availability.</p>
            </div>
            <button
              onClick={() => router.push("/appointments")}
              className="text-xs font-semibold text-[#1b5e20] bg-white px-4 py-2 rounded-xl hover:bg-[#f1f8e9] transition-colors"
            >
              View Appointments →
            </button>
          </div>
        )}

        {/* ── Error Banner ─────────────────────────── */}
        {bookingError && (
          <div className="bg-[#ffebee] border border-[#ffcdd2] rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
            <span className="material-symbols-outlined text-[#c62828] text-[20px]">error</span>
            <p className="text-xs font-medium text-[#c62828]">{bookingError}</p>
          </div>
        )}

        <div className="grid grid-cols-[1fr_1fr] gap-8">
          {/* ── Left: Calendar + Doctor + Type ─────────── */}
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
                    const isSelected = day === selectedDate
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
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#474747]">schedule</span>
                  <h2 className="text-sm font-bold text-black uppercase tracking-[0.05em]">2. Available Time Slots</h2>
                </div>
                <span className="text-xs text-[#777777] font-medium">
                  {bookableSlots.length} available
                </span>
              </div>

              {loadingSlots ? (
                <div className="hl-card p-8 text-center">
                  <div className="w-6 h-6 border-2 border-[#dadada] border-t-black rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-[#777777]">Querying database for open slots...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="hl-card p-8 text-center">
                  <span className="material-symbols-outlined text-[32px] text-[#c6c6c6] mb-2 block">event_busy</span>
                  <p className="text-sm font-semibold text-black">No open slots available</p>
                  <p className="text-xs text-[#777777] mt-1">All slots for {selectedDoctor.name} on this date are booked. Please choose another date or doctor.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.slot_id === slot.slot_id
                    const isPast = isSlotPast(slot)
                    return (
                      <button
                        key={slot.slot_id}
                        onClick={() => !isPast && setSelectedSlot(slot)}
                        disabled={isPast}
                        title={isPast ? "This time slot has already passed" : undefined}
                        className={`
                          text-left p-4 rounded-2xl transition-all duration-200
                          ${isPast
                            ? "bg-[#f3f3f4] opacity-40 cursor-not-allowed"
                            : isSelected
                              ? "bg-black text-white shadow-[0_2px_12px_rgba(0,0,0,0.2)] ring-2 ring-black"
                              : "bg-[#f3f3f4] hover:bg-[#e8e8e8]"
                          }
                        `}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className={`text-sm font-bold ${isSelected && !isPast ? "text-white" : "text-black"}`}>
                            {formatTime(slot.appointment_time)}
                          </p>
                          <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                            isPast
                              ? "bg-[#e8e8e8] text-[#aaaaaa]"
                              : isSelected
                                ? "bg-white text-black"
                                : "bg-[#e8f5e9] text-[#2e7d32]"
                          }`}>
                            {isPast ? "Passed" : "Available"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[14px] opacity-60">timer</span>
                          <p className={`text-xs ${isSelected && !isPast ? "text-white/80" : "text-[#777777]"}`}>
                            {slot.duration_min || 15} mins
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Summary + Confirm */}
            {selectedSlot && !isSlotPast(selectedSlot) && (
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
                </div>

                <button
                  onClick={handleBooking}
                  disabled={isBooking}
                  className="w-full bg-black text-white rounded-2xl py-4 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#3b3b3b] transition-all duration-200 disabled:opacity-50 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                >
                  {isBooking ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {bookingStep === "reserving" ? "Reserving in Database..." : "Confirming Appointment..."}
                    </span>
                  ) : (
                    <>
                      Confirm Appointment
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </section>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
