"use client";

import { Download, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;
const DEFAULT_RECORD_COLUMNS = [
  { key: "customerId", label: "Customer ID", className: "col-customer" },
  { key: "insuredName", label: "Insured Name", className: "col-insured", primary: true },
  { key: "contactPerson", label: "Contact Person Name", className: "col-contact-person" },
  { key: "contactNumber", label: "Phone Number", className: "col-contact" },
  { key: "policyNumber", label: "Policy No.", className: "col-policy", code: true },
  { key: "insuranceCompany", label: "Insurance Company", className: "col-company" },
  { key: "whatsappGroupName", label: "WhatsApp Group Name", className: "col-group" }
];

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN");
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderCell(record, column) {
  const value = column.format === "dateTime"
    ? formatDateTime(record[column.key])
    : column.format === "date"
      ? formatDate(record[column.key])
      : record[column.key] || "";
  if (column.primary) return <strong className="record-primary">{value}</strong>;
  if (column.code) return <span className="record-code">{value}</span>;
  return value;
}

export default function RecordsTable({ records, columns = DEFAULT_RECORD_COLUMNS, canEdit = false, onEdit }) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRecords = useMemo(
    () => records.slice(startIndex, startIndex + PAGE_SIZE),
    [records, startIndex]
  );
  const pageNumbers = useMemo(
    () => Array.from({ length: pageCount }, (_, index) => index + 1),
    [pageCount]
  );
  const tableMinWidth = columns.length < DEFAULT_RECORD_COLUMNS.length
    ? Math.max(980, (columns.length * 132) + (canEdit ? 88 : 0) + 64)
    : undefined;

  useEffect(() => {
    setCurrentPage(1);
  }, [records]);

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(1, page), pageCount));
  };

  return (
    <div className="records-table-shell">
      <div className="table-wrap records-table-wrap">
        <table className="records-table" style={tableMinWidth ? { minWidth: tableMinWidth } : undefined}>
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} className={column.className || "col-default"} />
            ))}
            {canEdit ? <col className="col-action" /> : null}
            <col className="col-pdf" />
          </colgroup>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              {canEdit ? <th>Edit</th> : null}
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {records.length ? visibleRecords.map((record) => (
              <tr key={record.id}>
                {columns.map((column) => (
                  <td key={column.key}>{renderCell(record, column)}</td>
                ))}
                {canEdit ? (
                  <td>
                    <button
                      aria-label={`Edit ${record.policyNumber || record.insuredName || "policy record"}`}
                      className="record-icon-action"
                      title="Edit policy record"
                      type="button"
                      onClick={() => onEdit?.(record)}
                    >
                      <Pencil size={24} strokeWidth={2.7} />
                    </button>
                  </td>
                ) : null}
                <td>
                  {record.hasPdf ? (
                    <a className="pdf-icon-link" href={`/api/records/${record.id}/pdf`} title="Download PDF" aria-label="Download PDF">
                      <Download size={14} />
                    </a>
                  ) : (
                    <span className="missing-pdf compact" style={{ color: "#d93025", fontWeight: "700", fontSize: "11px" }}>Missing</span>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td className="empty" colSpan={columns.length + (canEdit ? 2 : 1)}>No database records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {records.length > PAGE_SIZE ? (
        <div className="table-pagination" aria-label="Table pagination">
          <span>
            Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, records.length)} of {records.length}
          </span>
          <div className="table-page-list">
            <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
              Prev
            </button>
            {pageNumbers.map((page) => (
              <button
                aria-current={currentPage === page ? "page" : undefined}
                className={currentPage === page ? "active" : ""}
                key={page}
                type="button"
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            ))}
            <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === pageCount}>
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
