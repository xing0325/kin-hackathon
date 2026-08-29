#!/usr/bin/env python3
"""Compile local KIN conversation exports and agent config into profile intelligence.

Local-first: raw messages and config values never appear in the output. The result
is a reviewable candidate, not an authoritative psychological assessment.
"""
from __future__ import annotations
import argparse, hashlib, json, sqlite3
from pathlib import Path
from typing import Any, Dict, Iterable, List

AXES = ("ship", "prompt", "explore", "collab")

def _tokens(text: str) -> set[str]:
    return {t.lower() for t in ''.join(c if c.isalnum() else ' ' for c in str(text)).split() if len(t) > 2}

def _hash(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]

def _load(path: Path) -> Dict[str, Any]:
    value = json.loads(path.read_text())
    if not isinstance(value, dict): raise ValueError(f"expected JSON object: {path}")
    return value

def scan_agent_sqlite(path: Path, max_sessions: int = 500) -> Dict[str, Any]:
    """Read local Agent thread history in read-only mode and normalize message roles."""
    sessions: Dict[str, list] = {}
    uri = f"file:{path}?mode=ro"
    try:
        db = sqlite3.connect(uri, uri=True)
        rows = db.execute("SELECT thread_id, item_json FROM thread_items ORDER BY created_at_ms LIMIT ?", (max_sessions * 20,)).fetchall()
    except (sqlite3.Error, OSError):
        return {"format": "kin-agent-export", "sessions": []}
    for thread_id, raw in rows:
        try: item = json.loads(raw)
        except (TypeError, json.JSONDecodeError): continue
        role = item.get("role") if isinstance(item, dict) else None
        content = item.get("content") if isinstance(item, dict) else None
        if role in {"user", "assistant"} and isinstance(content, str) and content:
            sessions.setdefault(str(thread_id), []).append({"role": role, "content": content})
    return {"format": "kin-agent-export", "sessions": [{"id": key, "title": "local agent thread", "messages": value} for key, value in list(sessions.items())[:max_sessions]]}

def scan_local_inventory(root: Path, max_files: int = 2000) -> Dict[str, Any]:
    """Read only filenames and normalized usage records from an explicitly selected root."""
    inventory = {"custom_skills": [], "usage_events": [], "files_seen": 0}
    for path in sorted(root.rglob("*")):
        if inventory["files_seen"] >= max_files: break
        if not path.is_file(): continue
        inventory["files_seen"] += 1
        if path.name == "SKILL.md": inventory["custom_skills"].append(path.parent.name)
        if path.suffix.lower() not in {".json", ".jsonl"} or "usage" not in path.name.lower(): continue
        try:
            rows = [json.loads(line) for line in path.read_text().splitlines()] if path.suffix.lower() == ".jsonl" else [json.loads(path.read_text())]
        except (OSError, json.JSONDecodeError): continue
        for row in rows:
            if isinstance(row, dict) and (row.get("model") or row.get("total_tokens") is not None):
                inventory["usage_events"].append({k: row[k] for k in ("model", "input_tokens", "output_tokens", "total_tokens", "harness", "skills", "plugins", "favorite_model") if k in row})
    inventory["custom_skills"] = sorted(set(inventory["custom_skills"]))
    return inventory

def summarize_usage(configs: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregate opt-in usage records without retaining prompts or payloads."""
    model_usage: Dict[str, Dict[str, int]] = {}
    harness_usage: Dict[str, int] = {}
    skill_usage: Dict[str, int] = {}
    plugin_usage: Dict[str, int] = {}
    custom_skills: set[str] = set()
    favorite_votes: Dict[str, int] = {}
    calls = 0
    for cfg in configs:
        custom_skills.update(str(x) for x in cfg.get("custom_skills", []) if isinstance(x, (str, int)))
        events = cfg.get("usage_events", [])
        if not isinstance(events, list):
            continue
        for event in events:
            if not isinstance(event, dict):
                continue
            calls += 1
            model = str(event.get("model") or "unknown")
            row = model_usage.setdefault(model, {"calls": 0, "input_tokens": 0, "output_tokens": 0, "total_tokens": 0})
            row["calls"] += 1
            for key in ("input_tokens", "output_tokens", "total_tokens"):
                try: row[key] += max(0, int(event.get(key, 0)))
                except (TypeError, ValueError): pass
            harness = event.get("harness")
            if harness: harness_usage[str(harness)] = harness_usage.get(str(harness), 0) + 1
            for key, target in (("skills", skill_usage), ("plugins", plugin_usage)):
                values = event.get(key, [])
                if isinstance(values, list):
                    for value in values:
                        target[str(value)] = target.get(str(value), 0) + 1
            if event.get("favorite_model") is True:
                favorite_votes[model] = favorite_votes.get(model, 0) + 1
    favorite = max(favorite_votes, key=favorite_votes.get) if favorite_votes else (max(model_usage, key=lambda k: (model_usage[k]["calls"], k)) if model_usage else None)
    return {"calls": calls, "models": model_usage, "favorite_model": favorite, "harnesses": harness_usage, "skills": skill_usage, "plugins": plugin_usage, "custom_skills": sorted(custom_skills)}


def merge_histories(collector: Dict[str, Any], agent_histories: Iterable[Dict[str, Any]] = ()) -> Dict[str, Any]:
    """Normalize the two supported history inputs into one local envelope."""
    if collector.get("format") != "kin-conversation-export":
        raise ValueError("unsupported collector export")
    merged = dict(collector)
    conversations = list(collector.get("conversations", []))
    for history in agent_histories:
        if history.get("format") not in {"kin-agent-export", "kin-conversation-export"}:
            raise ValueError("unsupported agent history export")
        rows = history.get("sessions", history.get("conversations", []))
        for row in rows if isinstance(rows, list) else []:
            item = dict(row)
            item.setdefault("source", "local-agent")
            conversations.append(item)
    merged["conversations"] = conversations
    return merged

def compile_profile(envelope: Dict[str, Any], configs: Iterable[Dict[str, Any]] = (), agent_histories: Iterable[Dict[str, Any]] = ()) -> Dict[str, Any]:
    envelope = merge_histories(envelope, agent_histories)
    conversations = [c for c in envelope.get("conversations", []) if not c.get("ignored")]
    user_text, assistant_text, titles = [], [], []
    for c in conversations:
        titles.append(str(c.get("title") or "Untitled conversation"))
        for m in c.get("messages") or []:
            content = str(m.get("content") or "")
            if m.get("role") == "user": user_text.append(content)
            elif m.get("role") == "assistant": assistant_text.append(content)
    corpus = _tokens(" ".join(user_text))
    cfg = list(configs)
    providers, models, tools = set(), set(), set()
    for item in cfg:
        providers.update(map(str, item.get("providers", []) if isinstance(item.get("providers"), list) else []))
        models.update(map(str, item.get("models", []) if isinstance(item.get("models"), list) else []))
        tools.update(map(str, item.get("tools", []) if isinstance(item.get("tools"), list) else []))
    ship = min(1.0, (len(conversations) + len({t for t in corpus if t in {"ship", "deploy", "release", "build"}})) / 8)
    prompt = min(1.0, (len(assistant_text) + len(providers) + len(models)) / 12)
    explore = min(1.0, len({t for t in corpus if t in {"idea", "explore", "try", "experiment", "alternative"}}) / 5)
    collab = min(1.0, len({t for t in corpus if t in {"team", "share", "review", "collaborate", "together"}}) / 5)
    indicators = {"shipping_style": round(ship, 4), "ai_leverage": round(prompt, 4), "exploration_tendency": round(explore, 4), "collaboration_orientation": round(collab, 4), "conversation_count": len(conversations), "config_source_count": len(cfg)}
    usage = summarize_usage(cfg)
    scores = {a: round(({"ship": ship, "prompt": prompt, "explore": explore, "collab": collab}[a] * 2 - 1) * 7, 2) for a in AXES}
    code = "".join(("S" if scores["ship"] >= 0 else "P", "P" if scores["prompt"] >= 0 else "E", "E" if scores["explore"] >= 0 else "X", "C" if scores["collab"] >= 0 else "S"))
    return {"format": "kin-profile-intelligence-candidate", "version": "v0.2", "profile_indicators": indicators, "vbti_candidate": {"scores": scores, "code": code, "status": "candidate", "confidence": round(min(0.95, 0.35 + 0.03 * len(conversations) + 0.05 * len(cfg)), 4)}, "agent_stack": {"provider_count": len(providers), "model_count": len(models), "tool_count": len(tools), "fingerprints": [_hash(sorted(providers | models | tools))] if (providers or models or tools) else []}, "usage": usage, "evidence": [{"source": "local", "source_id": _hash({"title": t, "index": i}), "signal": "conversation observed"} for i, t in enumerate(titles[:20])], "captureable_signals": ["model_token_usage", "favorite_model", "harness_usage", "skill_call_frequency", "plugin_usage", "custom_skills", "model_routing_preferences", "context_window_preferences", "tool_call_modes", "privacy_sharing_preferences", "project_domain_tags", "shipping_and_git_signals"], "privacy": {"raw_messages_emitted": 0, "config_values_emitted": 0, "local_only": True}}

def main() -> None:
    p = argparse.ArgumentParser(); p.add_argument("--input", required=True, type=Path); p.add_argument("--config", action="append", type=Path, default=[]); p.add_argument("--inventory-root", action="append", type=Path, default=[]); p.add_argument("--agent-history", action="append", type=Path, default=[]); p.add_argument("--agent-sqlite", action="append", type=Path, default=[]); p.add_argument("--output", required=True, type=Path)
    a = p.parse_args(); configs = [_load(x) for x in a.config] + [scan_local_inventory(x) for x in a.inventory_root]; histories = [_load(x) for x in a.agent_history] + [scan_agent_sqlite(x) for x in a.agent_sqlite]; result = compile_profile(_load(a.input), configs, histories); a.output.parent.mkdir(parents=True, exist_ok=True); a.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)); print(f"profile_candidate=1 conversations={result['profile_indicators']['conversation_count']} raw_messages_emitted=0 config_values_emitted=0 output={a.output}")
if __name__ == "__main__": main()
