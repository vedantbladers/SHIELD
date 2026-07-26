"""Auth dependencies for FastAPI — session extraction + role guards."""
from fastapi import Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.auth.jwt_handler import verify_access_token
from app.models.models import User

TOKEN_COOKIE = "shield_token"


async def get_current_session(request: Request) -> dict:
    """Extract and verify JWT from httpOnly cookie. Returns payload dict."""
    token = request.cookies.get(TOKEN_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload  # { userId, alias, role, iat, exp }


async def get_optional_session(request: Request) -> dict | None:
    """Like get_current_session but returns None instead of raising on failure."""
    token = request.cookies.get(TOKEN_COOKIE)
    if not token:
        return None
    return verify_access_token(token)


def require_role(*allowed_roles: str):
    """Dependency factory — creates a checker that requires specific roles."""

    async def checker(session: dict = Depends(get_current_session)) -> dict:
        if session.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return session

    return checker


# Convenience shortcuts
require_buyer = require_role("buyer")
require_vendor = require_role("vendor")
require_moderator = require_role("moderator")
require_buyer_or_vendor = require_role("buyer", "vendor")
