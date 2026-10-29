import { describe, it, expect } from "vitest"
import { useQueueStore } from "../store/queue-store"

// Exact logic used in frontend/src/app/queue/page.tsx
function computeQueueWaitTime(upcomingCount: number) {
  const baseWait = 5
  const perPatientWait = 3.5
  return Math.round(baseWait + upcomingCount * perPatientWait)
}

function computeTrafficLevel(upcomingCount: number): "low" | "medium" | "peak" {
  if (upcomingCount <= 2) return "low"
  if (upcomingCount <= 5) return "medium"
  return "peak"
}

describe("Queue & Clinic Flow Calculation Tests", () => {
  it("should calculate baseline wait time when no upcoming bookings exist", () => {
    const wait = computeQueueWaitTime(0)
    expect(wait).toBe(5) // 5 minutes base wait
  })

  it("should scale wait time correctly as bookings increase", () => {
    // 3 upcoming appointments: 5 + (3 * 3.5) = 15.5 -> rounded to 16
    const wait = computeQueueWaitTime(3)
    expect(wait).toBe(16)
  })

  it("should classify traffic levels appropriately", () => {
    expect(computeTrafficLevel(1)).toBe("low")
    expect(computeTrafficLevel(2)).toBe("low")
    expect(computeTrafficLevel(3)).toBe("medium")
    expect(computeTrafficLevel(5)).toBe("medium")
    expect(computeTrafficLevel(8)).toBe("peak")
  })

  it("should update queue store with live socket event payload", () => {
    useQueueStore.getState().setQueueUpdate({
      position: 3,
      totalInQueue: 7,
      etaSeconds: 420,
      status: "consulting",
    })

    const state = useQueueStore.getState()
    expect(state.position).toBe(3)
    expect(state.totalInQueue).toBe(7)
    expect(state.etaSeconds).toBe(420)
    expect(state.status).toBe("consulting")
  })

  it("should track connection state", () => {
    useQueueStore.getState().setConnected(true)
    expect(useQueueStore.getState().isConnected).toBe(true)

    useQueueStore.getState().setConnected(false)
    expect(useQueueStore.getState().isConnected).toBe(false)
  })
})

