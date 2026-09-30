/**
 * useQueueSocket — WebSocket hook for Live Queue page
 * Connects to Socket.io server, handles reconnection, updates Zustand store.
 * 
 * Reconnect strategy: exponential backoff (1s → 2s → 4s → max 30s)
 */
"use client"
import { useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { useQueueStore } from "@/store/queue-store"
import { useAuthStore } from "@/store/auth-store"
import { toast } from "sonner"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8000"

export function useQueueSocket(clinicId: string) {
  const socketRef = useRef<Socket | null>(null)
  const { setQueueUpdate, setConnected } = useQueueStore()
  const { accessToken } = useAuthStore()
  const reconnectAttempts = useRef(0)

  useEffect(() => {
    const connect = () => {
      const socket = io(`${WS_URL}/ws`, {
        auth: { token: accessToken },
        reconnection: false, // Manual reconnect with backoff
        transports: ["websocket"],
      })

      socket.on("connect", () => {
        reconnectAttempts.current = 0
        setConnected(true)
        socket.emit("join_queue", { clinic_id: clinicId })
      })

      socket.on("queue:position", (data) => {
        setQueueUpdate({
          position: data.position,
          totalInQueue: data.total,
          etaSeconds: data.eta_seconds,
          status: data.status,
        })
      })

      socket.on("queue:called", () => {
        toast.success("Your turn! Please proceed to the consultation room.")
        setQueueUpdate({ status: "called" })
      })

      socket.on("queue:delay", (data) => {
        toast.info(`Queue delay: ${data.reason} (+${data.extra_wait_min} min)`)
      })

      socket.on("disconnect", () => {
        setConnected(false)
        // Exponential backoff reconnect
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
        reconnectAttempts.current++
        setTimeout(connect, delay)
      })

      socketRef.current = socket
    }

    if (accessToken) connect()

    return () => {
      socketRef.current?.disconnect()
    }
  }, [clinicId, accessToken])

  return {
    isConnected: useQueueStore((s) => s.isConnected),
    position: useQueueStore((s) => s.position),
    etaSeconds: useQueueStore((s) => s.etaSeconds),
    status: useQueueStore((s) => s.status),
  }
}
