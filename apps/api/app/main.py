import base64
import binascii
import json
import time
import uuid
from contextlib import asynccontextmanager
from datetime import timedelta
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import get_settings
from .db import create_sqlite_schema, get_db
from .events import broker
from .models import (
    AgentProfile,
    Campfire,
    Device,
    Event,
    ExperienceArtifact,
    ExperienceMatch,
    ExperienceCandidate,
    Handshake,
    MatchCandidate,
    NeedSignal,
    Notification,
    PresenceSession,
    ProfileIntelligenceCandidate,
    ProactiveItem,
    Relationship,
    Signal,
    User,
    utcnow,
)
from .schemas import (
    AgentEventInput,
    AgentEventResponse,
    AgentLinkWireEventInput,
    AuthExchangeRequest,
    CampfireConfirm,
    CampfireCreate,
    CampfireView,
    CandidateDecision,
    CandidateInput,
    CandidateView,
    ConfirmHandshakeRequest,
    DemoSeedResponse,
    DemoSessionRequest,
    DemoSessionResponse,
    DevicePairRequest,
    DeviceView,
    ExperienceInput,
    ExperienceMatchView,
    ExperienceView,
    HandshakeView,
    HeartbeatRequest,
    MatchView,
    NeedInput,
    NeedView,
    NotificationView,
    PresenceInput,
    PresenceView,
    ProactiveView,
    ProfileInput,
    ProfileIntelligenceDecision,
    ProfileIntelligenceInput,
    ProfileIntelligenceView,
    ProfileView,
    RelationshipView,
    SignalInput,
    SignalView,
    UserView,
)
from .security import get_current_user, hash_secret, issue_access_token, new_id, require_agent_gateway, require_auth_exchange, verify_access_token
from .observability import prometheus_text, request_finished, request_started
from .seed import seed_demo
from .services import (
    build_experience_matches,
    vbti_chemistry,
    confirm_handshake,
    create_experience,
    create_need,
    dumps,
    ensure_match,
    get_match_for_user,
    loads,
    profile_to_dict,
    radar,
    record_gesture,
    relationship_for_handshake,
    reset_demo_data,
    upsert_profile,
)


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.env == "production" and (
        settings.auth_secret == "development-only-change-me"
        or settings.agent_gateway_token == "change-me"
        or settings.auth_exchange_token == "change-me"
    ):
        raise RuntimeError("production requires non-default auth and gateway secrets")
    create_sqlite_schema()
    yield


app = FastAPI(
    title="Node / Builder 小天才 API",
    version="0.11.0",
    description="Profiles, devices, radar, bilateral handshakes and experience search.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def observe_requests(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    started = request_started()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        response.headers["X-Request-ID"] = request_id
        return response
    finally:
        route = request.scope.get("route")
        route_path = getattr(route, "path", request.url.path)
        request_finished(request.method, route_path, status_code, started, request_id)


def profile_view(profile: AgentProfile) -> ProfileView:
    return ProfileView(**profile_to_dict(profile))


def user_view(db: Session, user: User) -> UserView:
    profile = db.get(AgentProfile, user.id)
    return UserView(
        id=user.id, handle=user.handle, display_name=user.display_name,
        avatar_url=user.avatar_url, profile=profile_view(profile) if profile else None,
    )


def match_view(db: Session, match: MatchCandidate, viewer_id: str) -> MatchView:
    peer_id = match.user_b_id if viewer_id == match.user_a_id else match.user_a_id
    peer = db.get(User, peer_id)
    peer_profile = db.get(AgentProfile, peer_id) if peer else None
    viewer_profile = db.get(AgentProfile, viewer_id)
    chemistry, modes = vbti_chemistry(viewer_profile.vbti_code if viewer_profile else None, peer_profile.vbti_code if peer_profile else None)
    return MatchView(
        id=match.id, user_a_id=match.user_a_id, user_b_id=match.user_b_id,
        vbti_compatibility=chemistry, recommended_modes=modes,
        score=match.score, reasons=loads(match.reason_json, []), status=match.status,
        expires_at=match.expires_at,
        peer={
            "id": peer.id,
            "handle": peer.handle,
            "display_name": peer.display_name,
            "avatar_url": peer.avatar_url,
            "profile": profile_to_dict(peer_profile) if peer_profile else None,
        } if peer else None,
    )


def handshake_view(db: Session, handshake: Handshake) -> HandshakeView:
    relationship = relationship_for_handshake(db, handshake.id)
    return HandshakeView(
        id=handshake.id, match_id=handshake.match_id, status=handshake.status,
        user_a_confirmed=bool(handshake.user_a_confirmed_at),
        user_b_confirmed=bool(handshake.user_b_confirmed_at),
        gesture_a_seen=bool(handshake.gesture_a_at), gesture_b_seen=bool(handshake.gesture_b_at),
        completed_at=handshake.completed_at, relationship_id=relationship.id if relationship else None,
    )


def relationship_view(item: Relationship) -> RelationshipView:
    return RelationshipView(
        id=item.id, user_a_id=item.user_a_id, user_b_id=item.user_b_id,
        handshake_id=item.handshake_id, shared_context=loads(item.shared_context_json, {}),
        visibility=item.visibility, created_at=item.created_at,
    )


def campfire_view(item: Campfire) -> CampfireView:
    proposal = loads(item.proposal_json, {})
    proposal["status"] = item.status
    return CampfireView(
        id=item.id, name=item.name, venue=item.venue, creator_id=item.creator_id,
        expires_at=item.expires_at, members=loads(item.members_json, []),
        proposal=proposal, status=item.status, version=item.version,
    )


def signal_view(item: Signal) -> SignalView:
    return SignalView(
        id=item.id, owner_id=item.owner_id, kind=item.kind, statement=item.statement,
        context=loads(item.context_json, {}), status=item.status,
        expires_at=item.expires_at, created_at=item.created_at,
    )


def proactive_view(item: ProactiveItem) -> ProactiveView:
    return ProactiveView(
        id=item.id, owner_id=item.owner_id, kind=item.kind, title=item.title, body=item.body,
        action=loads(item.action_json, {}), source_id=item.source_id,
        status=item.status, created_at=item.created_at,
    )


def candidate_view(item: ExperienceCandidate) -> CandidateView:
    return CandidateView(
        id=item.id, owner_id=item.owner_id, artifact=loads(item.artifact_json, {}),
        source=loads(item.source_json, {}), status=item.status, created_at=item.created_at,
    )


def notification_view(item: Notification) -> NotificationView:
    return NotificationView(
        id=item.id, owner_id=item.owner_id, kind=item.kind, title=item.title, body=item.body,
        action=loads(item.action_json, {}), source_id=item.source_id,
        delivery_status=item.delivery_status, delivered_at=item.delivered_at,
        read_at=item.read_at, created_at=item.created_at,
    )


def deliver_notification(
    db: Session, owner_id: str, kind: str, title: str, body: str,
    action: Dict[str, Any], source_id: str,
) -> Notification:
    existing = db.scalar(select(Notification).where(
        Notification.owner_id == owner_id, Notification.kind == kind, Notification.source_id == source_id,
    ))
    if existing:
        return existing
    item = Notification(
        id=new_id("ntf"), owner_id=owner_id, kind=kind, title=title, body=body,
        action_json=dumps(action), source_id=source_id, delivery_status="delivered", delivered_at=utcnow(),
    )
    db.add(item)
    return item


def experience_view(item: ExperienceArtifact) -> ExperienceView:
    return ExperienceView(
        id=item.id, owner_id=item.owner_id, problem=item.problem, context=item.context,
        cause=item.cause, worked=item.worked, failed=item.failed,
        confidence=item.confidence, visibility=item.visibility, created_at=item.created_at,
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "node-api", "version": app.version, "release_sha": settings.release_sha}


@app.get("/ready")
def ready(db: Session = Depends(get_db)) -> dict:
    started = time.perf_counter()
    db.execute(select(1))
    latency_ms = round((time.perf_counter() - started) * 1000, 2)
    return {
        "status": "ready", "database": db.bind.dialect.name if db.bind else "unknown",
        "database_latency_ms": latency_ms, "release_sha": settings.release_sha,
    }


@app.get("/metrics", response_class=PlainTextResponse)
def metrics() -> str:
    return prometheus_text()


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        "kin_session", token, max_age=settings.token_ttl_seconds, httponly=True,
        secure=settings.env == "production", samesite="lax", path="/",
    )


@app.post("/v1/auth/demo-session", response_model=DemoSessionResponse)
def demo_session(payload: DemoSessionRequest, response: Response, db: Session = Depends(get_db)) -> DemoSessionResponse:
    if not settings.demo_mode:
        raise HTTPException(status_code=404, detail="demo auth disabled")
    user = db.scalar(select(User).where(User.handle == payload.handle))
    if not user:
        user = User(id=new_id("usr"), handle=payload.handle, display_name=payload.display_name)
        db.add(user)
    else:
        user.display_name = payload.display_name
    db.commit()
    token = issue_access_token(user.id)
    set_session_cookie(response, token)
    return DemoSessionResponse(access_token=token, user_id=user.id)


@app.post("/v1/auth/exchange", response_model=DemoSessionResponse, dependencies=[Depends(require_auth_exchange)])
def auth_exchange(payload: AuthExchangeRequest, response: Response, db: Session = Depends(get_db)) -> DemoSessionResponse:
    user = db.get(User, payload.user_id)
    handle_owner = db.scalar(select(User).where(User.handle == payload.handle))
    if handle_owner and handle_owner.id != payload.user_id:
        raise HTTPException(status_code=409, detail="handle already belongs to another user")
    if not user:
        user = User(id=payload.user_id, handle=payload.handle, display_name=payload.display_name)
    else:
        user.handle = payload.handle
        user.display_name = payload.display_name
    db.add(user); db.commit()
    token = issue_access_token(user.id)
    set_session_cookie(response, token)
    return DemoSessionResponse(access_token=token, user_id=user.id)


@app.get("/v1/me", response_model=UserView)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> UserView:
    return user_view(db, user)


@app.put("/v1/me/profile", response_model=ProfileView)
def put_profile(payload: ProfileInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ProfileView:
    return profile_view(upsert_profile(db, user, payload.model_dump()))


@app.get("/v1/devices", response_model=List[DeviceView])
def list_devices(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> List[Device]:
    return list(db.scalars(select(Device).where(Device.user_id == user.id)))


@app.post("/v1/devices/pair", response_model=DeviceView)
def pair_device(payload: DevicePairRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Device:
    device = db.scalar(select(Device).where(Device.hardware_uid == payload.hardware_uid))
    provided_hash = hash_secret(payload.pairing_code)
    if device and device.pairing_code_hash != provided_hash:
        raise HTTPException(status_code=403, detail="invalid pairing code")
    if device and device.user_id and device.user_id != user.id:
        raise HTTPException(status_code=409, detail="device already paired")
    if not device:
        device = Device(
            id=new_id("dev"), hardware_uid=payload.hardware_uid,
            pairing_code_hash=provided_hash, display_name=payload.display_name,
        )
    device.user_id = user.id
    device.display_name = payload.display_name
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@app.post("/v1/devices/{device_id}/heartbeat", response_model=DeviceView)
async def device_heartbeat(
    device_id: str, payload: HeartbeatRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Device:
    device = db.get(Device, device_id)
    if not device or device.user_id != user.id:
        raise HTTPException(status_code=404, detail="device not found")
    device.status = "online"
    device.last_seen_at = utcnow()
    device.battery_percent = payload.battery_percent
    device.firmware_version = payload.firmware_version
    db.add(device)
    db.commit()
    await broker.publish({"type": "device.updated", "device_id": device.id, "status": "online"})
    return device


@app.post("/v1/presence", response_model=PresenceView)
async def post_presence(
    payload: PresenceInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> PresenceSession:
    device = db.get(Device, payload.device_id)
    if not device or device.user_id != user.id:
        raise HTTPException(status_code=404, detail="device not found")
    item = PresenceSession(
        id=new_id("prs"), device_id=device.id, venue_id=payload.venue_id,
        coarse_zone=payload.coarse_zone, expires_at=utcnow() + timedelta(seconds=payload.ttl_seconds),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    await broker.publish({"type": "presence.updated", "user_id": user.id, "venue_id": item.venue_id})
    return item


@app.get("/v1/radar", response_model=List[MatchView])
def get_radar(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> List[MatchView]:
    return [match_view(db, item, user.id) for item in radar(db, user)]


@app.get("/v1/matches/{match_id}", response_model=MatchView)
def get_match(match_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> MatchView:
    return match_view(db, get_match_for_user(db, match_id, user.id), user.id)


@app.post("/v1/handshakes/{match_id}/confirm", response_model=HandshakeView)
async def confirm(
    match_id: str, payload: ConfirmHandshakeRequest,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
) -> HandshakeView:
    match = get_match_for_user(db, match_id, user.id)
    handshake, relationship, _ = confirm_handshake(
        db, match, user.id, payload.proof_nonce, payload.idempotency_key
    )
    await broker.publish({
        "type": "handshake.updated", "match_id": match.id, "status": handshake.status,
        "relationship_id": relationship.id if relationship else None,
    })
    return handshake_view(db, handshake)


@app.get("/v1/handshakes/{match_id}", response_model=HandshakeView)
def get_handshake(match_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> HandshakeView:
    match = get_match_for_user(db, match_id, user.id)
    handshake = db.scalar(select(Handshake).where(Handshake.match_id == match.id))
    if not handshake:
        raise HTTPException(status_code=404, detail="handshake not started")
    return handshake_view(db, handshake)


@app.get("/v1/relationships", response_model=List[RelationshipView])
def list_relationships(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> List[RelationshipView]:
    items = db.scalars(select(Relationship).where(
        or_(Relationship.user_a_id == user.id, Relationship.user_b_id == user.id)
    ).order_by(Relationship.created_at.desc())).all()
    return [relationship_view(item) for item in items]


@app.get("/v1/relationships/{relationship_id}", response_model=RelationshipView)
def get_relationship(
    relationship_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> RelationshipView:
    item = db.get(Relationship, relationship_id)
    if not item or user.id not in (item.user_a_id, item.user_b_id):
        raise HTTPException(status_code=404, detail="relationship not found")
    return relationship_view(item)


@app.post("/v1/needs", response_model=NeedView)
def post_need(payload: NeedInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> NeedView:
    item = create_need(db, user, payload.problem, payload.context)
    return NeedView(
        id=item.id, owner_id=item.owner_id, problem=item.problem,
        context=loads(item.context_json, {}), status=item.status, created_at=item.created_at,
    )


@app.post("/v1/signals", response_model=SignalView)
def publish_signal(
    payload: SignalInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> SignalView:
    item = Signal(
        id=new_id("sig"), owner_id=user.id, kind=payload.kind, statement=payload.statement,
        context_json=dumps(payload.context), expires_at=payload.expires_at, status="active",
    )
    db.add(item); db.flush()
    peers = db.scalars(select(User).where(User.id != user.id)).all()
    for peer in peers:
        profile = db.get(AgentProfile, peer.id)
        if not profile:
            continue
        label = "可能帮得上" if payload.kind == "NEED" else "值得关注"
        title = f"{user.display_name} 发布了 {payload.kind}"
        body = f"{payload.statement} · 你的 Agent 判断这条 Signal {label}。"
        action = {"label": "查看 Signal", "href": "/signals"}
        db.add(ProactiveItem(
            id=new_id("pro"), owner_id=peer.id, kind="signal_match",
            title=title, body=body, action_json=dumps(action),
            source_id=item.id, status="open",
        ))
        deliver_notification(db, peer.id, "signal_match", title, body, action, item.id)
    db.commit(); db.refresh(item)
    return signal_view(item)


@app.get("/v1/signals", response_model=List[SignalView])
def list_signals(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> List[SignalView]:
    del user
    items = db.scalars(select(Signal).where(Signal.status == "active").order_by(Signal.created_at.desc())).all()
    return [signal_view(item) for item in items if item.expires_at is None or item.expires_at > utcnow()]


@app.get("/v1/proactive", response_model=List[ProactiveView])
def list_proactive(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> List[ProactiveView]:
    relationships = db.scalars(select(Relationship).where(
        or_(Relationship.user_a_id == user.id, Relationship.user_b_id == user.id)
    )).all()
    for relationship in relationships:
        exists = db.scalar(select(ProactiveItem).where(
            ProactiveItem.owner_id == user.id, ProactiveItem.kind == "follow_up",
            ProactiveItem.source_id == relationship.id,
        ))
        if exists:
            continue
        context = loads(relationship.shared_context_json, {})
        followups = context.get("follow_up") or context.get("follow_ups") or ([context["next_step"]] if context.get("next_step") else [])
        if followups:
            first = followups[0]
            text_value = first.get("text") if isinstance(first, dict) else str(first)
            title = "一段关系值得继续"
            body = text_value or "查看你们在 Shared Context 中留下的后续事项。"
            action = {"label": "打开 Shared Context", "href": f"/kin/{relationship.id}"}
            db.add(ProactiveItem(
                id=new_id("pro"), owner_id=user.id, kind="follow_up", title="一段关系值得继续",
                body=body, action_json=dumps(action),
                source_id=relationship.id, status="open",
            ))
            deliver_notification(db, user.id, "follow_up", title, body, action, relationship.id)
    db.commit()
    items = db.scalars(select(ProactiveItem).where(
        ProactiveItem.owner_id == user.id, ProactiveItem.status == "open"
    ).order_by(ProactiveItem.created_at.desc())).all()
    return [proactive_view(item) for item in items]


@app.get("/v1/notifications", response_model=List[NotificationView])
def list_notifications(
    unread_only: bool = Query(default=False), user: User = Depends(get_current_user), db: Session = Depends(get_db),
) -> List[NotificationView]:
    query = select(Notification).where(
        Notification.owner_id == user.id, Notification.delivery_status == "delivered",
    )
    if unread_only:
        query = query.where(Notification.read_at.is_(None))
    items = db.scalars(query.order_by(Notification.read_at.asc(), Notification.created_at.desc())).all()
    return [notification_view(item) for item in items]


@app.post("/v1/notifications/{notification_id}/read", response_model=NotificationView)
def read_notification(
    notification_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db),
) -> NotificationView:
    item = db.get(Notification, notification_id)
    if not item or item.owner_id != user.id:
        raise HTTPException(status_code=404, detail="notification not found")
    if item.read_at is None:
        item.read_at = utcnow()
        db.add(item); db.commit(); db.refresh(item)
    return notification_view(item)


@app.post("/v1/experience-candidates", response_model=CandidateView)
def ingest_candidate(
    payload: CandidateInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> CandidateView:
    forbidden = {"raw", "messages", "conversation", "transcript"}
    if forbidden & set(payload.artifact):
        raise HTTPException(status_code=400, detail="candidate must not contain raw conversation data")
    artifact = ExperienceInput(**payload.artifact).model_dump()
    source = {key: value for key, value in payload.source.items() if key in {"source", "source_id", "title", "generated_at"}}
    item = ExperienceCandidate(
        id=new_id("cand"), owner_id=user.id, artifact_json=dumps(artifact),
        source_json=dumps(source), status="pending",
    )
    db.add(item); db.commit(); db.refresh(item)
    return candidate_view(item)


@app.get("/v1/experience-candidates", response_model=List[CandidateView])
def list_candidates(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> List[CandidateView]:
    items = db.scalars(select(ExperienceCandidate).where(
        ExperienceCandidate.owner_id == user.id
    ).order_by(ExperienceCandidate.created_at.desc())).all()
    return [candidate_view(item) for item in items]


@app.post("/v1/experience-candidates/{candidate_id}/decision", response_model=CandidateView)
def decide_candidate(
    candidate_id: str, payload: CandidateDecision,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
) -> CandidateView:
    item = db.get(ExperienceCandidate, candidate_id)
    if not item or item.owner_id != user.id:
        raise HTTPException(status_code=404, detail="candidate not found")
    duplicate = db.scalar(select(Event).where(Event.idempotency_key == payload.idempotency_key))
    if duplicate:
        return candidate_view(item)
    if item.status != "pending":
        raise HTTPException(status_code=409, detail="candidate already decided")
    item.status = "approved" if payload.decision == "approve" else "ignored"
    if payload.decision == "approve":
        create_experience(db, user, loads(item.artifact_json, {}))
    db.add(Event(
        id=new_id("evt"), actor_type="user", actor_id=user.id,
        type="experience_candidate.decided", payload_json=dumps({"candidate_id": item.id, "decision": payload.decision}),
        idempotency_key=payload.idempotency_key,
    ))
    db.commit(); db.refresh(item)
    return candidate_view(item)


@app.post("/v1/profile-intelligence/candidates", response_model=ProfileIntelligenceView)
def ingest_profile_intelligence(payload: ProfileIntelligenceInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ProfileIntelligenceView:
    candidate = payload.candidate
    if candidate.get("privacy", {}).get("raw_messages_emitted") != 0 or candidate.get("privacy", {}).get("local_only") is not True:
        raise HTTPException(status_code=400, detail="candidate must be local-only and summary-only")
    item = ProfileIntelligenceCandidate(id=new_id("pic"), owner_id=user.id, candidate_json=dumps(candidate), status="pending")
    db.add(item); db.commit(); db.refresh(item)
    return ProfileIntelligenceView(id=item.id, owner_id=item.owner_id, candidate=loads(item.candidate_json, {}), status=item.status, created_at=item.created_at)


@app.get("/v1/profile-intelligence/candidates", response_model=List[ProfileIntelligenceView])
def list_profile_intelligence(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> List[ProfileIntelligenceView]:
    rows = db.scalars(select(ProfileIntelligenceCandidate).where(ProfileIntelligenceCandidate.owner_id == user.id).order_by(ProfileIntelligenceCandidate.created_at.desc())).all()
    return [ProfileIntelligenceView(id=x.id, owner_id=x.owner_id, candidate=loads(x.candidate_json, {}), status=x.status, created_at=x.created_at) for x in rows]


@app.post("/v1/profile-intelligence/candidates/{candidate_id}/decision", response_model=ProfileIntelligenceView)
def decide_profile_intelligence(candidate_id: str, payload: ProfileIntelligenceDecision, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ProfileIntelligenceView:
    item = db.get(ProfileIntelligenceCandidate, candidate_id)
    if not item or item.owner_id != user.id: raise HTTPException(status_code=404, detail="candidate not found")
    if item.status != "pending": raise HTTPException(status_code=409, detail="candidate already decided")
    item.status = "approved" if payload.decision == "approve" else "ignored"
    if payload.decision == "approve":
        profile = db.get(AgentProfile, user.id)
        candidate = loads(item.candidate_json, {})
        if profile:
            profile.intelligence_json = dumps(candidate.get("profile_indicators", {}))
            code = candidate.get("vbti_candidate", {}).get("code")
            if isinstance(code, str) and len(code) == 4:
                profile.vbti_code = code.upper()
            db.add(profile)
    db.add(item); db.commit(); db.refresh(item)
    return ProfileIntelligenceView(id=item.id, owner_id=item.owner_id, candidate=loads(item.candidate_json, {}), status=item.status, created_at=item.created_at)


@app.post("/v1/campfires", response_model=CampfireView)
def create_campfire(
    payload: CampfireCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> CampfireView:
    members = payload.members
    member_ids = {str(member.get("agent_id", "")) for member in members}
    if user.id not in member_ids or len(member_ids) != len(members):
        raise HTTPException(status_code=400, detail="creator must be a unique member")
    for member in members:
        member["confirmation"] = "pending"
    proposal = dict(payload.proposal)
    proposal["status"] = "proposed"
    item = Campfire(
        id=new_id("camp"), creator_id=user.id, name=payload.name, venue=payload.venue,
        members_json=dumps(members), proposal_json=dumps(proposal), status="proposed",
        version=1, expires_at=payload.expires_at,
    )
    proposal["campfire_id"] = item.id
    item.proposal_json = dumps(proposal)
    db.add(item); db.commit(); db.refresh(item)
    return campfire_view(item)


@app.get("/v1/campfires", response_model=List[CampfireView])
def list_campfires(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> List[CampfireView]:
    items = db.scalars(select(Campfire).order_by(Campfire.created_at.desc())).all()
    return [campfire_view(item) for item in items if user.id in {m.get("agent_id") for m in loads(item.members_json, [])}]


@app.post("/v1/campfires/{campfire_id}/confirm", response_model=CampfireView)
def confirm_campfire(
    campfire_id: str, payload: CampfireConfirm,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
) -> CampfireView:
    duplicate = db.scalar(select(Event).where(Event.idempotency_key == payload.idempotency_key))
    item = db.get(Campfire, campfire_id)
    if not item:
        raise HTTPException(status_code=404, detail="campfire not found")
    members = loads(item.members_json, [])
    member = next((m for m in members if m.get("agent_id") == user.id), None)
    if not member:
        raise HTTPException(status_code=404, detail="campfire not found")
    if duplicate:
        return campfire_view(item)
    if item.version != payload.expected_version:
        raise HTTPException(status_code=409, detail="campfire version conflict")
    member["confirmation"] = "confirmed"
    formed = all(m.get("confirmation") == "confirmed" for m in members)
    item.members_json = dumps(members); item.status = "formed" if formed else "proposed"; item.version += 1
    db.add(Event(
        id=new_id("evt"), actor_type="user", actor_id=user.id, type="campfire.member_confirmed",
        payload_json=dumps({"campfire_id": item.id, "version": item.version}),
        idempotency_key=payload.idempotency_key,
    ))
    db.commit(); db.refresh(item)
    return campfire_view(item)


@app.get("/v1/needs/{need_id}/matches", response_model=List[ExperienceMatchView])
def need_matches(
    need_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> List[ExperienceMatchView]:
    need = db.get(NeedSignal, need_id)
    if not need or need.owner_id != user.id:
        raise HTTPException(status_code=404, detail="need not found")
    matches = db.scalars(
        select(ExperienceMatch).where(ExperienceMatch.need_id == need.id).order_by(ExperienceMatch.score.desc())
    ).all()
    result: List[ExperienceMatchView] = []
    for item in matches:
        experience = db.get(ExperienceArtifact, item.experience_id)
        if experience:
            result.append(ExperienceMatchView(
                id=item.id, need_id=item.need_id, experience_id=item.experience_id,
                owner_id=experience.owner_id, score=item.score, explanation=item.explanation,
                permission_status=item.permission_status, experience=experience_view(experience),
            ))
    return result


@app.post("/v1/experiences", response_model=ExperienceView)
def post_experience(
    payload: ExperienceInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> ExperienceView:
    return experience_view(create_experience(db, user, payload.model_dump()))


@app.post(
    "/v1/agent/events", response_model=AgentEventResponse,
    dependencies=[Depends(require_agent_gateway)],
)
async def agent_event(payload: AgentEventInput, db: Session = Depends(get_db)) -> AgentEventResponse:
    existing = db.scalar(select(Event).where(Event.idempotency_key == payload.event_id))
    if existing:
        return AgentEventResponse(accepted=True, duplicate=True)
    device = db.get(Device, payload.device_id)
    if not device or not device.user_id:
        raise HTTPException(status_code=404, detail="paired device not found")
    result = {}
    if payload.type == "handshake.confirmed":
        match_id = str(payload.payload.get("match_id", ""))
        nonce = str(payload.payload.get("proof_nonce", ""))
        if len(nonce) < 8:
            raise HTTPException(status_code=422, detail="proof_nonce must be at least 8 characters")
        match = get_match_for_user(db, match_id, device.user_id)
        handshake, relationship, duplicate = confirm_handshake(
            db, match, device.user_id, nonce, payload.event_id
        )
        result = {"handshake_id": handshake.id, "status": handshake.status,
                  "relationship_id": relationship.id if relationship else None}
        await broker.publish({"type": "handshake.updated", "match_id": match.id, **result})
        return AgentEventResponse(accepted=True, duplicate=duplicate, result=result)
    if payload.type == "handshake.gesture":
        match_id = str(payload.payload.get("match_id", ""))
        nonce = str(payload.payload.get("proof_nonce", ""))
        if len(nonce) < 8:
            raise HTTPException(status_code=422, detail="proof_nonce must be at least 8 characters")
        match = get_match_for_user(db, match_id, device.user_id)
        handshake, relationship = record_gesture(db, match, device.user_id, payload.occurred_at, nonce)
        result = {"handshake_id": handshake.id, "status": handshake.status,
                  "relationship_id": relationship.id if relationship else None}
    elif payload.type in ("device.online", "presence.heartbeat"):
        device.status = "online"
        device.last_seen_at = payload.occurred_at
        db.add(device)
        if payload.type == "presence.heartbeat":
            venue = str(payload.payload.get("venue_id", "hackathon"))
            zone = str(payload.payload.get("coarse_zone", "main-hall"))
            db.add(PresenceSession(
                id=new_id("prs"), device_id=device.id, venue_id=venue, coarse_zone=zone,
                expires_at=utcnow() + timedelta(seconds=300),
            ))
    elif payload.type == "device.offline":
        device.status = "offline"
        db.add(device)
    db.add(Event(
        id=new_id("evt"), actor_type="device", actor_id=device.id, type=payload.type,
        payload_json=dumps(payload.payload), idempotency_key=payload.event_id,
    ))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return AgentEventResponse(accepted=True, duplicate=True)
    await broker.publish({"type": payload.type, "device_id": device.id, **result})
    return AgentEventResponse(accepted=True, result=result)


@app.post(
    "/v1/agent-link/events", response_model=AgentEventResponse,
    dependencies=[Depends(require_agent_gateway)],
)
async def agent_link_wire_event(
    payload: AgentLinkWireEventInput, db: Session = Depends(get_db)
) -> AgentEventResponse:
    """Translate official Agent_link wire events without changing device firmware payloads.

    ROROLEE / AgentStack only adds the active match and proof nonce. The binary
    data remains the bytes emitted by ``agent_link_push_event``.
    """
    try:
        raw = base64.b64decode(payload.data_base64, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=422, detail="data_base64 is not valid base64")

    device = db.scalar(select(Device).where(Device.hardware_uid == payload.device_name))
    if not device or not device.user_id:
        raise HTTPException(status_code=404, detail="paired Agent_link device not found")

    translated_type: Optional[str] = None
    translated_payload = {
        "match_id": payload.match_id,
        "proof_nonce": payload.proof_nonce,
        "agent_link_device_name": payload.device_name,
        "agent_link_wire_event_id": payload.wire_event_id,
    }
    if payload.wire_event_id == 1:
        if len(raw) != 2 or raw[1] != 1:
            raise HTTPException(status_code=422, detail="button event must be {button_id, action=1}")
        translated_type = "handshake.confirmed"
        translated_payload.update({"button_id": raw[0], "action": raw[1]})
    elif payload.wire_event_id == 100:
        try:
            custom = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise HTTPException(status_code=422, detail="custom event must contain UTF-8 JSON")
        if not isinstance(custom, dict) or custom.get("kind") != "handshake.gesture":
            raise HTTPException(status_code=422, detail="unsupported custom Agent_link event")
        translated_type = "handshake.gesture"
        translated_payload.update(custom)
    else:
        raise HTTPException(status_code=422, detail="unsupported Agent_link wire_event_id")

    response = await agent_event(AgentEventInput(
        event_id=payload.event_id,
        device_id=device.id,
        type=translated_type,
        occurred_at=payload.occurred_at,
        payload=translated_payload,
    ), db)
    response.result["translated_type"] = translated_type
    response.result["device_name"] = payload.device_name
    return response


@app.get(
    "/v1/agent-link/sessions/{match_id}",
    dependencies=[Depends(require_agent_gateway)],
)
def agent_link_session_state(match_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Return the active handshake state for a trusted Agent_link gateway.

    This lets a reconnecting relay restore the two devices without requiring a
    new physical gesture or leaking participant profile data.
    """
    match = db.get(MatchCandidate, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="match not found")
    handshake = db.scalar(select(Handshake).where(Handshake.match_id == match.id))
    if not handshake:
        return {"match_id": match.id, "status": "ready", "relationship_id": None}
    relationship = relationship_for_handshake(db, handshake.id)
    return {
        "match_id": match.id,
        "status": handshake.status,
        "relationship_id": relationship.id if relationship else None,
    }


@app.get("/v1/events/stream")
def event_stream(
    token: str = Query(...), db: Session = Depends(get_db)
) -> StreamingResponse:
    user_id = verify_access_token(token)
    if user_id is None and settings.demo_mode:
        user_id = token
    if not user_id or not db.get(User, user_id):
        raise HTTPException(status_code=401, detail="invalid stream token")
    return StreamingResponse(broker.stream(), media_type="text/event-stream")


@app.post("/v1/demo/seed", response_model=DemoSeedResponse)
def demo_seed(db: Session = Depends(get_db)) -> DemoSeedResponse:
    if not settings.demo_mode:
        raise HTTPException(status_code=404, detail="demo mode disabled")
    return DemoSeedResponse(**seed_demo(db, reset=True))


@app.post("/v1/demo/reset", status_code=204)
def demo_reset(db: Session = Depends(get_db)) -> None:
    if not settings.demo_mode:
        raise HTTPException(status_code=404, detail="demo mode disabled")
    reset_demo_data(db)
