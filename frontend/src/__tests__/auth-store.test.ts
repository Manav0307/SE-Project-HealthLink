import { describe, it, expect, beforeEach } from "vitest"
import { useAuthStore, DEFAULT_PATIENT } from "../store/auth-store"

describe("Auth Store & Prototype Patient Unit Tests", () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  it("should attach default prototype patient Alex Morgan with ID 00001", () => {
    const patient = useAuthStore.getState().patient
    expect(patient).not.toBeNull()
    expect(patient?.patient_id).toBe("00001")
    expect(patient?.name).toBe("Alex Morgan")
    expect(patient?.reliability_grade).toBe("A")
  })

  it("should update patient personal information in state", () => {
    useAuthStore.getState().updatePatient({
      name: "Alex Morgan (Updated)",
      blood_type: "AB+",
      insurance: "United Healthcare",
    })

    const patient = useAuthStore.getState().patient
    expect(patient?.name).toBe("Alex Morgan (Updated)")
    expect(patient?.blood_type).toBe("AB+")
    expect(patient?.insurance).toBe("United Healthcare")
    expect(patient?.patient_id).toBe("00001")
  })

  it("should save authentication tokens on login", () => {
    useAuthStore.getState().setTokens("jwt_access_token_abc", "jwt_refresh_token_xyz")
    const state = useAuthStore.getState()
    expect(state.accessToken).toBe("jwt_access_token_abc")
    expect(state.refreshToken).toBe("jwt_refresh_token_xyz")
  })

  it("should clear tokens and restore default patient on logout", () => {
    useAuthStore.getState().setTokens("jwt_access_token_abc", "jwt_refresh_token_xyz")
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.patient?.patient_id).toBe("00001")
  })
})

