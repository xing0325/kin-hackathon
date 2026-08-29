import json
from tools.kin_profile_intelligence import compile_profile

def test_compiles_without_raw_or_config_values():
    out = compile_profile({"format":"kin-conversation-export", "conversations":[{"id":"x","title":"Ship BLE","messages":[{"role":"user","content":"build and deploy"},{"role":"assistant","content":"done"}]}]}, [{"providers":["OpenAI"],"models":["secret-model"],"tools":["mcp-db"]}])
    blob = json.dumps(out)
    assert out["privacy"] == {"raw_messages_emitted":0,"config_values_emitted":0,"local_only":True}
    assert "build and deploy" not in blob and "secret-model" not in blob
    assert out["profile_indicators"]["conversation_count"] == 1

def test_aggregates_model_tokens_harness_skills_plugins_and_custom_skills():
    cfg = {"custom_skills": ["my-skill"], "usage_events": [
        {"model":"gpt-x", "input_tokens":10, "output_tokens":5, "total_tokens":15, "harness":"codex", "skills":["kin-profile"], "plugins":["github"], "favorite_model":True},
        {"model":"gpt-x", "input_tokens":4, "output_tokens":6, "total_tokens":10, "harness":"codex", "skills":["kin-profile"], "plugins":["github", "slack"]},
    ]}
    usage = compile_profile({"format":"kin-conversation-export","conversations":[]}, [cfg])["usage"]
    assert usage["models"]["gpt-x"]["total_tokens"] == 25
    assert usage["favorite_model"] == "gpt-x"
    assert usage["harnesses"] == {"codex": 2}
    assert usage["skills"] == {"kin-profile": 2}
    assert usage["plugins"] == {"github": 2, "slack": 1}
    assert usage["custom_skills"] == ["my-skill"]

def test_merges_agent_history_as_second_input():
    from tools.kin_profile_intelligence import compile_profile
    out = compile_profile({"format":"kin-conversation-export", "conversations":[]}, [], [{"format":"kin-agent-export", "sessions":[{"title":"local task", "messages":[{"role":"user","content":"experiment"},{"role":"assistant","content":"done"}]}]}])
    assert out["profile_indicators"]["conversation_count"] == 1
