/**
 * useSlotReservation — manages 15-second slot lock countdown
 * Handles reserve → confirm flow with optimistic locking
 */
"use client"
import { useState, useEffect, useCallback } from "react"
import { useBookingStore } from "@/store/booking-store"
import { slotsApi } from "@/lib/api"
import { toast } from "sonner"
import type { Slot } from "@/types"

export function useSlotReservation() {
  const { lockId, lockExpiresAt, setLock, clearLock, setSelectedSlot } = useBookingStore()
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isReserving, setIsReserving] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (!lockExpiresAt) return
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((lockExpiresAt.getTime() - Date.now()) / 1000))
      setTimeRemaining(remaining)
      if (remaining === 0) {
        clearLock()
        setSelectedSlot(null)
        toast.error("Slot lock expired. Please select another slot.")
        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockExpiresAt])

  const reserveSlot = useCallback(async (slot: Slot, patientId: string) => {
    setIsReserving(true)
    try {
      const { data } = await slotsApi.reserve(slot.slot_id, patientId)
      setSelectedSlot(slot)
      setLock(data.lock_id, new Date(data.lock_expires_at))
      return data
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to reserve slot"
      toast.error(msg)
      throw err
    } finally {
      setIsReserving(false)
    }
  }, [])

  const confirmSlot = useCallback(async (patientId: string, appointmentType: string, doctorId?: string) => {
    if (!lockId) throw new Error("No active lock")
    setIsConfirming(true)
    try {
      const { data } = await slotsApi.confirm(lockId, patientId, appointmentType, doctorId)
      clearLock()
      toast.success("Appointment confirmed! Confirmation sent to your email.")
      return data
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to confirm booking")
      throw err
    } finally {
      setIsConfirming(false)
    }
  }, [lockId])

  return { timeRemaining, isReserving, isConfirming, reserveSlot, confirmSlot, hasLock: !!lockId }
}
