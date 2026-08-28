import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, appPath } from "./api";
import { openFollowUpCount, relationshipPeerName, relativeTime, sortRelationships } from "./logic";
import type { Relationship, SessionData } from "./types";

const dateLabel = (value: string) => new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));

function KinAvatar({ name, large = false }: { name: string; large?: boolean }) {
  return <div className={`kin-avatar ${large ? "large" : ""}`}><span>{name.trim().slice(0, 1).toUpperCase() || "K"}</span><i>⋈</i></div>;
}

function RelationshipCard({ item, agentId }: { item: Relationship; agentId: string }) {
  const name = relationshipPeerName(item, agentId);
  const context = item.shared_context;
  const open = openFollowUpCount(item);
  return <Link className="kin-card" to={appPath(`/kin/${item.id}`)}>
    <div className="kin-card-date"><span>{dateLabel(item.created_at)}</span><i>CONNECTED</i></div>
    <KinAvatar name={name} />
    <div className="kin-card-person"><p className="eyebrow">RECOGNIZED KIN</p><h2>{name}</h2><p>{item.peer?.profile?.public_summary ?? context.why_you_met?.[0] ?? "你们通过 Context Handshake 建立了 Shared Context。"}</p></div>
    <div className="kin-card-memory"><span>WHY YOU MET</span><p>{context.why_you_met?.[0] ?? "Shared Context 已保存"}</p></div>
    <div className="kin-card-follow"><strong>{open}</strong><span>OPEN<br />FOLLOW-UPS</span></div><b className="card-arrow">↗</b>
  </Link>;
}

export function KinPage({ session }: { session: SessionData }) {
  const [relationships, setRelationships] = useState<Relationship[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.relationships().then((items) => setRelationships(sortRelationships(items))).catch((reason) => setError(reason.message)); }, []);
  const followUps = useMemo(() => (relationships ?? []).reduce((sum, item) => sum + openFollowUpCount(item), 0), [relationships]);
  if (error) return <div className="state-page"><h2>Relationship Memory 暂时没有加载</h2><p>{error}</p></div>;
  if (!relationships) return <div className="loading-screen">Agent 正在整理你们共同拥有的 Context…</div>;
  return <>
    <header className="topbar kin-topbar"><div><p className="eyebrow">RELATIONSHIP MEMORY · PRIVATE</p><h1>你已经认出的同类。</h1></div><div className="kin-count"><strong>{relationships.length}</strong><span>RELATIONSHIPS<small>{followUps} OPEN FOLLOW-UPS</small></span></div></header>
    <main className="kin-page">
      <section className="kin-intro"><div><p className="eyebrow">SHARED CONTEXT</p><h2>不是联系人列表，<br />而是关系为什么存在。</h2></div><p>每次 Context Handshake 都会留下双方可见的 Relationship Memory：在哪里认识、为什么认识、当时在做什么，以及下一步答应了什么。</p></section>
      <div className="kin-toolbar"><div className="section-heading"><span>YOUR KIN</span><b>{relationships.length}</b></div><span>PARTICIPANTS ONLY · ENCRYPTED IN TRANSIT</span></div>
      {relationships.length ? <section className="kin-list">{relationships.map((item) => <RelationshipCard key={item.id} item={item} agentId={session.agent_id} />)}</section> : <section className="radar-empty"><span>⋈</span><h2>第一段 Shared Context 还没有发生。</h2><p>从 Radar 找到值得认识的人，再由双方完成现实中的 Context Handshake。</p><Link className="button primary" to={appPath("/radar")}>OPEN RADAR →</Link></section>}
    </main>
  </>;
}

function MemoryLine({ label, children }: { label: string; children: ReactNode }) {
  return <section className="memory-line"><p className="eyebrow">{label}</p><div>{children}</div></section>;
}

export function KinDetailPage({ session }: { session: SessionData }) {
  const { relationshipId = "" } = useParams();
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.relationship(relationshipId).then(setRelationship).catch((reason) => setError(reason.message)); }, [relationshipId]);
  if (error) return <div className="state-page"><h2>这段 Shared Context 不可用</h2><p>{error}</p><Link to={appPath("/kin")}>← 返回 Your Kin</Link></div>;
  if (!relationship) return <div className="loading-screen">正在打开 Relationship Memory…</div>;
  const context = relationship.shared_context;
  const name = relationshipPeerName(relationship, session.agent_id);
  const followUps = context.follow_ups ?? [];
  return <>
    <header className="topbar detail-topbar"><div><Link className="back-link" to={appPath("/kin")}>← YOUR KIN</Link><p className="eyebrow">SHARED CONTEXT · {relationship.id.toUpperCase()}</p></div><div className="privacy-chip">PARTICIPANTS ONLY</div></header>
    <main className="memory-page">
      <section className="memory-hero"><div className="memory-pair"><div className="paired-avatars"><KinAvatar name={session.agent_name} large /><KinAvatar name={name} large /></div><div><p className="eyebrow">CONTEXT HANDSHAKE · CONNECTED</p><h1>{context.title ?? `${session.agent_name} × ${name}`}</h1><p>{context.venue ?? "Venue not recorded"} · {dateLabel(relationship.created_at)}</p></div></div><span className="memory-mark">⋈</span></section>
      <div className="memory-columns"><section className="memory-main">
        <MemoryLine label="WHY YOU MET"><ol className="memory-reasons">{(context.why_you_met ?? []).map((reason) => <li key={reason}>{reason}</li>)}</ol></MemoryLine>
        <MemoryLine label="WHAT YOU WERE BUILDING"><div className="building-pair"><article><span>{session.agent_name}</span><p>{relationship.user_a_id === session.agent_id ? context.user_a_building : context.user_b_building}</p></article><i>×</i><article><span>{name}</span><p>{relationship.user_a_id === session.agent_id ? context.user_b_building : context.user_a_building}</p></article></div></MemoryLine>
        {!!context.conversation?.length && <MemoryLine label="WHAT YOU TALKED ABOUT"><ul className="conversation-list">{context.conversation.map((item) => <li key={item}>{item}</li>)}</ul></MemoryLine>}
        <div className="memory-tag-grid"><MemoryLine label="COMMON INTERESTS"><div className="detail-tags quiet">{(context.common_interests ?? []).map((item) => <span key={item}>{item}</span>)}</div></MemoryLine><MemoryLine label="PROJECT OVERLAP"><div className="detail-tags">{(context.project_overlap ?? []).map((item) => <span key={item}>{item}</span>)}</div></MemoryLine></div>
      </section><aside className="memory-side">
        <section className="next-step"><p className="eyebrow">NEXT STEP</p><h2>{context.next_step ?? "交换一个当前 blocker，并约定一次后续交流。"}</h2><button className="button primary">让 Agent 起草消息 →</button></section>
        <section className="follow-up-panel"><div className="section-heading"><span>FOLLOW-UPS</span><b>{followUps.length}</b></div>{followUps.length ? followUps.map((item) => <article className={item.status === "done" ? "done" : ""} key={item.id ?? item.description}><i /><div><p>{item.description}</p><span>{item.status === "done" ? "COMPLETED" : item.owner_id === session.agent_id ? "YOUR COMMITMENT" : `${name.toUpperCase()}'S COMMITMENT`}</span></div><button aria-label="mark complete">✓</button></article>) : <p className="no-follow-up">还没有记录后续承诺。</p>}</section>
        <section className="memory-boundary"><p className="eyebrow">MEMORY BOUNDARY</p><p>这段 Memory 只向关系双方开放。原始对话和未授权的私人 Context 不会出现在这里。</p></section>
      </aside></div>
    </main>
  </>;
}
