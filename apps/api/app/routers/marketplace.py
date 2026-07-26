"""Marketplace router — lists public vendor profiles for buyer marketplace."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.auth.dependencies import get_current_session
from app.models.models import Certification
from app.mongodb.client import get_collection

from sqlalchemy import func
from app.models.models import AliasDirectory, Deal

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


@router.get("/public/landing")
async def get_public_landing(db: AsyncSession = Depends(get_db)):
    try:
        # Fetch top 3 vendors from alias_directory
        res_vendors = await db.execute(
            select(
                AliasDirectory.alias,
                AliasDirectory.trust_score,
                AliasDirectory.cert_badges,
                AliasDirectory.skills,
                AliasDirectory.completed_deals,
                AliasDirectory.response_rate,
            )
            .where(AliasDirectory.role == "vendor")
            .order_by(AliasDirectory.trust_score.desc())
            .limit(3)
        )
        vendors = []
        for row in res_vendors.all():
            vendors.append({
                "alias": row[0],
                "trust_score": row[1],
                "cert_badges": row[2],
                "skills": row[3],
                "completed_deals": row[4],
                "response_rate": row[5],
            })

        # Fetch stats
        res_vendor_count = await db.execute(
            select(func.count(AliasDirectory.alias)).where(AliasDirectory.role == "vendor")
        )
        vendor_count = res_vendor_count.scalar() or 0

        res_deal_count = await db.execute(select(func.count(Deal.id)))
        deal_count = res_deal_count.scalar() or 0

        return {
            "data": {
                "vendors": vendors,
                "stats": {
                    "vendors": vendor_count,
                    "deals": deal_count,
                }
            },
            "error": None
        }
    except Exception as e:
        return {
            "data": {
                "vendors": [],
                "stats": {"vendors": 0, "deals": 0}
            },
            "error": str(e)
        }


@router.get("/public/vendors")
async def get_public_marketplace_vendors(
    category: str = Query("All"),
    db: AsyncSession = Depends(get_db),
):
    col = await get_collection("vendor_profiles")

    # Build Mongo filter
    mongo_filter = {"is_active": True}
    if category and category != "All":
        mongo_filter["$or"] = [
            {"categories": {"$regex": category, "$options": "i"}},
            {"skills": {"$regex": category, "$options": "i"}},
        ]

    vendors = await col.find(mongo_filter).sort("trust_score", -1).limit(50).to_list(length=50)

    # Enrich with cert data from Prisma
    vendor_aliases = [v["alias"] for v in vendors]
    cert_map = {}
    stats_map = {}

    if vendor_aliases:
        res = await db.execute(
            select(Certification.vendor_alias, Certification.cert_type)
            .where(
                Certification.vendor_alias.in_(vendor_aliases),
                Certification.verified == True,
                Certification.review_status == "APPROVED"
            )
        )
        certs = res.all()
        for v_alias, c_type in certs:
            cert_map.setdefault(v_alias, []).append(c_type)

        res_stats = await db.execute(
            select(AliasDirectory.alias, AliasDirectory.trust_score, AliasDirectory.completed_deals)
            .where(AliasDirectory.alias.in_(vendor_aliases))
        )
        for alias_val, ts, cd in res_stats.all():
            stats_map[alias_val] = {"trust_score": ts, "completed_deals": cd}

    enriched = []
    for v in vendors:
        vendor_certs = cert_map.get(v["alias"], [])
        stats = stats_map.get(v["alias"], {"trust_score": v.get("trust_score", 50.0), "completed_deals": v.get("completed_deals", 0)})
        enriched.append({
            "alias": v["alias"],
            "service_description": v.get("service_description", ""),
            "categories": v.get("categories", []),
            "skills": v.get("skills", []),
            "experience_years": v.get("experience_years", 0),
            "rate_range": v.get("rate_range", {"min": 0, "max": 0}),
            "trust_score": stats["trust_score"],
            "completed_deals": stats["completed_deals"],
            "is_verified": len(vendor_certs) > 0,
            "certifications": vendor_certs,
        })

    return {"data": enriched, "error": None}


@router.get("/vendors")
async def get_marketplace_vendors(
    category: str = Query("All"),
    session: dict = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    col = await get_collection("vendor_profiles")

    # Build Mongo filter
    mongo_filter = {"is_active": True}
    if category and category != "All":
        mongo_filter["$or"] = [
            {"categories": {"$regex": category, "$options": "i"}},
            {"skills": {"$regex": category, "$options": "i"}},
        ]

    vendors = await col.find(mongo_filter).sort("trust_score", -1).limit(50).to_list(length=50)

    # Enrich with cert data from Prisma
    vendor_aliases = [v["alias"] for v in vendors]
    cert_map = {}
    stats_map = {}

    if vendor_aliases:
        res = await db.execute(
            select(Certification.vendor_alias, Certification.cert_type)
            .where(
                Certification.vendor_alias.in_(vendor_aliases),
                Certification.verified == True,
                Certification.review_status == "APPROVED"
            )
        )
        certs = res.all()
        for v_alias, c_type in certs:
            cert_map.setdefault(v_alias, []).append(c_type)

        res_stats = await db.execute(
            select(AliasDirectory.alias, AliasDirectory.trust_score, AliasDirectory.completed_deals)
            .where(AliasDirectory.alias.in_(vendor_aliases))
        )
        for alias_val, ts, cd in res_stats.all():
            stats_map[alias_val] = {"trust_score": ts, "completed_deals": cd}

    enriched = []
    for v in vendors:
        vendor_certs = cert_map.get(v["alias"], [])
        stats = stats_map.get(v["alias"], {"trust_score": v.get("trust_score", 50.0), "completed_deals": v.get("completed_deals", 0)})
        enriched.append({
            "alias": v["alias"],
            "service_description": v.get("service_description", ""),
            "categories": v.get("categories", []),
            "skills": v.get("skills", []),
            "experience_years": v.get("experience_years", 0),
            "rate_range": v.get("rate_range", {"min": 0, "max": 0}),
            "trust_score": stats["trust_score"],
            "completed_deals": stats["completed_deals"],
            "is_verified": len(vendor_certs) > 0,
            "certifications": vendor_certs,
        })

    return {"data": enriched, "error": None}
