"""Vendor router — handles opportunities, proposals, profile, certifications, and stats."""
import os
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, File, UploadFile, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from bson.objectid import ObjectId
import math

from app.database import get_db
from app.auth.dependencies import require_vendor, get_current_session
from app.models.models import User, Deal, Certification, TrustEvent, Notification, Review, AuditLog, AliasDirectory
from app.mongodb.client import get_collection
from app.schemas.vendor import ProposalSchema, VendorProfileSchema
from app.utils.trust_engine import compute_trust_score
from app.email.mailer import send_email
from app.email.templates import build_new_proposal_email
from app.config import settings

router = APIRouter(prefix="/api/vendor", tags=["vendor"])


def send_proposal_email_bg(buyer_email: str, recipient_alias: str, vendor_alias: str, req_title: str, price: float):
    """Send proposal email in background."""
    html = build_new_proposal_email(
        recipient_alias=recipient_alias,
        vendor_alias=vendor_alias,
        requirement_title=req_title,
        proposed_price=f"{price:.2f}",
        app_url=settings.app_url
    )
    send_email(buyer_email, "New Proposal Received — SHIELD", html)


# ─── GET /api/vendor/dashboard/stats ──────────────────────────────────
@router.get("/dashboard/stats")
async def get_vendor_stats(
    session: dict = Depends(require_vendor),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]
    now = datetime.utcnow()
    month_start = datetime(now.getFullYear() if hasattr(now, "getFullYear") else now.year, now.getMonth() + 1 if hasattr(now, "getMonth") else now.month, 1)

    # 1. MongoDB queries
    req_col = await get_collection("buyer_requirements")
    prop_col = await get_collection("proposals")

    open_opportunities = await req_col.count_documents({"status": "open"})
    active_proposals = await prop_col.count_documents({"vendor_alias": alias, "status": "pending"})

    # 2. PostgreSQL queries
    active_deals_count = (await db.execute(
        select(Deal).where(
            Deal.vendor_alias == alias,
            Deal.status.in_(["CONTRACTED", "IN_PROGRESS", "REVIEW"])
        )
    )).scalars().all()

    closed_deals = (await db.execute(
        select(Deal).where(
            Deal.vendor_alias == alias,
            Deal.status == "CLOSED",
            Deal.closed_at >= month_start
        )
    )).scalars().all()

    earnings = sum(d.agreed_price or 0.0 for d in closed_deals)

    user_res = await db.execute(select(User.trust_score).where(User.alias == alias))
    trust_score = user_res.scalar() or 0.0

    return {
        "data": {
            "open_opportunities": open_opportunities,
            "active_proposals": active_proposals,
            "active_deals": len(active_deals_count),
            "trust_score": trust_score,
            "earnings_this_month": earnings,
        },
        "error": None,
    }


# ─── GET /api/vendor/marketplace ──────────────────────────────────────
@router.get("/marketplace")
async def get_vendor_marketplace(
    page: int = Query(1, ge=1),
    sort: str = Query("newest"),
    session: dict = Depends(require_vendor),
):
    limit = 10
    skip = (page - 1) * limit

    col = await get_collection("buyer_requirements")

    sort_obj = [("created_at", -1)]
    if sort == "budget_high":
        sort_obj = [("budget_range.max", -1)]
    elif sort == "budget_low":
        sort_obj = [("budget_range.min", 1)]
    elif sort == "urgency":
        # urgeny sorting: custom sort using weights is typical, but we can sort by urgency desc as text for now
        sort_obj = [("urgency", -1)]

    cursor = col.find({"status": "open"}).sort(sort_obj).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    total = await col.count_documents({"status": "open"})

    for item in items:
        item["_id"] = str(item["_id"])
        if "created_at" in item and isinstance(item["created_at"], datetime):
            item["created_at"] = item["created_at"].isoformat()
        if "updated_at" in item and isinstance(item["updated_at"], datetime):
            item["updated_at"] = item["updated_at"].isoformat()

    return {
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "pages": math.ceil(total / limit),
        },
        "error": None,
    }


# ─── GET /api/vendor/marketplace/{id} ─────────────────────────────────
@router.get("/marketplace/{req_id}")
async def get_marketplace_detail(
    req_id: str,
    session: dict = Depends(require_vendor),
):
    alias = session["alias"]

    if not ObjectId.is_valid(req_id):
        raise HTTPException(status_code=400, detail="Invalid requirement ID")

    col = await get_collection("buyer_requirements")
    doc = await col.find_one({"_id": ObjectId(req_id)})

    if not doc:
        raise HTTPException(status_code=404, detail="Requirement not found")

    # Check if vendor already has a proposal
    prop_col = await get_collection("proposals")
    existing = await prop_col.find_one({
        "requirement_id": req_id,
        "vendor_alias": alias,
        "status": {"$ne": "withdrawn"}
    })

    # Format document
    doc["_id"] = str(doc["_id"])
    if "created_at" in doc and isinstance(doc["created_at"], datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    if "updated_at" in doc and isinstance(doc["updated_at"], datetime):
        doc["updated_at"] = doc["updated_at"].isoformat()

    existing_proposal = None
    if existing:
        existing["_id"] = str(existing["_id"])
        if "created_at" in existing and isinstance(existing["created_at"], datetime):
            existing["created_at"] = existing["created_at"].isoformat()
        existing_proposal = existing

    return {
        "data": {
            "requirement": doc,
            "existing_proposal": existing_proposal,
        },
        "error": None,
    }


# ─── GET /api/vendor/proposals ────────────────────────────────────────
@router.get("/proposals")
async def get_vendor_proposals(
    session: dict = Depends(require_vendor),
):
    alias = session["alias"]
    prop_col = await get_collection("proposals")
    items = await prop_col.find({"vendor_alias": alias}).sort("created_at", -1).to_list(length=1000)

    # Fetch requirement titles
    req_ids = list(set(p["requirement_id"] for p in items if ObjectId.is_valid(p["requirement_id"])))
    req_col = await get_collection("buyer_requirements")
    reqs = await req_col.find({"_id": {"$in": [ObjectId(rid) for rid in req_ids]}}).to_list(length=1000)
    req_map = {str(r["_id"]): r["title"] for r in reqs}

    enriched = []
    for p in items:
        p["_id"] = str(p["_id"])
        if "created_at" in p and isinstance(p["created_at"], datetime):
            p["created_at"] = p["created_at"].isoformat()
        enriched.append({
            **p,
            "requirement_title": req_map.get(p["requirement_id"], "Unknown"),
        })

    return {"data": enriched, "error": None}


# ─── POST /api/vendor/proposals ───────────────────────────────────────
@router.post("/proposals", status_code=201)
async def submit_proposal(
    data: ProposalSchema,
    background_tasks: BackgroundTasks,
    session: dict = Depends(require_vendor),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]

    if not ObjectId.is_valid(data.requirement_id):
        raise HTTPException(status_code=400, detail="Invalid requirement ID")

    # Verify requirement exists and is open/matched
    req_col = await get_collection("buyer_requirements")
    req = await req_col.find_one({"_id": ObjectId(data.requirement_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    if req["status"] not in ("open", "matched"):
        raise HTTPException(status_code=400, detail="Requirement is not accepting proposals")

    # Check if already submitted
    prop_col = await get_collection("proposals")
    existing = await prop_col.find_one({
        "requirement_id": data.requirement_id,
        "vendor_alias": alias,
        "status": {"$ne": "withdrawn"}
    })
    if existing:
        raise HTTPException(status_code=409, detail="You already have a proposal for this requirement")

    # Insert proposal
    doc = {
        "requirement_id": data.requirement_id,
        "buyer_alias": req["alias"],
        "vendor_alias": alias,
        "cover_note": data.cover_note,
        "proposed_price": data.proposed_price,
        "proposed_timeline_weeks": data.proposed_timeline_weeks,
        "methodology": data.methodology,
        "relevant_experience": data.relevant_experience,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await prop_col.insert_one(doc)
    doc_id = str(result.inserted_id)

    # Update requirement proposal count and matched aliases
    await req_col.update_one(
        {"_id": ObjectId(data.requirement_id)},
        {
            "$inc": {"proposal_count": 1},
            "$addToSet": {"matched_vendor_aliases": alias},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )

    # Create notification for buyer in Postgres
    notif = Notification(
        recipient_alias=req["alias"],
        type="new_proposal",
        content=f"{alias} submitted a proposal for \"{req['title']}\"",
        ref_id=data.requirement_id
    )
    db.add(notif)
    await db.commit()

    # Emit Socket.IO notification in background (mounted on app.state)
    # Since Socket.IO is mounted on socket_app or main, we can trigger events
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
        room=f"notifications-{req['alias']}"
    )

    # Send email to buyer in background
    buyer_res = await db.execute(select(User.email).where(User.alias == req["alias"]))
    buyer_email = buyer_res.scalar()
    if buyer_email:
        background_tasks.add_task(
            send_proposal_email_bg,
            buyer_email,
            req["alias"],
            alias,
            req["title"],
            data.proposed_price
        )

    # Recompute trust score in background
    background_tasks.add_task(compute_trust_score, alias, db)

    return {"data": {"id": doc_id}, "error": None}


# ─── PATCH /api/vendor/proposals/{id} ─────────────────────────────────
@router.patch("/proposals/{prop_id}")
async def withdraw_proposal(
    prop_id: str,
    session: dict = Depends(require_vendor),
):
    alias = session["alias"]

    if not ObjectId.is_valid(prop_id):
        raise HTTPException(status_code=400, detail="Invalid proposal ID")

    col = await get_collection("proposals")
    doc = await col.find_one({"_id": ObjectId(prop_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if doc["vendor_alias"] != alias:
        raise HTTPException(status_code=403, detail="Forbidden")

    if doc["status"] != "pending":
        raise HTTPException(status_code=400, detail="Can only withdraw pending proposals")

    await col.update_one(
        {"_id": ObjectId(prop_id)},
        {"$set": {"status": "withdrawn", "updated_at": datetime.utcnow()}}
    )

    return {"data": {"id": prop_id, "status": "withdrawn"}, "error": None}


# ─── GET /api/vendor/profile ──────────────────────────────────────────
@router.get("/profile")
async def get_vendor_profile(
    session: dict = Depends(require_vendor),
):
    alias = session["alias"]
    col = await get_collection("vendor_profiles")
    doc = await col.find_one({"alias": alias})

    if doc:
        doc["_id"] = str(doc["_id"])
        if "created_at" in doc and isinstance(doc["created_at"], datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        if "updated_at" in doc and isinstance(doc["updated_at"], datetime):
            doc["updated_at"] = doc["updated_at"].isoformat()

    return {"data": doc or None, "error": None}


# ─── PATCH /api/vendor/profile ────────────────────────────────────────
@router.patch("/profile")
async def update_vendor_profile(
    data: VendorProfileSchema,
    session: dict = Depends(require_vendor),
):
    alias = session["alias"]
    col = await get_collection("vendor_profiles")

    parsed = data.dict()
    parsed["updated_at"] = datetime.utcnow()

    await col.update_one(
        {"alias": alias},
        {
            "$set": parsed,
            "$setOnInsert": {
                "alias": alias,
                "is_active": True,
                "created_at": datetime.utcnow(),
            }
        },
        upsert=True
    )

    return {"data": {"updated": True}, "error": None}


# ─── GET /api/vendor/certifications ───────────────────────────────────
@router.get("/certifications")
async def get_vendor_certifications(
    session: dict = Depends(require_vendor),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]
    res = await db.execute(
        select(Certification)
        .where(Certification.vendor_alias == alias)
        .order_by(Certification.uploaded_at.desc())
    )
    certs = res.scalars().all()

    enriched = []
    for c in certs:
        enriched.append({
            "id": c.id,
            "vendor_alias": c.vendor_alias,
            "cert_name": c.cert_name,
            "cert_type": c.cert_type,
            "file_url": c.file_url,
            "signed_url": c.file_url,  # placeholder storage signed URL parity
            "verified": c.verified,
            "review_status": c.review_status,
            "verification_score": c.verification_score,
            "rejection_reason": c.rejection_reason,
            "reviewed_by": c.reviewed_by,
            "reviewed_at": c.reviewed_at.isoformat() if c.reviewed_at else None,
            "uploaded_at": c.uploaded_at.isoformat() if c.uploaded_at else None,
            "verified_at": c.verified_at.isoformat() if c.verified_at else None,
        })

    return {"data": enriched, "error": None}


# ─── POST /api/vendor/certifications/upload ───────────────────────────
@router.post("/certifications/upload", status_code=201)
async def upload_certification(
    request: Request,
    file: Optional[UploadFile] = File(None),
    cert_name: Optional[str] = Form(None),
    cert_type: Optional[str] = Form(None),
    session: dict = Depends(require_vendor),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        name = body.get("cert_name")
        c_type = body.get("cert_type")
        file_url = body.get("file_url", "/uploads/certifications/mock_cert.pdf")
        if not name or not c_type:
            raise HTTPException(status_code=400, detail="Missing cert_name or cert_type")
    else:
        if not file or not cert_name or not cert_type:
            raise HTTPException(status_code=400, detail="Missing required upload fields")
        name = cert_name
        c_type = cert_type
        # Validate file size (5MB max)
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")

        # Validate file type
        ext = os.path.splitext(file.filename)[1].lower()
        allowed = ['.pdf', '.jpg', '.jpeg', '.png']
        if ext not in allowed:
            raise HTTPException(status_code=400, detail="Only PDF, JPG, and PNG allowed")

        # Save file to disk
        filename = f"{uuid.uuid4()}{ext}"
        upload_dir = os.path.join(os.getcwd(), 'uploads', 'certifications')
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, filename)

        with open(file_path, "wb") as f:
            f.write(content)

        file_url = f"/api/files/certifications/{filename}"

    # Save to database
    certification = Certification(
        vendor_alias=alias,
        cert_name=name,
        cert_type=c_type,
        file_url=file_url,
        verified=False,
        review_status='PENDING',
        verification_score=0
    )
    db.add(certification)
    await db.flush()  # populate certification.id

    # Audit log
    db.add(AuditLog(
        action_type="certification_uploaded",
        actor_alias=alias,
        metadata={"cert_name": name, "cert_type": c_type}
    ))

    # Notify vendor
    db.add(Notification(
        recipient_alias=alias,
        type="cert_submitted",
        content=f"Your {name} certification has been submitted for moderator review. You will be notified once it is reviewed.",
        ref_id=certification.id
    ))

    await db.commit()

    # Emit Socket.IO event to moderator-room
    from app.sockets.manager import sio
    await sio.emit('new-cert-pending', {
        "id": str(certification.id),
        "vendor_alias": alias,
        "cert_name": name,
        "cert_type": c_type
    }, room='moderator-room')

    return {
        "data": {
            "id": str(certification.id),
            "vendor_alias": certification.vendor_alias,
            "cert_name": certification.cert_name,
            "cert_type": certification.cert_type,
            "file_url": certification.file_url,
            "verified": certification.verified,
            "review_status": certification.review_status,
            "verification_score": certification.verification_score,
            "uploaded_at": certification.uploaded_at.isoformat() if certification.uploaded_at else None,
        },
        "error": None
    }


# ─── GET /api/vendor/trust/events ─────────────────────────────────────
@router.get("/trust/events")
async def get_vendor_trust_events(
    session: dict = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]

    # 1. Trust Score
    user_res = await db.execute(select(User.trust_score).where(User.alias == alias))
    trust_score = user_res.scalar() or 0.0

    # 2. Events List
    res = await db.execute(
        select(TrustEvent)
        .where(TrustEvent.alias == alias)
        .order_by(TrustEvent.created_at.desc())
        .limit(20)
    )
    events = res.scalars().all()

    events_data = []
    for e in events:
        events_data.append({
            "id": e.id,
            "alias": e.alias,
            "event_type": e.event_type,
            "score_delta": e.score_delta,
            "deal_id": e.deal_id,
            "meta": e.meta,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        })

    # 3. Percentile computation
    all_scores_res = await db.execute(
        select(AliasDirectory.trust_score).where(AliasDirectory.role == "vendor")
    )
    all_scores = all_scores_res.scalars().all()

    percentile = 0
    if all_scores:
        below = sum(1 for s in all_scores if s < trust_score)
        percentile = round((below / len(all_scores)) * 100)

    return {
        "data": {
            "events": events_data,
            "trust_score": trust_score,
            "percentile": percentile,
        },
        "error": None,
    }


# ─── GET /api/vendor/{alias}/reviews ──────────────────────────────────
@router.get("/{alias}/reviews")
async def get_public_vendor_reviews(
    alias: str,
    db: AsyncSession = Depends(get_db),
):
    # Only show buyer-to-vendor reviews publicly
    res = await db.execute(
        select(Review)
        .where(
            Review.reviewee_alias == alias,
            Review.reviewer_role == "buyer"
        )
        .order_by(Review.created_at.desc())
        .limit(20)
    )
    reviews = res.scalars().all()

    sanitized = []
    for r in reviews:
        sanitized.append({
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "reviewer_display": "Anonymous Buyer",
        })

    return {"data": sanitized, "error": None}
