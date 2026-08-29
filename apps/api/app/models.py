from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    handle: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AgentProfile(Base):
    __tablename__ = "agent_profiles"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    now_building: Mapped[str] = mapped_column(Text, default="")
    skills_json: Mapped[str] = mapped_column(Text, default="[]")
    needs_json: Mapped[str] = mapped_column(Text, default="[]")
    interests_json: Mapped[str] = mapped_column(Text, default="[]")
    ai_stack_json: Mapped[str] = mapped_column(Text, default="[]")
    public_summary: Mapped[str] = mapped_column(Text, default="")
    embedding_json: Mapped[str] = mapped_column(Text, default="[]")
    visibility: Mapped[str] = mapped_column(String(24), default="event")
    intelligence_json: Mapped[str] = mapped_column(Text, default="{}")
    vbti_code: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Device(Base):
    __tablename__ = "devices"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    hardware_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    pairing_code_hash: Mapped[str] = mapped_column(String(128))
    display_name: Mapped[str] = mapped_column(String(80), default="Cardputer")
    status: Mapped[str] = mapped_column(String(24), default="offline")
    battery_percent: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    firmware_version: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PresenceSession(Base):
    __tablename__ = "presence_sessions"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    device_id: Mapped[str] = mapped_column(ForeignKey("devices.id"), index=True)
    venue_id: Mapped[str] = mapped_column(String(80), index=True)
    coarse_zone: Mapped[str] = mapped_column(String(80), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class MatchCandidate(Base):
    __tablename__ = "match_candidates"
    __table_args__ = (UniqueConstraint("pair_key", "status", name="uq_match_pair_status"),)
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    pair_key: Mapped[str] = mapped_column(String(90), index=True)
    user_a_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    user_b_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    score: Mapped[float] = mapped_column(Float)
    reason_json: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(24), default="candidate")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Handshake(Base):
    __tablename__ = "handshakes"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    match_id: Mapped[str] = mapped_column(ForeignKey("match_candidates.id"), unique=True, index=True)
    user_a_confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    user_b_confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    gesture_a_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    gesture_b_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    proof_nonce_hash: Mapped[str] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(24), default="pending")
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Relationship(Base):
    __tablename__ = "relationships"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_a_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    user_b_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    handshake_id: Mapped[str] = mapped_column(ForeignKey("handshakes.id"), unique=True)
    shared_context_json: Mapped[str] = mapped_column(Text)
    visibility: Mapped[str] = mapped_column(String(24), default="participants")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class NeedSignal(Base):
    __tablename__ = "need_signals"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    problem: Mapped[str] = mapped_column(Text)
    context_json: Mapped[str] = mapped_column(Text, default="{}")
    embedding_json: Mapped[str] = mapped_column(Text, default="[]")
    status: Mapped[str] = mapped_column(String(24), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ExperienceArtifact(Base):
    __tablename__ = "experience_artifacts"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    problem: Mapped[str] = mapped_column(Text)
    context: Mapped[str] = mapped_column(Text, default="")
    cause: Mapped[str] = mapped_column(Text, default="")
    worked: Mapped[str] = mapped_column(Text, default="")
    failed: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    visibility: Mapped[str] = mapped_column(String(24), default="event")
    embedding_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ExperienceMatch(Base):
    __tablename__ = "experience_matches"
    __table_args__ = (UniqueConstraint("need_id", "experience_id", name="uq_need_experience"),)
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    need_id: Mapped[str] = mapped_column(ForeignKey("need_signals.id"), index=True)
    experience_id: Mapped[str] = mapped_column(ForeignKey("experience_artifacts.id"), index=True)
    score: Mapped[float] = mapped_column(Float)
    explanation: Mapped[str] = mapped_column(Text)
    permission_status: Mapped[str] = mapped_column(String(24), default="summary_only")


class Campfire(Base):
    __tablename__ = "campfires"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    creator_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    venue: Mapped[str] = mapped_column(String(160), default="")
    members_json: Mapped[str] = mapped_column(Text)
    proposal_json: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(24), default="proposed", index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Signal(Base):
    __tablename__ = "signals"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(24), index=True)
    statement: Mapped[str] = mapped_column(Text)
    context_json: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(24), default="active", index=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ProactiveItem(Base):
    __tablename__ = "proactive_items"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(240))
    body: Mapped[str] = mapped_column(Text)
    action_json: Mapped[str] = mapped_column(Text, default="{}")
    source_id: Mapped[Optional[str]] = mapped_column(String(40), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(24), default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ExperienceCandidate(Base):
    __tablename__ = "experience_candidates"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    artifact_json: Mapped[str] = mapped_column(Text)
    source_json: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(24), default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ProfileIntelligenceCandidate(Base):
    __tablename__ = "profile_intelligence_candidates"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    candidate_json: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(24), default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (UniqueConstraint("owner_id", "kind", "source_id", name="uq_notification_source"),)
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(240))
    body: Mapped[str] = mapped_column(Text)
    action_json: Mapped[str] = mapped_column(Text, default="{}")
    source_id: Mapped[str] = mapped_column(String(80), index=True)
    delivery_status: Mapped[str] = mapped_column(String(24), default="delivered", index=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Event(Base):
    __tablename__ = "events"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    actor_type: Mapped[str] = mapped_column(String(24))
    actor_id: Mapped[str] = mapped_column(String(40), index=True)
    type: Mapped[str] = mapped_column(String(80), index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    idempotency_key: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    type: Mapped[str] = mapped_column(String(80), index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(24), default="pending", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
