"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  X,
  CheckCircle,
  LoaderCircle,
  FileUp,
  Edit3,
  DollarSign,
  Plus,
  Trash2,
  AlertCircle,
  Building,
  Layers,
} from "lucide-react";

export const IMPACT_CATEGORIES = [
  { id: "PREMIUM", label: "Premium Change (+/-)" },
  { id: "SUM_INSURED", label: "Sum Insured Change (+/-)" },
  { id: "LOCATION", label: "Warehouse Location (Add/Remove/Change)" },
  { id: "BANK_CLAUSE", label: "Bank / Mortgage Clause" },
  { id: "COMMODITY", label: "Commodity (Add/Remove)" },
  { id: "STOCK_LIMIT", label: "Stock Limit Change" },
  { id: "CORRECTION", label: "Name / GST / Address Correction" },
];

export default function AddEndorsementModal({ record, onClose, onSuccess }) {
  const [mounted, setMounted] = useState(false);
  const [creationMethod, setCreationMethod] = useState("MANUAL_ENTRY"); // PDF_UPLOAD vs MANUAL_ENTRY
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const policyNo = record?.policyNumber || record?.policyNo || record?.data?.policyNumber || "";
  const insuredName = record?.insuredName || record?.data?.insuredName || record?.proposerName || "";
  const insuranceCompany = record?.insuranceCompany || record?.data?.insuranceCompany || "";
  const policyType = record?.policyType || record?.data?.policyType || "";
  const clientId = record?.clientId || record?.data?.clientId || "";
  const startDate = record?.startDate || record?.data?.startDate || "";
  const expiryDate = record?.expiryDate || record?.data?.expiryDate || "";
  const sumInsured = record?.sumInsured || record?.data?.sumInsured || record?.basicSumInsured || "";
  const premium = record?.netPremium || record?.premium || record?.totalPremium || record?.data?.netPremium || record?.data?.premium || "";
  const rawDuration = record?.policyTenure || record?.duration || record?.data?.policyTenure || record?.data?.duration || "";
  const duration = rawDuration
    ? String(rawDuration)
    : (startDate && expiryDate
      ? `${Math.round((new Date(expiryDate) - new Date(startDate)) / (1000 * 60 * 60 * 24 * 30.4375))} Month`
      : "");

  const formatDateVal = (val) => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatAmountVal = (val) => {
    if (val === undefined || val === null || val === "") return "N/A";
    const num = parseFloat(val);
    if (isNaN(num)) return String(val);
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Selected Multi-Impact Categories
  const [selectedImpacts, setSelectedImpacts] = useState(["PREMIUM", "SUM_INSURED"]);

  const [form, setForm] = useState({
    endorsementNo: `ENDO-${Date.now().toString().slice(-6)}`,
    endorsementType: "Addition in Premium & Sum Insured",
    transactionDate: new Date().toISOString().split("T")[0],
    effectiveDate: new Date().toISOString().split("T")[0],
    paymentDate: new Date().toISOString().split("T")[0],
    
    // Premium Impact
    premiumChangeType: "INCREASE",
    premiumChangeAmount: "",
    
    // Sum Insured Impact
    sumInsuredChangeType: "INCREASE",
    sumInsuredChangeAmount: "",

    // Revenue / Financial Ledger Breakdown
    paymentReceived: true,
    collectedAmount: "",
    premiumPart: "",
    gstPart: "",
    stampDuty: "",
    paymentMode: "BANK_TRANSFER",
    transactionReference: "",

    // Structured Impact Details
    locationDetails: "",
    bankClauseDetails: "",
    commodityDetails: "",
    remarks: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const toggleImpact = (catId) => {
    if (selectedImpacts.includes(catId)) {
      setSelectedImpacts(selectedImpacts.filter((i) => i !== catId));
    } else {
      setSelectedImpacts([...selectedImpacts, catId]);
    }
  };

  const handleChange = (field, val) => {
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      if (field === "collectedAmount") {
        const total = parseFloat(val || 0);
        if (total > 0) {
          next.premiumPart = (total / 1.18).toFixed(2);
          next.gstPart = (total - parseFloat(next.premiumPart)).toFixed(2);
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!form.endorsementNo.trim()) {
      setErrorMessage("Endorsement Number is required.");
      return;
    }

    setIsSaving(true);

    try {
      // Build structured impacts list
      const structuredImpacts = [];
      if (selectedImpacts.includes("PREMIUM") && form.premiumChangeAmount) {
        structuredImpacts.push({
          impactCategory: "PREMIUM",
          changeType: form.premiumChangeType,
          numericDelta: parseFloat(form.premiumChangeAmount),
          details: `Premium ${form.premiumChangeType.toLowerCase()}`,
        });
      }
      if (selectedImpacts.includes("SUM_INSURED") && form.sumInsuredChangeAmount) {
        structuredImpacts.push({
          impactCategory: "SUM_INSURED",
          changeType: form.sumInsuredChangeType,
          numericDelta: parseFloat(form.sumInsuredChangeAmount),
          details: `Sum Insured ${form.sumInsuredChangeType.toLowerCase()}`,
        });
      }
      if (selectedImpacts.includes("LOCATION") && form.locationDetails) {
        structuredImpacts.push({
          impactCategory: "LOCATION",
          changeType: "ADDITION",
          details: form.locationDetails,
        });
      }
      if (selectedImpacts.includes("BANK_CLAUSE") && form.bankClauseDetails) {
        structuredImpacts.push({
          impactCategory: "BANK_CLAUSE",
          changeType: "ADDITION",
          details: form.bankClauseDetails,
        });
      }

      const payload = {
        policyId: record.id,
        policyNo,
        insuredName,
        endorsementNo: form.endorsementNo,
        endorsementType: form.endorsementType,
        creationMethod,
        transactionDate: form.transactionDate,
        effectiveDate: form.effectiveDate,
        paymentDate: form.paymentDate,
        
        premiumChangeType: selectedImpacts.includes("PREMIUM") ? form.premiumChangeType : "NO_CHANGE",
        premiumChangeAmount: selectedImpacts.includes("PREMIUM") ? parseFloat(form.premiumChangeAmount || 0) : 0,
        
        sumInsuredChangeType: selectedImpacts.includes("SUM_INSURED") ? form.sumInsuredChangeType : "NO_CHANGE",
        sumInsuredChangeAmount: selectedImpacts.includes("SUM_INSURED") ? parseFloat(form.sumInsuredChangeAmount || 0) : 0,

        paymentReceived: form.paymentReceived,
        paymentAmount: parseFloat(form.collectedAmount || 0),
        premiumPart: parseFloat(form.premiumPart || 0),
        gstPart: parseFloat(form.gstPart || 0),
        stampDuty: parseFloat(form.stampDuty || 0),
        paymentMode: form.paymentMode,
        transactionReference: form.transactionReference,

        impacts: structuredImpacts,
        remarks: form.remarks,
        documentStatus: creationMethod === "PDF_UPLOAD" ? "VERIFIED" : "AWAITING_UPLOAD",
        status: creationMethod === "PDF_UPLOAD" ? "Completed" : form.paymentReceived ? "Pending Document" : "PENDING_PAYMENT",
      };

      const res = await fetch("/api/endorsements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create endorsement.");
      }

      const result = await res.json();
      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="tb-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 3200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        className="tb-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: "24px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          width: "100%",
          maxWidth: "750px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Image
              src="/brand/main-logo-wide.webp"
              alt="Bima Headquarter"
              width={133}
              height={74}
              style={{ height: "64px", width: "auto", objectFit: "contain" }}
            />
            <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.05em", color: "#2563eb", textTransform: "uppercase" }}>
                New Warehouse Endorsement
              </span>
              <h3 style={{ margin: "2px 0 0 0", fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
                Policy #{policyNo || "Warehouse"}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: "32px",
              height: "32px",
              minWidth: "32px",
              minHeight: "32px",
              borderRadius: "50%",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
              padding: 0,
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f8fafc";
              e.currentTarget.style.borderColor = "#64748b";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#ffffff";
              e.currentTarget.style.borderColor = "#cbd5e1";
            }}
          >
            <X size={15} color="#64748b" style={{ strokeWidth: "2" }} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {errorMessage && (
            <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "10px", backgroundColor: "#fef2f2", color: "#991b1b", fontSize: "13px" }}>
              {errorMessage}
            </div>
          )}

          {/* Auto-Fetched Policy Context Summary (Executive Accent Card) */}
          <div
            style={{
              marginBottom: "14px",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderLeft: "4px solid #2563eb",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", color: "#2563eb", background: "#eff6ff", padding: "2px 6px", borderRadius: "4px", border: "1px solid #bfdbfe" }}>
                Auto-Fetched Policy Context
              </span>
              {clientId && (
                <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b" }}>
                  Client ID: <strong style={{ color: "#0f172a" }}>{clientId}</strong>
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1.25fr 0.9fr", gap: "8px 14px" }}>
              <div>
                <span style={{ display: "block", fontSize: "9px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1px" }}>
                  Insured Name
                </span>
                <strong style={{ fontSize: "11px", fontWeight: "700", color: "#0f172a", wordBreak: "break-word", lineHeight: "1.2" }}>
                  {insuredName || "N/A"}
                </strong>
              </div>

              <div>
                <span style={{ display: "block", fontSize: "9px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1px" }}>
                  Insurance Company
                </span>
                <strong style={{ fontSize: "11px", fontWeight: "700", color: "#0f172a", wordBreak: "break-word", lineHeight: "1.2" }}>
                  {insuranceCompany || "N/A"}
                </strong>
              </div>

              <div>
                <span style={{ display: "block", fontSize: "9px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1px" }}>
                  Policy Number
                </span>
                <strong style={{ fontSize: "11px", fontWeight: "700", color: "#0f172a", wordBreak: "break-all", lineHeight: "1.2" }}>
                  {policyNo || "N/A"}
                </strong>
              </div>

              <div>
                <span style={{ display: "block", fontSize: "9px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1px" }}>
                  Policy Type
                </span>
                <strong style={{ fontSize: "11px", fontWeight: "700", color: "#0f172a", wordBreak: "break-word", lineHeight: "1.2" }}>
                  {policyType || "Warehouse Policy"}
                </strong>
              </div>

              <div>
                <span style={{ display: "block", fontSize: "9px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1px" }}>
                  Policy Period & Duration
                </span>
                <strong style={{ fontSize: "11px", fontWeight: "700", color: "#0f172a", lineHeight: "1.2" }}>
                  {formatDateVal(startDate)} – {formatDateVal(expiryDate)} {duration ? `(${duration})` : ""}
                </strong>
              </div>

              <div>
                <span style={{ display: "block", fontSize: "9px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1px" }}>
                  Sum Insured / Premium
                </span>
                <strong style={{ fontSize: "11px", fontWeight: "700", color: "#0f172a", lineHeight: "1.2" }}>
                  {formatAmountVal(sumInsured)} / {formatAmountVal(premium)}
                </strong>
              </div>
            </div>
          </div>

          {/* Creation Method Segmented Control */}
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
              Creation Method *
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px",
                padding: "4px",
                borderRadius: "10px",
                backgroundColor: "#f1f5f9",
                border: "1px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                onClick={() => setCreationMethod("MANUAL_ENTRY")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: creationMethod === "MANUAL_ENTRY" ? "#ffffff" : "transparent",
                  color: creationMethod === "MANUAL_ENTRY" ? "#2563eb" : "#64748b",
                  fontWeight: "700",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                  boxShadow: creationMethod === "MANUAL_ENTRY" ? "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <Edit3 size={15} color={creationMethod === "MANUAL_ENTRY" ? "#2563eb" : "#64748b"} />
                Manual Entry (Instant Revenue)
              </button>

              <button
                type="button"
                onClick={() => setCreationMethod("PDF_UPLOAD")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: creationMethod === "PDF_UPLOAD" ? "#ffffff" : "transparent",
                  color: creationMethod === "PDF_UPLOAD" ? "#2563eb" : "#64748b",
                  fontWeight: "700",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                  boxShadow: creationMethod === "PDF_UPLOAD" ? "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <FileUp size={15} color={creationMethod === "PDF_UPLOAD" ? "#2563eb" : "#64748b"} />
                Upload Endorsement PDF
              </button>
            </div>
          </div>

          {/* Conditional Body Content based on Creation Method */}
          {creationMethod === "PDF_UPLOAD" ? (
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: "14px",
                  padding: "36px 20px",
                  textAlign: "center",
                  backgroundColor: "#f8fafc",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#2563eb";
                  e.currentTarget.style.backgroundColor = "#eff6ff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                }}
              >
                <FileUp size={36} color="#2563eb" style={{ margin: "0 auto 12px auto", display: "block" }} />
                <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                  Upload Endorsement PDF Document
                </h4>
                <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#64748b" }}>
                  Drag & drop endorsement PDF here or click to browse file
                </p>
                <input type="file" accept=".pdf" style={{ display: "none" }} id="endorsement-pdf-file-input" />
                <label
                  htmlFor="endorsement-pdf-file-input"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "9px 18px",
                    borderRadius: "8px",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  <FileUp size={16} /> Select PDF File
                </label>
              </div>
            </div>
          ) : (
            <>
              {/* Decoupled Dates Section */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    value={form.transactionDate}
                    onChange={(e) => handleChange("transactionDate", e.target.value)}
                    required
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>
                    Effective Date (Policy Activation) *
                  </label>
                  <input
                    type="date"
                    value={form.effectiveDate}
                    onChange={(e) => handleChange("effectiveDate", e.target.value)}
                    required
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>
                    Payment Date (Revenue Date) *
                  </label>
                  <input
                    type="date"
                    value={form.paymentDate}
                    onChange={(e) => handleChange("paymentDate", e.target.value)}
                    required
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                </div>
              </div>

              {/* Multi-Impact Selection Checkboxes */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "8px" }}>
                  SELECT ENDORSEMENT IMPACTS
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {IMPACT_CATEGORIES.map((cat) => {
                    const active = selectedImpacts.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleImpact(cat.id)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: active ? "1px solid #3b82f6" : "1px solid #cbd5e1",
                          backgroundColor: active ? "#eff6ff" : "#ffffff",
                          color: active ? "#1d4ed8" : "#64748b",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        {active ? "✓ " : "+ "}
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Premium & Sum Insured Impact Inputs */}
              {selectedImpacts.includes("PREMIUM") && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                      Premium Change Type
                    </label>
                    <select
                      value={form.premiumChangeType}
                      onChange={(e) => handleChange("premiumChangeType", e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    >
                      <option value="INCREASE">Increase (+)</option>
                      <option value="DECREASE">Decrease (-)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                      Premium Net Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="2500.00"
                      value={form.premiumChangeAmount}
                      onChange={(e) => handleChange("premiumChangeAmount", e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    />
                  </div>
                </div>
              )}

              {selectedImpacts.includes("SUM_INSURED") && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                      Sum Insured Change Type
                    </label>
                    <select
                      value={form.sumInsuredChangeType}
                      onChange={(e) => handleChange("sumInsuredChangeType", e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    >
                      <option value="INCREASE">Increase (+)</option>
                      <option value="DECREASE">Decrease (-)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                      Sum Insured Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="2500000.00"
                      value={form.sumInsuredChangeAmount}
                      onChange={(e) => handleChange("sumInsuredChangeAmount", e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    />
                  </div>
                </div>
              )}

              {/* Revenue Breakdown */}
              <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px", marginBottom: "20px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", display: "block", marginBottom: "10px" }}>
                  FINANCIAL REVENUE LEDGER
                </span>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "4px" }}>
                      Collected Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="2950.00"
                      value={form.collectedAmount}
                      onChange={(e) => handleChange("collectedAmount", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "4px" }}>
                      Net Premium Part
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="2500.00"
                      value={form.premiumPart}
                      onChange={(e) => handleChange("premiumPart", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "4px" }}>
                      GST Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="450.00"
                      value={form.gstPart}
                      onChange={(e) => handleChange("gstPart", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "4px" }}>
                      Payment Mode
                    </label>
                    <select
                      value={form.paymentMode}
                      onChange={(e) => handleChange("paymentMode", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    >
                      <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Credit / Debit Card</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                  Remarks / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter endorsement notes..."
                  value={form.remarks}
                  onChange={(e) => handleChange("remarks", e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>
            </>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "10px 20px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-submit-endorsement"
              style={{
                padding: "10px 24px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.2)",
              }}
            >
              {isSaving ? (
                <LoaderCircle size={16} className="spin" style={{ color: "#ffffff", stroke: "#ffffff" }} />
              ) : (
                <CheckCircle size={16} style={{ color: "#ffffff", stroke: "#ffffff" }} />
              )}
              <span style={{ color: "#ffffff", fontWeight: "700" }}>Save Endorsement</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
