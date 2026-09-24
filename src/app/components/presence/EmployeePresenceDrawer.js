"use client";

import { useEffect, useState } from "react";
import {
  X,
  Laptop,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Coffee,
  MapPin,
  RefreshCw,
} from "lucide-react";
import ModalPortal from "@/app/components/shared/ModalPortal";

export default function EmployeePresenceDrawer({ userId, onClose, onRefreshParent }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNote, setActionNote] = useState("");
  const [showFieldWorkForm, setShowFieldWorkForm] = useState(false);
  const [fieldWorkReason, setFieldWorkReason] = useState("");
  const [fieldWorkHours, setFieldWorkHours] = useState("2");

  const loadDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/operations/presence?userId=${userId}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load user presence details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadDetails();
    }
  }, [userId]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!userId) return null;

  const handleGrantException = async (type, durationMinutes = null, reason = null) => {
    try {
      setActionLoading(true);
      await fetch("/api/operations/presence/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          type,
          durationMinutes,
          reason,
        }),
      });
      await loadDetails();
      if (onRefreshParent) onRefreshParent();
      setShowFieldWorkForm(false);
    } catch {
      if (typeof window !== "undefined") {
        window.alert("Failed to update status exception");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveEscalation = async (incidentId, action) => {
    try {
      setActionLoading(true);
      await fetch("/api/operations/presence/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId,
          action,
          resolutionNotes: actionNote || (action === "EXCUSE" ? "Excused by manager" : "Resolved by manager"),
        }),
      });
      await loadDetails();
      if (onRefreshParent) onRefreshParent();
      setActionNote("");
    } catch {
      if (typeof window !== "undefined") {
        window.alert("Failed to resolve escalation");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const user = data?.user;
  const daily = data?.daily;
  const sessions = daily?.sessions || [];
  const incidents = daily?.incidents || [];
  const events = daily?.events || [];
  const activeIncident = incidents.find((i) => ["OPEN", "ESCALATED_PENDING_REVIEW"].includes(i.status));

  return (
    <ModalPortal>
      <div className="presence-drawer-backdrop" onClick={onClose}>
        <div className="presence-drawer" onClick={(e) => e.stopPropagation()}>
          {/* Drawer Header */}
          <div className="presence-drawer-head">
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Staff Presence Details</h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                Live session monitoring & duty hours audit
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                padding: 6,
                cursor: "pointer",
                borderRadius: 6,
                color: "#64748b",
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="presence-drawer-body">
            {loading ? (
              <div style={{ display: "grid", placeItems: "center", padding: 40, color: "#64748b" }}>
                <RefreshCw size={24} className="animate-spin" />
                <span style={{ marginTop: 8, fontSize: 13 }}>Loading staff activity...</span>
              </div>
            ) : user ? (
              <>
                {/* Profile Card */}
                <div
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "#1c6c39",
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        fontSize: 16,
                      }}
                    >
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ fontSize: 15, display: "block" }}>{user.name || user.email}</strong>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {user.role} • {user.whatsappPhone || "No WhatsApp registered"}
                      </span>
                    </div>
                  </div>
                  <span className={`presence-status-pill pill-${(daily?.currentStatus || "OFFLINE").toLowerCase()}`}>
                    ● {daily?.currentStatus || "OFFLINE"}
                  </span>
                </div>

                {/* Official Attendance Record */}
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 10,
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                      Today&apos;s Attendance Record ({daily?.workDate || "Today"})
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: daily?.shiftEnd ? "#ecfdf5" : daily?.firstLoginAt ? "#eff6ff" : "#f1f5f9",
                        color: daily?.shiftEnd ? "#065f46" : daily?.firstLoginAt ? "#1d4ed8" : "#64748b",
                        border: `1px solid ${daily?.shiftEnd ? "#a7f3d0" : daily?.firstLoginAt ? "#bfdbfe" : "#e2e8f0"}`,
                      }}
                    >
                      {daily?.shiftEnd ? "Locked (Final)" : daily?.firstLoginAt ? "IN Progress" : "No Attendance"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>IN TIME</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                        {daily?.firstLoginAt
                          ? new Date(daily.firstLoginAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "Asia/Kolkata",
                            })
                          : "--:--"}
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                        {daily?.firstLoginAt ? "First login >= 08:30 AM" : "Not logged in >= 08:30 AM"}
                      </div>
                    </div>

                    <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>OUT TIME</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                        {daily?.effectiveOutFormatted
                          ? daily.effectiveOutFormatted
                          : (daily?.shiftEnd || (daily?.currentStatus === "OFFLINE" ? daily?.effectiveOut || daily?.lastSeenAt : null))
                          ? new Date(daily?.shiftEnd || daily?.effectiveOut || daily?.lastSeenAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "Asia/Kolkata",
                            })
                          : "--:--"}
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                        {daily?.shiftEnd
                          ? (daily?.metadata?.outSource === "AUTO_LAST_SEEN" || daily?.resolvedOutSource === "AUTO_LAST_SEEN" ? "Auto-detected logout" : "Confirmed logout")
                          : (daily?.effectiveOutFormatted || (daily?.currentStatus === "OFFLINE" && (daily?.effectiveOut || daily?.lastSeenAt))
                            ? "Provisional (System offline)"
                            : (daily?.firstLoginAt ? "Awaiting logout" : "No session"))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Incident / Escalation Banner */}
                {activeIncident && (
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      background: activeIncident.status === "ESCALATED_PENDING_REVIEW" ? "#fef2f2" : "#fffbeb",
                      border: `1px solid ${activeIncident.status === "ESCALATED_PENDING_REVIEW" ? "#fca5a5" : "#fde68a"}`,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14 }}>
                      <AlertTriangle
                        size={18}
                        color={activeIncident.status === "ESCALATED_PENDING_REVIEW" ? "#dc2626" : "#d97706"}
                      />
                      <span>
                        {activeIncident.status === "ESCALATED_PENDING_REVIEW"
                          ? "Absence Escalated to Management"
                          : "Active Disconnection Incident"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      Started: {new Date(activeIncident.startedAt).toLocaleTimeString("en-IN")} • Duration: ~
                      {Math.max(1, Math.round(activeIncident.durationSeconds / 60))} mins
                      <br />
                      Warnings sent:{" "}
                      {[
                        activeIncident.warning1SentAt ? "Warn 1" : null,
                        activeIncident.warning2SentAt ? "Warn 2" : null,
                        activeIncident.warning3SentAt ? "Warn 3" : null,
                      ]
                        .filter(Boolean)
                        .join(", ") || "None yet"}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button
                        className="presence-btn presence-btn-primary"
                        style={{ fontSize: 12, padding: "6px 12px" }}
                        disabled={actionLoading}
                        onClick={() => handleResolveEscalation(activeIncident.id, "RESOLVE")}
                      >
                        <CheckCircle2 size={14} /> Resolve Incident
                      </button>
                      <button
                        className="presence-btn presence-btn-outline"
                        style={{ fontSize: 12, padding: "6px 12px" }}
                        disabled={actionLoading}
                        onClick={() => handleResolveEscalation(activeIncident.id, "EXCUSE")}
                      >
                        Excuse Absence
                      </button>
                    </div>
                  </div>
                )}

                {/* Session & Tab Details */}
                <div>
                  <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: "#334155" }}>
                    Active CRM Tabs ({sessions.length})
                  </h4>
                  {sessions.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#94a3b8", padding: "10px 0" }}>
                      No active tabs currently connected.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {sessions.map((s, idx) => (
                        <div
                          key={s.id || idx}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Laptop size={16} color="#1c6c39" />
                            <div>
                              <strong>Tab #{idx + 1}</strong>
                              <span style={{ color: "#64748b", marginLeft: 6 }}>
                                ({s.visibilityState === "visible" ? "Foreground" : "Background"})
                              </span>
                            </div>
                          </div>
                          <span style={{ color: "#64748b" }}>
                            Last pulse: {new Date(s.lastHeartbeatAt).toLocaleTimeString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Exceptions Bar */}
                <div style={{ padding: "14px 0", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: "#334155" }}>
                    Manage Status & Exceptions
                  </h4>
                  {daily?.approvedExceptionType ? (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ fontSize: 12 }}>
                        <strong>Active: {daily.approvedExceptionType}</strong>
                        {daily.exceptionReason && <span> — {daily.exceptionReason}</span>}
                        {daily.exceptionUntil && (
                          <div style={{ color: "#166534" }}>
                            Valid until: {new Date(daily.exceptionUntil).toLocaleTimeString("en-IN")}
                          </div>
                        )}
                      </div>
                      <button
                        className="presence-btn presence-btn-outline"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                        disabled={actionLoading}
                        onClick={() => handleGrantException("CLEAR")}
                      >
                        Clear
                      </button>
                    </div>
                  ) : null}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button
                      className="presence-btn presence-btn-outline"
                      style={{ fontSize: 12 }}
                      disabled={actionLoading}
                      onClick={() => handleGrantException("BREAK", 30, "Lunch Break")}
                    >
                      <Coffee size={14} /> Lunch (30m)
                    </button>
                    <button
                      className="presence-btn presence-btn-outline"
                      style={{ fontSize: 12 }}
                      disabled={actionLoading}
                      onClick={() => setShowFieldWorkForm(!showFieldWorkForm)}
                    >
                      <MapPin size={14} /> Field Work...
                    </button>
                    <button
                      className="presence-btn presence-btn-outline"
                      style={{ fontSize: 12 }}
                      disabled={actionLoading}
                      onClick={() => handleGrantException("LEAVE", null, "Full Day Approved Leave")}
                    >
                      <Calendar size={14} /> Mark Leave
                    </button>
                  </div>

                  {showFieldWorkForm && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 8,
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Client name / visit purpose..."
                        value={fieldWorkReason}
                        onChange={(e) => setFieldWorkReason(e.target.value)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                          fontSize: 12,
                        }}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#64748b" }}>Expected Duration:</span>
                        <select
                          value={fieldWorkHours}
                          onChange={(e) => setFieldWorkHours(e.target.value)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            fontSize: 12,
                          }}
                        >
                          <option value="1">1 Hour</option>
                          <option value="2">2 Hours</option>
                          <option value="4">4 Hours (Half Day)</option>
                          <option value="8">Rest of Day</option>
                        </select>
                        <button
                          className="presence-btn presence-btn-primary"
                          style={{ fontSize: 12, padding: "5px 10px" }}
                          disabled={actionLoading || !fieldWorkReason.trim()}
                          onClick={() =>
                            handleGrantException("FIELD_WORK", parseInt(fieldWorkHours, 10) * 60, fieldWorkReason)
                          }
                        >
                          Approve Visit
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Today Activity Timeline */}
                <div>
                  <h4 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 800, color: "#334155" }}>
                    Today Activity Timeline
                  </h4>
                  {events.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>No presence events recorded today yet.</div>
                  ) : (
                    <div className="presence-timeline">
                      {events.map((evt) => (
                        <div key={evt.id} className="presence-timeline-item">
                          <span className="presence-timeline-dot" />
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                            {evt.eventType.replace(/_/g, " ")}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            {new Date(evt.createdAt).toLocaleTimeString("en-IN")} • {evt.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div>No data found.</div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
