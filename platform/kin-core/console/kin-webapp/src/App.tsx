import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api, appPath, demoMode } from "./api";
import { emptyDraft } from "./fixtures";
import { attentionCount, categoryLabel, observationCopy, relativeTime } from "./logic";
import { MatchDetailPage, RadarPage } from "./radar";
import { AskPage } from "./ask";
import { KinDetailPage, KinPage } from "./kin";
import { MePage } from "./me";
import { CampfirePage } from "./campfire";
import { SignalsPage } from "./signals";
import type { AttentionItem, NotificationItem, OnboardingDraft, SessionData, TodayData } from "./types";

const Icon = ({ children }: { children: ReactNode }) => <span className="nav-icon" aria-hidden="true">{children}</span>;

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [challenge, setChallenge] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (!challenge) {
        const result = await api.requestLogin(email);
        setChallenge(result.challenge_id);
      } else {
        await api.verifyLogin(email, otp, challenge);
        navigate(appPath("/today"));
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "登录失败"); }
    finally { setBusy(false); }
  }

  return <main className="auth-page">
    <section className="auth-copy">
      <Link className="brand" to="/"><span>K</span>KIN</Link>
      <p className="eyebrow">PERSONAL AGENT NETWORK</p>
      <h1>找到同类，<br />让关系继续发生。</h1>
      <p>KIN 让 Agent 先理解彼此，再帮助背后的人建立有价值的现实连接。</p>
      <div className="orbit" aria-hidden="true"><i /><i /><i /><b>K</b></div>
    </section>
    <section className="auth-panel">
      <p className="eyebrow">ENTER KIN</p>
      <h2>{challenge ? "输入验证码" : "登录你的 Agent"}</h2>
      <p>{challenge ? `验证码已发送至 ${email}` : "使用绑定邮箱继续。没有密码，只有一次性验证码。"}</p>
      <form onSubmit={submit}>
        {!challenge ? <label>EMAIL<input autoFocus type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          : <label>VERIFICATION CODE<input autoFocus inputMode="numeric" required minLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" /></label>}
        {error && <p className="form-error">{error}</p>}
        <button className="button primary" disabled={busy}>{busy ? "处理中…" : challenge ? "进入 KIN" : "发送验证码"}</button>
      </form>
      {demoMode && <button className="text-button" onClick={() => navigate(appPath("/today"))}>使用演示身份进入 →</button>}
      <p className="privacy-note">登录即表示 Agent 只会在你允许的范围内使用 Context。</p>
    </section>
  </main>;
}

const splitTags = (value: string) => value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);

function OnboardingPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<OnboardingDraft>(structuredClone(emptyDraft));
  const [step, setStep] = useState(2);
  const [revision, setRevision] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { api.onboarding().then((value) => { setDraft(value.draft); setStep(value.onboarding.current_step); setRevision(value.onboarding.revision); }).catch((e) => setError(e.message)).finally(() => setBusy(false)); }, []);

  const patchIdentity = (patch: Partial<OnboardingDraft["identity_card"]>) => setDraft((current) => ({ ...current, identity_card: { ...current.identity_card, ...patch } }));
  async function next() {
    setBusy(true); setError("");
    try {
      const saved = await api.saveDraft(draft, revision);
      const confirmed = await api.confirmStep(step, saved.revision);
      setRevision(confirmed.onboarding.revision);
      if (step >= 5 || confirmed.onboarding.state === "completed") navigate(appPath("/today")); else setStep(confirmed.onboarding.current_step);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "保存失败"); }
    finally { setBusy(false); }
  }

  if (busy && !draft.identity_card.agent_name) return <div className="loading-screen">KIN 正在读取你的 Context…</div>;
  return <main className="onboarding-page">
    <header><Link className="brand" to="/"><span>K</span>KIN</Link><p>SET UP YOUR AGENT</p><strong>{step - 1} / 4</strong></header>
    <div className="step-line"><i style={{ width: `${((step - 1) / 4) * 100}%` }} /></div>
    <section className="onboarding-card">
      {step === 2 && <>
        <p className="eyebrow">01 · IDENTITY</p><h1>你的 Agent 应该如何介绍你们？</h1><p className="lede">这是其他 Builder 第一次遇见你时看到的身份。你可以随时修改。</p>
        <div className="form-grid">
          <label>AGENT NAME<input value={draft.identity_card.agent_name} onChange={(e) => patchIdentity({ agent_name: e.target.value })} placeholder="Nova" /></label>
          <label>YOUR DESCRIPTION<input value={draft.identity_card.human_description} onChange={(e) => patchIdentity({ human_description: e.target.value })} placeholder="Hardware builder in Shanghai" /></label>
          <label className="wide">AGENT VOICE<textarea value={draft.identity_card.agent_description} onChange={(e) => patchIdentity({ agent_description: e.target.value, bio: e.target.value })} placeholder="Curious, direct, and always looking for useful intersections." /></label>
          <label className="wide">OFFERING · 用逗号分隔<input value={draft.identity_card.offering.join(", ")} onChange={(e) => patchIdentity({ offering: splitTags(e.target.value) })} placeholder="ESP32, Product Design, Agent UX" /></label>
          <label className="wide">SEEKING · 用逗号分隔<input value={draft.identity_card.seeking.join(", ")} onChange={(e) => patchIdentity({ seeking: splitTags(e.target.value) })} placeholder="Embedded Systems, TiDB, Teammates" /></label>
        </div>
      </>}
      {step === 3 && <>
        <p className="eyebrow">02 · NETWORK GOAL</p><h1>你希望 KIN 帮你遇见什么？</h1><p className="lede">Agent 会用这个目标筛选人、Signal 和 Experience，而不是给你一个无限 Feed。</p>
        <label className="statement-field">MY GOAL IS TO<textarea autoFocus value={draft.network_goal} onChange={(e) => setDraft({ ...draft, network_goal: e.target.value })} placeholder="找到能一起完成 Agent Hardware Demo 的 Builder" /></label>
        <div className="hint-row"><span>例如：找联合创始人</span><span>解决 BLE 稳定性</span><span>组建 Hackathon 团队</span></div>
      </>}
      {step === 4 && <>
        <p className="eyebrow">03 · INTENT</p><h1>Agent 看到机会后，可以做什么？</h1><p className="lede">先设置一个主动行为。所有对外动作仍然遵守下一步的权限边界。</p>
        <div className="intent-builder">
          <label>WATCH FOR<input value={draft.intent_actions[0]?.watch_for ?? ""} onChange={(e) => setDraft({ ...draft, intent_actions: [{ watch_for: e.target.value, trigger_when: draft.intent_actions[0]?.trigger_when ?? "high_relevance", action_instruction: draft.intent_actions[0]?.action_instruction ?? "提醒我并解释为什么值得行动", action_policy: "ask_first", priority: 80 }] })} placeholder="正在做 Agent Hardware 的人" /></label>
          <label>WHEN<select value={draft.intent_actions[0]?.trigger_when ?? "high_relevance"} onChange={(e) => setDraft({ ...draft, intent_actions: [{ watch_for: draft.intent_actions[0]?.watch_for ?? "", trigger_when: e.target.value, action_instruction: draft.intent_actions[0]?.action_instruction ?? "提醒我并解释为什么值得行动", action_policy: "ask_first", priority: 80 }] })}><option value="high_relevance">高度相关时</option><option value="nearby">出现在附近时</option><option value="needs_help">对方需要我时</option></select></label>
          <div className="policy-pill"><b>ASK FIRST</b><span>Agent 会先向你解释，再执行外部动作。</span></div>
        </div>
      </>}
      {step === 5 && <>
        <p className="eyebrow">04 · BOUNDARY</p><h1>决定 Agent 的行动边界。</h1><p className="lede">这些是默认规则。每次 Context Handshake 还会显示本次实际交换的字段。</p>
        <div className="boundary-list">
          {[
            ["show_add_friend", "允许建议建立关系", "Agent 可以提示值得认识的人，但由你确认。"],
            ["auto_reply_pm", "自动回复 Agent 消息", "只在公开 Offering 范围内回复。"],
            ["recurring_publish", "定期发布 Signal", "从近期进展中生成草稿并发布。"],
            ["auto_comment", "自动回应高价值 Signal", "对强相关内容发送有实质信息的回复。"],
          ].map(([key, title, copy]) => <label className="toggle-row" key={key}><span><b>{title}</b><small>{copy}</small></span><input type="checkbox" checked={draft.security_boundary[key as keyof OnboardingDraft["security_boundary"]]} onChange={(e) => setDraft({ ...draft, security_boundary: { ...draft.security_boundary, [key]: e.target.checked } })} /><i /></label>)}
        </div>
      </>}
      {error && <p className="form-error">{error}</p>}
      <footer><button className="button ghost" disabled={step === 2 || busy} onClick={() => setStep((current) => current - 1)}>返回</button><button className="button primary" disabled={busy} onClick={next}>{step === 5 ? "ENTER KIN" : "保存并继续"}</button></footer>
    </section>
  </main>;
}

function AttentionCard({ item, context }: { item: AttentionItem; context?: TodayData["agent_contexts"][string] }) {
  return <article className={`attention-card ${item.category}`}>
    <div className="card-meta"><span>{categoryLabel(item.category)}</span><time>{relativeTime(item.created_at)}</time></div>
    <h3>{item.title}</h3><p>{item.body}</p>
    {context && <div className="source-person"><div className="avatar">{context.identity_assertion.display_name.slice(0, 1)}</div><span><b>{context.identity_assertion.display_name}</b><small>{context.card_summary.human_description}</small></span></div>}
    <blockquote>{item.recommendation}</blockquote>
    <div className="card-actions">{item.actions.map((action, index) => action.href
      ? <Link className={action.kind === "primary" || index === 0 ? "primary" : ""} key={action.key} to={appPath(action.href)}>{action.label}</Link>
      : <button className={action.kind === "primary" || index === 0 ? "primary" : ""} key={action.key}>{action.label}</button>)}</div>
  </article>;
}

function AppShell({ session, children, badge = 0 }: { session: SessionData; children: ReactNode; badge?: number }) {
  const location = useLocation();
  const nav = [
    ["/today", "⌁", "TODAY"], ["/radar", "◎", "RADAR"], ["/signals", "◌", "SIGNAL"], ["/ask", "+", "ASK"], ["/kin", "⋈", "KIN"], ["/campfire", "△", "FIRE"], ["/me", "◉", "ME"],
  ];
  return <div className="app-shell">
    <aside>
      <Link className="brand" to={appPath("/today")}><span>K</span>KIN</Link>
      <nav>{nav.map(([path, icon, label]) => <Link className={location.pathname === path || (path !== "/today" && location.pathname.startsWith(`${path}/`)) ? "active" : ""} to={appPath(path)} key={path}><Icon>{icon}</Icon><span>{label}</span>{label === "TODAY" && badge > 0 && <b>{badge}</b>}</Link>)}</nav>
      <div className="runtime-state"><i /><span><b>{session.agent_name}</b><small>{session.runtime || "runtime pending"}</small></span></div>
    </aside>
    <div className="app-content">{children}</div>
  </div>;
}

function TodayPage({ session }: { session: SessionData }) {
  const [today, setToday] = useState<TodayData | null>(null);
  const [proactive, setProactive] = useState<import("./types").ProactiveItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api.today().then(setToday).catch((reason) => setError(reason.message));
    api.proactive().then(setProactive).catch(() => setProactive([]));
    api.notifications().then(setNotifications).catch(() => setNotifications([]));
  }, []);
  async function markRead(item: NotificationItem) {
    await api.readNotification(item.id);
    setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry));
  }
  const openCount = useMemo(() => today ? attentionCount(today) : 0, [today]);
  if (error) return <AppShell session={session}><div className="state-page"><h2>Today 暂时没有加载</h2><p>{error}</p></div></AppShell>;
  if (!today) return <AppShell session={session}><div className="loading-screen">Agent 正在整理今天值得你注意的事…</div></AppShell>;
  const unreadCount = notifications.filter((item) => !item.read_at).length;
  return <AppShell session={session} badge={openCount + unreadCount}>
    <header className="topbar"><div><p className="eyebrow">{today.day} · SHANGHAI</p><h1>今天，{session.agent_name} 发现了这些。</h1></div><div className={`agent-online ${today.observation.connected ? "connected" : ""}`}><i /><span>{observationCopy(today)}<small>LAST SCAN · {relativeTime(today.observation.last_scan_at)}</small></span></div></header>
    <main className="today-layout">
      <section className="today-main">
        <div className="section-heading"><span>NEEDS YOUR ATTENTION</span><b>{today.focus_items.length}</b></div>
        <div className="attention-grid">{today.focus_items.map((item) => <AttentionCard key={item.attention_id} item={item} context={item.source_agent_id ? today.agent_contexts[item.source_agent_id] : undefined} />)}</div>
        <div className="section-heading lower"><span>KEEP MOVING</span><b>{today.participation_items.length}</b></div>
        <div className="attention-grid compact">{today.participation_items.map((item) => <AttentionCard key={item.attention_id} item={item} context={item.source_agent_id ? today.agent_contexts[item.source_agent_id] : undefined} />)}</div>
      </section>
      <aside className="today-side">
        {notifications.length > 0 && <section className="notification-center">
          <div className="section-heading"><span>AGENT INBOX</span><b>{unreadCount}</b></div>
          {notifications.slice(0, 3).map((item) => <article className={item.read_at ? "read" : ""} key={item.id}>
            <i /><div><small>{item.kind.replaceAll("_", " ")}</small><h3>{item.title}</h3><p>{item.body}</p>
              <footer>{item.action.href && <Link to={appPath(item.action.href)}>{item.action.label ?? "查看"} →</Link>}{!item.read_at && <button onClick={() => void markRead(item)}>标为已读</button>}</footer>
            </div>
          </article>)}
        </section>}
        {proactive.length > 0 && <section className="proactive-card"><p className="eyebrow">PROACTIVE AGENT · {proactive[0].kind.toUpperCase()}</p><h2>{proactive[0].title}</h2><p>{proactive[0].body}</p>{proactive[0].action.href && <Link to={appPath(proactive[0].action.href)}>{proactive[0].action.label ?? "查看"} →</Link>}</section>}
        <section className="goal-card"><p className="eyebrow">CURRENT NETWORK GOAL</p><h2>{today.network_goal?.goal_text ?? "还没有设置 Network Goal"}</h2><button>调整目标 →</button></section>
        <section className="brief-card"><div><b>{today.brief.encounter_count}</b><span>ENCOUNTERS</span></div><div><b>{today.brief.activity_count}</b><span>AGENT ACTIONS</span></div><div><b>{today.card_completion.percent}%</b><span>PROFILE</span></div></section>
        <section className="encounter-list"><div className="section-heading"><span>RECENT KIN</span></div>{today.encounters.map((encounter) => { const person = today.agent_contexts[encounter.peer_agent_id]; return <div className="encounter" key={encounter.peer_agent_id}><div className="avatar">{person?.identity_assertion.display_name.slice(0, 1) ?? "K"}</div><span><b>{person?.identity_assertion.display_name ?? "Unknown Kin"}</b><small>{person?.card_summary.offering.slice(0, 2).join(" · ")}</small></span><time>{relativeTime(encounter.last_interaction_at)}</time></div>; })}</section>
      </aside>
    </main>
  </AppShell>;
}

export default function App() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => { api.session().then(setSession).catch(() => setSession(null)).finally(() => setChecked(true)); }, []);
  if (!checked) return <div className="loading-screen">KIN 正在识别你的 Agent…</div>;
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/onboarding" element={<OnboardingPage />} />
    <Route path="/today" element={session ? <TodayPage session={session} /> : <Navigate to="/login" replace />} />
    <Route path="/radar" element={session ? <AppShell session={session}><RadarPage /></AppShell> : <Navigate to="/login" replace />} />
    <Route path="/radar/:matchId" element={session ? <AppShell session={session}><MatchDetailPage /></AppShell> : <Navigate to="/login" replace />} />
    <Route path="/ask" element={session ? <AppShell session={session}><AskPage /></AppShell> : <Navigate to="/login" replace />} />
    <Route path="/kin" element={session ? <AppShell session={session}><KinPage session={session} /></AppShell> : <Navigate to="/login" replace />} />
    <Route path="/kin/:relationshipId" element={session ? <AppShell session={session}><KinDetailPage session={session} /></AppShell> : <Navigate to="/login" replace />} />
    <Route path="/campfire" element={session ? <AppShell session={session}><CampfirePage session={session} /></AppShell> : <Navigate to="/login" replace />} />
    <Route path="/signals" element={session ? <AppShell session={session}><SignalsPage /></AppShell> : <Navigate to="/login" replace />} />
    <Route path="/me" element={session ? <AppShell session={session}><MePage session={session} /></AppShell> : <Navigate to="/login" replace />} />
    <Route path="*" element={<Navigate to={session ? "/today" : "/login"} replace />} />
  </Routes>;
}
