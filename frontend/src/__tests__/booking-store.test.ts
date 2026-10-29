import { describe, it, expect, beforeEach } from "vitest"
import { useBookingStore } from "../store/booking-store"
import type { Slot, Appointment } from "../types"

describe("Booking Store & Slot Lock Unit Tests", () => {
  beforeEach(() => {
    useBookingStore.setState({
      selectedDate: null,
      selectedSlot: null,
      lockId: null,
      lockExpiresAt: null,
      localAppointments: [],
    })
  })

  it("should set selected date and slot", () => {
    const testDate = new Date("2026-10-31")
    const testSlot: Slot = {
      slot_id: "SLOT00001",
      doctor_id: "D001",
      slot_date: "2026-10-31",
      start_time: "09:30:00",
      end_time: "09:45:00",
      status: "available",
      is_locked: false,
    }

    useBookingStore.getState().setSelectedDate(testDate)
    useBookingStore.getState().setSelectedSlot(testSlot)

    const state = useBookingStore.getState()
    expect(state.selectedDate).toEqual(testDate)
    expect(state.selectedSlot?.slot_id).toBe("SLOT00001")
    expect(state.selectedSlot?.start_time).toBe("09:30:00")
  })

  it("should store slot temporary lock ID and expiry", () => {
    const expiry = new Date(Date.now() + 15000) // 15s lock
    useBookingStore.getState().setLock("LOCK_12345", expiry)

    const state = useBookingStore.getState()
    expect(state.lockId).toBe("LOCK_12345")
    expect(state.lockExpiresAt).toEqual(expiry)
  })

  it("should clear slot lock correctly", () => {
    const expiry = new Date(Date.now() + 15000)
    useBookingStore.getState().setLock("LOCK_12345", expiry)
    useBookingStore.getState().clearLock()

    const state = useBookingStore.getState()
    expect(state.lockId).toBeNull()
    expect(state.lockExpiresAt).toBeNull()
  })

  it("should record confirmed appointment into local history", () => {
    const appt: Appointment = {
      appointment_id: "APT_TEST_01",
      slot_id: "SLOT00001",
      appointment_date: "2026-10-31",
      appointment_time: "09:30:00",
      portal_status: "upcoming",
      appointment_type: "General Consultation",
      reschedule_count: 0,
      waiting_time: null,
      appointment_duration: 15,
      doctor_id: "D001",
      summary_url: null,
    }

    useBookingStore.getState().addLocalAppointment(appt)
    const list = useBookingStore.getState().localAppointments
    expect(list.length).toBe(1)
    expect(list[0].appointment_id).toBe("APT_TEST_01")
    expect(list[0].portal_status).toBe("upcoming")
  })

  it("should update appointment status to cancelled on cancel", () => {
    const appt: Appointment = {
      appointment_id: "APT_CANCEL_ME",
      slot_id: "SLOT00002",
      appointment_date: "2026-11-01",
      appointment_time: "10:00:00",
      portal_status: "upcoming",
      appointment_type: "Routine Checkup",
      reschedule_count: 0,
      waiting_time: null,
      appointment_duration: 15,
      doctor_id: "D002",
      summary_url: null,
    }

    useBookingStore.getState().addLocalAppointment(appt)
    useBookingStore.getState().cancelLocalAppointment("APT_CANCEL_ME")

    const list = useBookingStore.getState().localAppointments
    const target = list.find((a) => a.appointment_id === "APT_CANCEL_ME")
    expect(target?.portal_status).toBe("cancelled")
  })
})

