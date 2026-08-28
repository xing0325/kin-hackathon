const list = document.querySelector("#sessions");
const status = document.querySelector("#status");
const template = document.querySelector("#session-template");
const extensionApi = globalThis.browser || globalThis.chrome;

async function message(payload) {
  const response = await extensionApi.runtime.sendMessage(payload);
  if (!response?.ok) throw new Error(response?.error || "Extension request failed");
  return response;
}

function render(conversations, importState) {
  list.replaceChildren();
  const kept = conversations.filter((item) => !item.ignored);
  document.querySelector("#kept-count").textContent = kept.length;
  document.querySelector("#ignored-count").textContent = conversations.length - kept.length;
  document.querySelector("#pending-count").textContent = conversations.filter((item) => item.captureState !== "captured" && !item.ignored).length;
  const visible = conversations.slice(0, 100);
  document.querySelector("#list-note").textContent = conversations.length > visible.length
    ? `已加载 ${conversations.length} 个会话，列表仅显示最近 100 个。`
    : "";
  if (importState?.running) {
    if (importState.phase === "listing" || importState.phase === "listing_archived") {
      status.textContent = `ChatGPT 正在分页读取列表：${importState.discovered || 0}`;
    } else if (importState.phase === "cooldown") {
      status.textContent = `ChatGPT 触发频率限制，${Math.ceil((importState.retryInMs || 0) / 1000)} 秒后继续；已处理 ${importState.completed || 0}/${importState.total || importState.discovered || "?"}`;
    } else {
      status.textContent = `ChatGPT 详情：${importState.completed || 0}/${importState.total || importState.discovered || "?"}，失败 ${importState.failed || 0}`;
    }
  } else if (importState?.phase === "complete") {
    status.textContent = `ChatGPT 快速同步完成：${importState.completed} 成功，${importState.failed} 失败。`;
  } else if (importState?.phase === "error") {
    status.textContent = `ChatGPT 快速同步错误：${importState.error}`;
  }
  for (const item of visible) {
    const row = template.content.firstElementChild.cloneNode(true);
    row.querySelector(".source").textContent = item.source;
    row.querySelector(".title").textContent = item.title;
    row.querySelector(".meta").textContent = item.captureState === "captured" ? `${item.messageCount} messages` : "discovered · pending sync";
    const checkbox = row.querySelector("input");
    checkbox.checked = item.ignored;
    checkbox.addEventListener("change", async () => {
      await message({ type: "SET_IGNORED", id: item.id, ignored: checkbox.checked });
      await load();
    });
    list.append(row);
  }
}

async function load() {
  const response = await message({ type: "LIST_CONVERSATIONS" });
  render(response.conversations, response.importState);
  return response.importState;
}

async function pollWhileRunning() {
  const state = await load();
  if (state?.running) setTimeout(pollWhileRunning, 1000);
}

document.querySelector("#export").addEventListener("click", async () => {
  const response = await message({ type: "EXPORT_JSON" });
  status.textContent = `已导出 ${response.count} 个未忽略会话。`;
});

document.querySelector("#sync").addEventListener("click", async () => {
  const response = await message({ type: "FULL_HARVEST" });
  status.textContent = `正在检查 ${response.sources} 个平台，并抓取所有可发现会话…`;
  setTimeout(load, 1200);
});

document.querySelector("#chatgpt-bulk").addEventListener("click", async () => {
  await message({ type: "CHATGPT_BULK_START" });
  status.textContent = "正在通过 ChatGPT 登录态批量读取…";
  setTimeout(pollWhileRunning, 700);
});

load().catch((error) => { status.textContent = error.message; });
