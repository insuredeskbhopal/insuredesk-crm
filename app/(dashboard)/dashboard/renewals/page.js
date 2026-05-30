"use client";

import { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { 
  MessageSquare, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  X, 
  Upload, 
  Loader2, 
  AlertTriangle,
  FileText,
  Search
} from "lucide-react";
import PageHeader from "@/app/components/layout/PageHeader";
import EmptyState from "@/app/components/shared/EmptyState";

const PAYMENT_MODE_OPTIONS = [
  { value: "", label: "Select payment mode" },
  { value: "Cash", label: "Cash" },
  { value: "Cheque", label: "Cheque" },
  { value: "UPI", label: "UPI" },
  { value: "NEFT / RTGS", label: "NEFT / RTGS" },
  { value: "Card", label: "Card" },
  { value: "Online", label: "Online" }
];

const LOST_REASON_OPTIONS = [
  { value: "", label: "Select reason for loss" },
  { value: "Competitor offered lower premium", label: "Competitor offered lower premium" },
  { value: "Sold vehicle / property", label: "Sold vehicle / property" },
  { value: "Client not reachable", label: "Client not reachable" },
  { value: "Client renewed directly with insurer", label: "Client renewed directly with insurer" },
  { value: "Dissatisfied with service", label: "Dissatisfied with service" },
  { value: "Other", label: "Other (specify in remarks)" }
];

export default function RenewalsPage() {
  const searchParams = useSearchParams();

  // Load defaults from URL search params (if clicked from dashboard counters)
  const urlTab = searchParams.get("tab") || "upcoming";
  const urlDays = searchParams.get("days") || "";

  // Dropdown states
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("All");
  const [policyTypes, setPolicyTypes] = useState([]);
  const [selectedPolicyType, setSelectedPolicyType] = useState("All");

  // Tab & search states
  const [activeTab, setActiveTab] = useState(urlTab);
  const [daysFilter, setDaysFilter] = useState(urlDays);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Policies response data
  const [policies, setPolicies] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Modals state
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [lostPolicy, setLostPolicy] = useState(null);
  const [lostReason, setLostReason] = useState("");
  const [lostRemarks, setLostRemarks] = useState("");

  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewPolicy, setRenewPolicy] = useState(null);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [pdfInfo, setPdfInfo] = useState(null);

  // Form values for renewal
  const [renewForm, setRenewForm] = useState({
    policyNumber: "",
    startDate: "",
    expiryDate: "",
    premium: "",
    sumInsured: "",
    modeOfPayment: "",
    collectedAmount: "",
    dueCollection: "",
    remark: "",
    insuredName: "",
    vehicleNumber: "",
    engineNumber: "",
    chassisNumber: ""
  });

  const [isSaving, startSaving] = useTransition();

  // Synchronise state with URL params changes (clicking on counters)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const daysParam = searchParams.get("days");
    if (tabParam) {
      setActiveTab(tabParam);
    }
    if (daysParam) {
      setDaysFilter(daysParam);
    } else {
      setDaysFilter("");
    }
  }, [searchParams]);

  // Fetch company options and policy type options initially
  useEffect(() => {
    fetchCompaniesList();
    fetchPolicyTypesList("All");
  }, []);

  // Fetch policy types whenever company filter changes
  useEffect(() => {
    fetchPolicyTypesList(selectedCompany);
  }, [selectedCompany]);

  // Reset page when tab, company, policyType, or search term changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedCompany, selectedPolicyType, q]);

  // Fetch policies when filters, page or tabs change
  useEffect(() => {
    fetchPoliciesList();
  }, [selectedCompany, selectedPolicyType, activeTab, daysFilter, q, page]);

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const fetchCompaniesList = async () => {
    try {
      const res = await fetch("/api/renewals/companies");
      const data = await res.json();
      if (res.ok) {
        setCompanies(data.companies || []);
      }
    } catch {
      setError("Failed to fetch companies list.");
    }
  };

  const fetchPolicyTypesList = async (company) => {
    try {
      const res = await fetch(`/api/renewals/policy-types?company=${encodeURIComponent(company)}`);
      const data = await res.json();
      if (res.ok) {
        setPolicyTypes(data.policyTypes || []);
      }
    } catch {
      setError("Failed to fetch policy types list.");
    }
  };

  const fetchPoliciesList = async () => {
    setLoading(true);
    setError("");
    try {
      let url = `/api/renewals/policies?company=${encodeURIComponent(selectedCompany)}&policyType=${encodeURIComponent(selectedPolicyType)}&tab=${activeTab}&q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`;
      if (daysFilter) {
        url += `&days=${daysFilter}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setPolicies(data.policies || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.pages || 1);
      } else {
        setError(data.error || "Failed to load policies.");
      }
    } catch {
      setError("Network error loading policies.");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = async (policy) => {
    if (!policy.contactNumber || !policy.contactNumber.trim()) {
      showToastMsg("WhatsApp reminder failed: No contact number exists for this customer.");
      return;
    }
    try {
      const res = await fetch("/api/renewals/whatsapp-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyId: policy.id })
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, "_blank");
        showToastMsg("WhatsApp reminder link generated.");
      } else {
        showToastMsg(data.error || "Failed to generate WhatsApp reminder.");
      }
    } catch {
      showToastMsg("Network error generating WhatsApp link.");
    }
  };

  const handleMarkLost = (policy) => {
    setLostPolicy(policy);
    setLostReason("");
    setLostRemarks("");
    setLostModalOpen(true);
  };

  const submitMarkLost = async () => {
    if (!lostPolicy) return;
    if (!lostReason) {
      showToastMsg("Please select a reason for marking as lost.");
      return;
    }
    try {
      const res = await fetch("/api/renewals/lost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          policyId: lostPolicy.id, 
          lostReason, 
          remarks: lostRemarks 
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToastMsg("Policy marked as Lost.");
        setLostModalOpen(false);
        fetchPoliciesList();
      } else {
        showToastMsg(data.error || "Failed to mark policy as lost.");
      }
    } catch {
      showToastMsg("Network error marking policy as lost.");
    }
  };

  const handleRenew = (policy) => {
    setRenewPolicy(policy);
    setPdfUploaded(false);
    setPdfInfo(null);
    setRenewForm({
      policyNumber: "",
      startDate: "",
      expiryDate: "",
      premium: "",
      sumInsured: "",
      modeOfPayment: "",
      collectedAmount: "",
      dueCollection: "",
      remark: "",
      insuredName: policy.insuredName || "",
      vehicleNumber: policy.vehicleNumber || "",
      engineNumber: policy.engineNumber || "",
      chassisNumber: policy.chassisNumber || ""
    });
    setRenewModalOpen(true);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExtractingPdf(true);
    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/renewals/extract-pdf", {
        method: "POST",
        body
      });
      const data = await res.json();

      if (res.ok) {
        showToastMsg("PDF uploaded and parsed successfully.");
        setPdfInfo({
          storageResult: data.storageResult,
          rawText: data.rawText,
          fileName: data.fileName,
          fileType: data.fileType,
          fileSize: data.fileSize
        });
        setPdfUploaded(true);

        // Overlay values from PDF extraction
        const ext = data.extractedData || {};
        setRenewForm((prev) => ({
          ...prev,
          policyNumber: ext.policyNumber || prev.policyNumber,
          startDate: ext.startDate || prev.startDate,
          expiryDate: ext.expiryDate || prev.expiryDate,
          premium: ext.premium || prev.premium,
          sumInsured: ext.sumInsured || prev.sumInsured,
          insuredName: ext.insuredName || prev.insuredName,
          vehicleNumber: ext.vehicleNumber || prev.vehicleNumber,
          engineNumber: ext.engineNumber || prev.engineNumber,
          chassisNumber: ext.chassisNumber || prev.chassisNumber
        }));
      } else {
        showToastMsg(data.error || "PDF extraction failed. Please try again.");
      }
    } catch {
      showToastMsg("Network error parsing PDF.");
    } finally {
      setExtractingPdf(false);
    }
  };

  const submitRenewal = async () => {
    if (!renewPolicy) return;
    
    // Form validations
    if (!renewForm.policyNumber) {
      showToastMsg("New Policy Number is required.");
      return;
    }
    if (!renewForm.startDate || !renewForm.expiryDate) {
      showToastMsg("Start Date and Expiry Date are required.");
      return;
    }
    
    const start = new Date(renewForm.startDate);
    const expiry = new Date(renewForm.expiryDate);
    if (expiry <= start) {
      showToastMsg("Expiry Date must be after Start Date.");
      return;
    }
    
    if (!renewForm.premium) {
      showToastMsg("Premium is required.");
      return;
    }

    startSaving(async () => {
      try {
        const mergedPayload = {
          ...renewPolicy,
          ...renewForm,
          sourceFile: pdfInfo?.fileName || "Manual Renewal",
          status: "saved"
        };

        const res = await fetch("/api/renewals/renew", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previousPolicyId: renewPolicy.id,
            renewedData: mergedPayload,
            pdfInfo
          })
        });
        const data = await res.json();

        if (res.ok) {
          showToastMsg("Policy successfully renewed!");
          setRenewModalOpen(false);
          fetchPoliciesList();
        } else {
          showToastMsg(data.error || "Failed to renew policy.");
        }
      } catch {
        showToastMsg("Network error renewing policy.");
      }
    });
  };

  // Client-side Days Remaining Text Calculation
  const getDaysRemainingText = (expiryDateStr) => {
    if (!expiryDateStr) return "-";
    let expiry = null;
    const text = String(expiryDateStr).trim();
    const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (match) {
      const [, day, month, year] = match;
      const fullYear = year.length === 2 ? `20${year}` : year;
      expiry = new Date(Number(fullYear), Number(month) - 1, Number(day));
    } else {
      expiry = new Date(text);
    }
    
    if (Number.isNaN(expiry.getTime())) return "-";
    
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfExpiry = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
    
    const diffMs = startOfExpiry.getTime() - startOfToday.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Expired";
    if (diffDays === 0) return "Due Today";
    return `${diffDays} Days`;
  };

  return (
    <>
      <PageHeader 
        title="Policy Renewals" 
        subtitle="Manage upcoming renewals, send WhatsApp notices, record lost business, or upload new policies to renew."
        showRecordSaveActions={false}
      />

      {error ? (
        <section className="glass-panel" style={{ padding: "16px", borderColor: "#dc2626", color: "#dc2626", background: "rgba(220, 38, 38, 0.05)", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        </section>
      ) : null}

      {/* Dropdown Filters at the Top */}
      <section className="glass-panel" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "center" }}>
          <div style={{ flex: "1", minWidth: "220px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>Company Filter</label>
            <select 
              value={selectedCompany} 
              onChange={(e) => setSelectedCompany(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "14px"
              }}
            >
              <option value="All">All Companies</option>
              {companies.map((company) => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: "1", minWidth: "220px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>Policy Type Filter</label>
            <select 
              value={selectedPolicyType} 
              onChange={(e) => setSelectedPolicyType(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "14px"
              }}
            >
              <option value="All">All Policy Types</option>
              {policyTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Main Content Pane */}
      <section className="glass-panel table-panel" style={{ padding: "24px" }}>
        
        {/* Navigation Tabs */}
        <div className="record-view-tabs" style={{ marginBottom: "20px" }} aria-label="Renewal list views">
          {[
            { key: "upcoming", label: daysFilter ? `Upcoming (${daysFilter} Days)` : "Upcoming Renewals" },
            { key: "expired", label: "Expired Policies" },
            { key: "renewed", label: "Renewed Policies" },
            { key: "lost", label: "Lost Policies" },
            { key: "all", label: "All Policies" }
          ].map((tab) => (
            <button
              key={tab.key}
              className={activeTab === tab.key ? "active" : ""}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key !== "upcoming") setDaysFilter("");
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
          <div className="search-box" style={{ flex: "1" }}>
            <Search size={18} style={{ color: "var(--outline)", marginLeft: "12px", marginRight: "8px" }} />
            <input 
              type="text" 
              value={q} 
              placeholder="Search by Insured Name, Policy Number, or Vehicle Number..." 
              onChange={(e) => setQ(e.target.value)} 
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                outline: "none",
                padding: "10px 0",
                fontSize: "14px",
                color: "var(--text-primary)"
              }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Loader2 className="spin" size={36} style={{ color: "var(--accent)" }} />
          </div>
        ) : policies.length ? (
          <>
            <div className="table-wrap">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Customer Name / Contact Person</th>
                    <th>Policy Type</th>
                    <th>Contact Number</th>
                    <th>WhatsApp Link</th>
                    <th>Expiry Date</th>
                    <th>Days Remaining</th>
                    <th>Renewal Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p) => {
                    const daysText = getDaysRemainingText(p.expiryDate);
                    const isExpired = daysText === "Expired";
                    const isDueToday = daysText === "Due Today";
                    
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <strong className="record-primary">{p.insuredName || "Unnamed"}</strong>
                            {p.contactPerson && p.contactPerson !== p.insuredName && (
                              <small style={{ color: "var(--text-secondary)", fontSize: "11px" }}>Contact Person: {p.contactPerson}</small>
                            )}
                          </div>
                        </td>
                        <td>{p.displayPolicyType || p.policyType || "-"}</td>
                        <td><span className="record-code">{p.contactNumber || "-"}</span></td>
                        <td>
                          {p.contactNumber ? (
                            <button
                              type="button"
                              onClick={() => handleWhatsApp(p)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#10b981",
                                textDecoration: "underline",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: 0,
                                fontSize: "13px"
                              }}
                            >
                              <MessageSquare size={13} /> Chat Link
                            </button>
                          ) : (
                            <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>No number</span>
                          )}
                        </td>
                        <td>{p.expiryDate || "-"}</td>
                        <td style={{ 
                          color: isExpired ? "#dc2626" : isDueToday ? "#f59e0b" : "var(--text-primary)", 
                          fontWeight: (isExpired || isDueToday) ? "600" : "normal" 
                        }}>
                          {daysText}
                        </td>
                        <td>
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "600",
                            backgroundColor: p.renewalStatus === "LOST" ? "rgba(220,38,38,0.1)" : p.renewalStatus === "RENEWED" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                            color: p.renewalStatus === "LOST" ? "#dc2626" : p.renewalStatus === "RENEWED" ? "#10b981" : "#f59e0b"
                          }}>
                            {p.renewalStatus || "ACTIVE"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            {p.renewalStatus === "ACTIVE" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleRenew(p)}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--accent)",
                                    backgroundColor: "rgba(var(--accent-rgb), 0.05)",
                                    color: "var(--accent)",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    fontWeight: "600"
                                  }}
                                  title="Renew Policy"
                                >
                                  <RefreshCw size={14} /> Renew
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMarkLost(p)}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid #dc2626",
                                    backgroundColor: "rgba(220,38,38,0.05)",
                                    color: "#dc2626",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    fontWeight: "600"
                                  }}
                                  title="Mark Business as Lost"
                                >
                                  <Trash2 size={14} /> Lost
                                </button>
                              </>
                            )}
                            {p.renewalStatus !== "ACTIVE" && (
                              <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Closed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="table-pagination" style={{ marginTop: "20px" }}>
                <span>Showing {page} of {totalPages} pages ({totalCount} policies found)</span>
                <div className="table-page-list">
                  <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                    <button
                      key={pNum}
                      type="button"
                      className={page === pNum ? "active" : ""}
                      onClick={() => setPage(pNum)}
                    >
                      {pNum}
                    </button>
                  ))}
                  <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState>No policies found matching filters.</EmptyState>
        )}
      </section>

      {/* MODAL: Mark Policy as Lost */}
      {lostModalOpen && lostPolicy && (
        <div className="tb-modal-backdrop" onClick={() => setLostModalOpen(false)}>
          <div className="tb-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="tb-modal-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
              <h3 className="tb-status-title tb-modal-title" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#dc2626" }}>
                <Trash2 size={20} /> Lost Renewal Confirmation
              </h3>
            </div>
            <div className="tb-modal-body" style={{ marginTop: "12px" }}>
              <p style={{ color: "var(--text-primary)", fontSize: "14px", lineHeight: "1.5", marginBottom: "16px" }}>
                Are you sure you want to mark this policy as Lost Renewal?
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "0 0 16px" }}>
                Policy Number: <strong>{lostPolicy.policyNumber}</strong><br/>
                Customer: <strong>{lostPolicy.insuredName}</strong>
              </p>
              
              <label style={{ display: "block", marginBottom: "12px" }}>
                <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Reason for Loss *</span>
                <select
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--surface)",
                    color: "var(--text-primary)",
                    fontSize: "14px"
                  }}
                >
                  {LOST_REASON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Remarks</span>
                <textarea
                  value={lostRemarks}
                  onChange={(e) => setLostRemarks(e.target.value)}
                  placeholder="Provide detailed remarks about why the policy was lost..."
                  style={{
                    width: "100%",
                    minHeight: "80px",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--surface)",
                    color: "var(--text-primary)",
                    fontSize: "14px"
                  }}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", paddingTop: "16px", marginTop: "16px", borderTop: "1px solid var(--border)" }}>
              <button 
                type="button" 
                onClick={() => setLostModalOpen(false)}
                className="tb-modal-done-btn"
                style={{ background: "var(--surface-variant)", color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={submitMarkLost}
                className="tb-modal-done-btn"
                style={{ background: "#dc2626", color: "white" }}
              >
                Mark Lost
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Renew Policy */}
      {renewModalOpen && renewPolicy && (
        <div className="tb-modal-backdrop" onClick={() => setRenewModalOpen(false)}>
          <div className="tb-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px", width: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="tb-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
              <h3 className="tb-status-title tb-modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <RefreshCw size={20} /> Renew Policy: {renewPolicy.insuredName}
              </h3>
              <button type="button" onClick={() => setRenewModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={20} />
              </button>
            </div>

            <div className="tb-modal-body" style={{ marginTop: "16px" }}>
              
              {/* PDF upload for auto extraction (Mandatory Screen First) */}
              {!pdfUploaded ? (
                <div style={{
                  border: "2px dashed var(--border)",
                  borderRadius: "12px",
                  padding: "40px 20px",
                  textAlign: "center",
                  background: "rgba(var(--accent-rgb), 0.02)",
                  marginBottom: "20px"
                }}>
                  {extractingPdf ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                      <Loader2 className="spin" size={32} style={{ color: "var(--accent)" }} />
                      <p style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>Extracting data from new policy PDF...</p>
                    </div>
                  ) : (
                    <div>
                      <Upload size={32} style={{ color: "var(--text-secondary)", margin: "0 auto 12px" }} />
                      <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>Upload New Policy PDF to Proceed</h4>
                      <p style={{ margin: "0 0 20px", fontSize: "12px", color: "var(--text-secondary)", maxWidth: "400px", marginLeft: "auto", marginRight: "auto" }}>
                        You must upload the new policy PDF. The system will run the extraction engine and auto-populate all renewal details for your review.
                      </p>
                      <label className="browse-button" style={{ display: "inline-block" }}>
                        Choose PDF File
                        <input type="file" accept="application/pdf" onChange={handlePdfUpload} />
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* File Attached Success Badge */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    backgroundColor: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid #10b981",
                    borderRadius: "8px",
                    marginBottom: "20px"
                  }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", color: "#10b981", fontSize: "13px" }}>
                      <FileText size={16} />
                      <span>Attached: <strong>{pdfInfo?.fileName}</strong></span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setPdfUploaded(false)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                        fontSize: "11px",
                        fontWeight: "600",
                        textDecoration: "underline"
                      }}
                    >
                      Change PDF
                    </button>
                  </div>

                  {/* Renewal Form Fields */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <label>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>New Policy Number *</span>
                      <input
                        value={renewForm.policyNumber}
                        onChange={(e) => setRenewForm({...renewForm, policyNumber: e.target.value})}
                        placeholder="Enter new policy number"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                      />
                    </label>

                    <label>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>New Premium *</span>
                      <input
                        value={renewForm.premium}
                        onChange={(e) => setRenewForm({...renewForm, premium: e.target.value})}
                        placeholder="e.g. 10474"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                      />
                    </label>

                    <label>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>New Start Date *</span>
                      <input
                        type="date"
                        value={renewForm.startDate}
                        onChange={(e) => setRenewForm({...renewForm, startDate: e.target.value})}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                      />
                    </label>

                    <label>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>New Expiry Date *</span>
                      <input
                        type="date"
                        value={renewForm.expiryDate}
                        onChange={(e) => setRenewForm({...renewForm, expiryDate: e.target.value})}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                      />
                    </label>

                    <label>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>New Sum Insured / IDV *</span>
                      <input
                        value={renewForm.sumInsured}
                        onChange={(e) => setRenewForm({...renewForm, sumInsured: e.target.value})}
                        placeholder="e.g. 946241"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                      />
                    </label>

                    <label>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>Payment Mode</span>
                      <select
                        value={renewForm.modeOfPayment}
                        onChange={(e) => setRenewForm({...renewForm, modeOfPayment: e.target.value})}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                      >
                        {PAYMENT_MODE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>Collected Amount</span>
                      <input
                        value={renewForm.collectedAmount}
                        onChange={(e) => setRenewForm({...renewForm, collectedAmount: e.target.value})}
                        placeholder="e.g. 10474"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                      />
                    </label>

                    <label>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>Due Collection</span>
                      <input
                        value={renewForm.dueCollection}
                        onChange={(e) => setRenewForm({...renewForm, dueCollection: e.target.value})}
                        placeholder="e.g. 0"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                      />
                    </label>
                  </div>

                  {/* Remarks */}
                  <label style={{ display: "block", marginTop: "16px" }}>
                    <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>Remarks</span>
                    <textarea
                      value={renewForm.remark}
                      onChange={(e) => setRenewForm({...renewForm, remark: e.target.value})}
                      placeholder="Renewal remarks..."
                      style={{ width: "100%", minHeight: "60px", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                    />
                  </label>

                  {/* Manual Correction Fields */}
                  <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "12px" }}>Insured Details & vehicle info (Verify & Correct)</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <label>
                        <span style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Insured Name</span>
                        <input
                          value={renewForm.insuredName}
                          onChange={(e) => setRenewForm({...renewForm, insuredName: e.target.value})}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                        />
                      </label>

                      <label>
                        <span style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Vehicle Registration No.</span>
                        <input
                          value={renewForm.vehicleNumber}
                          onChange={(e) => setRenewForm({...renewForm, vehicleNumber: e.target.value})}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                        />
                      </label>

                      <label>
                        <span style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Engine Number</span>
                        <input
                          value={renewForm.engineNumber}
                          onChange={(e) => setRenewForm({...renewForm, engineNumber: e.target.value})}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                        />
                      </label>

                      <label>
                        <span style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Chassis Number</span>
                        <input
                          value={renewForm.chassisNumber}
                          onChange={(e) => setRenewForm({...renewForm, chassisNumber: e.target.value})}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                        />
                      </label>
                    </div>
                  </div>
                </>
              )}

            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", paddingTop: "16px", marginTop: "24px", borderTop: "1px solid var(--border)" }}>
              <button 
                type="button" 
                onClick={() => setRenewModalOpen(false)}
                className="tb-modal-done-btn"
                style={{ background: "var(--surface-variant)", color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              {pdfUploaded && (
                <button 
                  type="button" 
                  onClick={submitRenewal}
                  disabled={isSaving}
                  className="tb-modal-done-btn"
                  style={{ background: "var(--accent)", color: "white", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {isSaving && <Loader2 className="spin" size={16} />}
                  Save Renewal
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      {toast ? (
        <button className="toast" type="button" onClick={() => setToast("")} style={{ zIndex: 1000 }}>
          <CheckCircle size={20} />
          <span>{toast}</span>
        </button>
      ) : null}
    </>
  );
}
