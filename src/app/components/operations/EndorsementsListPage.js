"use client";

/* global URLSearchParams */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Edit, Eye, FilePlus2, Search, Trash2, Upload, XCircle } from "lucide-react";

const STATUSES = [
  "All",
  "Draft",
  "Letter Generated",
  "Sent to Customer",
  "Pending Insurance Company Letter",
  "Insurance Company Letter Received",
  "Approved",
  "Rejected",
  "Cancelled",
];
const TYPES = [
  "All",
  "Change in Address",
  "Increase in Sum Insured",
  "Decrease in Sum Insured",
  "Change in Situation / Location",
  "Addition of Warehouse / Property",
  "Deletion of Warehouse / Property",
  "Change in Occupancy",
  "Change in Stock Description",
  "Change in Hypothecation / Bank Details",
  "Correction in Insured Name",
  "Correction in Policy Details",
];

const PAGE_SIZE = 25;

function statusClass(status) {
  return String(status || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN");
}

async function readJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Database request failed.");
  return payload;
}

export default function EndorsementsListPage() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    draft: 0,
    generated: 0,
    approved: 0,
    rejectedCancelled: 0,
  });
  const [filters, setFilters] = useState({ q: urlQuery, status: "All", type: "All", from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(1);
    setFilters((current) => (current.q === urlQuery ? current : { ...current, q: urlQuery }));
  }, [urlQuery]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "All") params.set(key, value);
    });
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    return params.toString();
  }, [filters, page]);

  useEffect(() => {
    const controller = new window.AbortController();
    const timeout = window.setTimeout(
      () => {
        loadRecords(queryString, controller.signal);
      },
      filters.q ? 250 : 0,
    );
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [queryString, filters.q]);

  async function loadRecords(nextQuery = queryString, signal) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/endorsements?${nextQuery}`, { cache: "no-store", signal });
      const payload = await readJsonResponse(response);
      setRecords(Array.isArray(payload.endorsements) ? payload.endorsements : []);
      setSummary(payload.summary || summary);
      setTotal(Number(payload.total || 0));
      setTotalPages(Math.max(1, Number(payload.totalPages || 1)));
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Endorsements could not be loaded.");
      setRecords([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  function updateFilter(key, value) {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setPage(1);
  }

  async function updateStatus(record, status) {
    setSavingId(record.id);
    setError("");
    try {
      const response = await fetch(`/api/endorsements/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...record, status }),
      });
      const updated = await readJsonResponse(response);
      setRecords((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status could not be updated.");
    } finally {
      setSavingId("");
    }
  }

  async function deleteDraft(record) {
    if (record.status !== "Draft") return;
    const confirmed = window.confirm(`Delete draft endorsement ${record.endorsementNo}?`);
    if (!confirmed) return;
    setSavingId(record.id);
    setError("");
    try {
      const response = await fetch(`/api/endorsements/${record.id}`, { method: "DELETE" });
      if (!response.ok) await readJsonResponse(response);
      setRecords((current) => current.filter((item) => item.id !== record.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft could not be deleted.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="endorsement-page">
      <header className="endorsement-page-head">
        <div>
          <p>Operations Module</p>
          <h1>Endorsements</h1>
        </div>
        <Link className="endorsement-primary-btn" href="/dashboard/endorsements/create" prefetch={false}>
          <FilePlus2 size={18} /> Create Endorsement
        </Link>
      </header>

      <section className="endorsement-summary-grid">
        <SummaryCard label="Total Endorsements" value={summary.total} />
        <SummaryCard label="Draft" value={summary.draft} />
        <SummaryCard label="Generated" value={summary.generated} />
        <SummaryCard label="Approved" value={summary.approved} />
        <SummaryCard label="Rejected / Cancelled" value={summary.rejectedCancelled} />
      </section>

      <form className="endorsement-filter-bar" onSubmit={applyFilters}>
        <label className="endorsement-search-field">
          <Search size={17} />
          <input
            value={filters.q}
            onChange={(event) => updateFilter("q", event.target.value)}
            placeholder="Search policy, customer, endorsement no., company"
          />
        </label>
        <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select value={filters.type} onChange={(event) => updateFilter("type", event.target.value)}>
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.from}
          onChange={(event) => updateFilter("from", event.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          value={filters.to}
          onChange={(event) => updateFilter("to", event.target.value)}
          aria-label="To date"
        />
        <button type="submit">Apply</button>
      </form>

      {error ? (
        <div className="endorsement-alert">
          <span>{error}</span>
          <button type="button" onClick={() => loadRecords()}>
            Retry
          </button>
        </div>
      ) : null}

      <section className="endorsement-table-panel">
        {loading ? (
          <div className="endorsement-empty">Loading endorsements from database...</div>
        ) : records.length ? (
          <div className="endorsement-table-scroll">
            <table className="endorsement-table">
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Endorsement No.</th>
                  <th>Policy No.</th>
                  <th>Customer / Insured Name</th>
                  <th>Insurance Company</th>
                  <th>Policy Type</th>
                  <th>Endorsement Type</th>
                  <th>Endorsement Date</th>
                  <th>Effective Date</th>
                  <th>Status</th>
                  <th>Remark</th>
                  <th>Created By</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={record.id}>
                    <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td>
                      <strong>{record.endorsementNo}</strong>
                    </td>
                    <td>{record.policyNo || "-"}</td>
                    <td>{record.customerName || record.insuredName || "-"}</td>
                    <td>{record.insuranceCompany || "-"}</td>
                    <td>{record.policyType || "-"}</td>
                    <td>{record.endorsementType}</td>
                    <td>{formatDate(record.endorsementDate)}</td>
                    <td>{formatDate(record.effectiveDate || record.effectiveFrom)}</td>
                    <td>
                      <span className={`endorsement-status ${statusClass(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td>{record.remark || record.internalRemark || "-"}</td>
                    <td>{record.createdBy?.name || record.createdBy?.email || "-"}</td>
                    <td>{formatDate(record.createdAt)}</td>
                    <td>
                      <div className="endorsement-actions">
                        <Link href={`/dashboard/endorsements/${record.id}`} prefetch={false} title="View">
                          <Eye size={15} />
                        </Link>
                        <Link href={`/dashboard/endorsements/${record.id}?mode=edit`} prefetch={false} title="Edit">
                          <Edit size={15} />
                        </Link>
                        {record.generatedLetterPdfUrl ? (
                          <a
                            href={record.generatedLetterPdfUrl}
                            download={record.generatedLetterFileName || `${record.endorsementNo}.pdf`}
                            title="Download Letter PDF"
                          >
                            <Download size={15} />
                          </a>
                        ) : null}
                        <Link
                          href={`/dashboard/endorsements/${record.id}?upload=company-letter`}
                          prefetch={false}
                          title="Upload Insurance Company Letter"
                        >
                          <Upload size={15} />
                        </Link>
                        <button
                          type="button"
                          disabled={savingId === record.id}
                          onClick={() => updateStatus(record, "Approved")}
                          title="Mark as Approved"
                        >
                          <CheckCircle2 size={15} />
                        </button>
                        <button
                          type="button"
                          disabled={savingId === record.id}
                          onClick={() => updateStatus(record, "Rejected")}
                          title="Mark as Rejected / Cancelled"
                        >
                          <XCircle size={15} />
                        </button>
                        {record.status === "Draft" ? (
                          <button
                            type="button"
                            disabled={savingId === record.id}
                            onClick={() => deleteDraft(record)}
                            title="Delete draft"
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="endorsement-empty">
            <strong>No endorsements found</strong>
            <span>Create an endorsement to start tracking policy changes.</span>
          </div>
        )}
      </section>
      <div className="table-pagination" aria-label="Endorsement pagination">
        <span>
          Page {page} of {totalPages} ({total} endorsements)
        </span>
        <div>
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}>
            Previous
          </button>
          <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || loading}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="endorsement-summary-card">
      <span>{label}</span>
      <strong>{Number(value || 0).toLocaleString("en-IN")}</strong>
    </div>
  );
}
