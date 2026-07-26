"""Matching router — runs the Jaccard + local semantic matching engine."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from bson.objectid import ObjectId

from app.database import get_db
from app.auth.dependencies import get_current_session
from app.models.models import User, AliasDirectory, Notification
from app.mongodb.client import get_collection
from app.utils.matching_engine import compute_semantic_similarity

router = APIRouter(prefix="/api/matching", tags=["matching"])


def compute_score(vendor: dict, req: dict, trust_score: float) -> dict:
    """Computes Jaccard, Budget, and Trust scores for a vendor against a requirement."""
    # 1. Jaccard Score
    vendor_terms = set(
        [
            term.lower()
            for term in (
                vendor.get("skills", [])
                + vendor.get("categories", [])
                + vendor.get("compliance_expertise", [])
                + vendor.get("tools_used", [])
            )
        ]
    )

    req_terms = set(
        [
            term.lower()
            for term in (
                req.get("service_type", [])
                + req.get("compliance_needs", [])
                + req.get("tech_stack", [])
            )
        ]
    )

    intersection = len(vendor_terms.intersection(req_terms))
    union = len(vendor_terms.union(req_terms))
    jaccard = intersection / union if union > 0 else 0.0

    # 2. Budget compatibility
    vendor_rate = vendor.get("rate_range", {})
    vendor_min = vendor_rate.get("min", 0.0)
    vendor_max = vendor_rate.get("max", float("inf"))

    req_budget = req.get("budget_range", {})
    req_min = req_budget.get("min", 0.0)
    req_max = req_budget.get("max", float("inf"))

    overlap = max(0.0, min(vendor_max, req_max) - max(vendor_min, req_min))
    budget = 1.0 if overlap > 0 else 0.0

    # 3. Trust boost
    trust_boost = trust_score / 100.0

    # Initial final score without semantic similarity (semantic = 0 for now)
    final = jaccard * 0.35 + 0.0 * 0.45 + budget * 0.10 + trust_boost * 0.10

    return {
        "jaccard": jaccard,
        "semantic": 0.0,
        "budget": budget,
        "trust_boost": trust_boost,
        "final": final,
    }


async def match_for_requirement(requirement_id: str, db: AsyncSession):
    """Executes matching for a given requirement against all active vendor profiles."""
    req_col = await get_collection("buyer_requirements")
    req = await req_col.find_one({"_id": ObjectId(requirement_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    vendor_col = await get_collection("vendor_profiles")
    vendors = await vendor_col.find({"is_active": True}).to_list(length=1000)

    if not vendors:
        return {"matches": []}

    # Fetch trust scores from Postgres
    vendor_aliases = [v["alias"] for v in vendors]
    res = await db.execute(
        select(AliasDirectory.alias, AliasDirectory.trust_score).where(
            AliasDirectory.alias.in_(vendor_aliases)
        )
    )
    trust_map = {row[0]: row[1] for row in res.all()}

    # Compute Jaccard / Budget / Trust scores
    scored = []
    for v in vendors:
        trust_val = trust_map.get(v["alias"], 50.0)
        breakdown = compute_score(v, req, trust_val)
        scored.append({"alias": v["alias"], "score": breakdown["final"], "breakdown": breakdown})

    # Filter out budget-incompatible
    compatible = [s for s in scored if s["breakdown"]["budget"] > 0]
    compatible.sort(key=lambda x: x["score"], reverse=True)

    # semantic for top 20
    top20 = compatible[:20]
    if top20:
        # Load descriptions
        top20_aliases = [m["alias"] for m in top20]
        desc_map = {
            v["alias"]: v.get("service_description", "")
            for v in vendors
            if v["alias"] in top20_aliases
        }

        descriptions = [desc_map.get(m["alias"], "") for m in top20]
        similarities = compute_semantic_similarity(req.get("description", ""), descriptions)

        for idx, match in enumerate(top20):
            sem = similarities[idx]
            match["breakdown"]["semantic"] = sem
            match["breakdown"]["final"] = (
                match["breakdown"]["jaccard"] * 0.35
                + sem * 0.45
                + match["breakdown"]["budget"] * 0.10
                + match["breakdown"]["trust_boost"] * 0.10
            )
            match["score"] = match["breakdown"]["final"]

    # Re-sort after semantic scoring
    top20.sort(key=lambda x: x["score"], reverse=True)
    top10 = top20[:10]

    # Save to MongoDB buyer_requirements
    if top10:
        matched_aliases = [m["alias"] for m in top10]
        await req_col.update_one(
            {"_id": ObjectId(requirement_id)},
            {
                "$set": {
                    "matched_vendor_aliases": matched_aliases,
                    "status": "matched" if req.get("status") == "open" else req.get("status"),
                    "updated_at": datetime.utcnow(),
                }
            },
        )

        # Create notifications for vendors
        for m in top10:
            notif = Notification(
                recipient_alias=m["alias"],
                type="new_match",
                content=f"New requirement matches your profile: \"{req['title']}\"",
                ref_id=requirement_id,
            )
            db.add(notif)
        await db.commit()

        # Emit Socket.IO alerts
        from app.sockets.manager import sio

        for m in top10:
            await sio.emit(
                "new-notification",
                {
                    "type": "new_match",
                    "content": f"New requirement matches your profile: \"{req['title']}\"",
                    "ref_id": requirement_id,
                    "read": False,
                    "created_at": datetime.utcnow().isoformat() + "Z",
                },
                room=f"notifications-{m['alias']}",
            )

    # Store results in match cache collection
    cache_col = await get_collection("match_cache")
    # ensure index
    await cache_col.create_index("computed_at", expireAfterSeconds=86400)
    for m in top10:
        await cache_col.update_one(
            {"requirement_id": requirement_id, "vendor_alias": m["alias"]},
            {"$set": {"scores": m["breakdown"], "computed_at": datetime.utcnow()}},
            upsert=True,
        )

    return {"matches": top10}


async def match_for_vendor(vendor_alias: str, db: AsyncSession):
    """Retrieves top 10 open requirements matching a vendor's profile."""
    vendor_col = await get_collection("vendor_profiles")
    vendor = await vendor_col.find_one({"alias": vendor_alias})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    req_col = await get_collection("buyer_requirements")
    reqs = await req_col.find({"status": "open"}).to_list(length=1000)

    if not reqs:
        return {"matches": []}

    # Fetch trust score
    dir_res = await db.execute(
        select(AliasDirectory.trust_score).where(AliasDirectory.alias == vendor_alias)
    )
    trust_score = dir_res.scalar() or 50.0

    results = []
    for r in reqs:
        score = compute_score(vendor, r, trust_score)
        if score["final"] > 0.1:
            results.append(
                {
                    "requirement_id": str(r["_id"]),
                    "title": r.get("title", ""),
                    "score": score["final"],
                    "breakdown": score,
                }
            )

    # Run semantic for the results
    if results:
        req_descs = [
            next(r.get("description", "") for r in reqs if str(r["_id"]) == res["requirement_id"])
            for res in results
        ]
        similarities = compute_semantic_similarity(
            vendor.get("service_description", ""), req_descs
        )
        for idx, res in enumerate(results):
            sem = similarities[idx]
            res["breakdown"]["semantic"] = sem
            res["breakdown"]["final"] = (
                res["breakdown"]["jaccard"] * 0.35
                + sem * 0.45
                + res["breakdown"]["budget"] * 0.10
                + res["breakdown"]["trust_boost"] * 0.10
            )
            res["score"] = res["breakdown"]["final"]

    results.sort(key=lambda x: x["score"], reverse=True)
    return {"matches": results[:10]}


# ─── POST /api/matching/run ───────────────────────────────────────────
@router.post("/run")
async def run_matching(
    body: dict,
    session: dict = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    requirement_id = body.get("requirement_id")
    vendor_alias = body.get("vendor_alias")

    if requirement_id:
        if not ObjectId.is_valid(requirement_id):
            raise HTTPException(status_code=400, detail="Invalid requirement_id")
        result = await match_for_requirement(requirement_id, db)
        return {"data": result, "error": None}

    if vendor_alias:
        result = await match_for_vendor(vendor_alias, db)
        return {"data": result, "error": None}

    raise HTTPException(status_code=400, detail="requirement_id or vendor_alias required")
