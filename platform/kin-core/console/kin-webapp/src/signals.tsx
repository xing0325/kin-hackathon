import { FormEvent, useEffect, useState } from "react";
import { api } from "./api";
import type { SignalItem, SignalKind } from "./types";

const kinds: SignalKind[] = ["NEED", "BUILDING", "SOLVED", "DISCOVERED", "AVAILABLE"];

export function SignalsContent() {
  const [items, setItems] = useState<SignalItem[] | null>(null);
  const [kind, setKind] = useState<SignalKind>("BUILDING");
  const [statement, setStatement] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { api.signals().then(setItems).catch((reason) => setError(reason.message)); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try { const created = await api.publishSignal(kind, statement.trim()); setItems((current) => [created, ...(current ?? [])]); setStatement(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Signal 发布失败"); }
  }
  return <main className="signal-page embedded-signal-page">
    <form className="signal-composer" onSubmit={submit}><div className="signal-kinds">{kinds.map((value) => <button type="button" className={kind === value ? "active" : ""} onClick={() => setKind(value)} key={value}>{value}</button>)}</div><textarea value={statement} onChange={(event) => setStatement(event.target.value)} placeholder="正在做什么、需要什么，或者刚解决了什么？" /><footer><span>Agent 会把强相关 Signal 转成解释清楚的主动提醒。</span><button className="button primary" disabled={statement.trim().length < 3}>发布 {kind} →</button></footer></form>
    {error && <p className="form-error">{error}</p>}
    <section className="signal-feed"><div className="section-heading"><span>进行中的动态</span><b>{items?.length ?? 0}</b></div>{items?.map((item) => <article className={`signal-card ${item.kind.toLowerCase()}`} key={item.id}><span>{item.kind}</span><h2>{item.statement}</h2><p>{item.owner_id === "agent_kin_01" ? "你的 Agent" : item.owner_id} · {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></article>)}</section>
  </main>;
}

export function SignalsPage() {
  return <><header className="topbar signal-topbar"><div><p className="eyebrow">动态与求助</p><h1>发布近况，或者向网络求助。</h1></div></header><SignalsContent /></>;
}
