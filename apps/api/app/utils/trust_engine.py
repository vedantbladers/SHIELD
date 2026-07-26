"""Trust score and rating recomputation engine."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.models import User, AliasDirectory, TrustEvent, Review


async def compute_trust_score(alias: str, db: AsyncSession) -> float:
    """Recomputes trust score from trust_events for a given alias."""
    # Sum all score_delta for this alias
    result = await db.execute(
        select(func.sum(TrustEvent.score_delta)).where(TrustEvent.alias == alias)
    )
    score_sum = result.scalar() or 0.0
    new_score = max(0.0, min(100.0, float(score_sum)))

    # Update User
    res_user = await db.execute(select(User).where(User.alias == alias))
    user = res_user.scalar_one_or_none()
    if user:
        user.trust_score = new_score

    # Update AliasDirectory
    res_ad = await db.execute(select(AliasDirectory).where(AliasDirectory.alias == alias))
    ad = res_ad.scalar_one_or_none()
    if ad:
        ad.trust_score = new_score

    await db.commit()
    return new_score


async def recompute_vendor_rating(alias: str, db: AsyncSession) -> None:
    """Recomputes average 5-star rating and review count for a vendor."""
    result = await db.execute(
        select(Review.rating).where(
            Review.reviewee_alias == alias,
            Review.reviewer_role == "buyer"
        )
    )
    ratings = result.scalars().all()
    if not ratings:
        return

    avg = sum(ratings) / len(ratings)
    rounded_avg = round(avg, 1)

    # Update User
    res_user = await db.execute(select(User).where(User.alias == alias))
    user = res_user.scalar_one_or_none()
    if user:
        user.rating_as_vendor = rounded_avg
        user.total_vendor_reviews = len(ratings)

    # Update AliasDirectory
    res_ad = await db.execute(select(AliasDirectory).where(AliasDirectory.alias == alias))
    ad = res_ad.scalar_one_or_none()
    if ad:
        ad.rating_as_vendor = rounded_avg
        ad.total_vendor_reviews = len(ratings)

    await db.commit()


async def recompute_buyer_rating(alias: str, db: AsyncSession) -> None:
    """Recomputes average 5-star rating and review count for a buyer."""
    result = await db.execute(
        select(Review.rating).where(
            Review.reviewee_alias == alias,
            Review.reviewer_role == "vendor"
        )
    )
    ratings = result.scalars().all()
    if not ratings:
        return

    avg = sum(ratings) / len(ratings)
    rounded_avg = round(avg, 1)

    # Update User
    res_user = await db.execute(select(User).where(User.alias == alias))
    user = res_user.scalar_one_or_none()
    if user:
        user.rating_as_buyer = rounded_avg
        user.total_buyer_reviews = len(ratings)

    # Update AliasDirectory
    res_ad = await db.execute(select(AliasDirectory).where(AliasDirectory.alias == alias))
    ad = res_ad.scalar_one_or_none()
    if ad:
        ad.rating_as_buyer = rounded_avg
        ad.total_buyer_reviews = len(ratings)

    await db.commit()
