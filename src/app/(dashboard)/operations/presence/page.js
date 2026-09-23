"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  CheckCircle2,
  Coffee,
  MapPin,
  Calendar,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  Play,
  Laptop,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import PageHeader from "@/app/components/layout/PageHeader";
import EmployeePresenceDrawer from "@/app/components/presence/EmployeePresenceDrawer";
import "@/app/ui/dashboard/presence.css";

export default function PresenceCenterPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  const fetchPresenceData = async () => {
    try {
      const res = await fetch("/api/operations/presence", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load presence data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresenceData();
    if (typeof window === "undefined") return;

    // Auto-refresh every 30 seconds
    const interval = window.setInterval(fetchPresenceData, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const handleRunEvaluation = async () => {
    try {
      setEvaluating(true);
      const res = await fetch("/api/operations/presence", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        await fetchPresenceData();
      }
    } catch {
      if (typeof window !== "undefined") {
        window.alert("Failed to run evaluation");
      }
    } finally {
      setEvaluating(false);
    }
  };

  const summary = data?.summary || {
    totalMonitored: 0,
    onlineStaff: 0,
    onBreak: 0,
    fieldWork: 0,
    onLeave: 0,
    offlineStaff: 0,
    warningsToday: 0,
    escalatedCount: 0,
  };

  const ist = data?.ist || {
    formattedTime: "--:-- IST",
    isShiftHours: false,
    weekday: "Today",
  };

  const staffList = data?.staff || [];

  const filteredStaff = useMemo(() => {
    let list = staffList;

    // Filter tab
    if (activeFilter === "online") {
      list = list.filter((s) => s.status === "ONLINE");
    } else if (activeFilter === "away") {
      list = list.filter((s) => ["ON_BREAK", "FIELD_WORK"].includes(s.status));
    } else if (activeFilter === "offline") {
      list = list.filter((s) => s.status === "OFFLINE");
    } else if (activeFilter === "escalated") {
      list = list.filter((s) => s.activeIncident?.status === "ESCALATED_PENDING_REVIEW");
    }

    // Search query
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.whatsappPhone?.includes(q) ||
          s.role?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [staffList, activeFilter, query]);

  return (
    <div className="presence-page">
      <PageHeader
        title="Staff Presence & Attendance"
        subtitle="Real-time CRM tab monitoring, multi-tab sync, duty hours tracking (10:00 AM – 6:30 PM IST), and automated WhatsApp attendance warnings."
      />

      {/* Duty Hours & Live Status Banner */}
      <section className="presence-shift-banner">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="presence-shift-indicator">
            <span className={`presence-pulse-dot ${ist.isShiftHours ? "" : "off"}`} />
            {ist.isShiftHours ? "Official Duty Shift ACTIVE" : "Duty Shift INACTIVE"}
          </span>
          <span style={{ color: "#64748b" }}>
            {ist.weekday} • Current Time: <strong>{ist.formattedTime}</strong>
          </span>
          <span style={{ color: "#94a3b8" }}>|</span>
          <span style={{ color: "#475569" }}>
            Scheduled Window: <strong>10:00 AM – 6:30 PM IST</strong> (Mon – Sat)
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="presence-btn presence-btn-outline"
            onClick={fetchPresenceData}
            title="Refresh Presence"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            className="presence-btn presence-btn-primary"
            onClick={handleRunEvaluation}
            disabled={evaluating}
            title="Trigger Automated Absence & Warning Check"
          >
            <Play size={14} className={evaluating ? "animate-spin" : ""} /> Run Absence Check
          </button>
        </div>
      </section>

      {/* Top KPI Cards Grid */}
      <section className="presence-kpi-grid">
        <div className="presence-kpi-card">
          <div className="presence-kpi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <Users size={20} />
          </div>
          <div className="presence-kpi-info">
            <strong>{summary.totalMonitored}</strong>
            <p>Staff Monitored</p>
          </div>
        </div>

        <div className="presence-kpi-card">
          <div className="presence-kpi-icon" style={{ background: "#ecfdf5", color: "#10b981" }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="presence-kpi-info">
            <strong style={{ color: "#065f46" }}>{summary.onlineStaff}</strong>
            <p>Online in CRM</p>
          </div>
        </div>

        <div className="presence-kpi-card">
          <div className="presence-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}>
            <Coffee size={20} />
          </div>
          <div className="presence-kpi-info">
            <strong>{summary.onBreak}</strong>
            <p>On Break</p>
          </div>
        </div>

        <div className="presence-kpi-card">
          <div className="presence-kpi-icon" style={{ background: "#f0f9ff", color: "#0284c7" }}>
            <MapPin size={20} />
          </div>
          <div className="presence-kpi-info">
            <strong>{summary.fieldWork}</strong>
            <p>Field Work</p>
          </div>
        </div>

        <div className="presence-kpi-card">
          <div className="presence-kpi-icon" style={{ background: "#faf5ff", color: "#9333ea" }}>
            <Calendar size={20} />
          </div>
          <div className="presence-kpi-info">
            <strong>{summary.onLeave}</strong>
            <p>Approved Leave</p>
          </div>
        </div>

        <div className="presence-kpi-card">
          <div className="presence-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}>
            <AlertTriangle size={20} />
          </div>
          <div className="presence-kpi-info">
            <strong style={{ color: "#991b1b" }}>{summary.offlineStaff}</strong>
            <p>Offline / Disconnected</p>
          </div>
        </div>

        <div className="presence-kpi-card">
          <div className="presence-kpi-icon" style={{ background: "#fefce8", color: "#ca8a04" }}>
            <Clock size={20} />
          </div>
          <div className="presence-kpi-info">
            <strong>{summary.warningsToday}</strong>
            <p>Warnings Today</p>
          </div>
        </div>

        <div className="presence-kpi-card">
          <div className="presence-kpi-icon" style={{ background: "#ffe4e6", color: "#e11d48" }}>
            <ShieldAlert size={20} />
          </div>
          <div className="presence-kpi-info">
            <strong style={{ color: summary.escalatedCount > 0 ? "#e11d48" : "inherit" }}>
              {summary.escalatedCount}
            </strong>
            <p>Escalated Absences</p>
          </div>
        </div>
      </section>

      {/* Staff Table Card */}
      <section className="presence-table-card">
        {/* Toolbar */}
        <div className="presence-toolbar">
          <div className="presence-search-input">
            <Search size={16} color="#94a3b8" />
            <input
              type="search"
              placeholder="Search staff by name, email, phone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="presence-filter-tabs">
            <button
              className={`presence-filter-tab ${activeFilter === "all" ? "active" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              All Staff ({staffList.length})
            </button>
            <button
              className={`presence-filter-tab ${activeFilter === "online" ? "active" : ""}`}
              onClick={() => setActiveFilter("online")}
            >
              Online ({summary.onlineStaff})
            </button>
            <button
              className={`presence-filter-tab ${activeFilter === "away" ? "active" : ""}`}
              onClick={() => setActiveFilter("away")}
            >
              Break / Visit ({summary.onBreak + summary.fieldWork})
            </button>
            <button
              className={`presence-filter-tab ${activeFilter === "offline" ? "active" : ""}`}
              onClick={() => setActiveFilter("offline")}
            >
              Offline ({summary.offlineStaff})
            </button>
            {summary.escalatedCount > 0 && (
              <button
                className={`presence-filter-tab ${activeFilter === "escalated" ? "active" : ""}`}
                style={{ color: "#dc2626" }}
                onClick={() => setActiveFilter("escalated")}
              >
                Escalated ({summary.escalatedCount})
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="presence-table-wrap">
          <table className="presence-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Active Tabs</th>
                <th>Today's Activity</th>
                <th>Warning Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 36, color: "#64748b" }}>
                    No staff records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const isEscalated = staff.activeIncident?.status === "ESCALATED_PENDING_REVIEW";
                  return (
                    <tr key={staff.id}>
                      {/* Name & Phone */}
                      <td>
                        <div className="presence-user-cell">
                          <div className="presence-avatar">
                            {(staff.name || staff.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <strong style={{ display: "block" }}>{staff.name}</strong>
                            <span style={{ fontSize: 12, color: "#64748b" }}>
                              {staff.whatsappPhone || staff.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                          {staff.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`presence-status-pill pill-${staff.status.toLowerCase()}`}>
                          ● {staff.status.replace(/_/g, " ")}
                        </span>
                        {staff.approvedExceptionType && (
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                            {staff.approvedExceptionType}: {staff.exceptionReason || "Approved"}
                          </div>
                        )}
                      </td>

                      {/* Active Tabs */}
                      <td>
                        <span className="presence-tabs-count">
                          <Laptop size={13} /> {staff.activeTabs} {staff.activeTabs === 1 ? "tab" : "tabs"}
                        </span>
                      </td>

                      {/* Activity */}
                      <td>
                        <div style={{ fontSize: 12 }}>
                          {staff.firstLoginAt ? (
                            <span>In: {new Date(staff.firstLoginAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>No login today</span>
                          )}
                          {staff.lastSeenAt && (
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              Last seen: {new Date(staff.lastSeenAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Warning Level */}
                      <td>
                        {isEscalated ? (
                          <span className="presence-warning-badge badge-escalated">
                            ESCALATED
                          </span>
                        ) : staff.warningCount > 0 ? (
                          <span className={`presence-warning-badge badge-warn-${Math.min(3, staff.warningCount)}`}>
                            Warning {staff.warningCount}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>Clean</span>
                        )}
                      </td>

                      {/* Action */}
                      <td>
                        <button
                          className="presence-btn presence-btn-outline"
                          style={{ fontSize: 12, padding: "5px 10px" }}
                          onClick={() => setSelectedUserId(staff.id)}
                        >
                          Details <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Slide-over Drawer for employee details */}
      {selectedUserId && (
        <EmployeePresenceDrawer
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onRefreshParent={fetchPresenceData}
        />
      )}
    </div>
  );
}
