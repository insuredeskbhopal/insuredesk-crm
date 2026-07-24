"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  Upload,
  Search,
  Filter,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  Eye,
  PlusCircle,
  RefreshCw,
  Layers,
} from "lucide-react";
import PolicyDetailCard from "@/app/components/shared/PolicyDetailCard";
import EndorsementAiVerificationModal from "@/app/components/shared/EndorsementAiVerificationModal";

export default function EndorsementWorkQueuePage() {
  const [endorsements, setEndorsements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [verifyingEndorsement, setVerifyingEndorsement] = useState(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/endorsements");
      if (res.ok) {
        const data = await res.json();
        setEndorsements(data.endorsements || []);
      }
    } catch (err) {
      console.error("Failed to load endorsement queue:", err);
    } finally {
      setLoading(false);
    }
  };

  const getAging = (createdDate, docStatus, status) => {
    if (docStatus === "VERIFIED" || status === "COMPLETED" || status === "Completed") {
      return { days: 0, label: "Completed", color: "#10b981", isEscalated: false };
    }
    const created = createdDate ? new Date(createdDate) : new Date();
    const now = new Date();
    const days = Math.floor(Math.abs(now - created) / (1000 * 60 * 60 * 24));

    if (days >= 21) {
      return { days, label: `Waiting ${days} Days ⚠️ Escalate`, color: "#ef4444", isEscalated: true };
    } else if (days >= 7) {
      return { days, label: `Waiting ${days} Days`, color: "#f59e0b", isEscalated: false };
    }
    return { days, label: `Waiting ${days} Days`, color: "#3b82f6", isEscalated: false };
  };

  const pendingDocsCount = endorsements.filter((e) => e.documentStatus !== "VERIFIED" && e.status !== "Completed").length;
  const pendingPaymentCount = endorsements.filter((e) => e.status === "PENDING_PAYMENT" || e.status === "PAYMENT_DUE").length;
  const escalatedCount = endorsements.filter((e) => getAging(e.createdAt, e.documentStatus, e.status).isEscalated).length;
  const completedCount = endorsements.filter((e) => e.status === "Completed" || e.documentStatus === "VERIFIED").length;

  const filteredQueue = endorsements.filter((e) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      String(e.endorsementNo || "").toLowerCase().includes(q) ||
      String(e.policyNo || "").toLowerCase().includes(q) ||
      String(e.insuredName || "").toLowerCase().includes(q) ||
      String(e.companyName || "").toLowerCase().includes(q);

    if (!matchSearch) return false;

    if (statusFilter === "PENDING_DOCS") return e.documentStatus !== "VERIFIED" && e.status !== "Completed";
    if (statusFilter === "PENDING_PAYMENT") return e.status === "PENDING_PAYMENT" || e.status === "PAYMENT_DUE";
    if (statusFilter === "ESCALATED") return getAging(e.createdAt, e.documentStatus, e.status).isEscalated;
    if (statusFilter === "COMPLETED") return e.status === "Completed" || e.documentStatus === "VERIFIED";

    return true;
  });

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Layers size={20} style={{ color: "#3b82f6" }} />
            <span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.05em", color: "#64748b", textTransform: "uppercase" }}>
              Operations Work Queue
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>
            Warehouse Policy Endorsement Queue
          </h1>
        </div>
        <button
          onClick={fetchQueue}
          style={{
            padding: "10px 18px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            backgroundColor: "#ffffff",
            color: "#334155",
            fontWeight: "600",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={16} />
          Refresh Queue
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "#ffffff", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Pending Documents</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "#eff6ff", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={18} />
            </div>
          </div>
          <p style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "#0f172a" }}>{pendingDocsCount}</p>
        </div>

        <div style={{ background: "#ffffff", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Pending Payments</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DollarSign size={18} />
            </div>
          </div>
          <p style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "#0f172a" }}>{pendingPaymentCount}</p>
        </div>

        <div style={{ background: "#ffffff", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Escalated (&gt; 21 Days)</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <p style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "#ef4444" }}>{escalatedCount}</p>
        </div>

        <div style={{ background: "#ffffff", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Completed</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={18} />
            </div>
          </div>
          <p style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "#0f172a" }}>{completedCount}</p>
        </div>
      </div>

      {/* Queue Toolbar */}
      <div style={{ background: "#ffffff", borderRadius: "16px", padding: "16px 20px", border: "1px solid #e2e8f0", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, maxWidth: "400px" }}>
          <Search size={18} style={{ color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Search by policy no, insured name, endorsement no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: "none", outline: "none", width: "100%", fontSize: "14px", color: "#0f172a" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {["ALL", "PENDING_DOCS", "PENDING_PAYMENT", "ESCALATED", "COMPLETED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "none",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                backgroundColor: statusFilter === st ? "#0f172a" : "#f1f5f9",
                color: statusFilter === st ? "#ffffff" : "#475569",
              }}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Work Queue Table */}
      <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: "700" }}>
              <th style={{ padding: "14px 20px" }}>Endorsement No</th>
              <th style={{ padding: "14px 20px" }}>Policy No / Insured</th>
              <th style={{ padding: "14px 20px" }}>Type / Impacts</th>
              <th style={{ padding: "14px 20px" }}>Effective Date</th>
              <th style={{ padding: "14px 20px" }}>Aging Tracker</th>
              <th style={{ padding: "14px 20px" }}>Status</th>
              <th style={{ padding: "14px 20px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                  Loading operational work queue...
                </td>
              </tr>
            ) : filteredQueue.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                  No pending endorsements found matching filter.
                </td>
              </tr>
            ) : (
              filteredQueue.map((item) => {
                const aging = getAging(item.createdAt, item.documentStatus, item.status);
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px 20px", fontWeight: "700", color: "#0f172a" }}>
                      {item.endorsementNo || "ENDO-PENDING"}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontWeight: "700", color: "#0f172a" }}>{item.policyNo || "-"}</div>
                      <div style={{ color: "#64748b", fontSize: "12px" }}>{item.insuredName || "-"}</div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontWeight: "600", color: "#334155" }}>{item.endorsementType || "Endorsement"}</div>
                      {item.premiumChangeAmount && (
                        <div style={{ fontSize: "11px", color: "#10b981" }}>
                          Premium Δ: ₹{parseFloat(item.premiumChangeAmount).toLocaleString("en-IN")}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "14px 20px", color: "#475569" }}>
                      {item.effectiveDate ? new Date(item.effectiveDate).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "700",
                          backgroundColor: `${aging.color}15`,
                          color: aging.color,
                          border: `1px solid ${aging.color}30`,
                        }}
                      >
                        <Clock size={12} />
                        {aging.label}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "700",
                          backgroundColor: item.documentStatus === "VERIFIED" ? "#dcfce7" : "#fef3c7",
                          color: item.documentStatus === "VERIFIED" ? "#166534" : "#92400e",
                        }}
                      >
                        {item.documentStatus || "AWAITING_UPLOAD"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                        {item.documentStatus !== "VERIFIED" && (
                          <button
                            onClick={() => setVerifyingEndorsement(item)}
                            style={{
                              padding: "6px 12px",
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
                            <Upload size={14} />
                            Upload & Verify PDF
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedRecord({ id: item.policyId || item.id, ...item })}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            backgroundColor: "#ffffff",
                            color: "#475569",
                            fontWeight: "600",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            cursor: "pointer",
                          }}
                        >
                          <Eye size={14} />
                          View Policy
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {selectedRecord && (
        <PolicyDetailCard record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}

      {verifyingEndorsement && (
        <EndorsementAiVerificationModal
          endorsement={verifyingEndorsement}
          onClose={() => setVerifyingEndorsement(null)}
          onSuccess={() => {
            setVerifyingEndorsement(null);
            fetchQueue();
          }}
        />
      )}
    </div>
  );
}
