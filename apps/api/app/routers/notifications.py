"""Notifications router — lists and marks notifications read."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.database import get_db
from app.auth.dependencies import get_current_session
from app.models.models import Notification

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def get_my_notifications(
    session: dict = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]
    res = await db.execute(
        select(Notification)
        .where(Notification.recipient_alias == alias)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    items = res.scalars().all()

    items_data = []
    for n in items:
        items_data.append({
            "id": n.id,
            "recipient_alias": n.recipient_alias,
            "type": n.type,
            "content": n.content,
            "ref_id": n.ref_id,
            "read": n.read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })

    return {"data": items_data, "error": None}


@router.patch("")
async def mark_notifications_read(
    session: dict = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]

    await db.execute(
        update(Notification)
        .where(Notification.recipient_alias == alias, Notification.read == False)
        .values(read=True)
    )
    await db.commit()

    return {"data": {"marked": True}, "error": None}
