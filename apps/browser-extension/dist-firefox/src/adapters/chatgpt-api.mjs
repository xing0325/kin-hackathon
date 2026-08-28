import { dedupeMessages, normalizeText, stableId } from "../shared/model.mjs";

export function chatGptListItems(payload) {
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.conversations)) return payload.conversations;
  if (Array.isArray(payload)) return payload;
  return [];
}

function partText(part) {
  if (typeof part === "string") return part;
  if (part?.text) return part.text;
  if (part?.content) return typeof part.content === "string" ? part.content : JSON.stringify(part.content);
  return "";
}

export function normalizeChatGptConversation(raw, summary = {}) {
  const externalId = raw?.conversation_id || raw?.id || summary?.id;
  const nodes = Object.values(raw?.mapping || {});
  const messages = nodes
    .map((node) => node?.message)
    .filter((message) => message?.author?.role && message?.content)
    .sort((a, b) => (a.create_time || 0) - (b.create_time || 0))
    .map((message) => ({
      role: ["user", "assistant", "system", "tool"].includes(message.author.role) ? message.author.role : "tool",
      content: normalizeText((message.content.parts || []).map(partText).filter(Boolean).join("\n")),
      createdAt: message.create_time ? new Date(message.create_time * 1000).toISOString() : null
    }));
  return {
    id: stableId("chatgpt", externalId),
    source: "chatgpt",
    externalId,
    title: normalizeText(raw?.title || summary?.title) || "Untitled ChatGPT conversation",
    url: `https://chatgpt.com/c/${externalId}`,
    sourceUpdatedAt: raw?.update_time || summary?.update_time || null,
    messages: dedupeMessages(messages)
  };
}

export function chatGptListRequest(offset = 0, limit = 28, archived = false) {
  return `https://chatgpt.com/backend-api/conversations?offset=${offset}&limit=${limit}&order=updated&is_archived=${archived}`;
}

export function chatGptDetailRequest(id) {
  return `https://chatgpt.com/backend-api/conversation/${encodeURIComponent(id)}`;
}
