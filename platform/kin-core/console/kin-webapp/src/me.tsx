import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { confidenceLabel, pendingCandidateCount, profileCompletion, relativeTime, splitProfileList } from "./logic";
import type { ExperienceCandidate, ProfileStudioData, SessionData } from "./types";

const fieldLabels: Record<string, string> = {
  agent_name: "AGENT NAME", agent_description: "AGENT VOICE", human_description: "BUILDER DESCRIPTION",
  working_languages: "LANGUAGES", seeking: "SEEKING", offering: "OFFERING", geo: "LOCATION",
  timezone: "TIMEZONE", current_focus: "CURRENT FOCUS", demands: "CURRENT NEEDS", agent_status: "AGENT STATUS",
  human_status: "HUMAN STATUS", interests_negative: "DO NOT MATCH",
};
const publicFields = ["agent_name", "agent_description", "human_description", "working_languages", "seeking", "offering"];

function valueText(value: unknown): string {
  return Array.isArray(value) ? value.join(", ") : typeof value === "string" ? value : "";
}

function CandidateCard({ item, onDecision }: { item: ExperienceCandidate; onDecision: (id: string, decision: "approved" | "ignored") => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function decide(decision: "approved" | "ignored") { setBusy(true); try { await onDecision(item.id, decision); } finally { setBusy(false); } }
  return <article className={`candidate-card ${item.status}`}>
    <header><span>{item.source.toUpperCase()} · {item.source_title}</span><b>{confidenceLabel(item.confidence)}</b></header>
    <h2>{item.problem}</h2><p className="candidate-context">{item.context}</p>
    <div className="candidate-fields"><section><label>CAUSE</label><p>{item.cause}</p></section><section><label>WHAT WORKED</label><p>{item.worked}</p></section><section><label>WHAT FAILED</label><p>{item.failed}</p></section></div>
    <footer><div><i />RAW CONVERSATION NOT INCLUDED · {item.visibility.toUpperCase()}</div>{item.status === "pending" ? <span><button disabled={busy} onClick={() => decide("ignored")}>IGNORE</button><button className="approve" disabled={busy} onClick={() => decide("approved")}>{busy ? "SAVING…" : "APPROVE ARTIFACT →"}</button></span> : <strong>{item.status === "approved" ? "PUBLISHED AS ARTIFACT" : "IGNORED"}</strong>}</footer>
  </article>;
}

export function MePage({ session }: { session: SessionData }) {
  const [data, setData] = useState<ProfileStudioData | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"profile" | "candidates" | "permissions">("profile");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { api.profileStudio().then((value) => { setData(value); setDraft(Object.fromEntries(publicFields.map((key) => [key, valueText(value.refreshContext.editable_fields[key]?.current_value)]))); }).catch((reason) => setError(reason.message)); }, []);
  const completion = useMemo(() => data ? profileCompletion(data.refreshContext.editable_fields) : 0, [data]);
  const pending = useMemo(() => data ? pendingCandidateCount(data.candidates) : 0, [data]);
  if (error) return <div className="state-page"><h2>Context Studio 暂时没有加载</h2><p>{error}</p></div>;
  if (!data) return <div className="loading-screen">正在读取 Agent Card 和 Context 权限…</div>;

  async function saveProfile() {
    if (!data) return;
    const updates: Record<string, unknown> = {};
    for (const key of publicFields) {
      const field = data.refreshContext.editable_fields[key];
      const next = field?.kind === "string_list" ? splitProfileList(draft[key] ?? "") : (draft[key] ?? "").trim();
      if (JSON.stringify(next) !== JSON.stringify(field?.current_value)) updates[key] = next;
    }
    if (!Object.keys(updates).length) { setMessage("没有需要保存的变化。"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await api.updateProfileFields(data.refreshContext.profile_version, updates);
      setData((current) => current ? { ...current, cardPage: { ...current.cardPage, profile_version: result.profile_version }, refreshContext: { ...current.refreshContext, profile_version: result.profile_version, editable_fields: Object.fromEntries(Object.entries(current.refreshContext.editable_fields).map(([key, field]) => [key, key in updates ? { ...field, current_value: updates[key], last_updated_by: "human", last_updated_at: Date.now() } : field])) } } : current);
      setMessage(`已保存 ${result.changed_paths.length} 个字段 · PROFILE V${result.profile_version}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Profile 保存失败"); }
    finally { setBusy(false); }
  }

  async function decideCandidate(id: string, decision: "approved" | "ignored") {
    if (!data) return;
    const candidate = data.candidates.find((item) => item.id === id);
    if (!candidate) return;
    await api.decideExperienceCandidate(candidate, decision);
    const candidates = data.candidates.map((item) => item.id === id ? { ...item, status: decision } : item);
    setData({ ...data, candidates });
  }

  const fields = Object.entries(data.refreshContext.editable_fields);
  return <>
    <header className="topbar me-topbar"><div><p className="eyebrow">BUILDER PROFILE · CONTEXT STUDIO</p><h1>决定 Agent 如何代表你。</h1></div><div className="profile-health"><strong>{completion}%</strong><span>PROFILE COMPLETE<small>CARD V{data.cardPage.card.card_version} · PROFILE V{data.refreshContext.profile_version}</small></span></div></header>
    <main className="me-page">
      <section className="profile-identity"><div className="profile-avatar">{session.agent_name.slice(0, 1)}<i /></div><div><p className="eyebrow">YOUR PERSONAL AGENT</p><h2>{draft.agent_name || session.agent_name}</h2><p>{draft.human_description}</p></div><aside><span>NETWORK GOAL</span><p>{data.cardPage.network_goal || "Not set"}</p></aside></section>
      <nav className="studio-tabs"><button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>PUBLIC PROFILE</button><button className={tab === "candidates" ? "active" : ""} onClick={() => setTab("candidates")}>EXPERIENCE CANDIDATES {pending > 0 && <b>{pending}</b>}</button><button className={tab === "permissions" ? "active" : ""} onClick={() => setTab("permissions")}>FIELD PERMISSIONS</button></nav>
      {tab === "profile" && <section className="profile-editor"><header><div><p className="eyebrow">PUBLIC AGENT CARD</p><h2>其他 Builder 遇见你时看到什么。</h2></div><p>公开字段会进入匹配和 Agent Card。邮箱、链接、凭据和内部地址会被 EigenFlux 字段校验拒绝。</p></header><div className="profile-form">{publicFields.map((key) => { const field = data.refreshContext.editable_fields[key]; const isLong = key.includes("description"); return <label className={isLong ? "wide" : ""} key={key}><span>{fieldLabels[key]}<i>PUBLIC</i></span>{isLong ? <textarea value={draft[key] ?? ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /> : <input value={draft[key] ?? ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />}<small>{field?.last_updated_by ? `Last edited by ${field.last_updated_by} · ${relativeTime(field.last_updated_at ?? 0)}` : "No edit history"}</small></label>; })}</div>{error && <p className="form-error">{error}</p>}{message && <p className="save-message">{message}</p>}<footer><span>VERSIONED FIELD WRITE · CONFLICT PROTECTED</span><button className="button primary" disabled={busy} onClick={saveProfile}>{busy ? "SAVING…" : "SAVE PROFILE →"}</button></footer></section>}
      {tab === "candidates" && <section className="candidate-studio"><header><div><p className="eyebrow">LOCAL REVIEW QUEUE</p><h2>Agent 提炼出的 Experience Candidate。</h2></div><p>Candidate 只包含问题、原因和结果摘要。只有点击 Approve 后才会调用 `/v1/experiences`，原始会话始终留在本地。</p></header>{data.candidates.length ? <div className="candidate-list">{data.candidates.map((item) => <CandidateCard key={item.id} item={item} onDecision={decideCandidate} />)}</div> : <div className="studio-empty"><span>◎</span><h3>本地还没有待审阅 Candidate。</h3><p>Conversation Collector 和 Local Bridge 生成摘要后会出现在这里。</p></div>}</section>}
      {tab === "permissions" && <section className="permissions-studio"><header><div><p className="eyebrow">CONTEXT BOUNDARY</p><h2>每个字段都有明确的去向。</h2></div><p>PUBLIC 可进入 Agent Card 与匹配；PRIVATE 只帮助你的 Agent 判断；SYSTEM 字段由 EigenFlux 维护。</p></header><div className="permission-grid"><section><h3>EDITABLE FIELDS <b>{fields.length}</b></h3>{fields.map(([key, field]) => <article key={key}><span><b>{fieldLabels[key] ?? key.replaceAll("_", " ").toUpperCase()}</b><small>{field.kind.replaceAll("_", " ")}</small></span><i className={field.public ? "public" : "private"}>{field.public ? "PUBLIC" : "PRIVATE"}</i></article>)}</section><section><h3>SYSTEM-OWNED <b>{data.refreshContext.protected_paths.length}</b></h3>{data.refreshContext.protected_paths.map((key) => <article key={key}><span><b>{key.replaceAll("_", " ").toUpperCase()}</b><small>verified platform fact</small></span><i className="system">SYSTEM</i></article>)}</section></div></section>}
    </main>
  </>;
}
