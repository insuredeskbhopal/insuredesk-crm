"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, MessageSquare, AlertCircle } from "lucide-react";
import { formatPhoneForWhatsapp } from "@/lib/customer-profiles/utils";
import ModalPortal from "@/app/components/shared/ModalPortal";

const PAGE_SIZE = 25;

export default function FollowUpsPage() {
  // Data state
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("today"); // today, tomorrow, this_week, overdue
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterCounts, setFilterCounts] = useState({
    today: 0,
    tomorrow: 0,
    this_week: 0,
    overdue: 0,
  });
  const requestRef = useRef(null);

  // Modal actions state
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [remarkForm, setRemarkForm] = useState({
    text: "",
    nextFollowUpDate: "",
    status: "Follow-Up",
    mode: "Call",
    priority: "Normal",
    nextAction: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFollowUps = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new window.AbortController();
    requestRef.current = controller;

    try {
      setLoading(true);
      const params = new window.URLSearchParams({
        filter: activeFilter,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/renewals/follow-ups?${params}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load follow-ups.");

      const nextTotalPages = Math.max(1, Number(data.pages) || 1);
      if (page > nextTotalPages) {
        setPage(nextTotalPages);
        return;
      }

      setPolicies(Array.isArray(data.followUps) ? data.followUps : []);
      setTotalCount(Number(data.totalCount) || 0);
      setTotalPages(nextTotalPages);
      setFilterCounts((current) => ({ ...current, ...(data.filterCounts || {}) }));
    } catch (error) {
      if (error.name !== "AbortError") console.error("Failed to load follow-ups:", error);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }, [activeFilter, page]);

  useEffect(() => {
    fetchFollowUps();
    return () => requestRef.current?.abort();
  }, [fetchFollowUps]);

  const handleCall = (policy) => {
    const phone = policy.renewalRecipientMobile || policy.contactNumber || "";
    if (phone) {
      window.open(`tel:${phone}`);
    } else {
      window.alert("No contact number available.");
    }
  };

  const handleWhatsApp = async (policy) => {
    const phone = policy.renewalRecipientMobile || policy.contactNumber || "";
    if (phone) {
      const whatsappPhone = formatPhoneForWhatsapp(phone);
      if (!whatsappPhone) {
        window.alert("Invalid mobile number format.");
        return;
      }
      const message = `Hello ${policy.insuredName}, following up regarding your policy ${policy.policyNumber} renewal. Let us know if you need assistance.`;
      try {
        const res = await fetch("/api/operations/whatsapp/test-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: whatsappPhone, message }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          window.alert(`WhatsApp message sent successfully to ${policy.insuredName}!`);
        } else {
          window.alert(`Failed to send WhatsApp message: ${data.error || "Unknown error"}`);
        }
      } catch {
        window.alert("Failed to connect to the CRM WhatsApp API.");
      }
    } else {
      window.alert("No contact number available.");
    }
  };

  // Complete Follow-up (Set status to Completed)
  const handleCompleteFollowUp = async (policy) => {
    if (!window.confirm("Are you sure you want to complete this follow-up task?")) return;

    try {
      setLoading(true);
      const res = await fetch("/api/renewals/remarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: policy.id,
          remark: "Follow-up marked as Completed.",
          nextFollowUpDate: "",
          followUpStatus: "Called", // change to Called/Pending as resolved follow-up state
          followUpMode: "Call",
          priority: "Normal",
          nextAction: "",
        }),
      });
      if (res.ok) {
        await fetchFollowUps();
      } else {
        const err = await res.json();
        window.alert(err.error || "Failed to update follow-up.");
      }
    } catch {
      window.alert("Failed to update follow-up.");
    } finally {
      setLoading(false);
    }
  };

  const submitReschedule = async (e) => {
    e.preventDefault();
    if (!remarkForm.text.trim() || !remarkForm.nextFollowUpDate) {
      window.alert("Remarks and next follow-up date are required to reschedule.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/renewals/remarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: selectedPolicy.id,
          remark: remarkForm.text,
          nextFollowUpDate: remarkForm.nextFollowUpDate,
          followUpStatus: "Follow-Up",
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
        await fetchFollowUps();
      } else {
        const err = await res.json();
        window.alert(err.error || "Failed to reschedule follow-up.");
      }
    } catch {
      window.alert("Failed to reschedule follow-up.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Pills filter row */}
      <div className="rn-filters-bar">
        {[
          { key: "today", label: "Scheduled Today" },
          { key: "tomorrow", label: "Scheduled Tomorrow" },
          { key: "this_week", label: "Scheduled This Week" },
          { key: "overdue", label: "Overdue Follow-ups" },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            className={`rn-btn ${activeFilter === f.key ? "rn-btn-primary" : ""}`}
            onClick={() => {
              setPage(1);
              setActiveFilter(f.key);
            }}
            disabled={loading && activeFilter === f.key}
          >
            {f.label} ({filterCounts[f.key] || 0})
          </button>
        ))}
      </div>

      {/* Main Grid Table */}
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
            {activeFilter === "today" && "Today's Follow-Ups"}
            {activeFilter === "tomorrow" && "Tomorrow's Follow-Ups"}
            {activeFilter === "this_week" && "This Week's Follow-Ups"}
            {activeFilter === "overdue" && "Overdue Follow-Ups"}
          </h3>
          <span style={{ fontSize: "12px", color: "var(--rn-text-secondary)" }}>
            {totalCount} tasks scheduled
          </span>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <p>Loading follow-ups...</p>
          </div>
        ) : policies.length === 0 ? (
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
              No follow-up tasks for this category.
            </p>
          </div>
        ) : (
          <table className="rn-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Policy Number</th>
                <th>Insurance Company</th>
                <th>Follow-Up Date</th>
                <th>Last Remark</th>
                <th>Assigned User</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: "600", color: "var(--rn-text-primary)" }}>{p.insuredName}</div>
                    <div style={{ fontSize: "12px", color: "var(--rn-text-muted)" }}>
                      {p.renewalRecipientMobile || p.contactNumber || "No Mobile"}
                    </div>
                  </td>
                  <td>{p.policyNumber}</td>
                  <td>{p.insuranceCompany}</td>
                  <td>
                    <div
                      style={{
                        fontWeight: "500",
                        color: activeFilter === "overdue" ? "var(--rn-danger)" : "var(--rn-text-primary)",
                      }}
                    >
                      {p.nextFollowUpDate || "-"}
                    </div>
                  </td>
                  <td>{p.latestRemark || "-"}</td>
                  <td>{p.assignedTo || "Unassigned"}</td>
                  <td style={{ textAlign: "right" }}>
                    <div className="rn-table-actions" style={{ justifyContent: "flex-end" }}>
                      <button className="rn-btn" onClick={() => handleCall(p)} title="Call Client">
                        <Phone size={13} />
                      </button>
                      <button className="rn-btn" onClick={() => handleWhatsApp(p)} title="WhatsApp">
                        <MessageSquare size={13} />
                      </button>
                      <button
                        className="rn-btn rn-btn-primary"
                        onClick={() => handleCompleteFollowUp(p)}
                        title="Mark Complete"
                      >
                        Complete
                      </button>
                      <button
                        className="rn-btn"
                        onClick={() => {
                          setSelectedPolicy(p);
                          setRemarkModalOpen(true);
                        }}
                        title="Reschedule Task"
                      >
                        Reschedule
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="rn-pagination">
          <span>
            Page {page} of {totalPages} ({totalCount} follow-up tasks)
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="rn-btn"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="rn-btn"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Reschedule Follow-Up */}
      {remarkModalOpen && selectedPolicy && (
        <ModalPortal>
          <div className="tb-modal-backdrop" onClick={() => setRemarkModalOpen(false)}>
          <div className="tb-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="tb-modal-header">
              <h3>Reschedule Follow-Up</h3>
              <button
                onClick={() => setRemarkModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={submitReschedule}>
              <div
                className="tb-modal-body"
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}
              >
                <div style={{ fontSize: "13px", color: "var(--rn-text-secondary)" }}>
                  Rescheduling follow-up for <strong>{selectedPolicy.insuredName}</strong>
                </div>
                <div className="customer-meta-item">
                  <label className="customer-meta-label">New Remarks *</label>
                  <textarea
                    className="rn-input"
                    style={{ minHeight: "80px", width: "100%" }}
                    value={remarkForm.text}
                    onChange={(e) => setRemarkForm({ ...remarkForm, text: e.target.value })}
                    placeholder="Enter details on reschedule reason/action..."
                    required
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="customer-meta-item">
                    <label className="customer-meta-label">New Follow-Up Date *</label>
                    <input
                      type="datetime-local"
                      className="rn-input"
                      value={remarkForm.nextFollowUpDate}
                      onChange={(e) => setRemarkForm({ ...remarkForm, nextFollowUpDate: e.target.value })}
                      required
                    />
                  </div>
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
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                    </select>
                  </div>
                  <div className="customer-meta-item">
                    <label className="customer-meta-label">Next Action Task (Optional)</label>
                    <input
                      type="text"
                      className="rn-input"
                      style={{ width: "100%" }}
                      value={remarkForm.nextAction}
                      onChange={(e) => setRemarkForm({ ...remarkForm, nextAction: e.target.value })}
                      placeholder="e.g. Call client regarding quote validation"
                    />
                  </div>
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
                  {actionLoading ? "Saving..." : "Reschedule"}
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
