import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, appPath, demoMode } from "./api";
import { matchPercent, rankMatches, strongestReason } from "./logic";
import type { HandshakeState, RadarMatch } from "./types";

const initial = (name: string) => name.trim().slice(0, 1).toUpperCase() || "K";

function MatchAvatar({ match, large = false }: { match: RadarMatch; large?: boolean }) {
  const name = match.peer?.display_name ?? "Unknown Builder";
  return <div className={`match-avatar ${large ? "large" : ""}`}><span>{initial(name)}</span><i /></div>;
}

function MatchScore({ score }: { score: number }) {
  const percent = matchPercent(score);
  return <div className="match-score" aria-label={`${percent}% match`}><strong>{percent}</strong><span>%</span><small>匹配度</small></div>;
}

function RadarCard({ match, index }: { match: RadarMatch; index: number }) {
  const profile = match.peer?.profile;
  return <Link className="radar-card" to={appPath(`/radar/${match.id}`)}>
    <div className="radar-index">{index === 0 ? "NOW" : String(index + 1).padStart(2, "0")}</div>
    <MatchAvatar match={match} />
    <div className="radar-person">
      <div className="radar-person-head"><span className="presence-dot" />{match.proximity?.label ?? "刚刚出现"}</div>
      <h2>你应该认识 {match.peer?.display_name ?? "这位 Builder"}。</h2>
      <p>{profile?.now_building ?? profile?.public_summary ?? "对方只公开了本次匹配所需的最小 Context。"}</p>
      <div className="tag-row">{(profile?.skills ?? []).slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
    </div>
    <div className="radar-why"><span>WHY NOW</span><p>{strongestReason(match)}</p><small>{match.score >= .85 ? "Strong match" : "Worth a conversation"}</small></div>
    <span className="card-arrow" aria-hidden="true"><i /></span>
  </Link>;
}

export function RadarPage() {
  const [matches, setMatches] = useState<RadarMatch[] | null>(null);
  const [filter, setFilter] = useState<"all" | "strong">("all");
  const [error, setError] = useState("");
  useEffect(() => { api.radar().then((data) => setMatches(rankMatches(data))).catch((reason) => setError(reason.message)); }, []);
  const visible = useMemo(() => (matches ?? []).filter((item) => filter === "all" || item.score >= 0.75), [matches, filter]);

  if (error) return <div className="state-page"><h2>Radar 暂时离线</h2><p>{error}</p><p>确认 Presence 和 KIN API 后重试。</p></div>;
  if (!matches) return <div className="loading-screen">Agent 正在扫描附近的 Builder Context…</div>;
  return <>
    <header className="topbar radar-topbar"><div><p className="eyebrow">KIN · NEARBY</p><h1>附近值得认识的人。</h1></div><div className="kin-switch"><Link to={appPath("/kin")}>关系</Link><Link className="active" to={appPath("/radar")}>附近</Link></div></header>
    <main className="radar-page">
      <section className="radar-intro">
        <div><p className="eyebrow">你的网络目标</p><h2>找到能一起完成 Agent Hardware Demo 的 Builder</h2></div>
        <p>KIN 只在一个人真的值得打断你时出现。<strong>理由比匹配分数更重要。</strong></p>
      </section>
      <div className="radar-toolbar"><div className="section-heading"><span>PEOPLE IN RANGE</span><b>{visible.length}</b></div><div className="radar-filter"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>全部</button><button className={filter === "strong" ? "active" : ""} onClick={() => setFilter("strong")}>强关联</button></div></div>
      {visible.length ? <section className="radar-list">{visible.map((match, index) => <RadarCard key={match.id} match={match} index={index} />)}</section> : <section className="radar-empty"><span className="empty-scan-mark"><i /></span><h2>还没有足够强的 Signal</h2><p>Radar 会继续观察，不需要停留在这个页面。</p></section>}
      <footer className="radar-foot"><span><i /> 附近有人在线</span><p>精准位置不会被共享；匹配消失后，未建立的 Context 会自动过期。</p></footer>
    </main>
  </>;
}

function ReasonRow({ reason, index }: { reason: string; index: number }) {
  return <article className="reason-row"><span>{String(index + 1).padStart(2, "0")}</span><p>{reason}</p><i>EXPLAINED</i></article>;
}

function HandshakePanel({ match }: { match: RadarMatch }) {
  const [state, setState] = useState<HandshakeState | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function begin() {
    setBusy(true); setError("");
    try {
      const next = await api.confirmHandshake(match.id);
      setState(next); setOverlayOpen(true);
      if (demoMode) window.setTimeout(() => setState((current) => current ? { ...current, status: "connected", user_b_confirmed: true, gesture_a_seen: true, gesture_b_seen: true, completed_at: new Date().toISOString(), relationship_id: "rel_momo_01" } : current), 1800);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "握手确认失败"); }
    finally { setBusy(false); }
  }
  const connected = state?.status === "connected" || state?.status === "completed";
  return <><section className={`handshake-panel ${state ? "active" : ""}`}>
    {state ? <><div className={`handshake-pulse ${connected ? "connected" : ""}`}><i /><i /><span className="handshake-status-mark"><i /><i /></span></div><p className="eyebrow">CONTEXT HANDSHAKE · {state.status.toUpperCase()}</p><h2>{connected ? `你和 ${match.peer?.display_name} 已经连接。` : "现在，让两台设备完成现实动作。"}</h2><p>{connected ? "Shared Context 已经开始记得这次相遇为什么发生。" : "你的意愿已确认。只有双方的设备动作都完成后，Context 才会连接。"}</p><button className="button" onClick={() => setOverlayOpen(true)}>查看握手状态 →</button></> : <>
    <p className="eyebrow">READY TO RECOGNIZE KIN?</p><h2>建立 Context Handshake</h2>
    <p>这不是“加好友”。双方确认后，只交换本次允许的 Builder Context，并记录为什么认识。</p>
    <ul><li>公开 Builder Profile</li><li>当前项目与能力交集</li><li>本次认识原因</li></ul>
    {error && <p className="form-error">{error}</p>}
    <button className="button primary handshake-button" disabled={busy} onClick={begin}>{busy ? "正在准备…" : "我想认识 TA →"}</button>
    <small>对方不会在你点击前收到任何请求。</small>
    </>}</section>
    {state && overlayOpen && <section className={`handshake-transition ${connected ? "connected" : "connecting"}`}>
      <button className="transition-close" onClick={() => setOverlayOpen(false)} aria-label="关闭">×</button>
      <div className="handshake-agents"><span>N<i /></span><b><i /><i /><i /></b><span>{initial(match.peer?.display_name ?? "K")}<i /></span></div>
      <p className="eyebrow">{connected ? "CONTEXT CONNECTED" : "CONTEXT HANDSHAKE"}</p>
      <h2>{connected ? `YOU × ${(match.peer?.display_name ?? "KIN").toUpperCase()}` : "Two agents are recognizing each other…"}</h2>
      {connected ? <div className="connected-context"><span>Why you met</span><p>{strongestReason(match)}</p><span>Talk about</span><p>{match.peer?.profile?.skills.slice(0, 2).join(" · ")}</p><Link to={appPath(`/kin/${state.relationship_id ?? "rel_momo_01"}`)}>打开 Shared Context →</Link></div> : <div className="handshake-progress"><i className={state.user_a_confirmed ? "done" : ""} /><i className={state.gesture_a_seen && state.gesture_b_seen ? "done" : ""} /><i className={state.user_b_confirmed ? "done" : ""} /></div>}
    </section>}
  </>;
}

export function MatchDetailPage() {
  const { matchId = "" } = useParams();
  const [match, setMatch] = useState<RadarMatch | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.match(matchId).then(setMatch).catch((reason) => setError(reason.message)); }, [matchId]);
  if (error) return <div className="state-page"><h2>这个 Match 已经离开 Radar</h2><p>{error}</p><Link to={appPath("/radar")}>← 返回 Radar</Link></div>;
  if (!match) return <div className="loading-screen">正在读取双方授权的 Context…</div>;
  const profile = match.peer?.profile;
  return <>
    <header className="topbar detail-topbar"><div><Link className="back-link" to={appPath("/radar")}>← Kin · Nearby</Link><p className="eyebrow">WHY NOW · {match.id.toUpperCase()}</p></div><div className="privacy-chip">只显示已授权 Context</div></header>
    <main className="match-detail">
      <section className="match-hero">
        <div className="match-identity"><MatchAvatar match={match} large /><div><span className="presence-line"><i />{match.proximity?.label ?? "刚刚出现"}</span><p className="eyebrow">YOU SHOULD MEET</p><h1>{match.peer?.display_name ?? "Private Agent"}</h1><p className="match-hero-reason">{strongestReason(match)}</p></div></div>
        <MatchScore score={match.score} />
      </section>
      <div className="match-columns">
        <section className="match-main">
          <div className="section-heading"><span>为什么匹配</span><b>{match.reasons.length}</b></div>
          <div className="reason-list">{match.reasons.map((reason, index) => <ReasonRow reason={reason} index={index} key={reason} />)}</div>
          <section className="building-card"><p className="eyebrow">正在做</p><h2>{profile?.now_building ?? "只在建立连接后分享当前项目"}</h2><span>来自对方授权的 Event Context</span></section>
          <div className="context-grid">
            <section><p className="eyebrow">CAN HELP WITH</p><div className="detail-tags">{profile?.skills.map((tag) => <span key={tag}>{tag}</span>)}</div></section>
            <section><p className="eyebrow">LOOKING FOR</p><div className="detail-tags seeking">{profile?.needs.map((tag) => <span key={tag}>{tag}</span>)}</div></section>
            <section><p className="eyebrow">INTEREST GRAPH · SLICE</p><div className="detail-tags quiet">{profile?.interests.map((tag) => <span key={tag}>{tag}</span>)}</div></section>
            <section><p className="eyebrow">AI STACK</p><div className="detail-tags quiet">{profile?.ai_stack.map((tag) => <span key={tag}>{tag}</span>)}</div></section>
          </div>
        </section>
        <aside className="match-side"><HandshakePanel match={match} /><section className="context-boundary"><p className="eyebrow">CONTEXT BOUNDARY</p><p>你看到的是对方为本次活动授权的摘要，不包含原始对话、私人 Memory 或精确位置。</p><button>查看字段权限 →</button></section></aside>
      </div>
    </main>
  </>;
}
