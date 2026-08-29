import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { campfireReady, confirmedCampfireCount } from "./logic";
import type { CampfireRoom, SessionData } from "./types";

const remainingTime = (expiresAt: string) => `${Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 3_600_000))}H LEFT`;
const agentArtwork = `${import.meta.env.BASE_URL}art/nova-organism-v1.jpg`;

function MemberNode({ room, index }: { room: CampfireRoom; index: number }) {
  const member = room.members[index];
  const role = room.proposal.roles.find((item) => item.agent_id === member.agent_id);
  return <article className={`camp-member ${member.confirmation}`}>
    <div className="camp-avatar">{member.display_name.slice(0, 1)}<i /></div>
    <div className="camp-member-copy"><span>{member.confirmation === "confirmed" ? "已确认" : member.confirmation === "declined" ? "已拒绝" : "等待确认"}</span><h3>{member.display_name}</h3><p>{member.building}</p><div>{member.skills.slice(0, 3).map((skill) => <b key={skill}>{skill}</b>)}</div></div>
    <aside><small>建议角色</small><strong>{role?.name ?? "MEMBER"}</strong><p>{role?.why}</p></aside>
  </article>;
}

function CampfireProposalView({ room, session, onConfirm }: { room: CampfireRoom; session: SessionData; onConfirm: (roomId: string) => void }) {
  const confirmed = confirmedCampfireCount(room);
  const ready = campfireReady(room);
  const me = room.members.find((member) => member.agent_id === session.agent_id);
  return <section className={`camp-proposal ${ready ? "formed" : ""}`}>
    <header className="camp-title"><div><span className="camp-live"><i />CAMPFIRE · {remainingTime(room.expires_at)}</span><p>{room.venue}</p></div><div className="camp-confirm-count"><strong>{confirmed}/{room.members.length}</strong><span>成员<br />已确认</span></div></header>
    <section className="proposal-hero"><div className="fire-mark generated"><img src={agentArtwork} alt="KIN agent group presence" /></div><div><p className="eyebrow">Agent 生成的组队建议</p><h1>{room.proposal.project_name}</h1><p className="proposal-line">{room.proposal.one_liner}</p></div></section>
    <section className="proposal-rationale"><p className="eyebrow">WHY THIS TEAM</p><h2>{room.proposal.rationale}</h2></section>
    <div className="section-heading"><span>PROPOSED 成员 & ROLES</span><b>{room.members.length}</b></div>
    <section className="camp-members">{room.members.map((_, index) => <MemberNode room={room} index={index} key={room.members[index].agent_id} />)}</section>
    <section className="camp-bottom"><div className="missing-card"><p className="eyebrow">还缺少</p><div>{room.proposal.missing.map((item) => <span key={item}>+ {item}</span>)}</div><p>Agent 会继续在 Radar 和 Experience Network 中寻找这些能力。</p></div><div className="camp-confirm-panel"><p className="eyebrow">{ready ? "小组已成立" : "你的决定"}</p><h2>{ready ? "所有成员已经确认。" : me?.confirmation === "confirmed" ? "你已确认，正在等待其他成员。" : "这只是提案，不是已经成立的团队。"}</h2><p>{ready ? "Agent 将为小队建立临时 Shared Context，并开始跟踪共同 Need。" : "每位成员只能代表自己确认。任何一人拒绝，Agent 都会重新组合方案。"}</p>{ready ? <div className="formed-chip"><i /> 共同背景已准备</div> : me?.confirmation === "confirmed" ? <div className="waiting-chip"><i /> {confirmed}/{room.members.length} 已确认</div> : <button className="button primary" onClick={() => onConfirm(room.id)}>确认我的角色 →</button>}</div></section>
  </section>;
}

export function CampfirePage({ session }: { session: SessionData }) {
  const [rooms, setRooms] = useState<CampfireRoom[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.campfires().then(setRooms).catch((reason) => setError(reason.message)); }, []);
  const proposalCount = useMemo(() => rooms?.filter((room) => room.proposal.status === "proposed").length ?? 0, [rooms]);
  if (error) return <div className="state-page"><h2>Campfire 暂时没有加载</h2><p>{error}</p></div>;
  if (!rooms) return <div className="loading-screen">Agent 正在寻找能互相补位的小队组合…</div>;
  async function confirm(roomId: string) {
    if (!rooms) return;
    const current = rooms.find((room) => room.id === roomId);
    if (!current) return;
    try {
      const updated = await api.confirmCampfire(current, session.agent_id);
      setRooms(rooms.map((room) => room.id === roomId ? updated : room));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Campfire 确认失败"); }
  }
  return <>
    <header className="topbar camp-topbar"><div><p className="eyebrow">临时协作小组</p><h1>不只是认识谁，而是一起做什么。</h1></div><div className="camp-status"><span>{proposalCount}</span><div><b>ACTIVE PROPOSAL</b><small>NO TEAM FORMS WITHOUT CONSENT</small></div></div></header>
    <main className="camp-page">
      <section className="camp-intro"><div><p className="eyebrow">MULTI-AGENT COMPOSITION</p><h2>Skills、Needs 和 Projects<br />组成一个可解释的提案。</h2></div><p>Campfire 不会自动把人拉进群。Agent 只提出角色与理由，成员逐一确认后，临时 Shared Context 才会成立。</p></section>
      {rooms.length ? rooms.map((room) => <CampfireProposalView key={room.id} room={room} session={session} onConfirm={confirm} />) : <section className="studio-empty camp-empty"><img src={agentArtwork} alt="" /><h3>暂时没有值得点燃的 Campfire。</h3><p>当三位以上 Builder 的能力和 Need 形成闭环时，Agent 会在这里提出小队建议。</p></section>}
    </main>
  </>;
}
