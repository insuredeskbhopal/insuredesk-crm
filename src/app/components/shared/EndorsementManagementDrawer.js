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
      className="tb-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 2500,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        className="tb-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          width: "100%",
          maxWidth: "800px",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-10px 0 30px rgba(15, 23, 42, 0.2)",
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
            <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.05em", color: "#2563eb", textTransform: "uppercase" }}>
              Warehouse Endorsement Management
            </span>
            <h3 style={{ margin: "2px 0 0 0", fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
              {policyNo ? `Policy #${policyNo}` : "Policy Details"}
            </h3>
            {insuredName && <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#475569" }}>{insuredName}</p>}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              className="btn-add-endorsement"
              onClick={() => setShowAddModal(true)}
              style={{
                padding: "9px 18px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "13px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.2)",
              }}
            >
              <PlusCircle size={16} color="#ffffff" style={{ color: "#ffffff", strokeWidth: "2" }} />
              <span style={{ color: "#ffffff", fontWeight: "700" }}>Add Endorsement</span>
            </button>

            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: "36px",
                height: "36px",
                minWidth: "36px",
                minHeight: "36px",
                borderRadius: "50%",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#475569",
                padding: 0,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <X size={18} color="#475569" style={{ strokeWidth: "2" }} />
            </button>
          </div>
        </div>

        {/* Financial Summary Top Section */}
        <div style={{ padding: "20px 24px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "12px" }}>
            <div style={{ background: "#ffffff", borderRadius: "12px", padding: "14px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Base Net Premium</span>
              <p style={{ margin: "4px 0 0 0", fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                ₹{financials.basePremium.toLocaleString("en-IN")}
              </p>
            </div>

            <div style={{ background: "#ffffff", borderRadius: "12px", padding: "14px", border: "1.5px solid #3b82f6", boxShadow: "0 2px 6px rgba(59,130,246,0.12)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb", textTransform: "uppercase" }}>Effective Current Net Premium</span>
              <p style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: "800", color: "#2563eb" }}>
                ₹{financials.currentNetPremium.toLocaleString("en-IN")}
              </p>
            </div>

            <div style={{ background: "#ffffff", borderRadius: "12px", padding: "14px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Effective Sum Insured</span>
              <p style={{ margin: "4px 0 0 0", fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                ₹{financials.currentSumInsured.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "#475569" }}>
            <span>Total Endorsements: <strong>{financials.totalEndorsementsCount}</strong></span>
            <span>Effective Active: <strong>{financials.effectiveEndorsementsCount}</strong></span>
          </div>
        </div>

        {/* Timeline Feed Section */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <h4 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
            <Calendar size={16} color="#2563eb" /> Unified Policy Activity Timeline & History
          </h4>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading endorsement timeline...</div>
          ) : endorsements.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "16px", border: "1px dashed #cbd5e1" }}>
              No endorsements recorded for this policy yet. Click <strong>+ Add Endorsement</strong> to create one.
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
                      padding: "18px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <div>
                        <span style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>
                          {item.endorsementNo || "ENDO-MANUAL"}
                        </span>
                        <span style={{ marginLeft: "10px", fontSize: "12px", color: "#64748b" }}>
                          {item.endorsementType || "Endorsement"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
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
                            padding: "4px 10px",
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

                    <div style={{ gridTemplateColumns: "1fr 1fr 1fr", display: "grid", gap: "12px", fontSize: "12px", color: "#475569", marginBottom: "12px", background: "#f8fafc", padding: "10px 12px", borderRadius: "10px" }}>
                      <div>
                        <strong>Effective Date:</strong> {item.effectiveDate ? new Date(item.effectiveDate).toLocaleDateString("en-IN") : "-"}
                      </div>
                      <div>
                        <strong>Premium Δ:</strong> {item.premiumChangeAmount ? `₹${parseFloat(item.premiumChangeAmount).toLocaleString("en-IN")}` : "No Change"}
                      </div>
                      <div>
                        <strong>Sum Insured Δ:</strong> {item.sumInsuredChangeAmount ? `₹${parseFloat(item.sumInsuredChangeAmount).toLocaleString("en-IN")}` : "No Change"}
                      </div>
                    </div>

                    {item.remarks && <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#64748b" }}>{item.remarks}</p>}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                      {item.documentStatus !== "VERIFIED" && item.status !== "Completed" && (
                        <button
                          onClick={() => setVerifyingEndorsement(item)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "8px",
                            border: "1px solid #3b82f6",
                            backgroundColor: "#eff6ff",
                            color: "#1d4ed8",
                            fontWeight: "600",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
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
