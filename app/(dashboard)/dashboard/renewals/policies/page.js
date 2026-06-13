"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Search, 
  Phone, 
  MessageSquare, 
  ChevronRight, 
  AlertCircle
} from "lucide-react";

function PolicyRenewalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters from URL/State
  const initialTab = searchParams.get("tab") || "upcoming";
  const initialCompany = searchParams.get("company") || "All";
  const initialPolicyType = searchParams.get("policyType") || "All";

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState(initialTab);
  const [selectedCompany, setSelectedCompany] = useState(initialCompany);
  const [selectedPolicyType, setSelectedPolicyType] = useState(initialPolicyType);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [lostModalOpen, setLostModalOpen] = useState(false);

  // Modal Forms
  const [remarkForm, setRemarkForm] = useState({ text: "", nextFollowUpDate: "", status: "Follow-Up", mode: "Call", priority: "Normal", nextAction: "" });
  const [renewForm, setRenewForm] = useState({ policyNumber: "", startDate: "", expiryDate: "", premium: "", remark: "" });
  const [lostForm, setLostForm] = useState({ lostReason: "Premium High", remarks: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const url = `/api/renewals/policies?tab=${tab}&company=${encodeURIComponent(selectedCompany)}&policyType=${encodeURIComponent(selectedPolicyType)}&q=${encodeURIComponent(q)}&page=${page}&limit=10`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.policies) {
        setPolicies(data.policies);
        setTotalPages(data.pages || 1);
        setTotalCount(data.totalCount || 0);
      }
    } catch (error) {
      console.error("Failed to load policy renewals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [page, tab, selectedCompany, selectedPolicyType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPolicies();
  };

  const handleCall = (policy) => {
    const phoneNum = policy.contactNumber || "";
    if (phoneNum) {
      window.open(`tel:${phoneNum}`);
    } else {
      alert("No contact number available.");
    }
  };

  const handleWhatsApp = (policy) => {
    const phoneNum = policy.contactNumber || "";
    if (phoneNum) {
      const message = `Hello ${policy.insuredName}, your policy ${policy.policyNumber} is expiring on ${policy.expiryDate}. Please contact us for renewals.`;
      window.open(`https://wa.me/91${phoneNum.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
    } else {
      alert("No contact number available.");
    }
  };

  // Log follow up / remark
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
          nextAction: remarkForm.nextAction
        })
      });
      if (res.ok) {
        setRemarkModalOpen(false);
        setRemarkForm({ text: "", nextFollowUpDate: "", status: "Follow-Up", mode: "Call", priority: "Normal", nextAction: "" });
        await fetchPolicies();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit remark.");
      }
    } catch {
      alert("Failed to submit remark.");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Renew
  const submitRenew = async (e) => {
    e.preventDefault();
    if (!renewForm.policyNumber || !renewForm.startDate || !renewForm.expiryDate || !renewForm.premium) {
      alert("All fields are required.");
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
            remark: renewForm.remark
          }
        })
      });
      if (res.ok) {
        setRenewModalOpen(false);
        setRenewForm({ policyNumber: "", startDate: "", expiryDate: "", premium: "", remark: "" });
        await fetchPolicies();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to renew policy.");
      }
    } catch {
      alert("Failed to renew policy.");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Lost
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
          remarks: lostForm.remarks
        })
      });
      if (res.ok) {
        setLostModalOpen(false);
        setLostForm({ lostReason: "Premium High", remarks: "" });
        await fetchPolicies();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to mark policy as lost.");
      }
    } catch {
      alert("Failed to mark policy as lost.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Filters bar */}
      <form onSubmit={handleSearchSubmit} className="rn-filters-bar">
        <div style={{ display: "flex", alignItems: "center", position: "relative", flex: 1 }}>
          <Search size={16} style={{ position: "absolute", left: "12px", color: "var(--rn-text-muted)" }} />
          <input 
            type="text" 
            className="rn-input" 
            style={{ paddingLeft: "36px", width: "100%" }}
            placeholder="Search by policy number, name, phone..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select 
          className="rn-input"
          value={tab}
          onChange={(e) => { setTab(e.target.value); setPage(1); }}
        >
          <option value="upcoming">Active Renewal Queue</option>
          <option value="due_7">Due In 7 Days</option>
          <option value="due_15">Due In 15 Days</option>
          <option value="due_30">Due In 30 Days</option>
          <option value="overdue">Overdue Policies</option>
          <option value="all">All Policy States</option>
        </select>

        <select 
          className="rn-input"
          value={selectedCompany}
          onChange={(e) => { setSelectedCompany(e.target.value); setPage(1); }}
        >
          <option value="All">All Companies</option>
          <option value="ICICI Lombard">ICICI Lombard</option>
          <option value="TATA AIG">TATA AIG</option>
          <option value="New India">New India Assurance</option>
          <option value="IFFCO Tokio">IFFCO Tokio</option>
          <option value="HDFC ERGO">HDFC ERGO</option>
          <option value="Bajaj Allianz">Bajaj Allianz</option>
          <option value="Digit">Digit Insurance</option>
        </select>

        <select 
          className="rn-input"
          value={selectedPolicyType}
          onChange={(e) => { setSelectedPolicyType(e.target.value); setPage(1); }}
        >
          <option value="All">All Types</option>
          <option value="Motor">Motor</option>
          <option value="Health">Health</option>
          <option value="Life">Life</option>
          <option value="Fire">Fire</option>
          <option value="Marine">Marine</option>
        </select>

        <button type="submit" className="rn-btn rn-btn-primary">Search</button>
      </form>

      {/* Main Grid Table */}
      <div className="rn-table-container">
        <div style={{ padding: "16px", borderBottom: "1px solid var(--rn-border)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--rn-text-primary)", margin: 0 }}>
            Policy Renewals
          </h3>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <p>Loading policies list...</p>
          </div>
        ) : policies.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: "8px" }}>
            <AlertCircle size={24} style={{ color: "var(--rn-text-muted)" }} />
            <p style={{ color: "var(--rn-text-secondary)", fontSize: "14px" }}>No policy renewals found matching filters.</p>
          </div>
        ) : (
          <table className="rn-table">
            <thead>
              <tr>
                <th>Policy Number</th>
                <th>Customer</th>
                <th>Insurance Company</th>
                <th>Policy Type</th>
                <th>Premium</th>
                <th>Expiry Date</th>
                <th>Days Left</th>
                <th>Assigned User</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => {
                const daysLeft = p.daysRemaining !== undefined ? p.daysRemaining : 0;
                const isClosed = ["RENEWED", "LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(p.renewalStatus);
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: "600", color: "var(--rn-text-primary)" }}>{p.policyNumber || "N/A"}</td>
                    <td>
                      <div style={{ fontWeight: "500" }}>{p.insuredName}</div>
                      <div style={{ fontSize: "11px", color: "var(--rn-text-muted)" }}>{p.contactNumber || "No Mobile"}</div>
                    </td>
                    <td>{p.insuranceCompany}</td>
                    <td>{p.displayPolicyType || p.policyType}</td>
                    <td>₹{p.premium || p.totalPremium || "0"}</td>
                    <td>{p.expiryDate || "-"}</td>
                    <td>
                      {daysLeft < 0 ? (
                        <span style={{ color: "var(--rn-danger)", fontWeight: "500" }}>Overdue {Math.abs(daysLeft)}</span>
                      ) : (
                        <span>{daysLeft} days</span>
                      )}
                    </td>
                    <td>{p.assignedTo || "Unassigned"}</td>
                    <td>
                      <span className={`rn-badge ${
                        p.renewalStatus === "RENEWED" ? "rn-badge-success" :
                        ["LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(p.renewalStatus) ? "rn-badge-danger" :
                        p.renewalStatus === "Follow-Up" ? "rn-badge-warning" : "rn-badge-active"
                      }`}>
                        {p.renewalStatus || "ACTIVE"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="rn-table-actions" style={{ justifyContent: "flex-end" }}>
                        <button className="rn-btn" onClick={() => handleCall(p)} title="Call Client"><Phone size={13} /></button>
                        <button className="rn-btn" onClick={() => handleWhatsApp(p)} title="WhatsApp"><MessageSquare size={13} /></button>
                        <button className="rn-btn" onClick={() => { setSelectedPolicy(p); setRemarkModalOpen(true); }} disabled={isClosed}>F/Up</button>
                        <button className="rn-btn rn-btn-primary" onClick={() => { setSelectedPolicy(p); setRenewModalOpen(true); }} disabled={isClosed}>Renew</button>
                        <button className="rn-btn rn-btn-danger" onClick={() => { setSelectedPolicy(p); setLostModalOpen(true); }} disabled={isClosed}>Lost</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="rn-pagination">
          <span style={{ fontSize: "13px", color: "var(--rn-text-secondary)" }}>
            Page {page} of {totalPages} ({totalCount} policies total)
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              className="rn-btn" 
              disabled={page <= 1 || loading} 
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <button 
              className="rn-btn" 
              disabled={page >= totalPages || loading} 
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Action Modals */}
      {/* MODAL: Log Follow-Up / Remark */}
      {remarkModalOpen && selectedPolicy && (
        <div className="tb-modal-backdrop" onClick={() => setRemarkModalOpen(false)}>
          <div className="tb-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="tb-modal-header">
              <h3>Log Follow-Up & Remark</h3>
              <button onClick={() => setRemarkModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}>&times;</button>
            </div>
            <form onSubmit={submitRemark}>
              <div className="tb-modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ fontSize: "13px", color: "var(--rn-text-secondary)" }}>
                  Recording follow-up for <strong>{selectedPolicy.insuredName}</strong> (Policy: {selectedPolicy.policyNumber})
                </div>
                <div className="customer-meta-item">
                  <label className="customer-meta-label">Remark Text *</label>
                  <textarea 
                    className="rn-input" 
                    style={{ minHeight: "80px", width: "100%" }}
                    value={remarkForm.text} 
                    onChange={(e) => setRemarkForm({...remarkForm, text: e.target.value})}
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
                      onChange={(e) => setRemarkForm({...remarkForm, status: e.target.value})}
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
                      onChange={(e) => setRemarkForm({...remarkForm, nextFollowUpDate: e.target.value})}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="customer-meta-item">
                    <label className="customer-meta-label">Follow-Up Mode</label>
                    <select 
                      className="rn-input"
                      value={remarkForm.mode} 
                      onChange={(e) => setRemarkForm({...remarkForm, mode: e.target.value})}
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
                      onChange={(e) => setRemarkForm({...remarkForm, priority: e.target.value})}
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
                    onChange={(e) => setRemarkForm({...remarkForm, nextAction: e.target.value})}
                    placeholder="e.g. Share health quote tomorrow"
                  />
                </div>
              </div>
              <div className="tb-modal-footer" style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button type="button" className="rn-btn" onClick={() => setRemarkModalOpen(false)}>Cancel</button>
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
              <button onClick={() => setRenewModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}>&times;</button>
            </div>
            <form onSubmit={submitRenew}>
              <div className="tb-modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ fontSize: "13px", color: "var(--rn-text-secondary)" }}>
                  Creating renewal policy for <strong>{selectedPolicy.insuredName}</strong> (Old Policy: {selectedPolicy.policyNumber})
                </div>
                <div className="customer-meta-item">
                  <label className="customer-meta-label">New Policy Number *</label>
                  <input 
                    type="text" 
                    className="rn-input" 
                    style={{ width: "100%" }}
                    value={renewForm.policyNumber} 
                    onChange={(e) => setRenewForm({...renewForm, policyNumber: e.target.value})}
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
                      onChange={(e) => setRenewForm({...renewForm, startDate: e.target.value})}
                      required
                    />
                  </div>
                  <div className="customer-meta-item">
                    <label className="customer-meta-label">Expiry Date *</label>
                    <input 
                      type="date" 
                      className="rn-input" 
                      value={renewForm.expiryDate}
                      onChange={(e) => setRenewForm({...renewForm, expiryDate: e.target.value})}
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
                    onChange={(e) => setRenewForm({...renewForm, premium: e.target.value})}
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
                    onChange={(e) => setRenewForm({...renewForm, remark: e.target.value})}
                    placeholder="e.g. Renewed with 10% NCB benefit"
                  />
                </div>
              </div>
              <div className="tb-modal-footer" style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button type="button" className="rn-btn" onClick={() => setRenewModalOpen(false)}>Cancel</button>
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
              <button onClick={() => setLostModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}>&times;</button>
            </div>
            <form onSubmit={submitLost}>
              <div className="tb-modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ fontSize: "13px", color: "var(--rn-text-secondary)" }}>
                  Marking policy for <strong>{selectedPolicy.insuredName}</strong> as Lost.
                </div>
                <div className="customer-meta-item">
                  <label className="customer-meta-label">Lost Reason *</label>
                  <select 
                    className="rn-input"
                    style={{ width: "100%" }}
                    value={lostForm.lostReason}
                    onChange={(e) => setLostForm({...lostForm, lostReason: e.target.value})}
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
                    onChange={(e) => setLostForm({...lostForm, remarks: e.target.value})}
                    placeholder="Enter details on why renewal was lost..."
                  />
                </div>
              </div>
              <div className="tb-modal-footer" style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button type="button" className="rn-btn" onClick={() => setLostModalOpen(false)}>Cancel</button>
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

export default function PolicyRenewalsPage() {
  return (
    <Suspense fallback={<p>Loading Policy Renewals content...</p>}>
      <PolicyRenewalsContent />
    </Suspense>
  );
}
