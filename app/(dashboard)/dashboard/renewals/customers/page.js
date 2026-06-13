"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Phone, 
  MessageSquare, 
  User, 
  ArrowRight,
  ChevronRight,
  AlertCircle
} from "lucide-react";

export default function CustomerRenewalsPage() {
  const router = useRouter();

  // Filter and Data states
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const url = `/api/renewals/customers?q=${encodeURIComponent(q)}&status=${statusFilter}&page=${page}&limit=10`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.customers) {
        setCustomers(data.customers);
        setTotalPages(data.pages || 1);
        setTotalCount(data.totalCount || 0);
      }
    } catch (error) {
      console.error("Failed to load customer renewals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const handleCall = (cust) => {
    if (cust.mobile && !cust.mobile.startsWith("NO-MOBILE-")) {
      window.open(`tel:${cust.mobile}`);
    } else {
      alert("No phone number associated with this customer portfolio.");
    }
  };

  const handleWhatsApp = (cust) => {
    if (cust.mobile && !cust.mobile.startsWith("NO-MOBILE-")) {
      window.open(`https://wa.me/91${cust.mobile.replace(/[^0-9]/g, "")}`, "_blank");
    } else {
      alert("No phone number associated with this customer portfolio.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Filters Bar */}
      <form onSubmit={handleSearchSubmit} className="rn-filters-bar">
        <div style={{ display: "flex", alignItems: "center", position: "relative", flex: 1 }}>
          <Search size={16} style={{ position: "absolute", left: "12px", color: "var(--rn-text-muted)" }} />
          <input 
            type="text" 
            className="rn-input" 
            style={{ paddingLeft: "36px", width: "100%" }}
            placeholder="Search by customer name or mobile..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        
        <select 
          className="rn-input"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="All">All Customer Statuses</option>
          <option value="Active">Active</option>
          <option value="Partially Renewed">Partially Renewed</option>
          <option value="Fully Renewed">Fully Renewed</option>
          <option value="Lost">Lost</option>
        </select>

        <button type="submit" className="rn-btn rn-btn-primary">Search</button>
      </form>

      {/* Main Grid table */}
      <div className="rn-table-container">
        <div style={{ padding: "16px", borderBottom: "1px solid var(--rn-border)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--rn-text-primary)", margin: 0 }}>
            Customer Portfolios
          </h3>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <p>Loading customers list...</p>
          </div>
        ) : customers.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: "8px" }}>
            <AlertCircle size={24} style={{ color: "var(--rn-text-muted)" }} />
            <p style={{ color: "var(--rn-text-secondary)", fontSize: "14px" }}>No customer portfolios found.</p>
          </div>
        ) : (
          <table className="rn-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Mobile Number</th>
                <th>Total Policies</th>
                <th>Policies Due</th>
                <th>Nearest Expiry Date</th>
                <th>Assigned Agent</th>
                <th>Customer Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((cust, idx) => {
                const isNoMobile = cust.mobile.startsWith("NO-MOBILE-");
                return (
                  <tr key={cust.mobile || idx}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--rn-border-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--rn-text-secondary)" }}>
                          <User size={16} />
                        </div>
                        <span style={{ fontWeight: "600", color: "var(--rn-text-primary)" }}>{cust.customer_name || "Unknown"}</span>
                      </div>
                    </td>
                    <td>{isNoMobile ? "Not Available" : cust.mobile}</td>
                    <td style={{ fontWeight: "500" }}>{cust.total_policies}</td>
                    <td style={{ color: cust.policies_due > 0 ? "var(--rn-warning)" : "var(--rn-text-secondary)", fontWeight: "600" }}>
                      {cust.policies_due}
                    </td>
                    <td>{cust.nearest_expiry || "No Expiry"}</td>
                    <td>{cust.assigned_user || "Unassigned"}</td>
                    <td>
                      <span className={`rn-badge ${
                        cust.customer_status === "Fully Renewed" ? "rn-badge-success" :
                        cust.customer_status === "Lost" ? "rn-badge-danger" :
                        cust.customer_status === "Partially Renewed" ? "rn-badge-warning" : "rn-badge-active"
                      }`}>
                        {cust.customer_status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="rn-table-actions" style={{ justifyContent: "flex-end" }}>
                        <button className="rn-btn" onClick={() => handleCall(cust)} title="Call Customer"><Phone size={14} /></button>
                        <button className="rn-btn" onClick={() => handleWhatsApp(cust)} title="WhatsApp"><MessageSquare size={14} /></button>
                        <button 
                          className="rn-btn rn-btn-primary" 
                          onClick={() => router.push(`/dashboard/renewals/customers/${cust.mobile}`)}
                          style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          Profile <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination bar */}
        <div className="rn-pagination">
          <span style={{ fontSize: "13px", color: "var(--rn-text-secondary)" }}>
            Page {page} of {totalPages} ({totalCount} total portfolios)
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              className="rn-btn" 
              disabled={page <= 1 || loading} 
              onClick={() => setPage(page - 1)}
            >
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
