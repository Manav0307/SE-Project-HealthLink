"""Quick smoke test — run from apps/api/ directory"""
import sys, os
# Fix Windows terminal encoding (cp1252 can't print Unicode checkmarks)
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

errors = []

# 1. config
try:
    from app.core.config import settings
    print(f"[OK] config — JWT_SECRET_KEY starts with: {settings.JWT_SECRET_KEY[:12]}...")
except Exception as e:
    errors.append(f"[FAIL] config: {e}")

# 2. security
try:
    from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
    h = hash_password("health123")
    assert verify_password("health123", h), "verify failed"
    tok = create_access_token("R00001", role="patient")
    payload = decode_token(tok)
    assert payload["sub"] == "R00001"
    assert payload["role"] == "patient"
    print("[OK] security — hash/verify/JWT all working")
except Exception as e:
    errors.append(f"[FAIL] security: {e}")

# 3. schemas
try:
    from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
    r = RegisterRequest(name="Test User", email="test@healthlink.com", password="health123")
    assert r.name == "Test User"
    # short password should fail
    rejected = False
    try:
        RegisterRequest(name="X", email="bad@x.com", password="short")
    except Exception:
        rejected = True
    assert rejected, "short password was not rejected"
    print("[OK] schemas — RegisterRequest validates correctly")
except Exception as e:
    errors.append(f"[FAIL] schemas: {e}")

# 4. patient_service import
try:
    from app.services.patient_service import PatientService
    assert hasattr(PatientService, "create_patient"), "create_patient missing"
    assert hasattr(PatientService, "get_by_email"), "get_by_email missing"
    print("[OK] patient_service — create_patient + get_by_email present")
except Exception as e:
    errors.append(f"[FAIL] patient_service: {e}")

# 5. router import
try:
    from app.routers.auth import router
    routes = [r.path for r in router.routes]
    assert "/register" in routes, f"register missing — routes: {routes}"
    assert "/login" in routes, f"login missing"
    assert "/me" in routes, f"me missing"
    print(f"[OK] auth router — routes: {routes}")
except Exception as e:
    errors.append(f"[FAIL] auth router: {e}")

print()
if errors:
    print("=== FAILURES ===")
    for err in errors:
        print(err)
    sys.exit(1)
else:
    print("=== ALL CHECKS PASSED ===")
