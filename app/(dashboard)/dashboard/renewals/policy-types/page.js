"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";

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
    { label: "Shop", queryName: "Commercial" },
    { label: "Office", queryName: "Commercial" },
    { label: "Cyber", queryName: "Other" },
    { label: "Liability", queryName: "Other" },
    { label: "Engineering", queryName: "Other" },
    { label: "Others", queryName: "Other" }
  ];

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/renewals/policy-types");
        const data = await res.json();
        if (res.ok && data.typeStats) {
          // Normalize and map results
          const mapped = targetTypes.map(item => {
            // Find match in SQL result
            const match = data.typeStats.find(row => 
              String(row.policy_family || "").toLowerCase().includes(item.queryName.toLowerCase())
            );
            return {
              label: item.label,
              queryName: item.queryName,
              due: match ? match.due : 0,
              renewed: match ? match.renewed : 0,
              lost: match ? match.lost : 0
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
    router.push(`/dashboard/renewals/policies?policyType=${encodeURIComponent(queryName)}`);
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
          <div 
            key={type.label} 
            className="renewals-card"
            onClick={() => handleCardClick(type.queryName)}
          >
            <div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ padding: "8px", borderRadius: "6px", backgroundColor: "var(--rn-border-light)", color: "var(--rn-text-secondary)" }}>
                  <FolderOpen size={18} />
                </div>
                <h4 style={{ fontSize: "16px", fontWeight: "600", margin: 0, color: "var(--rn-text-primary)" }}>
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
            <p className="renewals-card-footer" style={{ margin: "16px 0 0 0" }}>Click to view details</p>
          </div>
        ))}
      </div>
    </div>
  );
}
