export const SCHEMA_VERSION = 1;

export function normalizeText(value) {
  return String(value ?? "").replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function stableId(source, externalId, url = "") {
  const raw = `${source}:${externalId || url}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `conv_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function mergeConversation(previous, incoming) {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: incoming.id,
    source: incoming.source,
    externalId: incoming.externalId || previous?.externalId || null,
    title: incoming.title || previous?.title || "Untitled conversation",
    url: incoming.url || previous?.url || null,
    messages: incoming.messages?.length ? incoming.messages : (previous?.messages || []),
    discoveredAt: previous?.discoveredAt || incoming.discoveredAt || now,
    capturedAt: incoming.messages?.length ? now : (previous?.capturedAt || null),
    updatedAt: now,
    // Ignore is sticky. A later page capture must never silently re-include it.
    ignored: previous?.ignored === true || incoming.ignored === true,
    captureState: incoming.messages?.length ? "captured" : (previous?.captureState || "discovered")
  };
}

export function exportEnvelope(records, generatedAt = new Date().toISOString()) {
  const conversations = records.filter((item) => item.ignored !== true);
  return {
    format: "kin-conversation-export",
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    policy: "retain-all-unless-explicitly-ignored",
    conversationCount: conversations.length,
    conversations
  };
}

export function inferRole(element) {
  const signal = [
    element?.getAttribute?.("data-message-author-role"),
    element?.getAttribute?.("data-role"),
    element?.getAttribute?.("data-testid"),
    element?.getAttribute?.("aria-label"),
    element?.className,
    element?.tagName
  ].filter(Boolean).join(" ").toLowerCase();
  if (/user|human|query|question|prompt|sender/.test(signal)) return "user";
  if (/assistant|model|answer|response|bot|ai/.test(signal)) return "assistant";
  return null;
}

export function dedupeMessages(messages) {
  const result = [];
  for (const item of messages) {
    const content = normalizeText(item.content);
    if (!content) continue;
    const normalized = { role: item.role || "assistant", content };
    const last = result.at(-1);
    if (last && last.role === normalized.role && last.content === normalized.content) continue;
    result.push(normalized);
  }
  return result;
}
