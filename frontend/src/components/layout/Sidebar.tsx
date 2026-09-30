"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "grid_view" },
  { href: "/booking", label: "Booking", icon: "calendar_add_on" },
  { href: "/appointments", label: "My Appointments", icon: "event_note" },
  { href: "/queue", label: "Live Queue", icon: "hourglass_empty" },
  { href: "/profile", label: "Profile", icon: "account_circle" },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-[#f9f9f9] flex flex-col z-40">
      {/* Header */}
      <div className="px-6 pt-7 pb-1">
        <p className="hl-label mb-1">Welcome Back</p>
        <h2 className="text-sm font-bold text-black tracking-wide">Clinical Portal</h2>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 pt-6 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 group
                ${isActive
                  ? "bg-black text-white font-medium shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
                  : "text-[#474747] hover:bg-[#eeeeee] hover:text-[#1a1c1c]"
                }
              `}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="uppercase text-[11px] tracking-[0.06em] font-semibold">{item.label}</span>
              {isActive && (
                <span className="ml-auto text-white/60">
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Book CTA */}
      <div className="px-4 pb-3">
        <Link
          href="/booking"
          className="hl-btn-primary w-full text-xs py-2.5 uppercase tracking-[0.1em] font-bold"
        >
          Book New Appointment
        </Link>
      </div>

      {/* Bottom Nav */}
      <div className="px-3 pb-5 flex flex-col gap-0.5">
        <Link
          href="#"
          className="flex items-center gap-3 px-4 py-2 rounded-xl text-[11px] uppercase tracking-[0.06em] font-semibold text-[#777777] hover:bg-[#eeeeee] hover:text-[#1a1c1c] transition-all duration-200"
        >
          <span className="material-symbols-outlined text-[18px]">help_outline</span>
          Support
        </Link>
      </div>
    </aside>
  )
}

