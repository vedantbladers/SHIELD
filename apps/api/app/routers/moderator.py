"""Moderator router — handles certifications, disputes, user list, trust overrides, and audit logs."""
import math
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, text
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth.dependencies import require_moderator
from app.models.models import User, Deal, Certification, TrustEvent, Notification, AuditLog, ModeratorAction, AliasDirectory, DealEvent
from app.mongodb.client import get_collection
from app.utils.trust_engine import compute_trust_score

router = APIRouter(prefix="/api/moderator", tags=["moderator"])


# ─── GET /api/moderator/dashboard/stats ───────────────────────────────
@router.get("/dashboard/stats")
async def get_moderator_stats(
    session: dict = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    # Counts in parallel via SQLAlchemy
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_vendors = (await db.execute(select(func.count(User.id)).where(User.role == "vendor"))).scalar() or 0
    total_buyers = (await db.execute(select(func.count(User.id)).where(User.role == "buyer"))).scalar() or 0

    total_certs = (await db.execute(select(func.count(Certification.id)))).scalar() or 0
    pending_certs = (await db.execute(select(func.count(Certification.id)).where(Certification.review_status == "PENDING"))).scalar() or 0
    approved_certs = (await db.execute(select(func.count(Certification.id)).where(Certification.review_status == "APPROVED"))).scalar() or 0
    rejected_certs = (await db.execute(select(func.count(Certification.id)).where(Certification.review_status == "REJECTED"))).scalar() or 0

    total_deals = (await db.execute(select(func.count(Deal.id)))).scalar() or 0
    active_deals = (await db.execute(select(func.count(Deal.id)).where(~Deal.status.in_(["CLOSED", "CANCELLED"])))).scalar() or 0
    total_disputes = (await db.execute(select(func.count(Deal.id)).where(Deal.status == "DISPUTED"))).scalar() or 0

    actions_res = await db.execute(
        select(ModeratorAction).order_by(ModeratorAction.created_at.desc()).limit(10)
    )
    recent_actions = actions_res.scalars().all()

    recent_actions_data = []
    for a in recent_actions:
        recent_actions_data.append({
            "id": a.id,
            "moderator_alias": a.moderator_alias,
            "action_type": a.action_type,
            "target_type": a.target_type,
            "target_id": a.target_id,
            "reason": a.reason,
            "meta": a.meta,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    return {
        "data": {
            "total_users": total_users,
            "total_vendors": total_vendors,
            "total_buyers": total_buyers,
            "total_certifications": total_certs,
            "pending_certifications": pending_certs,
            "approved_certifications": approved_certs,
            "rejected_certifications": rejected_certs,
            "total_deals": total_deals,
            "active_deals": active_deals,
            "total_disputes": total_disputes,
            "recent_actions": recent_actions_data,
        },
        "error": None,
    }


# ─── GET /api/moderator/certifications ────────────────────────────────
@router.get("/certifications")
async def get_moderator_certifications(
    status: str = "PENDING",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    session: dict = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    skip = (page - 1) * limit

    # Build query
    query = select(Certification)
    if status != "all":
        query = query.where(Certification.review_status == status)

    query = query.order_by(Certification.uploaded_at.desc())

    # Fetch total count
    count_query = select(func.count(Certification.id))
    if status != "all":
        count_query = count_query.where(Certification.review_status == status)
    total = (await db.execute(count_query)).scalar() or 0

    # Fetch items with vendor relation loaded
    res = await db.execute(
        query.options(selectinload(Certification.vendor)).offset(skip).limit(limit)
    )
    items = res.scalars().all()

    items_data = []
    for c in items:
        vendor_data = None
        if c.vendor:
            vendor_data = {
                "alias": c.vendor.alias,
                "role": c.vendor.role,
                "trust_score": c.vendor.trust_score,
            }
        items_data.append({
            "id": c.id,
            "vendor_alias": c.vendor_alias,
            "cert_name": c.cert_name,
            "cert_type": c.cert_type,
            "file_url": c.file_url,
            "verified": c.verified,
            "verification_score": c.verification_score,
            "uploaded_at": c.uploaded_at.isoformat() if c.uploaded_at else None,
            "verified_at": c.verified_at.isoformat() if c.verified_at else None,
            "review_status": c.review_status,
            "reviewed_by": c.reviewed_by,
            "reviewed_at": c.reviewed_at.isoformat() if c.reviewed_at else None,
            "rejection_reason": c.rejection_reason,
            "vendor": vendor_data,
        })

    return {
        "data": {
            "items": items_data,
            "total": total,
            "page": page,
            "pages": math.ceil(total / limit),
        },
        "error": None,
    }


# ─── GET /api/moderator/certifications/{id} ───────────────────────────
@router.get("/certifications/{cert_id}")
async def get_moderator_cert_detail(
    cert_id: str,
    session: dict = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Certification)
        .options(selectinload(Certification.vendor), selectinload(Certification.reviewer))
        .where(Certification.id == cert_id)
    )
    c = res.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Certification not found")

    vendor_data = None
    if c.vendor:
        vendor_data = {
            "alias": c.vendor.alias,
            "role": c.vendor.role,
            "trust_score": c.vendor.trust_score,
        }

    reviewer_data = None
    if c.reviewer:
        reviewer_data = {
            "alias": c.reviewer.alias,
        }

    # Fetch vendor's MongoDB profile
    vendor_profile = None
    try:
        col = await get_collection("vendor_profiles")
        vendor_profile = await col.find_one({"alias": c.vendor_alias})
        if vendor_profile:
            vendor_profile["_id"] = str(vendor_profile["_id"])
            if "created_at" in vendor_profile and isinstance(vendor_profile["created_at"], datetime):
                vendor_profile["created_at"] = vendor_profile["created_at"].isoformat()
            if "updated_at" in vendor_profile and isinstance(vendor_profile["updated_at"], datetime):
                vendor_profile["updated_at"] = vendor_profile["updated_at"].isoformat()
    except Exception:
        pass

    cert_data = {
        "id": c.id,
        "vendor_alias": c.vendor_alias,
        "cert_name": c.cert_name,
        "cert_type": c.cert_type,
        "file_url": c.file_url,
        "verified": c.verified,
        "verification_score": c.verification_score,
        "uploaded_at": c.uploaded_at.isoformat() if c.uploaded_at else None,
        "verified_at": c.verified_at.isoformat() if c.verified_at else None,
        "review_status": c.review_status,
        "reviewed_by": c.reviewed_by,
        "reviewed_at": c.reviewed_at.isoformat() if c.reviewed_at else None,
        "rejection_reason": c.rejection_reason,
        "vendor": vendor_data,
        "reviewer": reviewer_data,
    }

    return {
        "data": {
            "certification": cert_data,
            "vendor_profile": vendor_profile,
        },
        "error": None,
    }


# ─── POST /api/moderator/certifications/{id}/review ───────────────────
@router.post("/certifications/{cert_id}/review")
async def review_certification(
    cert_id: str,
    body: dict,
    background_tasks: BackgroundTasks,
    session: dict = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    action = body.get("action")
    score = body.get("score")
    reason = body.get("reason")

    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail='action must be "approve" or "reject"')

    if action == "approve":
        if score is None or not isinstance(score, int) or score < 0 or score > 100:
            raise HTTPException(status_code=400, detail="score must be an integer between 0 and 100")
    else:
        if not reason or not isinstance(reason, str) or len(reason.strip()) == 0:
            raise HTTPException(status_code=400, detail="reason is required for rejection")

    res = await db.execute(select(Certification).where(Certification.id == cert_id))
    cert = res.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certification not found")

    if cert.review_status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Certification already reviewed (status: {cert.review_status})")

    mod_alias = session["alias"]

    if action == "approve":
        # 1. Update Certification
        cert.review_status = "APPROVED"
        cert.verified = True
        cert.verification_score = score
        cert.reviewed_by = mod_alias
        cert.reviewed_at = datetime.utcnow()
        cert.verified_at = datetime.utcnow()

        # 2. Trust Event (+10)
        db.add(TrustEvent(
            alias=cert.vendor_alias,
            event_type="cert_approved",
            score_delta=10.0,
            meta={"cert_id": cert_id, "cert_name": cert.cert_name, "score": score}
        ))
        await db.commit()

        # 3. Recompute trust score
        new_trust_score = await compute_trust_score(cert.vendor_alias, db)

        # 4. Update badges
        dir_res = await db.execute(select(AliasDirectory).where(AliasDirectory.alias == cert.vendor_alias))
        directory = dir_res.scalar_one_or_none()
        if directory:
            badges = directory.cert_badges or []
            if cert.cert_name not in badges:
                # Need to update array (cautions with direct assignment)
                directory.cert_badges = badges + [cert.cert_name]

        # 5. ModeratorAction
        db.add(ModeratorAction(
            moderator_alias=mod_alias,
            action_type="CERT_APPROVED",
            target_type="CERTIFICATION",
            target_id=cert_id,
            reason=reason or None,
            meta={"cert_name": cert.cert_name, "vendor_alias": cert.vendor_alias, "score": score, "new_trust_score": new_trust_score}
        ))

        # 6. Notification
        notif = Notification(
            recipient_alias=cert.vendor_alias,
            type="cert_approved",
            content=f"Your certification \"{cert.cert_name}\" has been approved with a score of {score}/100.",
            ref_id=cert_id
        )
        db.add(notif)

        # 8. Audit Log
        db.add(AuditLog(
            actor_alias=mod_alias,
            action_type="cert_review",
            target_alias=cert.vendor_alias,
            meta={"cert_id": cert_id, "action": "approve", "score": score, "cert_name": cert.cert_name, "new_trust_score": new_trust_score}
        ))

        await db.commit()

        # Emit Socket.IO
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
            room=f"notifications-{cert.vendor_alias}"
        )

        return {
            "data": {
                "certification": {
                    "id": cert.id,
                    "review_status": "APPROVED",
                    "verified": True,
                    "verification_score": score,
                },
                "trust_score": new_trust_score,
            },
            "error": None
        }

    else:
        # Reject Flow
        cert.review_status = "REJECTED"
        cert.verified = False
        cert.verification_score = 0
        cert.reviewed_by = mod_alias
        cert.reviewed_at = datetime.utcnow()
        cert.rejection_reason = reason

        # Trust Event (-5)
        db.add(TrustEvent(
            alias=cert.vendor_alias,
            event_type="cert_rejected",
            score_delta=-5.0,
            meta={"cert_id": cert_id, "cert_name": cert.cert_name, "reason": reason}
        ))
        await db.commit()

        # Recompute trust score
        new_trust_score = await compute_trust_score(cert.vendor_alias, db)

        # Moderator Action
        db.add(ModeratorAction(
            moderator_alias=mod_alias,
            action_type="CERT_REJECTED",
            target_type="CERTIFICATION",
            target_id=cert_id,
            reason=reason,
            meta={"cert_name": cert.cert_name, "vendor_alias": cert.vendor_alias, "reason": reason, "new_trust_score": new_trust_score}
        ))

        # Notification
        notif = Notification(
            recipient_alias=cert.vendor_alias,
            type="cert_rejected",
            content=f"Your certification \"{cert.cert_name}\" has been rejected. Reason: {reason}",
            ref_id=cert_id
        )
        db.add(notif)

        # Audit Log
        db.add(AuditLog(
            actor_alias=mod_alias,
            action_type="cert_review",
            target_alias=cert.vendor_alias,
            meta={"cert_id": cert_id, "action": "reject", "reason": reason, "cert_name": cert.cert_name, "new_trust_score": new_trust_score}
        ))

        await db.commit()

        # Emit Socket.IO
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
            room=f"notifications-{cert.vendor_alias}"
        )

        return {
            "data": {
                "certification": {
                    "id": cert.id,
                    "review_status": "REJECTED",
                    "verified": False,
                    "verification_score": 0,
                    "rejection_reason": reason,
                },
                "trust_score": new_trust_score,
            },
            "error": None
        }


# ─── GET /api/moderator/disputes ──────────────────────────────────────
@router.get("/disputes")
async def get_disputes_list(
    status: str = "DISPUTED",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    session: dict = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    skip = (page - 1) * limit

    query = select(Deal)
    if status != "all":
        query = query.where(Deal.status == status)

    query = query.order_by(Deal.updated_at.desc())

    # Count
    count_query = select(func.count(Deal.id))
    if status != "all":
        count_query = count_query.where(Deal.status == status)
    total = (await db.execute(count_query)).scalar() or 0

    # Execute
    res = await db.execute(
        query.options(selectinload(Deal.buyer), selectinload(Deal.vendor), selectinload(Deal.deal_events)).offset(skip).limit(limit)
    )
    items = res.scalars().all()

    items_data = []
    for d in items:
        buyer_data = {"alias": d.buyer.alias, "trust_score": d.buyer.trust_score} if d.buyer else None
        vendor_data = {"alias": d.vendor.alias, "trust_score": d.vendor.trust_score} if d.vendor else None
        
        events_data = []
        # Sort and take 5
        sorted_events = sorted(d.deal_events, key=lambda x: x.created_at or datetime.min, reverse=True)[:5]
        for e in sorted_events:
            events_data.append({
                "id": e.id,
                "event_type": e.event_type,
                "from_status": e.from_status,
                "to_status": e.to_status,
                "actor_alias": e.actor_alias,
                "note": e.note,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            })

        items_data.append({
            "id": d.id,
            "buyer_alias": d.buyer_alias,
            "vendor_alias": d.vendor_alias,
            "requirement_id": d.requirement_id,
            "status": d.status,
            "agreed_price": d.agreed_price,
            "original_price": d.original_price,
            "currency": d.currency,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "updated_at": d.updated_at.isoformat() if d.updated_at else None,
            "buyer": buyer_data,
            "vendor": vendor_data,
            "deal_events": events_data,
        })

    return {
        "data": {
            "items": items_data,
            "total": total,
            "page": page,
            "pages": math.ceil(total / limit),
        },
        "error": None,
    }


# ─── POST /api/moderator/disputes/{dealId}/resolve ────────────────────
@router.post("/disputes/{deal_id}/resolve")
async def resolve_dispute(
    deal_id: str,
    body: dict,
    background_tasks: BackgroundTasks,
    session: dict = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    resolution = body.get("resolution")
    reason = body.get("reason")
    buyer_adj = int(body.get("buyer_trust_adjustment", 0))
    vendor_adj = int(body.get("vendor_trust_adjustment", 0))

    if resolution not in ("buyer_favor", "vendor_favor", "mutual"):
        raise HTTPException(status_code=400, detail='resolution must be "buyer_favor", "vendor_favor", or "mutual"')

    if not reason or not isinstance(reason, str) or len(reason.strip()) == 0:
        raise HTTPException(status_code=400, detail="reason is required")

    if not (-20 <= buyer_adj <= 20) or not (-20 <= vendor_adj <= 20):
        raise HTTPException(status_code=400, detail="trust adjustments must be between -20 and 20")

    res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    if deal.status != "DISPUTED":
        raise HTTPException(status_code=400, detail=f"Deal is not in DISPUTED status (current: {deal.status})")

    # Update Deal to RESOLVED
    deal.status = "RESOLVED"
    deal.closed_at = datetime.utcnow()
    deal.updated_at = datetime.utcnow()

    # DealEvent
    db.add(DealEvent(
        deal_id=deal_id,
        event_type="dispute_resolved",
        from_status="DISPUTED",
        to_status="RESOLVED",
        actor_alias=session["alias"],
        note=reason,
        meta={"resolution": resolution, "buyer_adj": buyer_adj, "vendor_adj": vendor_adj}
    ))

    # Apply adjustments + recomputes
    if buyer_adj != 0:
        db.add(TrustEvent(
            alias=deal.buyer_alias,
            event_type="dispute_resolution",
            score_delta=float(buyer_adj),
            deal_id=deal_id,
            meta={"resolution": resolution, "role": "buyer", "reason": reason}
        ))
        await db.commit()
        background_tasks.add_task(compute_trust_score, deal.buyer_alias, db)

    if vendor_adj != 0 and deal.vendor_alias:
        db.add(TrustEvent(
            alias=deal.vendor_alias,
            event_type="dispute_resolution",
            score_delta=float(vendor_adj),
            deal_id=deal_id,
            meta={"resolution": resolution, "role": "vendor", "reason": reason}
        ))
        await db.commit()
        background_tasks.add_task(compute_trust_score, deal.vendor_alias, db)

    # ModeratorAction
    db.add(ModeratorAction(
        moderator_alias=session["alias"],
        action_type="DISPUTE_RESOLVED",
        target_type="DEAL",
        target_id=deal_id,
        reason=reason,
        meta={"resolution": resolution, "buyer_alias": deal.buyer_alias, "vendor_alias": deal.vendor_alias, "buyer_adj": buyer_adj, "vendor_adj": vendor_adj}
    ))

    # Notifications
    b_notif = Notification(
        recipient_alias=deal.buyer_alias,
        type="dispute_resolved",
        content=f"Dispute for deal has been resolved ({resolution}). Reason: {reason}",
        ref_id=deal_id
    )
    db.add(b_notif)

    v_notif = None
    if deal.vendor_alias:
        v_notif = Notification(
            recipient_alias=deal.vendor_alias,
            type="dispute_resolved",
            content=f"Dispute for deal has been resolved ({resolution}). Reason: {reason}",
            ref_id=deal_id
        )
        db.add(v_notif)

    # Audit Log
    db.add(AuditLog(
        actor_alias=session["alias"],
        action_type="dispute_resolved",
        deal_id=deal_id,
        meta={"resolution": resolution, "reason": reason, "buyer_alias": deal.buyer_alias, "vendor_alias": deal.vendor_alias, "buyer_adj": buyer_adj, "vendor_adj": vendor_adj}
    ))

    await db.commit()

    # Emit Socket.IO
    from app.sockets.manager import sio
    await sio.emit(
        "new-notification",
        {
            "id": b_notif.id,
            "type": b_notif.type,
            "content": b_notif.content,
            "ref_id": b_notif.ref_id,
            "read": False,
            "created_at": datetime.utcnow().isoformat() + "Z"
        },
        room=f"notifications-{deal.buyer_alias}"
    )
    if v_notif and deal.vendor_alias:
        await sio.emit(
            "new-notification",
            {
                "id": v_notif.id,
                "type": v_notif.type,
                "content": v_notif.content,
                "ref_id": v_notif.ref_id,
                "read": False,
                "created_at": datetime.utcnow().isoformat() + "Z"
            },
            room=f"notifications-{deal.vendor_alias}"
        )

    return {"data": {"deal_id": deal_id, "resolution": resolution, "reason": reason}, "error": None}


# ─── GET /api/moderator/users ─────────────────────────────────────────
@router.get("/users")
async def get_users_list(
    role: str = "all",
    search: str = "",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = "created_at",
    order: str = "desc",
    session: dict = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    skip = (page - 1) * limit
    mod_alias = session["alias"]

    # Sorting
    if sort not in ("created_at", "trust_score", "alias"):
        sort = "created_at"
    
    order_col = getattr(User, sort)
    order_clause = order_col.asc() if order == "asc" else order_col.desc()

    # Base query
    query = select(User).where(User.alias != mod_alias)

    if role != "all":
        query = query.where(User.role == role)

    if search:
        query = query.where(User.alias.ilike(f"%{search}%"))

    # Count
    count_query = select(func.count(User.id)).where(User.alias != mod_alias)
    if role != "all":
        count_query = count_query.where(User.role == role)
    if search:
        count_query = count_query.where(User.alias.ilike(f"%{search}%"))
    total = (await db.execute(count_query)).scalar() or 0

    # Execute
    res = await db.execute(query.order_by(order_clause).offset(skip).limit(limit))
    users = res.scalars().all()

    # Fetch certification counts
    user_aliases = [u.alias for u in users]
    cert_counts = {}
    if user_aliases:
        cnt_res = await db.execute(
            select(Certification.vendor_alias, func.count(Certification.id))
            .where(Certification.vendor_alias.in_(user_aliases))
            .group_by(Certification.vendor_alias)
        )
        cert_counts = {row[0]: row[1] for row in cnt_res.all()}

    items_data = []
    for u in users:
        items_data.append({
            "id": u.id,
            "alias": u.alias,
            "role": u.role,
            "trust_score": u.trust_score,
            "email_verified": u.email_verified,
            "onboarding_complete": u.onboarding_complete,
            "rating_as_vendor": u.rating_as_vendor,
            "rating_as_buyer": u.rating_as_buyer,
            "total_vendor_reviews": u.total_vendor_reviews,
            "total_buyer_reviews": u.total_buyer_reviews,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "cert_count": cert_counts.get(u.alias, 0),
        })

    return {
        "data": {
            "items": items_data,
            "total": total,
            "page": page,
            "pages": math.ceil(total / limit),
        },
        "error": None,
    }


# ─── POST /api/moderator/users/{alias}/trust ──────────────────────────
@router.post("/users/{alias}/trust")
async def adjust_user_trust(
    alias: str,
    body: dict,
    background_tasks: BackgroundTasks,
    session: dict = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    adjustment = body.get("adjustment")
    reason = body.get("reason")

    if adjustment is None or not isinstance(adjustment, (int, float)) or not (-50 <= adjustment <= 50):
        raise HTTPException(status_code=400, detail="adjustment must be a number between -50 and 50")

    if not reason or not isinstance(reason, str) or len(reason.strip()) == 0:
        raise HTTPException(status_code=400, detail="reason is required")

    res = await db.execute(select(User).where(User.alias == alias))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    mod_alias = session["alias"]

    # 1. TrustEvent
    db.add(TrustEvent(
        alias=alias,
        event_type="moderator_adjustment",
        score_delta=float(adjustment),
        meta={"reason": reason, "adjusted_by": mod_alias}
    ))
    await db.commit()

    # 2. Recompute
    new_trust_score = await compute_trust_score(alias, db)

    # 3. ModeratorAction
    db.add(ModeratorAction(
        moderator_alias=mod_alias,
        action_type="USER_TRUST_ADJUSTED",
        target_type="USER",
        target_id=user.id,
        reason=reason,
        meta={"alias": alias, "adjustment": adjustment, "previous_score": user.trust_score, "new_trust_score": new_trust_score}
    ))

    # 4. Notification
    notif = Notification(
        recipient_alias=alias,
        type="trust_adjusted",
        content=f"Your trust score has been adjusted by {adjustment:+.1f if adjustment != 0 else 0}. Reason: {reason}",
        ref_id=user.id
    )
    db.add(notif)

    # 6. AuditLog
    db.add(AuditLog(
        actor_alias=mod_alias,
        action_type="trust_adjustment",
        target_alias=alias,
        meta={"adjustment": adjustment, "reason": reason, "previous_score": user.trust_score, "new_trust_score": new_trust_score}
    ))
    await db.commit()

    # Emit Socket.IO
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
        room=f"notifications-{alias}"
    )

    return {
        "data": {
            "alias": alias,
            "new_trust_score": new_trust_score,
            "adjustment": adjustment,
        },
        "error": None
    }


# ─── GET /api/moderator/actions ───────────────────────────────────────
@router.get("/actions")
async def get_moderator_actions_list(
    action_type: str = None,
    moderator_alias: str = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    session: dict = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    skip = (page - 1) * limit

    query = select(ModeratorAction).options(selectinload(ModeratorAction.moderator))
    
    if action_type:
        query = query.where(ModeratorAction.action_type == action_type)
    if moderator_alias:
        query = query.where(ModeratorAction.moderator_alias == moderator_alias)

    query = query.order_by(ModeratorAction.created_at.desc())

    # Count
    count_query = select(func.count(ModeratorAction.id))
    if action_type:
        count_query = count_query.where(ModeratorAction.action_type == action_type)
    if moderator_alias:
        count_query = count_query.where(ModeratorAction.moderator_alias == moderator_alias)
    total = (await db.execute(count_query)).scalar() or 0

    res = await db.execute(query.offset(skip).limit(limit))
    items = res.scalars().all()

    items_data = []
    for a in items:
        mod_data = {"alias": a.moderator.alias, "role": a.moderator.role} if a.moderator else None
        items_data.append({
            "id": a.id,
            "moderator_alias": a.moderator_alias,
            "action_type": a.action_type,
            "target_type": a.target_type,
            "target_id": a.target_id,
            "reason": a.reason,
            "meta": a.meta,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "moderator": mod_data,
        })

    return {
        "data": {
            "items": items_data,
            "total": total,
            "page": page,
            "pages": math.ceil(total / limit),
        },
        "error": None,
    }


# ─── GET /api/moderator/audit-log ─────────────────────────────────────
@router.get("/audit-log")
async def get_audit_log_list(
    action_type: str = "",
    actor_alias: str = "",
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    session: dict = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    skip = (page - 1) * limit

    query = select(AuditLog).options(selectinload(AuditLog.actor))
    
    if action_type:
        query = query.where(AuditLog.action_type == action_type)
    if actor_alias:
        query = query.where(AuditLog.actor_alias == actor_alias)

    query = query.order_by(AuditLog.created_at.desc())

    # Count
    count_query = select(func.count(AuditLog.id))
    if action_type:
        count_query = count_query.where(AuditLog.action_type == action_type)
    if actor_alias:
        count_query = count_query.where(AuditLog.actor_alias == actor_alias)
    total = (await db.execute(count_query)).scalar() or 0

    res = await db.execute(query.offset(skip).limit(limit))
    items = res.scalars().all()

    items_data = []
    for log in items:
        actor_data = {"alias": log.actor.alias, "role": log.actor.role} if log.actor else None
        items_data.append({
            "id": log.id,
            "action_type": log.action_type,
            "actor_alias": log.actor_alias,
            "target_alias": log.target_alias,
            "deal_id": log.deal_id,
            "meta": log.meta,
            "ip_hash": log.ip_hash,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "actor": actor_data,
        })

    return {
        "data": {
            "items": items_data,
            "total": total,
            "page": page,
            "pages": math.ceil(total / limit),
        },
        "error": None,
    }
