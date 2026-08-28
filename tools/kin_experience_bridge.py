#!/usr/bin/env python3
"""Compile local Collector exports into reviewable Experience Candidates.

The bridge reads raw conversations locally. Its output contains only candidate
artifact fields and minimal source metadata; it never includes message arrays,
URLs, tokens, or the original conversation envelope.
"""
from __future__ import annotations

import argparse
import json
import urllib.request
from pathlib import Path
from typing import Any, Dict, List


def _clip(value: str, limit: int) -> str:
    value = " ".join(str(value).split())
    return value[:limit]


def compile_candidates(envelope: Dict[str, Any]) -> List[Dict[str, Any]]:
    if envelope.get("format") != "kin-conversation-export":
        raise ValueError("unsupported collector export")
    result: List[Dict[str, Any]] = []
    for conversation in envelope.get("conversations", []):
        messages = conversation.get("messages") or []
        users = [m.get("content", "") for m in messages if m.get("role") == "user" and m.get("content")]
        assistants = [m.get("content", "") for m in messages if m.get("role") == "assistant" and m.get("content")]
        if not users or not assistants:
            continue
        title = _clip(conversation.get("title") or "Untitled conversation", 180)
        result.append({
            "artifact": {
                "problem": _clip(users[-1], 4000),
                "context": _clip(f"{conversation.get('source', 'ai')} conversation · {title}", 4000),
                "cause": "待用户确认：本地提炼尚未识别出独立根因。",
                "worked": _clip(assistants[-1], 6000),
                "failed": "待用户补充失败方案。",
                "confidence": 0.55,
                "visibility": "private",
            },
            "source": {
                "source": conversation.get("source", "unknown"),
                "source_id": conversation.get("id"),
                "title": title,
                "generated_at": envelope.get("generatedAt"),
            },
        })
    return result


def post_candidates(candidates: List[Dict[str, Any]], api_base: str, token: str) -> List[Dict[str, Any]]:
    responses = []
    for candidate in candidates:
        request = urllib.request.Request(
            api_base.rstrip("/") + "/v1/experience-candidates",
            data=json.dumps(candidate, ensure_ascii=False).encode(), method="POST",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            responses.append(json.load(response))
    return responses


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--api-base")
    parser.add_argument("--token")
    args = parser.parse_args()
    candidates = compile_candidates(json.loads(args.input.read_text()))
    payload: Dict[str, Any] = {"format": "kin-experience-candidates", "count": len(candidates), "candidates": candidates}
    if args.api_base and args.token:
        payload["uploaded"] = post_candidates(candidates, args.api_base, args.token)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    print(f"compiled={len(candidates)} raw_messages_emitted=0 output={args.output}")


if __name__ == "__main__":
    main()
