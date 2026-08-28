import { demoCampfires, demoExperienceMatches, demoNotifications, demoProactive, demoProfileStudio, demoRadar, demoRelationships, demoSession, demoSignals, demoToday, emptyDraft } from "./fixtures";
import type { AgentCardPage, CampfireRoom, ExperienceArtifact, ExperienceCandidate, ExperienceMatch, HandshakeState, NeedSignal, NotificationItem, OnboardingDraft, ProactiveItem, ProfileRefreshContext, ProfileStudioData, RadarMatch, Relationship, SessionData, SignalItem, SignalKind, TodayData } from "./types";
import { confirmCampfireMember } from "./logic";
import { experienceArtifactPayload } from "./logic";

type Envelope<T> = T | { data: T };

function unwrap<T>(payload: Envelope<T>): T {
  return typeof payload === "object" && payload !== null && "data" in payload ? payload.data : payload;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message ?? payload?.message ?? `Request failed: ${response.status}`);
  return unwrap<T>(payload);
}

const kinApiBase = (import.meta.env.VITE_KIN_API_BASE ?? "").replace(/\/$/, "");
const kinDemoToken = import.meta.env.VITE_KIN_API_TOKEN ?? "";

function kinRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (kinDemoToken) headers.Authorization = `Bearer ${kinDemoToken}`;
  return request<T>(`${kinApiBase}${path}`, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } });
}

export const demoMode = new URLSearchParams(window.location.search).get("demo") === "1" || import.meta.env.VITE_KIN_DEMO === "1";
export const appPath = (path: string) => demoMode && !path.includes("demo=1") ? `${path}${path.includes("?") ? "&" : "?"}demo=1` : path;

export const api = {
  async session(): Promise<SessionData> {
    if (demoMode) return demoSession;
    return request<SessionData>("/api/v2/console/session");
  },
  async today(): Promise<TodayData> {
    if (demoMode) return demoToday;
    return request<TodayData>("/api/v2/console/today");
  },
  async radar(): Promise<RadarMatch[]> {
    if (demoMode) return structuredClone(demoRadar);
    return kinRequest<RadarMatch[]>("/v1/radar");
  },
  async match(matchId: string): Promise<RadarMatch> {
    if (demoMode) {
      const match = demoRadar.find((item) => item.id === matchId);
      if (!match) throw new Error("Match 不存在或已经过期");
      return structuredClone(match);
    }
    return kinRequest<RadarMatch>(`/v1/matches/${encodeURIComponent(matchId)}`);
  },
  async confirmHandshake(matchId: string): Promise<HandshakeState> {
    const proofNonce = `web-${crypto.randomUUID()}`;
    if (demoMode) return {
      id: `hsk_${matchId}`, match_id: matchId, status: "pending",
      user_a_confirmed: true, user_b_confirmed: false,
      gesture_a_seen: false, gesture_b_seen: false, completed_at: null,
    };
    return kinRequest<HandshakeState>(`/v1/handshakes/${encodeURIComponent(matchId)}/confirm`, {
      method: "POST",
      body: JSON.stringify({ proof_nonce: proofNonce, idempotency_key: crypto.randomUUID() }),
    });
  },
  async createNeed(problem: string, context: Record<string, unknown>): Promise<NeedSignal> {
    if (demoMode) return { id: `need_${crypto.randomUUID()}`, owner_id: demoSession.agent_id, problem, context, status: "open", created_at: new Date().toISOString() };
    return kinRequest<NeedSignal>("/v1/needs", { method: "POST", body: JSON.stringify({ problem, context }) });
  },
  async experienceMatches(needId: string): Promise<ExperienceMatch[]> {
    if (demoMode) {
      return structuredClone(demoExperienceMatches).map((item) => ({ ...item, need_id: needId }));
    }
    return kinRequest<ExperienceMatch[]>(`/v1/needs/${encodeURIComponent(needId)}/matches`);
  },
  async relationships(): Promise<Relationship[]> {
    if (demoMode) return structuredClone(demoRelationships);
    return kinRequest<Relationship[]>("/v1/relationships");
  },
  async relationship(relationshipId: string): Promise<Relationship> {
    if (demoMode) {
      const relationship = demoRelationships.find((item) => item.id === relationshipId);
      if (!relationship) throw new Error("Relationship 不存在或你没有查看权限");
      return structuredClone(relationship);
    }
    return kinRequest<Relationship>(`/v1/relationships/${encodeURIComponent(relationshipId)}`);
  },
  async profileStudio(): Promise<ProfileStudioData> {
    if (demoMode) return structuredClone(demoProfileStudio);
    const [cardPage, refreshContext, rawCandidates] = await Promise.all([
      request<AgentCardPage>("/api/v2/console/bff/agents/me/card/page"),
      request<ProfileRefreshContext>("/api/v2/console/bff/agents/me/card/refresh-context"),
      kinRequest<Array<{ id: string; artifact: ReturnType<typeof experienceArtifactPayload>; source: Record<string, string>; status: string; created_at: string }>>("/v1/experience-candidates"),
    ]);
    const candidates: ExperienceCandidate[] = rawCandidates.map((item) => ({
      id: item.id, source: item.source.source ?? "local_bridge", source_title: item.source.title ?? "Experience Candidate",
      ...item.artifact, status: item.status === "approved" ? "approved" : item.status === "ignored" ? "ignored" : "pending",
      raw_included: false, created_at: item.created_at,
    }));
    return { cardPage, refreshContext, candidates };
  },
  async updateProfileFields(expectedVersion: number, updates: Record<string, unknown>): Promise<{ profile_version: number; changed_paths: string[] }> {
    if (demoMode) return { profile_version: expectedVersion + 1, changed_paths: Object.keys(updates) };
    return request("/api/v2/console/bff/agents/me/profile/fields", { method: "PUT", body: JSON.stringify({ expected_version: expectedVersion, updates, source: "kin_context_studio", reason: "human_review" }) });
  },
  async approveExperienceCandidate(candidate: ExperienceCandidate): Promise<ExperienceArtifact> {
    const payload = experienceArtifactPayload(candidate);
    if (demoMode) return { id: `exp_${candidate.id}`, owner_id: demoSession.agent_id, ...payload, created_at: new Date().toISOString() };
    return kinRequest<ExperienceArtifact>("/v1/experiences", { method: "POST", body: JSON.stringify(payload) });
  },
  async decideExperienceCandidate(candidate: ExperienceCandidate, decision: "approved" | "ignored"): Promise<void> {
    if (demoMode) return;
    await kinRequest(`/v1/experience-candidates/${encodeURIComponent(candidate.id)}/decision`, {
      method: "POST", body: JSON.stringify({ decision: decision === "approved" ? "approve" : "ignore", idempotency_key: crypto.randomUUID() }),
    });
  },
  async campfires(): Promise<CampfireRoom[]> {
    if (demoMode) return structuredClone(demoCampfires);
    return kinRequest<CampfireRoom[]>("/v1/campfires");
  },
  async confirmCampfire(room: CampfireRoom, agentId: string): Promise<CampfireRoom> {
    if (demoMode) return confirmCampfireMember(room, agentId);
    return kinRequest<CampfireRoom>(`/v1/campfires/${encodeURIComponent(room.id)}/confirm`, {
      method: "POST",
      body: JSON.stringify({ expected_version: room.version ?? 1, idempotency_key: crypto.randomUUID() }),
    });
  },
  async signals(): Promise<SignalItem[]> {
    if (demoMode) return structuredClone(demoSignals);
    return kinRequest<SignalItem[]>("/v1/signals");
  },
  async publishSignal(kind: SignalKind, statement: string): Promise<SignalItem> {
    if (demoMode) return { id: `sig_${crypto.randomUUID()}`, owner_id: demoSession.agent_id, kind, statement, context: {}, status: "active", created_at: new Date().toISOString() };
    return kinRequest<SignalItem>("/v1/signals", { method: "POST", body: JSON.stringify({ kind, statement, context: {} }) });
  },
  async proactive(): Promise<ProactiveItem[]> {
    if (demoMode) return structuredClone(demoProactive);
    return kinRequest<ProactiveItem[]>("/v1/proactive");
  },
  async notifications(unreadOnly = false): Promise<NotificationItem[]> {
    if (demoMode) return structuredClone(demoNotifications).filter((item) => !unreadOnly || !item.read_at);
    return kinRequest<NotificationItem[]>(`/v1/notifications${unreadOnly ? "?unread_only=true" : ""}`);
  },
  async readNotification(notificationId: string): Promise<NotificationItem | void> {
    if (demoMode) return;
    return kinRequest<NotificationItem>(`/v1/notifications/${encodeURIComponent(notificationId)}/read`, { method: "POST" });
  },
  async onboarding(): Promise<{ onboarding: SessionData["onboarding"]; draft: OnboardingDraft }> {
    if (demoMode) return { onboarding: { state: "draft", current_step: 2, revision: 1 }, draft: structuredClone(emptyDraft) };
    return request("/api/v2/agents/me/onboarding-draft");
  },
  async saveDraft(draft: OnboardingDraft, revision: number): Promise<{ revision: number }> {
    if (demoMode) return { revision: revision + 1 };
    return request("/api/v2/console/onboarding-draft", {
      method: "PUT",
      body: JSON.stringify({ expected_revision: revision, idempotency_key: crypto.randomUUID(), draft }),
    });
  },
  async confirmStep(step: number, revision: number): Promise<{ onboarding: SessionData["onboarding"] }> {
    if (demoMode) return { onboarding: { state: step === 5 ? "completed" : "draft", current_step: Math.min(5, step + 1), revision: revision + 1 } };
    return request("/api/v2/agents/me/onboarding-draft/confirm", {
      method: "POST",
      body: JSON.stringify({ step, expected_onboarding_revision: revision, idempotency_key: crypto.randomUUID() }),
    });
  },
  async requestLogin(email: string): Promise<{ challenge_id: string }> {
    if (demoMode) return { challenge_id: "demo_challenge" };
    return request("/api/v2/auth/email/challenges", { method: "POST", body: JSON.stringify({ email, purpose: "login" }) });
  },
  async verifyLogin(email: string, otp: string, challengeId: string): Promise<void> {
    if (demoMode) return;
    await request("/api/v2/auth/email/verify", {
      method: "POST",
      body: JSON.stringify({ email, otp, challenge_id: challengeId, purpose: "login" }),
    });
  },
};
