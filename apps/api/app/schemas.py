from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class DemoSessionRequest(ApiModel):
    handle: str = Field(min_length=2, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    display_name: str = Field(min_length=1, max_length=120)


class DemoSessionResponse(ApiModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str


class AuthExchangeRequest(ApiModel):
    user_id: str = Field(min_length=4, max_length=40)
    handle: str = Field(min_length=2, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    display_name: str = Field(min_length=1, max_length=120)


class ProfileInput(ApiModel):
    now_building: str = Field(default="", max_length=1000)
    skills: List[str] = Field(default_factory=list, max_length=30)
    needs: List[str] = Field(default_factory=list, max_length=30)
    interests: List[str] = Field(default_factory=list, max_length=30)
    ai_stack: List[str] = Field(default_factory=list, max_length=30)
    public_summary: str = Field(default="", max_length=2000)
    visibility: str = Field(default="event", pattern=r"^(public|event|private)$")


class ProfileView(ProfileInput):
    user_id: str


class UserView(ApiModel):
    id: str
    handle: str
    display_name: str
    avatar_url: Optional[str] = None
    profile: Optional[ProfileView] = None


class DevicePairRequest(ApiModel):
    hardware_uid: str = Field(min_length=4, max_length=128)
    pairing_code: str = Field(min_length=4, max_length=32)
    display_name: str = Field(default="Cardputer", max_length=80)


class HeartbeatRequest(ApiModel):
    battery_percent: Optional[int] = Field(default=None, ge=0, le=100)
    firmware_version: Optional[str] = Field(default=None, max_length=64)


class DeviceView(ApiModel):
    id: str
    user_id: Optional[str]
    hardware_uid: str
    display_name: str
    status: str
    battery_percent: Optional[int]
    firmware_version: Optional[str]
    last_seen_at: Optional[datetime]


class PresenceInput(ApiModel):
    device_id: str
    venue_id: str = Field(min_length=1, max_length=80)
    coarse_zone: str = Field(min_length=1, max_length=80)
    ttl_seconds: int = Field(default=300, ge=30, le=3600)


class PresenceView(ApiModel):
    id: str
    device_id: str
    venue_id: str
    coarse_zone: str
    expires_at: datetime


class MatchView(ApiModel):
    id: str
    user_a_id: str
    user_b_id: str
    score: float
    reasons: List[str]
    status: str
    expires_at: datetime
    peer: Optional[Dict[str, Any]] = None


class ConfirmHandshakeRequest(ApiModel):
    proof_nonce: str = Field(min_length=8, max_length=256)
    idempotency_key: str = Field(min_length=8, max_length=128)


class HandshakeView(ApiModel):
    id: str
    match_id: str
    status: str
    user_a_confirmed: bool
    user_b_confirmed: bool
    gesture_a_seen: bool
    gesture_b_seen: bool
    completed_at: Optional[datetime]
    relationship_id: Optional[str] = None


class RelationshipView(ApiModel):
    id: str
    user_a_id: str
    user_b_id: str
    handshake_id: str
    shared_context: Dict[str, Any]
    visibility: str
    created_at: datetime


class NeedInput(ApiModel):
    problem: str = Field(min_length=3, max_length=4000)
    context: Dict[str, Any] = Field(default_factory=dict)


class NeedView(ApiModel):
    id: str
    owner_id: str
    problem: str
    context: Dict[str, Any]
    status: str
    created_at: datetime


class ExperienceInput(ApiModel):
    problem: str = Field(min_length=3, max_length=4000)
    context: str = Field(default="", max_length=4000)
    cause: str = Field(default="", max_length=4000)
    worked: str = Field(default="", max_length=6000)
    failed: str = Field(default="", max_length=6000)
    confidence: float = Field(default=0.7, ge=0, le=1)
    visibility: str = Field(default="event", pattern=r"^(public|event|private)$")


class ExperienceView(ExperienceInput):
    id: str
    owner_id: str
    created_at: datetime


class ExperienceMatchView(ApiModel):
    id: str
    need_id: str
    experience_id: str
    owner_id: str
    score: float
    explanation: str
    permission_status: str
    experience: ExperienceView


class CampfireCreate(ApiModel):
    name: str = Field(min_length=2, max_length=160)
    venue: str = Field(default="", max_length=160)
    expires_at: datetime
    members: List[Dict[str, Any]] = Field(min_length=3, max_length=12)
    proposal: Dict[str, Any]


class CampfireConfirm(ApiModel):
    expected_version: int = Field(ge=1)
    idempotency_key: str = Field(min_length=8, max_length=128)


class CampfireView(ApiModel):
    id: str
    name: str
    venue: str
    creator_id: str
    expires_at: datetime
    members: List[Dict[str, Any]]
    proposal: Dict[str, Any]
    status: str
    version: int


class SignalInput(ApiModel):
    kind: str = Field(pattern=r"^(NEED|BUILDING|SOLVED|DISCOVERED|AVAILABLE)$")
    statement: str = Field(min_length=3, max_length=2000)
    context: Dict[str, Any] = Field(default_factory=dict)
    expires_at: Optional[datetime] = None


class SignalView(SignalInput):
    id: str
    owner_id: str
    status: str
    created_at: datetime


class ProactiveView(ApiModel):
    id: str
    owner_id: str
    kind: str
    title: str
    body: str
    action: Dict[str, Any]
    source_id: Optional[str]
    status: str
    created_at: datetime


class CandidateInput(ApiModel):
    artifact: Dict[str, Any]
    source: Dict[str, Any] = Field(default_factory=dict)


class CandidateDecision(ApiModel):
    decision: str = Field(pattern=r"^(approve|ignore)$")
    idempotency_key: str = Field(min_length=8, max_length=128)


class CandidateView(ApiModel):
    id: str
    owner_id: str
    artifact: Dict[str, Any]
    source: Dict[str, Any]
    status: str
    created_at: datetime


class NotificationView(ApiModel):
    id: str
    owner_id: str
    kind: str
    title: str
    body: str
    action: Dict[str, Any]
    source_id: str
    delivery_status: str
    delivered_at: Optional[datetime]
    read_at: Optional[datetime]
    created_at: datetime


class AgentEventInput(ApiModel):
    event_id: str = Field(min_length=4, max_length=128)
    device_id: str
    type: str = Field(pattern=r"^(device\.online|device\.offline|presence\.heartbeat|handshake\.gesture|handshake\.confirmed|button\.pressed|sensor\.reading)$")
    occurred_at: datetime
    payload: Dict[str, Any] = Field(default_factory=dict)


class AgentEventResponse(ApiModel):
    accepted: bool
    duplicate: bool = False
    result: Dict[str, Any] = Field(default_factory=dict)


class AgentLinkWireEventInput(ApiModel):
    """Exact Agent_link event envelope forwarded by ROROLEE / AgentStack."""

    event_id: str = Field(min_length=4, max_length=128)
    device_name: str = Field(min_length=4, max_length=128)
    wire_event_id: int = Field(description="Agent_link agent_event_t: button=1, custom=100")
    data_base64: str = Field(min_length=1, max_length=4096)
    occurred_at: datetime
    match_id: str = Field(min_length=4, max_length=128)
    proof_nonce: str = Field(min_length=8, max_length=256)


class DemoSeedResponse(ApiModel):
    users: List[str]
    devices: List[str]
    match_id: str
    note: str
