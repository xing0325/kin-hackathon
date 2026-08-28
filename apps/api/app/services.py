import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import delete, or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import get_settings
from .embeddings import cosine_similarity, deterministic_embedding
from .models import (
    AgentProfile,
    Campfire,
    Device,
    Event,
    ExperienceCandidate,
    ExperienceArtifact,
    ExperienceMatch,
    Handshake,
    Job,
    MatchCandidate,
    NeedSignal,
    Notification,
    PresenceSession,
    ProactiveItem,
    Relationship,
    Signal,
    User,
    utcnow,
)
from .security import hash_secret, new_id


def dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def loads(value: Optional[str], default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


def profile_text(data: Dict[str, Any]) -> str:
    fields: Iterable[Any] = (
        data.get("now_building", ""),
        data.get("public_summary", ""),
        *data.get("skills", []),
        *data.get("needs", []),
        *data.get("interests", []),
        *data.get("ai_stack", []),
    )
    return " ".join(str(v) for v in fields if v)


def profile_to_dict(profile: Optional[AgentProfile]) -> Dict[str, Any]:
    if not profile:
        return {
            "now_building": "",
            "skills": [],
            "needs": [],
            "interests": [],
            "ai_stack": [],
            "public_summary": "",
            "visibility": "event",
        }
    return {
        "user_id": profile.user_id,
        "now_building": profile.now_building,
        "skills": loads(profile.skills_json, []),
        "needs": loads(profile.needs_json, []),
        "interests": loads(profile.interests_json, []),
        "ai_stack": loads(profile.ai_stack_json, []),
        "public_summary": profile.public_summary,
        "visibility": profile.visibility,
    }


def upsert_profile(db: Session, user: User, payload: Dict[str, Any]) -> AgentProfile:
    profile = db.get(AgentProfile, user.id) or AgentProfile(user_id=user.id)
    profile.now_building = payload["now_building"]
    profile.skills_json = dumps(payload["skills"])
    profile.needs_json = dumps(payload["needs"])
    profile.interests_json = dumps(payload["interests"])
    profile.ai_stack_json = dumps(payload["ai_stack"])
    profile.public_summary = payload["public_summary"]
    profile.visibility = payload["visibility"]
    profile.embedding_json = dumps(deterministic_embedding(profile_text(payload)))
    db.add(profile)
    db.add(Job(id=new_id("job"), type="profile.enrich", payload_json=dumps({"user_id": user.id})))
    db.commit()
    db.refresh(profile)
    write_vector_column(db, "agent_profiles", "user_id", user.id, loads(profile.embedding_json, []))
    return profile


def write_vector_column(db: Session, table: str, key_column: str, key: str, vector: List[float]) -> None:
    if db.bind is None or db.bind.dialect.name != "mysql":
        return
    allowed = {("agent_profiles", "user_id"), ("need_signals", "id"), ("experience_artifacts", "id")}
    if (table, key_column) not in allowed:
        raise ValueError("unsupported vector target")
    db.execute(
        text("UPDATE %s SET embedding = :embedding WHERE %s = :key" % (table, key_column)),
        {"embedding": dumps(vector), "key": key},
    )
    db.commit()


def pair_key(a: str, b: str) -> str:
    return ":".join(sorted((a, b)))


def _terms(values: Iterable[str]) -> set:
    return {v.strip().lower() for v in values if v.strip()}


def score_profiles(left: AgentProfile, right: AgentProfile) -> Tuple[float, List[str]]:
    lp = profile_to_dict(left)
    rp = profile_to_dict(right)
    semantic = max(0.0, cosine_similarity(loads(left.embedding_json, []), loads(right.embedding_json, [])))
    lskills, rskills = _terms(lp["skills"]), _terms(rp["skills"])
    lneeds, rneeds = _terms(lp["needs"]), _terms(rp["needs"])
    complementary = (len(lneeds & rskills) + len(rneeds & lskills)) / max(1, len(lneeds | rneeds | lskills | rskills))
    common_interests = _terms(lp["interests"]) & _terms(rp["interests"])
    interest = min(1.0, len(common_interests) / 3.0)
    score = min(1.0, 0.45 * semantic + 0.35 * complementary + 0.20 * interest)
    reasons: List[str] = []
    for need in sorted(lneeds & rskills):
        reasons.append("对方擅长你正在需要的：%s" % need)
    for need in sorted(rneeds & lskills):
        reasons.append("你擅长对方正在需要的：%s" % need)
    if common_interests:
        reasons.append("共同关注：%s" % "、".join(sorted(common_interests)[:3]))
    if not reasons:
        reasons.append("双方当前项目和经验存在语义关联")
    return round(max(score, 0.05), 4), reasons[:3]


def ensure_match(db: Session, user_a_id: str, user_b_id: str, ttl_minutes: int = 15) -> MatchCandidate:
    a, b = sorted((user_a_id, user_b_id))
    key = pair_key(a, b)
    existing = db.scalar(
        select(MatchCandidate).where(
            MatchCandidate.pair_key == key,
            MatchCandidate.status.in_(["candidate", "handshaking"]),
            MatchCandidate.expires_at > utcnow(),
        )
    )
    if existing:
        return existing
    pa, pb = db.get(AgentProfile, a), db.get(AgentProfile, b)
    if not pa or not pb:
        raise HTTPException(status_code=409, detail="both users need profiles")
    score, reasons = score_profiles(pa, pb)
    match = MatchCandidate(
        id=new_id("mat"), pair_key=key, user_a_id=a, user_b_id=b, score=score,
        reason_json=dumps(reasons), status="candidate", expires_at=utcnow() + timedelta(minutes=ttl_minutes),
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


def active_peer_ids(db: Session, user_id: str) -> List[str]:
    device_ids = list(db.scalars(select(Device.id).where(Device.user_id == user_id)))
    if not device_ids:
        return []
    my_presence = db.scalar(
        select(PresenceSession)
        .where(PresenceSession.device_id.in_(device_ids), PresenceSession.expires_at > utcnow())
        .order_by(PresenceSession.expires_at.desc())
    )
    if not my_presence:
        return []
    peer_device_ids = list(
        db.scalars(
            select(PresenceSession.device_id).where(
                PresenceSession.venue_id == my_presence.venue_id,
                PresenceSession.coarse_zone == my_presence.coarse_zone,
                PresenceSession.expires_at > utcnow(),
                ~PresenceSession.device_id.in_(device_ids),
            )
        )
    )
    if not peer_device_ids:
        return []
    return list(db.scalars(select(Device.user_id).where(Device.id.in_(peer_device_ids), Device.user_id.is_not(None))))


def radar(db: Session, user: User) -> List[MatchCandidate]:
    matches = [ensure_match(db, user.id, peer) for peer in set(active_peer_ids(db, user.id)) if peer != user.id]
    return sorted(matches, key=lambda item: item.score, reverse=True)


def get_match_for_user(db: Session, match_id: str, user_id: str) -> MatchCandidate:
    match = db.get(MatchCandidate, match_id)
    if not match or user_id not in (match.user_a_id, match.user_b_id):
        raise HTTPException(status_code=404, detail="match not found")
    return match


def ensure_handshake(db: Session, match: MatchCandidate, nonce: str) -> Handshake:
    handshake = db.scalar(select(Handshake).where(Handshake.match_id == match.id))
    nonce_hash = hash_secret(nonce)
    if handshake:
        if handshake.proof_nonce_hash != nonce_hash:
            raise HTTPException(status_code=409, detail="proof nonce mismatch")
        return handshake
    handshake = Handshake(
        id=new_id("hsk"), match_id=match.id, proof_nonce_hash=nonce_hash, status="pending"
    )
    match.status = "handshaking"
    db.add(handshake)
    db.add(match)
    db.flush()
    return handshake


def _as_aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def finalize_handshake(db: Session, match: MatchCandidate, handshake: Handshake) -> Optional[Relationship]:
    confirmations = handshake.user_a_confirmed_at and handshake.user_b_confirmed_at
    gestures = handshake.gesture_a_at and handshake.gesture_b_at
    if not confirmations or not gestures:
        return None
    delta = abs((_as_aware(handshake.gesture_a_at) - _as_aware(handshake.gesture_b_at)).total_seconds())
    if delta > 3.0:
        return None
    existing = db.scalar(select(Relationship).where(Relationship.handshake_id == handshake.id))
    if existing:
        return existing
    a = db.get(User, match.user_a_id)
    b = db.get(User, match.user_b_id)
    pa = profile_to_dict(db.get(AgentProfile, match.user_a_id))
    pb = profile_to_dict(db.get(AgentProfile, match.user_b_id))
    reasons = loads(match.reason_json, [])
    shared = {
        "title": "%s × %s" % (a.display_name, b.display_name),
        "why_you_met": reasons,
        "user_a_building": pa["now_building"],
        "user_b_building": pb["now_building"],
        "next_step": "交换一个当前 blocker，并约定一次后续交流。",
    }
    relationship = Relationship(
        id=new_id("rel"), user_a_id=match.user_a_id, user_b_id=match.user_b_id,
        handshake_id=handshake.id, shared_context_json=dumps(shared),
    )
    handshake.status = "connected"
    handshake.completed_at = utcnow()
    match.status = "connected"
    db.add_all([relationship, handshake, match])
    db.add(Job(id=new_id("job"), type="relationship.enrich", payload_json=dumps({"relationship_id": relationship.id})))
    db.flush()
    return relationship


def confirm_handshake(
    db: Session, match: MatchCandidate, user_id: str, nonce: str, idempotency_key: str
) -> Tuple[Handshake, Optional[Relationship], bool]:
    previous = db.scalar(select(Event).where(Event.idempotency_key == idempotency_key))
    if previous:
        handshake = db.scalar(select(Handshake).where(Handshake.match_id == match.id))
        relationship = db.scalar(select(Relationship).where(Relationship.handshake_id == handshake.id)) if handshake else None
        return handshake, relationship, True
    handshake = ensure_handshake(db, match, nonce)
    now = utcnow()
    if user_id == match.user_a_id:
        handshake.user_a_confirmed_at = handshake.user_a_confirmed_at or now
    elif user_id == match.user_b_id:
        handshake.user_b_confirmed_at = handshake.user_b_confirmed_at or now
    else:
        raise HTTPException(status_code=403, detail="not a match participant")
    db.add(Event(
        id=new_id("evt"), actor_type="user", actor_id=user_id, type="handshake.confirmed",
        payload_json=dumps({"match_id": match.id}), idempotency_key=idempotency_key,
    ))
    relationship = finalize_handshake(db, match, handshake)
    db.commit()
    return handshake, relationship, False


def record_gesture(db: Session, match: MatchCandidate, user_id: str, occurred_at: datetime, nonce: str) -> Tuple[Handshake, Optional[Relationship]]:
    handshake = ensure_handshake(db, match, nonce)
    if user_id == match.user_a_id:
        handshake.gesture_a_at = occurred_at
        if handshake.gesture_b_at and abs((_as_aware(occurred_at) - _as_aware(handshake.gesture_b_at)).total_seconds()) > 3:
            handshake.gesture_b_at = None
    elif user_id == match.user_b_id:
        handshake.gesture_b_at = occurred_at
        if handshake.gesture_a_at and abs((_as_aware(occurred_at) - _as_aware(handshake.gesture_a_at)).total_seconds()) > 3:
            handshake.gesture_a_at = None
    relationship = finalize_handshake(db, match, handshake)
    db.commit()
    return handshake, relationship


def relationship_for_handshake(db: Session, handshake_id: str) -> Optional[Relationship]:
    return db.scalar(select(Relationship).where(Relationship.handshake_id == handshake_id))


def create_need(db: Session, owner: User, problem: str, context: Dict[str, Any]) -> NeedSignal:
    vector = deterministic_embedding(problem + " " + dumps(context))
    need = NeedSignal(
        id=new_id("need"), owner_id=owner.id, problem=problem, context_json=dumps(context),
        embedding_json=dumps(vector), status="open",
    )
    db.add(need)
    db.commit()
    db.refresh(need)
    write_vector_column(db, "need_signals", "id", need.id, vector)
    build_experience_matches(db, need)
    return need


def create_experience(db: Session, owner: User, payload: Dict[str, Any]) -> ExperienceArtifact:
    text_value = " ".join(str(payload[k]) for k in ("problem", "context", "cause", "worked", "failed"))
    vector = deterministic_embedding(text_value)
    item = ExperienceArtifact(
        id=new_id("exp"), owner_id=owner.id, problem=payload["problem"], context=payload["context"],
        cause=payload["cause"], worked=payload["worked"], failed=payload["failed"],
        confidence=payload["confidence"], visibility=payload["visibility"], embedding_json=dumps(vector),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    write_vector_column(db, "experience_artifacts", "id", item.id, vector)
    return item


def build_experience_matches(db: Session, need: NeedSignal, limit: int = 10) -> List[ExperienceMatch]:
    db.execute(delete(ExperienceMatch).where(ExperienceMatch.need_id == need.id))
    query_vector = loads(need.embedding_json, [])
    candidates: List[Tuple[ExperienceArtifact, float]] = []
    if db.bind is not None and db.bind.dialect.name == "mysql":
        rows = db.execute(text(
            "SELECT id, 1 - VEC_COSINE_DISTANCE(embedding, :query_vector) AS similarity "
            "FROM experience_artifacts WHERE owner_id <> :owner_id AND visibility <> 'private' "
            "ORDER BY similarity DESC LIMIT :limit"
        ), {"query_vector": dumps(query_vector), "owner_id": need.owner_id, "limit": limit}).all()
        for row in rows:
            item = db.get(ExperienceArtifact, row.id)
            if item:
                candidates.append((item, float(row.similarity)))
    else:
        items = db.scalars(select(ExperienceArtifact).where(
            ExperienceArtifact.owner_id != need.owner_id,
            ExperienceArtifact.visibility != "private",
        )).all()
        candidates = sorted(
            ((item, cosine_similarity(query_vector, loads(item.embedding_json, []))) for item in items),
            key=lambda pair: pair[1], reverse=True,
        )[:limit]
    results: List[ExperienceMatch] = []
    for item, score in candidates:
        match = ExperienceMatch(
            id=new_id("xpm"), need_id=need.id, experience_id=item.id,
            score=round(max(0.0, score), 4),
            explanation="该经验与当前问题在问题描述、原因或解决步骤上相似。",
            permission_status="summary_only",
        )
        db.add(match)
        results.append(match)
    db.commit()
    return results


def reset_demo_data(db: Session) -> None:
    for model in (
        ExperienceMatch,
        ExperienceCandidate,
        Notification,
        ProactiveItem,
        Signal,
        Campfire,
        Relationship,
        Handshake,
        MatchCandidate,
        PresenceSession,
        Event,
        Job,
        NeedSignal,
        ExperienceArtifact,
        Device,
        AgentProfile,
        User,
    ):
        db.execute(delete(model))
    db.commit()
