"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AlertCircle, MoreVertical, Eye, CheckCircle, XCircle, PlusCircle } from "lucide-react";

export default function DailyWorkPage() {
  const router = useRouter();

  // Data State
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCardFilter, setActiveCardFilter] = useState("all_work"); // all_work, due_today, followup_today, overdue_followup, completed_today
  const [activeDropdownRowId, setActiveDropdownRowId] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState(null);

  // Counters
  const [counts, setCounts] = useState({
    dueToday: 0,
    followUpToday: 0,
    overdueFollowUp: 0,
    completedToday: 0,
    renewedToday: 0,
    lostToday: 0,
  });

  // Action Modals State
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [lostModalOpen, setLostModalOpen] = useState(false);

  // Modal Fields
  const [remarkForm, setRemarkForm] = useState({
    text: "",
    nextFollowUpDate: "",
    status: "Follow-Up",
    mode: "Call",
    priority: "Normal",
    nextAction: "",
  });
  const [renewForm, setRenewForm] = useState({
    policyNumber: "",
    startDate: "",
    expiryDate: "",
    premium: "",
    remark: "",
  });
  const [lostForm, setLostForm] = useState({ lostReason: "Premium High", remarks: "" });
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch all daily work components
  const fetchDailyWork = async () => {
    try {
      setLoading(true);

      // 1. Fetch Today's Work stats/activities from API
      const workRes = await fetch("/api/renewals/today-work");
      const workData = await workRes.json();

      // 2. Fetch policies for today's grid
      // We will pull:
      // - Upcoming policies (limit 100)
      // - Overdue followups
      const policiesRes = await fetch("/api/renewals/policies?tab=all&limit=100");
      const policiesData = await policiesRes.json();

      if (policiesRes.ok && policiesData.policies) {
        setPolicies(policiesData.policies);
      }

      // Compute counters based on current policy data & today's work report
      const todayStr = new Date().toISOString().split("T")[0];
      let dueToday = 0;
      let followUpToday = 0;
      let overdueFollowUp = 0;

      policiesData.policies.forEach((p) => {
        const isClosed = ["RENEWED", "LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(
          p.renewalStatus,
        );
        if (!isClosed) {
          // Due Today
          if (p.expiryDate && p.expiryDate.startsWith(todayStr)) {
            dueToday++;
          }
          // Follow up today
          if (p.nextFollowUpDate && p.nextFollowUpDate.startsWith(todayStr)) {
            followUpToday++;
          }
          // Overdue follow up
          if (p.nextFollowUpDate && p.nextFollowUpDate < todayStr) {
            overdueFollowUp++;
          }
        }
      });

      // Today's completed actions from audit logs
      const completedToday = workData.summary?.total || 0;
      const renewedToday = workData.summary?.renewed || 0;
      const lostToday = workData.summary?.lost || 0;

      setCounts({
        dueToday,
        followUpToday,
        overdueFollowUp,
        completedToday,
        renewedToday,
        lostToday,
      });
    } catch (err) {
      console.error("Failed to fetch daily work records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyWork();
  }, []);

  const openActionMenu = (rowId, event) => {
    event.stopPropagation();

    if (activeDropdownRowId === rowId) {
      setActiveDropdownRowId(null);
      setDropdownPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = 224;
    const gap = 6;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const preferredLeft = rect.left + rect.width - menuWidth;
    const left = Math.min(viewportWidth - menuWidth - 12, Math.max(12, preferredLeft));
    const opensUp = window.innerHeight - rect.bottom < menuHeight + 16;
    const top = opensUp ? Math.max(12, rect.top - menuHeight - gap) : rect.bottom + gap;

    setDropdownPosition({ top, left, width: menuWidth });
    setActiveDropdownRowId(rowId);
  };

  const closeActionMenu = () => {
    setActiveDropdownRowId(null);
    setDropdownPosition(null);
  };

  // Filter policies based on active card selection
  const getFilteredPolicies = () => {
    const todayStr = new Date().toISOString().split("T")[0];

    return policies.filter((p) => {
      const isClosed = ["RENEWED", "LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(
        p.renewalStatus,
      );

      if (activeCardFilter === "due_today") {
        return !isClosed && p.expiryDate && p.expiryDate.startsWith(todayStr);
      }
      if (activeCardFilter === "followup_today") {
        return !isClosed && p.nextFollowUpDate && p.nextFollowUpDate.startsWith(todayStr);
      }
      if (activeCardFilter === "overdue_followup") {
        return !isClosed && p.nextFollowUpDate && p.nextFollowUpDate < todayStr;
      }
      if (activeCardFilter === "completed_today") {
        // Show recently updated policies (renewed or lost today)
        return isClosed && p.renewalDate && p.renewalDate.startsWith(todayStr);
      }

      // Default: all open daily tasks (due today, followups today, overdue followups)
      return (
        !isClosed &&
        ((p.expiryDate && p.expiryDate.startsWith(todayStr)) ||
          (p.nextFollowUpDate && p.nextFollowUpDate.startsWith(todayStr)) ||
          (p.nextFollowUpDate && p.nextFollowUpDate < todayStr))
      );
    });
  };

  // Actions
  const handleViewProfile = (policy) => {
    const phone = policy.contactNumber || "";
    if (!phone) {
      window.alert("No phone number associated with this policy.");
      return;
    }
    router.push(`/dashboard/renewals/customers/${encodeURIComponent(phone)}`);
  };

  // Log remark / Schedule follow-up
  const submitRemark = async (e) => {
    e.preventDefault();
    if (!remarkForm.text.trim()) return;

    try {
      setActionLoading(true);
      const res = await fetch("/api/renewals/remarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: selectedPolicy.id,
          remark: remarkForm.text,
          nextFollowUpDate: remarkForm.nextFollowUpDate,
          followUpStatus: remarkForm.status,
          followUpMode: remarkForm.mode,
          priority: remarkForm.priority,
          nextAction: remarkForm.nextAction,
        }),
      });
      if (res.ok) {
        setRemarkModalOpen(false);
        setRemarkForm({
          text: "",
          nextFollowUpDate: "",
          status: "Follow-Up",
          mode: "Call",
          priority: "Normal",
          nextAction: "",
        });
        await fetchDailyWork();
      } else {
        const err = await res.json();
        window.alert(err.error || "Failed to submit remark.");
      }
    } catch {
      window.alert("Failed to submit remark.");
    } finally {
      setActionLoading(false);
    }
  };

  // Mark policy as renewed
  const submitRenew = async (e) => {
    e.preventDefault();
    if (!renewForm.policyNumber || !renewForm.startDate || !renewForm.expiryDate || !renewForm.premium) {
      window.alert("All fields are required.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/renewals/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previousPolicyId: selectedPolicy.id,
          renewedData: {
            policyNumber: renewForm.policyNumber,
            startDate: renewForm.startDate,
            expiryDate: renewForm.expiryDate,
            premium: renewForm.premium,
            remark: renewForm.remark,
          },
        }),
      });
      if (res.ok) {
        setRenewModalOpen(false);
        setRenewForm({ policyNumber: "", startDate: "", expiryDate: "", premium: "", remark: "" });
        await fetchDailyWork();
      } else {
        const err = await res.json();
        window.alert(err.error || "Failed to renew policy.");
      }
    } catch {
      window.alert("Failed to renew policy.");
    } finally {
      setActionLoading(false);
    }
  };

  // Mark policy as lost
  const submitLost = async (e) => {
    e.preventDefault();

    try {
      setActionLoading(true);
      const res = await fetch("/api/renewals/lost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: selectedPolicy.id,
          lostReason: lostForm.lostReason,
          remarks: lostForm.remarks,
        }),
      });
      if (res.ok) {
        setLostModalOpen(false);
        setLostForm({ lostReason: "Premium High", remarks: "" });
        await fetchDailyWork();
      } else {
        const err = await res.json();
        window.alert(err.error || "Failed to mark policy as lost.");
      }
    } catch {
      window.alert("Failed to mark policy as lost.");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = getFilteredPolicies();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        <button
          type="button"
          className="rn-btn rn-btn-primary"
          onClick={() => router.push("/manual-policy-entry")}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <PlusCircle size={15} /> Manual Renewal
        </button>
      </div>

      {/* Cards Row */}
      <div className="renewals-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {[
          {
            key: "all_work",
            title: "All Daily Tasks",
            count: counts.dueToday + counts.followUpToday + counts.overdueFollowUp,
            color: "var(--rn-primary)",
          },
          { key: "due_today", title: "Due Today", count: counts.dueToday, color: "var(--rn-warning)" },
          { key: "followup_today", title: "Follow-ups Today", count: counts.followUpToday, color: "#06b6d4" },
          {
            key: "overdue_followup",
            title: "Overdue Follow-ups",
            count: counts.overdueFollowUp,
            color: "var(--rn-danger)",
          },
          {
            key: "completed_today",
            title: "Completed Today",
            count: counts.completedToday,
            color: "var(--rn-success)",
          },
        ].map((card) => (
          <div
            key={card.key}
            className="renewals-card"
            onClick={() => setActiveCardFilter(card.key)}
            style={{
              borderLeft: `4px solid ${card.color}`,
              cursor: "pointer",
              backgroundColor: activeCardFilter === card.key ? "var(--rn-border-light)" : "#ffffff",
            }}
          >
            <div>
              <h4 className="renewals-card-title" style={{ fontSize: "11px", marginBottom: "8px" }}>
                {card.title}
              </h4>
              <p className="renewals-card-value" style={{ fontSize: "22px" }}>
                {card.count}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid Section */}
      <div className="rn-table-container">
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid var(--rn-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--rn-text-primary)", margin: 0 }}>
            {activeCardFilter === "all_work" && "All Daily Tasks"}
            {activeCardFilter === "due_today" && "Policies Due Today"}
            {activeCardFilter === "followup_today" && "Follow-ups Scheduled for Today"}
            {activeCardFilter === "overdue_followup" && "Overdue Follow-ups"}
            {activeCardFilter === "completed_today" && "Tasks Completed Today"}
          </h3>
          <span style={{ fontSize: "12px", color: "var(--rn-text-secondary)" }}>
            {filtered.length} records found
          </span>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <p>Loading daily tasks...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "40px 0",
              gap: "8px",
            }}
          >
            <AlertCircle size={24} style={{ color: "var(--rn-text-muted)" }} />
            <p style={{ color: "var(--rn-text-secondary)", fontSize: "14px" }}>
              No tasks found for this category today.
            </p>
            <button
              type="button"
              className="rn-btn rn-btn-primary"
              onClick={() => router.push("/manual-policy-entry")}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "8px" }}
            >
              <PlusCircle size={15} /> Manual Renewal
            </button>
          </div>
        ) : (
          <table className="rn-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Insurance Company</th>
                <th>Policy Type</th>
                <th>Due Date (Expiry)</th>
                <th>Next Action</th>
                <th>Assigned User</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((policy) => {
                const daysLeft = policy.daysRemaining !== undefined ? policy.daysRemaining : 0;
                return (
                  <tr key={policy.id}>
                    <td>
                      <div style={{ fontWeight: "600", color: "var(--rn-text-primary)" }}>
                        {policy.insuredName}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--rn-text-muted)" }}>
                        {policy.contactNumber || "No Mobile"}
                      </div>
                    </td>
                    <td>{policy.insuranceCompany}</td>
                    <td>{policy.displayPolicyType || policy.policyType}</td>
                    <td>
                      <div>{policy.expiryDate || "-"}</div>
                      {daysLeft < 0 ? (
                        <span style={{ fontSize: "11px", color: "var(--rn-danger)", fontWeight: "500" }}>
                          Overdue {Math.abs(daysLeft)} days
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--rn-text-muted)" }}>
                          {daysLeft} days left
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: "500" }}>{policy.renewalFollowUp?.nextAction || "-"}</div>
                      {policy.nextFollowUpDate && (
                        <span style={{ fontSize: "11px", color: "var(--rn-primary)" }}>
                          F/Up: {policy.nextFollowUpDate}
                        </span>
                      )}
                    </td>
                    <td>{policy.assignedTo || "Unassigned"}</td>
                    <td>
                      <span
                        className={`rn-badge ${
                          policy.renewalStatus === "RENEWED"
                            ? "rn-badge-success"
                            : ["LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(
                                  policy.renewalStatus,
                                )
                              ? "rn-badge-danger"
                              : policy.renewalStatus === "Follow-Up"
                                ? "rn-badge-warning"
                                : "rn-badge-active"
                        }`}
                      >
                        {policy.renewalStatus || "ACTIVE"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="rn-table-actions" style={{ justifyContent: "flex-end" }}>
                        <div className="rn-dropdown">
                          <button
                            className="rn-dropdown-btn"
                            onClick={(e) => openActionMenu(policy.id, e)}
                            title="Actions"
                            aria-label={`Actions for ${policy.insuredName || "policy"}`}
                            aria-expanded={activeDropdownRowId === policy.id}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {activeDropdownRowId === policy.id &&
                            typeof document !== "undefined" &&
                            createPortal(
                              <>
                                <div
                                  style={{
                                    position: "fixed",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    zIndex: 999,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    closeActionMenu();
                                  }}
                                />
                                <div
                                  className="rn-dropdown-menu"
                                  style={{
                                    position: "fixed",
                                    zIndex: 10000,
                                    top: `${dropdownPosition?.top || 0}px`,
                                    left: `${dropdownPosition?.left || 0}px`,
                                    right: "auto",
                                    width: `${dropdownPosition?.width || 230}px`,
                                  }}
                                >
                                  <button
                                    className="rn-dropdown-item"
                                    onClick={() => {
                                      closeActionMenu();
                                      handleViewProfile(policy);
                                    }}
                                  >
                                    <Eye size={14} /> View Profile
                                  </button>
                                  <button
                                    className="rn-dropdown-item"
                                    onClick={() => {
                                      closeActionMenu();
                                      setSelectedPolicy(policy);
                                      setRenewModalOpen(true);
                                    }}
                                  >
                                    <CheckCircle size={14} style={{ color: "var(--rn-success)" }} /> Mark
                                    Renewed
                                  </button>
                                  <button
                                    className="rn-dropdown-item rn-dropdown-item-danger"
                                    onClick={() => {
                                      closeActionMenu();
                                      setSelectedPolicy(policy);
                                      setLostModalOpen(true);
                                    }}
                                  >
                                    <XCircle size={14} /> Mark Lost
                                  </button>
                                </div>
                              </>,
                              document.body,
                            )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL: Log Follow-Up / Remark */}
      {remarkModalOpen && selectedPolicy && (
        <div className="tb-modal-backdrop" onClick={() => setRemarkModalOpen(false)}>
          <div className="tb-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="tb-modal-header">
              <h3>Log Follow-Up & Remark</h3>
              <button
                onClick={() => setRemarkModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={submitRemark}>
              <div
                className="tb-modal-body"
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}
              >
                <div style={{ fontSize: "13px", color: "var(--rn-text-secondary)" }}>
                  Recording follow-up for <strong>{selectedPolicy.insuredName}</strong> (Policy:{" "}
                  {selectedPolicy.policyNumber})
                </div>
                <div className="customer-meta-item">
                  <label className="customer-meta-label">Remark Text *</label>
                  <textarea
                    className="rn-input"
                    style={{ minHeight: "80px", width: "100%" }}
                    value={remarkForm.text}
                    onChange={(e) => setRemarkForm({ ...remarkForm, text: e.target.value })}
                    placeholder="Enter remark notes..."
                    required
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="customer-meta-item">
                    <label className="customer-meta-label">Renewal Status</label>
                    <select
                      className="rn-input"
                      value={remarkForm.status}
                      onChange={(e) => setRemarkForm({ ...remarkForm, status: e.target.value })}
                    >
                      <option value="Called">Called</option>
                      <option value="Follow-Up">Follow-Up</option>
                      <option value="Quote Sent">Quote Sent</option>
                      <option value="Interested">Interested</option>
                      <option value="Negotiation">Negotiation</option>
                    </select>
                  </div>
                  <div className="customer-meta-item">
                    <label className="customer-meta-label">Next Follow-Up Date</label>
                    <input
                      type="date"
                      className="rn-input"
                      value={remarkForm.nextFollowUpDate}
                      onChange={(e) => setRemarkForm({ ...remarkForm, nextFollowUpDate: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="customer-meta-item">
                    <label className="customer-meta-label">Follow-Up Mode</label>
                    <select
                      className="rn-input"
                      value={remarkForm.mode}
                      onChange={(e) => setRemarkForm({ ...remarkForm, mode: e.target.value })}
                    >
                      <option value="Call">Call</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Email">Email</option>
                      <option value="Office Visit">Office Visit</option>
                    </select>
                  </div>
                  <div className="customer-meta-item">
                    <label className="customer-meta-label">Priority</label>
                    <select
                      className="rn-input"
                      value={remarkForm.priority}
                      onChange={(e) => setRemarkForm({ ...remarkForm, priority: e.target.value })}
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>
                <div className="customer-meta-item">
                  <label className="customer-meta-label">Next Action Task (Optional)</label>
                  <input
                    type="text"
                    className="rn-input"
                    style={{ width: "100%" }}
                    value={remarkForm.nextAction}
                    onChange={(e) => setRemarkForm({ ...remarkForm, nextAction: e.target.value })}
                    placeholder="e.g. Share health quote tomorrow"
                  />
                </div>
              </div>
              <div
                className="tb-modal-footer"
                style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "12px" }}
              >
                <button type="button" className="rn-btn" onClick={() => setRemarkModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="rn-btn rn-btn-primary" disabled={actionLoading}>
                  {actionLoading ? "Saving..." : "Save Remark"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Renew Policy */}
      {renewModalOpen && selectedPolicy && (
        <div className="tb-modal-backdrop" onClick={() => setRenewModalOpen(false)}>
          <div className="tb-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="tb-modal-header">
              <h3>Renew Policy</h3>
              <button
                onClick={() => setRenewModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={submitRenew}>
              <div
                className="tb-modal-body"
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}
              >
                <div style={{ fontSize: "13px", color: "var(--rn-text-secondary)" }}>
                  Creating renewal policy for <strong>{selectedPolicy.insuredName}</strong> (Old Policy:{" "}
                  {selectedPolicy.policyNumber})
                </div>
                <div className="customer-meta-item">
                  <label className="customer-meta-label">New Policy Number *</label>
                  <input
                    type="text"
                    className="rn-input"
                    style={{ width: "100%" }}
                    value={renewForm.policyNumber}
                    onChange={(e) => setRenewForm({ ...renewForm, policyNumber: e.target.value })}
                    placeholder="Enter new policy number..."
                    required
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="customer-meta-item">
                    <label className="customer-meta-label">Start Date *</label>
                    <input
                      type="date"
                      className="rn-input"
                      value={renewForm.startDate}
                      onChange={(e) => setRenewForm({ ...renewForm, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="customer-meta-item">
                    <label className="customer-meta-label">Expiry Date *</label>
                    <input
                      type="date"
                      className="rn-input"
                      value={renewForm.expiryDate}
                      onChange={(e) => setRenewForm({ ...renewForm, expiryDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="customer-meta-item">
                  <label className="customer-meta-label">New Premium *</label>
                  <input
                    type="text"
                    className="rn-input"
                    style={{ width: "100%" }}
                    value={renewForm.premium}
                    onChange={(e) => setRenewForm({ ...renewForm, premium: e.target.value })}
                    placeholder="e.g. 15450"
                    required
                  />
                </div>
                <div className="customer-meta-item">
                  <label className="customer-meta-label">Renewal Remark / Note</label>
                  <input
                    type="text"
                    className="rn-input"
                    style={{ width: "100%" }}
                    value={renewForm.remark}
                    onChange={(e) => setRenewForm({ ...renewForm, remark: e.target.value })}
                    placeholder="e.g. Renewed with 10% NCB benefit"
                  />
                </div>
              </div>
              <div
                className="tb-modal-footer"
                style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "12px" }}
              >
                <button type="button" className="rn-btn" onClick={() => setRenewModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="rn-btn rn-btn-primary" disabled={actionLoading}>
                  {actionLoading ? "Processing..." : "Complete Renewal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Mark Lost */}
      {lostModalOpen && selectedPolicy && (
        <div className="tb-modal-backdrop" onClick={() => setLostModalOpen(false)}>
          <div className="tb-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="tb-modal-header">
              <h3 style={{ color: "var(--rn-danger)" }}>Mark Renewal as Lost</h3>
              <button
                onClick={() => setLostModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={submitLost}>
              <div
                className="tb-modal-body"
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}
              >
                <div style={{ fontSize: "13px", color: "var(--rn-text-secondary)" }}>
                  Marking policy for <strong>{selectedPolicy.insuredName}</strong> as Lost.
                </div>
                <div className="customer-meta-item">
                  <label className="customer-meta-label">Lost Reason *</label>
                  <select
                    className="rn-input"
                    style={{ width: "100%" }}
                    value={lostForm.lostReason}
                    onChange={(e) => setLostForm({ ...lostForm, lostReason: e.target.value })}
                  >
                    <option value="Premium High">Premium High</option>
                    <option value="Moved Insurer">Moved Insurer</option>
                    <option value="No Response">No Response</option>
                    <option value="Business Closed">Business Closed</option>
                    <option value="Coverage Issue">Coverage Issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="customer-meta-item">
                  <label className="customer-meta-label">Remarks / Description</label>
                  <textarea
                    className="rn-input"
                    style={{ minHeight: "80px", width: "100%" }}
                    value={lostForm.remarks}
                    onChange={(e) => setLostForm({ ...lostForm, remarks: e.target.value })}
                    placeholder="Enter details on why renewal was lost..."
                  />
                </div>
              </div>
              <div
                className="tb-modal-footer"
                style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "12px" }}
              >
                <button type="button" className="rn-btn" onClick={() => setLostModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="rn-btn rn-btn-danger" disabled={actionLoading}>
                  {actionLoading ? "Saving..." : "Mark Lost"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
