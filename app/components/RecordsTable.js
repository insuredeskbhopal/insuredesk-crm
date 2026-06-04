"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Pencil, Eye, X, Printer, Trash2, CheckSquare, Square, MinusSquare } from "lucide-react";

function DetailField({ label, value, wide }) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      padding: "8px 12px",
      background: "#f8fafc",
      borderRadius: "8px",
      border: "1px solid #f1f5f9",
      gridColumn: wide ? "span 2" : undefined
    }}>
      <span style={{ fontSize: "10px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", wordBreak: "break-all" }}>{String(value)}</span>
    </div>
  );
}

function DetailSection({ title, children }) {
  const validChildren = React.Children.toArray(children).filter(child => child !== null);
  if (validChildren.length === 0) return null;

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "16px",
      border: "1px solid #e2e8f0",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "16px"
    }}>
      <h3 style={{
        margin: 0,
        fontSize: "14px",
        fontWeight: "700",
        color: "#1e3a8a",
        borderBottom: "2px solid #f1f5f9",
        paddingBottom: "8px",
        display: "flex",
        alignItems: "center"
      }}>{title}</h3>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "12px"
      }}>
        {children}
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;
const DEFAULT_RECORD_COLUMNS = [
  { key: "customerId", label: "Customer ID", className: "col-customer" },
  { key: "insuredName", label: "Insured Name", className: "col-insured", primary: true },
  { key: "contactPerson", label: "Contact Person Name", className: "col-contact-person" },
  { key: "contactNumber", label: "Phone Number", className: "col-contact" },
  { key: "policyNumber", label: "Policy No.", className: "col-policy", code: true },
  { key: "vehicleNumber", label: "Vehicle No.", className: "col-vehicle", code: true, fallbackKey: "registrationNumber" },
  { key: "insuranceCompany", label: "Insurance Company", className: "col-company" },
  { key: "whatsappGroupName", label: "WP Group Name", className: "col-group" }
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
  const rawValue = record[column.key] || (column.fallbackKey ? record[column.fallbackKey] : "");
  const value = column.format === "dateTime"
    ? formatDateTime(rawValue)
    : column.format === "date"
      ? formatDate(rawValue)
      : rawValue || "";
  if (column.primary) return <strong className="record-primary">{value}</strong>;
  if (column.code) return <span className="record-code">{value}</span>;
  return value;
}

const COLUMN_WIDTHS = {
  "col-mark": 48,
  "col-customer": 104,
  "col-saved": 150,
  "col-insured": 210,
  "col-contact": 150,
  "col-contact-person": 150,
  "col-policy": 150,
  "col-vehicle": 150,
  "col-type": 150,
  "col-company": 150,
  "col-uploader": 150,
  "col-source": 150,
  "col-group": 180,
  "col-location": 180,
  "col-description": 180,
  "col-occupancy": 180,
  "col-money": 140,
  "col-date": 120,
  "col-duration": 125,
  "col-district": 125,
  "col-tehsil": 125,
  "col-ppt": 125,
  "col-valid": 125,
  "col-pdf": 56,
  "col-action": 88,
  "col-default": 150,
};

export default function RecordsTable({ records, columns = DEFAULT_RECORD_COLUMNS, canEdit = false, onEdit, canDelete = false, onDelete }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const getStickyStyle = (colIndex) => {
    if (colIndex >= 3) return {};

    const baseOffset = canDelete ? 48 : 0;
    let leftOffset = baseOffset;

    for (let i = 0; i < colIndex; i++) {
      const col = columns[i];
      const className = col?.className || "col-default";
      const width = COLUMN_WIDTHS[className] || 150;
      leftOffset += width;
    }

    return {
      left: `${leftOffset}px`,
    };
  };

  const getStickyClassName = (colIndex) => {
    if (colIndex >= 3) return "";
    const isLastSticky = colIndex === Math.min(2, columns.length - 1);
    return `sticky-col ${isLastSticky ? "sticky-col-last" : ""}`;
  };

  const handlePrint = (record) => {
    if (!record) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.alert("Please allow popups to print policy details.");
      return;
    }

    const formatDateLocal = (val) => {
      if (!val) return "-";
      const date = new Date(val);
      if (Number.isNaN(date.getTime())) return String(val);
      return date.toLocaleDateString("en-IN");
    };

    const formatDateTimeLocal = (val) => {
      if (!val) return "-";
      const date = new Date(val);
      if (Number.isNaN(date.getTime())) return String(val);
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    };

    const renderPrintSection = (title, fields) => {
      const validFields = fields.filter(([_, val]) => val !== undefined && val !== null && String(val).trim() !== "");
      if (validFields.length === 0) return "";
      return `
        <div class="section">
          <h3>${title}</h3>
          <div class="grid">
            ${validFields.map(([lbl, val]) => `
              <div class="field">
                <span class="label">${lbl}</span>
                <span class="value">${val}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    };

    printWindow.document.write(`
      <html>
        <head>
          <title>Policy Details - ${record.policyNumber || "Record"}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              padding: 16px;
              line-height: 1.3;
              margin: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 6px;
              margin-bottom: 12px;
            }
            .header-info h1 {
              margin: 0;
              font-size: 18px;
              font-weight: 800;
            }
            .header-info p {
              margin: 0 0 2px;
              color: #64748b;
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .print-logo {
              height: 94px;
              width: auto;
              object-fit: contain;
            }
            .section {
              margin-bottom: 12px;
              page-break-inside: avoid;
            }
            .section h3 {
              margin: 0 0 6px;
              font-size: 12px;
              font-weight: 700;
              color: #1e3a8a;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 4px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 6px;
            }
            .field {
              padding: 5px 8px;
              background: #f8fafc;
              border: 1px solid #f1f5f9;
              border-radius: 4px;
            }
            .label {
              font-size: 8px;
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
              display: block;
              margin-bottom: 1px;
              letter-spacing: 0.5px;
            }
            .value {
              font-size: 11px;
              font-weight: 600;
              color: #0f172a;
              word-break: break-all;
            }
            @media print {
              @page {
                size: A4;
                margin: 8mm;
              }
              body {
                zoom: 82%;
              }
              .field {
                background: #f8fafc !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-info">
              <p>Policy Record Details</p>
              <h1>${record.policyNumber || "No Policy Number"}</h1>
            </div>
            <img src="${window.location.origin}/brand/main-logo-wide.png" alt="Bima Headquarter" class="print-logo" />
          </div>
          
          ${renderPrintSection("General Information", [
      ["Customer ID", record.customerId],
      ["Insured Name", record.insuredName],
      ["Contact Person", record.contactPerson],
      ["Phone Number", record.contactNumber],
      ["WhatsApp Group Name", record.whatsappGroupName],
      ["Group Name", record.groupName],
      ["Insurance Company", record.insuranceCompany],
      ["Policy Type", record.policyType]
    ])}

          ${renderPrintSection("Dates & Coverage", [
      ["Start Date", formatDateLocal(record.startDate)],
      ["Expiry Date", formatDateLocal(record.expiryDate)],
      ["Duration", record.duration],
      ["Sum Insured", record.sumInsured]
    ])}

          ${renderPrintSection("Financial Details", [
      ["Net Premium", record.netPremium],
      ["OD Premium", record.odPremium],
      ["TP + Driver + Owner", record.tpDriverOwner],
      ["Total Premium", record.totalPremium],
      ["Mode of Payment", record.modeOfPayment],
      ["Collected Amount", record.collectedAmount],
      ["Due Collection", record.dueCollection]
    ])}

          ${renderPrintSection("Vehicle Details", [
      ["Vehicle Number", record.vehicleNumber],
      ["Make & Model", record.makeModel],
      ["Variant", record.variant],
      ["Registration Number", record.registrationNumber],
      ["Registration Date", formatDateLocal(record.registrationDate)],
      ["Manufacturing Year", record.manufacturingYear],
      ["Fuel Type", record.fuelType],
      ["Engine Number", record.engineNumber],
      ["Chassis Number", record.chassisNumber],
      ["Seating Capacity", record.seatingCapacity],
      ["Cubic Capacity", record.cubicCapacity],
      ["IDV", record.idv],
      ["NCB", record.ncb],
      ["Cover Type", record.policyCoverType],
      ["RTO Location", record.rtoLocation]
    ])}

          ${renderPrintSection("Additional & Risk Details", [
      ["Nominee Name", record.nomineeName],
      ["Hypothecation / Financer", record.financerName],
      ["Risk Location", record.riskLocation],
      ["Occupancy", record.occupancy],
      ["Tehsil", record.tehsil],
      ["District", record.district],
      ["PPT / MPWLC", record.pptMpwlc],
      ["Valid In", record.validIn],
      ["Remarks", record.remark]
    ])}

          ${renderPrintSection("Metadata", [
      ["Source PDF File", record.sourceFile],
      ["Created By", record.uploadedByEmail || record.uploadedBy],
      ["Saved Date", formatDateTimeLocal(record.savedAt)],
      ["Renewal Status", record.renewalStatus]
    ])}

          <script>
            window.onload = function() {
              const img = document.querySelector('.print-logo');
              if (img) {
                if (img.complete) {
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
                } else {
                  img.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                  };
                  img.onerror = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                  };
                  setTimeout(function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                  }, 1500);
                }
              } else {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const pageCount = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRecords = useMemo(
    () => records.slice(startIndex, startIndex + PAGE_SIZE),
    [records, startIndex]
  );
  const visiblePageNumbers = useMemo(() => {
    const pages = [];
    if (pageCount <= 7) {
      for (let i = 1; i <= pageCount; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(pageCount - 1, currentPage + 1);
      if (currentPage <= 4) {
        end = 5;
      } else if (currentPage >= pageCount - 3) {
        start = pageCount - 4;
      }
      if (start > 2) {
        pages.push("...");
      }
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (end < pageCount - 1) {
        pages.push("...");
      }
      pages.push(pageCount);
    }
    return pages;
  }, [currentPage, pageCount]);
  const tableMinWidth = columns.length < DEFAULT_RECORD_COLUMNS.length
    ? Math.max(980, (columns.length * 132) + (canEdit ? 88 : 0) + (canDelete ? 48 : 0) + 64)
    : undefined;

  useEffect(() => {
    setCurrentPage(1);
  }, [records]);

  // Clear selections when records change (e.g. after delete)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [records]);

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(1, page), pageCount));
  };

  const toggleSelectId = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allVisibleSelected = visibleRecords.length > 0 && visibleRecords.every((r) => selectedIds.has(r.id));
  const someVisibleSelected = visibleRecords.some((r) => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleRecords.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleRecords.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedIds.size || !onDelete) return;
    const selectedRecords = records.filter((r) => selectedIds.has(r.id));
    onDelete(selectedRecords);
  };

  return (
    <div className="records-table-shell">
      <div className="table-wrap records-table-wrap">
        <table className="records-table" style={tableMinWidth ? { minWidth: tableMinWidth } : undefined}>
          <colgroup>
            {canDelete ? <col className="col-mark" /> : null}
            {columns.map((column) => (
              <col key={column.key} className={column.className || "col-default"} />
            ))}
            <col className="col-action" />
            {canEdit ? <col className="col-action" /> : null}
            <col className="col-pdf" />
          </colgroup>
          <thead>
            <tr>
              {canDelete ? (
                <th className="sticky-col" style={{ left: 0 }}>
                  <button
                    className="record-mark-toggle"
                    type="button"
                    title={allVisibleSelected ? "Unmark all" : "Mark all"}
                    aria-label={allVisibleSelected ? "Unmark all records on this page" : "Mark all records on this page"}
                    onClick={toggleSelectAll}
                  >
                    {allVisibleSelected ? (
                      <CheckSquare size={18} strokeWidth={1.6} />
                    ) : someVisibleSelected ? (
                      <MinusSquare size={18} strokeWidth={1.6} />
                    ) : (
                      <Square size={18} strokeWidth={1.6} />
                    )}
                  </button>
                </th>
              ) : null}
              {columns.map((column, index) => (
                <th key={column.key} className={getStickyClassName(index)} style={getStickyStyle(index)}>{column.label}</th>
              ))}
              <th>View</th>
              {canEdit ? <th>Edit</th> : null}
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {records.length ? visibleRecords.map((record) => {
              const isMarked = selectedIds.has(record.id);
              return (
                <tr key={record.id} className={isMarked ? "row-marked" : ""}>
                  {canDelete ? (
                    <td className="sticky-col" style={{ left: 0 }}>
                      <button
                        className={`record-mark-toggle ${isMarked ? "marked" : ""}`}
                        type="button"
                        title={isMarked ? "Unmark" : "Mark"}
                        aria-label={isMarked ? `Unmark ${record.policyNumber || record.insuredName || "record"}` : `Mark ${record.policyNumber || record.insuredName || "record"}`}
                        onClick={() => toggleSelectId(record.id)}
                      >
                        {isMarked ? (
                          <CheckSquare size={18} strokeWidth={1.6} />
                        ) : (
                          <Square size={18} strokeWidth={1.6} />
                        )}
                      </button>
                    </td>
                  ) : null}
                  {columns.map((column, index) => (
                    <td key={column.key} className={getStickyClassName(index)} style={getStickyStyle(index)}>{renderCell(record, column)}</td>
                  ))}
                  <td>
                    <button
                      aria-label={`View details of ${record.policyNumber || record.insuredName || "policy record"}`}
                      className="record-icon-action"
                      title="View policy details"
                      type="button"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <Eye size={20} strokeWidth={2.5} />
                    </button>
                  </td>
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
              );
            }) : (
              <tr>
                <td className="empty" colSpan={columns.length + 2 + (canEdit ? 1 : 0) + (canDelete ? 1 : 0)}>No database records yet.</td>
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
            {visiblePageNumbers.map((page, index) => (
              page === "..." ? (
                <span
                  key={`ellipsis-${index}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "34px",
                    minHeight: "32px",
                    color: "#64748b",
                    fontSize: "14px",
                    fontWeight: "700",
                    userSelect: "none"
                  }}
                >
                  ...
                </span>
              ) : (
                <button
                  aria-current={currentPage === page ? "page" : undefined}
                  className={currentPage === page ? "active" : ""}
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              )
            ))}
            <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === pageCount}>
              Next
            </button>
          </div>
        </div>
      ) : null}

      {typeof window !== "undefined" && selectedRecord && createPortal(
        <div
          className="tb-modal-backdrop"
          onClick={() => setSelectedRecord(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.25)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px"
          }}
        >
          <div
            className="tb-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              boxShadow: "0 25px 70px -10px rgba(0, 0, 0, 0.08), 0 10px 30px -15px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.03)",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "none",
              animation: "modal-pop 320ms cubic-bezier(0.2, 0, 0, 1) both"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px 24px",
                borderBottom: "1px solid #f1f5f9",
                backgroundColor: "#ffffff",
                color: "#0f172a"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <img
                  src="/brand/main-logo-wide.png"
                  alt="Bima Headquarter"
                  style={{ height: "74px", width: "auto", objectFit: "contain" }}
                />
                <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "16px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", color: "#64748b" }}>Policy Record Details</span>
                  <h2 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>
                    {selectedRecord.policyNumber || "No Policy Number"}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                aria-label="Close details"
                style={{
                  background: "rgba(15, 23, 42, 0.05)",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  transition: "background-color 0.2s, color 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.1)";
                  e.currentTarget.style.color = "#0f172a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.05)";
                  e.currentTarget.style.color = "#64748b";
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: "24px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "24px",
                backgroundColor: "#ffffff"
              }}
            >
              <DetailSection title="General Information">
                <DetailField label="Customer ID" value={selectedRecord.customerId} />
                <DetailField label="Insured Name" value={selectedRecord.insuredName} wide />
                <DetailField label="Contact Person" value={selectedRecord.contactPerson} />
                <DetailField label="Phone Number" value={selectedRecord.contactNumber} />
                <DetailField label="WhatsApp Group Name" value={selectedRecord.whatsappGroupName} />
                <DetailField label="Group Name" value={selectedRecord.groupName} />
                <DetailField label="Insurance Company" value={selectedRecord.insuranceCompany} wide />
                <DetailField label="Policy Type" value={selectedRecord.policyType} />
              </DetailSection>

              <DetailSection title="Dates & Coverage">
                <DetailField label="Start Date" value={selectedRecord.startDate ? formatDate(selectedRecord.startDate) : ""} />
                <DetailField label="Expiry Date" value={selectedRecord.expiryDate ? formatDate(selectedRecord.expiryDate) : ""} />
                <DetailField label="Duration" value={selectedRecord.duration} />
                <DetailField label="Sum Insured" value={selectedRecord.sumInsured} />
              </DetailSection>

              <DetailSection title="Financial Details">
                <DetailField label="Net Premium" value={selectedRecord.netPremium} />
                <DetailField label="OD Premium" value={selectedRecord.odPremium} />
                <DetailField label="TP + Driver + Owner" value={selectedRecord.tpDriverOwner} />
                <DetailField label="Total Premium" value={selectedRecord.totalPremium} />
                <DetailField label="Mode of Payment" value={selectedRecord.modeOfPayment} />
                <DetailField label="Collected Amount" value={selectedRecord.collectedAmount} />
                <DetailField label="Due Collection" value={selectedRecord.dueCollection} />
              </DetailSection>

              <DetailSection title="Vehicle Details">
                <DetailField label="Vehicle Number" value={selectedRecord.vehicleNumber} />
                <DetailField label="Make & Model" value={selectedRecord.makeModel} wide />
                <DetailField label="Variant" value={selectedRecord.variant} />
                <DetailField label="Registration Number" value={selectedRecord.registrationNumber} />
                <DetailField label="Registration Date" value={selectedRecord.registrationDate ? formatDate(selectedRecord.registrationDate) : ""} />
                <DetailField label="Manufacturing Year" value={selectedRecord.manufacturingYear} />
                <DetailField label="Fuel Type" value={selectedRecord.fuelType} />
                <DetailField label="Engine Number" value={selectedRecord.engineNumber} />
                <DetailField label="Chassis Number" value={selectedRecord.chassisNumber} />
                <DetailField label="Seating Capacity" value={selectedRecord.seatingCapacity} />
                <DetailField label="Cubic Capacity" value={selectedRecord.cubicCapacity} />
                <DetailField label="IDV" value={selectedRecord.idv} />
                <DetailField label="NCB" value={selectedRecord.ncb} />
                <DetailField label="Cover Type" value={selectedRecord.policyCoverType} />
                <DetailField label="RTO Location" value={selectedRecord.rtoLocation} />
              </DetailSection>

              <DetailSection title="Additional & Risk Details">
                <DetailField label="Nominee Name" value={selectedRecord.nomineeName} />
                <DetailField label="Hypothecation / Financer" value={selectedRecord.financerName} />
                <DetailField label="Risk Location" value={selectedRecord.riskLocation} wide />
                <DetailField label="Occupancy" value={selectedRecord.occupancy} />
                <DetailField label="Tehsil" value={selectedRecord.tehsil} />
                <DetailField label="District" value={selectedRecord.district} />
                <DetailField label="PPT / MPWLC" value={selectedRecord.pptMpwlc} />
                <DetailField label="Valid In" value={selectedRecord.validIn} />
                <DetailField label="Remarks" value={selectedRecord.remark} wide />
              </DetailSection>

              <DetailSection title="Metadata">
                <DetailField label="Source PDF File" value={selectedRecord.sourceFile} wide />
                <DetailField label="Created By" value={selectedRecord.uploadedByEmail || selectedRecord.uploadedBy} />
                <DetailField label="Saved Date" value={selectedRecord.savedAt ? formatDateTime(selectedRecord.savedAt) : ""} />
                <DetailField label="Renewal Status" value={selectedRecord.renewalStatus} />
              </DetailSection>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: "12px",
                padding: "16px 24px",
                borderTop: "1px solid #f1f5f9",
                backgroundColor: "#ffffff"
              }}
            >
              <button
                onClick={() => handlePrint(selectedRecord)}
                style={{
                  padding: "10px 24px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background-color 0.2s, border-color 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                  e.currentTarget.style.borderColor = "#0f172a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                }}
              >
                <Printer size={16} />
                Print Details
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{
                  padding: "10px 24px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  transition: "background-color 0.2s, border-color 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                  e.currentTarget.style.borderColor = "#94a3b8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
        , document.body)}

      {/* Floating action bar when records are marked */}
      {canDelete && selectedIds.size > 0 && typeof window !== "undefined" && createPortal(
        <div className="mark-action-bar">
          <div className="mark-action-bar-inner">
            <div className="mark-action-info">
              <CheckSquare size={18} strokeWidth={1.6} />
              <span><strong>{selectedIds.size}</strong> record{selectedIds.size === 1 ? "" : "s"} marked</span>
            </div>
            <div className="mark-action-buttons">
              <button
                className="mark-action-clear"
                type="button"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </button>
              <button
                className="mark-action-delete"
                type="button"
                onClick={handleDeleteSelected}
              >
                <Trash2 size={16} strokeWidth={2.5} />
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
