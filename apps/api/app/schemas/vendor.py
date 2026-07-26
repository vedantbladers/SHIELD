"""Pydantic schemas for vendor profiles, proposals, and certifications."""
from pydantic import BaseModel, Field, model_validator
from typing import List, Optional


class ProposalSchema(BaseModel):
    requirement_id: str = Field(min_length=1)
    cover_note: str = Field(min_length=100)
    proposed_price: float = Field(gt=0)
    proposed_timeline_weeks: int = Field(ge=1, le=52)
    methodology: str = Field(min_length=50)
    relevant_experience: str = Field(min_length=20)


class RateRange(BaseModel):
    min: float = Field(gt=0)
    max: float = Field(gt=0)

    @model_validator(mode="after")
    def validate_range(self) -> "RateRange":
        if self.max <= self.min:
            raise ValueError("Max rate must be greater than min")
        return self


class SampleWorkItem(BaseModel):
    title: str
    description: str
    outcome: str


class VendorProfileSchema(BaseModel):
    service_description: str = Field(min_length=50, max_length=2000)
    categories: List[str] = Field(min_length=1)
    skills: List[str] = Field(min_length=1)
    experience_years: int = Field(ge=0, le=50)
    compliance_expertise: Optional[List[str]] = Field(default_factory=list)
    tools_used: Optional[List[str]] = Field(default_factory=list)
    rate_range: RateRange
    sample_work: Optional[List[SampleWorkItem]] = Field(default_factory=list)


class CertUploadSchema(BaseModel):
    cert_name: str = Field(min_length=3)
    cert_type: str

    @model_validator(mode="after")
    def check_type(self) -> "CertUploadSchema":
        allowed = (
            "OSCP",
            "CEH",
            "CISSP",
            "CISM",
            "ISO27001",
            "CompTIA_Security",
            "GPEN",
            "GWAPT",
            "eJPT",
            "other",
        )
        if self.cert_type not in allowed:
            raise ValueError("Invalid certificate type")
        return self
