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
  Users
} from "lucide-react";

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
  CLOSED: "Closed"
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
      if (!response.ok || !payload.success) throw new Error(payload.error || "Work center failed to load.");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Work center failed to load.");
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
    if (filter === "upcoming") return allTasks.filter((task) => task.dueAt && new Date(task.dueAt) > endOfToday());
    if (filter === "overdue") return allTasks.filter((task) => task.dueAt && new Date(task.dueAt) < startOfToday());
    if (filter === "high-priority") return allTasks.filter((task) => ["HIGH", "CRITICAL", "EMERGENCY"].includes(task.priority));
    if (filter === "claims-pending") return allTasks.filter((task) => task.type === "CLAIM");
    if (filter === "endorsements-pending") return allTasks.filter((task) => task.type === "ENDORSEMENT");
    if (filter === "service-requests-pending") return allTasks.filter((task) => task.type === "SERVICE_REQUEST");
    if (filter === "collections-pending") return allTasks.filter((task) => task.type === "COLLECTION");
    if (filter === "followups-pending") return allTasks.filter((task) => ["FOLLOW_UP", "CALL"].includes(task.type));
    if (filter === "renewals-today") return allTasks.filter((task) => task.type === "RENEWAL" && task.dueAt && isToday(task.dueAt));
    if (filter === "meetings-today") return allTasks.filter((task) => task.type === "MEETING" && task.dueAt && isToday(task.dueAt));
    return allTasks.filter((task) => task.type === filter.toUpperCase());
  }, [data, filter]);

  const completeTask = async (taskId) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" })
    });
    if (response.ok) load();
  };

  return (
    <div className="work-center-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Operations Command Center</p>
          <h1>Calendar & Work Center</h1>
          <p className="page-subtitle">Tasks, renewals, approvals, escalations, reminders, and activity across your organization.</p>
        </div>
        <button className="secondary-action" type="button" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <section className="work-summary-grid">
        {(data?.summaryCards || []).map((card) => (
          <button key={card.key} className="work-summary-card" type="button" onClick={() => setFilter(card.key)}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </button>
        ))}
        {loading && !data ? Array.from({ length: 6 }).map((_, index) => <div key={index} className="work-summary-card skeleton-card" />) : null}
      </section>

      <div className="work-layout">
        <section className="work-main-panel">
          <div className="work-toolbar">
            <div className="segmented-control">
              {VIEWS.map((view) => (
                <button key={view} className={activeView === view ? "active" : ""} type="button" onClick={() => setActiveView(view)}>
                  {view}
                </button>
              ))}
            </div>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Task filter">
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
            <TaskList tasks={tasks} onComplete={completeTask} loading={loading} />
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

function TaskList({ tasks, onComplete, loading }) {
  if (loading && tasks.length === 0) {
    return <div className="work-empty">Loading live work items...</div>;
  }
  if (tasks.length === 0) {
    return <div className="work-empty">No database-backed tasks match this view.</div>;
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <article key={task.id} className={`task-row priority-${String(task.priority).toLowerCase()}`}>
          <div className="task-icon"><ListTodo size={18} /></div>
          <div className="task-body">
            <div className="task-title-line">
              <h3>{task.title}</h3>
              <span className="status-pill compact">{STATUS_LABELS[task.status] || task.status}</span>
            </div>
            <p>{task.description || task.module}</p>
            <div className="task-meta">
              <span><ClipboardList size={13} />{task.type.replaceAll("_", " ")}</span>
              <span><Clock size={13} />{formatDateTime(task.dueAt)}</span>
              <span>{task.priority}</span>
              {task.customerName ? <span>{task.customerName}</span> : null}
            </div>
          </div>
          <button className="icon-action" type="button" onClick={() => onComplete(task.id)} aria-label="Complete task">
            <CheckCircle2 size={19} />
          </button>
        </article>
      ))}
    </div>
  );
}

function Timeline({ events, tasks }) {
  const rows = [
    ...events.map((event) => ({ id: `event-${event.id}`, title: event.title, label: event.eventType, at: event.startsAt })),
    ...tasks.map((task) => ({ id: `task-${task.id}`, title: task.title, label: task.type, at: task.dueAt }))
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
          <span><Users size={14} />{row.user}</span>
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
      <h2>{icon}{title}</h2>
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
    minute: "2-digit"
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
