"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, LoaderCircle, Upload, AlertCircle, FileCheck, ArrowRight } from "lucide-react";

export default function EndorsementAiVerificationModal({ endorsement, onClose, onSuccess }) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState("UPLOAD"); // UPLOAD -> COMPARISON -> COMPLETE
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [extractedData, setExtractedData] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [resolutions, setResolutions] = useState({});

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !endorsement) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
    }
  };

  const handleSimulatedAiExtraction = async () => {
    if (!pdfFile) {
      setErrorMessage("Please select an endorsement PDF file first.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    try {
      // Simulate AI PDF Extraction comparison against manual entered data
      const manualPrem = parseFloat(endorsement.premiumChangeAmount || endorsement.premiumDelta || 0);
      const simulatedExtractedPrem = manualPrem > 0 ? manualPrem + 200 : manualPrem; // Discrepancy example

      const extracted = {
        endorsementNo: endorsement.endorsementNo || "ENDO-OFFICIAL-1002",
        effectiveDate: endorsement.effectiveDate ? new Date(endorsement.effectiveDate).toISOString().split("T")[0] : "2026-07-15",
        premiumChangeAmount: simulatedExtractedPrem,
        sumInsuredChangeAmount: parseFloat(endorsement.sumInsuredChangeAmount || 0),
        remarks: endorsement.remarks || "Official insurer endorsement verified.",
      };

      setExtractedData(extracted);
      setResolutions({
        endorsementNo: "MANUAL",
        effectiveDate: "MANUAL",
        premiumChangeAmount: manualPrem === simulatedExtractedPrem ? "MANUAL" : "PDF",
        sumInsuredChangeAmount: "MANUAL",
      });

      setStep("COMPARISON");
    } catch (err) {
      setErrorMessage("Failed to extract endorsement PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveVerification = async () => {
    setIsProcessing(true);
    try {
      const finalPremium = resolutions.premiumChangeAmount === "PDF" ? extractedData.premiumChangeAmount : parseFloat(endorsement.premiumChangeAmount || 0);

      const res = await fetch(`/api/endorsements/${endorsement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentStatus: "VERIFIED",
          status: "Completed",
          premiumChangeAmount: finalPremium,
          verifiedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to verify endorsement.");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMessage(err.message || "Failed to update endorsement.");
    } finally {
      setIsProcessing(false);
    }
  };

  return createPortal(
    <div
      className="tb-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.35)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 3500,
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
            background: "#f8fafc",
          }}
        >
          <div>
            <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.05em", color: "#3b82f6", textTransform: "uppercase" }}>
              Side-by-Side AI Verification
            </span>
            <h3 style={{ margin: "2px 0 0 0", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
              Verify Endorsement #{endorsement.endorsementNo || "Pending"}
            </h3>
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
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {errorMessage && (
            <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "10px", backgroundColor: "#fef2f2", color: "#991b1b", fontSize: "13px" }}>
              {errorMessage}
            </div>
          )}

          {step === "UPLOAD" ? (
            <div style={{ textAlign: "center", padding: "30px 20px" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#eff6ff", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
                <Upload size={28} />
              </div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                Upload Insurer Endorsement Document
              </h4>
              <p style={{ margin: "0 0 24px 0", fontSize: "13px", color: "#64748b" }}>
                Select the official PDF document received from the insurance company to compare against manual entries.
              </p>

              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                style={{ display: "none" }}
                id="endorsement-pdf-file-input"
              />
              <label
                htmlFor="endorsement-pdf-file-input"
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  borderRadius: "12px",
                  border: "2px dashed #3b82f6",
                  backgroundColor: "#f8fafc",
                  color: "#1d4ed8",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  marginBottom: "20px",
                }}
              >
                {pdfFile ? pdfFile.name : "Choose PDF Document"}
              </label>

              <div>
                <button
                  onClick={handleSimulatedAiExtraction}
                  disabled={!pdfFile || isProcessing}
                  style={{
                    padding: "12px 28px",
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: "#0f172a",
                    color: "#ffffff",
                    fontWeight: "600",
                    fontSize: "14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: pdfFile && !isProcessing ? "pointer" : "not-allowed",
                  }}
                >
                  {isProcessing ? <LoaderCircle size={16} className="spin" /> : <FileCheck size={16} />}
                  Run AI Extraction & Compare
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h4 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                Side-by-Side Comparison: Manual Entry vs Extracted PDF
              </h4>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginBottom: "24px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>Field</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>Manually Entered</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>AI Extracted PDF</th>
                    <th style={{ padding: "12px 16px", textAlign: "center" }}>Resolution Choice</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: "600" }}>Endorsement No</td>
                    <td style={{ padding: "12px 16px" }}>{endorsement.endorsementNo || "-"}</td>
                    <td style={{ padding: "12px 16px", color: "#1e40af" }}>{extractedData?.endorsementNo}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <select
                        value={resolutions.endorsementNo}
                        onChange={(e) => setResolutions((r) => ({ ...r, endorsementNo: e.target.value }))}
                        style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                      >
                        <option value="MANUAL">Use Manual</option>
                        <option value="PDF">Use PDF</option>
                      </select>
                    </td>
                  </tr>

                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: "600" }}>Premium Amount (₹)</td>
                    <td style={{ padding: "12px 16px" }}>
                      ₹{parseFloat(endorsement.premiumChangeAmount || 0).toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#1e40af", fontWeight: "700" }}>
                      ₹{extractedData?.premiumChangeAmount?.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <select
                        value={resolutions.premiumChangeAmount}
                        onChange={(e) => setResolutions((r) => ({ ...r, premiumChangeAmount: e.target.value }))}
                        style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                      >
                        <option value="MANUAL">Keep Manual (₹{parseFloat(endorsement.premiumChangeAmount || 0).toLocaleString("en-IN")})</option>
                        <option value="PDF">Use PDF (₹{extractedData?.premiumChangeAmount?.toLocaleString("en-IN")})</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
                <button
                  type="button"
                  onClick={() => setStep("UPLOAD")}
                  style={{ padding: "10px 20px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleApproveVerification}
                  disabled={isProcessing}
                  style={{ padding: "10px 24px", borderRadius: "10px", border: "none", backgroundColor: "#10b981", color: "#ffffff", fontWeight: "700", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
                >
                  {isProcessing ? <LoaderCircle size={16} className="spin" /> : <CheckCircle size={16} />}
                  Approve Verification & Complete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
