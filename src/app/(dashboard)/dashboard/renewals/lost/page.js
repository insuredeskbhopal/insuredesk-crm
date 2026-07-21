"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, X } from "lucide-react";
import ModalPortal from "@/app/components/shared/ModalPortal";

const AUTO_LOST_PREFIX = "Automatically moved to Lost";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN");
}

function formatAmount(value) {
  if (value === null || value === undefined || value === "") return "-";
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!/\d/.test(cleaned)) return String(value);
  const number = Number(cleaned);
  return Number.isFinite(number) ? `₹${number.toLocaleString("en-IN")}` : String(value);
}

function getVehicleOrRisk(policy) {
  return policy.vehicleNumber || policy.registrationNumber || policy.riskLocation || policy.premisesAddress || "-";
}

function getLostType(policy) {
  return String(policy.lostReason || "").startsWith(AUTO_LOST_PREFIX) ? "Automatic" : "Manual";
}

function getOverdueDays(policy) {
  const days = Number(policy.daysRemaining ?? policy.daysLeft);
  return Number.isFinite(days) && days < 0 ? `${Math.abs(days)} days` : "-";
}

export default function LostPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page")) || 1));
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  const fetchLostPolicies = async (signal) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/renewals/policies?tab=lost&page=${page}&limit=10`, {
        cache: "no-store",
        signal,
      });
      const data = await res.json();
      if (res.ok && data.policies) {
        setPolicies(data.policies);
        setTotalPages(data.pages || 1);
        setTotalCount(data.totalCount || 0);
      }
    } catch (error) {
      if (error.name !== "AbortError") console.error("Failed to load lost policies:", error);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new window.AbortController();
    fetchLostPolicies(controller.signal);
    return () => controller.abort();
  }, [page]);

  const changePage = (nextPage) => {
    setPage(nextPage);
    router.replace(nextPage > 1 ? `?page=${nextPage}` : "?", { scroll: false });
  };

  useEffect(() => {
    if (!selectedPolicy) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSelectedPolicy(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedPolicy]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="rn-table-container">
        <div style={{ padding: "16px", borderBottom: "1px solid var(--rn-border)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--rn-text-primary)", margin: 0 }}>
            Lost Renewals
          </h3>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <p>Loading lost renewals...</p>
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
            <p style={{ color: "var(--rn-text-secondary)", fontSize: "14px" }}>No lost policies recorded.</p>
          </div>
        ) : (
          <table className="rn-table" style={{ minWidth: "2100px", tableLayout: "auto" }}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Policy / Product</th>
                <th>Vehicle / Risk</th>
                <th>Insurance Company</th>
                <th>Premium</th>
                <th>Sum Insured / IDV</th>
                <th>Expiry Date</th>
                <th>Overdue By</th>
                <th>Lost Date</th>
                <th>Lost Type</th>
                <th>Lost Reason</th>
                <th>Last Follow-up</th>
                <th>Assigned User</th>
                <th style={{ position: "sticky", right: 0, zIndex: 2, background: "var(--rn-border-light)" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id}>
                  <td style={{ minWidth: "190px" }}>
                    <div style={{ fontWeight: "600", color: "var(--rn-text-primary)" }}>{p.insuredName}</div>
                  </td>
                  <td style={{ minWidth: "150px" }}>
                    <div>{p.contactNumber || "No Mobile"}</div>
                    <div style={{ fontSize: "11px", color: "var(--rn-text-muted)" }}>{p.contactPerson || "No contact person"}</div>
                  </td>
                  <td style={{ minWidth: "200px" }}>
                    <div>{p.displayPolicyType || p.policyType}</div>
                    <div style={{ fontSize: "12px", color: "var(--rn-text-muted)" }}>
                      No: {p.policyNumber}
                    </div>
                  </td>
                  <td style={{ minWidth: "160px" }}>{getVehicleOrRisk(p)}</td>
                  <td style={{ minWidth: "210px" }}>{p.insuranceCompany || "-"}</td>
                  <td style={{ minWidth: "120px", fontWeight: 600 }}>{formatAmount(p.totalPremium || p.premiumIncludingGst || p.premium)}</td>
                  <td style={{ minWidth: "140px" }}>{formatAmount(p.idv || p.sumInsured)}</td>
                  <td style={{ minWidth: "110px" }}>{formatDate(p.expiryDate)}</td>
                  <td style={{ minWidth: "105px", fontWeight: 700, color: "var(--rn-danger)" }}>{getOverdueDays(p)}</td>
                  <td style={{ minWidth: "110px" }}>{formatDate(p.renewalDate)}</td>
                  <td style={{ minWidth: "110px" }}>
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${
                      getLostType(p) === "Automatic"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}>
                      {getLostType(p)}
                    </span>
                  </td>
                  <td style={{ minWidth: "250px", fontWeight: "600", color: "var(--rn-danger)" }}>
                    {p.lostReason || "Unspecified"}
                  </td>
                  <td style={{ minWidth: "220px" }}>
                    <div>{p.latestRemark || "No follow-up remark"}</div>
                    <div style={{ marginTop: "3px", fontSize: "11px", color: "var(--rn-text-muted)" }}>
                      {p.nextFollowUpDate ? `Next: ${formatDate(p.nextFollowUpDate)}` : p.latestRemarkAt ? formatDate(p.latestRemarkAt) : "No follow-up date"}
                    </div>
                  </td>
                  <td style={{ minWidth: "140px" }}>{p.assignedTo || "Unassigned"}</td>
                  <td style={{ position: "sticky", right: 0, minWidth: "90px", background: "white", boxShadow: "-8px 0 14px -12px rgba(15, 23, 42, 0.45)" }}>
                    <button type="button" className="rn-btn" onClick={() => setSelectedPolicy(p)}>
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="rn-pagination">
          <span style={{ fontSize: "13px", color: "var(--rn-text-secondary)" }}>
            Page {page} of {totalPages} ({totalCount} policies lost)
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="rn-btn" disabled={page <= 1 || loading} onClick={() => changePage(page - 1)}>
              Previous
            </button>
            <button
              className="rn-btn"
              disabled={page >= totalPages || loading}
              onClick={() => changePage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedPolicy ? (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md"
            role="presentation"
            onMouseDown={() => setSelectedPolicy(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="lost-renewal-detail-title"
              className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-600">Lost renewal</p>
                  <h2 id="lost-renewal-detail-title" className="mt-1 text-lg font-bold text-slate-900">
                    {selectedPolicy.insuredName || "Policy details"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">{selectedPolicy.policyNumber || "No policy number"}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close lost renewal details"
                  onClick={() => setSelectedPolicy(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <X size={17} />
                </button>
              </header>
              <div className="max-h-[calc(90vh-92px)] overflow-y-auto p-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Customer", selectedPolicy.insuredName],
                    ["Contact Person", selectedPolicy.contactPerson],
                    ["Mobile", selectedPolicy.contactNumber],
                    ["Email", selectedPolicy.email],
                    ["Policy Type", selectedPolicy.displayPolicyType || selectedPolicy.policyType],
                    ["Policy Number", selectedPolicy.policyNumber],
                    ["Insurance Company", selectedPolicy.insuranceCompany],
                    ["Vehicle / Risk", getVehicleOrRisk(selectedPolicy)],
                    ["Make / Model", selectedPolicy.makeModel],
                    ["Premium", formatAmount(selectedPolicy.totalPremium || selectedPolicy.premiumIncludingGst || selectedPolicy.premium)],
                    ["Sum Insured / IDV", formatAmount(selectedPolicy.idv || selectedPolicy.sumInsured)],
                    ["Policy Start", formatDate(selectedPolicy.startDate)],
                    ["Policy Expiry", formatDate(selectedPolicy.expiryDate)],
                    ["Overdue By", getOverdueDays(selectedPolicy)],
                    ["Lost Date", formatDate(selectedPolicy.renewalDate)],
                    ["Lost Type", getLostType(selectedPolicy)],
                    ["Assigned User", selectedPolicy.assignedTo || "Unassigned"],
                    ["Next Follow-up", formatDate(selectedPolicy.nextFollowUpDate)],
                    ["Risk Location", selectedPolicy.riskLocation || selectedPolicy.premisesAddress],
                    ["Mailing Address", selectedPolicy.mailingAddress],
                    ["Source File", selectedPolicy.sourceFile || selectedPolicy.pdfFileName],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
                      <p className="mt-1.5 break-words text-sm font-semibold text-slate-900">{value || "-"}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-rose-700">Lost Reason</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-rose-900">{selectedPolicy.lostReason || "Unspecified"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Latest Follow-up</p>
                    <p className="mt-2 text-sm leading-6 text-slate-800">{selectedPolicy.latestRemark || "No follow-up remark recorded."}</p>
                    {selectedPolicy.latestRemarkBy ? <p className="mt-2 text-xs text-slate-500">By {selectedPolicy.latestRemarkBy}</p> : null}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
