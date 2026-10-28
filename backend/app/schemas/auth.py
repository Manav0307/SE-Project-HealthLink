from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class Enable2FAResponse(BaseModel):
    qr_code_url: str
    secret: str
    message: str
