"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ModalPortal from "@/app/components/shared/ModalPortal";

const PAGE_SIZE = 25;

export default function DailyWorkPage() {
  const router = useRouter();

  // Data State
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCardFilter, setActiveCardFilter] = useState("all_work"); // all_work, due_today, followup_today, overdue_followup, completed_today
  const [activeDropdownRowId, setActiveDropdownRowId] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState(null);
  const [activeLobFilter, setActiveLobFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [lobCounts, setLobCounts] = useState({ all: 0, motor: 0, warehouse: 0, other: 0 });
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const countsKeyRef = useRef("");

  // Counters
  const [counts, setCounts] = useState({
    allWork: 0,
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

  useEffect(() => {
    const controller = new window.AbortController();
    const countsKey = `${activeCardFilter}:${activeLobFilter}:${refreshKey}`;
    const includeCounts = countsKeyRef.current !== countsKey;

    const fetchDailyWork = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const params = new window.URLSearchParams({
          filter: activeCardFilter,
          lob: activeLobFilter,
          page: String(page),
          limit: String(PAGE_SIZE),
          includeCounts: String(includeCounts),
        });
        const response = await fetch(`/api/renewals/daily-work?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Daily work could not be loaded.");

        setPolicies(payload.policies || []);
        if (payload.summaryCounts) setCounts(payload.summaryCounts);
        if (payload.categoryCounts) setLobCounts(payload.categoryCounts);
        if (payload.totalCount !== undefined) setTotalCount(payload.totalCount || 0);
        if (payload.pages !== undefined) {
          const nextTotalPages = payload.pages || 1;
          setTotalPages(nextTotalPages);
          if (page > nextTotalPages) setPage(nextTotalPages);
        }
        if (includeCounts) countsKeyRef.current = countsKey;
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Failed to fetch daily work records:", error);
          setLoadError(error.message || "Daily work could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchDailyWork();
    return () => controller.abort();
  }, [activeCardFilter, activeLobFilter, page, refreshKey]);

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

  // Actions
  const handleViewProfile = (policy) => {
    const portfolioKey = policy.customerPortfolioId || policy.contactNumber || "";
    if (!portfolioKey) {
      window.alert("No customer portfolio associated with this policy.");
      return;
    }
    router.push(`/dashboard/renewals/customers/${encodeURIComponent(portfolioKey)}`);
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
        setRefreshKey((current) => current + 1);
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

    try {
      setActionLoading(true);
      const res = await fetch("/api/renewals/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previousPolicyId: selectedPolicy.id,
          renewedData: {
            remark: renewForm.remark,
          },
        }),
      });
      if (res.ok) {
        setRenewModalOpen(false);
        setRenewForm({ policyNumber: "", startDate: "", expiryDate: "", premium: "", remark: "" });
        router.push("/bulk-upload");
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
        setRefreshKey((current) => current + 1);
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

  const filtered = policies;
  const selectCardFilter = (nextFilter) => {
    setActiveCardFilter(nextFilter);
    setActiveLobFilter("all");
    setPage(1);
    closeActionMenu();
  };
  const selectLobFilter = (nextLob) => {
    setActiveLobFilter(nextLob);
    setPage(1);
    closeActionMenu();
  };

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
            count: counts.allWork,
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
            onClick={() => selectCardFilter(card.key)}
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
            {totalCount.toLocaleString("en-IN")} records found
          </span>
        </div>

        {/* LOB Category filter tabs */}
        <div className="rn-lob-tabs">
          <button
            className={activeLobFilter === "all" ? "active" : ""}
            type="button"
            onClick={() => selectLobFilter("all")}
          >
            All Tasks
            <span>{lobCounts.all}</span>
          </button>
          <button
            className={activeLobFilter === "motor" ? "active" : ""}
            type="button"
            onClick={() => selectLobFilter("motor")}
          >
            Motor Policy
            <span>{lobCounts.motor}</span>
          </button>
          <button
            className={activeLobFilter === "warehouse" ? "active" : ""}
            type="button"
            onClick={() => selectLobFilter("warehouse")}
          >
            Warehouse Policy
            <span>{lobCounts.warehouse}</span>
          </button>
          <button
            className={activeLobFilter === "other" ? "active" : ""}
            type="button"
            onClick={() => selectLobFilter("other")}
          >
            Other Policies
            <span>{lobCounts.other}</span>
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <p>Loading daily tasks...</p>
          </div>
        ) : loadError ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 16px" }}>
            <p style={{ color: "var(--rn-danger)", margin: 0 }}>{loadError}</p>
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
                        {policy.renewalRecipientMobile || policy.contactNumber || "No Mobile"}
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
        {!loadError && (
          <footer className="rn-pagination" style={{ padding: "12px 16px" }}>
            <span>
              Page {page} of {totalPages} · {totalCount.toLocaleString("en-IN")} task rows
            </span>
            <div>
              <button
                type="button"
                className="rn-btn"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <button
                type="button"
                className="rn-btn"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </footer>
        )}
      </div>

      {/* MODAL: Log Follow-Up / Remark */}
      {remarkModalOpen && selectedPolicy && (
        <ModalPortal>
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
                      type="datetime-local"
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
        </ModalPortal>
      )}

      {/* MODAL: Renew Policy */}
      {renewModalOpen && selectedPolicy && (
        <ModalPortal>
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
                  Mark <strong>{selectedPolicy.insuredName}</strong> as renewed, then upload the renewed policy PDF.
                </div>
                <div className="customer-meta-item">
                  <label className="customer-meta-label">Renewal Remark / Note</label>
                  <input
                    type="text"
                    className="rn-input"
                    style={{ width: "100%" }}
                    value={renewForm.remark}
                    onChange={(e) => setRenewForm({ ...renewForm, remark: e.target.value })}
                    placeholder="e.g. Customer confirmed renewal"
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
                  {actionLoading ? "Processing..." : "Mark Renewed & Upload PDF"}
                </button>
              </div>
            </form>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: Mark Lost */}
      {lostModalOpen && selectedPolicy && (
        <ModalPortal>
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
        </ModalPortal>
      )}
    </div>
  );
}
