import { create } from "zustand"
import type { QueuePosition, QueuePhase } from "@/types"

interface QueueState {
  position: number
  totalInQueue: number
  etaSeconds: number
  status: QueuePhase
  isConnected: boolean
  setQueueUpdate: (data: Partial<QueueState>) => void
  setConnected: (connected: boolean) => void
}

export const useQueueStore = create<QueueState>()((set) => ({
  position: 0,
  totalInQueue: 0,
  etaSeconds: 0,
  status: "waiting",
  isConnected: false,
  setQueueUpdate: (data) => set((state) => ({ ...state, ...data })),
  setConnected: (connected) => set({ isConnected: connected }),
}))
