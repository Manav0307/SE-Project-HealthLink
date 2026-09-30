"use client"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  // Auth logic removed as we are removing the dummy login page
  return <>{children}</>
}
