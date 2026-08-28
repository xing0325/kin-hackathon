import { exportEnvelope, mergeConversation } from "./shared/model.mjs";
import { clearVault, getAll, listMetadata, migrateLegacy, putMany, setIgnored as vaultSetIgnored } from "./shared/vault.mjs";

const extensionApi = globalThis.browser || globalThis.chrome;
const STORAGE_KEY = "kinConversations";
const IMPORT_STATE_KEY = "kinImportState";
const ROOT_URLS = [
  "https://chatgpt.com/",
  "https://claude.ai/",
  "https://gemini.google.com/app",
  "https://www.doubao.com/chat/",
  "https://chat.deepseek.com/"
];
let syncQueue = [];
let activeSyncTab = null;
let activeSyncTimer = null;
let fullHarvest = false;
const visitedSyncUrls = new Set();
const processingSyncTabs = new Set();

async function readAll() {
  const records = await getAll();
  return Object.fromEntries(records.map((item) => [item.id, item]));
}

async function writeAll(records) {
  await putMany(Object.values(records));
}

async function upsertMany(items) {
  await putMany(items.filter(Boolean));
  const records = await listMetadata();
  await updateBadge(records);
  return records;
}

async function updateBadge(records = null) {
  const values = Array.isArray(records) ? records : Object.values(records || await readAll());
  const kept = values.filter((item) => !item.ignored).length;
  await extensionApi.action.setBadgeBackgroundColor({ color: "#f77e2d" });
  await extensionApi.action.setBadgeText({ text: kept ? String(kept) : "" });
}

async function setIgnored(id, ignored) {
  const item = await vaultSetIgnored(id, ignored);
  await updateBadge(await listMetadata());
  return item;
}

async function exportJson() {
  const payload = exportEnvelope(Object.values(await readAll()));
  const url = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(payload, null, 2))}`;
  await extensionApi.downloads.download({ url, filename: `KIN-conversations-${new Date().toISOString().slice(0, 10)}.json`, saveAs: true });
  return payload.conversationCount;
}

async function setImportState(patch) {
  const stored = await extensionApi.storage.local.get(IMPORT_STATE_KEY);
  const next = { ...(stored[IMPORT_STATE_KEY] || {}), ...patch, updatedAt: new Date().toISOString() };
  await extensionApi.storage.local.set({ [IMPORT_STATE_KEY]: next });
  return next;
}

async function getImportState() {
  return (await extensionApi.storage.local.get(IMPORT_STATE_KEY))[IMPORT_STATE_KEY] || null;
}

async function sendWhenReady(tabId, payload, attempts = 20) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await extensionApi.tabs.sendMessage(tabId, payload); } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("ChatGPT content adapter did not become ready");
}

async function startChatGptBulkSync() {
  // Use a disposable background tab so the importer gets fresh content scripts
  // without reloading a conversation or draft the user is actively editing.
  const tab = await extensionApi.tabs.create({ url: "https://chatgpt.com/", active: false });
  await setImportState({ source: "chatgpt", phase: "starting", discovered: 0, completed: 0, failed: 0, running: true });
  try {
    const response = await sendWhenReady(tab.id, { type: "CHATGPT_BULK_SYNC" });
    if (!response?.ok) throw new Error(response?.error || "ChatGPT bulk sync failed");
    await setImportState({ ...response.result, phase: "complete", running: false });
    return response.result;
  } finally {
    try { await extensionApi.tabs.remove(tab.id); } catch {}
  }
}

async function runNextSync() {
  clearTimeout(activeSyncTimer);
  if (activeSyncTab) {
    try { await extensionApi.tabs.remove(activeSyncTab); } catch {}
    activeSyncTab = null;
  }
  const next = syncQueue.shift();
  if (!next) {
    fullHarvest = false;
    return;
  }
  visitedSyncUrls.add(next);
  const tab = await extensionApi.tabs.create({ url: next, active: false });
  activeSyncTab = tab.id;
  // Some SPA pages emit their first capture before tabs.create() resolves.
  // Keep a bounded fallback so one missed message cannot stall the whole harvest.
  activeSyncTimer = setTimeout(runNextSync, 8000);
}

function enqueueDiscovered(records) {
  for (const item of records) {
    if (!item.url || item.ignored || item.captureState === "captured") continue;
    if (!visitedSyncUrls.has(item.url) && !syncQueue.includes(item.url)) syncQueue.push(item.url);
  }
}

extensionApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === "CAPTURE_PAGE") {
      const records = await upsertMany([...(message.discovered || []), message.conversation]);
      if (fullHarvest) enqueueDiscovered(records);
      if (sender.tab?.id === activeSyncTab && !processingSyncTabs.has(activeSyncTab)) {
        const syncTabId = activeSyncTab;
        processingSyncTabs.add(syncTabId);
        try {
          const deep = await extensionApi.tabs.sendMessage(syncTabId, { type: "DEEP_DISCOVER" });
          if (deep?.ok) {
            const expanded = await upsertMany(deep.discovered || []);
            enqueueDiscovered(expanded);
          }
        } catch {}
        processingSyncTabs.delete(syncTabId);
        await runNextSync();
      }
      sendResponse({ ok: true, count: records.length });
    } else if (message.type === "LIST_CONVERSATIONS") {
      sendResponse({ ok: true, conversations: (await listMetadata()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), importState: await getImportState() });
    } else if (message.type === "SET_IGNORED") {
      sendResponse({ ok: true, conversation: await setIgnored(message.id, message.ignored) });
    } else if (message.type === "EXPORT_JSON") {
      sendResponse({ ok: true, count: await exportJson() });
    } else if (message.type === "CHATGPT_BULK_START") {
      startChatGptBulkSync().catch((error) => setImportState({ phase: "error", running: false, error: error.message }));
      sendResponse({ ok: true, started: true });
    } else if (message.type === "BULK_UPSERT") {
      await upsertMany(message.conversations || []);
      sendResponse({ ok: true });
    } else if (message.type === "BULK_EXISTING") {
      const items = Object.fromEntries((await listMetadata())
        .filter((item) => item.source === message.source && item.captureState === "captured" && item.externalId)
        .map((item) => [item.externalId, { sourceUpdatedAt: item.sourceUpdatedAt || null }]));
      sendResponse({ ok: true, items });
    } else if (message.type === "BULK_PROGRESS") {
      sendResponse({ ok: true, state: await setImportState({ ...message, running: true }) });
    } else if (message.type === "SYNC_DISCOVERED") {
      const records = Object.values(await readAll());
      syncQueue = records.filter((item) => !item.ignored && item.captureState !== "captured" && item.url).map((item) => item.url);
      const count = syncQueue.length;
      if (!activeSyncTab) await runNextSync();
      sendResponse({ ok: true, count });
    } else if (message.type === "FULL_HARVEST") {
      fullHarvest = true;
      visitedSyncUrls.clear();
      const records = Object.values(await readAll());
      const pending = records
        .filter((item) => !item.ignored && item.captureState !== "captured" && item.url)
        .map((item) => item.url);
      syncQueue = [...new Set([...ROOT_URLS, ...pending])];
      const count = syncQueue.length;
      if (!activeSyncTab) await runNextSync();
      sendResponse({ ok: true, count, sources: ROOT_URLS.length });
    } else if (message.type === "CLEAR_LOCAL") {
      await clearVault();
      await updateBadge({});
      sendResponse({ ok: true });
    }
  })().catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

extensionApi.runtime.onInstalled.addListener(() => migrateLegacy().then(() => updateBadge()));
migrateLegacy().then(() => updateBadge());
