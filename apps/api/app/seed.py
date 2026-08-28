from datetime import timedelta
from typing import Dict, List

from sqlalchemy.orm import Session

from .models import Device, PresenceSession, User, utcnow
from .security import hash_secret
from .services import create_experience, ensure_match, reset_demo_data, upsert_profile


def seed_demo(db: Session, reset: bool = True) -> Dict[str, object]:
    if reset:
        reset_demo_data(db)
    alice = User(id="usr_alice", handle="alice", display_name="Alice")
    bob = User(id="usr_bob", handle="bob", display_name="Bob")
    db.add_all([alice, bob])
    db.commit()
    upsert_profile(db, alice, {
        "now_building": "一台基于 ESP32 的现实社交 Agent 设备",
        "skills": ["产品设计", "前端", "演示叙事"],
        "needs": ["BLE 音频", "ESP32", "音频 underrun"],
        "interests": ["智能硬件", "Agent Memory", "开源"],
        "ai_stack": ["Codex", "Claude", "TiDB"],
        "public_summary": "正在把线上 Agent Context 带到真实社交场景。",
        "visibility": "event",
    })
    upsert_profile(db, bob, {
        "now_building": "可迁移的 Agent 长期记忆系统",
        "skills": ["BLE 音频", "ESP32", "音频 underrun", "后端"],
        "needs": ["产品设计", "前端", "演示叙事"],
        "interests": ["智能硬件", "Agent Memory", "开源"],
        "ai_stack": ["OpenClaw", "FastAPI", "TiDB"],
        "public_summary": "解决过 ESP32 BLE 音频中断和缓冲区背压问题。",
        "visibility": "event",
    })
    devices: List[Device] = [
        Device(id="dev_cardputer_a", user_id=alice.id, hardware_uid="NODE-A7B2", pairing_code_hash=hash_secret("NODE-A123"), display_name="Cardputer A / NODE-A7B2", status="online", last_seen_at=utcnow()),
        Device(id="dev_cardputer_b", user_id=bob.id, hardware_uid="NODE-7FAE", pairing_code_hash=hash_secret("NODE-B123"), display_name="Cardputer B / NODE-7FAE", status="online", last_seen_at=utcnow()),
    ]
    db.add_all(devices)
    db.add_all([
        PresenceSession(id="prs_alice", device_id=devices[0].id, venue_id="hackathon", coarse_zone="main-hall", expires_at=utcnow() + timedelta(hours=2)),
        PresenceSession(id="prs_bob", device_id=devices[1].id, venue_id="hackathon", coarse_zone="main-hall", expires_at=utcnow() + timedelta(hours=2)),
    ])
    db.commit()
    create_experience(db, bob, {
        "problem": "ESP32 BLE 语音流出现断续和 audio underrun",
        "context": "NimBLE 与 I2S 同时运行，BLE callback 直接处理音频数据。",
        "cause": "callback 阻塞、队列无背压、DMA buffer 太小。",
        "worked": "callback 只入有界队列；音频任务消费；扩大 DMA buffer；记录 underrun。",
        "failed": "在 BLE callback 内直接写 I2S。",
        "confidence": 0.92,
        "visibility": "event",
    })
    match = ensure_match(db, alice.id, bob.id)
    return {
        "users": [alice.id, bob.id],
        "devices": [d.id for d in devices],
        "match_id": match.id,
        "note": "Use /v1/auth/demo-session to obtain signed demo access tokens.",
    }
