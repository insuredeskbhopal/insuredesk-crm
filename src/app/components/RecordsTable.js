"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Pencil, Eye, Trash2, CheckSquare, Square, MinusSquare } from "lucide-react";
import PolicyDetailCard from "@/app/components/shared/PolicyDetailCard";
import { inferUploadSchema } from "@/app/lib/dashboard-helpers";



const PAGE_SIZE = 10;
const DEFAULT_RECORD_COLUMNS = [
  { key: "customerId", label: "Customer ID", className: "col-customer" },
  { key: "insuredName", label: "Insured Name", className: "col-insured", primary: true },
  { key: "contactPerson", label: "Contact Person Name", className: "col-contact-person" },
  { key: "contactNumber", label: "Phone Number", className: "col-contact" },
  { key: "policyNumber", label: "Policy No.", className: "col-policy", code: true },
  {
    key: "vehicleNumber",
    label: "Vehicle / Risk Location",
    className: "col-vehicle",
    code: true,
    fallbackKey: "registrationNumber",
  },
  { key: "insuranceCompany", label: "Insurance Company", className: "col-company" },
  { key: "whatsappGroupName", label: "WP Group Name", className: "col-group" },
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
    minute: "2-digit",
  });
}

function formatMoneyValue(value) {
  if (value === undefined || value === null || value === "") return "-";
  const amount = Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(amount)) return String(value);
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(amount)}`;
}

function renderCell(record, column, isExpanded, onToggleLongText) {
  const fallbackKeys = [column.fallbackKey, ...(column.fallbackKeys || [])].filter(Boolean);
  let rawValue = [record[column.key], ...fallbackKeys.map((key) => record[key])].find(
    (candidate) => candidate !== undefined && candidate !== null && candidate !== "",
  );
  
  if (column.key === "vehicleNumber" && !rawValue) {
    const fallbackValue = record.tehsil || record.policyType || "";
    if (fallbackValue && fallbackValue.length > 30) {
      const truncated = fallbackValue.substring(0, 27) + "...";
      return <span title={fallbackValue}>{truncated}</span>;
    }
    return fallbackValue ? <span title={fallbackValue}>{fallbackValue}</span> : "";
  }

  const value =
    column.format === "dateTime"
      ? formatDateTime(rawValue)
      : column.format === "date"
        ? formatDate(rawValue)
        : column.format === "money"
          ? formatMoneyValue(rawValue)
        : rawValue || "";
  if (column.compact && String(value).length > 32) {
    return (
      <div className={`record-compact-text${isExpanded ? " expanded" : ""}`}>
        <span title={String(value)}>{String(value)}</span>
        <button
          type="button"
          onClick={onToggleLongText}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? "Collapse" : "See full"} ${column.label}`}
        >
          {isExpanded ? "Show less" : "See more"}
        </button>
      </div>
    );
  }
  if (column.primary) {
    return (
      <div>
        <strong className="record-primary">{value}</strong>
        {record.clientIdPending ? (
          <span
            className={`client-id-pending-badge${record.clientIdStatus === "ACTION_REQUIRED" ? " client-id-action-required-badge" : ""}`}
            title={`Request ID: ${record.clientIdRequestId}`}
            style={{
              display: "block",
              width: "fit-content",
              marginTop: "4px",
              padding: "2px 6px",
              borderRadius: "999px",
              background: record.clientIdStatus === "ACTION_REQUIRED" ? "#fee2e2" : "#fef3c7",
              color: record.clientIdStatus === "ACTION_REQUIRED" ? "#991b1b" : "#92400e",
              fontSize: "9px",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {record.clientIdStatus === "ACTION_REQUIRED" ? "Client ID Action Required" : "Client ID Pending"} · {record.clientIdRequestId?.slice(0, 8)}…
          </span>
        ) : null}
      </div>
    );
  }
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

export default function RecordsTable({
  records,
  columns = DEFAULT_RECORD_COLUMNS,
  canEdit = false,
  onEdit,
  canDelete = false,
  onDelete,
  paginate = true,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [expandedCell, setExpandedCell] = useState(null);
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
    const isHealth =
      inferUploadSchema({ sourceFile: record.sourceFile || "", extractedData: record })?.groupId === "health";
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
        minute: "2-digit",
      });
    };

    const renderPrintSection = (title, fields) => {
      const validFields = fields.filter(
        ([_, val]) => val !== undefined && val !== null && String(val).trim() !== "",
      );
      if (validFields.length === 0) return "";
      return `
        <div class="section">
          <h3>${title}</h3>
          <div class="grid">
            ${validFields
              .map(
                ([lbl, val]) => `
              <div class="field">
                <span class="label">${lbl}</span>
                <span class="value">${val}</span>
              </div>
            `,
              )
              .join("")}
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
            <img src="${window.location.origin}/brand/main-logo-wide.webp" alt="Bima Headquarter" class="print-logo" />
          </div>
          
          ${renderPrintSection("General Information", [
            ["Customer ID", record.customerId],
            ["Insured Name", record.insuredName],
            ["Contact Person", record.contactPerson],
            ["Phone Number", record.contactNumber],
            ["WhatsApp Group Name", record.whatsappGroupName],
            ["Group Name", record.groupName],
            ["Insurance Company", record.insuranceCompany],
            ["Policy Type", record.policyType],
            ["New / Renewal", record.newOrRenewal],
          ])}

          ${renderPrintSection("Dates & Coverage", [
            ["Start Date", formatDateLocal(record.startDate)],
            ["Expiry Date", formatDateLocal(record.expiryDate)],
            ["Duration", record.duration],
            ["Policy Tenure", record.policyTenure],
            ["Sum Insured", record.sumInsured],
          ])}

          ${renderPrintSection("Financial Details", [
            ["Basic Premium", record.basicPremium],
            ["GST", record.gstAmount],
            ["Stamp Duty", record.stampDuty],
            ["Net Premium", record.netPremium],
            ["OD Premium", isHealth ? "" : record.odPremium],
            ["TP + Driver + Owner", isHealth ? "" : record.tpDriverOwner],
            ["Total Premium", record.totalPremium],
            ["Mode of Payment", isHealth ? "" : record.modeOfPayment],
            ["Collected Amount", isHealth ? "" : record.collectedAmount],
            ["Due Collection", isHealth ? "" : record.dueCollection],
          ])}

          ${isHealth ? "" : renderPrintSection("Vehicle Details", [
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
            ["RTO Location", record.rtoLocation],
          ])}

          ${
            isHealth && Array.isArray(record.insuredMembers)
              ? record.insuredMembers
                  .map((member, index) =>
                    renderPrintSection(`Insured Member ${index + 1}`, [
                      ["Insured Name", member.name || member.insuredName],
                      ["Date of Birth", member.dateOfBirth],
                      ["Age", member.age],
                      ["Gender", member.gender],
                      ["Relationship with Policyholder", member.relationship || member.relationshipWithPolicyholder],
                      ["ABHA ID", member.abhaId],
                      ["Pre-existing Diseases", member.preExistingDiseases],
                      ["First Policy Inception Date", member.firstPolicyInceptionDate],
                      ["Specific Conditions", member.specificConditions],
                    ]),
                  )
                  .join("")
              : ""
          }

          ${renderPrintSection("Additional & Risk Details", [
            ["Nominee Name", record.nomineeName],
            ["Nominee Relationship", record.nomineeRelationship],
            ["Nominee Date of Birth", record.nomineeDateOfBirth],
            ["Previous Policy Number", record.previousPolicyNumber],
            ["Number of Insured Members", record.numberOfInsuredMembers],
            ["Hypothecation / Financer", isHealth ? "" : record.financerName],
            ["Risk Location", isHealth ? "" : record.riskLocation],
            ["Occupancy", isHealth ? "" : record.occupancy],
            ["Tehsil", isHealth ? "" : record.tehsil],
            ["District", isHealth ? "" : record.district],
            ["PPT / MPWLC", isHealth ? "" : record.pptMpwlc],
            ["Valid In", isHealth ? "" : record.validIn],
            ["Remarks", record.remark],
          ])}

          ${renderPrintSection("Metadata", [
            ["Source PDF File", record.sourceFile],
            ["Created By", record.uploadedByEmail || record.uploadedBy],
            ["Saved Date", formatDateTimeLocal(record.savedAt)],
            ["Renewal Status", record.renewalStatus],
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

  const pageCount = paginate ? Math.max(1, Math.ceil(records.length / PAGE_SIZE)) : 1;
  const startIndex = paginate ? (currentPage - 1) * PAGE_SIZE : 0;
  const visibleRecords = useMemo(
    () => (paginate ? records.slice(startIndex, startIndex + PAGE_SIZE) : records),
    [paginate, records, startIndex],
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
  const tableMinWidth = Math.max(
    980,
    columns.reduce(
      (total, column) => total + (COLUMN_WIDTHS[column.className || "col-default"] || 150),
      (canEdit ? 88 : 0) + (canDelete ? 48 : 0) + 64,
    ),
  );

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
                    aria-label={
                      allVisibleSelected ? "Unmark all records on this page" : "Mark all records on this page"
                    }
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
                <th key={column.key} className={getStickyClassName(index)} style={getStickyStyle(index)}>
                  {column.label}
                </th>
              ))}
              <th>View</th>
              {canEdit ? <th>Edit</th> : null}
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {records.length ? (
              visibleRecords.map((record) => {
                const isMarked = selectedIds.has(record.id);
                return (
                  <tr key={record.id} className={isMarked ? "row-marked" : ""}>
                    {canDelete ? (
                      <td className="sticky-col" style={{ left: 0 }}>
                        <button
                          className={`record-mark-toggle ${isMarked ? "marked" : ""}`}
                          type="button"
                          title={isMarked ? "Unmark" : "Mark"}
                          aria-label={
                            isMarked
                              ? `Unmark ${record.policyNumber || record.insuredName || "record"}`
                              : `Mark ${record.policyNumber || record.insuredName || "record"}`
                          }
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
                      <td
                        key={column.key}
                        className={getStickyClassName(index)}
                        style={getStickyStyle(index)}
                      >
                        {renderCell(
                          record,
                          column,
                          expandedCell === `${record.id}:${column.key}`,
                          () =>
                            setExpandedCell((current) =>
                              current === `${record.id}:${column.key}` ? null : `${record.id}:${column.key}`,
                            ),
                        )}
                      </td>
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
                        <a
                          className="pdf-icon-link"
                          href={`/api/records/${record.id}/pdf`}
                          title="Download PDF"
                          aria-label="Download PDF"
                        >
                          <Download size={14} />
                        </a>
                      ) : (
                        <span
                          className="missing-pdf compact"
                          style={{ color: "#d93025", fontWeight: "700", fontSize: "11px" }}
                        >
                          Missing
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="empty" colSpan={columns.length + 2 + (canEdit ? 1 : 0) + (canDelete ? 1 : 0)}>
                  No database records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {paginate && records.length > PAGE_SIZE ? (
        <div className="table-pagination" aria-label="Table pagination">
          <span>
            Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, records.length)} of {records.length}
          </span>
          <div className="table-page-list">
            <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
              Prev
            </button>
            {visiblePageNumbers.map((page, index) =>
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
                    userSelect: "none",
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
              ),
            )}
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === pageCount}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {selectedRecord && (
        <PolicyDetailCard
          mode="view"
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onPrint={handlePrint}
        />
      )}

      {/* Floating action bar when records are marked */}
      {canDelete &&
        selectedIds.size > 0 &&
        typeof window !== "undefined" &&
        createPortal(
          <div className="mark-action-bar">
            <div className="mark-action-bar-inner">
              <div className="mark-action-info">
                <CheckSquare size={18} strokeWidth={1.6} />
                <span>
                  <strong>{selectedIds.size}</strong> record{selectedIds.size === 1 ? "" : "s"} marked
                </span>
              </div>
              <div className="mark-action-buttons">
                <button className="mark-action-clear" type="button" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </button>
                <button className="mark-action-delete" type="button" onClick={handleDeleteSelected}>
                  <Trash2 size={16} strokeWidth={2.5} />
                  Delete Selected
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
