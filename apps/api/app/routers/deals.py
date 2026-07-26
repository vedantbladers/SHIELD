"""Deals router — handles deal listings, proposals review, deals lifecycle, and identity reveals."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from bson.objectid import ObjectId

from app.database import get_db
from app.auth.dependencies import get_current_session, require_buyer_or_vendor, require_buyer
from app.models.models import User, Deal, DealEvent, Message, ChatKey, Notification, AuditLog, Review, TrustEvent, AliasDirectory
from app.mongodb.client import get_collection
from app.schemas.deals import DealTransitionSchema, DealPriceSchema, DealReviewSchema, DealEventCreateSchema
from app.utils.trust_engine import compute_trust_score, recompute_vendor_rating, recompute_buyer_rating
from app.email.mailer import send_email
from app.email.templates import build_proposal_accepted_email, build_deal_status_change_email
from app.config import settings

router = APIRouter(prefix="/api/deals", tags=["deals"])


def send_deal_email_bg(to: str, template: str, vars_dict: dict):
    """Sends deal notifications via SMTP."""
    if template == "proposal_accepted":
        html = build_proposal_accepted_email(
            vendor_alias=vars_dict["vendor_alias"],
            deal_id=vars_dict["deal_id"],
            app_url=settings.app_url
        )
        send_email(to, "Your Proposal Was Accepted! — SHIELD", html)
    elif template == "deal_status_change":
        html = build_deal_status_change_email(
            recipient_alias=vars_dict["recipient_alias"],
            from_status=vars_dict["from_status"],
            to_status=vars_dict["to_status"],
            deal_id=vars_dict["deal_id"],
            app_url=settings.app_url
        )
        send_email(to, "Deal Status Updated — SHIELD", html)


def send_reveal_email_bg(buyer_email: str, vendor_email: str, buyer_alias: str, vendor_alias: str, deal_id: str):
    """Sends the reveal email with contact details to both participants."""
    reveal_html = lambda recipient, other_alias, other_email: f"""
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">🛡️ SHIELD — Identity Revealed</h1>
        </div>
        <div style="padding:32px;color:#e2e8f0">
          <p>Hello <strong style="color:#22d3ee">{recipient}</strong>,</p>
          <p>Both parties have consented to identity reveal for deal <strong>{deal_id[:8]}...</strong>.</p>
          <div style="margin:20px 0;padding:16px;background:#1e293b;border-radius:8px;border-left:3px solid #f59e0b">
            <p style="margin:0 0 8px 0;color:#94a3b8;font-size:13px">The other party's details:</p>
            <p style="margin:0;font-size:16px"><strong>Alias:</strong> <span style="color:#22d3ee">{other_alias}</span></p>
            <p style="margin:4px 0 0 0;font-size:16px"><strong>Email:</strong> <a href="mailto:{other_email}" style="color:#34d399">{other_email}</a></p>
          </div>
          <p style="color:#64748b;font-size:13px">You can now communicate directly outside the platform.</p>
          <a href="{settings.app_url}/deal/{deal_id}/chat" style="display:inline-block;margin-top:16px;padding:10px 24px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View Deal</a>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #1e293b;color:#64748b;font-size:12px">
          This is an automated reveal notification. Handle shared information responsibly.
        </div>
      </div>
    """
    send_email(buyer_email, "Identity Revealed — SHIELD Deal", reveal_html(buyer_alias, vendor_alias, vendor_email))
    send_email(vendor_email, "Identity Revealed — SHIELD Deal", reveal_html(vendor_alias, buyer_alias, buyer_email))


# ─── GET /api/deals/list ──────────────────────────────────────────────
@router.get("/list")
async def get_deals_list(
    session: dict = Depends(require_buyer_or_vendor),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]
    role = session["role"]

    if role == "buyer":
        query = select(Deal).where(Deal.buyer_alias == alias)
    else:
        query = select(Deal).where(Deal.vendor_alias == alias)

    res = await db.execute(query.order_by(Deal.created_at.desc()))
    deals = res.scalars().all()

    # Enrich with requirement title from MongoDB
    req_ids = list(set(d.requirement_id for d in deals if d.requirement_id and ObjectId.is_valid(d.requirement_id)))
    req_map = {}
    if req_ids:
        col = await get_collection("buyer_requirements")
        reqs = await col.find({"_id": {"$in": [ObjectId(rid) for rid in req_ids]}}).to_list(length=1000)
        req_map = {str(r["_id"]): r["title"] for r in reqs}

    result = []
    for d in deals:
        result.append({
            "id": d.id,
            "buyer_alias": d.buyer_alias,
            "vendor_alias": d.vendor_alias,
            "requirement_id": d.requirement_id,
            "requirement_title": req_map.get(d.requirement_id, "Direct Deal" if not d.requirement_id else "Unknown Opportunity"),
            "status": d.status,
            "agreed_price": d.agreed_price,
            "original_price": d.original_price,
            "currency": d.currency,
            "price_updated_at": d.price_updated_at.isoformat() if d.price_updated_at else None,
            "buyer_consented_reveal": d.buyer_consented_reveal,
            "vendor_consented_reveal": d.vendor_consented_reveal,
            "identity_revealed": d.identity_revealed,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "updated_at": d.updated_at.isoformat() if d.updated_at else None,
            "closed_at": d.closed_at.isoformat() if d.closed_at else None,
        })

    return {"data": result, "error": None}


# ─── GET /api/deals/{id} ──────────────────────────────────────────────
@router.get("/{deal_id}")
async def get_deal_detail(
    deal_id: str,
    session: dict = Depends(require_buyer_or_vendor),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]

    # Fetch deal
    res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # Verify participant
    if deal.buyer_alias != alias and deal.vendor_alias != alias:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Fetch requirement detail from MongoDB
    requirement_title = "Direct Deal"
    requirement_desc = ""
    if deal.requirement_id and ObjectId.is_valid(deal.requirement_id):
        col = await get_collection("buyer_requirements")
        req = await col.find_one({"_id": ObjectId(deal.requirement_id)})
        if req:
            requirement_title = req.get("title", "Unknown Opportunity")
            requirement_desc = req.get("description", "")

    # Fetch chat keys (E2E encryption exchange)
    keys_res = await db.execute(select(ChatKey).where(ChatKey.deal_id == deal_id))
    keys = keys_res.scalars().all()
    keys_data = [{"alias": k.alias, "public_key": k.public_key} for k in keys]

    return {
        "data": {
            "id": deal.id,
            "buyer_alias": deal.buyer_alias,
            "vendor_alias": deal.vendor_alias,
            "requirement_id": deal.requirement_id,
            "requirement_title": requirement_title,
            "requirement_description": requirement_desc,
            "status": deal.status,
            "agreed_price": deal.agreed_price,
            "original_price": deal.original_price,
            "currency": deal.currency,
            "buyer_consented_reveal": deal.buyer_consented_reveal,
            "vendor_consented_reveal": deal.vendor_consented_reveal,
            "identity_revealed": deal.identity_revealed,
            "created_at": deal.created_at.isoformat() if deal.created_at else None,
            "updated_at": deal.updated_at.isoformat() if deal.updated_at else None,
            "closed_at": deal.closed_at.isoformat() if deal.closed_at else None,
            "chat_keys": keys_data,
        },
        "error": None,
    }


# ─── POST /api/deals/create ───────────────────────────────────────────
@router.post("/create", status_code=201)
async def create_deal_from_proposal(
    body: dict,
    background_tasks: BackgroundTasks,
    session: dict = Depends(require_buyer),
    db: AsyncSession = Depends(get_db),
):
    buyer_alias = session["alias"]
    proposal_id = body.get("proposal_id")

    if not proposal_id or not ObjectId.is_valid(proposal_id):
        raise HTTPException(status_code=400, detail="Invalid proposal_id")

    # Fetch accepted proposal from MongoDB
    prop_col = await get_collection("proposals")
    proposal = await prop_col.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal["status"] != "pending":
        raise HTTPException(status_code=400, detail="Proposal is no longer pending")

    if proposal["buyer_alias"] != buyer_alias:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Create deal in Postgres
    deal = Deal(
        buyer_alias=buyer_alias,
        vendor_alias=proposal["vendor_alias"],
        requirement_id=proposal["requirement_id"],
        status="NEGOTIATING",
        agreed_price=proposal["proposed_price"],
        original_price=proposal["proposed_price"],
    )
    db.add(deal)
    await db.flush()  # populate deal.id

    # Accept this proposal, reject other pending ones
    await prop_col.update_one(
        {"_id": ObjectId(proposal_id)},
        {"$set": {"status": "accepted", "updated_at": datetime.utcnow()}}
    )
    await prop_col.update_many(
        {
            "requirement_id": proposal["requirement_id"],
            "_id": {"$ne": ObjectId(proposal_id)},
            "status": "pending"
        },
        {"$set": {"status": "rejected", "updated_at": datetime.utcnow()}}
    )

    # Update requirement status to matched
    req_col = await get_collection("buyer_requirements")
    await req_col.update_one(
        {"_id": ObjectId(proposal["requirement_id"])},
        {"$set": {"status": "matched", "updated_at": datetime.utcnow()}}
    )

    # Create DealEvent
    event = DealEvent(
        deal_id=deal.id,
        event_type="deal_created",
        to_status="NEGOTIATING",
        actor_alias=buyer_alias,
        note="Deal created from accepted proposal",
    )
    db.add(event)

    # Audit log
    audit = AuditLog(
        actor_alias=buyer_alias,
        action_type="deal_created",
        deal_id=deal.id,
        meta={"proposal_id": proposal_id, "vendor_alias": proposal["vendor_alias"]}
    )
    db.add(audit)

    # In-app notifications
    notif_v = Notification(
        recipient_alias=proposal["vendor_alias"],
        type="proposal_accepted",
        content="Your proposal was accepted! Deal created.",
        ref_id=deal.id
    )
    notif_b = Notification(
        recipient_alias=buyer_alias,
        type="deal_created",
        content=f"Deal created with {proposal['vendor_alias']}",
        ref_id=deal.id
    )
    db.add(notif_v)
    db.add(notif_b)
    await db.commit()

    # Emit Socket.IO notifications
    from app.sockets.manager import sio
    for n in (notif_v, notif_b):
        await sio.emit(
            "new-notification",
            {
                "id": n.id,
                "type": n.type,
                "content": n.content,
                "ref_id": n.ref_id,
                "read": False,
                "created_at": datetime.utcnow().isoformat() + "Z"
            },
            room=f"notifications-{n.recipient_alias}"
        )

    # Send email notification to vendor in background
    vendor_res = await db.execute(select(User.email).where(User.alias == proposal["vendor_alias"]))
    vendor_email = vendor_res.scalar()
    if vendor_email:
        background_tasks.add_task(
            send_deal_email_bg,
            vendor_email,
            "proposal_accepted",
            {"vendor_alias": proposal["vendor_alias"], "deal_id": deal.id}
        )

    return {"data": {"deal_id": deal.id}, "error": None}


# ─── POST /api/deals/{id}/transition ──────────────────────────────────
TRANSITIONS = {
    "POSTED": [{"to": "MATCHED", "allowedRoles": ["admin"]}],
    "MATCHED": [{"to": "NEGOTIATING", "allowedRoles": ["buyer"]}],
    "NEGOTIATING": [
        {"to": "CONTRACTED", "allowedRoles": ["buyer", "vendor"]},
        {"to": "CANCELLED", "allowedRoles": ["buyer", "vendor"]},
    ],
    "CONTRACTED": [{"to": "IN_PROGRESS", "allowedRoles": ["vendor"]}],
    "IN_PROGRESS": [{"to": "REVIEW", "allowedRoles": ["vendor"]}],
    "REVIEW": [
        {"to": "IN_PROGRESS", "allowedRoles": ["buyer"]},
        {"to": "DISPUTED", "allowedRoles": ["buyer"]},
    ],
    "DISPUTED": [
        {"to": "CLOSED", "allowedRoles": ["admin"]},
        {"to": "IN_PROGRESS", "allowedRoles": ["admin"]},
    ],
}


@router.post("/{deal_id}/transition")
async def transition_deal(
    deal_id: str,
    data: DealTransitionSchema,
    background_tasks: BackgroundTasks,
    session: dict = Depends(require_buyer_or_vendor),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]
    target_status = data.action

    res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    is_buyer = deal.buyer_alias == alias
    is_vendor = deal.vendor_alias == alias
    if not is_buyer and not is_vendor:
        raise HTTPException(status_code=403, detail="Forbidden")

    caller_role = "buyer" if is_buyer else "vendor"

    # Verify transition is allowed
    allowed = TRANSITIONS.get(deal.status, [])
    transition = next((t for t in allowed if t["to"] == target_status and caller_role in t["allowedRoles"]), None)
    if not transition:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {deal.status} to {target_status} as {caller_role}"
        )

    # Perform update
    from_status = deal.status
    deal.status = target_status
    deal.updated_at = datetime.utcnow()
    if target_status == "CLOSED":
        deal.closed_at = datetime.utcnow()

    # DealEvent
    event = DealEvent(
        deal_id=deal_id,
        event_type="status_change",
        from_status=from_status,
        to_status=target_status,
        actor_alias=alias,
        note=data.note or f"Status changed to {target_status}",
        meta=data.metadata or {},
    )
    db.add(event)

    # System message in chat
    msg = Message(
        deal_id=deal_id,
        sender_alias=alias,
        encrypted_content=f"Deal status changed to {target_status}",
        message_type="system",
    )
    db.add(msg)

    # Audit log
    audit = AuditLog(
        actor_alias=alias,
        action_type="deal_transition",
        deal_id=deal_id,
        meta={"from": from_status, "to": target_status}
    )
    db.add(audit)

    # Notify other party
    other_alias = deal.vendor_alias if is_buyer else deal.buyer_alias
    if other_alias:
        notif = Notification(
            recipient_alias=other_alias,
            type="deal_status_change",
            content=f"Deal status changed to {target_status}",
            ref_id=deal_id,
        )
        db.add(notif)
        await db.commit()

        # Emit Socket.IO notification
        from app.sockets.manager import sio
        await sio.emit(
            "new-notification",
            {
                "id": notif.id,
                "type": notif.type,
                "content": notif.content,
                "ref_id": notif.ref_id,
                "read": False,
                "created_at": datetime.utcnow().isoformat() + "Z"
            },
            room=f"notifications-{other_alias}"
        )

        # Send email in background
        other_res = await db.execute(select(User.email).where(User.alias == other_alias))
        other_email = other_res.scalar()
        if other_email:
            background_tasks.add_task(
                send_deal_email_bg,
                other_email,
                "deal_status_change",
                {
                    "recipient_alias": other_alias,
                    "from_status": from_status,
                    "to_status": target_status,
                    "deal_id": deal_id
                }
            )
    else:
        await db.commit()

    # Handle completion trust event
    if target_status == "CLOSED" and deal.vendor_alias:
        db.add(TrustEvent(
            alias=deal.vendor_alias,
            event_type="deal_completed",
            score_delta=15.0,
            deal_id=deal_id,
        ))
        await db.commit()
        background_tasks.add_task(compute_trust_score, deal.vendor_alias, db)

    elif target_status == "CANCELLED" and deal.vendor_alias:
        db.add(TrustEvent(
            alias=deal.vendor_alias,
            event_type="deal_cancelled",
            score_delta=-8.0,
            deal_id=deal_id,
        ))
        await db.commit()
        background_tasks.add_task(compute_trust_score, deal.vendor_alias, db)

    return {"data": {"deal_id": deal_id, "newStatus": target_status}, "error": None}


# ─── POST /api/deals/{id}/close ───────────────────────────────────────
@router.post("/{deal_id}/close")
async def close_deal(
    deal_id: str,
    background_tasks: BackgroundTasks,
    session: dict = Depends(require_buyer),
    db: AsyncSession = Depends(get_db),
):
    buyer_alias = session["alias"]

    res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    if deal.buyer_alias != buyer_alias:
        raise HTTPException(status_code=403, detail="Forbidden")

    if deal.status != "REVIEW":
        raise HTTPException(
            status_code=400,
            detail=f"Deal must be in REVIEW state to close (current: {deal.status})"
        )

    deal.status = "CLOSED"
    deal.closed_at = datetime.utcnow()
    deal.updated_at = datetime.utcnow()

    # DealEvent
    db.add(DealEvent(
        deal_id=deal_id,
        event_type="deal_closed",
        from_status="REVIEW",
        to_status="CLOSED",
        actor_alias=buyer_alias,
        note="Deal closed by buyer",
    ))

    # System message
    db.add(Message(
        deal_id=deal_id,
        sender_alias=buyer_alias,
        encrypted_content="Deal has been closed. Both parties can now leave a review.",
        message_type="system",
    ))

    # Audit log
    db.add(AuditLog(
        action_type="deal_closed",
        actor_alias=buyer_alias,
        target_alias=deal.vendor_alias,
        deal_id=deal_id,
        meta={"from_status": "REVIEW", "to_status": "CLOSED"}
    ))

    # Notifications
    n_b = Notification(
        recipient_alias=buyer_alias,
        type="deal_status_change",
        content="Deal closed successfully. Please rate the vendor.",
        ref_id=deal_id,
    )
    n_v = Notification(
        recipient_alias=deal.vendor_alias,
        type="deal_status_change",
        content="Deal closed by buyer. Please rate the buyer.",
        ref_id=deal_id,
    )
    db.add(n_b)
    db.add(n_v)

    # Trust event
    if deal.vendor_alias:
        db.add(TrustEvent(
            alias=deal.vendor_alias,
            event_type="deal_completed",
            score_delta=15.0,
            deal_id=deal_id,
        ))

    # Increment completed_deals count in AliasDirectory for both buyer and vendor
    if deal.vendor_alias:
        res_ad = await db.execute(select(AliasDirectory).where(AliasDirectory.alias == deal.vendor_alias))
        ad = res_ad.scalar_one_or_none()
        if ad:
            ad.completed_deals = (ad.completed_deals or 0) + 1

    if deal.buyer_alias:
        res_ad_buyer = await db.execute(select(AliasDirectory).where(AliasDirectory.alias == deal.buyer_alias))
        ad_buyer = res_ad_buyer.scalar_one_or_none()
        if ad_buyer:
            ad_buyer.completed_deals = (ad_buyer.completed_deals or 0) + 1

    await db.commit()

    # Emit Socket.IO notifications
    from app.sockets.manager import sio
    for n in (n_b, n_v):
        await sio.emit(
            "new-notification",
            {
                "id": n.id,
                "type": n.type,
                "content": n.content,
                "ref_id": n.ref_id,
                "read": False,
                "created_at": datetime.utcnow().isoformat() + "Z"
            },
            room=f"notifications-{n.recipient_alias}"
        )

    # Recompute trust score in background
    if deal.vendor_alias:
        background_tasks.add_task(compute_trust_score, deal.vendor_alias, db)

    # Send email in background
    if deal.vendor_alias:
        v_res = await db.execute(select(User.email).where(User.alias == deal.vendor_alias))
        v_email = v_res.scalar()
        if v_email:
            background_tasks.add_task(
                send_deal_email_bg,
                v_email,
                "deal_status_change",
                {
                    "recipient_alias": deal.vendor_alias,
                    "from_status": "REVIEW",
                    "to_status": "CLOSED",
                    "deal_id": deal_id
                }
            )

    return {"data": {"deal_id": deal_id, "status": "CLOSED"}, "error": None}


# ─── PATCH /api/deals/{id}/price ──────────────────────────────────────
@router.patch("/{deal_id}/price")
async def update_deal_price(
    deal_id: str,
    data: DealPriceSchema,
    session: dict = Depends(require_buyer_or_vendor),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]

    res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    if deal.buyer_alias != alias and deal.vendor_alias != alias:
        raise HTTPException(status_code=403, detail="Forbidden")

    if deal.status not in ("NEGOTIATING", "CONTRACTED"):
        raise HTTPException(
            status_code=400,
            detail="Can only update price during NEGOTIATING or CONTRACTED phase"
        )

    old_price = deal.agreed_price
    deal.agreed_price = data.agreed_price
    deal.price_updated_at = datetime.utcnow()
    deal.updated_at = datetime.utcnow()

    # DealEvent
    db.add(DealEvent(
        deal_id=deal_id,
        event_type="price_updated",
        actor_alias=alias,
        note=f"Price updated from ${old_price} to ${data.agreed_price}",
        meta={"old_price": old_price, "new_price": data.agreed_price}
    ))

    # System message
    db.add(Message(
        deal_id=deal_id,
        sender_alias=alias,
        encrypted_content=f"Agreed price updated to ${data.agreed_price}",
        message_type="system",
    ))

    await db.commit()
    return {"data": {"deal_id": deal_id, "agreed_price": data.agreed_price}, "error": None}


# ─── GET /api/deals/{id}/events ───────────────────────────────────────
@router.get("/{deal_id}/events")
async def get_deal_events(
    deal_id: str,
    session: dict = Depends(require_buyer_or_vendor),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]

    # Verify participant
    res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    if deal.buyer_alias != alias and deal.vendor_alias != alias:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Fetch deal events
    events_res = await db.execute(
        select(DealEvent).where(DealEvent.deal_id == deal_id)
    )
    events = events_res.scalars().all()

    # Fetch chat messages
    messages_res = await db.execute(
        select(Message).where(Message.deal_id == deal_id)
    )
    messages = messages_res.scalars().all()

    combined = []
    for e in events:
        combined.append({
            "id": str(e.id),
            "deal_id": str(e.deal_id),
            "sender_alias": "SYSTEM",
            "encrypted_content": e.note or f"{e.event_type}: {e.from_status} -> {e.to_status}",
            "message_type": "system",
            "created_at": e.created_at.isoformat() if e.created_at else None,
        })

    for m in messages:
        combined.append({
            "id": str(m.id),
            "deal_id": str(m.deal_id),
            "sender_alias": m.sender_alias,
            "encrypted_content": m.encrypted_content,
            "message_type": m.message_type,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })

    # Sort by created_at ascending
    combined.sort(key=lambda x: x["created_at"] or "")

    return {"data": combined, "error": None}


# ─── POST /api/deals/{id}/events ──────────────────────────────────────
@router.post("/{deal_id}/events", status_code=201)
async def create_deal_event(
    deal_id: str,
    data: DealEventCreateSchema,
    session: dict = Depends(require_buyer_or_vendor),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]

    res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    if deal.buyer_alias != alias and deal.vendor_alias != alias:
        raise HTTPException(status_code=403, detail="Forbidden")

    if data.type == "MESSAGE":
        message = Message(
            deal_id=deal_id,
            sender_alias=alias,
            encrypted_content=data.content,
            message_type="text",
        )
        db.add(message)
        await db.commit()

        # Emit Socket.IO message in background/realtime
        from app.sockets.manager import sio
        await sio.emit(
            "new-message",
            {
                "id": str(message.id),
                "deal_id": str(message.deal_id),
                "sender_alias": message.sender_alias,
                "encrypted_content": message.encrypted_content,
                "message_type": message.message_type,
                "created_at": message.created_at.isoformat() + "Z"
            },
            room=f"deal-{deal_id}"
        )

        return {
            "data": {
                "message": {
                    "id": str(message.id),
                    "deal_id": str(message.deal_id),
                    "sender_alias": message.sender_alias,
                    "encrypted_content": message.encrypted_content,
                    "message_type": message.message_type,
                    "created_at": message.created_at.isoformat() + "Z",
                }
            },
            "error": None
        }

    raise HTTPException(status_code=400, detail="Unsupported event type")


# ─── POST /api/deals/{id}/review ──────────────────────────────────────
@router.post("/{deal_id}/review")
async def submit_deal_review(
    deal_id: str,
    data: DealReviewSchema,
    background_tasks: BackgroundTasks,
    session: dict = Depends(require_buyer_or_vendor),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]
    role = session["role"]

    res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # Verify status is CLOSED
    if deal.status != "CLOSED":
        raise HTTPException(status_code=400, detail="Can only review completed deals")

    is_buyer = deal.buyer_alias == alias
    is_vendor = deal.vendor_alias == alias
    if not is_buyer and not is_vendor:
        raise HTTPException(status_code=403, detail="Forbidden")

    reviewer_role = "buyer" if is_buyer else "vendor"
    reviewee_alias = deal.vendor_alias if is_buyer else deal.buyer_alias

    # Check duplicate review
    dup_res = await db.execute(
        select(Review).where(Review.deal_id == deal_id, Review.reviewer_role == reviewer_role)
    )
    if dup_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have already submitted a review for this deal")

    # Create review
    review = Review(
        deal_id=deal_id,
        reviewer_alias=alias,
        reviewee_alias=reviewee_alias,
        reviewer_role=reviewer_role,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)

    # Audit log
    db.add(AuditLog(
        actor_alias=alias,
        action_type="review_submitted",
        deal_id=deal_id,
        meta={"rating": data.rating, "reviewer_role": reviewer_role, "reviewee_alias": reviewee_alias}
    ))

    # Add trust points for receiving a review
    db.add(TrustEvent(
        alias=reviewee_alias,
        event_type="review_received",
        score_delta=data.rating * 0.5,  # trust points delta depends on rating
        deal_id=deal_id,
    ))

    notif = Notification(
        recipient_alias=reviewee_alias,
        type="review_received",
        content=f"You received a new {data.rating}-star review from an anonymous {reviewer_role}.",
        ref_id=deal_id,
    )
    db.add(notif)

    await db.commit()

    # Emit Socket.IO notification
    from app.sockets.manager import sio
    await sio.emit(
        "new-notification",
        {
            "id": notif.id,
            "type": notif.type,
            "content": notif.content,
            "ref_id": notif.ref_id,
            "read": False,
            "created_at": datetime.utcnow().isoformat() + "Z"
        },
        room=f"notifications-{reviewee_alias}"
    )

    # Recompute average rating and trust score in background
    if reviewer_role == "buyer":
        background_tasks.add_task(recompute_vendor_rating, reviewee_alias, db)
    else:
        background_tasks.add_task(recompute_buyer_rating, reviewee_alias, db)

    background_tasks.add_task(compute_trust_score, reviewee_alias, db)

    return {"data": {"id": review.id, "rating": data.rating}, "error": None}


# ─── GET /api/deals/{id}/reviews ──────────────────────────────────────
@router.get("/{deal_id}/reviews")
async def get_deal_reviews(
    deal_id: str,
    session: dict = Depends(require_buyer_or_vendor),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]

    # Verify participant
    res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    if deal.buyer_alias != alias and deal.vendor_alias != alias:
        raise HTTPException(status_code=403, detail="Forbidden")

    rev_res = await db.execute(select(Review).where(Review.deal_id == deal_id))
    reviews = rev_res.scalars().all()

    sanitized = []
    for r in reviews:
        # Hide actual reviewer alias: show role display instead
        sanitized.append({
            "id": r.id,
            "reviewer_role": r.reviewer_role,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {"data": sanitized, "error": None}


# ─── POST /api/deals/{id}/consent-reveal ──────────────────────────────
@router.post("/{deal_id}/consent-reveal")
async def consent_identity_reveal(
    deal_id: str,
    background_tasks: BackgroundTasks,
    session: dict = Depends(require_buyer_or_vendor),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]

    res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    if deal.status != "CLOSED":
        raise HTTPException(status_code=400, detail="Deal must be closed for identity reveal")

    is_buyer = deal.buyer_alias == alias
    is_vendor = deal.vendor_alias == alias
    if not is_buyer and not is_vendor:
        raise HTTPException(status_code=403, detail="Forbidden")

    if is_buyer:
        deal.buyer_consented_reveal = True
    else:
        deal.vendor_consented_reveal = True

    await db.commit()

    other_consented = deal.vendor_consented_reveal if is_buyer else deal.buyer_consented_reveal
    revealed = False

    if other_consented:
        # Both consented!
        deal.identity_revealed = True

        # Audit log
        db.add(AuditLog(
            actor_alias=alias,
            action_type="identity_revealed",
            deal_id=deal_id,
            meta={"buyer": deal.buyer_alias, "vendor": deal.vendor_alias}
        ))

        # In-app notifications
        n_b = Notification(
            recipient_alias=deal.buyer_alias,
            type="identity_revealed",
            content="Both parties consented — identity revealed via email.",
            ref_id=deal_id,
        )
        n_v = Notification(
            recipient_alias=deal.vendor_alias,
            type="identity_revealed",
            content="Both parties consented — identity revealed via email.",
            ref_id=deal_id,
        )
        db.add(n_b)
        db.add(n_v)
        await db.commit()

        # Emit Socket.IO notifications
        from app.sockets.manager import sio
        for n in (n_b, n_v):
            await sio.emit(
                "new-notification",
                {
                    "id": n.id,
                    "type": n.type,
                    "content": n.content,
                    "ref_id": n.ref_id,
                    "read": False,
                    "created_at": datetime.utcnow().isoformat() + "Z"
                },
                room=f"notifications-{n.recipient_alias}"
            )

        # Lookup emails for direct reveal email dispatch
        buyer_res = await db.execute(select(User.email).where(User.alias == deal.buyer_alias))
        buyer_email = buyer_res.scalar()

        vendor_res = await db.execute(select(User.email).where(User.alias == deal.vendor_alias))
        vendor_email = vendor_res.scalar()

        if buyer_email and vendor_email:
            background_tasks.add_task(
                send_reveal_email_bg,
                buyer_email,
                vendor_email,
                deal.buyer_alias,
                deal.vendor_alias,
                deal_id
            )

        # Audit log for email dispatch
        db.add(AuditLog(
            actor_alias=alias,
            action_type="reveal_email_sent",
            deal_id=deal_id,
            meta={"buyer": deal.buyer_alias, "vendor": deal.vendor_alias}
        ))
        await db.commit()

        # Recompute trust score in background
        if deal.vendor_alias:
            background_tasks.add_task(compute_trust_score, deal.vendor_alias, db)

        revealed = True

    return {
        "data": {
            "consented": True,
            "identity_revealed": revealed,
        },
        "error": None,
    }
