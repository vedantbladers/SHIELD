"""Buyer router — handles requirement listings, proposals, details, and stats."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from bson.objectid import ObjectId
import math

from app.database import get_db
from app.auth.dependencies import require_buyer, get_current_session
from app.models.models import User, Deal, AuditLog, AliasDirectory
from app.mongodb.client import get_collection
from app.schemas.buyer import RequirementSchema

router = APIRouter(prefix="/api/buyer", tags=["buyer"])


# ─── GET /api/buyer/dashboard/stats ───────────────────────────────────
@router.get("/dashboard/stats")
async def get_buyer_stats(
    session: dict = Depends(require_buyer),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]

    # 1. MongoDB queries
    req_col = await get_collection("buyer_requirements")
    prop_col = await get_collection("proposals")

    active_reqs = await req_col.count_documents({"alias": alias, "status": {"$ne": "closed"}})
    proposals_received = await prop_col.count_documents({"buyer_alias": alias, "status": "pending"})

    # 2. PostgreSQL queries
    active_deals = await db.scalar(
        select(Deal)
        .where(
            Deal.buyer_alias == alias,
            Deal.status.in_(["CONTRACTED", "IN_PROGRESS", "REVIEW"])
        )
        .with_only_columns(Deal.id)
        .order_by(None)
        .select_from(Deal)
        .correlate(None)
    )
    # Let's count them properly
    active_deals_count = (await db.execute(
        select(Deal).where(
            Deal.buyer_alias == alias,
            Deal.status.in_(["CONTRACTED", "IN_PROGRESS", "REVIEW"])
        )
    )).scalars().all()
    
    completed_deals = (await db.execute(
        select(Deal).where(
            Deal.buyer_alias == alias,
            Deal.status == "CLOSED"
        )
    )).scalars().all()

    audit_logs_res = await db.execute(
        select(AuditLog)
        .where(AuditLog.actor_alias == alias)
        .order_by(AuditLog.created_at.desc())
        .limit(10)
    )
    recent_activity = audit_logs_res.scalars().all()

    # Format activity response
    activity_data = []
    for log in recent_activity:
        activity_data.append({
            "id": log.id,
            "action_type": log.action_type,
            "actor_alias": log.actor_alias,
            "target_alias": log.target_alias,
            "deal_id": log.deal_id,
            "meta": log.meta,
            "ip_hash": log.ip_hash,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    return {
        "data": {
            "active_requirements": active_reqs,
            "proposals_received": proposals_received,
            "active_deals": len(active_deals_count),
            "completed_deals": len(completed_deals),
            "recent_activity": activity_data,
        },
        "error": None,
    }


# ─── GET /api/buyer/requirements ──────────────────────────────────────
@router.get("/requirements")
async def get_buyer_requirements(
    page: int = Query(1, ge=1),
    session: dict = Depends(require_buyer),
):
    alias = session["alias"]
    limit = 10
    skip = (page - 1) * limit

    col = await get_collection("buyer_requirements")
    cursor = col.find({"alias": alias}).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    total = await col.count_documents({"alias": alias})

    # Convert ObjectId to string
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


# ─── POST /api/buyer/requirements ─────────────────────────────────────
@router.post("/requirements", status_code=201)
async def create_requirement(
    data: RequirementSchema,
    session: dict = Depends(require_buyer),
):
    alias = session["alias"]
    col = await get_collection("buyer_requirements")

    doc = {
        "alias": alias,
        "title": data.title,
        "description": data.description,
        "service_type": data.service_type,
        "budget_range": data.budget_range.dict(),
        "timeline_weeks": data.timeline_weeks,
        "compliance_needs": data.compliance_needs or [],
        "tech_stack": data.tech_stack or [],
        "engagement_type": data.engagement_type,
        "urgency": data.urgency,
        "status": "open",
        "matched_vendor_aliases": [],
        "proposal_count": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await col.insert_one(doc)
    doc_id = str(result.inserted_id)

    return {
        "data": {"id": doc_id},
        "error": None,
    }


# ─── GET /api/buyer/requirements/{id} ─────────────────────────────────
@router.get("/requirements/{req_id}")
async def get_requirement_detail(
    req_id: str,
    session: dict = Depends(require_buyer),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]
    
    if not ObjectId.is_valid(req_id):
        raise HTTPException(status_code=400, detail="Invalid requirement ID")

    col = await get_collection("buyer_requirements")
    doc = await col.find_one({"_id": ObjectId(req_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    if doc["alias"] != alias:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Get proposals for this requirement
    prop_col = await get_collection("proposals")
    proposals = await prop_col.find({"requirement_id": req_id}).sort("created_at", -1).to_list(length=100)

    # Convert proposal ObjectId to string, extract vendor aliases
    vendor_aliases = list(set(p["vendor_alias"] for p in proposals))

    # Fetch ratings / trust scores from database
    ratings_map = {}
    if vendor_aliases:
        res = await db.execute(
            select(AliasDirectory).where(AliasDirectory.alias.in_(vendor_aliases))
        )
        directories = res.scalars().all()
        for d in directories:
            ratings_map[d.alias] = {
                "rating_as_vendor": d.rating_as_vendor or 0,
                "total_vendor_reviews": d.total_vendor_reviews or 0,
                "trust_score": d.trust_score or 0,
            }

    enriched_proposals = []
    for p in proposals:
        p["_id"] = str(p["_id"])
        if "created_at" in p and isinstance(p["created_at"], datetime):
            p["created_at"] = p["created_at"].isoformat()
        
        v_alias = p["vendor_alias"]
        enriched_proposals.append({
            **p,
            "vendor_rating": ratings_map.get(v_alias, {}).get("rating_as_vendor", 0),
            "vendor_total_reviews": ratings_map.get(v_alias, {}).get("total_vendor_reviews", 0),
            "vendor_trust_score": ratings_map.get(v_alias, {}).get("trust_score", 0),
        })

    # Format requirement document
    doc["_id"] = str(doc["_id"])
    if "created_at" in doc and isinstance(doc["created_at"], datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    if "updated_at" in doc and isinstance(doc["updated_at"], datetime):
        doc["updated_at"] = doc["updated_at"].isoformat()

    return {
        "data": {
            "requirement": doc,
            "proposals": enriched_proposals,
        },
        "error": None,
    }


# ─── PATCH /api/buyer/requirements/{id} ───────────────────────────────
@router.patch("/requirements/{req_id}")
async def update_requirement(
    req_id: str,
    body: dict,
    session: dict = Depends(require_buyer),
):
    alias = session["alias"]

    if not ObjectId.is_valid(req_id):
        raise HTTPException(status_code=400, detail="Invalid requirement ID")

    col = await get_collection("buyer_requirements")
    doc = await col.find_one({"_id": ObjectId(req_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    if doc["alias"] != alias:
        raise HTTPException(status_code=403, detail="Forbidden")

    if doc["status"] != "open":
        raise HTTPException(status_code=400, detail="Can only edit open requirements")

    # Clean body keys (remove _id, alias, created_at, status etc to protect logic)
    body.pop("_id", None)
    body.pop("alias", None)
    body.pop("status", None)
    body["updated_at"] = datetime.utcnow()

    # Update in MongoDB
    await col.update_one({"_id": ObjectId(req_id)}, {"$set": body})

    return {
        "data": {"id": req_id},
        "error": None,
    }


# ─── DELETE /api/buyer/requirements/{id} ───────────────────────────────
@router.delete("/requirements/{req_id}")
async def delete_requirement(
    req_id: str,
    session: dict = Depends(require_buyer),
):
    alias = session["alias"]

    if not ObjectId.is_valid(req_id):
        raise HTTPException(status_code=400, detail="Invalid requirement ID")

    col = await get_collection("buyer_requirements")
    doc = await col.find_one({"_id": ObjectId(req_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    if doc["alias"] != alias:
        raise HTTPException(status_code=403, detail="Forbidden")

    if doc["status"] != "open":
        raise HTTPException(status_code=400, detail="Can only delete open requirements")

    await col.delete_one({"_id": ObjectId(req_id)})

    return {
        "data": {"deleted": True},
        "error": None,
    }


# ─── GET /api/buyer/proposals ─────────────────────────────────────────
@router.get("/proposals")
async def get_all_buyer_proposals(
    session: dict = Depends(require_buyer),
):
    alias = session["alias"]

    # Get all requirements for this buyer
    req_col = await get_collection("buyer_requirements")
    reqs = await req_col.find({"alias": alias}).to_list(length=1000)
    req_ids = [str(r["_id"]) for r in reqs]
    req_map = {str(r["_id"]): r["title"] for r in reqs}

    if not req_ids:
        return {"data": [], "error": None}

    # Get all proposals for these requirements
    prop_col = await get_collection("proposals")
    proposals = await prop_col.find({"requirement_id": {"$in": req_ids}}).sort("created_at", -1).to_list(length=1000)

    enriched = []
    for p in proposals:
        p["_id"] = str(p["_id"])
        if "created_at" in p and isinstance(p["created_at"], datetime):
            p["created_at"] = p["created_at"].isoformat()
        
        enriched.append({
            **p,
            "requirement_title": req_map.get(p["requirement_id"], "Unknown"),
        })

    return {"data": enriched, "error": None}


# ─── GET /api/buyer/proposals/{req_id} ──────────────────────────────────
@router.get("/proposals/{req_id}")
async def get_requirement_proposals(
    req_id: str,
    session: dict = Depends(require_buyer),
    db: AsyncSession = Depends(get_db),
):
    alias = session["alias"]

    if not ObjectId.is_valid(req_id):
        raise HTTPException(status_code=400, detail="Invalid requirement ID")

    # Validate requirement belongs to buyer
    req_col = await get_collection("buyer_requirements")
    requirement = await req_col.find_one({"_id": ObjectId(req_id)})
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    if requirement["alias"] != alias:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Get all proposals for this requirement
    prop_col = await get_collection("proposals")
    proposals = await prop_col.find({"requirement_id": req_id}).sort("created_at", -1).to_list(length=100)

    if not proposals:
        return {"data": [], "error": None}

    # Enrich with trust score from Prisma (alias_directory)
    aliases = list(set(p["vendor_alias"] for p in proposals))
    res = await db.execute(
        select(AliasDirectory).where(AliasDirectory.alias.in_(aliases))
    )
    directories = res.scalars().all()
    trust_map = {d.alias: d.trust_score for d in directories}

    enriched = []
    for p in proposals:
        p["_id"] = str(p["_id"])
        if "created_at" in p and isinstance(p["created_at"], datetime):
            p["created_at"] = p["created_at"].isoformat()
        
        enriched.append({
            **p,
            "trust_score": trust_map.get(p["vendor_alias"], 0),
        })

    return {"data": enriched, "error": None}
