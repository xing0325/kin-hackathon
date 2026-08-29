import type { AttentionItem, CampfireRoom, ExperienceCandidate, ExperienceMatch, ProfileFieldState, RadarMatch, Relationship, SignalKind, TodayData } from "./types";

export const CATEGORY_LABELS: Record<string, string> = {
  match_found: "MATCH",
  experience_found: "EXPERIENCE",
  follow_up: "FOLLOW-UP",
  can_help: "CAN HELP",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replaceAll("_", " ").toUpperCase();
}

export function relativeTime(timestamp: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

export function attentionCount(today: TodayData): number {
  return [...today.focus_items, ...today.participation_items].filter((item: AttentionItem) => item.status === "open").length;
}

export function observationCopy(today: TodayData): string {
  if (today.observation.connected) return "AGENT ONLINE · 正在持续观察";
  if (today.observation.runtime_known) return "AGENT OFFLINE · 等待 Runtime 恢复";
  return "RUNTIME NOT CONNECTED";
}

export function matchPercent(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

export function rankMatches(matches: RadarMatch[]): RadarMatch[] {
  return [...matches].sort((a, b) => b.score - a.score);
}

export function strongestReason(match: RadarMatch): string {
  return match.reasons[0] ?? "双方正在构建的方向存在值得探索的交集";
}

export function intersectTags(left: string[] = [], right: string[] = []): string[] {
  const normalized = new Map(right.map((item) => [item.toLocaleLowerCase(), item]));
  return left.filter((item) => normalized.has(item.toLocaleLowerCase()));
}

export function experiencePercent(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

export function sortExperienceMatches(matches: ExperienceMatch[]): ExperienceMatch[] {
  return [...matches].sort((a, b) => b.score - a.score);
}

export function inferComposerIntent(input: string): SignalKind {
  const value = input.trim().toLocaleLowerCase();
  if (/(?:搞定|解决了|已完成|刚完成|fixed|solved|shipped)/i.test(value)) return "SOLVED";
  if (/(?:正在|我在做|开始做|正做|building|working on)/i.test(value)) return "BUILDING";
  if (/(?:可以帮|愿意帮|有空|可用|available)/i.test(value)) return "AVAILABLE";
  if (/(?:我发现|刚发现|学到|discovered|learned)/i.test(value)) return "DISCOVERED";
  return "NEED";
}

export function composerIntentLabel(intent: SignalKind): string {
  if (intent === "SOLVED") return "一段刚刚发生的解法";
  if (intent === "BUILDING") return "你正在推进的事";
  if (intent === "AVAILABLE") return "你可以提供的帮助";
  if (intent === "DISCOVERED") return "一个值得记住的发现";
  return "一个需要 Agent 网络帮忙的问题";
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 0.85) return "HIGH CONFIDENCE";
  if (confidence >= 0.65) return "GOOD SIGNAL";
  return "EARLY SIGNAL";
}

export function openFollowUpCount(relationship: Relationship): number {
  return (relationship.shared_context.follow_ups ?? []).filter((item) => item.status !== "done").length;
}

export function relationshipPeerName(relationship: Relationship, currentAgentId: string): string {
  if (relationship.peer?.display_name) return relationship.peer.display_name;
  const title = relationship.shared_context.title?.split("×").map((part) => part.trim()).filter(Boolean);
  if (title?.length === 2) return relationship.user_a_id === currentAgentId ? title[1] : title[0];
  return "Connected Builder";
}

export function sortRelationships(relationships: Relationship[]): Relationship[] {
  return [...relationships].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function profileCompletion(fields: Record<string, ProfileFieldState>): number {
  const required = ["agent_name", "agent_description", "human_description", "working_languages", "seeking", "offering"];
  const filled = required.filter((key) => {
    const value = fields[key]?.current_value;
    return Array.isArray(value) ? value.length > 0 : typeof value === "string" && value.trim().length > 0;
  }).length;
  return Math.round((filled / required.length) * 100);
}

export function splitProfileList(value: string): string[] {
  return value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
}

export function pendingCandidateCount(candidates: ExperienceCandidate[]): number {
  return candidates.filter((item) => item.status === "pending").length;
}

export function experienceArtifactPayload(candidate: ExperienceCandidate) {
  return {
    problem: candidate.problem,
    context: candidate.context,
    cause: candidate.cause,
    worked: candidate.worked,
    failed: candidate.failed,
    confidence: candidate.confidence,
    visibility: candidate.visibility,
  };
}

export function confirmedCampfireCount(room: CampfireRoom): number {
  return room.members.filter((member) => member.confirmation === "confirmed").length;
}

export function campfireReady(room: CampfireRoom): boolean {
  return room.members.length > 1 && room.members.every((member) => member.confirmation === "confirmed");
}

export function confirmCampfireMember(room: CampfireRoom, agentId: string): CampfireRoom {
  const members = room.members.map((member) => member.agent_id === agentId ? { ...member, confirmation: "confirmed" } : member);
  const ready = members.length > 1 && members.every((member) => member.confirmation === "confirmed");
  return { ...room, members, proposal: { ...room.proposal, status: ready ? "formed" : room.proposal.status } };
}
