from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional


class MdlLoginRequest(BaseModel):
    email: EmailStr
    password: str


class MdlLoginResponse(BaseModel):
    strAccessToken: str
    strTokentype: str = "bearer"
    dctUserInfo: dict


class MdlSignupRequest(BaseModel):
    email: EmailStr
    password: str
    username: str
    businessName: Optional[str] = None
    phone: Optional[str] = None
    serviceId: Optional[int] = None

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if not v or not v.strip():
            raise ValueError('Username is required')
        return v.strip()


class MdlForgotPasswordRequest(BaseModel):
    email: EmailStr


class MdlResetPasswordRequest(BaseModel):
    token: str
    password: str

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v
