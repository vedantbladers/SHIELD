"""Pydantic schemas for moderator operations."""
from pydantic import BaseModel, Field
from typing import Optional


class CertApproveRequest(BaseModel):
    score: int = Field(ge=1, le=20)


class CertRejectRequest(BaseModel):
    reason: str = Field(min_length=5)


class DisputeResolveRequest(BaseModel):
    resolution: str  # CLOSED | IN_PROGRESS (casing/convention verified)
    note: Optional[str] = None


class TrustAdjustRequest(BaseModel):
    score_delta: float
    justification: str = Field(min_length=5)
