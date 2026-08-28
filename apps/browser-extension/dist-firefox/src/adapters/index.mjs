import { dedupeMessages, inferRole, normalizeText, stableId } from "../shared/model.mjs";

const CONFIGS = [
  {
    source: "chatgpt",
    hosts: ["chatgpt.com", "chat.openai.com"],
    path: /\/c\/([^/?#]+)/,
    messageSelectors: ["article[data-testid^='conversation-turn']", "[data-message-author-role]"],
    sessionHref: /\/c\/[a-zA-Z0-9_-]+/
  },
  {
    source: "claude",
    hosts: ["claude.ai"],
    path: /\/chat\/([^/?#]+)/,
    messageSelectors: ["[data-testid='user-message']", "[data-testid*='assistant']", "[data-testid*='message']"],
    sessionHref: /\/chat\/[a-zA-Z0-9_-]+/
  },
  {
    source: "gemini",
    hosts: ["gemini.google.com"],
    path: /\/app\/([^/?#]+)/,
    messageSelectors: ["user-query", "model-response", ".conversation-container user-query", ".conversation-container model-response"],
    sessionHref: /\/app\/[a-zA-Z0-9_-]+/
  },
  {
    source: "doubao",
    hosts: ["doubao.com", "www.doubao.com"],
    path: /\/chat\/([^/?#]+)/,
    messageSelectors: ["[data-testid*='message']", "[data-role]", "[class*='message-block']", "[class*='MessageItem']"],
    sessionHref: /\/chat\/[a-zA-Z0-9_-]+/
  },
  {
    source: "deepseek",
    hosts: ["chat.deepseek.com"],
    path: /\/a\/chat\/s\/([^/?#]+)/,
    messageSelectors: ["[data-role]", "[data-testid*='message']", ".ds-message", "[class*='message']"],
    sessionHref: /\/a\/chat\/s\/[a-zA-Z0-9_-]+/
  }
];

export function adapterFor(locationLike) {
  const host = locationLike.hostname.toLowerCase();
  return CONFIGS.find((item) => item.hosts.includes(host)) || null;
}

function uniqueOutermost(nodes) {
  return [...new Set(nodes)].filter((node) => !nodes.some((other) => other !== node && other.contains?.(node)));
}

function textFromMessage(node) {
  const clone = node.cloneNode(true);
  clone.querySelectorAll("button, svg, style, script, [aria-hidden='true']").forEach((item) => item.remove());
  return normalizeText(clone.innerText || clone.textContent);
}

function alternatingFallback(nodes) {
  let next = "user";
  return nodes.map((node) => {
    const role = inferRole(node) || next;
    next = role === "user" ? "assistant" : "user";
    return { role, content: textFromMessage(node) };
  });
}

export function captureDocument(documentLike, locationLike) {
  const adapter = adapterFor(locationLike);
  if (!adapter) return null;
  const match = locationLike.pathname.match(adapter.path);
  if (!match) return null;
  const rawNodes = adapter.messageSelectors.flatMap((selector) => [...documentLike.querySelectorAll(selector)]);
  const nodes = uniqueOutermost(rawNodes).filter((node) => normalizeText(node.innerText || node.textContent));
  const externalId = match[1];
  return {
    id: stableId(adapter.source, externalId, locationLike.href),
    source: adapter.source,
    externalId,
    title: normalizeText(documentLike.querySelector("h1")?.textContent || documentLike.title).replace(/\s*[|\-]\s*(ChatGPT|Claude|Gemini|\u8c46\u5305|DeepSeek).*$/i, ""),
    url: locationLike.href,
    messages: dedupeMessages(alternatingFallback(nodes))
  };
}

export function discoverSessions(documentLike, locationLike) {
  const adapter = adapterFor(locationLike);
  if (!adapter) return [];
  const seen = new Set();
  const sessions = [];
  for (const anchor of documentLike.querySelectorAll("a[href]")) {
    let url;
    try { url = new URL(anchor.href, locationLike.href); } catch { continue; }
    if (!adapter.hosts.includes(url.hostname.toLowerCase()) || !adapter.sessionHref.test(url.pathname)) continue;
    const match = url.pathname.match(adapter.path);
    if (!match || seen.has(url.href)) continue;
    seen.add(url.href);
    sessions.push({
      id: stableId(adapter.source, match[1], url.href),
      source: adapter.source,
      externalId: match[1],
      title: normalizeText(anchor.textContent) || "Discovered conversation",
      url: url.href,
      messages: []
    });
  }
  return sessions;
}

export const SUPPORTED_SOURCES = CONFIGS.map(({ source, hosts }) => ({ source, hosts }));
