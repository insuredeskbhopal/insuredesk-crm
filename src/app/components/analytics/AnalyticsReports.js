"use client";

import { useState, useMemo } from "react";

export default function AnalyticsReports({ records = [], onEditRecord }) {
  const [activeTab, setActiveTab] = useState("motor-report");
  const [selectedAgent, setSelectedAgent] = useState("all");

  // Helper to determine line of business family
  const getRecordFamily = (record) => {
    const type = String(record.policyType || "").toLowerCase();
    const desc = String(record.description || "").toLowerCase();
    const file = String(record.sourceFile || "").toLowerCase();
    const comp = String(record.insuranceCompany || "").toLowerCase();
    const haystack = `${type} ${desc} ${file} ${comp}`;

    const hasMotorSignals =
      record.vehicleNumber ||
      record.registrationNumber ||
      record.engineNumber ||
      record.chassisNumber ||
      /\b(motor|private car|two wheeler|bike|scooter|commercial vehicle|taxi|cab|bus|chassis|engine)\b/.test(haystack);
    if (hasMotorSignals) return "motor";

    if (/\b(sfsp|fire|burglary|msme|warehouse|stock|property|contents)\b/.test(haystack)) return "fire";

    return "non-motor";
  };

  // Format date to DD-MM-YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  };

  // Helper to parse numbers safely
  const parsePremium = (value) => {
    if (typeof value === "number") return value;
    const cleaned = String(value || "").replace(/[^0-9.]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Format money back
  const formatPremium = (value) => {
    return Math.round(value).toLocaleString("en-IN");
  };

  // Filter records by LOB family
  const recordsByFamily = useMemo(() => {
    const motor = [];
    const fire = [];
    const nonMotor = [];

    records.forEach((record) => {
      const family = getRecordFamily(record);
      if (family === "motor") {
        motor.push(record);
      } else if (family === "fire") {
        fire.push(record);
      } else {
        nonMotor.push(record);
      }
    });

    return { motor, fire, nonMotor };
  }, [records]);

  // Extract unique agents from the list of records
  const uniqueAgents = useMemo(() => {
    const agents = new Set();
    records.forEach((r) => {
      const agentName = r.createdBy || r.assignedTo || "System";
      if (agentName) agents.add(agentName);
    });
    return Array.from(agents).sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Determine active records based on selected tab and selected agent
  const filteredRecords = useMemo(() => {
    let list = [];
    if (activeTab.startsWith("motor")) {
      list = recordsByFamily.motor;
    } else if (activeTab.startsWith("fire")) {
      list = recordsByFamily.fire;
    } else {
      list = recordsByFamily.nonMotor;
    }

    if (activeTab.endsWith("-individual") && selectedAgent !== "all") {
      list = list.filter((r) => (r.createdBy || r.assignedTo || "System") === selectedAgent);
    }
    return list;
  }, [activeTab, selectedAgent, recordsByFamily]);

  // Sum premium and net premium
  const totals = useMemo(() => {
    let premiumSum = 0;
    let netPremiumSum = 0;
    filteredRecords.forEach((r) => {
      premiumSum += parsePremium(r.premium || r.totalPremium);
      netPremiumSum += parsePremium(r.netPremium);
    });
    return {
      premium: premiumSum,
      netPremium: netPremiumSum,
    };
  }, [filteredRecords]);

  // Reset agent dropdown filter if tab changes to individual
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    if (tabName.endsWith("-individual") && selectedAgent === "all" && uniqueAgents.length > 0) {
      setSelectedAgent(uniqueAgents[0]);
    }
  };

  const isIndividualTab = activeTab.endsWith("-individual");

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .report-table-row:hover {
          background-color: var(--border-soft, #f1f5f9) !important;
        }
      `}} />

      {/* Tab bar header */}
      <div 
        style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          gap: "8px", 
          borderBottom: "1px solid var(--border)", 
          paddingBottom: "12px",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {[
            { id: "motor-report", label: "Motor Report" },
            { id: "motor-individual", label: "Individual Motor Report" },
            { id: "fire-report", label: "Fire Report" },
            { id: "fire-individual", label: "Individual Fire Report" },
            { id: "non-motor-report", label: "Non-Motor Report" },
            { id: "non-motor-individual", label: "Individual Non-Motor Report" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid",
                borderColor: activeTab === tab.id ? "var(--accent)" : "var(--border)",
                background: activeTab === tab.id ? "var(--accent)" : "var(--surface)",
                color: activeTab === tab.id ? "#ffffff" : "var(--text-primary)",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = "var(--border-soft)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = "var(--surface)";
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dropdown for Agent Selection (only shown for individual tabs) */}
        {isIndividualTab && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)" }}>
              Select Agent:
            </span>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "13px",
                fontWeight: "600",
                outline: "none",
                minWidth: "160px",
              }}
            >
              {uniqueAgents.map((agent) => (
                <option key={agent} value={agent}>
                  {agent}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Report Table Container */}
      <div 
        style={{ 
          border: "1px solid var(--border)", 
          borderRadius: "12px", 
          overflow: "hidden", 
          boxShadow: "var(--shadow-soft)",
          background: "var(--surface)"
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#fef08a", color: "#1e293b", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "12px 16px", fontWeight: "800", textTransform: "uppercase" }}>Date</th>
                <th style={{ padding: "12px 16px", fontWeight: "800", textTransform: "uppercase" }}>Insured Name</th>
                <th style={{ padding: "12px 16px", fontWeight: "800", textTransform: "uppercase" }}>
                  {activeTab.startsWith("motor") 
                    ? "Vehicle Number" 
                    : activeTab.startsWith("fire") 
                    ? "Risk Location" 
                    : "Policy Number"}
                </th>
                <th style={{ padding: "12px 16px", fontWeight: "800", textTransform: "uppercase" }}>Policy Type</th>
                <th style={{ padding: "12px 16px", fontWeight: "800", textTransform: "uppercase", textAlign: "right" }}>Premium</th>
                <th style={{ padding: "12px 16px", fontWeight: "800", textTransform: "uppercase", textAlign: "right" }}>Net Premium</th>
                <th style={{ padding: "12px 16px", fontWeight: "800", textTransform: "uppercase" }}>Insurance Company</th>
                <th style={{ padding: "12px 16px", fontWeight: "800", textTransform: "uppercase" }}>Line of Business</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "var(--text-secondary)", fontWeight: "600" }}>
                    No policy records found for this report filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const displayVehicleOrLocation = activeTab.startsWith("motor") 
                    ? record.vehicleNumber || "N/A" 
                    : activeTab.startsWith("fire") 
                    ? record.riskLocation || "N/A" 
                    : record.policyNumber || "N/A";

                  return (
                    <tr
                      key={record.id}
                      onClick={() => onEditRecord && onEditRecord(record)}
                      style={{
                        borderBottom: "1px solid var(--border-soft)",
                        cursor: "pointer",
                        transition: "background-color 0.15s ease-in-out",
                      }}
                      className="report-table-row"
                    >
                      <td style={{ padding: "12px 16px", color: "var(--text-primary)" }}>{formatDate(record.startDate)}</td>
                      <td style={{ padding: "12px 16px", fontWeight: "700", color: "var(--text-primary)" }}>{record.insuredName}</td>
                      <td style={{ padding: "12px 16px", color: "var(--text-primary)" }}>{displayVehicleOrLocation}</td>
                      <td style={{ padding: "12px 16px", color: "var(--text-primary)" }}>{record.policyType || "N/A"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "600", color: "var(--text-primary)" }}>
                        {record.premium ? formatPremium(parsePremium(record.premium)) : "-"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "600", color: "var(--text-primary)" }}>
                        {record.netPremium ? formatPremium(parsePremium(record.netPremium)) : "-"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-primary)" }}>{record.insuranceCompany || "N/A"}</td>
                      <td style={{ padding: "12px 16px", fontWeight: "700", color: record.newOrRenewal === "New" ? "#15803d" : "#0369a1" }}>
                        {record.newOrRenewal || "N/A"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot>
                <tr style={{ background: "#fef08a", color: "#1e293b", fontWeight: "800", borderTop: "2px solid #cbd5e1" }}>
                  <td colSpan={3} style={{ padding: "12px 16px" }}></td>
                  <td style={{ padding: "12px 16px", textTransform: "uppercase" }}>Total</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>{formatPremium(totals.premium)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>{formatPremium(totals.netPremium)}</td>
                  <td colSpan={2} style={{ padding: "12px 16px" }}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
