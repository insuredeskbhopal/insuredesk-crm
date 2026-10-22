"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import * as XLSX from "xlsx";
import ModalPortal from "@/app/components/shared/ModalPortal";
import { showToast } from "@/app/components/shared/ToastProvider";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCopy,
  FileSpreadsheet,
  FileText,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";
import { excelDateToString } from "@/lib/renewals/import-identity.cjs";

const KNOWN_INSURERS = [
  "The New India Assurance Company Limited",
  "ICICI Lombard General Insurance Company Limited",
  "Bajaj Allianz General Insurance Company Limited",
  "HDFC ERGO General Insurance Company Limited",
  "Tata AIG General Insurance Company Limited",
  "IFFCO Tokio General Insurance Company Limited",
  "United India Insurance Company Limited",
  "National Insurance Company Limited",
  "The Oriental Insurance Company Limited",
  "Reliance General Insurance Company Limited",
  "Shriram General Insurance Company Limited",
  "SBI General Insurance Company Limited",
  "Cholamandalam MS General Insurance Company Limited",
  "Universal Sompo General Insurance Company Limited",
  "Star Health and Allied Insurance Company Limited",
  "Care Health Insurance Limited",
  "Niva Bupa Health Insurance Company Limited",
  "Go Digit General Insurance Limited",
  "Future Generali India Insurance Company Limited",
  "Royal Sundaram General Insurance Company Limited",
  "Kotak Mahindra General Insurance Company Limited",
  "Magma HDI General Insurance Company Limited",
  "Liberty General Insurance Limited",
  "Zuno General Insurance Limited",
];

const KNOWN_POLICY_TYPES = [
  "Commercial Vehicle",
  "Private Car",
  "Two Wheeler",
  "Goods Carrying Vehicle",
  "Passenger Carrying Vehicle",
  "Standard Fire & Special Perils",
  "Warehouse Policy",
  "Family Health Optima",
  "Individual Mediclaim",
  "Group Health Policy",
  "Optima Secure",
  "Marine Cargo",
  "Workmen Compensation",
  "Burglary & Housebreaking",
  "Public Liability",
  "Personal Accident",
  "Life Insurance",
  "Other Policy",
];

const TEMPLATE_CATEGORIES = [
  { id: "all", label: "All Categories (Universal Master)" },
  { id: "motor", label: "Motor Insurance (Car, Commercial, 2-Wheeler)" },
  { id: "health", label: "Health Insurance (Mediclaim, Group Health)" },
  { id: "warehouse", label: "Warehouse & Fire (SFSP, Burglary, Stocks)" },
  { id: "nonmotor", label: "Non-Motor & Marine (Cargo, WC, Liability)" },
];

const RENEWAL_MONTHS = [
  { value: "auto", label: "Auto (From Dates)" },
  { value: "1", label: "January (01)" },
  { value: "2", label: "February (02)" },
  { value: "3", label: "March (03)" },
  { value: "4", label: "April (04)" },
  { value: "5", label: "May (05)" },
  { value: "6", label: "June (06)" },
  { value: "7", label: "July (07)" },
  { value: "8", label: "August (08)" },
  { value: "9", label: "September (09)" },
  { value: "10", label: "October (10)" },
  { value: "11", label: "November (11)" },
  { value: "12", label: "December (12)" },
];

const MONTH_SHORT_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getDefaultPolicyTypeForCategory(cat) {
  switch (cat) {
    case "motor":
      return "Commercial Vehicle";
    case "health":
      return "Family Health Optima";
    case "warehouse":
      return "Warehouse Policy";
    case "nonmotor":
      return "Marine Cargo";
    default:
      return "Commercial Vehicle";
  }
}

function createBlankRow(category = "all", month = "auto") {
  const defaultDate =
    month !== "auto" && parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12
      ? `2026-${String(parseInt(month, 10)).padStart(2, "0")}-28`
      : "";

  return {
    id: `rn-row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    policyNumber: "",
    insuredName: "",
    contactNumber: "",
    contactPersonName: "",
    sumInsuredDescription: "",
    insuranceCompany: "",
    policyType: getDefaultPolicyTypeForCategory(category),
    expiryDate: defaultDate,
    grossPremium: "",
    registrationNumber: "",
    makeModel: "",
    quote: "",
    remark: "",
    status: "ACTIVE",
  };
}

function normalizeRawValue(val) {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function parseRowData(raw, index = 0, defaultCategory = "all", defaultMonth = "auto") {
  const row = {};
  for (const [k, v] of Object.entries(raw || {})) {
    const cleanKey = k.trim().toLowerCase().replace(/[\s_#.]+/g, "");
    row[cleanKey] = v;
  }

  let policyNumber = normalizeRawValue(
    row.policynumber || row.policyno || row.policy || row["policy#"] || row.polno || ""
  ).replace(/:+$/, "").trim();

  let insuredName = normalizeRawValue(
    row.insuredname || row.customername || row.clientname || row.name || row.proposername || row.policyholder || ""
  );

  let contactPersonName = normalizeRawValue(
    row.contactpersonname || row.contactperson || row.contactname || row.personname || ""
  );

  let rawPhone = normalizeRawValue(
    row.contactnumber || row.customermobile || row.mobile || row.phone || row.mob || row.contactno || row.renewalmobile || ""
  );
  let contactDigits = rawPhone.replace(/\D/g, "");
  let contactNumber = contactDigits.length >= 10 ? contactDigits.slice(-10) : contactDigits;

  let sumInsuredDescription = normalizeRawValue(
    row.suminsureddescription || row.suminsured || row.suminsureddesc || row.idv || ""
  );

  let insuranceCompany = normalizeRawValue(
    row.insurancecompany || row.companyname || row.company || row.insurer || ""
  );

  let policyType = normalizeRawValue(
    row.policytype || row.product || row.lob || row.policycategory || row.category || ""
  );

  let rawExpiry = row.expirydate || row.policyexpirydate || row.enddate || row.renewaldate || "";
  let expiryDate = excelDateToString(rawExpiry);

  if (!expiryDate && defaultMonth !== "auto") {
    const monthNum = parseInt(defaultMonth, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      expiryDate = `2026-${String(monthNum).padStart(2, "0")}-28`;
    }
  }

  let grossPremium = normalizeRawValue(
    row.grosspremium || row.premium || row.totalpremium || row.netpremium || ""
  );

  let rawVehicleRisk = normalizeRawValue(row.vehiclerisk || row.vehicleandrisk || "");
  let registrationNumber = normalizeRawValue(
    row.registrationnumber || row.vehiclenumber || row.regno || row.vehicleno || rawVehicleRisk || ""
  ).toUpperCase();

  let makeModel = normalizeRawValue(row.makemodel || row.make || row.model || "");
  if (!makeModel && rawVehicleRisk) {
    const parts = rawVehicleRisk.split(/\s*[-/|]\s*/);
    if (parts.length >= 2) {
      registrationNumber = parts[0].trim().toUpperCase();
      makeModel = parts.slice(1).join(" - ").trim();
    }
  }

  let quote = normalizeRawValue(row.quote || row.quoteamount || "");
  let remark = normalizeRawValue(row.remark || row.remarks || "");
  let status = normalizeRawValue(row.status || "ACTIVE").toUpperCase();
  if (!["ACTIVE", "RENEWED", "LOST"].includes(status)) {
    status = "ACTIVE";
  }

  return {
    id: `rn-row-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    policyNumber,
    insuredName,
    contactNumber,
    contactPersonName,
    sumInsuredDescription,
    insuranceCompany,
    policyType: policyType || getDefaultPolicyTypeForCategory(defaultCategory),
    expiryDate,
    grossPremium,
    registrationNumber,
    makeModel,
    quote,
    remark,
    status,
  };
}

function parseTabularText(text, defaultCategory = "all", defaultMonth = "auto") {
  if (!text || !text.trim()) return [];

  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];

  // Determine delimiter: tab (Google Sheets / Excel) vs comma (CSV)
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount >= commaCount ? "\t" : ",";

  const rows = lines.map((l) =>
    l.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""))
  );

  if (!rows.length) return [];

  // Check if first line resembles a header
  const headerCandidates = rows[0].map((c) => c.toLowerCase().replace(/[\s_#.]+/g, ""));
  const headerKeywords = [
    "policy",
    "insured",
    "customer",
    "client",
    "contact",
    "mobile",
    "company",
    "insurer",
    "expiry",
    "premium",
    "reg",
    "vehicle",
    "holder",
  ];
  const isHeader = headerCandidates.some((h) => headerKeywords.some((k) => h.includes(k)));

  const headers = isHeader ? rows[0] : null;
  const dataRows = isHeader ? rows.slice(1) : rows;

  let positionalCols = [];
  if (defaultCategory === "warehouse" || defaultCategory === "nonmotor") {
    positionalCols = [
      "policyType",
      "contactNumber",
      "contactPersonName",
      "policyNumber",
      "insuredName",
      "sumInsuredDescription",
      "grossPremium",
      "expiryDate",
      "insuranceCompany",
      "status",
      "remark",
    ];
  } else if (defaultCategory === "motor") {
    positionalCols = [
      "insuredName",
      "policyNumber",
      "policyType",
      "registrationNumber",
      "makeModel",
      "expiryDate",
      "contactNumber",
      "grossPremium",
      "insuranceCompany",
      "status",
      "quote",
      "remark",
    ];
  } else {
    positionalCols = [
      "policyNumber",
      "insuredName",
      "contactNumber",
      "insuranceCompany",
      "policyType",
      "expiryDate",
      "grossPremium",
      "registrationNumber",
      "makeModel",
      "quote",
      "remark",
      "status",
    ];
  }

  return dataRows
    .filter((tokens) => tokens.some((cell) => cell.trim().length > 0))
    .map((tokens, idx) => {
      const obj = {};
      if (headers) {
        headers.forEach((h, hIdx) => {
          obj[h] = tokens[hIdx] || "";
        });
      } else {
        positionalCols.forEach((col, cIdx) => {
          obj[col] = tokens[cIdx] || "";
        });
      }
      return parseRowData(obj, idx, defaultCategory, defaultMonth);
    });
}

function validateRow(row) {
  const issues = [];
  if (!row.insuredName || !row.insuredName.trim()) {
    issues.push("Insured name is required");
  }
  if (!row.policyNumber?.trim() && !row.registrationNumber?.trim()) {
    issues.push("Policy or Registration Number is required");
  }
  if (row.contactNumber && row.contactNumber.length > 0 && row.contactNumber.length !== 10) {
    issues.push("Mobile number should be 10 digits");
  }
  if (row.expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(row.expiryDate)) {
    issues.push("Expiry date format should be YYYY-MM-DD");
  }
  return {
    isValid: issues.length === 0,
    issues,
  };
}

export default function RenewalImportStudioModal({ isOpen, onClose, onImportSuccess, initialMonth }) {
  const [rows, setRows] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(
    initialMonth && initialMonth !== "All" && parseInt(initialMonth, 10) >= 1 && parseInt(initialMonth, 10) <= 12
      ? String(parseInt(initialMonth, 10))
      : "auto"
  );
  const [loadedFileName, setLoadedFileName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("all"); // "all" | "ready" | "issues"
  const [importing, setImporting] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState(null); // "xlsx" | "csv" | null
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(null);

  // Quick Paste from Sheets overlay state
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedRawText, setPastedRawText] = useState("");
  const [pasteMode, setPasteMode] = useState("append"); // "append" | "replace"

  const isWarehouseOrNonMotor = selectedCategory === "warehouse" || selectedCategory === "nonmotor";
  const isMotor = selectedCategory === "motor";

  const pastePlaceholder = useMemo(() => {
    if (selectedCategory === "motor") {
      return "Policyholder\tPolicy Number\tPolicy Type\tVehicle / Risk\tMake / Model\tExpiry Date\tRenewal Mobile\tGross Premium\tInsurance Company\tStatus\tQuote\tRemark\nVIJAY KUMAR MISHRA CONST PVT LTD\t45140031250100007692\tCommercial Vehicle\tMP17HH4323\tTata Signa 2823\t2026-11-02\t9685717917\t45531\tThe New India Assurance Company Limited\tACTIVE\t\tRequested NCB confirmation\n...";
    }
    if (selectedCategory === "warehouse" || selectedCategory === "nonmotor") {
      return "Policy Type\tContact No.\tContact Person Name\tPolicy No.\tInsured Name\tSum Insured Description\tPremium\tExpiry Date\tInsurance Company\tStatus\tRemark\nWarehouse Policy\t9826012345\tANAND SONI\tOG-24-1234-1801-00005678\tANAND ELECTRONICS & TRADERS\tStock & Building SI: 3 Cr\t38250\t2026-11-15\tBajaj Allianz General Insurance\tACTIVE\tPlot 12 Mandideep\n...";
    }
    return "Policy Number\tInsured Name\tContact Number\tInsurance Company\tPolicy Type\tExpiry Date\tGross Premium\tRegistration Number\tMake / Model\tQuote\tRemark\tStatus\n45140031250100007692\tVIJAY KUMAR\t9685717917\tThe New India Assurance\tCommercial Vehicle\t2026-11-02\t45531\tMP17HH4323\tTata Signa\t\tNotes\tACTIVE\n...";
  }, [selectedCategory]);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialMonth && initialMonth !== "All") {
      const num = parseInt(initialMonth, 10);
      if (num >= 1 && num <= 12) {
        setSelectedMonth(String(num));
      }
    }
  }, [initialMonth]);

  useEffect(() => {
    if (!isOpen) {
      setImportError("");
      setImportSuccess(null);
      setSearchQuery("");
      setFilterMode("all");
      setShowPasteModal(false);
      setPastedRawText("");
    }
  }, [isOpen]);

  // Window paste listener (Ctrl+V) when modal is open and not typing in an input
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowPaste = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return; // Allow native paste into inputs
      }

      const clipboardText = e.clipboardData?.getData("text");
      if (clipboardText && clipboardText.includes("\t")) {
        e.preventDefault();
        const parsed = parseTabularText(clipboardText, selectedCategory, selectedMonth);
        if (parsed.length > 0) {
          setRows((prev) => [...prev, ...parsed]);
          showToast(`Pasted ${parsed.length} row${parsed.length === 1 ? "" : "s"} from clipboard!`, "success");
        }
      }
    };

    window.addEventListener("paste", handleWindowPaste);
    return () => window.removeEventListener("paste", handleWindowPaste);
  }, [isOpen, selectedCategory, selectedMonth]);

  const handleDownloadTemplate = async (format = "xlsx") => {
    try {
      setDownloadingFormat(format);
      const categoryParam = selectedCategory && selectedCategory !== "all" ? `&category=${selectedCategory}` : "";
      const monthParam = selectedMonth !== "auto" ? `&month=${selectedMonth}` : "";
      const res = await fetch(`/api/renewals/import?template=true&format=${format}${categoryParam}${monthParam}`);
      if (!res.ok) throw new Error(`Failed to download ${format.toUpperCase()} template`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fileSuffix = selectedCategory && selectedCategory !== "all" ? `_${selectedCategory}` : "";
      const monthSuffix = selectedMonth !== "auto" ? `_month_${selectedMonth}` : "";
      a.download = `renewal_import_template${fileSuffix}${monthSuffix}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast(
        `Downloaded ${format.toUpperCase()} template (${TEMPLATE_CATEGORIES.find((c) => c.id === selectedCategory)?.label || "Master"}${selectedMonth !== "auto" ? ` • Month ${selectedMonth}` : ""})!`,
        "success"
      );
    } catch (err) {
      showToast(err.message || "Failed to download template", "error");
    } finally {
      setDownloadingFormat(null);
    }
  };

  const parseWorkbookData = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("Spreadsheet contains no sheets.");
      }
      const sheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rawJson.length) {
        throw new Error("No data rows found in this sheet.");
      }

      const parsed = rawJson.map((r, i) => parseRowData(r, i, selectedCategory, selectedMonth));
      setRows(parsed);
      setLoadedFileName(file.name);
      setImportError("");
      setImportSuccess(null);
      setFilterMode("all");
      showToast(`Loaded ${parsed.length} rows into Spreadsheet Studio!`, "success");
    } catch (err) {
      setImportError(err.message || "Could not parse spreadsheet file.");
      showToast(err.message || "Error reading file", "error");
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      parseWorkbookData(file);
    }
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      parseWorkbookData(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const parsedPreviewCount = useMemo(() => {
    if (!pastedRawText.trim()) return 0;
    return parseTabularText(pastedRawText, selectedCategory, selectedMonth).length;
  }, [pastedRawText, selectedCategory, selectedMonth]);

  const handleProcessPastedData = () => {
    if (!pastedRawText.trim()) {
      showToast("Please paste tabular data first.", "error");
      return;
    }
    const parsed = parseTabularText(pastedRawText, selectedCategory, selectedMonth);
    if (!parsed.length) {
      showToast("Could not recognize any valid rows. Ensure data is tab or comma delimited.", "error");
      return;
    }

    if (pasteMode === "replace") {
      setRows(parsed);
      setLoadedFileName("Pasted Data (Clipboard)");
    } else {
      setRows((prev) => [...prev, ...parsed]);
      if (!loadedFileName) setLoadedFileName("Pasted Data (Clipboard)");
    }

    setShowPasteModal(false);
    setPastedRawText("");
    setImportError("");
    setImportSuccess(null);
    showToast(`Successfully loaded ${parsed.length} row${parsed.length === 1 ? "" : "s"} into table!`, "success");
  };

  const handleCellChange = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        return { ...row, [field]: value };
      })
    );
  };

  const handleAddRow = () => {
    const newRow = createBlankRow(selectedCategory, selectedMonth);
    setRows((prev) => [newRow, ...prev]);
  };

  const handleDeleteRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearAll = () => {
    if (!rows.length) return;
    if (window.confirm("Clear all rows from this grid?")) {
      setRows([]);
      setLoadedFileName("");
      setImportSuccess(null);
      setImportError("");
    }
  };

  const handleFillBlankDatesWithTargetMonth = () => {
    if (selectedMonth === "auto") return;
    const pad = String(selectedMonth).padStart(2, "0");
    const defaultDate = `2026-${pad}-28`;
    setRows((prev) =>
      prev.map((r) => (!r.expiryDate ? { ...r, expiryDate: defaultDate } : r))
    );
    showToast(`Applied ${MONTH_SHORT_NAMES[parseInt(selectedMonth, 10)]} 2026 to blank dates!`, "success");
  };

  const handleAlignAllDatesToTargetMonth = () => {
    if (selectedMonth === "auto") return;
    const pad = String(selectedMonth).padStart(2, "0");
    const targetMonthNum = parseInt(selectedMonth, 10);
    setRows((prev) =>
      prev.map((r) => {
        if (!r.expiryDate) {
          return { ...r, expiryDate: `2026-${pad}-28` };
        }
        const parts = r.expiryDate.split("-");
        if (parts.length === 3) {
          const yr = parts[0] || "2026";
          let day = parseInt(parts[2], 10) || 28;
          const maxDays = new Date(parseInt(yr, 10), targetMonthNum, 0).getDate();
          if (day > maxDays) day = maxDays;
          const padDay = String(day).padStart(2, "0");
          return { ...r, expiryDate: `${yr}-${pad}-${padDay}` };
        }
        return { ...r, expiryDate: `2026-${pad}-28` };
      })
    );
    showToast(`Aligned all expiry dates to ${MONTH_SHORT_NAMES[targetMonthNum]}!`, "success");
  };

  // Row validation map
  const rowValidations = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      map.set(r.id, validateRow(r));
    });
    return map;
  }, [rows]);

  const readyCount = useMemo(() => {
    let count = 0;
    rowValidations.forEach((v) => {
      if (v.isValid) count++;
    });
    return count;
  }, [rowValidations]);

  const issuesCount = rows.length - readyCount;

  // Count rows with mismatched expiry month
  const mismatchedMonthCount = useMemo(() => {
    if (selectedMonth === "auto") return 0;
    const targetNum = parseInt(selectedMonth, 10);
    return rows.filter((r) => {
      if (!r.expiryDate) return false;
      const m = parseInt(r.expiryDate.split("-")[1], 10);
      return m && m !== targetNum;
    }).length;
  }, [rows, selectedMonth]);

  // Filtered rows for search & mode
  const displayedRows = useMemo(() => {
    let result = rows;

    if (filterMode === "ready") {
      result = result.filter((r) => rowValidations.get(r.id)?.isValid);
    } else if (filterMode === "issues") {
      result = result.filter((r) => !rowValidations.get(r.id)?.isValid);
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return result;

    return result.filter((r) => {
      return (
        (r.insuredName || "").toLowerCase().includes(q) ||
        (r.policyNumber || "").toLowerCase().includes(q) ||
        (r.contactNumber || "").includes(q) ||
        (r.contactPersonName || "").toLowerCase().includes(q) ||
        (r.sumInsuredDescription || "").toLowerCase().includes(q) ||
        (r.insuranceCompany || "").toLowerCase().includes(q) ||
        (r.registrationNumber || "").toLowerCase().includes(q) ||
        (r.policyType || "").toLowerCase().includes(q) ||
        (r.remark || "").toLowerCase().includes(q)
      );
    });
  }, [rows, searchQuery, filterMode, rowValidations]);

  const handleSubmitImport = async () => {
    if (!rows.length) {
      showToast("No rows to import. Upload a file or add rows first.", "error");
      return;
    }

    try {
      setImporting(true);
      setImportError("");
      setImportSuccess(null);

      const response = await fetch("/api/renewals/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: rows,
          sourceFileName: loadedFileName || "spreadsheet_studio_renewals.xlsx",
          category: selectedCategory,
          targetMonth: selectedMonth !== "auto" ? selectedMonth : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Import failed. Please check row data.");
      }

      setImportSuccess(data);
      showToast(data.message || `Successfully imported ${data.insertedCount} renewals!`, "success");

      if (onImportSuccess) {
        onImportSuccess(data, selectedMonth);
      }
    } catch (err) {
      setImportError(err.message || "Failed to import rows to database.");
      showToast(err.message || "Failed to import", "error");
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        className="tb-modal-backdrop backdrop-blur-md"
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(15, 23, 42, 0.7)",
          zIndex: 9999,
          padding: "16px",
        }}
        onClick={() => !importing && onClose()}
      >
        <div
          className="tb-modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "97vw",
            maxWidth: "1480px",
            height: "92vh",
            maxHeight: "94vh",
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 25px 60px -15px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.05)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            color: "#0f172a",
          }}
        >
          {/* Top Header Bar - Clean Enterprise Style with Brand Logo */}
          <div className="rn-studio-header">
            <div className="rn-studio-brand-group">
              <Image
                src="/brand/main-logo-wide.webp"
                alt="Bima Headquarter"
                width={124}
                height={52}
                priority
                unoptimized
                className="rn-studio-brand-logo"
              />
              <div className="rn-studio-header-divider" />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0, letterSpacing: "-0.01em" }}>
                    Renewal Import Studio
                  </h2>
                  <span className="rn-studio-badge">
                    <span className="rn-status-dot-pulse" />
                    Interactive Spreadsheet
                  </span>
                </div>
                <p style={{ fontSize: "11.5px", color: "#64748b", margin: "1px 0 0 0" }}>
                  Review, edit, and paste renewal records in real time before committing to the CRM.
                </p>
              </div>
            </div>

            {/* Header Right: Category Selector + Month Selector + Templates + Close */}
            <div className="rn-studio-controls">
              {/* Category Unified Pill */}
              <div className="rn-header-pill" title="Select line of business to optimize template and defaults">
                <span className="rn-header-pill-label">
                  <Layers size={12} style={{ color: "#2563eb" }} />
                  Category
                </span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rn-header-pill-select"
                >
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Renewal Target Month Unified Pill */}
              <div className="rn-header-pill" title="Target renewal month for data accuracy and filtering">
                <span className="rn-header-pill-label">
                  <Calendar size={12} style={{ color: "#0d9488" }} />
                  Month
                </span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rn-header-pill-select"
                >
                  {RENEWAL_MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Templates */}
              <div className="rn-template-button-group">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate("xlsx")}
                  disabled={downloadingFormat === "xlsx" || importing}
                  className="rn-template-btn"
                  title={`Download Excel template (${selectedCategory.toUpperCase()}${selectedMonth !== "auto" ? ` • Month ${selectedMonth}` : ""})`}
                >
                  <FileSpreadsheet size={13} style={{ color: "#16a34a" }} />
                  <span>{downloadingFormat === "xlsx" ? "Downloading..." : "Excel"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate("csv")}
                  disabled={downloadingFormat === "csv" || importing}
                  className="rn-template-btn"
                  title={`Download CSV template (${selectedCategory.toUpperCase()}${selectedMonth !== "auto" ? ` • Month ${selectedMonth}` : ""})`}
                >
                  <FileText size={13} style={{ color: "#475569" }} />
                  <span>{downloadingFormat === "csv" ? "Downloading..." : "CSV"}</span>
                </button>
              </div>

              <div style={{ width: "1px", height: "22px", backgroundColor: "#e2e8f0" }} />

              <button
                type="button"
                onClick={() => !importing && onClose()}
                className="rn-modal-close-btn"
                title="Close Studio"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Action Command Toolbar */}
          <div
            style={{
              padding: "8px 20px",
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            {/* Left: Upload file trigger + Paste Sheets + Active file pill + Filter tabs */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".xlsx, .xls, .csv"
                onChange={handleFileInputChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                style={toolActionBtnStyle}
                title="Browse and upload an Excel or CSV file"
              >
                <Upload size={13} style={{ color: "#2563eb" }} />
                {loadedFileName ? "Upload Different File" : "Upload File (.xlsx, .csv)"}
              </button>

              {/* Paste from Sheets / Clipboard button */}
              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                disabled={importing}
                style={{
                  ...toolActionBtnStyle,
                  borderColor: "#cbd5e1",
                  backgroundColor: "#ffffff",
                }}
                title="Paste copied rows from Google Sheets or Excel (Ctrl+V)"
              >
                <ClipboardCopy size={13} style={{ color: "#475569" }} />
                Paste from Sheets / Table
              </button>

              {loadedFileName && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 9px",
                    fontSize: "11px",
                    fontWeight: "500",
                    color: "#334155",
                    backgroundColor: "#f1f5f9",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <FileSpreadsheet size={12} style={{ color: "#2563eb" }} />
                  <span style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {loadedFileName}
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>({rows.length} rows)</span>
                </div>
              )}

              {/* Target Month quick helper */}
              {selectedMonth !== "auto" && rows.some((r) => !r.expiryDate) && (
                <button
                  type="button"
                  onClick={handleFillBlankDatesWithTargetMonth}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#2563eb",
                    backgroundColor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                  title={`Apply ${MONTH_SHORT_NAMES[parseInt(selectedMonth, 10)]} 2026 to rows missing expiry dates`}
                >
                  Set blank dates to {MONTH_SHORT_NAMES[parseInt(selectedMonth, 10)]}
                </button>
              )}

              {/* Filter Tabs */}
              {rows.length > 0 && (
                <div
                  style={{
                    display: "inline-flex",
                    backgroundColor: "#e2e8f0",
                    padding: "2px",
                    borderRadius: "7px",
                    gap: "2px",
                    marginLeft: "4px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setFilterMode("all")}
                    style={filterTabStyle(filterMode === "all")}
                  >
                    All ({rows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("ready")}
                    style={filterTabStyle(filterMode === "ready")}
                  >
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10b981", display: "inline-block" }} />
                    Ready ({readyCount})
                  </button>
                  {issuesCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterMode("issues")}
                      style={filterTabStyle(filterMode === "issues")}
                    >
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#f59e0b", display: "inline-block" }} />
                      Needs Fix ({issuesCount})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: Search + Add Row + Clear */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {rows.length > 0 && (
                <div style={{ position: "relative", width: "220px" }}>
                  <Search
                    size={13}
                    style={{
                      position: "absolute",
                      left: "9px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search in grid..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      height: "28px",
                      padding: "4px 10px 4px 26px",
                      fontSize: "12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      outline: "none",
                      backgroundColor: "#ffffff",
                      color: "#0f172a",
                      boxSizing: "border-box",
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      style={{
                        position: "absolute",
                        right: "6px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        padding: "2px",
                      }}
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddRow}
                disabled={importing}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  height: "28px",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
                }}
              >
                <Plus size={13} />
                Add Row
              </button>

              {rows.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={importing}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "5px 9px",
                    fontSize: "12px",
                    fontWeight: "500",
                    backgroundColor: "transparent",
                    color: "#64748b",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: "6px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
                  title="Clear all rows from this grid"
                >
                  <Trash2 size={13} />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Feedback alerts & Month mismatch warning */}
          {selectedMonth !== "auto" && mismatchedMonthCount > 0 && (
            <div
              style={{
                padding: "6px 20px",
                backgroundColor: "#fffbeb",
                borderBottom: "1px solid #fef3c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "11.5px",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#92400e" }}>
                <AlertTriangle size={13} style={{ color: "#d97706" }} />
                <span>
                  <strong>Notice:</strong> {mismatchedMonthCount} row{mismatchedMonthCount === 1 ? "" : "s"} have expiry dates outside <strong>{MONTH_SHORT_NAMES[parseInt(selectedMonth, 10)]}</strong>. Check highlighted pills below.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAlignAllDatesToTargetMonth}
                style={{
                  padding: "3px 9px",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#92400e",
                  backgroundColor: "#fef3c7",
                  border: "1px solid #fde68a",
                  borderRadius: "5px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                title={`Change month of ${mismatchedMonthCount} dates to ${MONTH_SHORT_NAMES[parseInt(selectedMonth, 10)]}`}
              >
                Align all to {MONTH_SHORT_NAMES[parseInt(selectedMonth, 10)]}
              </button>
            </div>
          )}

          {importError && (
            <div
              style={{
                padding: "8px 20px",
                backgroundColor: "#fff1f2",
                borderBottom: "1px solid #ffe4e6",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertTriangle size={15} style={{ color: "#e11d48" }} />
              <span style={{ fontSize: "12px", color: "#be123c", fontWeight: "500" }}>{importError}</span>
            </div>
          )}

          {importSuccess && (
            <div
              style={{
                padding: "10px 20px",
                backgroundColor: "#f0fdf4",
                borderBottom: "1px solid #bbf7d0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#15803d" }}>
                  {importSuccess.message}
                </span>
                <span style={{ fontSize: "11px", fontWeight: "600", backgroundColor: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: "6px" }}>
                  +{importSuccess.insertedCount || 0} Imported
                </span>
                <span style={{ fontSize: "11px", fontWeight: "600", backgroundColor: "#e0e7ff", color: "#4338ca", padding: "1px 6px", borderRadius: "6px" }}>
                  ↻ {importSuccess.updatedCount || 0} Updated
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "4px 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          )}

          {/* Datalist helpers for autocomplete dropdowns */}
          <datalist id="rn-companies-list">
            {KNOWN_INSURERS.map((comp) => (
              <option key={comp} value={comp} />
            ))}
          </datalist>

          <datalist id="rn-policy-types-list">
            {KNOWN_POLICY_TYPES.map((pt) => (
              <option key={pt} value={pt} />
            ))}
          </datalist>

          {/* Main Grid Viewport */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              backgroundColor: "#ffffff",
              position: "relative",
            }}
          >
            {rows.length === 0 ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                style={{
                  height: "100%",
                  minHeight: "360px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px 20px",
                }}
              >
                <div
                  style={{
                    border: "2px dashed #cbd5e1",
                    borderRadius: "14px",
                    padding: "44px 36px",
                    maxWidth: "540px",
                    width: "100%",
                    backgroundColor: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "12px",
                      backgroundColor: "#ffffff",
                      color: "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(37, 99, 235, 0.08)",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <UploadCloud size={26} />
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                    Upload or Paste Renewal Spreadsheet
                  </h3>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                    Drag & drop your Excel (.xlsx, .xls) or CSV file here, or copy cells directly from Google Sheets / Excel and paste into the grid.
                  </p>

                  <div style={{ display: "flex", gap: "10px", marginTop: "6px", flexWrap: "wrap", justifyContent: "center" }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: "8px 18px",
                        fontSize: "13px",
                        fontWeight: "600",
                        backgroundColor: "#0f172a",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 4px rgba(15, 23, 42, 0.1)",
                      }}
                    >
                      <Upload size={14} />
                      Browse Files
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPasteModal(true)}
                      style={{
                        padding: "8px 16px",
                        fontSize: "13px",
                        fontWeight: "600",
                        backgroundColor: "#ffffff",
                        color: "#1e293b",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <ClipboardCopy size={14} style={{ color: "#475569" }} />
                      Paste from Sheets
                    </button>

                    <button
                      type="button"
                      onClick={handleAddRow}
                      style={{
                        padding: "8px 14px",
                        fontSize: "13px",
                        fontWeight: "600",
                        backgroundColor: "#ffffff",
                        color: "#475569",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Plus size={14} />
                      Manual Row
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: 0,
                  fontSize: "12px",
                  backgroundColor: "#ffffff",
                  minWidth: isWarehouseOrNonMotor ? "1780px" : isMotor ? "1840px" : "2050px",
                }}
              >
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #cbd5e1",
                  }}
                >
                  {isWarehouseOrNonMotor ? (
                    <tr>
                      <th style={{ ...thStyle, width: "42px", textAlign: "center" }}>#</th>
                      <th style={{ ...thStyle, width: "105px", textAlign: "center" }}>Validation</th>
                      <th style={{ ...thStyle, width: "160px" }}>Policy Type</th>
                      <th style={{ ...thStyle, width: "145px" }}>Contact No.</th>
                      <th style={{ ...thStyle, width: "180px" }}>Contact Person Name</th>
                      <th style={{ ...thStyle, width: "190px" }}>Policy No. *</th>
                      <th style={{ ...thStyle, width: "220px" }}>Insured Name *</th>
                      <th style={{ ...thStyle, width: "220px" }}>Sum Insured Description</th>
                      <th style={{ ...thStyle, width: "125px", textAlign: "right" }}>Premium</th>
                      <th style={{ ...thStyle, width: "145px" }}>Expiry Date *</th>
                      <th style={{ ...thStyle, width: "220px" }}>Insurance Company</th>
                      <th style={{ ...thStyle, width: "115px", textAlign: "center" }}>Status</th>
                      <th style={{ ...thStyle, width: "180px" }}>Remark</th>
                      <th style={{ ...thStyle, width: "42px", textAlign: "center" }}></th>
                    </tr>
                  ) : isMotor ? (
                    <tr>
                      <th style={{ ...thStyle, width: "42px", textAlign: "center" }}>#</th>
                      <th style={{ ...thStyle, width: "105px", textAlign: "center" }}>Validation</th>
                      <th style={{ ...thStyle, width: "220px" }}>Policyholder *</th>
                      <th style={{ ...thStyle, width: "190px" }}>Policy Number *</th>
                      <th style={{ ...thStyle, width: "160px" }}>Policy Type</th>
                      <th style={{ ...thStyle, width: "180px" }}>Vehicle / Risk</th>
                      <th style={{ ...thStyle, width: "150px" }}>Make / Model</th>
                      <th style={{ ...thStyle, width: "145px" }}>Expiry Date *</th>
                      <th style={{ ...thStyle, width: "145px" }}>Renewal Mobile</th>
                      <th style={{ ...thStyle, width: "125px", textAlign: "right" }}>Gross Premium</th>
                      <th style={{ ...thStyle, width: "220px" }}>Insurance Company</th>
                      <th style={{ ...thStyle, width: "115px", textAlign: "center" }}>Status</th>
                      <th style={{ ...thStyle, width: "105px", textAlign: "right" }}>Quote</th>
                      <th style={{ ...thStyle, width: "180px" }}>Remark</th>
                      <th style={{ ...thStyle, width: "42px", textAlign: "center" }}></th>
                    </tr>
                  ) : (
                    <tr>
                      <th style={{ ...thStyle, width: "42px", textAlign: "center" }}>#</th>
                      <th style={{ ...thStyle, width: "105px", textAlign: "center" }}>Validation</th>
                      <th style={{ ...thStyle, width: "190px" }}>Policy Number *</th>
                      <th style={{ ...thStyle, width: "220px" }}>Insured Name *</th>
                      <th style={{ ...thStyle, width: "145px" }}>Contact (10-Digit)</th>
                      <th style={{ ...thStyle, width: "160px" }}>Contact Person</th>
                      <th style={{ ...thStyle, width: "220px" }}>Insurance Company</th>
                      <th style={{ ...thStyle, width: "160px" }}>Policy Type</th>
                      <th style={{ ...thStyle, width: "145px" }}>Expiry Date *</th>
                      <th style={{ ...thStyle, width: "125px", textAlign: "right" }}>Gross Premium</th>
                      <th style={{ ...thStyle, width: "190px" }}>Sum Insured Description</th>
                      <th style={{ ...thStyle, width: "140px" }}>Registration No.</th>
                      <th style={{ ...thStyle, width: "150px" }}>Make / Model</th>
                      <th style={{ ...thStyle, width: "105px", textAlign: "right" }}>Quote</th>
                      <th style={{ ...thStyle, width: "180px" }}>Remark</th>
                      <th style={{ ...thStyle, width: "115px", textAlign: "center" }}>Status</th>
                      <th style={{ ...thStyle, width: "42px", textAlign: "center" }}></th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {displayedRows.map((row, idx) => {
                    const validation = rowValidations.get(row.id) || { isValid: true, issues: [] };
                    const contactDigits = (row.contactNumber || "").replace(/\D/g, "");
                    const is10Digits = contactDigits.length === 10;

                    const rowExpiryMonth = row.expiryDate ? parseInt(row.expiryDate.split("-")[1], 10) : null;
                    const isMonthMismatch = selectedMonth !== "auto" && rowExpiryMonth && rowExpiryMonth !== parseInt(selectedMonth, 10);

                    return (
                      <tr
                        key={row.id}
                        className="rn-sheet-row"
                        style={{
                          backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fcfcfd",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        {/* Index */}
                        <td style={{ ...tdStyle, textAlign: "center", color: "#94a3b8", fontWeight: "600", fontSize: "11px" }}>
                          {idx + 1}
                        </td>

                        {/* Validation Badge */}
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          {validation.isValid ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "11px",
                                fontWeight: "600",
                                color: "#0f766e",
                                backgroundColor: "#f0fdfa",
                                border: "1px solid #ccfbf1",
                                padding: "2px 8px",
                                borderRadius: "10px",
                              }}
                            >
                              <Check size={11} />
                              Ready
                            </span>
                          ) : (
                            <span
                              title={validation.issues.join("; ")}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "11px",
                                fontWeight: "600",
                                color: "#b45309",
                                backgroundColor: "#fffbeb",
                                border: "1px solid #fef3c7",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                cursor: "help",
                              }}
                            >
                              <AlertCircle size={11} />
                              Fix
                            </span>
                          )}
                        </td>

                        {isWarehouseOrNonMotor ? (
                          <>
                            {/* Policy Type */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                list="rn-policy-types-list"
                                value={row.policyType}
                                onChange={(e) => handleCellChange(row.id, "policyType", e.target.value)}
                                placeholder="Policy Type"
                                className="rn-sheet-cell-input"
                                style={cellInputStyle}
                              />
                            </td>

                            {/* Contact No. */}
                            <td style={tdStyle}>
                              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                <input
                                  type="text"
                                  value={row.contactNumber}
                                  onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                                    handleCellChange(row.id, "contactNumber", digits);
                                  }}
                                  placeholder="10 Digits"
                                  maxLength={10}
                                  className="rn-sheet-cell-input"
                                  style={{
                                    ...cellInputStyle,
                                    paddingRight: row.contactNumber ? "42px" : "8px",
                                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                                  }}
                                />
                                {row.contactNumber && (
                                  <span
                                    style={{
                                      position: "absolute",
                                      right: "6px",
                                      fontSize: "10px",
                                      fontWeight: "700",
                                      color: is10Digits ? "#15803d" : "#b45309",
                                      backgroundColor: is10Digits ? "#dcfce7" : "#fef3c7",
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                      pointerEvents: "none",
                                    }}
                                  >
                                    {contactDigits.length}/10
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Contact Person Name */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.contactPersonName || ""}
                                onChange={(e) => handleCellChange(row.id, "contactPersonName", e.target.value)}
                                placeholder="Contact Person"
                                className="rn-sheet-cell-input"
                                style={cellInputStyle}
                              />
                            </td>

                            {/* Policy No. */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.policyNumber}
                                onChange={(e) => handleCellChange(row.id, "policyNumber", e.target.value)}
                                placeholder="Policy Number"
                                className="rn-sheet-cell-input"
                                style={{
                                  ...cellInputStyle,
                                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                  letterSpacing: "-0.01em",
                                  backgroundColor: !row.policyNumber && !row.registrationNumber ? "#fff1f2" : "transparent",
                                }}
                              />
                            </td>

                            {/* Insured Name */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.insuredName}
                                onChange={(e) => handleCellChange(row.id, "insuredName", e.target.value)}
                                placeholder="Insured / Client Name"
                                className="rn-sheet-cell-input"
                                style={{
                                  ...cellInputStyle,
                                  fontWeight: "600",
                                  color: "#0f172a",
                                  backgroundColor: !row.insuredName ? "#fff1f2" : "transparent",
                                }}
                              />
                            </td>

                            {/* Sum Insured Description */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.sumInsuredDescription || ""}
                                onChange={(e) => handleCellChange(row.id, "sumInsuredDescription", e.target.value)}
                                placeholder="e.g. Stock & Building SI: 3 Cr"
                                className="rn-sheet-cell-input"
                                style={cellInputStyle}
                              />
                            </td>

                            {/* Premium */}
                            <td style={tdStyle}>
                              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                <span style={{ position: "absolute", left: "6px", color: "#94a3b8", fontSize: "11px", pointerEvents: "none" }}>₹</span>
                                <input
                                  type="text"
                                  value={row.grossPremium}
                                  onChange={(e) => handleCellChange(row.id, "grossPremium", e.target.value)}
                                  placeholder="0"
                                  className="rn-sheet-cell-input"
                                  style={{
                                    ...cellInputStyle,
                                    paddingLeft: "16px",
                                    textAlign: "right",
                                    fontFamily: "ui-monospace, monospace",
                                  }}
                                />
                              </div>
                            </td>

                            {/* Expiry Date */}
                            <td style={tdStyle}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <input
                                  type="date"
                                  value={row.expiryDate}
                                  onChange={(e) => handleCellChange(row.id, "expiryDate", e.target.value)}
                                  className="rn-sheet-cell-input"
                                  style={{
                                    ...cellInputStyle,
                                    fontSize: "11px",
                                    fontFamily: "ui-monospace, monospace",
                                  }}
                                />
                                {isMonthMismatch && (
                                  <span
                                    title={`Expiry month (${MONTH_SHORT_NAMES[rowExpiryMonth]}) differs from target month (${MONTH_SHORT_NAMES[parseInt(selectedMonth, 10)]})`}
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: "700",
                                      color: "#b45309",
                                      backgroundColor: "#fffbeb",
                                      border: "1px solid #fef3c7",
                                      padding: "1px 4px",
                                      borderRadius: "4px",
                                      whiteSpace: "nowrap",
                                      cursor: "help",
                                    }}
                                  >
                                    {MONTH_SHORT_NAMES[rowExpiryMonth]}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Insurance Company */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                list="rn-companies-list"
                                value={row.insuranceCompany}
                                onChange={(e) => handleCellChange(row.id, "insuranceCompany", e.target.value)}
                                placeholder="Select / Type Insurer"
                                className="rn-sheet-cell-input"
                                style={cellInputStyle}
                              />
                            </td>

                            {/* Status */}
                            <td style={{ ...tdStyle, textAlign: "center" }}>
                              <select
                                value={row.status || "ACTIVE"}
                                onChange={(e) => handleCellChange(row.id, "status", e.target.value)}
                                className={`rn-status-select status-${(row.status || "active").toLowerCase()}`}
                                style={{ width: "95px" }}
                              >
                                <option value="ACTIVE">Active</option>
                                <option value="RENEWED">Renewed</option>
                                <option value="LOST">Lost</option>
                              </select>
                            </td>

                            {/* Remark */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.remark}
                                onChange={(e) => handleCellChange(row.id, "remark", e.target.value)}
                                placeholder="Remark / Risk Location"
                                className="rn-sheet-cell-input"
                                style={cellInputStyle}
                              />
                            </td>
                          </>
                        ) : isMotor ? (
                          <>
                            {/* Policyholder */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.insuredName}
                                onChange={(e) => handleCellChange(row.id, "insuredName", e.target.value)}
                                placeholder="Policyholder Name"
                                className="rn-sheet-cell-input"
                                style={{
                                  ...cellInputStyle,
                                  fontWeight: "600",
                                  color: "#0f172a",
                                  backgroundColor: !row.insuredName ? "#fff1f2" : "transparent",
                                }}
                              />
                            </td>

                            {/* Policy Number */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.policyNumber}
                                onChange={(e) => handleCellChange(row.id, "policyNumber", e.target.value)}
                                placeholder="Policy Number"
                                className="rn-sheet-cell-input"
                                style={{
                                  ...cellInputStyle,
                                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                  letterSpacing: "-0.01em",
                                  backgroundColor: !row.policyNumber && !row.registrationNumber ? "#fff1f2" : "transparent",
                                }}
                              />
                            </td>

                            {/* Policy Type */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                list="rn-policy-types-list"
                                value={row.policyType}
                                onChange={(e) => handleCellChange(row.id, "policyType", e.target.value)}
                                placeholder="Commercial / Car / 2W"
                                className="rn-sheet-cell-input"
                                style={cellInputStyle}
                              />
                            </td>

                            {/* Vehicle / Risk */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.registrationNumber}
                                onChange={(e) => handleCellChange(row.id, "registrationNumber", e.target.value.toUpperCase())}
                                placeholder="e.g. MP17HH4323"
                                className="rn-sheet-cell-input"
                                style={{
                                  ...cellInputStyle,
                                  fontFamily: "ui-monospace, monospace",
                                  textTransform: "uppercase",
                                  fontWeight: "600",
                                  color: "#334155",
                                }}
                              />
                            </td>

                            {/* Make / Model */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.makeModel}
                                onChange={(e) => handleCellChange(row.id, "makeModel", e.target.value)}
                                placeholder="Make & Model"
                                className="rn-sheet-cell-input"
                                style={cellInputStyle}
                              />
                            </td>

                            {/* Expiry Date */}
                            <td style={tdStyle}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <input
                                  type="date"
                                  value={row.expiryDate}
                                  onChange={(e) => handleCellChange(row.id, "expiryDate", e.target.value)}
                                  className="rn-sheet-cell-input"
                                  style={{
                                    ...cellInputStyle,
                                    fontSize: "11px",
                                    fontFamily: "ui-monospace, monospace",
                                  }}
                                />
                                {isMonthMismatch && (
                                  <span
                                    title={`Expiry month (${MONTH_SHORT_NAMES[rowExpiryMonth]}) differs from target month (${MONTH_SHORT_NAMES[parseInt(selectedMonth, 10)]})`}
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: "700",
                                      color: "#b45309",
                                      backgroundColor: "#fffbeb",
                                      border: "1px solid #fef3c7",
                                      padding: "1px 4px",
                                      borderRadius: "4px",
                                      whiteSpace: "nowrap",
                                      cursor: "help",
                                    }}
                                  >
                                    {MONTH_SHORT_NAMES[rowExpiryMonth]}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Renewal Mobile */}
                            <td style={tdStyle}>
                              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                <input
                                  type="text"
                                  value={row.contactNumber}
                                  onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                                    handleCellChange(row.id, "contactNumber", digits);
                                  }}
                                  placeholder="10 Digits"
                                  maxLength={10}
                                  className="rn-sheet-cell-input"
                                  style={{
                                    ...cellInputStyle,
                                    paddingRight: row.contactNumber ? "42px" : "8px",
                                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                                  }}
                                />
                                {row.contactNumber && (
                                  <span
                                    style={{
                                      position: "absolute",
                                      right: "6px",
                                      fontSize: "10px",
                                      fontWeight: "700",
                                      color: is10Digits ? "#15803d" : "#b45309",
                                      backgroundColor: is10Digits ? "#dcfce7" : "#fef3c7",
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                      pointerEvents: "none",
                                    }}
                                  >
                                    {contactDigits.length}/10
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Gross Premium */}
                            <td style={tdStyle}>
                              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                <span style={{ position: "absolute", left: "6px", color: "#94a3b8", fontSize: "11px", pointerEvents: "none" }}>₹</span>
                                <input
                                  type="text"
                                  value={row.grossPremium}
                                  onChange={(e) => handleCellChange(row.id, "grossPremium", e.target.value)}
                                  placeholder="0"
                                  className="rn-sheet-cell-input"
                                  style={{
                                    ...cellInputStyle,
                                    paddingLeft: "16px",
                                    textAlign: "right",
                                    fontFamily: "ui-monospace, monospace",
                                  }}
                                />
                              </div>
                            </td>

                            {/* Insurance Company */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                list="rn-companies-list"
                                value={row.insuranceCompany}
                                onChange={(e) => handleCellChange(row.id, "insuranceCompany", e.target.value)}
                                placeholder="Select / Type Insurer"
                                className="rn-sheet-cell-input"
                                style={cellInputStyle}
                              />
                            </td>

                            {/* Status */}
                            <td style={{ ...tdStyle, textAlign: "center" }}>
                              <select
                                value={row.status || "ACTIVE"}
                                onChange={(e) => handleCellChange(row.id, "status", e.target.value)}
                                className={`rn-status-select status-${(row.status || "active").toLowerCase()}`}
                                style={{ width: "95px" }}
                              >
                                <option value="ACTIVE">Active</option>
                                <option value="RENEWED">Renewed</option>
                                <option value="LOST">Lost</option>
                              </select>
                            </td>

                            {/* Quote */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.quote}
                                onChange={(e) => handleCellChange(row.id, "quote", e.target.value)}
                                placeholder="Quote"
                                className="rn-sheet-cell-input"
                                style={{
                                  ...cellInputStyle,
                                  textAlign: "right",
                                  fontFamily: "ui-monospace, monospace",
                                }}
                              />
                            </td>

                            {/* Remark */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.remark}
                                onChange={(e) => handleCellChange(row.id, "remark", e.target.value)}
                                placeholder="Notes..."
                                className="rn-sheet-cell-input"
                                style={cellInputStyle}
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            {/* Policy Number */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.policyNumber}
                                onChange={(e) => handleCellChange(row.id, "policyNumber", e.target.value)}
                                placeholder="e.g. 45140031250100007692"
                                className="rn-sheet-cell-input"
                                style={{
                                  ...cellInputStyle,
                                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                  letterSpacing: "-0.01em",
                                  backgroundColor: !row.policyNumber && !row.registrationNumber ? "#fff1f2" : "transparent",
                                }}
                              />
                            </td>

                            {/* Insured Name */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.insuredName}
                                onChange={(e) => handleCellChange(row.id, "insuredName", e.target.value)}
                                placeholder="Insured / Client Name"
                                className="rn-sheet-cell-input"
                                style={{
                                  ...cellInputStyle,
                                  fontWeight: "600",
                                  color: "#0f172a",
                                  backgroundColor: !row.insuredName ? "#fff1f2" : "transparent",
                                }}
                              />
                            </td>

                            {/* Contact Number */}
                            <td style={tdStyle}>
                              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                <input
                                  type="text"
                                  value={row.contactNumber}
                                  onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                                    handleCellChange(row.id, "contactNumber", digits);
                                  }}
                                  placeholder="10 Digits"
                                  maxLength={10}
                                  className="rn-sheet-cell-input"
                                  style={{
                                    ...cellInputStyle,
                                    paddingRight: row.contactNumber ? "42px" : "8px",
                                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                                  }}
                                />
                                {row.contactNumber && (
                                  <span
                                    style={{
                                      position: "absolute",
                                      right: "6px",
                                      fontSize: "10px",
                                      fontWeight: "700",
                                      color: is10Digits ? "#15803d" : "#b45309",
                                      backgroundColor: is10Digits ? "#dcfce7" : "#fef3c7",
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                      pointerEvents: "none",
                                    }}
                                  >
                                    {contactDigits.length}/10
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Contact Person */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.contactPersonName || ""}
                                onChange={(e) => handleCellChange(row.id, "contactPersonName", e.target.value)}
                                placeholder="Contact Person"
                                className="rn-sheet-cell-input"
                                style={cellInputStyle}
                              />
                            </td>

                            {/* Insurance Company */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                list="rn-companies-list"
                                value={row.insuranceCompany}
                                onChange={(e) => handleCellChange(row.id, "insuranceCompany", e.target.value)}
                                placeholder="Select / Type Insurer"
                                className="rn-sheet-cell-input"
                                style={cellInputStyle}
                              />
                            </td>

                            {/* Policy Type */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                list="rn-policy-types-list"
                                value={row.policyType}
                                onChange={(e) => handleCellChange(row.id, "policyType", e.target.value)}
                                placeholder="e.g. Commercial Vehicle"
                                className="rn-sheet-cell-input"
                                style={cellInputStyle}
                              />
                            </td>

                            {/* Expiry Date */}
                            <td style={tdStyle}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <input
                                  type="date"
                                  value={row.expiryDate}
                                  onChange={(e) => handleCellChange(row.id, "expiryDate", e.target.value)}
                                  className="rn-sheet-cell-input"
                                  style={{
                                    ...cellInputStyle,
                                    fontSize: "11px",
                                    fontFamily: "ui-monospace, monospace",
                                  }}
                                />
                                {isMonthMismatch && (
                                  <span
                                    title={`Expiry month (${MONTH_SHORT_NAMES[rowExpiryMonth]}) differs from target month (${MONTH_SHORT_NAMES[parseInt(selectedMonth, 10)]})`}
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: "700",
                                      color: "#b45309",
                                      backgroundColor: "#fffbeb",
                                      border: "1px solid #fef3c7",
                                      padding: "1px 4px",
                                      borderRadius: "4px",
                                      whiteSpace: "nowrap",
                                      cursor: "help",
                                    }}
                                  >
                                    {MONTH_SHORT_NAMES[rowExpiryMonth]}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Gross Premium */}
                            <td style={tdStyle}>
                              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                <span style={{ position: "absolute", left: "6px", color: "#94a3b8", fontSize: "11px", pointerEvents: "none" }}>₹</span>
                                <input
                                  type="text"
                                  value={row.grossPremium}
                                  onChange={(e) => handleCellChange(row.id, "grossPremium", e.target.value)}
                                  placeholder="0"
                                  className="rn-sheet-cell-input"
                                  style={{
                                    ...cellInputStyle,
                                    paddingLeft: "16px",
                                    textAlign: "right",
                                    fontFamily: "ui-monospace, monospace",
                                  }}
                                />
                              </div>
                            </td>

                            {/* Sum Insured Description */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.sumInsuredDescription || ""}
                                onChange={(e) => handleCellChange(row.id, "sumInsuredDescription", e.target.value)}
                                placeholder="Sum Insured Description"
                                className="rn-sheet-cell-input"
                                style={cellInputStyle}
                              />
                            </td>

                            {/* Registration Number */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.registrationNumber}
                                onChange={(e) => handleCellChange(row.id, "registrationNumber", e.target.value.toUpperCase())}
                                placeholder="e.g. MP17HH4323"
                                className="rn-sheet-cell-input"
                                style={{
                                  ...cellInputStyle,
                                  fontFamily: "ui-monospace, monospace",
                                  textTransform: "uppercase",
                                  fontWeight: "600",
                                  color: "#334155",
                                }}
                              />
                            </td>

                            {/* Make / Model */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.makeModel}
                                onChange={(e) => handleCellChange(row.id, "makeModel", e.target.value)}
                                placeholder="Make & Model"
                                className="rn-sheet-cell-input"
                                style={cellInputStyle}
                              />
                            </td>

                            {/* Quote */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.quote}
                                onChange={(e) => handleCellChange(row.id, "quote", e.target.value)}
                                placeholder="Quote"
                                className="rn-sheet-cell-input"
                                style={{
                                  ...cellInputStyle,
                                  textAlign: "right",
                                  fontFamily: "ui-monospace, monospace",
                                }}
                              />
                            </td>

                            {/* Remark */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                value={row.remark}
                                onChange={(e) => handleCellChange(row.id, "remark", e.target.value)}
                                placeholder="Notes..."
                                className="rn-sheet-cell-input"
                                style={cellInputStyle}
                              />
                            </td>

                            {/* Status */}
                            <td style={{ ...tdStyle, textAlign: "center" }}>
                              <select
                                value={row.status || "ACTIVE"}
                                onChange={(e) => handleCellChange(row.id, "status", e.target.value)}
                                className={`rn-status-select status-${(row.status || "active").toLowerCase()}`}
                                style={{ width: "95px" }}
                              >
                                <option value="ACTIVE">Active</option>
                                <option value="RENEWED">Renewed</option>
                                <option value="LOST">Lost</option>
                              </select>
                            </td>
                          </>
                        )}

                        {/* Delete Row */}
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            title="Remove row"
                            style={{
                              background: "none",
                              border: "none",
                              color: "#cbd5e1",
                              cursor: "pointer",
                              padding: "4px",
                              borderRadius: "4px",
                              transition: "color 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#cbd5e1")}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Modal Footer - Clean Slate Bottom Bar */}
          <div
            style={{
              padding: "12px 20px",
              backgroundColor: "#ffffff",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {rows.length === 0 ? (
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Upload a file, paste from sheets, or click "+ Add Row" to preview renewal data.
                </span>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px" }}>
                  <span style={{ color: "#334155", fontWeight: "600" }}>
                    {rows.length} total row{rows.length === 1 ? "" : "s"}
                  </span>
                  <span style={{ color: "#cbd5e1" }}>•</span>
                  <span style={{ color: "#0f766e", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={13} />
                    {readyCount} ready for database import
                  </span>
                  {issuesCount > 0 && (
                    <>
                      <span style={{ color: "#cbd5e1" }}>•</span>
                      <button
                        type="button"
                        onClick={() => setFilterMode(filterMode === "issues" ? "all" : "issues")}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#b45309",
                          cursor: "pointer",
                          textDecoration: "underline",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <AlertTriangle size={13} />
                        {issuesCount} need attention {filterMode === "issues" ? "(showing only issues)" : "(filter to view)"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => !importing && onClose()}
                style={{
                  padding: "7px 15px",
                  fontSize: "13px",
                  fontWeight: "600",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
                disabled={importing}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitImport}
                disabled={!rows.length || importing}
                style={{
                  padding: "7px 20px",
                  fontSize: "13px",
                  fontWeight: "600",
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: !rows.length || importing ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  opacity: !rows.length || importing ? 0.6 : 1,
                  boxShadow: "0 2px 6px rgba(15, 23, 42, 0.15)",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (rows.length && !importing) e.currentTarget.style.backgroundColor = "#1e293b";
                }}
                onMouseLeave={(e) => {
                  if (rows.length && !importing) e.currentTarget.style.backgroundColor = "#0f172a";
                }}
              >
                {importing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Importing {rows.length} Records...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Import {rows.length} Renewals</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Paste Modal / Drawer - Linear/Airtable Grade Styling */}
        {showPasteModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000,
              padding: "16px",
            }}
            onClick={() => setShowPasteModal(false)}
          >
            <div
              style={{
                width: "90vw",
                maxWidth: "760px",
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                border: "1px solid #cbd5e1",
                boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.35)",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "8px",
                      backgroundColor: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0f172a",
                    }}
                  >
                    <ClipboardCopy size={17} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                      Paste from Google Sheets or Excel
                    </h3>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                      Supports Tab-separated values (TSV), CSV, and copied cell selections.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Helpful Tip */}
              <div
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                  color: "#475569",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>💡</span>
                <span>Select your rows in Excel or Google Sheets, copy with <strong>Ctrl+C</strong>, then paste with <strong>Ctrl+V</strong> below. Headers will be mapped automatically.</span>
              </div>

              {/* Textarea for pasted tabular content */}
              <textarea
                autoFocus
                value={pastedRawText}
                onChange={(e) => setPastedRawText(e.target.value)}
                placeholder={pastePlaceholder}
                className="rn-paste-textarea"
              />

              {/* Live Detection Summary */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "22px" }}>
                {pastedRawText.trim() ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: parsedPreviewCount > 0 ? "#15803d" : "#b45309",
                      backgroundColor: parsedPreviewCount > 0 ? "#f0fdf4" : "#fffbeb",
                      border: `1px solid ${parsedPreviewCount > 0 ? "#bbf7d0" : "#fef3c7"}`,
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {parsedPreviewCount > 0 ? (
                      <>
                        <CheckCircle2 size={12} />
                        {parsedPreviewCount} row{parsedPreviewCount === 1 ? "" : "s"} recognized
                      </>
                    ) : (
                      <>
                        <AlertCircle size={12} />
                        No valid tabular rows detected
                      </>
                    )}
                  </span>
                ) : (
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                    Waiting for clipboard text...
                  </span>
                )}
              </div>

              {/* Paste Mode Toggle & Action Buttons (Sleek Segmented Pill, Zero Broken Radios) */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginTop: "2px" }}>
                <div className="rn-segmented-pill">
                  <button
                    type="button"
                    className={`rn-segmented-item ${pasteMode === "append" ? "active" : ""}`}
                    onClick={() => setPasteMode("append")}
                  >
                    Append ({rows.length} existing)
                  </button>
                  <button
                    type="button"
                    className={`rn-segmented-item ${pasteMode === "replace" ? "active" : ""}`}
                    onClick={() => setPasteMode("replace")}
                  >
                    Replace Entire Grid
                  </button>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasteModal(false);
                      setPastedRawText("");
                    }}
                    style={{
                      padding: "6px 14px",
                      fontSize: "12px",
                      fontWeight: "600",
                      backgroundColor: "#ffffff",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      borderRadius: "7px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleProcessPastedData}
                    disabled={!pastedRawText.trim() || parsedPreviewCount === 0}
                    style={{
                      padding: "6px 18px",
                      fontSize: "12px",
                      fontWeight: "600",
                      backgroundColor: "#0f172a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "7px",
                      cursor: !pastedRawText.trim() || parsedPreviewCount === 0 ? "not-allowed" : "pointer",
                      opacity: !pastedRawText.trim() || parsedPreviewCount === 0 ? 0.5 : 1,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.15)",
                    }}
                  >
                    <Check size={13} />
                    Load {parsedPreviewCount > 0 ? `${parsedPreviewCount} Rows ` : ""}into Grid
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  );
}

const toolActionBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "5px 12px",
  fontSize: "12px",
  fontWeight: "600",
  backgroundColor: "#ffffff",
  color: "#1e293b",
  border: "1px solid #cbd5e1",
  borderRadius: "7px",
  cursor: "pointer",
  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  transition: "all 0.15s ease",
};

const filterTabStyle = (active) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "3px 9px",
  fontSize: "11px",
  fontWeight: "600",
  borderRadius: "6px",
  border: "none",
  backgroundColor: active ? "#ffffff" : "transparent",
  color: active ? "#0f172a" : "#64748b",
  boxShadow: active ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
  cursor: "pointer",
  transition: "all 0.15s ease",
});

const thStyle = {
  padding: "8px 10px",
  textAlign: "left",
  fontSize: "11px",
  fontWeight: "700",
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #cbd5e1",
  backgroundColor: "#f8fafc",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "2px 5px",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "middle",
};

const cellInputStyle = {
  width: "100%",
  height: "28px",
  padding: "3px 6px",
  fontSize: "12px",
  lineHeight: "20px",
  border: "1px solid transparent",
  borderRadius: "4px",
  backgroundColor: "transparent",
  outline: "none",
  color: "#1e293b",
  transition: "all 0.15s ease",
  boxSizing: "border-box",
};
