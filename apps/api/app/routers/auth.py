"""Auth router — 6 endpoints + alias check, ported from Next.js API routes."""
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.models import User, AliasDirectory, AuditLog
from app.auth.password import hash_password, verify_password
from app.auth.jwt_handler import create_access_token, verify_access_token
from app.auth.dependencies import get_current_session, TOKEN_COOKIE
from app.email.mailer import send_email
from app.email.templates import build_verification_email
from app.schemas.auth import (
    SignupRequest,
    LoginRequest,
    ResendVerificationRequest,
    OnboardingUpdateRequest,
)
from app.config import settings

router = APIRouter(prefix="/api", tags=["auth"])

# ─── Forbidden alias words ────────────────────────────────────────────
FORBIDDEN_WORDS = [
    "admin", "system", "shield", "support", "help", "mod",
    "moderator", "root", "test", "demo", "guest", "anon",
    "null", "undefined", "staff",
]


# ─── Cookie helper ────────────────────────────────────────────────────
def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=TOKEN_COOKIE,
        value=token,
        httponly=True,
        secure=False,  # True in production with HTTPS
        samesite="lax",
        max_age=60 * 60 * 24 * 7,  # 7 days
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.set_cookie(
        key=TOKEN_COOKIE,
        value="",
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=0,
        path="/",
    )


# ─── POST /api/auth/signup ────────────────────────────────────────────
@router.post("/auth/signup", status_code=201)
async def signup(data: SignupRequest, db: AsyncSession = Depends(get_db)):
    # Check email uniqueness
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Check alias uniqueness
    result = await db.execute(select(User).where(User.alias == data.alias))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Alias already taken")

    # Generate verification token
    token = secrets.token_hex(32)
    expires = datetime.utcnow() + timedelta(hours=24)

    # Create user
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        alias=data.alias,
        role=data.role,
        email_verified=False,
        verification_token=token,
        verification_expires=expires,
        onboarding_complete=False,
    )
    db.add(user)

    # Create alias directory entry
    alias_entry = AliasDirectory(
        alias=data.alias,
        role=data.role,
        cert_badges=[],
        skills=[],
    )
    db.add(alias_entry)

    # Audit log
    audit = AuditLog(
        action_type="user_signup",
        actor_alias=data.alias,
        meta={"role": data.role},
    )
    db.add(audit)

    await db.commit()

    # Send verification email (fire-and-forget)
    try:
        html = build_verification_email(data.alias, token)
        send_email(data.email, "Verify your SHIELD account", html)
    except Exception as e:
        print(f"SMTP email send failed: {e}")

    return {
        "data": {"message": "Account created! Check your email to verify your account."},
        "error": None,
    }


# ─── GET /api/auth/verify ─────────────────────────────────────────────
@router.get("/auth/verify")
async def verify_email(token: str = "", db: AsyncSession = Depends(get_db)):
    if not token:
        return RedirectResponse(url=f"{settings.app_url}/login?error=missing_token")

    result = await db.execute(
        select(User).where(
            User.verification_token == token,
            User.verification_expires > datetime.utcnow(),
            User.email_verified == False,
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        return RedirectResponse(url=f"{settings.app_url}/login?error=invalid_or_expired_token")

    # Mark as verified
    user.email_verified = True
    user.verification_token = None
    user.verification_expires = None

    # Audit log
    audit = AuditLog(action_type="email_verified", actor_alias=user.alias)
    db.add(audit)

    await db.commit()

    # Create JWT and set cookie on redirect
    jwt_token = create_access_token(
        {"userId": user.id, "alias": user.alias, "role": user.role}
    )

    response = RedirectResponse(url=f"{settings.app_url}/onboard", status_code=302)
    _set_auth_cookie(response, jwt_token)
    return response


# ─── POST /api/auth/login ─────────────────────────────────────────────
@router.post("/auth/login")
async def login(data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    # Find user
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check email verified
    if not user.email_verified:
        return Response(
            content='{"data": null, "error": "Please verify your email before logging in.", "code": "EMAIL_NOT_VERIFIED"}',
            status_code=403,
            media_type="application/json",
        )

    # Verify password
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create JWT
    token = create_access_token(
        {"userId": user.id, "alias": user.alias, "role": user.role}
    )

    # Audit log
    audit = AuditLog(action_type="user_login", actor_alias=user.alias)
    db.add(audit)
    await db.commit()

    resp_data = {
        "data": {
            "alias": user.alias,
            "role": user.role,
            "onboarding_complete": user.onboarding_complete,
        },
        "error": None,
    }

    from fastapi.responses import JSONResponse

    json_response = JSONResponse(content=resp_data)
    _set_auth_cookie(json_response, token)
    return json_response


# ─── POST /api/auth/logout ────────────────────────────────────────────
@router.post("/auth/logout")
async def logout():
    from fastapi.responses import JSONResponse

    response = JSONResponse(content={"data": {"success": True}, "error": None})
    _clear_auth_cookie(response)
    return response


# ─── GET /api/auth/me ─────────────────────────────────────────────────
@router.get("/auth/me")
async def get_me(
    session: dict = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == session["userId"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "data": {
            "user": {"id": user.id, "email": user.email},
            "profile": {
                "id": user.id,
                "alias": user.alias,
                "role": user.role,
                "trust_score": user.trust_score,
                "onboarding_complete": user.onboarding_complete,
                "rating_as_vendor": user.rating_as_vendor,
                "rating_as_buyer": user.rating_as_buyer,
                "total_vendor_reviews": user.total_vendor_reviews,
                "total_buyer_reviews": user.total_buyer_reviews,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            },
            "alias": user.alias,
            "role": user.role,
        },
        "error": None,
    }


# ─── PATCH /api/auth/me ───────────────────────────────────────────────
@router.patch("/auth/me")
async def update_me(
    data: OnboardingUpdateRequest,
    session: dict = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == session["userId"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.onboarding_complete = data.onboarding_complete
    await db.commit()
    await db.refresh(user)

    return {
        "data": {
            "user": {"id": user.id, "email": user.email},
            "profile": {
                "id": user.id,
                "alias": user.alias,
                "role": user.role,
                "trust_score": user.trust_score,
                "onboarding_complete": user.onboarding_complete,
                "rating_as_vendor": user.rating_as_vendor,
                "rating_as_buyer": user.rating_as_buyer,
                "total_vendor_reviews": user.total_vendor_reviews,
                "total_buyer_reviews": user.total_buyer_reviews,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            },
            "alias": user.alias,
            "role": user.role,
        },
        "error": None,
    }


# ─── POST /api/auth/resend-verification ───────────────────────────────
@router.post("/auth/resend-verification")
async def resend_verification(
    data: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    # Always return success to prevent email enumeration
    success_msg = {
        "data": {"message": "If that email exists and is unverified, a new link has been sent."},
        "error": None,
    }

    if not user or user.email_verified:
        return success_msg

    # Generate new token
    token = secrets.token_hex(32)
    expires = datetime.utcnow() + timedelta(hours=24)

    user.verification_token = token
    user.verification_expires = expires
    await db.commit()

    # Send verification email
    try:
        html = build_verification_email(user.alias, token)
        send_email(data.email, "Verify your SHIELD account", html)
    except Exception as e:
        print(f"SMTP email send failed in resend-verification: {e}")

    return success_msg


# ─── GET /api/alias/check ─────────────────────────────────────────────
@router.get("/alias/check")
async def check_alias(alias: str = "", db: AsyncSession = Depends(get_db)):
    import re

    if not alias:
        return {"available": False, "reason": "invalid"}

    # Validate format
    if not re.match(r"^(Vendor|Buyer)-[a-zA-Z0-9]{3,16}$", alias):
        return {"available": False, "reason": "invalid"}

    # Check forbidden words
    custom_part = alias.split("-")[1].lower()
    if custom_part in FORBIDDEN_WORDS:
        return {"available": False, "reason": "forbidden"}

    # Check database uniqueness
    result = await db.execute(select(User.alias).where(User.alias == alias))
    existing = result.scalar_one_or_none()

    return {"available": not existing, "reason": "taken" if existing else None}
