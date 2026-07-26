"""JWT handler — HS256, 7-day expiry, matching old system payload structure."""
from datetime import datetime, timedelta
from jose import jwt, JWTError
from app.config import settings


def create_access_token(data: dict) -> str:
    """Create JWT with {userId, alias, role} payload + iat/exp."""
    to_encode = data.copy()
    now = datetime.utcnow()
    expire = now + timedelta(days=settings.jwt_expire_days)
    to_encode.update({"iat": int(now.timestamp()), "exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_access_token(token: str) -> dict | None:
    """Verify and decode JWT. Returns payload dict or None on failure."""
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        return None
