"use client";

import React, { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
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
  Search,
  Eye,
  Printer
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
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [pdfUploaded, setPdfUploaded] = useState(false);

  const handlePrint = (record) => {
    if (!record) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.alert("Please allow popups to print policy details.");
      return;
    }
    
    const formatDateLocal = (val) => {
      if (!val) return "-";
      const date = new Date(val);
      if (Number.isNaN(date.getTime())) return String(val);
      return date.toLocaleDateString("en-IN");
    };

    const formatDateTimeLocal = (val) => {
      if (!val) return "-";
      const date = new Date(val);
      if (Number.isNaN(date.getTime())) return String(val);
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    };

    const renderPrintSection = (title, fields) => {
      const validFields = fields.filter(([_, val]) => val !== undefined && val !== null && String(val).trim() !== "");
      if (validFields.length === 0) return "";
      return `
        <div class="section">
          <h3>${title}</h3>
          <div class="grid">
            ${validFields.map(([lbl, val]) => `
              <div class="field">
                <span class="label">${lbl}</span>
                <span class="value">${val}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    };

    printWindow.document.write(`
      <html>
        <head>
          <title>Policy Details - ${record.policyNumber || "Record"}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              padding: 16px;
              line-height: 1.3;
              margin: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 6px;
              margin-bottom: 12px;
            }
            .header-info h1 {
              margin: 0;
              font-size: 18px;
              font-weight: 800;
            }
            .header-info p {
              margin: 0 0 2px;
              color: #64748b;
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .print-logo {
              height: 54px;
              width: auto;
              object-fit: contain;
            }
            .section {
              margin-bottom: 12px;
              page-break-inside: avoid;
            }
            .section h3 {
              margin: 0 0 6px;
              font-size: 12px;
              font-weight: 700;
              color: #1e3a8a;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 4px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 6px;
            }
            .field {
              padding: 5px 8px;
              background: #f8fafc;
              border: 1px solid #f1f5f9;
              border-radius: 4px;
            }
            .label {
              font-size: 8px;
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
              display: block;
              margin-bottom: 1px;
              letter-spacing: 0.5px;
            }
            .value {
              font-size: 11px;
              font-weight: 600;
              color: #0f172a;
              word-break: break-all;
            }
            @media print {
              @page {
                size: A4;
                margin: 8mm;
              }
              body {
                zoom: 82%;
              }
              .field {
                background: #f8fafc !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-info">
              <p>Policy Record Details</p>
              <h1>${record.policyNumber || "No Policy Number"}</h1>
            </div>
            <img src="${window.location.origin}/brand/main-logo-wide.png" alt="Bima Headquarter" class="print-logo" />
          </div>
          
          ${renderPrintSection("General Information", [
            ["Customer ID", record.customerId],
            ["Insured Name", record.insuredName],
            ["Contact Person", record.contactPerson],
            ["Phone Number", record.contactNumber],
            ["WhatsApp Group Name", record.whatsappGroupName],
            ["Group Name", record.groupName],
            ["Insurance Company", record.insuranceCompany],
            ["Policy Type", record.policyType]
          ])}

          ${renderPrintSection("Dates & Coverage", [
            ["Start Date", formatDateLocal(record.startDate)],
            ["Expiry Date", formatDateLocal(record.expiryDate)],
            ["Duration", record.duration],
            ["Sum Insured", record.sumInsured]
          ])}

          ${renderPrintSection("Financial Details", [
            ["Net Premium", record.netPremium],
            ["OD Premium", record.odPremium],
            ["TP + Driver + Owner", record.tpDriverOwner],
            ["Total Premium", record.totalPremium],
            ["Mode of Payment", record.modeOfPayment],
            ["Collected Amount", record.collectedAmount],
            ["Due Collection", record.dueCollection]
          ])}

          ${renderPrintSection("Vehicle Details", [
            ["Vehicle Number", record.vehicleNumber],
            ["Make & Model", record.makeModel],
            ["Variant", record.variant],
            ["Registration Number", record.registrationNumber],
            ["Registration Date", formatDateLocal(record.registrationDate)],
            ["Manufacturing Year", record.manufacturingYear],
            ["Fuel Type", record.fuelType],
            ["Engine Number", record.engineNumber],
            ["Chassis Number", record.chassisNumber],
            ["Seating Capacity", record.seatingCapacity],
            ["Cubic Capacity", record.cubicCapacity],
            ["IDV", record.idv],
            ["NCB", record.ncb],
            ["Cover Type", record.policyCoverType],
            ["RTO Location", record.rtoLocation]
          ])}

          ${renderPrintSection("Additional & Risk Details", [
            ["Nominee Name", record.nomineeName],
            ["Hypothecation / Financer", record.financerName],
            ["Risk Location", record.riskLocation],
            ["Occupancy", record.occupancy],
            ["Tehsil", record.tehsil],
            ["District", record.district],
            ["PPT / MPWLC", record.pptMpwlc],
            ["Valid In", record.validIn],
            ["Remarks", record.remark]
          ])}

          ${renderPrintSection("Metadata", [
            ["Source PDF File", record.sourceFile],
            ["Created By", record.uploadedByEmail || record.uploadedBy],
            ["Saved Date", formatDateTimeLocal(record.savedAt)],
            ["Renewal Status", record.renewalStatus]
          ])}

          <script>
            window.onload = function() {
              const img = document.querySelector('.print-logo');
              if (img) {
                if (img.complete) {
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
                } else {
                  img.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                  };
                  img.onerror = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                  };
                  setTimeout(function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                  }, 1500);
                }
              } else {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
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

  const [renewalCounts, setRenewalCounts] = useState({
    eodPremium: 0,
    eodCount: 0,
    mtdPremium: 0,
    mtdCount: 0,
    ytdPremium: 0,
    ytdCount: 0,
    due10: 0,
    due20: 0,
    due30: 0,
    expired: 0,
    expiredPremium: 0,
    renewed: 0,
    renewedPremium: 0,
    lost: 0,
    lostPremium: 0
  });

  useEffect(() => {
    async function fetchHeaderData() {
      try {
        const res = await fetch("/api/dashboard/header-data");
        const data = await res.json();
        if (data.success && data.renewalCounts) {
          setRenewalCounts(data.renewalCounts);
        }
      } catch (err) {
        console.error("Failed to fetch renewal counts:", err);
      }
    }
    fetchHeaderData();
  }, [policies]);

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

      {/* Renewal Counters Grid */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "16px",
        marginBottom: "20px"
      }}>
        {[
          { label: "Due in 10 Days", value: renewalCounts.due10, color: "#f59e0b", tab: "upcoming", days: "10" },
          { label: "Due in 20 Days", value: renewalCounts.due20, color: "#d97706", tab: "upcoming", days: "20" },
          { label: "Due in 30 Days", value: renewalCounts.due30, color: "var(--accent)", tab: "upcoming", days: "30" },
          { label: "Expired Renewals", value: renewalCounts.expired, color: "#dc2626", tab: "expired", days: "" },
          { label: "Renewed Policies", value: renewalCounts.renewed, color: "#10b981", tab: "renewed", days: "" },
          { label: "Lost Renewals", value: renewalCounts.lost, color: "#6b7280", tab: "lost", days: "" }
        ].map((item) => (
          <article
            key={item.label}
            onClick={() => {
              setActiveTab(item.tab);
              if (item.days) {
                setDaysFilter(item.days);
              } else {
                setDaysFilter("");
              }
            }}
            style={{
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              cursor: "pointer",
              transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
              position: "relative",
              overflow: "hidden",
              boxShadow: "var(--shadow-soft)"
            }}
            className="customer-card clickable-card"
          >
            <div style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "6px",
              backgroundColor: item.color
            }} />
            <p style={{
              margin: 0,
              fontSize: "12px",
              fontWeight: "700",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>{item.label}</p>
            <strong style={{
              display: "block",
              fontSize: "28px",
              fontWeight: "800",
              color: "var(--text-primary)",
              marginTop: "8px"
            }}>{item.value}</strong>
          </article>
        ))}
      </section>

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
                            <button
                              type="button"
                              onClick={() => setSelectedRecord(p)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "8px",
                                border: "1px solid var(--primary, #1f6fae)",
                                backgroundColor: "rgba(31, 111, 174, 0.05)",
                                color: "var(--primary, #1f6fae)",
                                cursor: "pointer",
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontWeight: "600"
                              }}
                              title="View Policy Details"
                            >
                              <Eye size={14} /> View
                            </button>
                            {p.renewalStatus === "ACTIVE" ? (
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
                            ) : (
                              <span style={{ color: "var(--text-secondary)", fontSize: "12px", display: "flex", alignItems: "center" }}>Closed</span>
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

      {/* MODAL: View Policy Details */}
      {typeof window !== "undefined" && selectedRecord && createPortal(
        <div 
          className="tb-modal-backdrop"
          onClick={() => setSelectedRecord(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.25)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px"
          }}
        >
          <div 
            className="tb-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              boxShadow: "0 25px 70px -10px rgba(0, 0, 0, 0.08), 0 10px 30px -15px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.03)",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "none",
              animation: "modal-pop 320ms cubic-bezier(0.2, 0, 0, 1) both"
            }}
          >
            {/* Modal Header */}
            <div 
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px 24px",
                borderBottom: "1px solid #f1f5f9",
                backgroundColor: "#ffffff",
                color: "#0f172a"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <img 
                  src="/brand/main-logo-wide.png" 
                  alt="Bima Headquarter" 
                  style={{ height: "74px", width: "auto", objectFit: "contain" }} 
                />
                <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "16px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", color: "#64748b" }}>Policy Record Details</span>
                  <h2 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>
                    {selectedRecord.policyNumber || "No Policy Number"}
                  </h2>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRecord(null)}
                aria-label="Close details"
                style={{
                  background: "rgba(15, 23, 42, 0.05)",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  transition: "background-color 0.2s, color 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.1)";
                  e.currentTarget.style.color = "#0f172a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.05)";
                  e.currentTarget.style.color = "#64748b";
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div 
              style={{
                padding: "24px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "24px",
                backgroundColor: "#ffffff"
              }}
            >
              <DetailSection title="General Information">
                <DetailField label="Customer ID" value={selectedRecord.customerId} />
                <DetailField label="Insured Name" value={selectedRecord.insuredName} wide />
                <DetailField label="Contact Person" value={selectedRecord.contactPerson} />
                <DetailField label="Phone Number" value={selectedRecord.contactNumber} />
                <DetailField label="WhatsApp Group Name" value={selectedRecord.whatsappGroupName} />
                <DetailField label="Group Name" value={selectedRecord.groupName} />
                <DetailField label="Insurance Company" value={selectedRecord.insuranceCompany} wide />
                <DetailField label="Policy Type" value={selectedRecord.policyType} />
              </DetailSection>

              <DetailSection title="Dates & Coverage">
                <DetailField label="Start Date" value={selectedRecord.startDate ? formatDate(selectedRecord.startDate) : ""} />
                <DetailField label="Expiry Date" value={selectedRecord.expiryDate ? formatDate(selectedRecord.expiryDate) : ""} />
                <DetailField label="Duration" value={selectedRecord.duration} />
                <DetailField label="Sum Insured" value={selectedRecord.sumInsured} />
              </DetailSection>

              <DetailSection title="Financial Details">
                <DetailField label="Net Premium" value={selectedRecord.netPremium} />
                <DetailField label="OD Premium" value={selectedRecord.odPremium} />
                <DetailField label="TP + Driver + Owner" value={selectedRecord.tpDriverOwner} />
                <DetailField label="Total Premium" value={selectedRecord.totalPremium} />
                <DetailField label="Mode of Payment" value={selectedRecord.modeOfPayment} />
                <DetailField label="Collected Amount" value={selectedRecord.collectedAmount} />
                <DetailField label="Due Collection" value={selectedRecord.dueCollection} />
              </DetailSection>

              <DetailSection title="Vehicle Details">
                <DetailField label="Vehicle Number" value={selectedRecord.vehicleNumber} />
                <DetailField label="Make & Model" value={selectedRecord.makeModel} wide />
                <DetailField label="Variant" value={selectedRecord.variant} />
                <DetailField label="Registration Number" value={selectedRecord.registrationNumber} />
                <DetailField label="Registration Date" value={selectedRecord.registrationDate ? formatDate(selectedRecord.registrationDate) : ""} />
                <DetailField label="Manufacturing Year" value={selectedRecord.manufacturingYear} />
                <DetailField label="Fuel Type" value={selectedRecord.fuelType} />
                <DetailField label="Engine Number" value={selectedRecord.engineNumber} />
                <DetailField label="Chassis Number" value={selectedRecord.chassisNumber} />
                <DetailField label="Seating Capacity" value={selectedRecord.seatingCapacity} />
                <DetailField label="Cubic Capacity" value={selectedRecord.cubicCapacity} />
                <DetailField label="IDV" value={selectedRecord.idv} />
                <DetailField label="NCB" value={selectedRecord.ncb} />
                <DetailField label="Cover Type" value={selectedRecord.policyCoverType} />
                <DetailField label="RTO Location" value={selectedRecord.rtoLocation} />
              </DetailSection>

              <DetailSection title="Additional & Risk Details">
                <DetailField label="Nominee Name" value={selectedRecord.nomineeName} />
                <DetailField label="Hypothecation / Financer" value={selectedRecord.financerName} />
                <DetailField label="Risk Location" value={selectedRecord.riskLocation} wide />
                <DetailField label="Occupancy" value={selectedRecord.occupancy} />
                <DetailField label="Tehsil" value={selectedRecord.tehsil} />
                <DetailField label="District" value={selectedRecord.district} />
                <DetailField label="PPT / MPWLC" value={selectedRecord.pptMpwlc} />
                <DetailField label="Valid In" value={selectedRecord.validIn} />
                <DetailField label="Remarks" value={selectedRecord.remark} wide />
              </DetailSection>

              <DetailSection title="Metadata">
                <DetailField label="Source PDF File" value={selectedRecord.sourceFile} wide />
                <DetailField label="Created By" value={selectedRecord.uploadedByEmail || selectedRecord.uploadedBy} />
                <DetailField label="Saved Date" value={selectedRecord.savedAt ? formatDateTime(selectedRecord.savedAt) : ""} />
                <DetailField label="Renewal Status" value={selectedRecord.renewalStatus} />
              </DetailSection>
            </div>

            {/* Modal Footer */}
            <div 
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: "12px",
                padding: "16px 24px",
                borderTop: "1px solid #f1f5f9",
                backgroundColor: "#ffffff"
              }}
            >
              <button 
                onClick={() => handlePrint(selectedRecord)}
                style={{
                  padding: "10px 24px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background-color 0.2s, border-color 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                  e.currentTarget.style.borderColor = "#0f172a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                }}
              >
                <Printer size={16} />
                Print Details
              </button>
              <button 
                onClick={() => setSelectedRecord(null)}
                style={{
                  padding: "10px 24px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  transition: "background-color 0.2s, border-color 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                  e.currentTarget.style.borderColor = "#94a3b8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      , document.body)}

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

function DetailField({ label, value, wide }) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      gap: "4px",
      padding: "8px 12px",
      background: "#f8fafc",
      borderRadius: "8px",
      border: "1px solid #f1f5f9",
      gridColumn: wide ? "span 2" : undefined
    }}>
      <span style={{ fontSize: "10px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", wordBreak: "break-all" }}>{String(value)}</span>
    </div>
  );
}

function DetailSection({ title, children }) {
  const validChildren = React.Children.toArray(children).filter(child => child !== null);
  if (validChildren.length === 0) return null;
  
  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "16px",
      border: "1px solid #e2e8f0",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "16px"
    }}>
      <h3 style={{
        margin: 0,
        fontSize: "14px",
        fontWeight: "700",
        color: "#1e3a8a",
        borderBottom: "2px solid #f1f5f9",
        paddingBottom: "8px",
        display: "flex",
        alignItems: "center"
      }}>{title}</h3>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "12px"
      }}>
        {children}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN");
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
