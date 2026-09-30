"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const getTopbarTabs = (pathname: string) => {
  if (pathname.startsWith("/dashboard")) {
    return [
      { href: "/dashboard", label: "Dashboard" },
      { href: "#", label: "Records" },
      { href: "#", label: "Messages" },
    ]
  }
  if (pathname.startsWith("/booking")) {
    return [
      { href: "/dashboard", label: "Dashboard" },
      { href: "#", label: "Explore" },
      { href: "#", label: "History" },
    ]
  }
  if (pathname.startsWith("/appointments")) {
    if (pathname.includes("/reschedule")) {
      return [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/booking", label: "Booking" },
        { href: "/appointments", label: "My Appointments" },
      ]
    }
    return [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/appointments", label: "My Appointments" },
      { href: "/queue", label: "Live Queue" },
    ]
  }
  if (pathname.startsWith("/queue")) {
    return [
      { href: "/queue", label: "Live Queue" },
    ]
  }
  if (pathname.startsWith("/profile")) {
    return [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/booking", label: "Booking" },
      { href: "/queue", label: "Live Queue" },
      { href: "/profile", label: "Profile" },
    ]
  }
  return [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/appointments", label: "My Appointments" },
    { href: "/queue", label: "Live Queue" },
  ]
}

export default function Topbar() {
  const pathname = usePathname()
  const tabs = getTopbarTabs(pathname)

  return (
    <header className="h-[56px] bg-white/70 backdrop-blur-[20px] flex items-center justify-between px-8 sticky top-0 z-30" style={{ borderBottom: '1px solid rgba(198,198,198,0.15)' }}>
      {/* Left: Brand + tabs */}
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="text-sm font-bold text-black tracking-wide uppercase">
          HealthLink
        </Link>
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || (tab.href !== "/dashboard" && pathname.startsWith(tab.href + "/"))
            return (
              <Link
                key={tab.href + tab.label}
                href={tab.href}
                className={`
                  px-3 py-1.5 rounded-full text-xs transition-all duration-200 font-medium
                  ${isActive
                    ? "text-[#1a1c1c] font-semibold"
                    : "text-[#777777] hover:text-[#1a1c1c] hover:bg-[#eeeeee]"
                  }
                `}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Right: notification + settings + avatar */}
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-full hover:bg-[#eeeeee] flex items-center justify-center transition-colors">
          <span className="material-symbols-outlined text-[20px] text-[#474747]">notifications</span>
        </button>
        <button className="w-8 h-8 rounded-full hover:bg-[#eeeeee] flex items-center justify-center transition-colors">
          <span className="material-symbols-outlined text-[20px] text-[#474747]">settings</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e8e8e8] to-[#c6c6c6] flex items-center justify-center ring-2 ring-black/10">
          <span className="material-symbols-outlined text-[16px] text-[#474747]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
        </div>
      </div>
    </header>
  )
}
