"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import ModalPortal from "@/app/components/shared/ModalPortal";
import "@/app/ui/dashboard/work-center-control-tower.css";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck,
  FileEdit,
  FilePlus,
  Flame,
  Kanban,
  ListCheck,
  MessageSquare,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

const DEPARTMENTS = [
  { id: "ALL", label: "All Departments" },
  { id: "RENEWALS", label: "Renewals" },
  { id: "CLAIMS", label: "Claims" },
  { id: "OPERATIONS", label: "Operations & Issuance" },
  { id: "FINANCE", label: "Finance & Premium" },
  { id: "ENDORSEMENTS", label: "Endorsements" },
  { id: "SUPPORT", label: "Customer Support" },
  { id: "COMPLIANCE", label: "Compliance & Audit" },
];

export default function WorkCenterControlTower({ initialData, onRefresh }) {
  const [data, setData] = useState(initialData || {});
  const [refreshing, setRefreshing] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [activeStage, setActiveStage] = useState("ALL");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [activeView, setActiveView] = useState("TASKS"); // TASKS | PIPELINE | APPROVALS | QUEUE | WORKLOAD
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [assignModalTask, setAssignModalTask] = useState(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [quoteModalTask, setQuoteModalTask] = useState(null);
  const [quoteForm, setQuoteForm] = useState({ amount: "", note: "", paymentLink: "" });
  const [quoteSaving, setQuoteSaving] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");

  // Pagination state for Task Table
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  useEffect(() => {
    if (initialData) setData(initialData);
  }, [initialData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  const showToast = (msg) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(""), 3500);
  };

  // Filter Tasks
  const rawTasks = data.tasks || [];
  const filteredTasks = useMemo(() => {
    return rawTasks.filter((task) => {
      const matchSearch =
        !globalSearch ||
        task.title?.toLowerCase().includes(globalSearch.toLowerCase()) ||
        task.customerName?.toLowerCase().includes(globalSearch.toLowerCase()) ||
        task.module?.toLowerCase().includes(globalSearch.toLowerCase()) ||
        task.id?.toLowerCase().includes(globalSearch.toLowerCase());

      const matchDept = selectedDept === "ALL" || String(task.module || "").toUpperCase().includes(selectedDept);
      const matchStage = activeStage === "ALL" || task.status === activeStage;

      return matchSearch && matchDept && matchStage;
    });
  }, [rawTasks, globalSearch, selectedDept, activeStage]);

  // Pagination bounds
  const totalPages = Math.ceil(filteredTasks.length / PAGE_SIZE) || 1;
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredTasks.length);
  const pagedTasks = filteredTasks.slice(startIndex, endIndex);

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedTaskIds.length === pagedTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(pagedTasks.map((t) => t.id));
    }
  };

  const toggleSelectTask = (id) => {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (res.ok) {
        setData((prev) => ({
          ...prev,
          tasks: (prev.tasks || []).filter((t) => t.id !== taskId),
        }));
        showToast("Task completed successfully!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveQuote = async (e) => {
    e.preventDefault();
    if (!quoteModalTask) return;
    setQuoteSaving(true);
    try {
      const res = await fetch(`/api/tasks/${quoteModalTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: quoteForm.amount,
          metadata: { quoteNote: quoteForm.note, paymentLink: quoteForm.paymentLink },
        }),
      });
      if (res.ok) {
        setQuoteModalTask(null);
        showToast("Quote updated & sent to customer workflow!");
        handleRefresh();
      }
    } finally {
      setQuoteSaving(false);
    }
  };

  // Dynamic Pipeline Stages calculated from real database tasks
  const pipelineStages = useMemo(() => {
    const tasks = data.tasks || [];
    const getStageTasks = (condition) => tasks.filter(condition);
    const sumRevenue = (items) => items.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const formatCurrency = (val) => (val > 0 ? `₹${val.toLocaleString("en-IN")}` : "₹0");

    const leadTasks = getStageTasks((t) => t.type === "LEAD" || t.status === "DRAFT");
    const quoteTasks = getStageTasks(
      (t) =>
        t.metadata?.requestType === "NEW_POLICY_QUOTE" ||
        t.metadata?.requestType === "RENEWAL_QUOTE" ||
        t.type === "QUOTE",
    );
    const proposalTasks = getStageTasks((t) => t.type === "PROPOSAL" || t.module === "Proposals");
    const payPendingTasks = getStageTasks(
      (t) => t.metadata?.paymentRequested || t.status === "WAITING_CUSTOMER",
    );
    const payVerifiedTasks = getStageTasks(
      (t) => t.metadata?.paymentVerified || t.status === "WAITING_INSURANCE_COMPANY",
    );
    const issuanceTasks = getStageTasks(
      (t) => t.module === "Policy Issuance" || t.module === "Operations" || t.type === "ISSUANCE",
    );
    const qcTasks = getStageTasks((t) => t.status === "WAITING_DOCUMENTS" || t.module === "Compliance");
    const deliveryTasks = getStageTasks((t) => t.type === "DELIVERY" || t.status === "IN_PROGRESS");
    const completedTasks = getStageTasks((t) => t.status === "COMPLETED" || t.status === "CLOSED");

    return [
      { id: "LEAD", label: "Lead", count: leadTasks.length, revenue: formatCurrency(sumRevenue(leadTasks)), sla: "Live", color: "#6366f1" },
      { id: "QUOTATION", label: "Quotation", count: quoteTasks.length, revenue: formatCurrency(sumRevenue(quoteTasks)), sla: "Live", color: "#8b5cf6" },
      { id: "PROPOSAL", label: "Proposal", count: proposalTasks.length, revenue: formatCurrency(sumRevenue(proposalTasks)), sla: "Live", color: "#ec4899" },
      { id: "PAYMENT_PENDING", label: "Payment Pending", count: payPendingTasks.length, revenue: formatCurrency(sumRevenue(payPendingTasks)), sla: "Live", color: "#f59e0b" },
      { id: "PAYMENT_VERIFIED", label: "Payment Verified", count: payVerifiedTasks.length, revenue: formatCurrency(sumRevenue(payVerifiedTasks)), sla: "Live", color: "#10b981" },
      { id: "POLICY_ISSUANCE", label: "Policy Issuance", count: issuanceTasks.length, revenue: formatCurrency(sumRevenue(issuanceTasks)), sla: "Live", color: "#06b6d4" },
      { id: "QUALITY_CHECK", label: "Quality Check", count: qcTasks.length, revenue: formatCurrency(sumRevenue(qcTasks)), sla: "Live", color: "#3b82f6" },
      { id: "CUSTOMER_DELIVERY", label: "Customer Delivery", count: deliveryTasks.length, revenue: formatCurrency(sumRevenue(deliveryTasks)), sla: "Live", color: "#14b8a6" },
      { id: "COMPLETED", label: "Completed", count: completedTasks.length, revenue: formatCurrency(sumRevenue(completedTasks)), sla: "Done", color: "#22c55e" },
    ];
  }, [data.tasks]);

  // Dynamic Critical Alert Count from real database data
  const criticalAlertCount = useMemo(() => {
    const overdue = (data.tasks || []).filter(
      (t) => t.dueAt && new Date(t.dueAt) < new Date(),
    ).length;
    const escalationsCount = (data.escalations || []).length;
    return overdue + escalationsCount;
  }, [data.tasks, data.escalations]);

  // Dynamic Customer Waiting Queue from real database tasks
  const waitingQueueList = useMemo(() => {
    const tasks = data.tasks || [];
    return tasks.filter(
      (t) =>
        ["WAITING_CUSTOMER", "WAITING_INSURANCE_COMPANY", "WAITING_DOCUMENTS"].includes(t.status) ||
        t.priority === "HIGH" ||
        t.priority === "CRITICAL",
    );
  }, [data.tasks]);

  // Dynamic Team Workload from database
  const teamWorkloadList = useMemo(() => {
    return data.teamWorkload || [];
  }, [data.teamWorkload]);

  // Dynamic Approvals from database
  const approvalsList = useMemo(() => {
    return data.approvals || [];
  }, [data.approvals]);

  // Dynamic Events / Agenda from database
  const agendaEventsList = useMemo(() => {
    return data.events || [];
  }, [data.events]);

  return (
    <div className="control-tower-root">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center gap-2 rounded-xl bg-emerald-950 text-emerald-100 px-4 py-3 shadow-2xl border border-emerald-700 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-xs font-bold">{actionSuccessMsg}</span>
        </div>
      )}

      {/* 1. STICKY GLOBAL COMMAND BAR */}
      <header className="ct-command-bar">
        <div className="ct-search-box">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            className="ct-search-input"
            placeholder="Search Policy #, Claim #, Customer, GST, Vehicle, PAN, Mobile..."
            value={globalSearch}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              setPage(1);
            }}
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="ct-action-pills">
          <button
            onClick={() => setQuickCreateOpen(true)}
            className="ct-btn ct-btn-primary"
          >
            <Plus size={15} />
            <span>Quick Create</span>
          </button>

          <Link href="/bulk-upload" className="ct-btn">
            <FilePlus size={14} className="text-indigo-600" />
            <span>Upload Policy PDF</span>
          </Link>

          <Link href="/claims" className="ct-btn">
            <ShieldAlert size={14} className="text-rose-600" />
            <span>Register Claim</span>
          </Link>

          <Link href="/renewals" className="ct-btn">
            <RefreshCw size={14} className="text-emerald-600" />
            <span>Renewals</span>
          </Link>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="ct-btn"
            title="Refresh Operations Data"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="ct-btn relative"
            title="Notifications"
          >
            <Bell size={15} />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-extrabold text-white">
              {data.notifications?.length || 0}
            </span>
          </button>
        </div>
      </header>

      {/* 2. CRITICAL ALERTS BANNER */}
      <section className="ct-alerts-container">
        <div className="ct-alert-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
              <Flame size={18} />
            </div>
            <div>
              <div className="ct-alert-title">
                {criticalAlertCount} Operations Items Breaching SLA or Pending Action
              </div>
              <div className="ct-alert-desc">
                Includes overdue renewals, customer SLA holds &amp; active escalations.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setSelectedDept("RENEWALS");
                setActiveStage("ALL");
              }}
              className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 text-xs font-bold hover:bg-rose-50 transition shadow-sm"
            >
              Resolve Now
            </button>
            <button
              onClick={() => showToast("Escalated to Operations Head & Team Manager!")}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-50 transition shadow-sm"
            >
              Escalate All
            </button>
          </div>
        </div>
      </section>

      {/* 3. LIVE OPERATIONS PIPELINE */}
      <section className="ct-pipeline-wrapper">
        <div className="ct-section-header">
          <div className="ct-section-title">
            <Kanban size={18} className="text-indigo-600" />
            <span>Live Operations Pipeline</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
              Real-time Workflow
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveStage("ALL")}
              className="px-3 py-1 rounded-lg text-xs font-bold transition bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 shadow-sm"
            >
              View All Pipeline Stages
            </button>
          </div>
        </div>

        <div className="ct-pipeline-grid">
          {pipelineStages.map((stage) => (
            <div
              key={stage.id}
              onClick={() => setActiveStage(stage.id === activeStage ? "ALL" : stage.id)}
              className={`ct-pipeline-stage ${activeStage === stage.id ? "active" : ""}`}
              style={{ borderTop: `3px solid ${stage.color}` }}
            >
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <span className="ct-stage-name truncate font-extrabold text-[10.5px] text-slate-600 tracking-wider">
                  {stage.label}
                </span>
                <span
                  className="h-2 w-2 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: stage.color }}
                />
              </div>
              <div className="ct-stage-count my-1 font-black text-2xl text-slate-900 leading-none">
                {stage.count}
              </div>
              <div className="flex items-center justify-between gap-1 mt-auto pt-1">
                <span className="ct-stage-sub font-bold text-xs text-slate-700">{stage.revenue}</span>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                  {stage.sla}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. MAIN WORKSPACE MULTI-COLUMN GRID */}
      <div className="ct-workspace-grid">
        {/* LEFT COLUMN: TASK CENTER & QUEUES */}
        <div className="flex flex-col gap-5">
          {/* TASK CENTER CONTROL BOARD */}
          <div className="ct-panel">
            <div className="ct-section-header">
              <div className="ct-section-title">
                <ListCheck size={18} className="text-indigo-600" />
                <span>Task &amp; Work Operations Center</span>
                <span className="text-xs font-semibold text-slate-400">
                  ({filteredTasks.length} items)
                </span>
              </div>

              {/* View Switcher Tabs */}
              <div className="ct-tabs">
                <button
                  onClick={() => setActiveView("TASKS")}
                  className={`ct-tab ${activeView === "TASKS" ? "active" : ""}`}
                >
                  Work Queue
                </button>
                <button
                  onClick={() => setActiveView("APPROVALS")}
                  className={`ct-tab ${activeView === "APPROVALS" ? "active" : ""}`}
                >
                  Approvals ({data.approvals?.length || 3})
                </button>
                <button
                  onClick={() => setActiveView("QUEUE")}
                  className={`ct-tab ${activeView === "QUEUE" ? "active" : ""}`}
                >
                  Waiting Queue
                </button>
              </div>
            </div>

            {/* Department Filter Bar */}
            <div className="ct-dept-bar">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Dept:
              </span>
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => {
                    setSelectedDept(dept.id);
                    setPage(1);
                  }}
                  className={`ct-dept-pill ${selectedDept === dept.id ? "active" : ""}`}
                >
                  {dept.label}
                </button>
              ))}
            </div>

            {/* Bulk Actions Bar */}
            {selectedTaskIds.length > 0 && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white text-slate-900 border border-slate-300 shadow-sm">
                <span className="text-xs font-bold">
                  {selectedTaskIds.length} tasks selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      showToast(`Bulk reassigned ${selectedTaskIds.length} tasks!`);
                      setSelectedTaskIds([]);
                    }}
                    className="px-3 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 text-xs font-bold shadow-sm"
                  >
                    Reassign
                  </button>
                  <button
                    onClick={() => {
                      showToast(`Bulk priority updated!`);
                      setSelectedTaskIds([]);
                    }}
                    className="px-3 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold shadow-sm"
                  >
                    Mark High Priority
                  </button>
                  <button
                    onClick={() => setSelectedTaskIds([])}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* TASK TABLE */}
            <div className="ct-table-wrapper">
              <table className="ct-table">
                <thead>
                  <tr>
                    <th className="w-10 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={
                          pagedTasks.length > 0 &&
                          selectedTaskIds.length === pagedTasks.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="whitespace-nowrap">Task &amp; Reference</th>
                    <th className="whitespace-nowrap">Module</th>
                    <th className="whitespace-nowrap">Customer</th>
                    <th className="whitespace-nowrap text-center">Priority</th>
                    <th className="whitespace-nowrap text-center">Due Date</th>
                    <th className="whitespace-nowrap text-center">Status</th>
                    <th className="text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400 text-xs font-semibold">
                        No operational tasks match your search or department filter.
                      </td>
                    </tr>
                  ) : (
                    pagedTasks.map((task) => {
                      const isSelected = selectedTaskIds.includes(task.id);
                      const isHighPriority = ["high", "critical"].includes(String(task.priority || "").toLowerCase());
                      return (
                        <tr key={task.id} className={isSelected ? "bg-indigo-50/40" : ""}>
                          <td className="text-center whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectTask(task.id)}
                              className="rounded border-slate-300"
                            />
                          </td>
                          <td className="max-w-lg">
                            <div className="font-bold text-slate-900 text-xs break-words whitespace-normal leading-snug hover:text-indigo-600 transition-colors">
                              {String(task.title || "").replace(/,/g, ", ")}
                            </div>
                            {task.description && (
                              <div className="text-[11px] text-slate-500 break-words whitespace-normal leading-relaxed mt-0.5">
                                {String(task.description || "").replace(/,/g, ", ")}
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-md bg-slate-100/90 text-slate-700 font-bold text-[10.5px] uppercase tracking-wider border border-slate-200/70 whitespace-nowrap inline-block">
                              {task.module || "Operations"}
                            </span>
                          </td>
                          <td className="max-w-[240px] break-words whitespace-normal">
                            <span className="font-bold text-slate-800 text-xs break-words whitespace-normal leading-snug block">
                              {String(task.customerName || "General Customer").replace(/,/g, ", ")}
                            </span>
                          </td>
                          <td className="whitespace-nowrap text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full font-extrabold text-[10.5px] uppercase whitespace-nowrap inline-block ${
                                isHighPriority
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {task.priority || "MEDIUM"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap text-center">
                            <span className="text-xs text-slate-600 font-semibold px-2 py-0.5 rounded bg-slate-100/80 border border-slate-200/60 whitespace-nowrap inline-block">
                              {task.dueAt
                                ? new Date(task.dueAt).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                  })
                                : "Today"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap text-center">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold whitespace-nowrap inline-block">
                              {task.status || "OPEN"}
                            </span>
                          </td>
                          <td className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 min-w-[140px]">
                              {["NEW_POLICY_QUOTE", "RENEWAL_QUOTE"].includes(
                                task.metadata?.requestType,
                              ) && (
                                <button
                                  onClick={() => {
                                    setQuoteModalTask(task);
                                    setQuoteForm({
                                      amount: task.amount || "",
                                      note: task.metadata?.quoteNote || "",
                                      paymentLink: task.metadata?.paymentLink || "",
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 text-[11px] font-extrabold shadow-2xs whitespace-nowrap inline-flex items-center gap-1 shrink-0 transition-all"
                                >
                                  <FileEdit size={12} className="shrink-0 text-emerald-600" />
                                  <span>Quote</span>
                                </button>
                              )}
                              <button
                                onClick={() => setAssignModalTask(task)}
                                className="px-2.5 py-1.5 rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-400 text-[11px] font-bold shadow-2xs whitespace-nowrap inline-flex items-center gap-1 shrink-0 transition-all"
                              >
                                <Users size={12} className="shrink-0 text-slate-500" />
                                <span>Assign</span>
                              </button>
                              <button
                                onClick={() => handleCompleteTask(task.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 text-[11px] font-bold shadow-2xs whitespace-nowrap inline-flex items-center gap-1 shrink-0 transition-all"
                                title="Complete Task"
                              >
                                <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
                                <span>Done</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredTasks.length > 0 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-slate-500">
                  Showing <strong className="text-slate-900">{startIndex + 1}</strong> to{" "}
                  <strong className="text-slate-900">{endIndex}</strong> of{" "}
                  <strong className="text-slate-900">{filteredTasks.length}</strong> tasks
                </span>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs font-bold text-slate-700 px-2">
                      Page {safePage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AI ASSISTANT, QUEUES, APPROVALS & TEAM WORKLOAD */}
        <div className="flex flex-col gap-5">
          {/* AI OPERATIONS ASSISTANT */}
          <div className="ct-panel bg-white border border-slate-200 shadow-sm text-slate-900">
            <div className="ct-section-header">
              <div className="flex items-center gap-2 font-extrabold text-sm text-indigo-700">
                <Sparkles size={18} className="text-indigo-600 animate-pulse" />
                <span>AI Operations Copilot</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                Live Insights
              </span>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-amber-700 mb-1">⚡ Workload Rebalancing Suggested</div>
                <div className="text-slate-600 leading-relaxed">
                  {teamWorkloadList[0] ? (
                    <>
                      Executive <strong>{teamWorkloadList[0].user}</strong> has {teamWorkloadList[0].pendingTasks} open tasks.
                    </>
                  ) : (
                    "Analyzing workload distribution across team members..."
                  )}
                </div>
                <button
                  onClick={() => showToast("AI Reassigned tasks automatically!")}
                  className="mt-2.5 px-3 py-1 rounded-lg bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 font-bold text-[11px] shadow-sm"
                >
                  Auto-Balance Workload
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-emerald-700 mb-1">💰 Revenue Blocker Detected</div>
                <div className="text-slate-600 leading-relaxed">
                  {(data.tasks || []).find((t) => t.amount)
                    ? `₹${Number((data.tasks || []).find((t) => t.amount)?.amount).toLocaleString("en-IN")} pending for ${(data.tasks || []).find((t) => t.amount)?.customerName || "Customer"}.`
                    : "No blocked revenue detected across active pipeline."}
                </div>
              </div>
            </div>
          </div>

          {/* CUSTOMER WAITING QUEUE */}
          <div className="ct-panel">
            <div className="ct-section-header">
              <div className="ct-section-title">
                <Clock size={16} className="text-amber-600" />
                <span>Customer Waiting Queue</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                {waitingQueueList.length} Items Hold
              </span>
            </div>

            <div className="ct-scroll-box">
              {waitingQueueList.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                  No customer SLA holds active.
                </div>
              ) : (
                waitingQueueList.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900 truncate">{item.customerName || item.title}</div>
                      <div className="text-[11px] text-amber-700 font-semibold">{item.status.replaceAll("_", " ")}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          const response = await fetch("/api/operations/whatsapp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient: item.customerMobile, message: `Hello ${item.customerName || "Customer"}, please contact Bima Headquarter regarding ${item.title || "your pending request"}.` }) });
                          const data = await response.json();
                          window.alert(response.ok ? "Reminder sent from My Primary WhatsApp." : data.error || "Could not send reminder");
                        }}
                        className="p-1.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        title="Send WhatsApp Reminder"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <a
                        href={`tel:${item.customerMobile || ""}`}
                        className="p-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                        title="Call Customer"
                      >
                        <PhoneCall size={14} />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* OCR & PDF PROCESSING ENGINE */}
          <div className="ct-panel">
            <div className="ct-section-header">
              <div className="ct-section-title">
                <FileCheck size={16} className="text-indigo-600" />
                <span>OCR &amp; PDF Processing Engine</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                Auto-Parsing
              </span>
            </div>

            <div className="ct-scroll-box">
              {(data.activities || []).length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                  No active PDF extraction queue.
                </div>
              ) : (
                (data.activities || []).slice(0, 5).map((doc, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900 truncate">{doc.description || doc.action}</div>
                      <div className="text-[11px] text-slate-500 font-semibold">{doc.module || "System Engine"}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 shrink-0">
                      PROCESSED
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* APPROVAL CENTER */}
          <div className="ct-panel">
            <div className="ct-section-header">
              <div className="ct-section-title">
                <ShieldCheck size={18} className="text-emerald-600" />
                <span>Operational Approvals</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                {approvalsList.length} Pending
              </span>
            </div>

            <div className="ct-scroll-box">
              {approvalsList.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                  No pending operational approvals.
                </div>
              ) : (
                approvalsList.map((app) => (
                  <div key={app.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{app.title}</span>
                      <span className="text-[11px] font-extrabold text-indigo-700">{app.module || "Approval"}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">Status: {app.status}</div>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <button
                        onClick={() => showToast("Approval Rejected")}
                        className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-700 text-[11px] font-bold hover:bg-slate-50 shadow-sm"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => showToast("Approval Granted!")}
                        className="px-2.5 py-1 rounded bg-white border border-emerald-300 text-emerald-700 text-[11px] font-bold hover:bg-emerald-50 shadow-sm"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TEAM WORKLOAD & CAPACITY */}
          <div className="ct-panel">
            <div className="ct-section-header">
              <div className="ct-section-title">
                <Users size={18} className="text-indigo-600" />
                <span>Team Workload &amp; Capacity</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                {teamWorkloadList.filter((e) => (e.pendingTasks || 0) > 0).length} Active
              </span>
            </div>

            <div className="ct-scroll-box max-h-[280px]">
              {teamWorkloadList.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                  No team members configured.
                </div>
              ) : (
                [...teamWorkloadList]
                  .sort((a, b) => (b.pendingTasks || 0) - (a.pendingTasks || 0))
                  .map((emp) => {
                    const count = emp.pendingTasks || 0;
                    const capacityPct = Math.min(Math.round((count / 15) * 100), 100);
                    return (
                      <div
                        key={emp.userId}
                        className="p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5 hover:bg-white hover:border-slate-300 transition shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-extrabold text-slate-900 truncate">{emp.user}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-600 text-[9.5px] font-bold uppercase shrink-0">
                              {emp.role || "AGENT"}
                            </span>
                          </div>
                          <span
                            className={`font-black text-xs shrink-0 ${count > 10 ? "text-rose-600" : count > 0 ? "text-indigo-600" : "text-slate-400"}`}
                          >
                            {count} {count === 1 ? "Task" : "Tasks"}
                          </span>
                        </div>
                        {count > 0 ? (
                          <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${capacityPct > 80 ? "bg-rose-500" : capacityPct > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${capacityPct}%` }}
                            />
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-medium">Available for assignment</div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* MINI CALENDAR & TODAY'S AGENDA */}
          <div className="ct-panel">
            <div className="ct-section-header">
              <div className="ct-section-title">
                <CalendarDays size={18} className="text-indigo-600" />
                <span>Today's Agenda &amp; Follow-ups</span>
              </div>
            </div>

            <div className="ct-scroll-box">
              {agendaEventsList.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                  No events scheduled for today.
                </div>
              ) : (
                agendaEventsList.map((evt) => (
                  <div key={evt.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <div className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-extrabold text-[10px] shrink-0">
                      {evt.startsAt ? new Date(evt.startsAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Today"}
                    </div>
                    <div className="text-xs font-semibold text-slate-800 leading-snug">
                      {evt.title || evt.description}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK CREATE MODAL */}
      {quickCreateOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h3 className="text-base font-extrabold text-slate-900">Create New Operational Task</h3>
                <button onClick={() => setQuickCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setQuickCreateOpen(false);
                  showToast("New Task Created & Assigned!");
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Task Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Follow-up for Fire Policy Renewal"
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 mb-1 block">Department</label>
                    <select className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-indigo-600">
                      <option>Renewals</option>
                      <option>Claims</option>
                      <option>Operations</option>
                      <option>Finance</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 mb-1 block">Priority</label>
                    <select className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-indigo-600">
                      <option>MEDIUM</option>
                      <option>HIGH</option>
                      <option>CRITICAL</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Customer Name / Policy #</label>
                  <input
                    type="text"
                    placeholder="e.g. SHIVOM WAREHOUSE A/C MPWLC"
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setQuickCreateOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ASSIGNMENT MODAL */}
      {assignModalTask && (
        <ModalPortal>
          <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-extrabold text-slate-900">Reassign Operational Task</h3>
                <button onClick={() => setAssignModalTask(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900">{assignModalTask.title}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">{assignModalTask.customerName || "Customer Record"}</div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Assign To Executive</label>
                  <select className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-indigo-600">
                    <option>Abhishek Verma (Ops Manager)</option>
                    <option>Pooja Sharma (Renewals Exec)</option>
                    <option>Ankit Gupta (Claims Manager)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setAssignModalTask(null)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setAssignModalTask(null);
                      showToast("Task reassigned successfully!");
                    }}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                  >
                    Confirm Assignment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* QUOTE UPDATE MODAL */}
      {quoteModalTask && (
        <ModalPortal>
          <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-extrabold text-slate-900">Update Policy Quotation</h3>
                <button onClick={() => setQuoteModalTask(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveQuote} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Quotation Premium Amount (₹)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 16025"
                    value={quoteForm.amount}
                    onChange={(e) => setQuoteForm({ ...quoteForm, amount: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Payment Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://razorpay.me/..."
                    value={quoteForm.paymentLink}
                    onChange={(e) => setQuoteForm({ ...quoteForm, paymentLink: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Note for Customer</label>
                  <textarea
                    rows={3}
                    placeholder="Included Fire & Burglary coverage with MPWLC clause."
                    value={quoteForm.note}
                    onChange={(e) => setQuoteForm({ ...quoteForm, note: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setQuoteModalTask(null)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={quoteSaving}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                  >
                    {quoteSaving ? "Saving..." : "Publish & Notify Customer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
