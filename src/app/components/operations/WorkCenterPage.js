"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  ClipboardList,
  ListTodo,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";

const VIEWS = ["Agenda", "Day", "Week", "Month", "Timeline", "Team Workload"];
const STATUS_LABELS = {
  DRAFT: "Draft",
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  WAITING_CUSTOMER: "Waiting Customer",
  WAITING_INSURANCE_COMPANY: "Waiting Insurance Company",
  WAITING_DOCUMENTS: "Waiting Documents",
  ESCALATED: "Escalated",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  CLOSED: "Closed",
};

export default function WorkCenterPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("Agenda");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/work-center", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(getUserFacingErrorMessage(payload.error, "Work center could not be loaded. Please try again."));
      }
      setData(payload);
    } catch (err) {
      setError(getUserFacingErrorMessage(err, "Work center could not be loaded. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const tasks = useMemo(() => {
    const allTasks = data?.tasks || [];
    if (filter === "all") return allTasks;
    if (filter === "today") return allTasks.filter((task) => task.dueAt && isToday(task.dueAt));
    if (filter === "upcoming")
      return allTasks.filter((task) => task.dueAt && new Date(task.dueAt) > endOfToday());
    if (filter === "overdue")
      return allTasks.filter((task) => task.dueAt && new Date(task.dueAt) < startOfToday());
    if (filter === "high-priority")
      return allTasks.filter((task) => ["HIGH", "CRITICAL", "EMERGENCY"].includes(task.priority));
    if (filter === "claims-pending") return allTasks.filter((task) => task.type === "CLAIM");
    if (filter === "endorsements-pending") return allTasks.filter((task) => task.type === "ENDORSEMENT");
    if (filter === "service-requests-pending")
      return allTasks.filter((task) => task.type === "SERVICE_REQUEST");
    if (filter === "collections-pending") return allTasks.filter((task) => task.type === "COLLECTION");
    if (filter === "followups-pending")
      return allTasks.filter((task) => ["FOLLOW_UP", "CALL"].includes(task.type));
    if (filter === "renewals-today")
      return allTasks.filter((task) => task.type === "RENEWAL" && task.dueAt && isToday(task.dueAt));
    if (filter === "meetings-today")
      return allTasks.filter((task) => task.type === "MEETING" && task.dueAt && isToday(task.dueAt));
    return allTasks.filter((task) => task.type === filter.toUpperCase());
  }, [data, filter]);

  const completeTask = async (taskId) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    if (response.ok) load();
  };

  return (
    <div className="work-center-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Operations Command Center</p>
          <h1>Calendar & Work Center</h1>
          <p className="page-subtitle">
            Tasks, renewals, approvals, escalations, reminders, and activity across your organization.
          </p>
        </div>
        <button className="secondary-action" type="button" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <section className="work-summary-grid">
        {(data?.summaryCards || []).map((card) => (
          <button
            key={card.key}
            className="work-summary-card"
            type="button"
            onClick={() => setFilter(card.key)}
          >
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </button>
        ))}
        {loading && !data
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="work-summary-card skeleton-card" />
            ))
          : null}
      </section>

      <div className="work-layout">
        <section className="work-main-panel">
          <div className="work-toolbar">
            <div className="segmented-control">
              {VIEWS.map((view) => (
                <button
                  key={view}
                  className={activeView === view ? "active" : ""}
                  type="button"
                  onClick={() => setActiveView(view)}
                >
                  {view}
                </button>
              ))}
            </div>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Task filter"
            >
              <option value="all">All Tasks</option>
              <option value="overdue">Overdue</option>
              <option value="high-priority">High Priority</option>
              <option value="renewal">Renewals</option>
              <option value="claim">Claims</option>
              <option value="endorsement">Endorsements</option>
              <option value="follow_up">Follow-Ups</option>
            </select>
          </div>

          {activeView === "Team Workload" ? (
            <TeamWorkload rows={data?.teamWorkload || []} />
          ) : activeView === "Timeline" ? (
            <Timeline events={data?.events || []} tasks={tasks} />
          ) : (
            <TaskList tasks={tasks} onComplete={completeTask} onUpdated={load} loading={loading} />
          )}
        </section>

        <aside className="work-side-panel">
          <Panel title="Approvals" icon={<ShieldCheck size={17} />}>
            <CompactList
              rows={data?.approvals || []}
              empty="No pending approvals."
              render={(item) => (
                <>
                  <strong>{item.title}</strong>
                  <span>{item.approvalType}</span>
                </>
              )}
            />
          </Panel>

          <Panel title="Escalations" icon={<AlertTriangle size={17} />}>
            <CompactList
              rows={data?.escalations || []}
              empty="No open escalations."
              render={(item) => (
                <>
                  <strong>{item.reason}</strong>
                  <span>{item.module}</span>
                </>
              )}
            />
          </Panel>

          <Panel title="Activity Feed" icon={<Bell size={17} />}>
            <CompactList
              rows={data?.activities || []}
              empty="No activity logged yet."
              render={(item) => (
                <>
                  <strong>{item.action}</strong>
                  <span>{item.recordLabel || item.module}</span>
                </>
              )}
            />
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function TaskList({ tasks, onComplete, onUpdated, loading }) {
  const [quoteTask, setQuoteTask] = useState(null);
  const [quoteForm, setQuoteForm] = useState({ quoteAmount: "", quoteNote: "", paymentLink: "" });
  const [quoteError, setQuoteError] = useState("");
  const [savingQuote, setSavingQuote] = useState(false);

  const openQuote = (task) => {
    setQuoteTask(task);
    setQuoteForm({
      quoteAmount: task.amount || "",
      quoteNote: task.metadata?.quoteNote || "",
      paymentLink: task.metadata?.paymentLink || "",
    });
    setQuoteError("");
  };

  const saveQuote = async (event) => {
    event.preventDefault();
    setSavingQuote(true);
    setQuoteError("");
    try {
      const response = await fetch(`/api/tasks/${quoteTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quoteForm),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Quotation could not be updated.");
      setQuoteTask(null);
      onUpdated?.();
    } catch (error) {
      setQuoteError(error.message);
    } finally {
      setSavingQuote(false);
    }
  };

  if (loading && tasks.length === 0) {
    return <div className="work-empty">Loading live work items...</div>;
  }
  if (tasks.length === 0) {
    return <div className="work-empty">No database-backed tasks match this view.</div>;
  }

  return (
    <>
    <div className="task-list">
      {tasks.map((task) => (
        <article key={task.id} className={`task-row priority-${String(task.priority).toLowerCase()}`}>
          <div className="task-icon">
            <ListTodo size={18} />
          </div>
          <div className="task-body">
            <div className="task-title-line">
              <h3>{task.title}</h3>
              <span className="status-pill compact">{STATUS_LABELS[task.status] || task.status}</span>
            </div>
            <p>{task.description || task.module}</p>
            <div className="task-meta">
              <span>
                <ClipboardList size={13} />
                {task.type.replaceAll("_", " ")}
              </span>
              <span>
                <Clock size={13} />
                {formatDateTime(task.dueAt)}
              </span>
              <span>{task.priority}</span>
              {task.customerName ? <span>{task.customerName}</span> : null}
              {task.metadata?.paymentRequested ? <span className="font-bold text-amber-700">Payment link requested</span> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
          {["NEW_POLICY_QUOTE", "RENEWAL_QUOTE"].includes(task.metadata?.requestType) ? (
            <button type="button" onClick={() => openQuote(task)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              Update quote
            </button>
          ) : null}
          <button
            className="icon-action"
            type="button"
            onClick={() => onComplete(task.id)}
            aria-label="Complete task"
          >
            <CheckCircle2 size={19} />
          </button>
          </div>
        </article>
      ))}
    </div>
    {quoteTask ? (
      <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
        <form onSubmit={saveQuote} className="w-full max-w-lg rounded-3xl border border-white/60 bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Client quotation</p><h2 className="mt-1 text-xl font-bold text-slate-900">{quoteTask.customerName || "Client"}</h2><p className="mt-1 text-xs text-slate-500">{quoteTask.policyNumber || "New policy request"}</p></div>
            <button type="button" onClick={() => setQuoteTask(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-600">×</button>
          </div>
          {quoteError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">{quoteError}</div> : null}
          <div className="mt-5 space-y-4">
            <label className="block text-xs font-bold text-slate-600">Quotation amount
              <input type="number" min="1" step="0.01" required value={quoteForm.quoteAmount} onChange={(event) => setQuoteForm({ ...quoteForm, quoteAmount: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" placeholder="Premium amount" />
            </label>
            <label className="block text-xs font-bold text-slate-600">Agent note
              <textarea value={quoteForm.quoteNote} onChange={(event) => setQuoteForm({ ...quoteForm, quoteNote: event.target.value })} className="mt-1.5 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Coverage summary, insurer, validity, or next steps" />
            </label>
            <label className="block text-xs font-bold text-slate-600">Secure payment link <span className="font-normal text-slate-400">(add only after client requests it)</span>
              <input type="url" value={quoteForm.paymentLink} onChange={(event) => setQuoteForm({ ...quoteForm, paymentLink: event.target.value })} disabled={!quoteTask.metadata?.paymentRequested} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100" placeholder={quoteTask.metadata?.paymentRequested ? "https://..." : "Waiting for client request"} />
            </label>
            {quoteTask.metadata?.paymentRequested ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700">The client has requested a payment link for this quotation.</p> : null}
          </div>
          <button disabled={savingQuote} className="mt-5 h-11 w-full rounded-xl bg-emerald-600 text-sm font-bold !text-white force-white disabled:opacity-50">{savingQuote ? "Saving..." : "Publish quotation to client"}</button>
        </form>
      </div>
    ) : null}
    </>
  );
}

function Timeline({ events, tasks }) {
  const rows = [
    ...events.map((event) => ({
      id: `event-${event.id}`,
      title: event.title,
      label: event.eventType,
      at: event.startsAt,
    })),
    ...tasks.map((task) => ({ id: `task-${task.id}`, title: task.title, label: task.type, at: task.dueAt })),
  ]
    .filter((row) => row.at)
    .sort((a, b) => new Date(a.at) - new Date(b.at))
    .slice(0, 40);

  if (!rows.length) return <div className="work-empty">No dated calendar items are available.</div>;

  return (
    <div className="timeline-list">
      {rows.map((row) => (
        <div key={row.id} className="timeline-row">
          <span className="timeline-dot" />
          <time>{formatDateTime(row.at)}</time>
          <strong>{row.title}</strong>
          <small>{row.label.replaceAll("_", " ")}</small>
        </div>
      ))}
    </div>
  );
}

function TeamWorkload({ rows }) {
  if (!rows.length) return <div className="work-empty">No team members found for this organization.</div>;

  return (
    <div className="team-table">
      <div className="team-row team-head">
        <span>User</span>
        <span>Pending</span>
        <span>Completed</span>
        <span>Overdue</span>
        <span>Workload</span>
      </div>
      {rows.map((row) => (
        <div key={row.userId} className="team-row">
          <span>
            <Users size={14} />
            {row.user}
          </span>
          <strong>{row.pendingTasks}</strong>
          <strong>{row.completedTasks}</strong>
          <strong>{row.overdueTasks}</strong>
          <strong>{row.currentWorkload}</strong>
        </div>
      ))}
    </div>
  );
}

function Panel({ title, icon, children }) {
  return (
    <section className="work-panel-block">
      <h2>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function CompactList({ rows, empty, render }) {
  if (!rows.length) return <p className="compact-empty">{empty}</p>;
  return (
    <div className="compact-list">
      {rows.map((row) => (
        <div key={row.id} className="compact-row">
          {render(row)}
        </div>
      ))}
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

function isToday(value) {
  const date = new Date(value);
  const today = startOfToday();
  return date >= today && date <= endOfToday();
}
