# Node / Builder 小天才 — Software Architecture V0.1

**Status:** IMPLEMENTING — backend V0.1 complete locally  
**Date:** 2026-08-27  
**Scope:** 用户 Web/PWA、官网、云后端，以及 Cardputer-Adv / agent_link / ROROLEE 到云端的软件边界。

## 1. 结论

**可以实现，而且 Hackathon 版本不需要复刻完整 EigenFlux。**

最合理的路线是：

1. 保留 EigenFlux 的核心产品机制：结构化 Signal、异步 enrich、语义召回、匹配理由、反馈闭环。
2. 不直接 fork 它的完整生产微服务栈。
3. 用一个适合比赛的模块化单体，把 `用户 UI + 官网 + API + worker + TiDB Vector Search` 先跑成闭环。
4. 硬件仍走比赛官方路径：`Cardputer-Adv -> agent_link -> ROROLEE -> Cloud Agent -> Backend API`。

目标不是做“戴在身上的 EigenFlux”，而是证明：

```text
现实相遇
→ Agent 判断双方为何值得认识
→ 双方显式确认
→ 生成 Shared Context
→ 以后由 Need 找回对方的 Experience
```

## 2. EigenFlux 审计结果

### 2.1 FACT：它确实开放了生产代码

已审计仓库：<https://github.com/phronesis-io/eigenflux>

本地固定版本：

```text
commit 8d9679a7c89d9d87d5e580c610a4abebd541f296
commit date 2026-08-26 21:34:50 +08:00
```

仓库 README 声称这是 eigenflux.ai 的生产代码；代码、迁移、服务、CLI、Console 和部署脚本都存在。

### 2.2 FACT：许可允许修改和部署，但有品牌条件

许可证是 **modified Apache License 2.0**。额外要求是：

- 可以说明“built on EigenFlux”或“compatible with EigenFlux protocol”；
- 独立或修改后的网络不能用 EigenFlux 名称、Logo 或让人误以为官方背书；
- 使用其代码时保留许可证与必要 notice。

因此代码层面可复用，但本项目对外继续使用自己的名称和视觉身份。为降低混淆，**不建议把 `EigenFlow` 作为公开产品品牌**；它最多作为内部架构代号。

### 2.3 FACT：完整 EigenFlux 栈对 Hackathon 过重

源项目约 **219,858 行** Go / TS / SQL，核心依赖包括：

- Go 1.25
- CloudWeGo Hertz + Kitex + Thrift
- PostgreSQL 16
- Redis 7 / Redis Streams
- Elasticsearch 8.11
- etcd
- API、WebSocket、Console API、多个 RPC service、Pipeline 与 Cron

这套架构适合通用 Agent 广播网络，但与本项目有三个明显错位：

1. 比赛要求 TiDB 成为真实数据基础设施，而 EigenFlux 主数据是 PostgreSQL、语义检索是 Elasticsearch。
2. 我们的核心对象是现实 proximity、双向 handshake、relationship memory；EigenFlux 核心对象是 broadcast/feed。
3. 我们需要面向 Builder 的用户 UI 和硬件联动；EigenFlux 自带前端主要是运营 Console。

### 2.4 已运行验证

在 macOS / Node `v22.23.1` 上：

```text
npm ci
→ exit 1
→ @refinedev/core v5 与 @refinedev/react-router-v6 v4 peer dependency 冲突

npm ci --legacy-peer-deps && npm run build
→ exit 0
→ 6585 modules transformed
→ dist 约 3.1 MB
→ 单个 JS chunk 3,232.30 kB（gzip 994.53 kB）
→ npm audit: 14 vulnerabilities（其中 11 high）
```

这说明 Console 可以构建，但不适合作为我们的用户端直接改皮肤后交付。

## 3. 复用边界

### 直接吸收的设计

- `NEED / SOLVED / BUILDING / AVAILABLE / DISCOVERED` Signal 语义。
- 发布后异步做 summary、keywords、domains、quality、embedding。
- Profile 与 Signal 的向量召回。
- 先召回候选，再生成可解释的 `WHY YOU MATCH`。
- impression / feedback / reputation 闭环。
- Agent-facing API/skill 的接入方式。

### 不直接搬用的部分

- PostgreSQL + Elasticsearch 双存储。
- Kitex/Thrift 多微服务。
- etcd service discovery。
- 通用 feed、leaderboard、广告归因、完整运营 Console。
- 现有 React Console 作为用户产品 UI。

### 后续可选复用

如果赛后需要接入开放 Agent 网络，可以写一个 `EigenFluxBridge`：

```text
Local Experience Artifact
→ Context Firewall
→ sanitized broadcast
→ EigenFlux-compatible endpoint
```

Bridge 默认不发送 raw chat、精确位置、私有 relationship memory。

## 4. 推荐 V1 架构

```text
┌───────────────────────────────────────────────┐
│ Web / PWA                                     │
│ 官网 + Onboarding + Radar + Match + Memory    │
└───────────────────────┬───────────────────────┘
                        │ HTTPS + SSE
┌───────────────────────▼───────────────────────┐
│ API（模块化单体）                              │
│ Auth / Profiles / Devices / Presence          │
│ Matches / Handshakes / Relationships          │
│ Needs / Experiences / Agent Gateway           │
└──────────────┬──────────────────┬─────────────┘
               │                  │ job events
        ┌──────▼──────┐    ┌──────▼───────────┐
        │ TiDB Cloud  │    │ Worker / LLM     │
        │ SQL + Vector│    │ compile/embed/why│
        └─────────────┘    └──────────────────┘

Cardputer-Adv -> agent_link -> ROROLEE -> Cloud Agent -> Agent Gateway API
```

### 4.1 技术选型

| 层 | V1 选择 | 原因 |
|---|---|---|
| 官网 + 用户 UI | Next.js + TypeScript + Tailwind/shadcn | 一个工程同时支持官网、PWA、SSR 和移动端 UI |
| API | FastAPI + Pydantic + SQLAlchemy | Agent/LLM 数据结构快，TiDB 的 Python Vector Search 支持最直接 |
| 数据库 | TiDB Cloud Starter | 关系数据与向量放在同一数据库，突出比赛主题 |
| 异步任务 | 单独 Python worker；开发期 DB job table | 先避免引入 Kafka/Celery/etcd |
| 实时更新 | SSE | Match/Handshake/Experience 状态单向推送足够，复杂度低于 WebSocket |
| Embedding | OpenAI-compatible embedding API | 保持模型供应商可替换 |
| LLM | OpenAI-compatible Responses/Chat API | Context compiler 和 match explanation |
| 部署 | Web 与 API 分开容器；TiDB Cloud 托管 | 简化演示环境和故障定位 |

TiDB 官方文档确认 Vector Search 可将关系数据与 embedding 放在同一库，并支持 cosine distance；该能力目前仍是 preview，因此数据访问封装在 repository 层，保留退化到 application-side cosine 或外部向量库的路径：

- <https://docs.pingcap.com/tidb/stable/vector-search-overview/>
- <https://docs.pingcap.com/tidb/stable/vector-search-get-started-using-python/>
- <https://docs.pingcap.com/tidb/stable/mysql-compatibility/>

## 5. 数据模型 V1

```text
users
  id, handle, display_name, avatar_url, created_at

agent_profiles
  user_id, now_building, skills_json, needs_json, interests_json,
  ai_stack_json, public_summary, embedding VECTOR(N), visibility, updated_at

devices
  id, user_id, hardware_uid, pairing_code_hash, status, last_seen_at

presence_sessions
  id, device_id, venue_id, coarse_zone, started_at, expires_at

match_candidates
  id, user_a_id, user_b_id, score, reason_json, status, expires_at

handshakes
  id, match_id, initiator_confirmed_at, peer_confirmed_at,
  proof_nonce_hash, status, completed_at

relationships
  id, user_a_id, user_b_id, handshake_id, shared_context_json,
  visibility, created_at

need_signals
  id, owner_id, problem, context_json, embedding VECTOR(N), status, created_at

experience_artifacts
  id, owner_id, problem, context, cause, worked, failed,
  confidence, visibility, embedding VECTOR(N), created_at

experience_matches
  id, need_id, experience_id, score, explanation, permission_status

events
  id, actor_type, actor_id, type, payload_json, idempotency_key, created_at

jobs
  id, type, payload_json, status, attempts, available_at, last_error
```

所有关键写入都带 `idempotency_key`，避免硬件、手机或 Cloud Agent 重试造成重复 handshake。

## 6. 核心 API V1

```text
POST /v1/auth/demo-session
PUT  /v1/me/profile
GET  /v1/me

POST /v1/devices/pair
POST /v1/devices/{id}/heartbeat

POST /v1/presence
GET  /v1/radar
GET  /v1/matches/{id}

POST /v1/handshakes/{matchId}/confirm
GET  /v1/handshakes/{matchId}
GET  /v1/relationships
GET  /v1/relationships/{id}

POST /v1/needs
GET  /v1/needs/{id}/matches
POST /v1/experiences

POST /v1/agent/events
GET  /v1/events/stream
```

`/v1/agent/events` 的第一版事件：

```json
{
  "event_id": "evt_...",
  "device_id": "dev_...",
  "type": "handshake.confirmed",
  "occurred_at": "2026-08-27T15:00:00+08:00",
  "payload": {
    "match_id": "mat_...",
    "proof_nonce": "one-time-value"
  }
}
```

## 7. 匹配逻辑 V1

LLM 不直接在全库里“凭感觉找人”。流程是：

```text
1. Presence 过滤：同 venue / coarse zone / 有效时间窗
2. TiDB Vector Search：Profile 与 Need 的语义候选 Top-K
3. 规则重排：互补技能、共同兴趣、当前需求、历史连接、隐私级别
4. 得到可复现分数
5. LLM 只把证据转成两句 WHY YOU MATCH
```

建议初始分数：

```text
score =
  0.35 * semantic_similarity
+ 0.30 * need_skill_complementarity
+ 0.15 * shared_interest
+ 0.10 * recency_and_presence
+ 0.10 * proof_or_experience_quality
```

`WHY YOU MATCH` 必须引用双方允许公开的具体字段，不显示隐藏字段，也不把 LLM 推断写成事实。

## 8. 用户 UI

### 8.1 PWA 六个主界面

1. **Onboarding / My Agent**：名字、头像、Now Building、Skills、Needs、Interests、分享级别。
2. **Builder Radar**：只显示当前最值得认识的 1–3 人，不做无限 Feed。
3. **Match Detail**：`WHY YOU MATCH`、可互补点、双方公开证据。
4. **Context Handshake**：等待双方触摸/按键确认，显示明确成功/超时/取消状态。
5. **Relationship Memory**：在哪里认识、为什么认识、共同主题、Follow-up。
6. **Ask the Room**：提交 Need，展示匹配到的 Experience Artifact 与可信度。

### 8.2 官网

官网与 PWA 共用 Next.js 工程，但路由和视觉职责分开：

```text
/                 Hero + 核心叙事
/how-it-works     三个 Magic Moments
/privacy          Context Firewall
/live             演示中的匿名网络动态
/join             Waitlist / Hackathon CTA
/app/*            用户 PWA
```

官网不把产品描述成普通社交网络；第一屏应讲清：

> Your agent knows who you should meet.

### 8.3 硬件 UI 状态映射

硬件继续只承载：

```text
IDLE
DISCOVERING
MATCH
HANDSHAKE
CONNECTED
LISTENING
EXPERIENCE_FOUND
```

Web/PWA 承载详细解释、权限、编辑和关系回顾；Node 不做缩小版手机。

## 9. 三个 Demo 闭环

### Demo A — Builder Radar

- 两个测试用户有预置 Profile。
- 两台设备进入同一 coarse zone。
- 后端返回 Match + Why。
- Node 与手机同时显示对应状态。

### Demo B — Context Handshake

- 后端创建一次性 match/nonce。
- 双方设备分别确认。
- transaction 内把 handshake 改为 `connected` 并创建 relationship。
- worker 生成 Shared Context。

### Demo C — Ask the Room

- 用户说出或输入一个 Need。
- Agent/后端编译成结构化 Need Signal。
- TiDB Vector Search 找 Experience Artifact。
- 权限过滤后返回摘要、confidence、what worked/failed。

## 10. 实施顺序

### Phase S0 — 软件真相与骨架（现在）

- [x] EigenFlux 源码、许可、架构与 Console build 审计。
- [x] 确定“不 fork 完整栈，吸收机制”的方向。
- [x] 建立 `apps/api`、`packages/contracts`、`infra/migrations`；`apps/web` 等设计交付后建立。
- [x] 建立 TiDB 最小 migration；真实 TiDB Cloud 实例等待连接信息。

### Phase S1 — 无硬件也可验证的垂直切片

- [x] 后端 Profile onboarding API。
- [x] 两个用户 Radar + Match reason API。
- [x] 双设备 HTTP simulator + 双方 handshake。
- [x] Relationship Memory 落库。
- [x] Need -> Experience 语义检索。
- [ ] Web/PWA 页面。

**退出条件：** 浏览器中能完整演示 Discover → Understand → Handshake → Remember → Help。

### Phase S2 — 接入官方硬件路径

- 定义 Cloud Agent event contract。
- ROROLEE / agent_link 事件进入 `/v1/agent/events`。
- 设备与 Web 状态一致。
- 重试、超时、幂等验证。

**退出条件：** 两台实机完成一次成功和一次超时 handshake。

### Phase S3 — 官网与 Demo polish

- 官网视觉与叙事。
- 演示数据 seed。
- 断网/LLM 超时降级。
- 观测日志与一键 reset demo。

## 11. 可实现性与主要风险

### 可实现性判断

| 范围 | 判断 |
|---|---|
| Hackathon 三个 Magic Moments | **可实现** |
| 用户 PWA + 官网 | **可实现** |
| TiDB 关系数据 +向量检索 | **可实现** |
| 完整 EigenFlux 规模网络 | **不应作为比赛范围** |
| 全量 AI 历史导入 | **不应作为比赛范围** |

### 风险与处理

1. **ROROLEE / Cloud Agent 接口仍需对齐**：先用相同 JSON contract 的 simulator，不阻塞后端和 UI。
2. **TiDB Vector Search 是 preview**：封装 repository；Demo 数据量下可无 ANN index 运行。
3. **LLM latency**：候选排序不依赖 LLM；Why/Shared Context 使用缓存和预生成。
4. **双方确认竞态**：transaction + unique key + idempotency key。
5. **隐私泄露**：先做 visibility filter，再做 embedding retrieval 和 LLM explanation；不把私有原文送入跨用户 prompt。
6. **范围失控**：第一版不做通用 feed、排行榜、完整聊天导入、复杂 reputation、Campfire。

## 12. 当前建议决策

**D009 — ACCEPTED**  
软件 V1 采用 `Next.js PWA + FastAPI modular monolith + TiDB Cloud Vector Search + lightweight worker`。

**D010 — ACCEPTED**  
EigenFlux 作为公开源码参考与未来 bridge 目标，不直接 fork 全量生产栈。

**D011 — ACCEPTED**  
先完成纯 Web 的端到端闭环，再把真实 Cardputer-Adv / ROROLEE 事件接入同一 contract。
