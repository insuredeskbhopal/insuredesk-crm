"use client";

import { useState, useMemo } from "react";

export default function AnalyticsReports({ records = [], onEditRecord }) {
  const [activeTab, setActiveTab] = useState("motor-report");
  const [selectedAgent, setSelectedAgent] = useState("all");

  // Helper to determine if a record is Motor LOB
  const isMotorRecord = (record) => {
    const type = String(record.policyType || "").toLowerCase();
    const desc = String(record.description || "").toLowerCase();
    const file = String(record.sourceFile || "").toLowerCase();
    const comp = String(record.insuranceCompany || "").toLowerCase();
    const haystack = `${type} ${desc} ${file} ${comp}`;

    return (
      record.vehicleNumber ||
      record.registrationNumber ||
      record.engineNumber ||
      record.chassisNumber ||
      /\b(motor|private car|two wheeler|bike|scooter|commercial vehicle|taxi|cab|bus|chassis|engine)\b/.test(haystack)
    );
  };

  // Format date to DD/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const cleanStr = String(dateStr).split(" ")[0];
    try {
      if (cleanStr.includes("/")) {
        const parts = cleanStr.split("/");
        if (parts.length === 3 && parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
          return cleanStr;
        }
      }
      const d = new Date(cleanStr);
      if (isNaN(d.getTime())) return cleanStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return cleanStr;
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

  // Filter records by LOB family (Motor only)
  const motorRecords = useMemo(() => {
    return records.filter(isMotorRecord);
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
    let list = motorRecords;

    if (activeTab === "motor-individual" && selectedAgent !== "all") {
      list = list.filter((r) => (r.createdBy || r.assignedTo || "System") === selectedAgent);
    }
    return list;
  }, [activeTab, selectedAgent, motorRecords]);

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
    if (tabName === "motor-individual" && selectedAgent === "all" && uniqueAgents.length > 0) {
      setSelectedAgent(uniqueAgents[0]);
    }
  };

  const isIndividualTab = activeTab === "motor-individual";

  return (
    <div className="reports-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .reports-container {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          background: var(--surface-low, #fcfdfd);
        }

        .tabs-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid var(--border-soft, #f1f5f9);
          padding-bottom: 16px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .segmented-control {
          display: flex;
          background: var(--surface-variant, #f1f5f9);
          padding: 4px;
          border-radius: 12px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
        }

        .tab-btn {
          padding: 8px 20px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: var(--text-secondary, #64748b);
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .tab-btn:hover {
          color: var(--text-primary, #0f172a);
        }

        .tab-btn.active {
          background: #ffffff;
          color: var(--text-primary, #0f172a);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .agent-select-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .agent-select-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary, #64748b);
        }

        .agent-select {
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid var(--border, #cbd5e1);
          background: #ffffff;
          color: var(--text-primary, #0f172a);
          font-size: 13px;
          font-weight: 600;
          outline: none;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          transition: border-color 0.2s;
        }

        .agent-select:focus {
          border-color: var(--accent, #3b82f6);
        }

        .table-card {
          border: 1px solid var(--border-soft, #e2e8f0);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
          background: #ffffff;
        }

        .report-table-wrapper {
          overflow-x: auto;
        }

        .report-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }

        .report-table th {
          background: #fef08a !important; /* Premium yellow */
          color: #1e293b !important;
          padding: 16px 20px;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e2e8f0;
        }

        .report-table td {
          padding: 16px 20px;
          color: var(--text-primary, #334155);
          border-bottom: 1px solid #f1f5f9;
        }

        .report-table tr.report-table-row {
          transition: background-color 0.15s ease;
          cursor: pointer;
        }

        .report-table tr.report-table-row:hover {
          background-color: rgba(254, 240, 138, 0.25) !important; /* Soft yellow highlight */
        }

        .report-table tr.report-table-row:nth-child(even) {
          background-color: #fafbfc;
        }

        .report-table tr.report-table-row:nth-child(even):hover {
          background-color: rgba(254, 240, 138, 0.25) !important;
        }

        .report-table tfoot tr td {
          background: #fef08a !important; /* Premium yellow */
          color: #1e293b !important;
          font-weight: 800;
          padding: 16px 20px;
          border-top: 2px solid #cbd5e1;
          font-size: 13px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .badge-new {
          background: #dcfce7;
          color: #15803d;
        }

        .badge-renewal {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .badge-other {
          background: #f3f4f6;
          color: #4b5563;
        }
      `}} />

      {/* Tab bar header */}
      <div className="tabs-wrapper">
        <div className="segmented-control">
          {[
            { id: "motor-report", label: "Motor Report" },
            { id: "motor-individual", label: "Individual Motor Report" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dropdown for Agent Selection (only shown for individual tabs) */}
        {isIndividualTab && (
          <div className="agent-select-wrapper">
            <span className="agent-select-label">Select Agent:</span>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="agent-select"
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
      <div className="table-card">
        <div className="report-table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Insured Name</th>
                <th>Vehicle Number</th>
                <th>Policy Type</th>
                <th style={{ textAlign: "right" }}>Premium</th>
                <th style={{ textAlign: "right" }}>Net Premium</th>
                <th>Insurance Company</th>
                <th>Line of Business</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "var(--text-secondary)", fontWeight: "600" }}>
                    No motor policy records found for this report filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const lobBadgeClass = 
                    record.newOrRenewal === "New" 
                      ? "badge badge-new" 
                      : record.newOrRenewal === "Renewal" 
                      ? "badge badge-renewal" 
                      : "badge badge-other";

                  return (
                    <tr
                      key={record.id}
                      onClick={() => onEditRecord && onEditRecord(record)}
                      className="report-table-row"
                    >
                      <td>{formatDate(record.startDate)}</td>
                      <td style={{ fontWeight: "700" }}>{record.insuredName}</td>
                      <td>{record.vehicleNumber || "N/A"}</td>
                      <td>{record.policyType || "N/A"}</td>
                      <td style={{ textAlign: "right", fontWeight: "600" }}>
                        {record.premium ? formatPremium(parsePremium(record.premium)) : "-"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "600" }}>
                        {record.netPremium ? formatPremium(parsePremium(record.netPremium)) : "-"}
                      </td>
                      <td>{record.insuranceCompany || "N/A"}</td>
                      <td>
                        <span className={lobBadgeClass}>
                          {record.newOrRenewal || "N/A"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3}></td>
                  <td style={{ textTransform: "uppercase" }}>Total</td>
                  <td style={{ textAlign: "right" }}>{formatPremium(totals.premium)}</td>
                  <td style={{ textAlign: "right" }}>{formatPremium(totals.netPremium)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
