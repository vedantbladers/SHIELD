"""Pydantic schemas for deals, reviews, and state transitions."""
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional


class DealTransitionSchema(BaseModel):
    action: str = Field(min_length=1)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    note: Optional[str] = None


class DealPriceSchema(BaseModel):
    agreed_price: float = Field(gt=0)


class DealReviewSchema(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class DealEventCreateSchema(BaseModel):
    type: str = Field(min_length=1)
    content: str = Field(min_length=1)
