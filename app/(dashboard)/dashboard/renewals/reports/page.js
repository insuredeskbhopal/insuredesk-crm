"use client";

import { useEffect, useState } from "react";
import { Printer, Download, ShieldAlert, TrendingUp, Award, AlertTriangle } from "lucide-react";

export default function ReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");

      // 1. Fetch user role first
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData.success) {
        setUserRole(meData.user.role || "");
      }

      // 2. Fetch report statistics
      const res = await fetch("/api/renewals/reports");
      const data = await res.json();
      if (res.ok) {
        setReportData(data);
      } else {
        setError(data.error || "Failed to load reports.");
      }
    } catch {
      setError("Failed to generate report statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Check if role is allowed to export/print
  const canExport = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(userRole);

  // Print function
  const handlePrint = () => {
    if (!canExport) {
      window.alert("You do not have permission to print this report.");
      return;
    }
    window.print();
  };

  // CSV Export helper
  const handleExport = () => {
    if (!canExport) {
      window.alert("You do not have permission to export this report.");
      return;
    }
    if (!reportData) return;

    // Build CSV content from Agent stats as an example
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Agent Name,Total Assigned,Due Count,Renewed Count,Lost Count,Premium Renewed\n";

    reportData.agents.forEach((a) => {
      csvContent += `"${a.agent_name}",${a.total_assigned},${a.due_count},${a.renewed_count},${a.lost_count},${a.premium_renewed}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "agent_renewal_performance.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <p>Generating management reports statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "60px 24px",
          gap: "16px",
        }}
      >
        <ShieldAlert size={48} style={{ color: "var(--rn-danger)" }} />
        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "var(--rn-text-primary)" }}>
          Access Restricted
        </h3>
        <p style={{ color: "var(--rn-text-secondary)", maxWidth: "480px", textAlign: "center", margin: 0 }}>
          {error}
        </p>
      </div>
    );
  }

  if (!reportData) return null;

  // Calculate Overall Conversion Rate
  const totalRenewed = reportData.agents.reduce((acc, a) => acc + a.renewed_count, 0);
  const totalLost = reportData.agents.reduce((acc, a) => acc + a.lost_count, 0);
  const conversionRate = totalRenewed + totalLost > 0 ? (totalRenewed / (totalRenewed + totalLost)) * 100 : 0;

  // Follow-up effectiveness
  const withFup = reportData.followUps.find((f) => f.has_followup === "With Follow-up") || {
    renewed_count: 0,
    lost_count: 0,
  };
  const withFupRate =
    withFup.renewed_count + withFup.lost_count > 0
      ? (withFup.renewed_count / (withFup.renewed_count + withFup.lost_count)) * 100
      : 0;

  const noFup = reportData.followUps.find((f) => f.has_followup === "No Follow-up") || {
    renewed_count: 0,
    lost_count: 0,
  };
  const noFupRate =
    noFup.renewed_count + noFup.lost_count > 0
      ? (noFup.renewed_count / (noFup.renewed_count + noFup.lost_count)) * 100
      : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }} className="print-section">
      {/* Management Actions Header */}
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        className="no-print"
      >
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--rn-text-primary)", margin: 0 }}>
          Executive Analytics
        </h3>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            className="rn-btn"
            onClick={handlePrint}
            disabled={!canExport}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Printer size={14} /> Print Report
          </button>
          <button
            className="rn-btn rn-btn-primary"
            onClick={handleExport}
            disabled={!canExport}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards Row */}
      <div className="renewals-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        <div className="renewals-card">
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "12px",
              }}
            >
              <h4 className="renewals-card-title">Renewal Conversion Rate</h4>
              <TrendingUp size={18} style={{ color: "var(--rn-success)" }} />
            </div>
            <p className="renewals-card-value">{conversionRate.toFixed(1)}%</p>
          </div>
          <p className="renewals-card-footer">Renewed policies / completed outcomes</p>
        </div>

        <div className="renewals-card">
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "12px",
              }}
            >
              <h4 className="renewals-card-title">Follow-Up Effectiveness</h4>
              <Award size={18} style={{ color: "var(--rn-primary)" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--rn-success)" }}>
                With Tasks: {withFupRate.toFixed(1)}% Conv.
              </div>
              <div style={{ fontSize: "13px", color: "var(--rn-text-secondary)" }}>
                Without Tasks: {noFupRate.toFixed(1)}% Conv.
              </div>
            </div>
          </div>
          <p className="renewals-card-footer">Impact of scheduling follow-ups</p>
        </div>

        <div className="renewals-card">
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "12px",
              }}
            >
              <h4 className="renewals-card-title">Lost Reason Analysis</h4>
              <AlertTriangle size={18} style={{ color: "var(--rn-danger)" }} />
            </div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--rn-text-primary)" }}>
              Top Reason: {reportData.lostReasons[0]?.reason || "N/A"}
            </div>
          </div>
          <p className="renewals-card-footer">Based on {totalLost} lost renewals</p>
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="rn-table-container">
        <div style={{ padding: "16px", borderBottom: "1px solid var(--rn-border)" }}>
          <h4 style={{ fontSize: "15px", fontWeight: "600", color: "var(--rn-text-primary)", margin: 0 }}>
            Agent Performance
          </h4>
        </div>
        <table className="rn-table">
          <thead>
            <tr>
              <th>Agent Name</th>
              <th>Total Assigned</th>
              <th>Due (Pending)</th>
              <th>Renewed</th>
              <th>Lost</th>
              <th>Conversions %</th>
              <th>Premium Renewed</th>
            </tr>
          </thead>
          <tbody>
            {reportData.agents.map((a, idx) => {
              const totalOutcomes = a.renewed_count + a.lost_count;
              const rate = totalOutcomes > 0 ? (a.renewed_count / totalOutcomes) * 100 : 0;
              return (
                <tr key={idx}>
                  <td style={{ fontWeight: "600", color: "var(--rn-text-primary)" }}>{a.agent_name}</td>
                  <td>{a.total_assigned}</td>
                  <td>{a.due_count}</td>
                  <td style={{ color: "var(--rn-success)" }}>{a.renewed_count}</td>
                  <td style={{ color: "var(--rn-danger)" }}>{a.lost_count}</td>
                  <td style={{ fontWeight: "600" }}>{rate.toFixed(1)}%</td>
                  <td style={{ fontWeight: "600" }}>₹{a.premium_renewed.toLocaleString("en-IN")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Company Performance Table */}
      <div className="rn-table-container">
        <div style={{ padding: "16px", borderBottom: "1px solid var(--rn-border)" }}>
          <h4 style={{ fontSize: "15px", fontWeight: "600", color: "var(--rn-text-primary)", margin: 0 }}>
            Company Performance
          </h4>
        </div>
        <table className="rn-table">
          <thead>
            <tr>
              <th>Underwriter</th>
              <th>Total Policies</th>
              <th>Due (Pending)</th>
              <th>Renewed</th>
              <th>Lost</th>
              <th>Premium Renewed</th>
            </tr>
          </thead>
          <tbody>
            {reportData.companies.map((c, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: "600", color: "var(--rn-text-primary)" }}>{c.company_name}</td>
                <td>{c.total_policies}</td>
                <td>{c.due_count}</td>
                <td style={{ color: "var(--rn-success)" }}>{c.renewed_count}</td>
                <td style={{ color: "var(--rn-danger)" }}>{c.lost_count}</td>
                <td>₹{c.premium_renewed.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Monthly Trends Table */}
      <div className="rn-table-container">
        <div style={{ padding: "16px", borderBottom: "1px solid var(--rn-border)" }}>
          <h4 style={{ fontSize: "15px", fontWeight: "600", color: "var(--rn-text-primary)", margin: 0 }}>
            Monthly Renewal Trend
          </h4>
        </div>
        <table className="rn-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Expired / Due Policies</th>
              <th>Renewed Count</th>
              <th>Conversion Rate</th>
              <th>Total Premium Expiring</th>
              <th>Premium Renewed</th>
            </tr>
          </thead>
          <tbody>
            {reportData.monthlyTrends.map((t, idx) => {
              const rate = t.expired_count > 0 ? (t.renewed_count / t.expired_count) * 100 : 0;
              return (
                <tr key={idx}>
                  <td style={{ fontWeight: "600", color: "var(--rn-text-primary)" }}>{t.month_key}</td>
                  <td>{t.expired_count}</td>
                  <td style={{ color: "var(--rn-success)" }}>{t.renewed_count}</td>
                  <td style={{ fontWeight: "600" }}>{rate.toFixed(1)}%</td>
                  <td>₹{t.total_premium.toLocaleString("en-IN")}</td>
                  <td style={{ fontWeight: "600" }}>₹{t.premium_renewed.toLocaleString("en-IN")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
