"""
SHIELD Platform — FastAPI Backend Entry Point
"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.config import settings
from app.database import get_db
from app.models.models import User
from app.routers import auth as auth_router
from app.routers import buyer as buyer_router
from app.routers import vendor as vendor_router
from app.routers import deals as deals_router
from app.routers import moderator as moderator_router
from app.routers import notifications as notifications_router
from app.routers import email_routes as email_router
from app.routers import marketplace as marketplace_router
from app.routers import files as files_router
from app.routers import matching as matching_router

app = FastAPI(
    title="SHIELD API",
    description="Anonymous Cybersecurity Marketplace API",
    version="2.0.0",
)

# CORS — allow Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.app_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(buyer_router.router)
app.include_router(vendor_router.router)
app.include_router(deals_router.router)
app.include_router(moderator_router.router)
app.include_router(notifications_router.router)
app.include_router(email_router.router)
app.include_router(marketplace_router.router)
app.include_router(files_router.router)
app.include_router(matching_router.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "shield-api"}


@app.get("/api/smoke-test")
async def smoke_test(db: AsyncSession = Depends(get_db)):
    """Smoke test: query existing users table to verify SQLAlchemy models work."""
    result = await db.execute(select(User).limit(3))
    users = result.scalars().all()
    return {
        "data": {
            "total_users_sampled": len(users),
            "users": [
                {
                    "alias": u.alias,
                    "role": u.role,
                    "trust_score": u.trust_score,
                    "email_verified": u.email_verified,
                    "created_at": str(u.created_at),
                }
                for u in users
            ],
        },
        "error": None,
    }


@app.get("/api/smoke-test/tables")
async def smoke_test_tables(db: AsyncSession = Depends(get_db)):
    """Verify all 12 tables are accessible."""
    result = await db.execute(
        text(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
        )
    )
    tables = [row[0] for row in result.all()]
    return {"data": {"tables": tables, "count": len(tables)}, "error": None}



# Wrap with Socket.IO ASGIApp
import socketio
from app.sockets.manager import sio
app = socketio.ASGIApp(sio, other_asgi_app=app)

