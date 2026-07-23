"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  PlusCircle,
  Clock,
  CheckCircle,
  FileText,
  DollarSign,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Upload,
  ChevronRight,
  RotateCcw,
  Building,
} from "lucide-react";
import { getPolicyFinancialsAsOf, getEndorsementAging } from "@/lib/policies/endorsement-engine";
import AddEndorsementModal from "@/app/components/shared/AddEndorsementModal";
import EndorsementAiVerificationModal from "@/app/components/shared/EndorsementAiVerificationModal";

export default function EndorsementManagementDrawer({ record, onClose, onRefresh }) {
  const [mounted, setMounted] = useState(false);
  const [endorsements, setEndorsements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [verifyingEndorsement, setVerifyingEndorsement] = useState(null);

  const fetchPolicyEndorsements = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/endorsements?policyId=${record.id}`);
      if (res.ok) {
        const data = await res.json();
        setEndorsements(data.endorsements || []);
      }
    } catch (err) {
      console.error("Failed to load policy endorsements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (record) fetchPolicyEndorsements();
  }, [record]);

  if (!mounted || !record) return null;

  const financials = getPolicyFinancialsAsOf(record, endorsements);

  const policyNo = record?.policyNumber || record?.policyNo || record?.data?.policyNumber || "";
  const insuredName = record?.insuredName || record?.data?.insuredName || "";

  return createPortal(
    <div
      className="tb-modal-overlay backdrop-blur-md"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 2500,
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
          width: "100%",
          maxWidth: "860px",
          maxHeight: "88vh",
          borderRadius: "24px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.35)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 28px",
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
                letterSpacing: "0.06em",
                color: "#2563eb",
                textTransform: "uppercase",
                backgroundColor: "#eff6ff",
                padding: "3px 10px",
                borderRadius: "12px",
                border: "1px solid #dbeafe",
                display: "inline-block",
                marginBottom: "6px",
              }}
            >
              Warehouse Endorsement Management
            </span>
            <h3 style={{ margin: "2px 0 0 0", fontSize: "19px", fontWeight: "800", color: "#0f172a" }}>
              {policyNo ? `Policy #${policyNo}` : "Policy Details"}
            </h3>
            {insuredName && <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#475569", fontWeight: "500" }}>{insuredName}</p>}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                border: "none",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(15, 23, 42, 0.2)",
                transition: "transform 0.15s, background-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#1e293b";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#0f172a";
                e.currentTarget.style.transform = "none";
              }}
            >
              <PlusCircle size={17} color="#ffffff" />
              <span style={{ color: "#ffffff", fontWeight: "700" }}>+ Add Endorsement</span>
            </button>

            <button
              onClick={onClose}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#0f172a",
                transition: "background-color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f1f5f9";
                e.currentTarget.style.borderColor = "#94a3b8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
            >
              <X size={18} color="#0f172a" />
            </button>
          </div>
        </div>

        {/* Financial Summary Top Section */}
        <div style={{ padding: "20px 28px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "14px" }}>
            <div style={{ background: "#ffffff", borderRadius: "14px", padding: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Base Net Premium</span>
              <p style={{ margin: "6px 0 0 0", fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
                ₹{financials.basePremium.toLocaleString("en-IN")}
              </p>
            </div>

            <div style={{ background: "#eff6ff", borderRadius: "14px", padding: "16px", border: "1.5px solid #3b82f6", boxShadow: "0 4px 12px rgba(59,130,246,0.12)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.04em" }}>Effective Current Net Premium</span>
              <p style={{ margin: "6px 0 0 0", fontSize: "20px", fontWeight: "800", color: "#2563eb" }}>
                ₹{financials.currentNetPremium.toLocaleString("en-IN")}
              </p>
            </div>

            <div style={{ background: "#ffffff", borderRadius: "14px", padding: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Effective Sum Insured</span>
              <p style={{ margin: "6px 0 0 0", fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
                ₹{financials.currentSumInsured.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px", color: "#475569" }}>
            <span>Total Endorsements: <strong style={{ color: "#0f172a" }}>{financials.totalEndorsementsCount}</strong></span>
            <span>Effective Active: <strong style={{ color: "#0f172a" }}>{financials.effectiveEndorsementsCount}</strong></span>
          </div>
        </div>

        {/* Timeline Feed Section */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
          <h4 style={{ margin: "0 0 18px 0", fontSize: "15px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
            <Calendar size={18} color="#2563eb" /> Unified Policy Activity Timeline & History
          </h4>

          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#64748b", fontWeight: "500" }}>Loading endorsement timeline...</div>
          ) : endorsements.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "18px", border: "1.5px dashed #cbd5e1" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "600", color: "#334155" }}>
                No endorsements recorded for this policy yet.
              </p>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                Click <strong style={{ color: "#0f172a" }}>+ Add Endorsement</strong> to record premium, sum insured, location, or financier changes.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {endorsements.map((item) => {
                const aging = getEndorsementAging(item);
                return (
                  <div
                    key={item.id}
                    style={{
                      background: "#ffffff",
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                      padding: "20px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                      <div>
                        <span style={{ fontWeight: "800", fontSize: "15px", color: "#0f172a" }}>
                          {item.endorsementNo || "ENDO-MANUAL"}
                        </span>
                        <span style={{ marginLeft: "12px", fontSize: "13px", fontWeight: "600", color: "#64748b" }}>
                          {item.endorsementType || "Endorsement"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "700",
                            backgroundColor: `${aging.color}15`,
                            color: aging.color,
                            border: `1px solid ${aging.color}30`,
                          }}
                        >
                          {aging.statusLabel}
                        </span>

                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "700",
                            backgroundColor: item.status === "Completed" || item.documentStatus === "VERIFIED" ? "#dcfce7" : "#fef3c7",
                            color: item.status === "Completed" || item.documentStatus === "VERIFIED" ? "#166534" : "#92400e",
                          }}
                        >
                          {item.status || "Draft"}
                        </span>
                      </div>
                    </div>

                    <div style={{ gridTemplateColumns: "1fr 1fr 1fr", display: "grid", gap: "12px", fontSize: "13px", color: "#475569", marginBottom: "14px", background: "#f8fafc", padding: "12px 14px", borderRadius: "12px" }}>
                      <div>
                        <strong style={{ color: "#334155" }}>Effective Date:</strong> {item.effectiveDate ? new Date(item.effectiveDate).toLocaleDateString("en-IN") : "-"}
                      </div>
                      <div>
                        <strong style={{ color: "#334155" }}>Premium Δ:</strong> {item.premiumChangeAmount ? `₹${parseFloat(item.premiumChangeAmount).toLocaleString("en-IN")}` : "No Change"}
                      </div>
                      <div>
                        <strong style={{ color: "#334155" }}>Sum Insured Δ:</strong> {item.sumInsuredChangeAmount ? `₹${parseFloat(item.sumInsuredChangeAmount).toLocaleString("en-IN")}` : "No Change"}
                      </div>
                    </div>

                    {item.remarks && <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#64748b" }}>{item.remarks}</p>}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                      {item.documentStatus !== "VERIFIED" && item.status !== "Completed" && (
                        <button
                          onClick={() => setVerifyingEndorsement(item)}
                          style={{
                            padding: "7px 16px",
                            borderRadius: "10px",
                            border: "1px solid #3b82f6",
                            backgroundColor: "#eff6ff",
                            color: "#1d4ed8",
                            fontWeight: "700",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            cursor: "pointer",
                          }}
                        >
                          <Upload size={14} color="#1d4ed8" />
                          Upload & Verify PDF
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddEndorsementModal
          record={record}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchPolicyEndorsements();
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {verifyingEndorsement && (
        <EndorsementAiVerificationModal
          endorsement={verifyingEndorsement}
          onClose={() => setVerifyingEndorsement(null)}
          onSuccess={() => {
            setVerifyingEndorsement(null);
            fetchPolicyEndorsements();
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>,
    document.body
  );
}
