"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { 
  Phone, 
  MessageSquare, 
  ArrowLeft
} from "lucide-react";

export default function CustomerProfilePage(props) {
  const params = use(props.params);
  const router = useRouter();
  const phone = params.id;

  // Data state
  const [profile, setProfile] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [stats, setStats] = useState({ totalPremium: 0, totalSumInsured: 0, totalPolicies: 0, policiesDue: 0 });
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal actions state
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [lostModalOpen, setLostModalOpen] = useState(false);
  
  // Modal Fields
  const [remarkForm, setRemarkForm] = useState({ text: "", nextFollowUpDate: "", status: "Follow-Up", mode: "Call", priority: "Normal", nextAction: "" });
  const [renewForm, setRenewForm] = useState({ policyNumber: "", startDate: "", expiryDate: "", premium: "", remark: "" });
  const [lostForm, setLostForm] = useState({ lostReason: "Premium High", remarks: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCustomerProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/renewals/customers/${phone}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(data.profile);
        setPolicies(data.policies || []);
        setStats(data.stats);
        setTimeline(data.timeline || []);
      }
    } catch (error) {
      console.error("Failed to load customer profile details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerProfile();
  }, [phone]);

  const handleCall = () => {
    if (profile && profile.phone && !profile.phone.startsWith("NO-MOBILE-")) {
      window.open(`tel:${profile.phone}`);
    } else {
      window.alert("No contact number available.");
    }
  };

  const handleWhatsApp = () => {
    if (profile && profile.phone && !profile.phone.startsWith("NO-MOBILE-")) {
      window.open(`https://wa.me/91${profile.phone.replace(/[^0-9]/g, "")}`, "_blank");
    } else {
      window.alert("No contact number available.");
    }
  };

  // Submit Remark
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
        await fetchCustomerProfile();
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

  // Submit Renew
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
            remark: renewForm.remark
          }
        })
      });
      if (res.ok) {
        setRenewModalOpen(false);
        setRenewForm({ policyNumber: "", startDate: "", expiryDate: "", premium: "", remark: "" });
        await fetchCustomerProfile();
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
        await fetchCustomerProfile();
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

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <p>Loading customer renewal profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Customer portfolio profile not found.</p>
        <button className="rn-btn" onClick={() => router.push("/dashboard/renewals/customers")}>Back to Customers</button>
      </div>
    );
  }

  const isNoMobile = phone.startsWith("NO-MOBILE-");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Back button */}
      <div>
        <button 
          className="rn-btn" 
          onClick={() => router.push("/dashboard/renewals/customers")}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <ArrowLeft size={14} /> Back to Portfolios
        </button>
      </div>

      <div className="customer-profile-layout">
        {/* Left Column: Customer summary & KPIs */}
        <div className="customer-summary-panel">
          <h3 className="customer-profile-title">{profile.name || "Client Details"}</h3>
          
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="rn-btn" style={{ flex: 1 }} onClick={handleCall} disabled={isNoMobile}><Phone size={14} /> Call</button>
            <button className="rn-btn" style={{ flex: 1 }} onClick={handleWhatsApp} disabled={isNoMobile}><MessageSquare size={14} /> WhatsApp</button>
          </div>

          <div style={{ borderTop: "1px solid var(--rn-border-light)", paddingTop: "16px" }} />
          
          <div className="customer-meta-item">
            <span className="customer-meta-label">Mobile Number</span>
            <span className="customer-meta-value">{isNoMobile ? "Not Available" : profile.phone}</span>
          </div>

          <div className="customer-meta-item">
            <span className="customer-meta-label">Email Address</span>
            <span className="customer-meta-value">{profile.email || "-"}</span>
          </div>

          <div className="customer-meta-item">
            <span className="customer-meta-label">Address</span>
            <span className="customer-meta-value">{profile.address || "-"}</span>
          </div>

          <div className="customer-meta-item">
            <span className="customer-meta-label">Assigned Agent</span>
            <span className="customer-meta-value">{profile.assignedTo || "Unassigned"}</span>
          </div>

          <div style={{ borderTop: "1px solid var(--rn-border-light)", paddingTop: "16px" }} />

          <div className="customer-meta-item">
            <span className="customer-meta-label">Total Premium (Booked)</span>
            <span className="customer-meta-value" style={{ fontWeight: "700" }}>₹{stats.totalPremium.toLocaleString("en-IN")}</span>
          </div>

          <div className="customer-meta-item">
            <span className="customer-meta-label">Total Sum Insured</span>
            <span className="customer-meta-value">₹{stats.totalSumInsured.toLocaleString("en-IN")}</span>
          </div>

          <div className="customer-meta-item">
            <span className="customer-meta-label">Total policies</span>
            <span className="customer-meta-value">{stats.totalPolicies} ({stats.policiesDue} due)</span>
          </div>
        </div>

        {/* Right Column: Policies and Timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {/* Policy List Panel */}
          <div className="rn-table-container">
            <div style={{ padding: "16px", borderBottom: "1px solid var(--rn-border)" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--rn-text-primary)", margin: 0 }}>Associated Policies</h3>
            </div>
            <table className="rn-table">
              <thead>
                <tr>
                  <th>Policy Details</th>
                  <th>Underwriter / Company</th>
                  <th>Premium</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => {
                  const isClosed = ["RENEWED", "LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(p.renewalStatus);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: "600", color: "var(--rn-text-primary)" }}>{p.displayPolicyType || p.policyType}</div>
                        <div style={{ fontSize: "12px", color: "var(--rn-text-muted)" }}>No: {p.policyNumber}</div>
                      </td>
                      <td>{p.insuranceCompany}</td>
                      <td>₹{p.premium || p.totalPremium || "0"}</td>
                      <td>{p.expiryDate || "-"}</td>
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
          </div>

          {/* Timeline Panel */}
          <div className="rn-table-container" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--rn-text-primary)", margin: "0 0 20px 0" }}>Renewal timeline</h3>
            
            {timeline.length === 0 ? (
              <p style={{ color: "var(--rn-text-secondary)", fontSize: "14px", margin: 0 }}>No comments or timeline logs recorded.</p>
            ) : (
              <div className="rn-timeline">
                {timeline.map((item) => (
                  <div key={item.id} className="rn-timeline-item">
                    <div className={`rn-timeline-dot ${
                      item.newStatus === "RENEWED" ? "renewed" : 
                      ["LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(item.newStatus) ? "lost" : ""
                    }`} />
                    <div className="rn-timeline-content">
                      <div className="rn-timeline-header">
                        <span className="rn-timeline-author">{item.createdBy}</span>
                        <span>{new Date(item.createdAt).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="rn-timeline-body">
                        <div style={{ marginBottom: "4px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--rn-text-muted)" }}>POLICY: {item.policyType} ({item.policyNumber})</span>
                        </div>
                        <p style={{ margin: "4px 0 8px 0" }}>{item.text}</p>
                        {item.nextFollowUpDate && (
                          <div style={{ fontSize: "11px", color: "var(--rn-primary)", fontWeight: "500" }}>
                            Next Follow-Up scheduled for: {item.nextFollowUpDate} via {item.followUpMode || "Call"}
                          </div>
                        )}
                        <div style={{ marginTop: "6px" }}>
                          <span className="rn-timeline-badge" style={{ backgroundColor: "var(--rn-border-light)", color: "var(--rn-text-secondary)" }}>
                            {item.oldStatus} &rarr; {item.newStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals are portaled/rendered here */}
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
