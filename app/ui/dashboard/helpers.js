import { normalizeUploadStatus, UPLOAD_STATUS } from "@/lib/upload-status";

export function pageTitle(page) {
  return {
    dashboard: "Policy Dashboard",
    "bulk-entry": "AI Bulk Policy Ingestion",
    "manual-entry": "Manual Policy Entry",
    records: "Policy Records",
    customers: "Customer Management",
    analytics: "Analytics & Reports",
    "field-setup": "Field Setup",
    settings: "Settings"
  }[page];
}

export function pageSubtitle(page) {
  return {
    dashboard: "Review live policy records and upload activity.",
    "bulk-entry": "Upload multiple insurance policy PDFs for record creation and OCR workflow handoff.",
    "manual-entry": "Create or correct a policy record without uploading a PDF.",
    records: "Search, export, and manage saved policy data.",
    customers: "Browse insured parties and policy summaries.",
    analytics: "Review premium totals, insured value, and district coverage.",
    "field-setup": "See how the Prisma model maps to the intake fields.",
    settings: "Review database connectivity and current app status."
  }[page];
}

export function buildClientProfiles(records) {
  const profiles = new Map();

  records.forEach((record) => {
    const name = record.insuredName || "Unnamed insured";
    const current = profiles.get(name) || {
      name,
      policies: [],
      premiumTotal: 0,
      sumInsuredTotal: 0,
      district: record.district || "",
      tehsil: record.tehsil || "",
      contactNumber: record.contactNumber || ""
    };

    current.policies.push(record);
    current.premiumTotal += parseMoney(record.premium);
    current.sumInsuredTotal += parseMoney(record.sumInsured);
    current.district ||= record.district || "";
    current.tehsil ||= record.tehsil || "";
    current.contactNumber ||= record.contactNumber || "";
    profiles.set(name, current);
  });

  return Array.from(profiles.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function formatMoney(value) {
  const numeric = parseMoney(value);
  if (!numeric) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(numeric);
}

export function parseMoney(value) {
  if (typeof value === "number") return value;
  return Number(String(value || "").replace(/,/g, "")) || 0;
}

export function formatDate(value) {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  } catch {
    return "";
  }
}

export function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function queueLabel(status) {
  const normalized = normalizeUploadStatus(status);
  return {
    [UPLOAD_STATUS.PENDING]: "Queued",
    [UPLOAD_STATUS.PROCESSING]: "Extracting",
    [UPLOAD_STATUS.REVIEW_REQUIRED]: "Ready for review",
    [UPLOAD_STATUS.APPROVED]: "Saved",
    [UPLOAD_STATUS.FAILED]: "Failed"
  }[normalized];
}
