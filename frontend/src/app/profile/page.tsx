"use client"
import AppShell from "@/components/layout/AppShell"
import { useState, useEffect } from "react"
import { useAuthStore } from "@/store/auth-store"
import { useBookingStore } from "@/store/booking-store"
import { patientsApi, appointmentsApi } from "@/lib/api"
import type { BehaviorInsights, Appointment } from "@/types"

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"]

export default function ProfilePage() {
  const { patient, updatePatient } = useAuthStore()
  const { localAppointments } = useBookingStore()
  const [insights, setInsights] = useState<BehaviorInsights | null>(null)
  const [history, setHistory] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [twoFa, setTwoFa] = useState(patient?.two_fa_enabled ?? false)
  const [biometric, setBiometric] = useState(patient?.biometric_enabled ?? false)

  // Editable fields
  const [editName, setEditName] = useState(patient?.name ?? "")
  const [editEmail, setEditEmail] = useState(patient?.email ?? "")
  const [editGender, setEditGender] = useState(patient?.gender ?? patient?.sex ?? "")
  const [editAge, setEditAge] = useState<string>(patient?.age?.toString() ?? "")
  const [editEmergency, setEditEmergency] = useState(patient?.emergency_contact ?? "")
  const [editBloodType, setEditBloodType] = useState(patient?.blood_type ?? "")
  const [editInsurance, setEditInsurance] = useState(patient?.insurance ?? "")

  useEffect(() => {
    fetchData()
  }, [patient?.patient_id])

  const fetchData = async () => {
    if (!patient?.patient_id) return
    try {
      setLoading(true)
      const [insightsRes, historyRes] = await Promise.all([
        patientsApi.getBehaviorInsights(patient.patient_id),
        appointmentsApi.list("completed"),
      ])
      setInsights(insightsRes.data)
      setHistory(historyRes.data.slice(0, 5))
    } catch {
      // Demo fallback
      const totalLocal = localAppointments.length
      setInsights({
        avg_wait_time_min: patient.avg_wait_time_min || 8.3,
        punctuality_score: patient.punctuality_score || 92.5,
        reliability_grade: patient.reliability_grade || "A",
        reliability_percentile: 85,
        total_appointments: totalLocal || 0,
        no_show_count: 0,
      })
      // Show completed local appointments as history
      setHistory(
        localAppointments
          .filter((a) => a.portal_status === "completed")
          .slice(0, 5)
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!patient?.patient_id) return
    setSaving(true)
    setSaveSuccess(false)

    const updatedFields = {
      name: editName,
      email: editEmail,
      gender: editGender,
      sex: editGender === "Male" ? "M" : editGender === "Female" ? "F" : editGender,
      age: editAge ? parseInt(editAge) : null,
      emergency_contact: editEmergency,
      blood_type: editBloodType,
      insurance: editInsurance,
    }

    try {
      // Try API first
      const { data } = await patientsApi.updatePersonalInfo(patient.patient_id, updatedFields)
      updatePatient(data)
    } catch {
      // Fallback: save locally
      updatePatient(updatedFields)
    }

    setSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const formatDob = (dateStr: string | null) => {
    if (!dateStr) return "—"
    const d = new Date(dateStr + "T00:00:00")
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("")
  }

  if (loading) {
    return (
      <AppShell>
        <div className="animate-fade-in flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#dadada] border-t-black rounded-full animate-spin mx-auto mb-4" />
            <p className="hl-label">Loading profile...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="animate-fade-in space-y-8 max-w-5xl">
        {/* ── Profile Header ──────────────────────────── */}
        <section className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-3xl bg-black flex items-center justify-center shrink-0">
            <span className="text-2xl font-black text-white tracking-tight">
              {getInitials(patient?.name || "U")}
            </span>
          </div>
          <div className="flex-1">
            <p className="hl-label mb-1">Patient Record #{patient?.patient_id || "—"}</p>
            <h1 className="text-4xl font-black tracking-[-0.02em] text-black leading-tight">
              {patient?.name || "—"}
            </h1>
            <div className="flex items-center gap-6 mt-3 flex-wrap">
              {patient?.gender && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#777777]">wc</span>
                  <span className="text-sm text-[#474747] font-medium">{patient.gender}</span>
                </div>
              )}
              {patient?.age && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#777777]">cake</span>
                  <span className="text-sm text-[#474747] font-medium">{patient.age} years</span>
                </div>
              )}
              {patient?.email && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#777777]">mail</span>
                  <span className="text-sm text-[#474747] font-medium">{patient.email}</span>
                </div>
              )}
              {patient?.blood_type && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#777777]">water_drop</span>
                  <span className="text-sm text-[#474747] font-medium">{patient.blood_type}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Quick Stats Row ─────────────────────────── */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Avg Wait", value: `${insights?.avg_wait_time_min?.toFixed(1) ?? "0"}m`, icon: "timer" },
            { label: "Punctuality", value: `${insights?.punctuality_score?.toFixed(0) ?? "0"}%`, icon: "schedule" },
            { label: "Appointments", value: `${insights?.total_appointments ?? localAppointments.length}`, icon: "event_note" },
            { label: "No-Shows", value: `${insights?.no_show_count ?? 0}`, icon: "event_busy" },
            { label: "Reliability", value: insights?.reliability_grade ?? patient?.reliability_grade ?? "—", icon: "verified" },
          ].map((stat) => (
            <div key={stat.label} className="hl-card p-4 text-center">
              <span className="material-symbols-outlined text-[20px] text-[#474747] mb-1 block">{stat.icon}</span>
              <p className="text-xl font-bold text-black">{stat.value}</p>
              <p className="hl-label mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Edit Profile + Security ────────────────── */}
        <div className="grid grid-cols-[1fr_380px] gap-6">
          {/* Personal Information — Editable */}
          <section className="hl-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="hl-section-title">Personal Information</h3>
              {saveSuccess && (
                <span className="text-xs text-[#2e7d32] font-semibold flex items-center gap-1 animate-fade-in">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Saved successfully
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              {/* Full Name */}
              <div>
                <label className="hl-label block mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-[#f3f3f4] rounded-xl px-4 py-3 text-sm font-medium text-[#1a1c1c] placeholder:text-[#c6c6c6] outline-none focus:ring-2 focus:ring-black/10 transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="hl-label block mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#f3f3f4] rounded-xl px-4 py-3 text-sm font-medium text-[#1a1c1c] placeholder:text-[#c6c6c6] outline-none focus:ring-2 focus:ring-black/10 transition-all"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="hl-label block mb-1.5">Gender</label>
                <div className="flex flex-wrap gap-2">
                  {GENDER_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setEditGender(opt)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                        editGender === opt
                          ? "bg-black text-white"
                          : "bg-[#f3f3f4] text-[#474747] hover:bg-[#e8e8e8]"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age */}
              <div>
                <label className="hl-label block mb-1.5">Age</label>
                <input
                  type="number"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  placeholder="Enter age"
                  min="1"
                  max="120"
                  className="w-full bg-[#f3f3f4] rounded-xl px-4 py-3 text-sm font-medium text-[#1a1c1c] placeholder:text-[#c6c6c6] outline-none focus:ring-2 focus:ring-black/10 transition-all"
                />
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="hl-label block mb-1.5">Emergency Contact</label>
                <input
                  type="text"
                  value={editEmergency}
                  onChange={(e) => setEditEmergency(e.target.value)}
                  placeholder="+1 555-0100"
                  className="w-full bg-[#f3f3f4] rounded-xl px-4 py-3 text-sm font-medium text-[#1a1c1c] placeholder:text-[#c6c6c6] outline-none focus:ring-2 focus:ring-black/10 transition-all"
                />
              </div>

              {/* Blood Type */}
              <div>
                <label className="hl-label block mb-1.5">Blood Type</label>
                <select
                  value={editBloodType}
                  onChange={(e) => setEditBloodType(e.target.value)}
                  className="w-full bg-[#f3f3f4] rounded-xl px-4 py-3 text-sm font-medium text-[#1a1c1c] outline-none focus:ring-2 focus:ring-black/10 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
              </div>

              {/* Insurance */}
              <div className="col-span-2">
                <label className="hl-label block mb-1.5">Insurance Provider</label>
                <input
                  type="text"
                  value={editInsurance}
                  onChange={(e) => setEditInsurance(e.target.value)}
                  placeholder="e.g. HealthPlus Gold"
                  className="w-full bg-[#f3f3f4] rounded-xl px-4 py-3 text-sm font-medium text-[#1a1c1c] placeholder:text-[#c6c6c6] outline-none focus:ring-2 focus:ring-black/10 transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-black text-white rounded-2xl py-3.5 text-sm font-semibold mt-6 flex items-center justify-center gap-2 hover:bg-[#3b3b3b] transition-all disabled:opacity-50 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Save Changes
                </>
              )}
            </button>
          </section>

          {/* Right Column: Active Status + Security */}
          <div className="space-y-6">
            {/* Active Status Card */}
            <section className="hl-card-dark p-6">
              <p className="text-[10px] uppercase tracking-[0.05em] text-[#c6c6c6] font-semibold mb-3">Active Status</p>
              <h2 className="text-2xl font-black text-white tracking-tight leading-tight mb-4">
                {patient?.active_status || "Active"}
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.05em] text-[#c6c6c6] font-semibold mb-1">Date of Birth</p>
                  <p className="text-sm font-semibold text-white">{formatDob(patient?.dob ?? null)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.05em] text-[#c6c6c6] font-semibold mb-1">Primary Doctor</p>
                  <p className="text-sm font-semibold text-white">{patient?.primary_doctor_id || "Not assigned"}</p>
                </div>
              </div>
            </section>

            {/* Security & Privacy */}
            <section className="hl-card p-6">
              <h3 className="hl-section-title mb-5">Security & Privacy</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1a1c1c]">Two-Factor Auth</p>
                    <p className="text-xs text-[#777777]">Secure your portal</p>
                  </div>
                  <button
                    onClick={() => setTwoFa(!twoFa)}
                    className={`w-11 h-6 rounded-full transition-colors duration-200 relative ${twoFa ? "bg-black" : "bg-[#dadada]"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${twoFa ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1a1c1c]">Biometric Login</p>
                    <p className="text-xs text-[#777777]">FaceID / TouchID</p>
                  </div>
                  <button
                    onClick={() => setBiometric(!biometric)}
                    className={`w-11 h-6 rounded-full transition-colors duration-200 relative ${biometric ? "bg-black" : "bg-[#dadada]"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${biometric ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* ── Appointment History ──────────────────────── */}
        <section className="hl-card p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="hl-section-title">Appointment History</h3>
            <span className="text-xs text-[#777777]">{localAppointments.length + history.length} total records</span>
          </div>
          <div className="space-y-0">
            {/* Show local appointments first */}
            {localAppointments.slice(0, 8).map((appt) => {
              const dateObj = new Date(appt.appointment_date + "T00:00:00")
              const day = String(dateObj.getDate()).padStart(2, "0")
              const monthYear = dateObj.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).toUpperCase()
              const statusColor =
                appt.portal_status === "upcoming" ? "bg-[#e3f2fd] text-[#1565c0]" :
                appt.portal_status === "completed" ? "bg-[#e8f5e9] text-[#2e7d32]" :
                appt.portal_status === "cancelled" ? "bg-[#f3f3f4] text-[#777777]" :
                "bg-[#fce4ec] text-[#c62828]"
              return (
                <div key={appt.appointment_id} className="flex items-center gap-6 py-4 group hover:bg-[#f9f9f9] -mx-4 px-4 rounded-xl transition-colors">
                  <div className="text-center min-w-[48px]">
                    <p className="text-2xl font-black text-black leading-none">{day}</p>
                    <p className="hl-label mt-1">{monthYear}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1a1c1c]">{appt.appointment_type}</p>
                    <p className="text-xs text-[#777777] mt-0.5">
                      {appt.doctor?.name || (appt.doctor_id ? `Doctor ${appt.doctor_id}` : "Specialist")}
                      {appt.waiting_time !== null ? ` • ${Math.round(appt.waiting_time)} min wait` : ""}
                    </p>
                  </div>
                  <span className={`text-[9px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${statusColor}`}>
                    {appt.portal_status}
                  </span>
                </div>
              )
            })}
            {/* API history */}
            {history.map((appt) => {
              const dateObj = new Date(appt.appointment_date + "T00:00:00")
              const day = String(dateObj.getDate()).padStart(2, "0")
              const monthYear = dateObj.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).toUpperCase()
              return (
                <div key={appt.appointment_id} className="flex items-center gap-6 py-4 group hover:bg-[#f9f9f9] -mx-4 px-4 rounded-xl transition-colors">
                  <div className="text-center min-w-[48px]">
                    <p className="text-2xl font-black text-black leading-none">{day}</p>
                    <p className="hl-label mt-1">{monthYear}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1a1c1c]">{appt.appointment_type}</p>
                    <p className="text-xs text-[#777777] mt-0.5">
                      {appt.doctor_id ? `Doctor ${appt.doctor_id}` : "Specialist"}
                    </p>
                  </div>
                  <span className={`text-[9px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${
                    appt.portal_status === "completed" ? "bg-[#e8f5e9] text-[#2e7d32]" : "bg-[#fce4ec] text-[#c62828]"
                  }`}>
                    {appt.portal_status}
                  </span>
                </div>
              )
            })}
            {localAppointments.length === 0 && history.length === 0 && (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-[32px] text-[#c6c6c6] mb-2 block">history</span>
                <p className="text-xs text-[#777777]">No appointment history yet</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
