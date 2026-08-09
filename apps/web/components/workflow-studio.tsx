"use client";

import { useMemo, useState } from "react";

type Status = "pending" | "running" | "completed" | "failed" | "paused" | "skipped";
type StepType = "llm_call" | "http_request" | "conditional_branch" | "approval_gate" | "db_write" | "notify";
type Step = { id: string; type: StepType; title: string; eyebrow: string; detail: string; status: Status; tone: string; config: string };

const initialSteps: Step[] = [
  { id: "s1", type: "llm_call", title: "Classify incoming signal", eyebrow: "01 · reasoning", detail: "Groq · llama-3.1-8b-instant", status: "completed", tone: "mint", config: "Classify this signal as approve or review." },
  { id: "s2", type: "http_request", title: "Enrich with signal context", eyebrow: "02 · fetch", detail: "GET · httpbin.org/json", status: "completed", tone: "blue", config: "https://httpbin.org/json" },
  { id: "s3", type: "conditional_branch", title: "Choose the right lane", eyebrow: "03 · branch", detail: "contains approve → fast-lane", status: "completed", tone: "violet", config: "contains approve" },
  { id: "s4", type: "approval_gate", title: "Team lead confirmation", eyebrow: "04 · human gate", detail: "Pauses until an owner or editor approves", status: "paused", tone: "coral", config: "A teammate must confirm the recommended lane." },
];

const typeMeta: Record<StepType, { icon: string; label: string; detail: string }> = {
  llm_call: { icon: "✦", label: "LLM call", detail: "Ask a model to reason over input" },
  http_request: { icon: "↗", label: "HTTP request", detail: "Call an HTTPS endpoint" },
  conditional_branch: { icon: "◇", label: "Conditional branch", detail: "Choose a constrained outcome" },
  approval_gate: { icon: "⌁", label: "Approval gate", detail: "Pause for a human decision" },
  db_write: { icon: "▣", label: "Database write", detail: "Save to an approved table" },
  notify: { icon: "◌", label: "Notify", detail: "Send a Slack or email alert" },
};

function StatusPill({ status }: { status: Status }) {
  const label = status === "paused" ? "Awaiting approval" : status;
  return <span className={`status status-${status}`}><span className="status-dot" />{label}</span>;
}

function Icon({ children }: { children: React.ReactNode }) { return <span className="icon" aria-hidden="true">{children}</span>; }

export default function WorkflowStudio() {
  const [steps, setSteps] = useState(initialSteps);
  const [selectedId, setSelectedId] = useState("s4");
  const [org, setOrg] = useState("Northstar Studio");
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<"builder" | "runs">("builder");
  const [toast, setToast] = useState("");
  const selected = steps.find((step) => step.id === selectedId) ?? steps[0];
  const completedCount = steps.filter((step) => step.status === "completed").length;
  const progress = Math.round((completedCount / steps.length) * 100);
  const runLabel = running ? "Running now" : "Run workflow";

  const activity = useMemo(() => [
    { time: "10:42:18", title: "Approval gate reached", body: "Team lead confirmation is waiting for a decision.", status: "paused" as Status },
    { time: "10:42:17", title: "Branch selected", body: "LLM output matched contains approve → fast-lane.", status: "completed" as Status },
    { time: "10:42:16", title: "Context enriched", body: "GET /json returned 200 in 218ms.", status: "completed" as Status },
  ], []);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2800); }
  function runWorkflow(source = "manual") {
    if (running) return;
    setRunning(true); setToast(source === "webhook" ? "Webhook accepted · run queued" : "Run queued · live updates connected");
    setSteps((current) => current.map((step, index) => ({ ...step, status: index === 0 ? "running" : "pending" })));
    window.setTimeout(() => setSteps((current) => current.map((step, index) => ({ ...step, status: index < 3 ? "completed" : index === 3 ? "paused" : "pending" }))), 1100);
    window.setTimeout(() => { setRunning(false); setSelectedId("s4"); }, 1450);
  }
  function approve() {
    setSteps((current) => current.map((step) => step.id === "s4" ? { ...step, status: "completed" } : step));
    notify("Approved by you · resuming from step 05");
  }
  function addStep(type: StepType) {
    const id = `s${Date.now()}`;
    setSteps((current) => [...current, { id, type, title: `New ${typeMeta[type].label.toLowerCase()}`, eyebrow: `${String(current.length + 1).padStart(2, "0")} · draft`, detail: typeMeta[type].detail, status: "pending", tone: type === "approval_gate" ? "coral" : "blue", config: "Configure this step" }]);
    setSelectedId(id); notify(`${typeMeta[type].label} added to the workflow`);
  }
  function move(direction: -1 | 1) {
    const index = steps.findIndex((step) => step.id === selectedId); const next = index + direction;
    if (index < 0 || next < 0 || next >= steps.length) return;
    const copy = [...steps]; [copy[index], copy[next]] = [copy[next], copy[index]]; setSteps(copy);
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span /><span /><span /></div><span>relay<span className="brand-soft">room</span></span></div>
      <div className="workspace-label">Workspace</div>
      <button className="org-switcher" onClick={() => setOrg(org === "Northstar Studio" ? "B-side Labs" : "Northstar Studio")}><span className="org-avatar">{org === "Northstar Studio" ? "N" : "B"}</span><span><b>{org}</b><small>{org === "Northstar Studio" ? "Owner" : "Viewer"}</small></span><span className="chevron">⌄</span></button>
      <nav className="nav"><button className="nav-item active"><Icon>⌘</Icon>Workflows<span className="nav-count">3</span></button><button className="nav-item"><Icon>◷</Icon>Run history</button><button className="nav-item"><Icon>⚙</Icon>Settings</button></nav>
      <div className="sidebar-bottom"><div className="quota-mini"><div><span>Monthly usage</span><b>12 <em>/ 50 runs</em></b></div><div className="mini-bar"><span style={{ width: "24%" }} /></div><small>38 runs remaining</small></div><div className="profile"><span className="profile-avatar">AR</span><span><b>Alex Rivera</b><small>alex@northstar.io</small></span><span className="more">•••</span></div></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div className="breadcrumbs"><span>Workflows</span><i>/</i><b>Signal triage</b></div><div className="top-actions"><span className="live-dot"><i />All systems operational</span><button className="help">?</button><button className="run-button" onClick={() => runWorkflow()}><span>{running ? "◌" : "▶"}</span>{runLabel}<kbd>⌘ ↵</kbd></button></div></header>
      <div className="content">
        <div className="workflow-heading"><div><div className="eyebrow">ACTIVE WORKFLOW <span>·</span> UPDATED 4M AGO</div><h1>Signal triage <button className="edit-title">⌕</button></h1><p>Classify, enrich, and route incoming signals with a human in the loop.</p></div><div className="heading-actions"><button className="secondary-button" onClick={() => runWorkflow("webhook")}><span>↗</span> Test webhook</button><button className="secondary-button" onClick={() => notify("Draft saved to Northstar Studio")}>Save changes</button><button className="dots">•••</button></div></div>
        <div className="tabs"><button className={view === "builder" ? "tab active" : "tab"} onClick={() => setView("builder")}>Builder <span>4</span></button><button className={view === "runs" ? "tab active" : "tab"} onClick={() => setView("runs")}>Runs <span>8</span></button><div className="tab-spacer" /><span className="autosave"><i />Saved just now</span></div>
        {view === "builder" ? <>
          <div className="signal-card"><div className="signal-card-copy"><div className="eyebrow mint-eyebrow">LIVE RUN · RUN-8C2A</div><h2>{progress === 100 ? "Run completed" : "Approval is the last signal"}</h2><p>Step updates stream in as the workflow moves. Approve the gate to let this run continue.</p><div className="run-meta"><StatusPill status={steps.some((s) => s.status === "paused") ? "paused" : "running"} /><span>Started today at 10:42:14</span><span>·</span><span>12.4s elapsed</span></div></div><div className="signal-orbit"><div className="orbit-ring ring-a" /><div className="orbit-ring ring-b" /><div className="orbit-core"><b>{completedCount}</b><small>of {steps.length}</small></div></div></div>
          <div className="builder-grid"><section className="steps-panel"><div className="section-head"><div><span className="section-kicker">EXECUTION PATH</span><h2>Workflow steps <span>{steps.length}</span></h2></div><button className="add-step" onClick={() => addStep("llm_call")}>+ Add step</button></div><div className="step-list">{steps.map((step, index) => <div className={`step-row ${selectedId === step.id ? "selected" : ""}`} key={step.id} onClick={() => setSelectedId(step.id)}><div className={`step-marker ${step.tone} ${step.status === "running" ? "is-running" : ""}`}><span>{typeMeta[step.type].icon}</span>{index < steps.length - 1 && <i />}</div><div className="step-main"><div className="step-topline"><span className="step-eyebrow">{step.eyebrow}</span><StatusPill status={step.status} /></div><h3>{step.title}</h3><p>{step.detail}</p></div><button className="row-menu" onClick={(event) => { event.stopPropagation(); setSelectedId(step.id); }}>•••</button></div>)}</div><div className="add-strip"><button onClick={() => addStep("http_request")}>+ Add next step</button><span>or drag to reorder</span></div></section><aside className="inspector"><div className="inspector-top"><div><span className="section-kicker">STEP {String(steps.findIndex((s) => s.id === selected?.id) + 1).padStart(2, "0")}</span><h2>{selected?.title ?? "Select a step"}</h2></div><button className="close-inspector">×</button></div><div className="type-chip"><span className={`chip-dot ${selected?.tone}`} />{selected ? typeMeta[selected.type].label : "Step"}<span className="lock">{selected?.type === "approval_gate" ? "◉" : ""}</span></div><label className="field-label">Configuration</label><div className="code-field">{selected?.config}</div><label className="field-label">On success</label><div className="select-field">Continue to next step <span>⌄</span></div>{selected?.type === "approval_gate" && <div className="approval-box"><div className="approval-icon">⌁</div><div><b>Approval required</b><p>Owners and editors in Northstar Studio can approve this gate.</p></div></div>}<div className="inspector-footer"><button className="ghost-button" onClick={() => move(-1)}>↑ Move up</button><button className="ghost-button" onClick={() => move(1)}>↓ Move down</button></div>{selected?.status === "paused" && <button className="approve-button" onClick={approve}>Approve &amp; continue <span>→</span></button>}</aside></div>
          <div className="bottom-grid"><section className="trigger-section"><div className="section-head"><div><span className="section-kicker">STARTING POINTS</span><h2>Triggers <span>4</span></h2></div><button className="small-link" onClick={() => notify("Trigger settings opened")}>Manage triggers →</button></div><div className="trigger-list"><div><span className="trigger-icon manual">▶</span><span><b>Manual run</b><small>Run from this workspace</small></span><em className="enabled">Enabled</em></div><div><span className="trigger-icon webhook">↗</span><span><b>Inbound webhook</b><small>/webhooks/northstar-signal</small></span><em className="enabled">Enabled</em></div><div><span className="trigger-icon schedule">◷</span><span><b>Hourly schedule</b><small>Every hour · 0 * * * *</small></span><em className="enabled">Enabled</em></div><div><span className="trigger-icon database">▣</span><span><b>New watched order</b><small>watched_orders · insert</small></span><em className="enabled">Enabled</em></div></div></section><section className="activity-section"><div className="section-head"><div><span className="section-kicker">OBSERVABILITY</span><h2>Latest activity</h2></div><button className="small-link" onClick={() => setView("runs")}>View all →</button></div><div className="activity-list">{activity.map((item) => <div className="activity-item" key={item.time}><span className={`activity-line ${item.status}`} /><time>{item.time}</time><div><b>{item.title}</b><p>{item.body}</p></div></div>)}</div></section></div>
        </> : <div className="runs-view"><div className="runs-summary"><div><span className="section-kicker">RUN HISTORY</span><h2>Every signal, accounted for.</h2><p>Live and past executions stay scoped to your organization.</p></div><span className="run-count">8 total runs</span></div>{["RUN-8C2A", "RUN-7F11", "RUN-6B08", "RUN-5D20"].map((run, index) => <div className="run-row" key={run}><span className={`run-status-dot ${index === 0 ? "paused" : "completed"}`} /><b>{run}</b><span>{index === 0 ? "Awaiting approval" : "Completed"}</span><small>{index === 0 ? "Just now" : `${index + 1}h ago`}</small><span>Manual</span><button>Inspect →</button></div>)}</div>}
      </div>
    </section>
    {toast && <div className="toast"><span>✓</span>{toast}</div>}
  </main>;
}
