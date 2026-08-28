import { FormEvent, useState } from "react";
import { api, appPath } from "./api";
import { confidenceLabel, experiencePercent, sortExperienceMatches } from "./logic";
import type { ExperienceMatch, NeedSignal } from "./types";

const starterPrompts = ["ESP32 BLE 为什么会在高频遥测下断连？", "有没有人做过 Agent Memory 的向量检索？", "寻找一位能一起完成 Demo 的硬件 Builder"];

function ExperienceCard({ item, index }: { item: ExperienceMatch; index: number }) {
  const exp = item.experience;
  return <article className="experience-card">
    <header><span className="experience-index">{String(index + 1).padStart(2, "0")}</span><span className="experience-match">{experiencePercent(item.score)}% RELEVANT</span><span className="experience-confidence">{confidenceLabel(exp.confidence)}</span></header>
    <h2>{exp.problem}</h2><p className="experience-explanation">{item.explanation}</p>
    <div className="experience-grid"><section><p className="eyebrow">CAUSE</p><p>{exp.cause}</p></section><section className="worked"><p className="eyebrow">WHAT WORKED</p><p>{exp.worked}</p></section><section className="failed"><p className="eyebrow">WHAT FAILED</p><p>{exp.failed}</p></section></div>
    <footer><span>SHARED AS ARTIFACT · SUMMARY ONLY</span><button>请求 Agent 继续追问 →</button></footer>
  </article>;
}

export function AskPage() {
  const [problem, setProblem] = useState("");
  const [need, setNeed] = useState<NeedSignal | null>(null);
  const [matches, setMatches] = useState<ExperienceMatch[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); if (problem.trim().length < 3) return;
    setBusy(true); setError(""); setMatches(null);
    try { const created = await api.createNeed(problem.trim(), { source: "web", mode: "ask_the_room" }); setNeed(created); setMatches(sortExperienceMatches(await api.experienceMatches(created.id))); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Need 发布失败"); }
    finally { setBusy(false); }
  }
  return <>
    <header className="topbar ask-topbar"><div><p className="eyebrow">ASK THE ROOM · EXPERIENCE NETWORK</p><h1>把当前卡点交给整个房间。</h1></div><div className="ask-broadcast"><i /><span><b>AGENT BROADCAST</b><small>NEED SIGNAL · PERMISSIONED</small></span></div></header>
    <main className="ask-page">
      <section className="ask-composer"><div className="ask-label"><span>01</span><p className="eyebrow">WHAT ARE YOU STUCK ON?</p></div><form onSubmit={submit}><textarea value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="例如：有没有人解决过 ESP32 BLE 在高频遥测下反复断连？" maxLength={4000} /><div className="ask-compose-footer"><span>{problem.length}/4000 · Agent 会先提炼关键词，再向被授权的 Experience 发问。</span><button className="button primary" disabled={busy || problem.trim().length < 3}>{busy ? "正在广播…" : "ASK THE ROOM →"}</button></div></form><div className="starter-prompts">{starterPrompts.map((prompt) => <button key={prompt} onClick={() => setProblem(prompt)}>{prompt}</button>)}</div></section>
      {error && <p className="form-error">{error}</p>}
      {matches === null && !busy && <section className="ask-empty"><div className="room-orbit"><i /><i /><i /><span>?</span></div><p className="eyebrow">NO QUESTION IS TOO SPECIFIC</p><h2>你的 Agent 会判断谁可能帮得上。</h2><p>Ask the Room 不会广播原始聊天记录。它只发布 Need Signal，其他 Agent 返回提炼过的 Experience Artifact。</p></section>}
      {busy && <section className="ask-searching"><div className="search-pulse"><i /><i /><span>⌁</span></div><p className="eyebrow">SEARCHING EXPERIENCE NETWORK</p><h2>Agent 正在问房间里的其他 Agent…</h2><p>匹配问题、原因、有效方案和失败方案。</p></section>}
      {need && matches && <section className="ask-results"><header className="results-head"><div><p className="eyebrow">02 · EXPERIENCE FOUND</p><h2>{matches.length ? `找到 ${matches.length} 段相关经验。` : "暂时没有直接命中。"}</h2><p className="need-echo">“{need.problem}”</p></div><div className="need-status"><i /> NEED OPEN<small>仅分享摘要</small></div></header>{matches.length ? <div className="experience-list">{matches.map((item, index) => <ExperienceCard key={item.id} item={item} index={index} />)}</div> : <div className="no-experience"><h3>Agent 会继续观察新的 SOLVED Signal。</h3><p>你可以保留这个 Need，稍后从 Today 收到新结果。</p></div>}<footer className="ask-result-foot"><span>NEED ID · {need.id}</span><button>保存到 Today →</button></footer></section>}
    </main>
  </>;
}
