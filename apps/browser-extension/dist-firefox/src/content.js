(async () => {
  const extensionApi = globalThis.browser || globalThis.chrome;
  const { captureDocument, discoverSessions } = await import(extensionApi.runtime.getURL("src/adapters/index.mjs"));
  const {
    chatGptDetailRequest,
    chatGptListItems,
    chatGptListRequest,
    normalizeChatGptConversation
  } = await import(extensionApi.runtime.getURL("src/adapters/chatgpt-api.mjs"));
  let timer = null;
  let lastSignature = "";

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function send(message) {
    return extensionApi.runtime.sendMessage(message);
  }

  function pageFetch(url, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      const id = `kin_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const timer = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error(`ChatGPT request timed out: ${url}`));
      }, timeoutMs);
      function onMessage(event) {
        if (event.source !== window || event.data?.channel !== "KIN_FETCH_RESPONSE" || event.data.id !== id) return;
        clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        if (!event.data.ok) {
          const error = new Error(`ChatGPT request failed (${event.data.status})`);
          error.status = event.data.status;
          error.retryAfter = Number(event.data.retryAfter || 0);
          reject(error);
        }
        else resolve(event.data.data);
      }
      window.addEventListener("message", onMessage);
      window.postMessage({ channel: "KIN_FETCH_REQUEST", id, url }, "*");
    });
  }

  async function pageFetchWithRetry(url, timeoutMs = 30000, attempts = 12) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await pageFetch(url, timeoutMs);
      } catch (error) {
        const retryable = error.status === 429 || error.status >= 500 || error.status === 0;
        if (!retryable || attempt === attempts - 1) throw error;
        const retryMs = error.status === 429
          ? Math.max(65000, error.retryAfter * 1000)
          : Math.min(30000, 4000 * (attempt + 1));
        await send({ type: "BULK_PROGRESS", source: "chatgpt", phase: "cooldown", retryInMs: retryMs });
        await wait(retryMs);
      }
    }
  }

  async function mapConcurrent(items, concurrency, worker) {
    let cursor = 0;
    const results = [];
    async function run() {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index], index);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
    return results;
  }

  async function bulkSyncChatGpt() {
    if (!/^(chatgpt\.com|chat\.openai\.com)$/.test(location.hostname)) throw new Error("ChatGPT tab required");
    const summaries = [];
    const limit = 28;
    for (const archived of [false, true]) {
      for (let offset = 0; offset < 100000; offset += limit) {
        const page = await pageFetch(chatGptListRequest(offset, limit, archived));
        const items = chatGptListItems(page);
        summaries.push(...items);
        await send({ type: "BULK_PROGRESS", source: "chatgpt", phase: archived ? "listing_archived" : "listing", discovered: summaries.length, total: page.total ?? null });
        if (items.length < limit || (page.total != null && offset + items.length >= page.total)) break;
      }
    }
    if (!summaries.length) throw new Error("ChatGPT returned no conversations; login or endpoint may have changed");
    const existingResponse = await send({ type: "BULK_EXISTING", source: "chatgpt" });
    const existing = existingResponse?.items || {};
    const pending = summaries.filter((summary) => {
      const saved = existing[summary.id];
      if (!saved) return true;
      if (summary.update_time == null) return false;
      return Number(saved.sourceUpdatedAt || 0) < Number(summary.update_time || 0);
    });
    let completed = summaries.length - pending.length;
    let failed = 0;
    await mapConcurrent(pending, 1, async (summary) => {
      try {
        const raw = await pageFetchWithRetry(chatGptDetailRequest(summary.id));
        const conversation = normalizeChatGptConversation(raw, summary);
        await send({ type: "BULK_UPSERT", conversations: [conversation] });
      } catch {
        failed += 1;
      }
      completed += 1;
      await wait(450);
      if (completed % 5 === 0 || completed === summaries.length) {
        await send({ type: "BULK_PROGRESS", source: "chatgpt", phase: "details", discovered: summaries.length, completed, failed, total: summaries.length });
      }
    });
    return { discovered: summaries.length, completed: completed - failed, failed, skipped: summaries.length - pending.length };
  }

  function collect() {
    return discoverSessions(document, window.location);
  }

  async function deepDiscover() {
    const byUrl = new Map(collect().map((item) => [item.url, item]));
    const candidates = [...document.querySelectorAll("nav, aside, [role='navigation'], [class*='sidebar'], [class*='Sidebar']")]
      .flatMap((node) => [node, ...node.querySelectorAll("*")])
      .filter((node) => node.scrollHeight > node.clientHeight + 80 && node.clientHeight > 120);
    for (const node of [...new Set(candidates)].slice(0, 6)) {
      const original = node.scrollTop;
      let unchanged = 0;
      let previousHeight = node.scrollHeight;
      for (let step = 0; step < 40 && unchanged < 3; step += 1) {
        node.scrollTop = Math.min(node.scrollHeight, node.scrollTop + Math.max(240, node.clientHeight * 0.8));
        await wait(180);
        for (const item of collect()) byUrl.set(item.url, item);
        if (node.scrollHeight === previousHeight && node.scrollTop + node.clientHeight >= node.scrollHeight - 4) unchanged += 1;
        else unchanged = 0;
        previousHeight = node.scrollHeight;
      }
      node.scrollTop = original;
    }
    return [...byUrl.values()];
  }

  async function capture() {
    const conversation = captureDocument(document, window.location);
    const discovered = discoverSessions(document, window.location);
    const signature = JSON.stringify([
      location.href,
      conversation?.messages?.map((item) => [item.role, item.content.length, item.content.slice(-80)]),
      discovered.map((item) => item.url),
      document.title
    ]);
    if (signature === lastSignature) return;
    lastSignature = signature;
    try {
      await send({ type: "CAPTURE_PAGE", conversation, discovered });
    } catch {
      // Extension reloads can invalidate an existing content-script context.
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(capture, 700);
  }

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener("popstate", schedule);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  extensionApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const task = message.type === "DEEP_DISCOVER"
      ? deepDiscover().then((discovered) => ({ ok: true, discovered }))
      : message.type === "CHATGPT_BULK_SYNC"
        ? bulkSyncChatGpt().then((result) => ({ ok: true, result }))
        : null;
    if (!task) return false;
    task.then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  });
  schedule();
})();
