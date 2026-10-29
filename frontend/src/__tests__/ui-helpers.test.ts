import { describe, it, expect } from "vitest"

// Exact helper functions from appointments/page.tsx, profile/page.tsx, and booking/page.tsx
function formatTime(time: string) {
  if (!time) return ""
  const [h, m] = time.split(":").map(Number)
  if (isNaN(h) || isNaN(m)) return time
  const ampm = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("")
}

function statusBadge(status: string) {
  switch (status) {
    case "upcoming":
      return "bg-[#e3f2fd] text-[#1565c0]"
    case "completed":
      return "bg-[#e8f5e9] text-[#2e7d32]"
    case "missed":
      return "bg-[#fce4ec] text-[#c62828]"
    case "cancelled":
      return "bg-[#f3f3f4] text-[#777777]"
    default:
      return "bg-[#f3f3f4] text-[#777777]"
  }
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay + 6) % 7 // Monday-based offset
  const weeks: number[][] = []
  let currentWeek: number[] = new Array(startOffset).fill(0)

  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(0)
    weeks.push(currentWeek)
  }
  return weeks
}

describe("UI Formatters & Calendar Calculations", () => {
  describe("formatTime()", () => {
    it("should format morning time into 12-hour AM format", () => {
      expect(formatTime("09:30:00")).toBe("09:30 AM")
      expect(formatTime("08:00:00")).toBe("08:00 AM")
    })

    it("should format afternoon and evening times into 12-hour PM format", () => {
      expect(formatTime("14:30:00")).toBe("02:30 PM")
      expect(formatTime("12:00:00")).toBe("12:00 PM")
      expect(formatTime("23:15:00")).toBe("11:15 PM")
    })

    it("should handle empty or invalid strings gracefully", () => {
      expect(formatTime("")).toBe("")
      expect(formatTime("invalid")).toBe("invalid")
    })
  })

  describe("getInitials()", () => {
    it("should generate two-letter uppercase initials for names", () => {
      expect(getInitials("Alex Morgan")).toBe("AM")
      expect(getInitials("Dr. Priya Sharma")).toBe("DP")
      expect(getInitials("Elena")).toBe("E")
    })
  })

  describe("statusBadge()", () => {
    it("should return the right CSS classes for appointment statuses", () => {
      expect(statusBadge("upcoming")).toContain("#1565c0")
      expect(statusBadge("completed")).toContain("#2e7d32")
      expect(statusBadge("missed")).toContain("#c62828")
      expect(statusBadge("cancelled")).toContain("#777777")
    })
  })

  describe("getCalendarDays()", () => {
    it("should generate 7-column calendar grids for booking view", () => {
      // October 2026: 31 days
      const weeks = getCalendarDays(2026, 9)
      expect(weeks.length).toBeGreaterThanOrEqual(4)
      for (const week of weeks) {
        expect(week.length).toBe(7)
      }
      // Must contain day 1 and day 31
      const allDays = weeks.flat()
      expect(allDays).toContain(1)
      expect(allDays).toContain(31)
    })
  })
})

