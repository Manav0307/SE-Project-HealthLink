"use client"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import AuthGuard from "@/components/shared/AuthGuard"

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[#f9f9f9]">
        <Sidebar />
        <div className="flex-1 ml-[240px] flex flex-col">
          <Topbar />
          <main className="flex-1 px-10 py-8">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
