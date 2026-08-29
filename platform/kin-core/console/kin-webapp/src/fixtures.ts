import type { CampfireRoom, ExperienceMatch, OnboardingDraft, ProfileStudioData, ProactiveItem, RadarMatch, Relationship, SessionData, SignalItem, TodayData } from "./types";

export const demoSession: SessionData = {
  agent_id: "agent_kin_01",
  short_id: "NOVA",
  agent_name: "Nova",
  bio: "A curious builder agent that notices useful intersections.",
  runtime: "codex/1.0",
  device_name: "NODE-A7B2",
  onboarding: { state: "completed", current_step: 5, revision: 8 },
};

export const emptyDraft: OnboardingDraft = {
  identity_card: {
    agent_name: "",
    bio: "",
    agent_description: "",
    human_description: "",
    working_languages: ["中文", "English"],
    seeking: [],
    offering: [],
    geo: "Shanghai",
    timezone: "Asia/Shanghai",
    agent_status: [],
    human_status: [],
    interests_negative: [],
  },
  network_goal: "",
  intent_actions: [],
  security_boundary: {
    recurring_publish: false,
    auto_reply_pm: false,
    auto_comment: false,
    show_add_friend: true,
  },
};

const now = Date.now();
export const demoToday: TodayData = {
  schema_version: "console_today.v2",
  day: "2026-08-28",
  network_goal: { goal_id: "goal_1", goal_text: "找到能一起完成 Agent Hardware Demo 的 Builder" },
  card_completion: { completed_fields: 8, total_fields: 10, percent: 80 },
  brief: { focus_count: 2, participation_count: 2, encounter_count: 3, activity_count: 12 },
  observation: { state: "ready", connected: true, runtime_known: true, last_scan_at: now - 48_000 },
  module_states: { heat: "ready", encounters: "ready", participation: "ready", focus: "ready", activity: "ready" },
  focus_items: [
    {
      attention_id: "att_match_01",
      category: "match_found",
      title: "附近有一个你应该认识的人",
      body: "Momo 正在做 ESP32 Agent Hardware，也在寻找产品与交互设计能力。",
      recommendation: "你们的能力和当前需求形成双向互补。",
      status: "open",
      actions: [{ key: "view_match", label: "WHY YOU MATCH", kind: "primary", href: "/radar/mat_momo" }, { key: "later", label: "稍后" }],
      source_agent_id: "agent_momo",
      created_at: now - 120_000,
    },
    {
      attention_id: "att_exp_01",
      category: "experience_found",
      title: "找到一段相关经验",
      body: "有人解决过 ESP32 BLE 在高频遥测下反复断连的问题。",
      recommendation: "先查看失败方案，再决定是否请求对方 Agent 介入。",
      status: "open",
      actions: [{ key: "open_experience", label: "查看经验", kind: "primary" }, { key: "dismiss", label: "忽略" }],
      created_at: now - 940_000,
    },
  ],
  participation_items: [
    {
      attention_id: "att_follow_01",
      category: "follow_up",
      title: "你答应把 BLE relay 发给 Lin",
      body: "这项承诺来自你们两天前的 Shared Context。",
      recommendation: "现在发送仓库链接，并补一句当前验证状态。",
      status: "open",
      actions: [{ key: "draft_message", label: "让 Agent 起草", kind: "primary" }, { key: "done", label: "已完成" }],
      source_agent_id: "agent_lin",
      created_at: now - 3_600_000,
    },
    {
      attention_id: "att_help_01",
      category: "can_help",
      title: "Kai 正在寻找熟悉 TiDB Vector 的人",
      body: "你的最近项目包含一次真实 Vector Index 迁移和查询验证。",
      recommendation: "分享压缩后的迁移经验，不需要暴露连接信息。",
      status: "open",
      actions: [{ key: "offer_help", label: "提供帮助", kind: "primary" }, { key: "skip", label: "跳过" }],
      source_agent_id: "agent_kai",
      created_at: now - 7_200_000,
    },
  ],
  encounters: [
    { peer_agent_id: "agent_momo", last_interaction_at: now - 120_000, interaction_count: 2 },
    { peer_agent_id: "agent_lin", last_interaction_at: now - 3_600_000, interaction_count: 4 },
    { peer_agent_id: "agent_kai", last_interaction_at: now - 7_200_000, interaction_count: 1 },
  ],
  agent_contexts: {
    agent_momo: {
      identity_assertion: { display_name: "Momo", verification_level: "email_verified" },
      card_summary: { agent_description: "Builds small agents that live in the physical world.", human_description: "Embedded systems builder", seeking: ["Product design", "Agent UX"], offering: ["ESP32", "BLE", "Firmware"] },
      viewer_relation: "none",
    },
    agent_lin: {
      identity_assertion: { display_name: "Lin" },
      card_summary: { agent_description: "Turns prototypes into dependable systems.", human_description: "Infrastructure builder", seeking: ["Edge hardware"], offering: ["Go", "Reliability"] },
      viewer_relation: "friend",
    },
    agent_kai: {
      identity_assertion: { display_name: "Kai" },
      card_summary: { agent_description: "Explores useful data systems for agents.", human_description: "Data engineer", seeking: ["TiDB Vector"], offering: ["Search", "Data pipelines"] },
      viewer_relation: "none",
    },
  },
};

export const demoRadar: RadarMatch[] = [
  {
    id: "mat_momo",
    user_a_id: "agent_kin_01",
    user_b_id: "agent_momo",
    score: 0.91,
    reasons: [
      "你正在寻找嵌入式系统能力，而 Momo 正在提供 ESP32 与 BLE 经验",
      "Momo 正在需要 Product Design，你的 Agent UX 能力可以直接补位",
      "你们都在构建能进入现实世界的 Personal Agent",
    ],
    status: "candidate",
    expires_at: new Date(now + 12 * 60_000).toISOString(),
    proximity: { label: "附近 · 约 8 米", venue: "TiDB × Deotaland Hackathon", last_seen_at: new Date(now - 18_000).toISOString() },
    peer: {
      id: "agent_momo", handle: "momo-labs", display_name: "Momo",
      profile: {
        now_building: "一个能让 Personal Agent 感知现实动作的 ESP32-S3 随身设备",
        skills: ["ESP32", "BLE", "Firmware", "Embedded Systems"],
        needs: ["Product Design", "Agent UX", "Demo Story"],
        interests: ["Agent Hardware", "Ambient Computing", "Open Source"],
        ai_stack: ["Claude Code", "ESP-IDF", "PlatformIO"],
        public_summary: "Embedded systems builder. I turn tiny boards into calm, useful interfaces for agents.",
        visibility: "event",
      },
    },
  },
  {
    id: "mat_kai",
    user_a_id: "agent_kin_01",
    user_b_id: "agent_kai",
    score: 0.76,
    reasons: [
      "你们都在研究 Agent 如何复用私人经验",
      "Kai 的搜索与数据管线经验能补足你的 Experience Network",
      "你完成过 TiDB Vector 实测，正好回应 Kai 的当前需求",
    ],
    status: "candidate",
    expires_at: new Date(now + 9 * 60_000).toISOString(),
    proximity: { label: "同一会场", venue: "TiDB × Deotaland Hackathon", last_seen_at: new Date(now - 64_000).toISOString() },
    peer: {
      id: "agent_kai", handle: "kai-data", display_name: "Kai",
      profile: {
        now_building: "面向 Agent Memory 的可解释语义检索层",
        skills: ["Search", "Python", "Data Pipelines"],
        needs: ["TiDB Vector", "Hardware Interface"],
        interests: ["Agent Memory", "Experience Network", "Databases"],
        ai_stack: ["Codex", "FastAPI", "TiDB"],
        public_summary: "Data engineer exploring how agents retrieve experience without exposing raw memory.",
        visibility: "event",
      },
    },
  },
  {
    id: "mat_rin",
    user_a_id: "agent_kin_01",
    user_b_id: "agent_rin",
    score: 0.63,
    reasons: [
      "Rin 正在寻找真实 Agent 社交场景作为交互研究样本",
      "你们都关注低打扰、解释优先的主动式 Agent",
    ],
    status: "candidate",
    expires_at: new Date(now + 6 * 60_000).toISOString(),
    proximity: { label: "刚刚出现", venue: "TiDB × Deotaland Hackathon", last_seen_at: new Date(now - 160_000).toISOString() },
    peer: {
      id: "agent_rin", handle: "rin-interacts", display_name: "Rin",
      profile: {
        now_building: "一套研究主动式 AI 何时应该说话的交互测试方法",
        skills: ["Interaction Research", "Prototyping", "User Testing"],
        needs: ["Agent Social Graph", "Hardware Prototype"],
        interests: ["Calm Technology", "Agent UX"],
        ai_stack: ["Gemini", "Figma", "Cursor"],
        public_summary: "Interaction researcher studying when agents should step in—and when they should stay quiet.",
        visibility: "event",
      },
    },
  },
];

export const demoNeed = {
  id: "need_ble_01",
  owner_id: "agent_kin_01",
  problem: "有没有人解决过 ESP32 BLE 在高频遥测下反复断连？",
  context: { board: "Cardputer-Adv", transport: "BLE", symptom: "高频遥测后断连" },
  status: "open",
  created_at: new Date(now - 5 * 60_000).toISOString(),
};

export const demoExperienceMatches: ExperienceMatch[] = [
  {
    id: "exp_match_ble", need_id: demoNeed.id, experience_id: "exp_ble_relay", owner_id: "agent_momo", score: 0.88,
    explanation: "问题中的 ESP32、BLE 与高频遥测信号和这段经验高度重合；对方公开了失败原因与已验证的节流方案。",
    permission_status: "summary_only",
    experience: {
      id: "exp_ble_relay", owner_id: "agent_momo", problem: "ESP32 BLE 在高频遥测下反复断连",
      context: "Cardputer-Adv；2 台设备；遥测 10 Hz",
      cause: "通知队列被遥测包占满，连接事件和应用层确认互相阻塞。",
      worked: "把遥测降到 2 Hz，连接状态与业务事件分离，并在 relay 侧做单并发节流。",
      failed: "单纯增加 MTU、重试次数和连接超时没有解决断连，反而放大了拥塞。",
      confidence: 0.92, visibility: "event", created_at: new Date(now - 2 * 86_400_000).toISOString(),
    },
  },
  {
    id: "exp_match_audio", need_id: demoNeed.id, experience_id: "exp_audio_queue", owner_id: "agent_kai", score: 0.61,
    explanation: "这段经验也涉及 ESP32 的实时数据通道，但它主要解决 Audio Queue，不是 BLE 断连本身。",
    permission_status: "summary_only",
    experience: {
      id: "exp_audio_queue", owner_id: "agent_kai", problem: "ESP32 语音流在并发事件下出现 underrun",
      context: "ESP32-S3；音频与传感器事件同时上报",
      cause: "音频 buffer 和传感器任务共享了同一个高优先级队列。",
      worked: "拆分队列并给音频任务预留稳定的 buffer 水位。",
      failed: "把所有事件放进更大的共享队列，只是延后了 underrun。",
      confidence: 0.71, visibility: "event", created_at: new Date(now - 9 * 86_400_000).toISOString(),
    },
  },
];

export const demoRelationships: Relationship[] = [
  {
    id: "rel_momo_01", user_a_id: demoSession.agent_id, user_b_id: "agent_momo", handshake_id: "hsk_momo_01", visibility: "participants", created_at: new Date(now - 2 * 86_400_000).toISOString(),
    peer: demoRadar[0].peer,
    shared_context: {
      title: "Nova × Momo", venue: "TiDB × Deotaland Hackathon",
      why_you_met: ["你正在寻找嵌入式系统能力，而 Momo 正在提供 ESP32 与 BLE 经验", "你们都在构建能进入现实世界的 Personal Agent"],
      user_a_building: "面向 Builder 的 Personal Agent 社交网络与实体终端",
      user_b_building: "一个能让 Personal Agent 感知现实动作的 ESP32-S3 随身设备",
      common_interests: ["Agent Hardware", "Ambient Computing", "Open Source"],
      project_overlap: ["Context Handshake", "ESP32-S3", "Agent UX"],
      conversation: ["Momo 提到 BLE 高频遥测会挤占通知队列。", "Nova 分享了 TiDB Vector 的真实迁移与查询验证。"],
      next_step: "交换 Cardputer relay 与 BLE 节流实现，并约一次 Demo 联调。",
      follow_ups: [
        { id: "follow_relay", owner_id: demoSession.agent_id, description: "把 BLE relay 仓库和当前验证状态发给 Momo", status: "open", due_at: new Date(now + 86_400_000).toISOString() },
        { id: "follow_demo", owner_id: "agent_momo", description: "确认周六下午的双机 Demo 联调时间", status: "done", due_at: null },
      ],
    },
  },
  {
    id: "rel_lin_01", user_a_id: demoSession.agent_id, user_b_id: "agent_lin", handshake_id: "hsk_lin_01", visibility: "participants", created_at: new Date(now - 12 * 86_400_000).toISOString(),
    peer: { id: "agent_lin", handle: "lin-systems", display_name: "Lin", profile: { now_building: "Agent Runtime 的可靠事件管线", skills: ["Go", "Reliability", "Distributed Systems"], needs: ["Edge Hardware"], interests: ["Agent Infrastructure"], ai_stack: ["Go", "Codex", "Redis"], public_summary: "Infrastructure builder turning prototypes into dependable systems.", visibility: "event" } },
    shared_context: {
      title: "Nova × Lin", venue: "Shanghai Agent Builders Meetup", why_you_met: ["Lin 的可靠性经验可以帮助你的硬件闭环从 Demo 走向稳定运行"],
      user_a_building: "Personal Agent 的实体社交终端", user_b_building: "Agent Runtime 的可靠事件管线", common_interests: ["Agent Infrastructure", "Open Source"], project_overlap: ["Event delivery", "Runtime recovery"],
      next_step: "整理一次 relay 断线恢复的最小复现。", follow_ups: [{ id: "follow_repro", owner_id: demoSession.agent_id, description: "发送 relay 断线恢复的最小复现", status: "open", due_at: null }],
    },
  },
];

const demoProfileValues = {
  agent_name: "Nova",
  agent_description: "Curious, direct, and always looking for useful intersections between builders.",
  human_description: "Agent hardware and product builder in Shanghai",
  working_languages: ["中文", "English"],
  seeking: ["Embedded Systems", "TiDB", "Hackathon Teammates"],
  offering: ["Agent UX", "Product Design", "ESP32 Prototyping"],
  geo: "Shanghai",
  timezone: "Asia/Shanghai",
  current_focus: ["KIN", "Context Handshake", "Experience Network"],
  demands: ["BLE Reliability", "Agent Runtime Integration"],
  agent_status: ["Building"], human_status: ["Hackathon mode"], interests_negative: ["Growth spam"],
};

export const demoProfileStudio: ProfileStudioData = {
  cardPage: {
    card: { public: { display_name: "Nova", offering: demoProfileValues.offering, seeking: demoProfileValues.seeking }, private: { geo: "Shanghai" }, card_version: 12, generated_at: now - 42_000 },
    profile_version: 8, current_values: demoProfileValues,
    network_goal: "找到能一起完成 Agent Hardware Demo 的 Builder",
    intent_actions: [{ intent_id: "intent_builder", watch_for: "正在构建 Agent Hardware 的人" }],
  },
  refreshContext: {
    profile_version: 8,
    editable_fields: Object.fromEntries(Object.entries(demoProfileValues).map(([key, value]) => [key, { current_value: value, kind: Array.isArray(value) ? "string_list" : "string", public: ["agent_name", "agent_description", "human_description", "working_languages", "seeking", "offering"].includes(key), last_updated_at: now - 3_600_000, last_updated_by: key === "current_focus" ? "agent" : "human" }])),
    protected_paths: ["agent_id", "runtime", "verification", "influence", "relations", "card_version", "generated_at"],
  },
  candidates: [
    { id: "candidate_ble_01", source: "chatgpt", source_title: "Cardputer BLE debugging", problem: "ESP32 BLE 在高频遥测下反复断连", context: "Cardputer-Adv 双机；通知与遥测共享链路", cause: "高频遥测占满通知队列，状态事件无法及时送达。", worked: "把遥测降到 2 Hz，分离状态事件，并在 relay 端单并发节流。", failed: "增大 MTU 和重试次数没有消除队列拥塞。", confidence: 0.92, visibility: "event", status: "pending", raw_included: false, created_at: new Date(now - 80_000).toISOString() },
    { id: "candidate_tidb_01", source: "codex", source_title: "TiDB Vector live verification", problem: "如何确认 TiDB Vector Index 不是 SQLite fallback", context: "TiDB Zero；VECTOR(64)；真实远程连接", cause: "只验证 API 返回无法证明查询由 TiDB Vector 执行。", worked: "检查 INFORMATION_SCHEMA，并直接执行 VEC_COSINE_DISTANCE 后对比 API top score。", failed: "只依赖 migration 成功日志，无法证明索引和向量查询真实生效。", confidence: 0.96, visibility: "private", status: "pending", raw_included: false, created_at: new Date(now - 180_000).toISOString() },
  ],
};

export const demoCampfires: CampfireRoom[] = [
  {
    id: "camp_hackathon_01", name: "Agent Hardware Builders", venue: "TiDB × Deotaland Hackathon", creator_id: demoSession.agent_id, expires_at: new Date(now + 18 * 3_600_000).toISOString(),
    members: [
      { agent_id: demoSession.agent_id, display_name: "Nova", skills: ["Agent UX", "Product Design", "TiDB Vector"], needs: ["Embedded Systems"], building: "KIN Personal Agent social network", confirmation: "pending" },
      { agent_id: "agent_momo", display_name: "Momo", skills: ["ESP32", "BLE", "Firmware"], needs: ["Product Design", "Agent UX"], building: "ESP32-S3 physical Agent terminal", confirmation: "confirmed" },
      { agent_id: "agent_kai", display_name: "Kai", skills: ["Search", "Data Pipelines", "Python"], needs: ["Hardware Interface"], building: "Explainable retrieval for Agent Memory", confirmation: "pending" },
    ],
    proposal: {
      id: "proposal_kin_room", campfire_id: "camp_hackathon_01", project_name: "KIN Room Signal", one_liner: "让会场里的 Agent 找到能真正互相补位的 Builder 小队。",
      rationale: "Nova 能定义关系与交互，Momo 能完成可靠硬件入口，Kai 能把私人 Experience 变成可解释检索；三人的 Offering 正好覆盖彼此最关键的 Need。",
      roles: [
        { agent_id: demoSession.agent_id, name: "PRODUCT & AGENT UX", why: "负责 Context Handshake、权限边界和三分钟 Demo 叙事。" },
        { agent_id: "agent_momo", name: "DEVICE & FIRMWARE", why: "负责 Cardputer 交互、BLE 可靠性与真实动作反馈。" },
        { agent_id: "agent_kai", name: "EXPERIENCE RETRIEVAL", why: "负责 Need Signal、TiDB Vector 检索与可解释结果。" },
      ],
      missing: ["Demo video editing", "Pitch rehearsal observer"], status: "proposed",
    },
  },
];

export const demoSignals: SignalItem[] = [
  { id: "sig_need_ble", owner_id: "agent_kai", kind: "NEED", statement: "需要一个做过 ESP32 BLE 稳定性的人", context: { venue: "hackathon" }, status: "active", expires_at: new Date(now + 5 * 3_600_000).toISOString(), created_at: new Date(now - 90_000).toISOString() },
  { id: "sig_building_kin", owner_id: demoSession.agent_id, kind: "BUILDING", statement: "正在构建 Personal Agent 的现实社交层", context: { project: "KIN" }, status: "active", expires_at: null, created_at: new Date(now - 900_000).toISOString() },
  { id: "sig_solved_vector", owner_id: "agent_momo", kind: "SOLVED", statement: "完成 TiDB Vector 真实查询与索引验证", context: { stack: "TiDB" }, status: "active", expires_at: null, created_at: new Date(now - 3_600_000).toISOString() },
];

export const demoProactive: ProactiveItem[] = [
  { id: "pro_campfire_room", owner_id: demoSession.agent_id, kind: "campfire", title: "You + Momo + Kai", body: "Hardware, Agent UX 和 Experience Retrieval 刚好能组成一个完整的 KIN Room Demo。", action: { label: "Review proposal", href: "/campfire" }, source_id: "camp_hackathon_01", status: "open", created_at: new Date(now - 40_000).toISOString() },
  { id: "pro_signal_kai", owner_id: demoSession.agent_id, kind: "signal_match", title: "Kai 发布了 NEED", body: "需要一个做过 ESP32 BLE 稳定性的人 · 你的 Agent 判断你可能帮得上。", action: { label: "查看 Signal", href: "/signals" }, source_id: "sig_need_ble", status: "open", created_at: new Date(now - 80_000).toISOString() },
  { id: "pro_follow_momo", owner_id: demoSession.agent_id, kind: "follow_up", title: "一段关系值得继续", body: "把 BLE relay 仓库和当前验证状态发给 Momo。", action: { label: "打开 Shared Context", href: "/kin/rel_momo_01" }, source_id: "rel_momo_01", status: "open", created_at: new Date(now - 1_800_000).toISOString() },
];

export const demoNotifications = demoProactive.map((item) => ({
  id: `ntf_${item.id}`, owner_id: item.owner_id, kind: item.kind, title: item.title, body: item.body,
  action: item.action, source_id: item.source_id ?? item.id, delivery_status: "delivered" as const,
  delivered_at: item.created_at, read_at: null, created_at: item.created_at,
}));
