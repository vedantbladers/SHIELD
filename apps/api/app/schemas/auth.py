"""Pydantic schemas for auth endpoints."""
import re
from pydantic import BaseModel, field_validator

# We use str + custom validator instead of EmailStr because the moderator
# account uses mod@shield.local which email-validator rejects.
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def _validate_email(v: str) -> str:
    if not EMAIL_REGEX.match(v):
        raise ValueError("Invalid email address")
    return v.lower().strip()


class SignupRequest(BaseModel):
    email: str
    password: str
    alias: str
    role: str  # buyer | vendor (moderator blocked)

    _validate_email = field_validator("email")(_validate_email)

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("alias")
    @classmethod
    def alias_format(cls, v: str) -> str:
        if not re.match(r"^(Vendor|Buyer)-[a-zA-Z0-9]{3,16}$", v):
            raise ValueError("Invalid alias format")
        return v

    @field_validator("role")
    @classmethod
    def role_valid(cls, v: str) -> str:
        if v not in ("buyer", "vendor"):
            raise ValueError("Invalid role")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str

    _validate_email = field_validator("email")(_validate_email)

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v: str) -> str:
        if len(v) < 1:
            raise ValueError("Password required")
        return v


class ResendVerificationRequest(BaseModel):
    email: str

    _validate_email = field_validator("email")(_validate_email)


class OnboardingUpdateRequest(BaseModel):
    onboarding_complete: bool
