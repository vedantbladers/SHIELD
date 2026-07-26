"""Pydantic schemas for buyer requirements."""
from pydantic import BaseModel, Field, model_validator
from typing import List, Optional


class BudgetRange(BaseModel):
    min: float = Field(gt=0, description="Min budget must be positive")
    max: float = Field(gt=0, description="Max budget must be positive")

    @model_validator(mode="after")
    def validate_range(self) -> "BudgetRange":
        if self.max <= self.min:
            raise ValueError("Max budget must be greater than min")
        return self


class RequirementSchema(BaseModel):
    title: str = Field(min_length=10, max_length=100)
    description: str = Field(min_length=50, max_length=2000)
    service_type: List[str] = Field(min_length=1)
    budget_range: BudgetRange
    timeline_weeks: int = Field(ge=1, le=52)
    compliance_needs: Optional[List[str]] = Field(default_factory=list)
    tech_stack: Optional[List[str]] = Field(default_factory=list)
    engagement_type: str  # one-time | ongoing | retainer
    urgency: str  # low | medium | high | critical

    @model_validator(mode="after")
    def check_enums(self) -> "RequirementSchema":
        if self.engagement_type not in ("one-time", "ongoing", "retainer"):
            raise ValueError("Invalid engagement type")
        if self.urgency not in ("low", "medium", "high", "critical"):
            raise ValueError("Invalid urgency")
        return self
