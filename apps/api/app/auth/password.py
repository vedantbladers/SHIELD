"""Password hashing utilities using bcrypt package directly."""
import bcrypt


def hash_password(password: str) -> str:
    """Hash password using bcrypt with 12 rounds."""
    # Generate salt with 12 rounds (matching old system)
    salt = bcrypt.gensalt(rounds=12)
    # Hash password (expects bytes, returns bytes)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False
