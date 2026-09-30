"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Directly replace to dashboard since login is bypassed
    router.replace("/dashboard")
  }, [router])

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-[#1a1c1c] flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            emergency
          </span>
        </div>
        <div className="w-6 h-6 border-2 border-[#dadada] border-t-[#1a1c1c] rounded-full animate-spin" />
      </div>
    </div>
  )
}
