import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime,
    ForeignKey, Text, Index
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = ({"extend_existing": True},)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    alias = Column(String, unique=True, nullable=False)
    role = Column(String, nullable=False)  # buyer | vendor | moderator
    email_verified = Column(Boolean, default=False)
    verification_token = Column(String, nullable=True)
    verification_expires = Column(DateTime, nullable=True)
    onboarding_complete = Column(Boolean, default=False)
    trust_score = Column(Float, default=0)
    rating_as_vendor = Column(Float, default=0)
    rating_as_buyer = Column(Float, default=0)
    total_vendor_reviews = Column(Integer, default=0)
    total_buyer_reviews = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    deals_as_buyer = relationship("Deal", back_populates="buyer", foreign_keys="Deal.buyer_alias")
    deals_as_vendor = relationship("Deal", back_populates="vendor", foreign_keys="Deal.vendor_alias")
    trust_events = relationship("TrustEvent", back_populates="user")
    notifications = relationship("Notification", back_populates="recipient")
    certifications = relationship("Certification", back_populates="vendor", foreign_keys="Certification.vendor_alias")
    reviewed_certs = relationship("Certification", back_populates="reviewer", foreign_keys="Certification.reviewed_by")
    reviews_given = relationship("Review", back_populates="reviewer", foreign_keys="Review.reviewer_alias")
    reviews_received = relationship("Review", back_populates="reviewee", foreign_keys="Review.reviewee_alias")
    audit_logs = relationship("AuditLog", back_populates="actor")
    chat_keys = relationship("ChatKey", back_populates="user")
    messages = relationship("Message", back_populates="sender")
    moderator_actions = relationship("ModeratorAction", back_populates="moderator")


class AliasDirectory(Base):
    __tablename__ = "alias_directory"
    __table_args__ = ({"extend_existing": True},)

    alias = Column(String, primary_key=True)
    role = Column(String, nullable=False)
    trust_score = Column(Float, default=0)
    cert_badges = Column(ARRAY(String), default=list)
    skills = Column(ARRAY(String), default=list)
    completed_deals = Column(Integer, default=0)
    response_rate = Column(Float, default=100)
    rating_as_vendor = Column(Float, default=0)
    rating_as_buyer = Column(Float, default=0)
    total_vendor_reviews = Column(Integer, default=0)
    total_buyer_reviews = Column(Integer, default=0)
    joined_at = Column(DateTime, default=datetime.utcnow)


class Deal(Base):
    __tablename__ = "deals"
    __table_args__ = ({"extend_existing": True},)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    buyer_alias = Column(String, ForeignKey("users.alias"), nullable=False)
    vendor_alias = Column(String, ForeignKey("users.alias"), nullable=True)
    requirement_id = Column(String, nullable=True)
    status = Column(String, default="POSTED")  # POSTED|MATCHED|NEGOTIATING|CONTRACTED|IN_PROGRESS|REVIEW|CLOSED|CANCELLED|DISPUTED
    agreed_price = Column(Float, nullable=True)
    original_price = Column(Float, nullable=True)
    currency = Column(String, default="USD")
    price_updated_at = Column(DateTime, nullable=True)
    buyer_consented_reveal = Column(Boolean, default=False)
    vendor_consented_reveal = Column(Boolean, default=False)
    identity_revealed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    buyer = relationship("User", back_populates="deals_as_buyer", foreign_keys=[buyer_alias])
    vendor = relationship("User", back_populates="deals_as_vendor", foreign_keys=[vendor_alias])
    deal_events = relationship("DealEvent", back_populates="deal", order_by="DealEvent.created_at")
    messages = relationship("Message", back_populates="deal")
    chat_keys = relationship("ChatKey", back_populates="deal")
    reviews = relationship("Review", back_populates="deal")


class DealEvent(Base):
    __tablename__ = "deal_events"
    __table_args__ = ({"extend_existing": True},)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    deal_id = Column(String, ForeignKey("deals.id"), nullable=False)
    event_type = Column(String, nullable=False)  # deal_closed | deal_created | status_change
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=True)
    actor_alias = Column(String, nullable=False)
    note = Column(String, nullable=True)
    meta = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    deal = relationship("Deal", back_populates="deal_events")


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = ({"extend_existing": True},)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    deal_id = Column(String, ForeignKey("deals.id"), nullable=False)
    sender_alias = Column(String, ForeignKey("users.alias"), nullable=False)
    encrypted_content = Column(String, nullable=False)
    message_type = Column(String, default="text")  # text | system
    file_url = Column(String, nullable=True)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    deal = relationship("Deal", back_populates="messages")
    sender = relationship("User", back_populates="messages")


class ChatKey(Base):
    __tablename__ = "chat_keys"
    __table_args__ = ({"extend_existing": True},)

    deal_id = Column(String, ForeignKey("deals.id"), primary_key=True)
    alias = Column(String, ForeignKey("users.alias"), primary_key=True)
    public_key = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    deal = relationship("Deal", back_populates="chat_keys")
    user = relationship("User", back_populates="chat_keys")


class Certification(Base):
    __tablename__ = "certifications"
    __table_args__ = ({"extend_existing": True},)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    vendor_alias = Column(String, ForeignKey("users.alias"), nullable=False)
    cert_name = Column(String, nullable=False)
    cert_type = Column(String, nullable=False)
    file_url = Column(String, nullable=True)
    verified = Column(Boolean, default=False)
    verification_score = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)
    review_status = Column(String, default="PENDING")  # PENDING | APPROVED | REJECTED
    reviewed_by = Column(String, ForeignKey("users.alias"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    rejection_reason = Column(String, nullable=True)

    vendor = relationship("User", back_populates="certifications", foreign_keys=[vendor_alias])
    reviewer = relationship("User", back_populates="reviewed_certs", foreign_keys=[reviewed_by])


class TrustEvent(Base):
    __tablename__ = "trust_events"
    __table_args__ = ({"extend_existing": True},)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    alias = Column(String, ForeignKey("users.alias"), nullable=False)
    event_type = Column(String, nullable=False)  # cert_approved | deal_completed | moderator_adjustment | review_received
    score_delta = Column(Float, nullable=False)
    deal_id = Column(String, nullable=True)
    meta = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="trust_events")


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = ({"extend_existing": True},)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_alias = Column(String, ForeignKey("users.alias"), nullable=False)
    type = Column(String, nullable=False)
    content = Column(String, nullable=False)
    ref_id = Column(String, nullable=True)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    recipient = relationship("User", back_populates="notifications")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        Index("ix_reviews_deal_role", "deal_id", "reviewer_role", unique=True),
        {"extend_existing": True},
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    deal_id = Column(String, ForeignKey("deals.id"), nullable=False)
    reviewer_alias = Column(String, ForeignKey("users.alias"), nullable=False)
    reviewee_alias = Column(String, ForeignKey("users.alias"), nullable=False)
    reviewer_role = Column(String, nullable=False)  # buyer | vendor
    rating = Column(Integer, nullable=False)
    comment = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    deal = relationship("Deal", back_populates="reviews")
    reviewer = relationship("User", back_populates="reviews_given", foreign_keys=[reviewer_alias])
    reviewee = relationship("User", back_populates="reviews_received", foreign_keys=[reviewee_alias])


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = ({"extend_existing": True},)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    action_type = Column(String, nullable=False)
    actor_alias = Column(String, ForeignKey("users.alias"), nullable=True)
    target_alias = Column(String, nullable=True)
    deal_id = Column(String, nullable=True)
    meta = Column("metadata", JSON, default=dict)
    ip_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    actor = relationship("User", back_populates="audit_logs")


class ModeratorAction(Base):
    __tablename__ = "moderator_actions"
    __table_args__ = (
        Index("ix_mod_actions_moderator", "moderator_alias"),
        Index("ix_mod_actions_target", "target_type", "target_id"),
        Index("ix_mod_actions_type", "action_type"),
        {"extend_existing": True},
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    moderator_alias = Column(String, ForeignKey("users.alias"), nullable=False)
    action_type = Column(String, nullable=False)  # CERT_APPROVED | USER_TRUST_ADJUSTED
    target_type = Column(String, nullable=False)  # CERTIFICATION | USER | REQUIREMENT
    target_id = Column(String, nullable=False)
    reason = Column(String, nullable=True)
    meta = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    moderator = relationship("User", back_populates="moderator_actions")
