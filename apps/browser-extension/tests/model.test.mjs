import test from "node:test";
import assert from "node:assert/strict";
import { dedupeMessages, exportEnvelope, mergeConversation, stableId } from "../src/shared/model.mjs";
import { adapterFor, SUPPORTED_SOURCES } from "../src/adapters/index.mjs";
import { chatGptListItems, normalizeChatGptConversation } from "../src/adapters/chatgpt-api.mjs";

test("all required chatbot hosts have adapters", () => {
  const cases = {
    "chatgpt.com": "chatgpt",
    "claude.ai": "claude",
    "gemini.google.com": "gemini",
    "www.doubao.com": "doubao",
    "chat.deepseek.com": "deepseek"
  };
  for (const [hostname, source] of Object.entries(cases)) assert.equal(adapterFor({ hostname })?.source, source);
  assert.deepEqual(SUPPORTED_SOURCES.map((item) => item.source), ["chatgpt", "claude", "gemini", "doubao", "deepseek"]);
});

test("new and captured sessions are retained by default", () => {
  const incoming = { id: stableId("doubao", "42"), source: "doubao", externalId: "42", title: "ESP32", messages: [{ role: "user", content: "help" }] };
  const merged = mergeConversation(null, incoming);
  assert.equal(merged.ignored, false);
  assert.equal(exportEnvelope([merged], "2026-08-28T00:00:00.000Z").conversationCount, 1);
});

test("ignore is explicit and sticky across later captures", () => {
  const base = { id: "conv_1", source: "deepseek", ignored: true, messages: [], updatedAt: "x" };
  const recaptured = mergeConversation(base, { id: "conv_1", source: "deepseek", title: "private", messages: [{ role: "assistant", content: "secret" }] });
  assert.equal(recaptured.ignored, true);
  assert.equal(exportEnvelope([recaptured]).conversationCount, 0);
});

test("dedupe removes empty and repeated adjacent messages", () => {
  assert.deepEqual(dedupeMessages([
    { role: "user", content: " hi  " },
    { role: "user", content: "hi" },
    { role: "assistant", content: "\n" }
  ]), [{ role: "user", content: "hi" }]);
});

test("cross-browser manifest declares Chrome and Firefox background entries", async () => {
  const manifest = JSON.parse(await (await import("node:fs/promises")).readFile(new URL("../manifest.json", import.meta.url), "utf8"));
  assert.equal(manifest.background.service_worker, "src/background.mjs");
  assert.deepEqual(manifest.background.scripts, ["src/background.mjs"]);
  assert.equal(manifest.browser_specific_settings.gecko.id, "kin-conversation-collector@kin.local");
});

test("ChatGPT API adapter normalizes mapping messages", () => {
  const raw = {
    conversation_id: "abc",
    title: "Bulk chat",
    mapping: {
      a: { message: { author: { role: "user" }, create_time: 1, content: { parts: ["question"] } } },
      b: { message: { author: { role: "assistant" }, create_time: 2, content: { parts: ["answer"] } } }
    }
  };
  const normalized = normalizeChatGptConversation(raw);
  assert.equal(normalized.source, "chatgpt");
  assert.equal(normalized.title, "Bulk chat");
  assert.deepEqual(normalized.messages.map(({ role, content }) => ({ role, content })), [
    { role: "user", content: "question" },
    { role: "assistant", content: "answer" }
  ]);
  assert.deepEqual(chatGptListItems({ items: [{ id: "abc" }] }), [{ id: "abc" }]);
});
