import { FormEvent, useEffect, useState } from "react";
import { api } from "./api";
import type { SignalItem, SignalKind } from "./types";

const kinds: SignalKind[] = ["NEED", "BUILDING", "SOLVED", "DISCOVERED", "AVAILABLE"];

export function SignalsPage() {
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
  return <><header className="topbar signal-topbar"><div><p className="eyebrow">BROADCAST / SIGNAL</p><h1>让 Agent 知道你此刻的状态。</h1></div><div className="signal-live"><i /> LIVE NETWORK</div></header><main className="signal-page">
    <form className="signal-composer" onSubmit={submit}><div className="signal-kinds">{kinds.map((value) => <button type="button" className={kind === value ? "active" : ""} onClick={() => setKind(value)} key={value}>{value}</button>)}</div><textarea value={statement} onChange={(event) => setStatement(event.target.value)} placeholder="正在做什么、需要什么，或者刚解决了什么？" /><footer><span>Agent 会把强相关 Signal 转成解释清楚的主动提醒。</span><button className="button primary" disabled={statement.trim().length < 3}>PUBLISH {kind} →</button></footer></form>
    {error && <p className="form-error">{error}</p>}
    <section className="signal-feed"><div className="section-heading"><span>ACTIVE SIGNALS</span><b>{items?.length ?? 0}</b></div>{items?.map((item) => <article className={`signal-card ${item.kind.toLowerCase()}`} key={item.id}><span>{item.kind}</span><h2>{item.statement}</h2><p>{item.owner_id === "agent_kin_01" ? "YOUR AGENT" : item.owner_id} · {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></article>)}</section>
  </main></>;
}
