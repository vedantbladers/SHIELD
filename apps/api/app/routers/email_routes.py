"""Email router — supports internal SMTP email templates and reveal notifications."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.auth.dependencies import get_current_session
from app.models.models import User, Deal, AuditLog
from app.email.mailer import send_email
from app.email.templates import build_reveal_email
from app.routers.deals import send_deal_email_bg, send_reveal_email_bg
from app.config import settings

router = APIRouter(prefix="/api/email", tags=["email"])


@router.post("/send")
async def send_templated_email(
    body: dict,
    session: dict = Depends(get_current_session),
):
    template = body.get("template")
    to = body.get("to")
    variables = body.get("variables", {})

    if not template or not to or not variables:
        raise HTTPException(status_code=400, detail="template, to, and variables are required")

    # Inject app_url
    variables["app_url"] = settings.app_url

    # Reuse send_deal_email_bg or send_email directly
    try:
        send_deal_email_bg(to, template, variables)
        return {"data": {"message": "Email sent successfully"}, "error": None, "sent": True}
    except Exception as e:
        return {"data": None, "error": str(e), "sent": False}


@router.post("/send-reveal")
async def send_reveal_emails(
    body: dict,
    session: dict = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    deal_id = body.get("deal_id")
    if not deal_id:
        raise HTTPException(status_code=400, detail="deal_id is required")

    res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    if not deal.identity_revealed:
        raise HTTPException(status_code=400, detail="Identity not yet revealed")

    alias = session["alias"]
    if deal.buyer_alias != alias and deal.vendor_alias != alias:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Fetch emails
    buyer_res = await db.execute(select(User.email).where(User.alias == deal.buyer_alias))
    buyer_email = buyer_res.scalar()

    vendor_res = await db.execute(select(User.email).where(User.alias == deal.vendor_alias))
    vendor_email = vendor_res.scalar()

    if not buyer_email or not vendor_email:
        raise HTTPException(status_code=500, detail="Could not resolve user emails")

    send_reveal_email_bg(
        buyer_email,
        vendor_email,
        deal.buyer_alias,
        deal.vendor_alias,
        deal_id
    )

    # Audit log
    db.add(AuditLog(
        actor_alias=alias,
        action_type="reveal_email_sent",
        deal_id=deal_id,
        meta={"buyer": deal.buyer_alias, "vendor": deal.vendor_alias}
    ))
    await db.commit()

    return {"data": {"results": [{"to": "buyer", "sent": True}, {"to": "vendor", "sent": True}]}, "error": None}
