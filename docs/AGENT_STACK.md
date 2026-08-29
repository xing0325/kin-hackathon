# KIN Agent Stack 使用说明

## 1. Agent 在闭环中的职责

KIN Agent 不只是转发设备事件。它接收用户 Profile、现场 Presence、硬件输入和 Need Signal，并负责：

1. 判断附近两位 Builder 是否存在值得解释的互补关系；
2. 生成具体的 `WHY YOU MATCH`，而不是只返回一个分数；
3. 校验双方的现实动作与明确同意，决定是否建立 Relationship；
4. 把 Need 与可分享的 Experience Artifact 做语义匹配；
5. 将结果转换为设备可执行的显示、声音和状态变化。

ESP32 只执行感知、身份、交互和反馈。复杂推理、向量检索与 Relationship Memory 位于 Agent/API/TiDB 层。

## 2. 输入 → 判断 → Tool → 输出

| 用户或设备输入 | Agent 的理解与决定 | Skill / Tool / Service | 最终输出 |
| --- | --- | --- | --- |
| 两个 Node 同场 + Profile | 召回候选，解释共同兴趣与技能互补 | `MatchEngine` + TiDB Profile Vector Search | 两台设备显示 `MATCH FOUND / WHY YOU MATCH` |
| 双方 G0 确认 + BMI270 gesture | 校验 match、nonce、3 秒相关窗口、双方身份与幂等性 | `HandshakeService` + Agent event gateway | `KIN CONNECTED`、短音、Relationship Memory |
| 用户提出一个 Need | 提炼 Problem/Context，并检索相似经验 | `ExperienceSearch` + TiDB Vector Search | `EXPERIENCE FOUND` 与结构化建议 |
| 用户批准 Experience Candidate | 检查 visibility，只发布派生摘要 | `ContextFirewall` + Experience repository | 可被后续 Need 检索的 Artifact |

## 3. Agent 配置边界

- **角色**：现实社交上下文协调 Agent，帮助 Builder 发现人与经验。
- **上下文**：只使用字段级允许的 Builder Profile、Presence、Need、Relationship 和已批准 Experience。
- **模型**：使用 OpenAI-compatible LLM/embedding provider；模型供应商通过服务端环境变量替换。
- **行为边界**：不得把完整聊天或私有 Profile 发送给另一台设备；不得用单方动作创建双边关系；必须输出匹配理由。
- **失败策略**：LLM 不参与事务一致性判断。握手窗口、双方确认、幂等和权限由确定性领域代码执行。

## 4. 关键 Skills / Tools / Custom Services

### Profile / Context Compiler

输入：`building`、`skills`、`needs`、`interests`、少量用户选择的近期 Context。
输出：结构化 Builder Profile、摘要和 embedding。
隐私：Raw Conversation 留在浏览器 IndexedDB；发布前需要用户确认。

### Match Engine

输入：现场 Presence 与两份可见 Profile。
流程：Presence filter → TiDB Vector Top-K → 规则重排 → explanation。
输出：score、reason、互补点和共同点。

### Handshake Service

输入：`gesture`、`confirm`、device identity、match id、one-time nonce。
规则：双方设备、有效时间窗、双边确认、幂等写入。
输出：唯一 Relationship 与 Shared Context。

### Experience Search

输入：Need 的 Problem 与 Context。
流程：embedding → TiDB Vector Search → visibility filter → explanation。
输出：Experience Artifact、相似度和为什么适用。

### Device Output Tool

Agent 决定被映射为 Agent_link generic/custom event，再由 Cardputer Board Adapter 执行：

```text
display_text / ui_state → ST7789V2 screen
play_tone               → ES8311 + speaker
read_gesture            ← BMI270
read_confirm            ← G0 / keyboard
battery / identity      ← Cardputer board callbacks
```

## 5. 关键事件示例（脱敏）

```json
{
  "event_id": "evt_demo_001",
  "device_id": "NODE-XXXX",
  "type": "handshake.confirmed",
  "occurred_at": "2026-08-29T12:00:00+08:00",
  "payload": {
    "match_id": "mat_demo",
    "proof_nonce": "[REDACTED]"
  }
}
```

```text
PHYSICAL_GATE_RESULT PASS
devices=2
match_id=mat_[REDACTED]
relationship_id=rel_[REDACTED]
output="KIN CONNECTED / CONTEXT SAVED"
```

## 6. 主办方与团队模块边界

- **主办方提供**：Agent_link SDK / protocol、ROROLEE / Deotaland 接入路径。
- **团队配置**：Agent role、Prompt 行为边界、模型/embedding provider、现场账号与设备绑定。
- **团队开发**：Cardputer-Adv Board Adapter、BLE Relay/Gateway contract、Match/Handshake/Experience services、TiDB schema/vector query、Web 与设备 UI。

这三个边界在 [一页架构图](assets/kin-architecture.svg) 中用不同颜色表示。
