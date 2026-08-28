import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, appPath } from "./api";
import { matchPercent, rankMatches, strongestReason } from "./logic";
import type { HandshakeState, RadarMatch } from "./types";

const initial = (name: string) => name.trim().slice(0, 1).toUpperCase() || "K";

function MatchAvatar({ match, large = false }: { match: RadarMatch; large?: boolean }) {
  const name = match.peer?.display_name ?? "Unknown Builder";
  return <div className={`match-avatar ${large ? "large" : ""}`}><span>{initial(name)}</span><i /></div>;
}

function MatchScore({ score }: { score: number }) {
  const percent = matchPercent(score);
  return <div className="match-score" aria-label={`${percent}% match`}><strong>{percent}</strong><span>%</span><small>MATCH</small></div>;
}

function RadarCard({ match, index }: { match: RadarMatch; index: number }) {
  const profile = match.peer?.profile;
  return <Link className="radar-card" to={appPath(`/radar/${match.id}`)}>
    <div className="radar-index">{String(index + 1).padStart(2, "0")}</div>
    <MatchAvatar match={match} />
    <div className="radar-person">
      <div className="radar-person-head"><span className="presence-dot" />{match.proximity?.label ?? "RECENT SIGNAL"}</div>
      <h2>{match.peer?.display_name ?? "Private Agent"}</h2>
      <p>{profile?.now_building ?? profile?.public_summary ?? "对方只公开了本次匹配所需的最小 Context。"}</p>
      <div className="tag-row">{(profile?.skills ?? []).slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
    </div>
    <div className="radar-why"><span>WHY YOU MATCH</span><p>{strongestReason(match)}</p></div>
    <MatchScore score={match.score} />
    <span className="card-arrow">↗</span>
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
    <header className="topbar radar-topbar"><div><p className="eyebrow">BUILDER RADAR · LIVE</p><h1>附近值得认识的人。</h1></div><div className="radar-signal"><i /><span><b>{matches.length} SIGNALS</b><small>PRESENCE WINDOW · 15 MIN</small></span></div></header>
    <main className="radar-page">
      <section className="radar-intro">
        <div><p className="eyebrow">YOUR NETWORK GOAL</p><h2>找到能一起完成 Agent Hardware Demo 的 Builder</h2></div>
        <p>KIN 只展示双方授权 Context 中能够解释的交集。百分比用于排序，<strong>理由才是决定是否行动的依据。</strong></p>
      </section>
      <div className="radar-toolbar"><div className="section-heading"><span>PEOPLE IN RANGE</span><b>{visible.length}</b></div><div className="radar-filter"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>ALL</button><button className={filter === "strong" ? "active" : ""} onClick={() => setFilter("strong")}>75%+</button></div></div>
      {visible.length ? <section className="radar-list">{visible.map((match, index) => <RadarCard key={match.id} match={match} index={index} />)}</section> : <section className="radar-empty"><span>◎</span><h2>还没有足够强的 Signal</h2><p>Radar 会继续观察，不需要停留在这个页面。</p></section>}
      <footer className="radar-foot"><span><i /> NEARBY PRESENCE ACTIVE</span><p>精准位置不会被共享；匹配消失后，未建立的 Context 会自动过期。</p></footer>
    </main>
  </>;
}

function ReasonRow({ reason, index }: { reason: string; index: number }) {
  return <article className="reason-row"><span>{String(index + 1).padStart(2, "0")}</span><p>{reason}</p><i>EXPLAINED</i></article>;
}

function HandshakePanel({ match }: { match: RadarMatch }) {
  const [state, setState] = useState<HandshakeState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function begin() {
    setBusy(true); setError("");
    try { setState(await api.confirmHandshake(match.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "握手确认失败"); }
    finally { setBusy(false); }
  }
  if (state) return <section className="handshake-panel active">
    <div className="handshake-pulse"><i /><i /><span>⌁</span></div>
    <p className="eyebrow">CONTEXT HANDSHAKE · {state.status.toUpperCase()}</p>
    <h2>现在，用两台设备完成碰一碰。</h2>
    <p>你的意愿已确认。双方设备动作完成后，KIN 才会交换本次授权的 Context 并生成 Shared Context。</p>
    <div className="handshake-checks"><span className={state.user_a_confirmed ? "done" : ""}>你的确认</span><span className={state.gesture_a_seen && state.gesture_b_seen ? "done" : ""}>现实动作</span><span className={state.user_b_confirmed ? "done" : ""}>对方确认</span></div>
  </section>;
  return <section className="handshake-panel">
    <p className="eyebrow">READY TO RECOGNIZE KIN?</p><h2>建立 Context Handshake</h2>
    <p>这不是“加好友”。双方确认后，只交换本次允许的 Builder Context，并记录为什么认识。</p>
    <ul><li>公开 Builder Profile</li><li>当前项目与能力交集</li><li>本次认识原因</li></ul>
    {error && <p className="form-error">{error}</p>}
    <button className="button primary handshake-button" disabled={busy} onClick={begin}>{busy ? "正在准备…" : "我想认识 TA →"}</button>
    <small>对方不会在你点击前收到任何请求。</small>
  </section>;
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
    <header className="topbar detail-topbar"><div><Link className="back-link" to={appPath("/radar")}>← BUILDER RADAR</Link><p className="eyebrow">MATCH DETAIL · {match.id.toUpperCase()}</p></div><div className="privacy-chip">EVENT CONTEXT · AUTHORIZED</div></header>
    <main className="match-detail">
      <section className="match-hero">
        <div className="match-identity"><MatchAvatar match={match} large /><div><span className="presence-line"><i />{match.proximity?.label ?? "RECENT SIGNAL"}</span><h1>{match.peer?.display_name ?? "Private Agent"}</h1><p>@{match.peer?.handle ?? "private"} · {profile?.public_summary}</p></div></div>
        <MatchScore score={match.score} />
      </section>
      <div className="match-columns">
        <section className="match-main">
          <div className="section-heading"><span>WHY YOU MATCH</span><b>{match.reasons.length}</b></div>
          <div className="reason-list">{match.reasons.map((reason, index) => <ReasonRow reason={reason} index={index} key={reason} />)}</div>
          <section className="building-card"><p className="eyebrow">CURRENTLY BUILDING</p><h2>{profile?.now_building ?? "只在建立连接后分享当前项目"}</h2><span>来自对方授权的 Event Context</span></section>
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
