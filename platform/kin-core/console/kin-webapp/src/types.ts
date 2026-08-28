export type Action = { key: string; label: string; kind?: "primary" | "secondary"; href?: string };

export type AttentionItem = {
  attention_id: string;
  category: string;
  title: string;
  body: string;
  recommendation: string;
  status: string;
  actions: Action[];
  source_agent_id?: string;
  created_at: number;
};

export type AgentContext = {
  identity_assertion: { display_name: string; verification_level?: string };
  card_summary: {
    agent_description: string;
    human_description: string;
    seeking: string[];
    offering: string[];
  };
  viewer_relation: string;
};

export type TodayData = {
  schema_version: string;
  day: string;
  network_goal: null | { goal_id: string; goal_text: string };
  card_completion: { completed_fields: number; total_fields: number; percent: number };
  brief: { focus_count: number; participation_count: number; encounter_count: number; activity_count: number };
  observation: { state: string; connected: boolean; runtime_known: boolean; last_scan_at: number };
  module_states: Record<string, string>;
  focus_items: AttentionItem[];
  participation_items: AttentionItem[];
  encounters: Array<{ peer_agent_id: string; last_interaction_at: number; interaction_count: number }>;
  agent_contexts: Record<string, AgentContext>;
};

export type SessionData = {
  agent_id: string;
  short_id: string;
  agent_name: string;
  bio: string;
  runtime: string;
  device_name: string;
  onboarding: { state: string; current_step: number; revision: number };
};

export type BuilderProfile = {
  now_building: string;
  skills: string[];
  needs: string[];
  interests: string[];
  ai_stack: string[];
  public_summary: string;
  visibility: "public" | "event" | "private";
};

export type RadarMatch = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  score: number;
  reasons: string[];
  status: "candidate" | "handshaking" | "connected" | string;
  expires_at: string;
  proximity?: { label: string; venue: string; last_seen_at: string };
  peer: null | {
    id: string;
    handle: string;
    display_name: string;
    avatar_url?: string | null;
    profile?: BuilderProfile | null;
  };
};

export type HandshakeState = {
  id: string;
  match_id: string;
  status: string;
  user_a_confirmed: boolean;
  user_b_confirmed: boolean;
  gesture_a_seen: boolean;
  gesture_b_seen: boolean;
  completed_at: string | null;
  relationship_id?: string | null;
};

export type NeedSignal = {
  id: string;
  owner_id: string;
  problem: string;
  context: Record<string, unknown>;
  status: string;
  created_at: string;
};

export type ExperienceArtifact = {
  id: string;
  owner_id: string;
  problem: string;
  context: string;
  cause: string;
  worked: string;
  failed: string;
  confidence: number;
  visibility: string;
  created_at: string;
};

export type ExperienceMatch = {
  id: string;
  need_id: string;
  experience_id: string;
  owner_id: string;
  score: number;
  explanation: string;
  permission_status: string;
  experience: ExperienceArtifact;
};

export type SharedContext = {
  title?: string;
  why_you_met?: string[];
  user_a_building?: string;
  user_b_building?: string;
  next_step?: string;
  venue?: string;
  common_interests?: string[];
  project_overlap?: string[];
  conversation?: string[];
  follow_ups?: Array<{
    id?: string;
    owner_id?: string;
    description: string;
    status?: string;
    due_at?: string | null;
  }>;
};

export type Relationship = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  handshake_id: string;
  shared_context: SharedContext;
  visibility: string;
  created_at: string;
  peer?: {
    id: string;
    handle?: string;
    display_name: string;
    profile?: BuilderProfile | null;
  } | null;
};

export type ProfileFieldState = {
  current_value: unknown;
  previous_value?: unknown;
  kind: "string" | "string_list" | "object" | string;
  public: boolean;
  last_updated_at?: number;
  last_updated_by?: string;
};

export type AgentCardPage = {
  card: { public: Record<string, unknown>; private: Record<string, unknown>; card_version: number; generated_at: number };
  profile_version: number;
  current_values: Record<string, unknown>;
  network_goal: string;
  intent_actions: Array<{ intent_id?: string; watch_for: string }>;
};

export type ProfileRefreshContext = {
  profile_version: number;
  editable_fields: Record<string, ProfileFieldState>;
  protected_paths: string[];
};

export type ExperienceCandidate = {
  id: string;
  source: string;
  source_title: string;
  problem: string;
  context: string;
  cause: string;
  worked: string;
  failed: string;
  confidence: number;
  visibility: "public" | "event" | "private" | string;
  status: "pending" | "approved" | "ignored" | string;
  raw_included: false;
  created_at: string;
};

export type ProfileStudioData = {
  cardPage: AgentCardPage;
  refreshContext: ProfileRefreshContext;
  candidates: ExperienceCandidate[];
};

export type CampfireMember = {
  agent_id: string;
  display_name: string;
  skills: string[];
  needs: string[];
  building: string;
  confirmation: "pending" | "confirmed" | "declined" | string;
};

export type CampfireRole = {
  agent_id: string;
  name: string;
  why: string;
};

export type CampfireProposal = {
  id: string;
  campfire_id: string;
  project_name: string;
  one_liner: string;
  rationale: string;
  roles: CampfireRole[];
  missing: string[];
  status: "proposed" | "formed" | "declined" | string;
};

export type CampfireRoom = {
  id: string;
  name: string;
  venue: string;
  creator_id: string;
  expires_at: string;
  members: CampfireMember[];
  proposal: CampfireProposal;
  status?: string;
  version?: number;
};

export type SignalKind = "NEED" | "BUILDING" | "SOLVED" | "DISCOVERED" | "AVAILABLE";
export type SignalItem = {
  id: string; owner_id: string; kind: SignalKind; statement: string;
  context: Record<string, unknown>; status: string; expires_at?: string | null; created_at: string;
};

export type ProactiveItem = {
  id: string; owner_id: string; kind: string; title: string; body: string;
  action: { label?: string; href?: string }; source_id?: string | null; status: string; created_at: string;
};

export type NotificationItem = {
  id: string; owner_id: string; kind: string; title: string; body: string;
  action: { label?: string; href?: string }; source_id: string;
  delivery_status: "delivered" | "pending" | "failed" | string;
  delivered_at?: string | null; read_at?: string | null; created_at: string;
};

export type OnboardingDraft = {
  identity_card: {
    agent_name: string;
    bio: string;
    agent_description: string;
    human_description: string;
    working_languages: string[];
    seeking: string[];
    offering: string[];
    geo: string;
    timezone: string;
    agent_status: string[];
    human_status: string[];
    interests_negative: string[];
  };
  network_goal: string;
  intent_actions: Array<{
    watch_for: string;
    trigger_when: string;
    action_instruction: string;
    action_policy: string;
    priority: number;
  }>;
  security_boundary: {
    recurring_publish: boolean;
    auto_reply_pm: boolean;
    auto_comment: boolean;
    show_add_friend: boolean;
  };
};
