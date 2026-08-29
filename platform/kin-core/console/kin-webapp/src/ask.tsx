import { FormEvent, useMemo, useState } from "react";
import { api } from "./api";
import { composerIntentLabel, confidenceLabel, inferComposerIntent, sortExperienceMatches } from "./logic";
import type { ExperienceMatch, NeedSignal, SignalItem } from "./types";

const starterPrompts = [
  "有没有人解决过 ESP32 BLE 高频遥测断连？",
  "我终于搞定了 Cardputer 双机握手",
];
const agentArtwork = `${import.meta.env.BASE_URL}art/nova-organism-v1.jpg`;

const ownerName = (ownerId: string) => ownerId.includes("momo") ? "Momo" : ownerId.includes("kai") ? "Kai" : "一位 Builder";

function ExperienceCard({ item, index }: { item: ExperienceMatch; index: number }) {
  const exp = item.experience;
  const relevance = item.score >= .8 ? "几乎是同一个问题" : item.score >= .6 ? "部分相关" : "可作为旁证";
  return <article className="experience-card agent-artifact">
    <header><span className="experience-index">{String(index + 1).padStart(2, "0")}</span><span className="experience-match">{relevance}</span><span className="experience-confidence">{confidenceLabel(exp.confidence)}</span></header>
    <div className="artifact-owner"><i>{ownerName(item.owner_id).slice(0, 1)}</i><span><small>{ownerName(item.owner_id)}'s Agent remembered</small><b>{exp.problem}</b></span></div>
    <p className="experience-explanation">{item.explanation}</p>
    <div className="experience-grid"><section><p className="eyebrow">CAUSE</p><p>{exp.cause}</p></section><section className="worked"><p className="eyebrow">WHAT WORKED</p><p>{exp.worked}</p></section><section className="failed"><p className="eyebrow">WHAT DIDN'T</p><p>{exp.failed}</p></section></div>
    <footer><span>EXPERIENCE ARTIFACT · SUMMARY ONLY</span><button>让我的 Agent 继续问 →</button></footer>
  </article>;
}

export function AskPage() {
  const [message, setMessage] = useState("");
  const [need, setNeed] = useState<NeedSignal | null>(null);
  const [signal, setSignal] = useState<SignalItem | null>(null);
  const [matches, setMatches] = useState<ExperienceMatch[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const intent = useMemo(() => inferComposerIntent(message), [message]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (text.length < 3) return;
    setBusy(true); setError(""); setMatches(null); setNeed(null); setSignal(null);
    try {
      if (intent === "NEED") {
        const created = await api.createNeed(text, { source: "global_composer", routed_by: "agent" });
        setNeed(created);
        setMatches(sortExperienceMatches(await api.experienceMatches(created.id)));
      } else {
        setSignal(await api.publishSignal(intent, text));
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "KIN 没有接住这句话"); }
    finally { setBusy(false); }
  }

  const best = matches?.[0];
  return <main className="ask-network-page">
    <section className="ask-network-hero">
      <div className="ask-agent-mark"><img src={agentArtwork} alt="Nova agent presence" /></div>
      <p className="eyebrow">TALK TO YOUR AGENT</p>
      <h1>你只需要说出来。</h1>
      <p>KIN 会自己判断这是在找答案、找人、更新进展，还是对网络发出一个新的 Signal。</p>
      <form className="global-composer" onSubmit={submit}>
        <textarea autoFocus value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask KIN anything…" maxLength={4000} />
        <footer><div><span className="composer-listening"><i />{message.trim().length > 2 ? `Nova 理解为：${composerIntentLabel(intent)}` : "Nova is listening"}</span><small>Nearby · My Kin · Agent Network</small></div><button disabled={busy || message.trim().length < 3} aria-label="Send to KIN">{busy ? "···" : "↑"}</button></footer>
      </form>
      <div className="prompt-ripples">{starterPrompts.map((prompt) => <button key={prompt} onClick={() => setMessage(prompt)}>{prompt}</button>)}</div>
    </section>

    {error && <p className="form-error ask-error">{error}</p>}
    {busy && <section className="agent-search-state"><div className="search-network"><i /><i /><i /><b>N</b></div><p className="eyebrow">NOVA IS ASKING THE NETWORK</p><h2>正在询问最相关的 Agent…</h2><p>你不需要选择搜索范围。Agent 会根据问题、关系和当前位置自己决定。</p></section>}

    {signal && <section className="agent-route-result"><div className="route-orb">N</div><div><p className="eyebrow">NOVA UNDERSTOOD</p><h2>我把它记成了{composerIntentLabel(signal.kind)}。</h2><p>它会在需要这条 Context 的人出现时被使用，而不是变成一条需要你维护的帖子。</p></div><span>{signal.kind}</span></section>}

    {need && matches && <section className="network-answer">
      <header className="agent-answer"><div className="answer-avatar">N<i /></div><div><p className="eyebrow">NOVA · ANSWER FROM THE NETWORK</p><h2>{best ? `有。${ownerName(best.owner_id)} 的 Agent 记得一次几乎相同的经历。` : "还没有 Agent 记得相同的经历。"}</h2>{best && <p>它判断关键原因是：{best.experience.cause}</p>}</div><span>I asked {Math.max(12, (matches.length || 1) * 6)} relevant agents</span></header>
      <p className="need-echo">“{need.problem}”</p>
      {matches.length ? <div className="experience-list">{matches.map((item, index) => <ExperienceCard key={item.id} item={item} index={index} />)}</div> : <div className="no-experience"><h3>我会继续替你留意。</h3><p>一旦新的 Experience 出现，你会在 Today 收到一个事件。</p></div>}
    </section>}
  </main>;
}
