import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Slot, Appointment } from "@/types"

interface BookingState {
  selectedDate: Date | null
  selectedSlot: Slot | null
  lockId: string | null
  lockExpiresAt: Date | null
  // Local appointments storage (works offline/demo mode)
  localAppointments: Appointment[]
  setSelectedDate: (date: Date) => void
  setSelectedSlot: (slot: Slot | null) => void
  setLock: (lockId: string, expiresAt: Date) => void
  clearLock: () => void
  addLocalAppointment: (appt: Appointment) => void
  cancelLocalAppointment: (appointmentId: string) => void
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      selectedDate: null,
      selectedSlot: null,
      lockId: null,
      lockExpiresAt: null,
      localAppointments: [],
      setSelectedDate: (date) => set({ selectedDate: date }),
      setSelectedSlot: (slot) => set({ selectedSlot: slot }),
      setLock: (lockId, expiresAt) => set({ lockId, lockExpiresAt: expiresAt }),
      clearLock: () => set({ lockId: null, lockExpiresAt: null }),
      addLocalAppointment: (appt) =>
        set((state) => ({
          localAppointments: [appt, ...state.localAppointments],
        })),
      cancelLocalAppointment: (appointmentId) =>
        set((state) => ({
          localAppointments: state.localAppointments.map((a) =>
            a.appointment_id === appointmentId
              ? { ...a, portal_status: "cancelled" as const }
              : a
          ),
        })),
    }),
    { name: "healthlink-bookings" }
  )
)
