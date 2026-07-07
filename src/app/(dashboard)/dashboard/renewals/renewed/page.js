"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

export default function RenewedPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchRenewedPolicies = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/renewals/policies?tab=renewed&page=${page}&limit=10`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.policies) {
        setPolicies(data.policies);
        setTotalPages(data.pages || 1);
        setTotalCount(data.totalCount || 0);
      }
    } catch (error) {
      console.error("Failed to load renewed policies:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRenewedPolicies();
  }, [page]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="rn-table-container">
        <div style={{ padding: "16px", borderBottom: "1px solid var(--rn-border)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--rn-text-primary)", margin: 0 }}>
            Renewed Policies
          </h3>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <p>Loading renewed policies...</p>
          </div>
        ) : policies.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "40px 0",
              gap: "8px",
            }}
          >
            <AlertCircle size={24} style={{ color: "var(--rn-text-muted)" }} />
            <p style={{ color: "var(--rn-text-secondary)", fontSize: "14px" }}>
              No renewed policies recorded.
            </p>
          </div>
        ) : (
          <table className="rn-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Product / Policy</th>
                <th>Insurance Company</th>
                <th>Old Policy Number</th>
                <th>New Policy Number</th>
                <th>Renewed Date</th>
                <th>Premium</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: "600", color: "var(--rn-text-primary)" }}>{p.insuredName}</div>
                    <div style={{ fontSize: "12px", color: "var(--rn-text-muted)" }}>
                      {p.contactNumber || "No Mobile"}
                    </div>
                  </td>
                  <td>{p.displayPolicyType || p.policyType}</td>
                  <td>{p.insuranceCompany}</td>
                  <td>{p.policyNumber}</td>
                  <td style={{ fontWeight: "600", color: "var(--rn-success)" }}>
                    {p.newPolicyNumber || "Pending Number"}
                  </td>
                  <td>{p.renewalDate ? new Date(p.renewalDate).toLocaleDateString("en-IN") : "-"}</td>
                  <td>
                    ₹
                    {(
                      parseFloat(String(p.premium || p.totalPremium || "0").replace(/[^0-9.]/g, "")) || 0
                    ).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="rn-pagination">
          <span style={{ fontSize: "13px", color: "var(--rn-text-secondary)" }}>
            Page {page} of {totalPages} ({totalCount} policies renewed)
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="rn-btn" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <button
              className="rn-btn"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
