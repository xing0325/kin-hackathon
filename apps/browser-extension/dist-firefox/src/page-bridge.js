(() => {
  if (window.__KIN_PAGE_BRIDGE__) return;
  window.__KIN_PAGE_BRIDGE__ = true;
  let authHeadersPromise;

  async function chatGptAuthHeaders() {
    if (!authHeadersPromise) {
      authHeadersPromise = fetch("/api/auth/session", { credentials: "include", headers: { accept: "application/json" } })
        .then(async (response) => {
          if (!response.ok) throw new Error(`ChatGPT session request failed (${response.status})`);
          const session = await response.json();
          if (!session?.accessToken) throw new Error("ChatGPT session has no access token");
          return { accept: "application/json", authorization: `Bearer ${session.accessToken}` };
        })
        .catch((error) => {
          authHeadersPromise = null;
          throw error;
        });
    }
    return authHeadersPromise;
  }

  window.addEventListener("message", async (event) => {
    const request = event.data;
    if (event.source !== window || request?.channel !== "KIN_FETCH_REQUEST") return;
    try {
      const headers = request.url.startsWith("https://chatgpt.com/backend-api/")
        ? await chatGptAuthHeaders()
        : { accept: "application/json" };
      const response = await fetch(request.url, { credentials: "include", headers });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { text: text.slice(0, 500) }; }
      window.postMessage({
        channel: "KIN_FETCH_RESPONSE",
        id: request.id,
        ok: response.ok,
        status: response.status,
        retryAfter: response.headers.get("retry-after"),
        data
      }, "*");
    } catch (error) {
      window.postMessage({ channel: "KIN_FETCH_RESPONSE", id: request.id, ok: false, status: 0, error: error.message }, "*");
    }
  });
})();
