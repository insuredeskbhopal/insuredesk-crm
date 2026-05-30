"use client";

import { Download, Pencil } from "lucide-react";
import InsurerLogo from "@/app/components/brand/InsurerLogo";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;
const DEFAULT_RECORD_COLUMNS = [
  { key: "srNo", label: "Sr No", className: "col-sr" },
  { key: "savedAt", label: "Saved At", className: "col-saved", format: "dateTime" },
  { key: "uploadedAt", label: "Uploaded At", className: "col-saved", format: "dateTime" },
  { key: "uploadedBy", label: "Uploaded By", className: "col-uploader" },
  { key: "insuredName", label: "Insured Name", className: "col-insured", primary: true },
  { key: "contactNumber", label: "Contact No.", className: "col-contact" },
  { key: "contactPerson", label: "Contact Person Name", className: "col-contact-person" },
  { key: "whatsappGroupName", label: "WhatsApp Group Name", className: "col-group" },
  { key: "groupName", label: "Group Name", className: "col-group" },
  { key: "policyNumber", label: "Policy No.", className: "col-policy", code: true },
  { key: "policyType", label: "Policy Type", className: "col-type" },
  { key: "sumInsured", label: "Sum Insured", className: "col-money" },
  { key: "premium", label: "Premium", className: "col-money" },
  { key: "startDate", label: "Start Date", className: "col-date" },
  { key: "expiryDate", label: "Expiry Date", className: "col-date" },
  { key: "duration", label: "Duration", className: "col-duration" },
  { key: "riskLocation", label: "Risk Location", className: "col-location" },
  { key: "district", label: "District", className: "col-district" },
  { key: "tehsil", label: "Tehsil", className: "col-tehsil" },
  { key: "insuranceCompany", label: "Insurance Company", className: "col-company" },
  { key: "description", label: "Description / Non Declaration", className: "col-description" },
  { key: "pptMpwlc", label: "PPT / MPWLC", className: "col-ppt" },
  { key: "occupancy", label: "Occupancy", className: "col-occupancy" },
  { key: "validIn", label: "Valid In", className: "col-valid" },
  { key: "sourceFile", label: "Source File", className: "col-source" }
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

function renderCell(record, column, rowNumber) {
  const value = column.key === "srNo"
    ? rowNumber
    : column.format === "dateTime"
    ? formatDateTime(record[column.key])
    : column.format === "date"
      ? formatDate(record[column.key])
      : record[column.key] || "";
  if (column.primary) return <strong className="record-primary">{value}</strong>;
  if (column.code) return <span className="record-code">{value}</span>;
  if (column.key === "insuranceCompany") return <InsurerLogo company={record.insuranceCompany} />;
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
            {records.length ? visibleRecords.map((record, index) => (
              <tr key={record.id}>
                {columns.map((column) => (
                  <td key={column.key}>{renderCell(record, column, startIndex + index + 1)}</td>
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
