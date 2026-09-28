"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Pencil, Eye, Trash2, CheckSquare, Square, MinusSquare, FileText, MoreVertical, Printer } from "lucide-react";
import PolicyDetailCard from "@/app/components/shared/PolicyDetailCard";
import { inferUploadSchema } from "@/app/lib/dashboard-helpers";
import { showToast } from "@/app/components/shared/ToastProvider";
import { getShortCompanyDisplay } from "@/lib/renewals/companies";

const DEFAULT_RECORD_COLUMNS = [
  { key: "insuredName", label: "Insured / Customer", className: "col-insured", primary: true },
  { key: "policyNumber", label: "Policy No.", className: "col-policy", code: true },
  { key: "insuranceCompany", label: "Insurance Company", className: "col-company" },
  { key: "policyType", fallbackKeys: ["policyCoverType", "coverType", "documentCategory"], label: "Policy Type", className: "col-type" },
  {
    key: "vehicleLocation",
    fallbackKeys: ["vehicleNumber", "registrationNumber", "riskLocation", "premisesAddress"],
    label: "Vehicle / Location",
    className: "col-default",
  },
  { key: "contactPerson", fallbackKeys: ["contactNumber", "mobile", "contact"], label: "Contact Person", className: "col-contact" },
  { key: "expiryDate", fallbackKeys: ["policyEndDate"], label: "Expiry", className: "col-date", format: "niceDate" },
  {
    key: "grossPremium",
    fallbackKeys: ["totalPremium", "premium", "premiumIncludingGst"],
    label: "Gross Premium",
    className: "col-money",
    format: "money",
  },
  { key: "status", fallbackKeys: ["policyStatus", "renewalStatus"], label: "Status", className: "col-default" },
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatNiceDate(value) {
  if (!value) return "-";
  const str = String(value).trim().replace(/^["']|["']$/g, "");
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    const mIdx = parseInt(month, 10) - 1;
    return `${parseInt(day, 10)} ${MONTH_NAMES[mIdx] || month} ${year}`;
  }
  const num = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (num) {
    const day = parseInt(num[1], 10);
    const mIdx = parseInt(num[2], 10) - 1;
    const year = num[3].length === 2 ? `20${num[3]}` : num[3];
    return `${day} ${MONTH_NAMES[mIdx] || num[2]} ${year}`;
  }
  const named = str.match(/^(\d{1,2})[/-]([A-Za-z]{3})[/-](\d{2,4})$/);
  if (named) {
    const day = parseInt(named[1], 10);
    const month = named[2].charAt(0).toUpperCase() + named[2].slice(1, 3).toLowerCase();
    const year = named[3].length === 2 ? `20${named[3]}` : named[3];
    return `${day} ${month} ${year}`;
  }
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return str;
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function getPolicyStatus(record) {
  if (record.status && ["Active", "Expiring", "Expired"].includes(record.status)) {
    return record.status;
  }
  const dateStr = record.expiryDate || record.policyEndDate;
  if (!dateStr) return "Active";

  let expiry = null;
  const str = String(dateStr).trim().replace(/^["']|["']$/g, "");
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (ymdMatch) {
    expiry = new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]));
  } else {
    const num = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (num) {
      const year = num[3].length === 2 ? `20${num[3]}` : num[3];
      expiry = new Date(Number(year), Number(num[2]) - 1, Number(num[1]));
    } else {
      const d = new Date(str);
      if (!Number.isNaN(d.getTime())) expiry = d;
    }
  }

  if (!expiry) return "Active";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  expiry = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());

  if (expiry < today) {
    return "Expired";
  }
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) {
    return "Expiring";
  }
  return "Active";
}

function formatDate(value) {
  if (!value) return "-";
  const str = String(value).trim().replace(/^["']|["']$/g, "");
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${day}-${month}-${year}`;
  }
  const num = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (num) {
    const day = num[1].padStart(2, "0");
    const month = num[2].padStart(2, "0");
    const year = num[3].length === 2 ? `20${num[3]}` : num[3];
    return `${day}-${month}-${year}`;
  }
  const named = str.match(/^(\d{1,2})[/-]([A-Za-z]{3})[/-](\d{2,4})$/);
  if (named) {
    const monthMap = { JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06", JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12" };
    const day = named[1].padStart(2, "0");
    const month = monthMap[named[2].toUpperCase()] || "01";
    const year = named[3].length === 2 ? `20${named[3]}` : named[3];
    return `${day}-${month}-${year}`;
  }
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return str;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const cleanStr = String(value).trim().replace(/^["']|["']$/g, "");
  const date = new Date(cleanStr);
  if (Number.isNaN(date.getTime())) return cleanStr;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
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
  
  if (column.key === "vehicleLocation") {
    const veh = (record.vehicleNumber || record.registrationNumber || "").trim();
    if (veh) return <span className="record-code">{veh}</span>;
    const loc = (record.riskLocation || record.premisesAddress || record.district || "").trim();
    if (loc) {
      if (loc.length > 25) {
        return <span title={loc}>{loc.substring(0, 22)}...</span>;
      }
      return <span title={loc}>{loc}</span>;
    }
    return "-";
  }

  if (column.key === "insuranceCompany") {
    const shortName = getShortCompanyDisplay(record.insuranceCompany || rawValue);
    return (
      <span title={record.insuranceCompany || rawValue || ""} style={{ fontWeight: 500, color: "#1e293b" }}>
        {shortName || "-"}
      </span>
    );
  }

  if (column.key === "policyType" || column.key === "policyCoverType") {
    let typeDisplay = record.policyType || record.policyCoverType || record.coverType || record.documentCategory || rawValue || "-";
    const upper = String(typeDisplay).toUpperCase();
    if (upper.includes("PACKAGE") || upper.includes("COMPREHENSIVE") || upper.includes("AUTO SECURE")) {
      typeDisplay = "Comprehensive";
    } else if (upper.includes("OD") || upper.includes("OWN DAMAGE")) {
      typeDisplay = "OD";
    } else if (upper.includes("TP") || upper.includes("THIRD PARTY") || upper.includes("LIABILITY")) {
      typeDisplay = "TP";
    }

    const norRaw = String(record.newOrRenewal || record.policyCategory || record.lob || "").trim();
    let nor = "";
    if (/renew/i.test(norRaw)) nor = "Renewal";
    else if (/new/i.test(norRaw)) nor = "New";
    else if (norRaw && norRaw !== "-") nor = norRaw;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span style={{ fontWeight: 500, color: "#1e293b" }}>{typeDisplay}</span>
        {nor ? (
          <span
            style={{
              display: "inline-block",
              width: "fit-content",
              fontSize: "11px",
              fontWeight: 600,
              color: nor === "Renewal" ? "#0284c7" : "#16a34a",
            }}
          >
            {nor}
          </span>
        ) : null}
      </div>
    );
  }

  if (column.key === "numberOfInsuredMembers" || column.key === "members") {
    if (Array.isArray(rawValue)) return `${rawValue.length} members`;
    if (rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== "") {
      const num = parseInt(rawValue, 10);
      if (!Number.isNaN(num)) return `${num} ${num === 1 ? "member" : "members"}`;
      return String(rawValue);
    }
    return "-";
  }

  if (column.key === "vehicleNumber" && !rawValue) {
    return "-";
  }

  if (typeof rawValue === "object" && rawValue !== null) {
    if (Array.isArray(rawValue)) {
      rawValue = rawValue
        .map((item) =>
          typeof item === "object" && item !== null
            ? item.name || item.insuredName || item.label || JSON.stringify(item)
            : String(item),
        )
        .join(", ");
    } else {
      rawValue = rawValue.name || rawValue.insuredName || rawValue.label || JSON.stringify(rawValue);
    }
  }

  if (column.key === "vehicle") {
    const makeModel = (record.makeModel || record.vehicleMake || record.vehicle || "").trim();
    const year = (record.manufacturingYear || "").trim();
    if (makeModel && year) return `${makeModel} · ${year}`;
    if (makeModel) return makeModel;
    if (year) return `Year: ${year}`;
    return record.variant || record.policyType || "-";
  }

  if (column.key === "contactPerson" || column.key === "contactNumber" || column.key === "contact") {
    const rawPerson = (record.contactPerson || "").trim();
    const rawNum = (record.contactNumber || record.mobile || record.phone || "").trim();

    const isJunkPerson =
      rawPerson.length > 60 ||
      /please\s*go\s*through|discrepanc|rectification|mailing address|registered office|e-mail id|fax:|issuing office/i.test(rawPerson) ||
      /\b(?:road|street|plot|ward|behind|near|nagar|teh\.?|dist\.?|madhya|bhopal|462001|458888)\b/i.test(rawPerson);
    const person = isJunkPerson ? "" : rawPerson;

    const isJunkNumber =
      rawNum.length > 20 ||
      /e-mail id|fax:|insured.s details|issuing office|details$/i.test(rawNum);
    const num = isJunkNumber ? "" : rawNum;

    if (person && num && person !== num) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontWeight: 500, color: "#1e293b", fontSize: "12.5px" }}>{person}</span>
          <span style={{ fontSize: "11px", color: "#64748b" }}>{num}</span>
        </div>
      );
    }
    if (person) {
      return <span style={{ fontWeight: 500, color: "#1e293b", fontSize: "12.5px" }}>{person}</span>;
    }
    if (num) {
      return <span style={{ fontWeight: 500, color: "#1e293b", fontSize: "12.5px" }}>{num}</span>;
    }
    return "-";
  }

  if (column.key === "newOrRenewal") {
    const raw = String(rawValue || "").trim();
    if (!raw || raw === "-") return "-";
    if (/renew/i.test(raw)) return "Renewal";
    if (/new/i.test(raw)) return "New";
    return raw;
  }

  if (column.key === "ncb") {
    if (rawValue === undefined || rawValue === null || rawValue === "") return "-";
    const str = String(rawValue).trim();
    if (!str || str === "-") return "-";
    const numMatch = str.match(/^(\d{1,2})\s*%?$/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num >= 0 && num <= 65) return `${num}%`;
    }
    return "-";
  }

  if (column.key === "status") {
    const status = getPolicyStatus(record);
    let bg = "#ecfdf5";
    let color = "#065f46";
    let border = "#a7f3d0";
    if (status === "Expiring") {
      bg = "#fffbeb";
      color = "#b45309";
      border = "#fde68a";
    } else if (status === "Expired") {
      bg = "#fef2f2";
      color = "#b91c1c";
      border = "#fecaca";
    }
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: "9999px",
          fontSize: "11px",
          fontWeight: 600,
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`,
          whiteSpace: "nowrap",
        }}
      >
        {status}
      </span>
    );
  }

  const value =
    column.format === "niceDate"
      ? formatNiceDate(rawValue)
      : column.format === "dateTime"
        ? formatDateTime(rawValue)
        : column.format === "date"
          ? formatDate(rawValue)
          : column.format === "money"
            ? (column.key === "idv" || column.key === "sumInsured") &&
              (!rawValue || Number(String(rawValue).replace(/[^0-9.-]/g, "")) <= 0)
              ? "-"
              : formatMoneyValue(rawValue)
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
  if (column.primary || column.key === "insuredName") {
    const custId = record.customerId || record.customerCode || record.clientId || "";
    return (
      <div>
        <strong className="record-primary" style={{ display: "block", color: "#0f172a", fontSize: "13px", fontWeight: 600 }}>
          {value || record.insuredName || "-"}
        </strong>
        {custId ? (
          <span
            style={{
              display: "inline-block",
              marginTop: "2px",
              fontSize: "11px",
              fontWeight: 600,
              color: "#64748b",
              fontFamily: "monospace",
              letterSpacing: "0.02em",
            }}
          >
            {custId}
          </span>
        ) : null}
        {record.clientIdPending ? (
          <a
            href={`/operations/client-management?clientIdRequest=${record.clientIdRequestId}`}
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
          </a>
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
  "col-insured": 220,
  "col-contact": 150,
  "col-contact-person": 150,
  "col-policy": 150,
  "col-vehicle": 150,
  "col-type": 140,
  "col-company": 150,
  "col-uploader": 150,
  "col-source": 150,
  "col-group": 180,
  "col-location": 180,
  "col-description": 180,
  "col-occupancy": 180,
  "col-money": 130,
  "col-date": 120,
  "col-duration": 125,
  "col-district": 125,
  "col-tehsil": 125,
  "col-ppt": 125,
  "col-valid": 125,
  "col-pdf": 96,
  "col-action": 130,
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
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("bhq_records_page_size");
      if (saved && [15, 25, 50, 100].includes(Number(saved))) return Number(saved);
    }
    return 25;
  });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [expandedCell, setExpandedCell] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState("");
  const [actionMenuPosition, setActionMenuPosition] = useState(null);

  const openActionMenu = (recordId, event) => {
    event.stopPropagation();
    if (activeActionMenuId === recordId) {
      closeActionMenu();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 180;
    const menuHeight = 170;
    const gap = 4;
    const viewportWidth = (typeof document !== "undefined" && document.documentElement?.clientWidth) || window.innerWidth;
    const left = Math.min(viewportWidth - menuWidth - 12, Math.max(12, rect.right - menuWidth));
    const opensUp = window.innerHeight - rect.bottom < menuHeight + 16;
    const top = opensUp ? Math.max(12, rect.top - menuHeight - gap) : rect.bottom + gap;

    setActionMenuPosition({ top, left, width: menuWidth });
    setActiveActionMenuId(recordId);
  };

  const closeActionMenu = () => {
    setActiveActionMenuId("");
    setActionMenuPosition(null);
  };

  useEffect(() => {
    if (!activeActionMenuId) return;
    const handleScrollOrResize = () => closeActionMenu();
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [activeActionMenuId]);

  const getStickyStyle = (colIndex) => {
    if (colIndex >= 2) return {};

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
    if (colIndex >= 2) return "";
    const isLastSticky = colIndex === Math.min(1, columns.length - 1);
    return `sticky-col ${isLastSticky ? "sticky-col-last" : ""}`;
  };

  const handlePrint = (record) => {
    if (!record) return;
    const isHealth =
      inferUploadSchema({ sourceFile: record.sourceFile || "", extractedData: record })?.groupId === "health";
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Please allow popups in your browser to print policy details.", "warning");
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
            [
              "Created By",
              (typeof record.uploadedBy === "object" ? record.uploadedBy?.name || record.uploadedBy?.email : record.uploadedBy) ||
                (typeof record.createdBy === "object" ? record.createdBy?.name || record.createdBy?.email : record.createdBy) ||
                record.uploadedByEmail ||
                record.createdByEmail ||
                record.createdByName ||
                "",
            ],
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

  const pageCount = paginate ? Math.max(1, Math.ceil(records.length / pageSize)) : 1;
  const startIndex = paginate ? (currentPage - 1) * pageSize : 0;
  const visibleRecords = useMemo(
    () => (paginate ? records.slice(startIndex, startIndex + pageSize) : records),
    [paginate, records, startIndex, pageSize],
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
      (canDelete ? 48 : 0) + (COLUMN_WIDTHS["col-action"] || 130),
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

  const handleBulkDownload = async () => {
    if (!selectedIds.size || isBulkDownloading) return;
    setIsBulkDownloading(true);
    try {
      showToast("Preparing ZIP archive with policy PDFs and audit report...", "info");
      const response = await fetch("/api/records/bulk-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to download bulk PDFs.");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `policies_bulk_download_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      showToast("ZIP archive downloaded successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to download PDFs.", "error");
    } finally {
      setIsBulkDownloading(false);
    }
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
            <col className="col-action" style={{ width: "130px" }} />
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
              <th className="col-action-th" style={{ textAlign: "center", width: "130px", minWidth: "130px", background: "#f3f4f5" }}>Actions</th>
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
                    <td className="col-action-cell" style={{ textAlign: "center", whiteSpace: "nowrap", width: "130px", minWidth: "130px" }}>
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "center" }}>
                        <button
                          aria-label={`View details of ${record.policyNumber || record.insuredName || "policy record"}`}
                          className="record-icon-action"
                          title="View policy details"
                          type="button"
                          onClick={() => setSelectedRecord(record)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "28px",
                            height: "28px",
                            padding: 0,
                            lineHeight: 0,
                            boxSizing: "border-box",
                            borderRadius: "6px",
                            backgroundColor: "#ffffff",
                            color: "#0f172a",
                            border: "1px solid #cbd5e1",
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                          }}
                        >
                          <Eye size={15} strokeWidth={2} />
                        </button>
                        {record.hasPdf ? (
                          <a
                            className="record-icon-action"
                            href={`/api/records/${record.id}/pdf?view=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View PDF"
                            aria-label={`View PDF for ${record.policyNumber || record.insuredName || "policy"}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "28px",
                              height: "28px",
                              padding: 0,
                              lineHeight: 0,
                              boxSizing: "border-box",
                              borderRadius: "6px",
                              backgroundColor: "#ffffff",
                              color: "#0f172a",
                              border: "1px solid #cbd5e1",
                              textDecoration: "none",
                              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                            }}
                          >
                            <FileText size={15} strokeWidth={2} />
                          </a>
                        ) : (
                          <span
                            className="record-icon-action disabled"
                            title={record.isExcelImport ? "No PDF - Excel Import" : "PDF Missing"}
                            aria-label="No PDF attached"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "28px",
                              height: "28px",
                              padding: 0,
                              lineHeight: 0,
                              boxSizing: "border-box",
                              borderRadius: "6px",
                              backgroundColor: "#f8fafc",
                              color: "#94a3b8",
                              border: "1px solid #e2e8f0",
                              cursor: "not-allowed",
                              opacity: 0.6,
                            }}
                          >
                            <FileText size={15} strokeWidth={2} />
                          </span>
                        )}
                        <button
                          type="button"
                          className="record-icon-action"
                          title="More actions"
                          aria-label={`More actions for ${record.policyNumber || record.insuredName || "policy"}`}
                          aria-expanded={activeActionMenuId === record.id}
                          onClick={(e) => openActionMenu(record.id, e)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "28px",
                            height: "28px",
                            padding: 0,
                            lineHeight: 0,
                            boxSizing: "border-box",
                            borderRadius: "6px",
                            backgroundColor: "#ffffff",
                            color: "#0f172a",
                            border: "1px solid #cbd5e1",
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                          }}
                        >
                          <MoreVertical size={15} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="empty" colSpan={columns.length + 1 + (canDelete ? 1 : 0)}>
                  No database records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activeActionMenuId && actionMenuPosition && typeof document !== "undefined"
        ? createPortal(
            <>
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 9998,
                  background: "transparent",
                }}
                onClick={closeActionMenu}
              />
              <div
                role="menu"
                style={{
                  position: "fixed",
                  zIndex: 9999,
                  top: `${actionMenuPosition.top}px`,
                  left: `${actionMenuPosition.left}px`,
                  width: `${actionMenuPosition.width || 180}px`,
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.08)",
                  padding: "5px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                {(() => {
                  const activeRec = records.find((r) => r.id === activeActionMenuId);
                  if (!activeRec) return null;
                  return (
                    <>
                      {activeRec.hasPdf ? (
                        <a
                          href={`/api/records/${activeRec.id}/pdf`}
                          download
                          onClick={closeActionMenu}
                          className="record-menu-action-item"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            width: "100%",
                            boxSizing: "border-box",
                            gap: "8px",
                            padding: "8px 10px",
                            margin: 0,
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "#334155",
                            textDecoration: "none",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", flexShrink: 0 }}>
                            <Download size={14} />
                          </span>
                          <span style={{ flex: 1, textAlign: "left" }}>Download PDF</span>
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          closeActionMenu();
                          handlePrint(activeRec);
                        }}
                        className="record-menu-action-item"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-start",
                          width: "100%",
                          boxSizing: "border-box",
                          gap: "8px",
                          padding: "8px 10px",
                          margin: 0,
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "#334155",
                          background: "none",
                          border: "none",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", flexShrink: 0 }}>
                          <Printer size={14} />
                        </span>
                        <span style={{ flex: 1, textAlign: "left" }}>Print Policy</span>
                      </button>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => {
                            closeActionMenu();
                            onEdit?.(activeRec);
                          }}
                          className="record-menu-action-item"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            width: "100%",
                            boxSizing: "border-box",
                            gap: "8px",
                            padding: "8px 10px",
                            margin: 0,
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "#334155",
                            background: "none",
                            border: "none",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", flexShrink: 0 }}>
                            <Pencil size={14} />
                          </span>
                          <span style={{ flex: 1, textAlign: "left" }}>Edit Policy</span>
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => {
                            closeActionMenu();
                            onDelete?.([activeRec]);
                          }}
                          className="record-menu-action-item"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            width: "100%",
                            boxSizing: "border-box",
                            gap: "8px",
                            padding: "8px 10px",
                            margin: 0,
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "#dc2626",
                            background: "none",
                            border: "none",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", flexShrink: 0 }}>
                            <Trash2 size={14} />
                          </span>
                          <span style={{ flex: 1, textAlign: "left" }}>Delete Record</span>
                        </button>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            </>,
            document.body,
          )
        : null}

      {paginate && (records.length > pageSize || records.length > 15) ? (
        <div className="table-pagination" aria-label="Table pagination" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>
              Showing {startIndex + 1}-{Math.min(startIndex + pageSize, records.length)} of {records.length}
            </span>
            <span style={{ color: "#cbd5e1" }}>·</span>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b" }}>
              Per page:
              <select
                value={pageSize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPageSize(val);
                  setCurrentPage(1);
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("bhq_records_page_size", String(val));
                  }
                }}
                style={{
                  padding: "3px 8px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "12px",
                  color: "#1e293b",
                  cursor: "pointer",
                }}
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
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
                <button
                  className="mark-action-download"
                  type="button"
                  disabled={isBulkDownloading}
                  onClick={handleBulkDownload}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                    cursor: isBulkDownloading ? "not-allowed" : "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <Download size={16} strokeWidth={2.2} />
                  {isBulkDownloading ? "Preparing ZIP..." : "Download All PDFs (ZIP)"}
                </button>
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
