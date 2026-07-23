"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, LoaderCircle, DollarSign, Calendar, FileText, AlertCircle } from "lucide-react";

export const ENDORSEMENT_TYPES = [
  { value: "ADDITION_PREMIUM", label: "Addition in Premium", isAddition: true, affects: "premium" },
  { value: "DELETION_PREMIUM", label: "Deletion in Premium", isAddition: false, affects: "premium" },
  { value: "ADDITION_SUM_INSURED", label: "Addition in Sum Insured", isAddition: true, affects: "sumInsured" },
  { value: "DELETION_SUM_INSURED", label: "Deletion in Sum Insured", isAddition: false, affects: "sumInsured" },
  { value: "CORRECTION_NAME_ADDRESS", label: "Name / Address Correction", isAddition: null, affects: "general" },
  { value: "PERIOD_EXTENSION", label: "Policy Period Extension / Revision", isAddition: null, affects: "general" },
  { value: "OTHER_ALTERATION", label: "Other Endorsement / Alteration", isAddition: null, affects: "general" },
];

export default function EndorsementModal({ record, onClose, onSuccess }) {
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const policyNo = record?.policyNumber || record?.policyNo || record?.data?.policyNumber || "";
  const insuredName = record?.insuredName || record?.data?.insuredName || "";
  const companyName = record?.insuranceCompany || record?.companyName || record?.data?.insuranceCompany || "";

  const [form, setForm] = useState({
    endorsementNo: `ENDO-${Date.now().toString().slice(-6)}`,
    endorsementDate: new Date().toISOString().split("T")[0],
    effectiveDate: new Date().toISOString().split("T")[0],
    endorsementType: "ADDITION_PREMIUM",
    premiumDelta: "",
    gstDelta: "",
    sumInsuredDelta: "",
    remarks: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleChange = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const selectedType = ENDORSEMENT_TYPES.find((t) => t.value === form.endorsementType);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!form.endorsementNo.trim()) {
      setErrorMessage("Endorsement Number is required.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        policyId: record.id,
        policyNo,
        insuredName,
        companyName,
        endorsementNo: form.endorsementNo,
        endorsementType: selectedType?.label || form.endorsementType,
        endorsementDate: form.endorsementDate,
        effectiveDate: form.effectiveDate,
        premiumDelta: parseFloat(form.premiumDelta || 0),
        gstDelta: parseFloat(form.gstDelta || 0),
        sumInsuredDelta: parseFloat(form.sumInsuredDelta || 0),
        remarks: form.remarks,
        status: "Approved",
      };

      const res = await fetch("/api/endorsements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save endorsement.");
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
        backgroundColor: "rgba(15, 23, 42, 0.3)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 3000,
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
          maxWidth: "600px",
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
            background: "#f8fafc",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.05em",
                color: "#64748b",
                textTransform: "uppercase",
              }}
            >
              Add Policy Endorsement
            </span>
            <h3 style={{ margin: "2px 0 0 0", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
              {policyNo ? `Policy #${policyNo}` : "Policy Endorsement"}
            </h3>
            {insuredName && (
              <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#475569" }}>{insuredName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {errorMessage && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px 16px",
                borderRadius: "12px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={16} />
              {errorMessage}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                Endorsement Number *
              </label>
              <input
                type="text"
                value={form.endorsementNo}
                onChange={(e) => handleChange("endorsementNo", e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                Endorsement Type *
              </label>
              <select
                value={form.endorsementType}
                onChange={(e) => handleChange("endorsementType", e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  backgroundColor: "#ffffff",
                }}
              >
                {ENDORSEMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                Endorsement Date *
              </label>
              <input
                type="date"
                value={form.endorsementDate}
                onChange={(e) => handleChange("endorsementDate", e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                Effective Date *
              </label>
              <input
                type="date"
                value={form.effectiveDate}
                onChange={(e) => handleChange("effectiveDate", e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>

          {(selectedType?.affects === "premium" || selectedType?.affects === "general") && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                  Premium Change (₹) {selectedType?.isAddition === false ? "(Deletion)" : "(Addition)"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder={selectedType?.isAddition === false ? "-500.00" : "1500.00"}
                  value={form.premiumDelta}
                  onChange={(e) => handleChange("premiumDelta", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                  GST Amount Change (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="270.00"
                  value={form.gstDelta}
                  onChange={(e) => handleChange("gstDelta", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                  }}
                />
              </div>
            </div>
          )}

          {(selectedType?.affects === "sumInsured" || selectedType?.affects === "general") && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                Sum Insured Change (₹) {selectedType?.isAddition === false ? "(Deletion)" : "(Addition)"}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={selectedType?.isAddition === false ? "-100000.00" : "500000.00"}
                value={form.sumInsuredDelta}
                onChange={(e) => handleChange("sumInsuredDelta", e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
              Endorsement Remarks / Details
            </label>
            <textarea
              rows={3}
              placeholder="Enter details of what changed in this endorsement..."
              value={form.remarks}
              onChange={(e) => handleChange("remarks", e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                resize: "vertical",
              }}
            />
          </div>

          <div
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              backgroundColor: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#475569",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: "10px 24px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                fontWeight: "600",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: isSaving ? "not-allowed" : "pointer",
              }}
            >
              {isSaving ? <LoaderCircle size={16} className="spin" /> : <CheckCircle size={16} />}
              Save Endorsement
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
