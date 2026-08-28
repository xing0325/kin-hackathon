# PROJECT_CONTEXT.md

## 1. Project

正式产品名：

**KIN**

> Humans have social networks. Agents need kin.

KIN 的语义是同类、亲缘与伙伴。产品不把连接表达为 `add friend`，而是：

> recognize kin

这是一个面向 Builder 和 AI 重度用户的：

**Personal Agent 社交网络 + 实体社交终端。**

最直观的产品类比：

> 程序员 / Builder 世界的小天才电话手表。

更准确的定义：

> 让 Agent 先发现和理解其他 Agent，再帮助背后的人在现实世界建立有价值的连接。

长期愿景：

**Personal Agent 时代的人际关系层。**

---

## 2. Problem

项目主要解决两个问题。

### Problem A — Hidden Experience

很多人的 Agent 已经帮助他们解决过大量独特问题。

这些经验通常只存在于：

- AI 对话
- Agent Memory
- 本地项目
- Debug 过程
- 私人工作流

它们没有成为博客、GitHub Issue、知乎回答或搜索引擎可以找到的网页。

因此：

> 我正在解决的问题，很可能另一个人的 Agent 已经陪他解决过。

我们希望建立一个 Agent Experience Network。

Agent 可以替用户询问：

> “谁以前遇到过类似问题？”

其他 Agent 在权限允许范围内，返回凝缩后的 Experience Artifact，而不是泄露用户完整聊天记录。

产品类比：

**AI 百度贴吧 / AI 知乎，但浏览、提问、匹配和初步回答的主体变成 Agent。**

---

### Problem B — Humans Have Poor Social Context

两个第一次见面的 Builder 很难迅速知道：

- 对方真正会什么
- 最近在 Build 什么
- 最近卡在哪里
- 长期关注什么
- 使用什么 AI / Agent Stack
- 我们为什么值得认识

但 Personal Agent 可能已经从长期交互中理解这些信息。

因此：

> 陌生人不了解一个人，但他的 Agent 可能非常了解他。

在用户授权后，可以让两个 Agent 先寻找交集，再帮助两个人建立连接。

---

## 3. Core Loop

项目最核心的循环：

**Discover → Understand → Handshake → Remember → Help**

### Discover

Agent / Node 发现附近存在值得认识的 Builder。

不是：

> “附近有 10 个用户。”

而是：

> “附近有人正在做你正在寻找的东西。”

### Understand

云端 Agent 根据双方允许公开的 Profile 计算：

**WHY YOU MATCH**

而不仅仅显示一个没有解释的匹配百分比。

### Handshake

两个人通过现实世界中的明确动作建立连接。

概念名：

**Context Handshake**

第一版的具体识别方式尚未最终确定，取决于 OJBadge 实际传感器。

候选：

- 设备碰一碰
- 同时触摸确认
- IMU 握手 / 碰拳动作
- NFC
- BLE / ESP-NOW proximity + explicit confirmation

不能在确认硬件能力前锁死方案。

### Remember

建立连接以后产生：

**Relationship Memory / Shared Context**

例如：

- 在哪里认识
- 为什么认识
- 共同兴趣
- 双方当时在 Build 什么
- 答应后续做什么

### Help

之后某人的 Agent 发现：

> 对方刚刚解决了自己当前的问题。

这段关系因此重新产生价值。

---

## 4. Magic Moments

Hackathon Demo 优先证明三个时刻。

### Magic Moment 1 — Builder Radar

两个 Builder 接近。

设备提示：

**MATCH FOUND**

并解释：

**WHY YOU MATCH**

例如：

> A 正在做 Agent Wearable。  
> B 最近做过 ESP32 Agent Hardware。

### Magic Moment 2 — Context Handshake

两人完成一个明确的现实动作。

两个设备确认：

**CONTEXT HANDSHAKE → CONNECTED**

云端生成 Shared Context。

### Magic Moment 3 — Ask the Room

用户对设备说：

> “有没有人解决过 ESP32 BLE 经常断连？”

系统把它转成 Need Signal。

其他 Agent 搜索自己的 Experience，并找到类似经历。

需求方收到：

**EXPERIENCE FOUND**

这三个体验优先级高于其他所有功能。

---

## 5. Social Layer

### Agent Persona

每个人拥有自己的 Personal Agent Persona：

- Name
- Avatar
- Personality
- Sharing policy

它应该带有一点电子宠物 / 游戏角色感。

产品语言不是：

> User #19284 connected.

而是：

> Nova met Momo.

---

### Builder Profile

Profile 不是传统 LinkedIn 简历。

它更像动态 Builder Dashboard。

核心维度：

- Now Building
- Skills
- Needs
- Interests
- AI Stack
- Agent / Skills / MCP
- Projects
- Experience
- Proof Graph

长期可以增加：

**VBTI — Vibe Builder Type Indicator**

它是 Builder 文化身份系统，而不是严肃心理诊断。

---

### Proof Graph

不用 Followers 作为主要社会资本。

优先展示真实行为：

- Shipped
- Open Source
- Helped
- Collaborated
- Hackathons
- Projects

核心思想：

> 不强调“我声称自己是谁”，强调“我实际做过什么”。

---

## 6. Experience Network

网络中的 Agent 可以发布 / 查询结构化 Signal。

例如：

**NEED**

我需要 ESP-IDF BLE 帮助。

**SOLVED**

我以前解决过某个 BLE reconnect 问题。

**BUILDING**

我正在做 Agent wearable。

**AVAILABLE**

我在找 Hackathon teammate。

**DISCOVERED**

我发现了一种值得其他 Agent 知道的 workflow。

Experience Network 交换的是：

**Experience Artifact**

而不是完整 Chat Log。

例如：

- Problem
- Context
- Cause
- What worked
- What failed
- Confidence
- Source owner / permission metadata

### Conversation ingestion policy

**DECISION:** KIN 本地采集端默认保留已发现的全部 AI 会话。

只有用户主动将某个 session 标记为 `Ignore` 时，该 session 才会被排除；`Ignore` 状态在后续重新采集时保持有效。

这个默认全量策略仅适用于用户本地 Conversation Vault。Raw Conversation 不因此自动进入 KIN Cloud 或 Experience Network；云端仍只接收后续提炼并经用户确认的 Experience Artifact。

V0.3 网页端采集器覆盖 ChatGPT、Claude、Gemini、豆包和 DeepSeek，并同时支持 Chrome / Edge 与 Firefox / Zen。Raw Conversation 正文保存在浏览器扩展自己的 IndexedDB Conversation Vault；弹窗只读取元数据。ChatGPT 使用当前登录态进行列表分页和详情增量读取，并通过节流、重试及跳过未变化记录来适配数百至数千条历史；其他四个平台和 ChatGPT 的兜底路径继续使用深度滚动与 DOM 抓取。

---

## 7. Privacy Contract

这是不可妥协的产品原则。

### Raw Context belongs to the user

用户完整 AI 对话默认不进入公共网络。

### Derived Context

社交网络优先使用从私人数据中推导出的高层信息。

例如：

✅ “最近在学习 ESP32。”

而不是：

❌ 上传 80 条和 Claude 的完整聊天。

### Context Firewall

未来至少支持：

- Public
- Friends
- Trusted
- Private

### Handshake ≠ Raw Data Transfer

硬件之间不直接交换双方完整 Profile 或聊天历史。

Context Handshake 的主要作用是：

**证明两个人发生了一次双方同意的现实关系建立事件。**

真正的 Shared Context 在授权后由 Agent / Cloud 生成。

---

## 8. Hardware

比赛主开发硬件：

**两台 M5Stack Cardputer-Adv。**

FACT：主办方已由用户转述口头确认，可以使用自有 Cardputer-Adv 开发和演示，条件是使用主办方 `agent_link` 通信/协议路径。

FACT：Cardputer-Adv 自带 ESP32-S3、BLE/Wi-Fi、240x135 ST7789V2 屏、TCA8418 56 键键盘、BMI270 六轴 IMU、ES8311 codec、MEMS 麦克风、功放/喇叭、电池和 microSD；没有 NFC 或震动。

DECISION：不拆解 Cardputer，不把模块飞线接入 OJBadge。OJBadge 保持原厂固件、完整 Flash 备份和 Phase 0 硬件证据，不进入 MVP 关键路径。

FACT：`agent_link` 当前没有 Cardputer-Adv 板级适配。需要实现最小 Board Adapter：

- `config.h`
- `config.json`
- Board `.cc`
- Kconfig registration
- CMake registration

并实现必要能力和 callbacks。

### 当前 UNKNOWN

- 两台实物的具体 revision、原厂固件和运行状态。
- Agent_link 与 ROROLEE 的双设备连接拓扑。
- Cardputer-Adv 音频 MCLK/功放控制在 ESP-IDF 5.5.4 下的最终初始化序列。
- 主办方所称 `AgentStack` 的确切仓库、版本和必须使用的接口；在身份确认前不把同名第三方框架当作赛事组件。

---

## 9. Connectivity Architecture

比赛官方基础路径：

```text
Cardputer-Adv A / B
   │
   │ BLE / agent_link
   ▼
ROROLEE
   │
   ▼
Cloud Agent
```

第一阶段必须先跑通这个路径。

Node ↔ Node 的现实社交事件采用：

**Agent_link/Cloud 匹配 + BMI270 手势候选 + 双方按键显式确认。**

不依赖 NFC、震动或 ESP-NOW。若 ROROLEE 不能同时连接两台设备，再为双机候选事件增加最小本地 BLE 辅助通道；该通道不得替代明面上的 Agent_link 官方链路。

---

## 10. AI / Backend

ESP32 不承担复杂 AI 推理。

目标结构：

```text
Cardputer-Adv
   ↓
ROROLEE / Phone
   ↓
EigenFlow Agent Layer
   ↓
TiDB
```

暂定将软件层称作：

**EigenFlow**

EigenFlux 是重要灵感 / 参考项目，但我们的项目不是简单地把 EigenFlux 塞进硬件。

EigenFlow 负责：

- Agent Profile
- Context Compiler
- Match Engine
- Experience Network
- Need Signal
- Shared Context
- Relationship Memory
- Campfire

---

## 11. TiDB

TiDB 是项目真实的数据基础设施，而不是为了比赛强行加入。

建议核心数据模型：

```text
users
devices
agent_profiles

relationships
handshakes

need_signals
experience_artifacts

proofs
matches
```

需要语义搜索的对象应具有 embedding，例如：

```text
agent_profiles
need_signals
experience_artifacts
```

主要查询：

> 哪些 Experience 与当前 Need 最相似？

以及：

> 当前两个人为什么值得认识？

---

## 12. Context Compiler V1

长期愿景是理解：

- ChatGPT
- Claude
- Gemini
- Codex
- Claude Code
- GitHub
- Skills
- Memory
- Local Agent history

但 Hackathon **不做全平台聊天历史抓取。**

第一版 Context Compiler 只接受有限输入：

- 当前在 Build 什么
- Skills
- Needs
- Interests
- 少量近期 AI Context
- 可选 GitHub 信息

再由 Agent 凝缩为结构化 Builder Profile。

我们证明的是：

**机制成立。**

不是证明：

**我们写完了所有 AI 产品的历史导入器。**

---

## 13. Campfire

多人连接以后可以形成临时 Context Group：

**Campfire**

Agent 综合成员：

- Skills
- Needs
- Interests
- Projects

然后回答：

> “我们这几个人最适合一起做什么？”

Hackathon 中这是 P2/P3 功能。

不能影响核心 Handshake 闭环。

---

## 14. UI Principles

Node 不是缩小版手机。

不做：

- App Store
- 健身
- 通讯录复制品
- 复杂 Feed
- 大量页面

核心 UI State：

```text
IDLE
DISCOVERING
MATCH
HANDSHAKE
CONNECTED
LISTENING
EXPERIENCE_FOUND
```

设备承担：

**Presence + Ritual + Identity + Feedback**

而不是承担完整互联网体验。

---

## 15. Development Phases

### Phase 0 — Hardware Truth

目标：

彻底确认 OJBadge 实际硬件。

输出：

`HARDWARE_REPORT.md`

至少确认：

- exact chips
- pin map
- BSP
- examples
- buses
- flash / PSRAM
- sensors
- audio
- power
- exposed interfaces

这是第一优先级。

### Phase 1 — Cardputer-Adv Bring-up + minimum Adapter

单独跑通：

- display
- keyboard / G0
- BMI270
- microphone
- speaker
- battery
- BLE / agent_link control path

### Phase 2 — agent_link Adapter

建立：

`boards/cardputer-adv/`

最小目标：

```text
Cardputer-Adv
→ BLE
→ ROROLEE
→ Cloud Agent
```

至少实现：

- display output
- voice input
- voice output
- button
- battery if accessible

### Phase 3 — EigenFlow Backend

先支持两名模拟用户。

Profile：

```text
building
skills
interests
needs
experience
```

实现基本 Match Reason。

### Phase 4 — Context Handshake

根据 Phase 0 实际硬件决定最终交互方案。

目标：

两台真实设备完成：

```text
discover
→ explicit social gesture
→ mutual confirmation
→ cloud relationship
→ shared context
```

### Phase 5 — Ask the Room

实现：

```text
voice
→ Need Signal
→ semantic search
→ Experience Artifact
→ result notification
```

### Phase 6 — Polish

最后才增加：

- Agent Avatar
- animations
- VBTI
- Proof Graph polish
- Campfire
- visual effects
- enclosure / wearable form

---

## 16. MVP Definition of Done

比赛版本成功必须满足：

### A

两台真实 Cardputer-Adv 可以稳定运行并完成双方握手；OJBadge 保持可恢复的原厂状态与审计证据。

### B

至少一台成功通过 `agent_link` 与官方 Agent 路径通信。

### C

两个用户拥有不同 Agent Profile。

### D

两个 Node 可以触发 Context Handshake。

### E

Handshake 后产生 Shared Context / Why You Match。

### F

Ask the Room 至少可以完成一次：

```text
Need
→ Experience match
→ Response
```

### G

整个 Demo 能在约 3 分钟内稳定重复演示。

---

## 17. Non-goals

Hackathon V1 明确不做：

- 全量 ChatGPT / Claude / Gemini 历史自动导入
- 完整 Agent Internet
- 完整 Google A2A implementation
- 自研 LLM
- Apple Watch 级智能手表
- Followers / Likes Feed
- 健康监测
- UWB 精确定位
- 完整社交 App
- 自研量产 PCB
- 极复杂 ML Gesture Classifier

---

## 18. North Star

早期最重要的指标不是 DAU。

而是：

**Meaningful Serendipity**

定义：

> 如果没有这个系统，这两个 Builder 本来不会产生的一次有价值连接。

我们最终希望证明：

**Let your agent meet mine.**
