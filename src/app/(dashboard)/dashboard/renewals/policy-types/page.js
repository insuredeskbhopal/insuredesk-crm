"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderOpen,
  Car,
  HeartPulse,
  Flame,
  Ship,
  Store,
  Briefcase,
  ShieldAlert,
  Scale,
  Wrench,
  FileText,
  Users,
} from "lucide-react";

const POLICY_TYPE_CONFIG = {
  Motor: { icon: Car, color: "#3b82f6", bgColor: "#eff6ff" },
  Health: { icon: HeartPulse, color: "#ef4444", bgColor: "#fef2f2" },
  Life: { icon: Users, color: "#8b5cf6", bgColor: "#f5f3ff" },
  Fire: { icon: Flame, color: "#f97316", bgColor: "#fff7ed" },
  Marine: { icon: Ship, color: "#06b6d4", bgColor: "#ecfeff" },
  Shop: { icon: Store, color: "#10b981", bgColor: "#ecfdf5" },
  Office: { icon: Briefcase, color: "#6366f1", bgColor: "#eef2ff" },
  Cyber: { icon: ShieldAlert, color: "#0f172a", bgColor: "#f1f5f9" },
  Liability: { icon: Scale, color: "#a855f7", bgColor: "#faf5ff" },
  Engineering: { icon: Wrench, color: "#eab308", bgColor: "#fef9c3" },
  Others: { icon: FileText, color: "#6b7280", bgColor: "#f3f4f6" },
};

export default function PolicyTypesViewPage() {
  const router = useRouter();
  const [typeData, setTypeData] = useState([]);
  const [loading, setLoading] = useState(true);

  const targetTypes = [
    { label: "Motor", queryName: "Motor" },
    { label: "Health", queryName: "Health" },
    { label: "Life", queryName: "Life" },
    { label: "Fire", queryName: "Fire" },
    { label: "Marine", queryName: "Marine" },
    { label: "Shop", queryName: "Shop" },
    { label: "Office", queryName: "Office" },
    { label: "Cyber", queryName: "Cyber" },
    { label: "Liability", queryName: "Liability" },
    { label: "Engineering", queryName: "Engineering" },
    { label: "Others", queryName: "Others" },
  ];

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/renewals/policy-types", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data.typeStats) {
          // Normalize and map results
          const mapped = targetTypes.map((item) => {
            // Find match in SQL result
            const match = data.typeStats.find(
              (row) => String(row.policy_family || "").toLowerCase() === item.queryName.toLowerCase(),
            );
            return {
              label: item.label,
              queryName: item.queryName,
              due: match ? match.due : 0,
              renewed: match ? match.renewed : 0,
              lost: match ? match.lost : 0,
            };
          });
          setTypeData(mapped);
        }
      } catch (error) {
        console.error("Failed to load policy type stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTypes();
  }, []);

  const handleCardClick = (queryName) => {
    router.push(`/dashboard/renewals/customers?policyType=${encodeURIComponent(queryName)}`);
  };

  const renderPolicyIcon = (label) => {
    const config = POLICY_TYPE_CONFIG[label] || {
      icon: FolderOpen,
      color: "var(--rn-text-secondary)",
      bgColor: "var(--rn-border-light)",
    };
    const IconComponent = config.icon;
    return (
      <div
        style={{
          padding: "8px",
          borderRadius: "6px",
          backgroundColor: config.bgColor,
          color: config.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconComponent size={18} />
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <p>Loading policy type stats...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="renewals-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {typeData.map((type) => (
          <div key={type.label} className="renewals-card" onClick={() => handleCardClick(type.queryName)}>
            <div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
                {renderPolicyIcon(type.label)}
                <h4
                  style={{ fontSize: "16px", fontWeight: "600", margin: 0, color: "var(--rn-text-primary)" }}
                >
                  {type.label}
                </h4>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "var(--rn-text-secondary)" }}>Policies Due</span>
                  <span style={{ fontWeight: "700", color: "var(--rn-warning)" }}>{type.due}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "var(--rn-text-secondary)" }}>Renewed</span>
                  <span style={{ fontWeight: "700", color: "var(--rn-success)" }}>{type.renewed}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "var(--rn-text-secondary)" }}>Lost</span>
                  <span style={{ fontWeight: "700", color: "var(--rn-danger)" }}>{type.lost}</span>
                </div>
              </div>
            </div>
            <p className="renewals-card-footer" style={{ margin: "16px 0 0 0" }}>
              Click to view details
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
