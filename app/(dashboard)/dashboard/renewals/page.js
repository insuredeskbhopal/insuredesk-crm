"use client";

/* global AbortController, clearTimeout */
import React, { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { 
  MessageSquare, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  X, 
  Upload, 
  Loader2, 
  AlertTriangle,
  FileText,
  Search,
  Eye,
  Printer,
  UserPlus,
  ClipboardList
} from "lucide-react";
import PageHeader from "@/app/components/layout/PageHeader";
import EmptyState from "@/app/components/shared/EmptyState";
import { cachedJson } from "@/app/lib/client-api";
import insuranceCompanyMaster from "@/lib/master/insurance-companies.cjs";

const { getInsuranceCompanyNames, normalizeInsuranceCompanyName } = insuranceCompanyMaster;
const MASTER_COMPANY_NAMES = getInsuranceCompanyNames();
const MASTER_COMPANY_SET = new Set(MASTER_COMPANY_NAMES);

function getCleanCompanyOptions(companies = []) {
  const source = Array.isArray(companies) && companies.length > 0 ? companies : MASTER_COMPANY_NAMES;
  const seen = new Set();

  return source
    .map((company) => normalizeInsuranceCompanyName(company))
    .filter((company) => MASTER_COMPANY_SET.has(company))
    .filter((company) => {
      if (seen.has(company)) return false;
      seen.add(company);
      return true;
    });
}

const PAYMENT_MODE_OPTIONS = [
  { value: "", label: "Select payment mode" },
  { value: "Cash", label: "Cash" },
  { value: "Cheque", label: "Cheque" },
  { value: "UPI", label: "UPI" },
  { value: "NEFT / RTGS", label: "NEFT / RTGS" },
  { value: "Card", label: "Card" },
  { value: "Online", label: "Online" }
];

const LOST_REASON_OPTIONS = [
  { value: "", label: "Select reason for loss" },
  { value: "Not Interested", label: "Not Interested" },
  { value: "Renewed Elsewhere", label: "Renewed Elsewhere" },
  { value: "Price Issue", label: "Price Issue" },
  { value: "Wrong Number", label: "Wrong Number" },
  { value: "Customer Not Reachable", label: "Customer Not Reachable" },
  { value: "Policy Cancelled", label: "Policy Cancelled" },
  { value: "Competitor offered lower premium", label: "Competitor offered lower premium" },
  { value: "Sold vehicle / property", label: "Sold vehicle / property" },
  { value: "Client not reachable", label: "Client not reachable" },
  { value: "Client renewed directly with insurer", label: "Client renewed directly with insurer" },
  { value: "Dissatisfied with service", label: "Dissatisfied with service" },
  { value: "Other", label: "Other (specify in remarks)" }
];

const FOLLOW_UP_STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Completed", label: "Completed" },
  { value: "Missed", label: "Missed" },
  { value: "Rescheduled", label: "Rescheduled" },
  { value: "Follow-up Scheduled", label: "Follow-up Scheduled" },
  { value: "Client Interested", label: "Client Interested" },
  { value: "Client Not Reachable", label: "Client Not Reachable" },
  { value: "Quote Shared", label: "Quote Shared" },
  { value: "Payment Pending", label: "Payment Pending" },
  { value: "Document Pending", label: "Document Pending" },
  { value: "Closed", label: "Closed" }
];

const FOLLOW_UP_MODE_OPTIONS = [
  { value: "Call", label: "Call" },
  { value: "Phone Call", label: "Phone Call" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Email", label: "Email" },
  { value: "Office Visit", label: "Office Visit" },
  { value: "Client Visit", label: "Client Visit" },
  { value: "Other", label: "Other" }
];

const FOLLOW_UP_PRIORITY_OPTIONS = [
  { value: "Normal", label: "Normal" },
  { value: "High", label: "High" },
  { value: "Urgent", label: "Urgent" },
  { value: "Low", label: "Low" }
];

const POLICY_TYPE_OPTIONS = [
  { label: "Motor", value: "Motor Policy" },
  { label: "Health", value: "Health Policy" },
  { label: "Life", value: "Life Policy" },
  { label: "Fire", value: "Fire Policy" },
  { label: "Marine", value: "Marine Policy" },
  { label: "Travel", value: "Travel Policy" },
  { label: "Commercial", value: "Commercial Policy" },
  { label: "Other", value: "Other Policy" }
];

const RENEWAL_WORKDESK_COLUMNS = [
  { key: "customer", label: "Customer Name", className: "col-insured" },
  { key: "contactNumber", label: "Mobile Number", className: "col-contact" },
  { key: "policyNumber", label: "Policy Number", className: "col-type" },
  { key: "assetDetails", label: "Vehicle / Asset", className: "col-vehicle" },
  { key: "insuranceCompany", label: "Insurance Company", className: "col-company" },
  { key: "policyType", label: "Policy Type", className: "col-type" },
  { key: "expiryDate", label: "Expiry Date", className: "col-date" },
  { key: "daysRemaining", label: "Days Left / Overdue", className: "col-duration" },
  { key: "renewalStatus", label: "Renewal Status", className: "col-status" },
  { key: "assignedTo", label: "Assigned To", className: "col-company" },
  { key: "updatedBy", label: "Updated By", className: "col-company" },
  { key: "latestRemark", label: "Latest Remark", className: "col-description" },
  { key: "nextFollowUpDate", label: "Next Follow-up", className: "col-date" },
  { key: "priority", label: "Priority", className: "col-status" },
  { key: "actions", label: "Actions", className: "col-action" }
];

const _POLICY_TYPE_TABLE_COLUMNS = {
  all: [
    { key: "customer", label: "Customer Name / Contact Person", className: "col-insured" },
    { key: "policyType", label: "Policy Type", className: "col-type" },
    { key: "insuranceCompany", label: "Insurance Company", className: "col-company" },
    { key: "contactNumber", label: "Contact Number", className: "col-contact" },
    { key: "expiryDate", label: "Expiry Date", className: "col-date" },
    { key: "daysRemaining", label: "Days Remaining", className: "col-duration" },
    { key: "renewalStatus", label: "Renewal Status", className: "col-status" },
    { key: "actions", label: "Actions", className: "col-action" }
  ],
  motor: [
    { key: "customer", label: "Customer Name", className: "col-insured" },
    { key: "vehicleNumber", label: "Vehicle Number", className: "col-vehicle" },
    { key: "contactNumber", label: "Contact Number", className: "col-contact" },
    { key: "expiryDate", label: "Expiry Date", className: "col-date" },
    { key: "daysRemaining", label: "Days Remaining", className: "col-duration" },
    { key: "renewalStatus", label: "Renewal Status", className: "col-status" },
    { key: "actions", label: "Actions", className: "col-action" }
  ],
  health: [
    { key: "customer", label: "Customer Name", className: "col-insured" },
    { key: "planName", label: "Plan Name", className: "col-description" },
    { key: "sumInsured", label: "Sum Insured", className: "col-money" },
    { key: "contactNumber", label: "Contact Number", className: "col-contact" },
    { key: "expiryDate", label: "Expiry Date", className: "col-date" },
    { key: "daysRemaining", label: "Days Remaining", className: "col-duration" },
    { key: "renewalStatus", label: "Renewal Status", className: "col-status" },
    { key: "actions", label: "Actions", className: "col-action" }
  ],
  life: [
    { key: "customer", label: "Customer Name", className: "col-insured" },
    { key: "planName", label: "Plan Name", className: "col-description" },
    { key: "sumAssured", label: "Sum Assured", className: "col-money" },
    { key: "contactNumber", label: "Contact Number", className: "col-contact" },
    { key: "expiryDate", label: "Expiry Date", className: "col-date" },
    { key: "daysRemaining", label: "Days Remaining", className: "col-duration" },
    { key: "renewalStatus", label: "Renewal Status", className: "col-status" },
    { key: "actions", label: "Actions", className: "col-action" }
  ],
  fire: [
    { key: "customer", label: "Customer Name", className: "col-insured" },
    { key: "riskLocation", label: "Risk Location", className: "col-location" },
    { key: "sumInsured", label: "Sum Insured", className: "col-money" },
    { key: "contactNumber", label: "Contact Number", className: "col-contact" },
    { key: "expiryDate", label: "Expiry Date", className: "col-date" },
    { key: "daysRemaining", label: "Days Remaining", className: "col-duration" },
    { key: "renewalStatus", label: "Renewal Status", className: "col-status" },
    { key: "actions", label: "Actions", className: "col-action" }
  ],
  marine: [
    { key: "customer", label: "Customer Name", className: "col-insured" },
    { key: "cargoDescription", label: "Cargo Description", className: "col-description" },
    { key: "sumInsured", label: "Sum Insured", className: "col-money" },
    { key: "contactNumber", label: "Contact Number", className: "col-contact" },
    { key: "expiryDate", label: "Expiry Date", className: "col-date" },
    { key: "daysRemaining", label: "Days Remaining", className: "col-duration" },
    { key: "renewalStatus", label: "Renewal Status", className: "col-status" },
    { key: "actions", label: "Actions", className: "col-action" }
  ],
  travel: [
    { key: "customer", label: "Customer Name", className: "col-insured" },
    { key: "destination", label: "Destination", className: "col-location" },
    { key: "travelPeriod", label: "Travel Period", className: "col-duration" },
    { key: "contactNumber", label: "Contact Number", className: "col-contact" },
    { key: "expiryDate", label: "Expiry Date", className: "col-date" },
    { key: "daysRemaining", label: "Days Remaining", className: "col-duration" },
    { key: "renewalStatus", label: "Renewal Status", className: "col-status" },
    { key: "actions", label: "Actions", className: "col-action" }
  ],
  commercial: [
    { key: "customer", label: "Customer Name", className: "col-insured" },
    { key: "businessName", label: "Business Name", className: "col-company" },
    { key: "sumInsured", label: "Sum Insured", className: "col-money" },
    { key: "contactNumber", label: "Contact Number", className: "col-contact" },
    { key: "expiryDate", label: "Expiry Date", className: "col-date" },
    { key: "daysRemaining", label: "Days Remaining", className: "col-duration" },
    { key: "renewalStatus", label: "Renewal Status", className: "col-status" },
    { key: "actions", label: "Actions", className: "col-action" }
  ],
  other: [
    { key: "customer", label: "Customer Name", className: "col-insured" },
    { key: "coverageName", label: "Coverage Name", className: "col-description" },
    { key: "contactNumber", label: "Contact Number", className: "col-contact" },
    { key: "expiryDate", label: "Expiry Date", className: "col-date" },
    { key: "daysRemaining", label: "Days Remaining", className: "col-duration" },
    { key: "renewalStatus", label: "Renewal Status", className: "col-status" },
    { key: "actions", label: "Actions", className: "col-action" }
  ]
};

function getPolicyTableKey(selectedPolicyType) {
  const value = String(selectedPolicyType || "").toLowerCase();
  if (!value || value === "all") return "all";
  if (value.includes("motor")) return "motor";
  if (value.includes("health")) return "health";
  if (value.includes("life")) return "life";
  if (value.includes("fire")) return "fire";
  if (value.includes("marine")) return "marine";
  if (value.includes("travel")) return "travel";
  if (value.includes("commercial")) return "commercial";
  return "other";
}

function firstPresent(...values) {
  const found = values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
  return found === undefined ? "-" : String(found);
}

function getRenewalVehicleNumber(record = {}) {
  return record.vehicleNumber || record.registrationNumber || "";
}

function isMotorRenewalPolicy(record = {}) {
  const type = String(
    record.selectedPolicyType || 
    record.displayPolicyType || 
    record.policyType || 
    record.originalPolicyType || 
    ""
  ).toLowerCase();

  // If the policy type matches known non-motor categories, it is not a motor policy
  if (/\b(fire|health|life|home|cyber|wc|gpa|marine|liability|travel|personal accident|pa)\b/i.test(type)) {
    return false;
  }

  // Check if type matches motor keywords
  if (/\b(motor|vehicle|private\s+car|two\s+wheeler|commercial\s+vehicle|goods\s+carrying|gcv|pcv|car|bike|scooter)\b/i.test(type)) {
    return true;
  }

  // Fallback to checking other fields if policyType is empty/generic, but make sure it has motor keywords or registration numbers
  const haystack = [
    record.documentCategory,
    getRenewalVehicleNumber(record),
    record.engineNumber,
    record.chassisNumber
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /\b(motor|vehicle|private\s+car|two\s+wheeler|commercial\s+vehicle|goods\s+carrying|registration|chassis|engine)\b/.test(haystack) ||
    /\b[a-z]{2}[-\s]?\d{1,2}(?:[-\s]?[a-z]{1,3})?[-\s]?\d{4}\b/.test(haystack);
}

export default function RenewalsPage() {
  const searchParams = useSearchParams();

  // Load defaults from URL search params (if clicked from dashboard counters)
  const urlTab = searchParams.get("tab") || "all";
  const urlDays = searchParams.get("days") || "";

  // Dropdown states
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("All");
  const [selectedPolicyType, setSelectedPolicyType] = useState("All");

  // Tab & search states
  const [activeTab, setActiveTab] = useState(urlTab);
  const [daysFilter, setDaysFilter] = useState(urlDays);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Policies response data
  const [policies, setPolicies] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summaryCounts, setSummaryCounts] = useState({
    total: 0,
    dueToday: 0,
    due7: 0,
    due15: 0,
    due30: 0,
    overdue: 0,
    followUpToday: 0,
    missedFollowUps: 0,
    renewed: 0,
    lost: 0,
    missingExpiry: 0,
    invalidExpiry: 0,
    todayWork: 0
  });

  const [todayWorkReport, setTodayWorkReport] = useState({
    reportDate: "",
    user: { name: "", email: "" },
    summary: { total: 0, remarks: 0, renewed: 0, lost: 0, reassigned: 0, whatsapp: 0, uniquePolicies: 0 },
    activities: []
  });
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Modals state
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [lostPolicy, setLostPolicy] = useState(null);
  const [lostReason, setLostReason] = useState("");
  const [lostRemarks, setLostRemarks] = useState("");

  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewPolicy, setRenewPolicy] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [remarkPolicy, setRemarkPolicy] = useState(null);
  const [remarkForm, setRemarkForm] = useState({
    remark: "",
    nextFollowUpDate: "",
    followUpStatus: "Follow-up Scheduled",
    followUpMode: "Phone Call",
    priority: "Normal",
    nextAction: ""
  });
  const [savingRemark, setSavingRemark] = useState(false);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignPolicy, setAssignPolicy] = useState(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [savingAssign, setSavingAssign] = useState(false);

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
              height: 54px;
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
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [pdfInfo, setPdfInfo] = useState(null);

  // Form values for renewal
  const [renewForm, setRenewForm] = useState({
    policyNumber: "",
    startDate: "",
    expiryDate: "",
    premium: "",
    sumInsured: "",
    modeOfPayment: "",
    collectedAmount: "",
    dueCollection: "",
    remark: "",
    insuredName: "",
    vehicleNumber: "",
    engineNumber: "",
    chassisNumber: ""
  });

  const [isSaving, startSaving] = useTransition();

  const [, setRenewalCounts] = useState({
    eodPremium: 0,
    eodCount: 0,
    mtdPremium: 0,
    mtdCount: 0,
    ytdPremium: 0,
    ytdCount: 0,
    due10: 0,
    due20: 0,
    due30: 0,
    expired: 0,
    expiredPremium: 0,
    renewed: 0,
    renewedPremium: 0,
    lost: 0,
    lostPremium: 0
  });

  useEffect(() => {
    async function fetchHeaderData() {
      try {
        const data = await cachedJson("/api/dashboard/header-data", { ttlMs: 5000 });
        if (data.success && data.renewalCounts) {
          setRenewalCounts(data.renewalCounts);
        }
      } catch (err) {
        console.error("Failed to fetch renewal counts:", err);
      }
    }
    fetchHeaderData();
  }, []);

  // Synchronise state with URL params changes (clicking on counters)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const daysParam = searchParams.get("days");
    if (tabParam) {
      setActiveTab(tabParam);
    }
    if (daysParam) {
      setDaysFilter(daysParam);
    } else if ((tabParam || urlTab) !== "upcoming") {
      setDaysFilter("");
    } else {
      setDaysFilter("10");
    }
  }, [searchParams]);

  // Fetch company options for the current policy type selection.
  useEffect(() => {
    fetchCompaniesList(selectedPolicyType);
  }, [selectedPolicyType]);

  const loadTeamMembers = async () => {
    setTeamLoading(true);
    setTeamError("");
    try {
      const res = await fetch("/api/renewals/team", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && Array.isArray(data.users)) {
        setTeamMembers(data.users);
        return data.users;
      }
      setTeamError(data.error || "Failed to load team members.");
      return [];
    } catch {
      setTeamError("Network error loading team members.");
      return [];
    } finally {
      setTeamLoading(false);
    }
  };

  const resolveAssigneeId = (policy, members = teamMembers) => {
    if (!policy) return "";
    if (policy.assignedToId) {
      const byId = members.find((member) => member.id === policy.assignedToId);
      if (byId) return byId.id;
    }
    const assignedText = String(policy.assignedTo || "").trim().toLowerCase();
    if (!assignedText) return "";
    const byLabel = members.find(
      (member) =>
        String(member.name || "").trim().toLowerCase() === assignedText ||
        String(member.email || "").trim().toLowerCase() === assignedText
    );
    return byLabel?.id || "";
  };

  const patchPolicyRecord = (policyId, patch) => {
    setPolicies((current) => current.map((item) => (item.id === policyId ? { ...item, ...patch } : item)));
    setSelectedRecord((current) => (current?.id === policyId ? { ...current, ...patch } : current));
  };

  // Reset page when tab, company, policyType, or search term changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedCompany, selectedPolicyType, q]);

  // Fetch policies when filters, page or tabs change
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetchPoliciesList(controller.signal);
    }, q ? 250 : 0);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedCompany, selectedPolicyType, activeTab, daysFilter, q, page]);

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const fetchCompaniesList = async (policyType = selectedPolicyType) => {
    try {
      const res = await fetch(`/api/renewals/companies?policyType=${encodeURIComponent(policyType)}`);
      const data = await res.json();
      if (res.ok) {
        const cleanCompanies = getCleanCompanyOptions(data.companies);
        setCompanies(cleanCompanies);
        if (selectedCompany !== "All" && !cleanCompanies.includes(selectedCompany)) {
          setSelectedCompany("All");
        }
      }
    } catch {
      setCompanies(MASTER_COMPANY_NAMES);
      setError("Failed to fetch companies list.");
    }
  };

  const fetchTodayWorkReport = async () => {
    setReportLoading(true);
    try {
      const res = await fetch("/api/renewals/today-work", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setTodayWorkReport({
          reportDate: data.reportDate || "",
          user: data.user || { name: "", email: "" },
          summary: data.summary || { total: 0, remarks: 0, renewed: 0, lost: 0, reassigned: 0, whatsapp: 0, uniquePolicies: 0 },
          activities: Array.isArray(data.activities) ? data.activities : []
        });
      }
    } catch {
      // Report is optional; list view still works.
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayWorkReport();
  }, []);

  const openTodayWorkReport = async () => {
    setReportModalOpen(true);
    await fetchTodayWorkReport();
  };

  const handlePrintTodayReport = () => {
    const rows = todayWorkReport.activities || [];
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToastMsg("Please allow popups to print the report.");
      return;
    }

    const userLabel = todayWorkReport.user?.name || todayWorkReport.user?.email || "User";
    const summary = todayWorkReport.summary || {};

    printWindow.document.write(`
      <html>
        <head>
          <title>Renewal Today's Work - ${userLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 20px; }
            h1 { margin: 0 0 4px; font-size: 20px; }
            p { margin: 0 0 16px; color: #64748b; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Renewal Today's Work Report</h1>
          <p>${userLabel} · ${todayWorkReport.reportDate || new Date().toLocaleDateString("en-IN")} · ${summary.total || 0} activities · ${summary.uniquePolicies || 0} policies touched</p>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Customer</th>
                <th>Policy No.</th>
                <th>Mobile</th>
                <th>Company</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map((row) => `
                <tr>
                  <td>${formatDateTime(row.time)}</td>
                  <td>${row.actionLabel || row.action || "-"}</td>
                  <td>${row.customerName || "-"}</td>
                  <td>${row.policyNumber || "-"}</td>
                  <td>${row.mobile || "-"}</td>
                  <td>${row.company || "-"}</td>
                  <td>${row.detail || "-"}</td>
                </tr>
              `).join("") : `<tr><td colspan="7">No renewal activity recorded today.</td></tr>`}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const fetchPoliciesList = async (signal) => {
    setLoading(true);
    setError("");
    try {
      let url = `/api/renewals/policies?company=${encodeURIComponent(selectedCompany)}&policyType=${encodeURIComponent(selectedPolicyType)}&tab=${activeTab}&q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`;
      if (daysFilter) {
        url += `&days=${daysFilter}`;
      }
      const res = await fetch(url, { signal });
      const data = await res.json();
      if (res.ok) {
        setPolicies(data.policies || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.pages || 1);
        if (data.summaryCounts) setSummaryCounts(data.summaryCounts);
      } else {
        setError(data.error || "Failed to load policies.");
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      setError("Network error loading policies.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const handleStatusChange = (value) => {
    setActiveTab(value);
    setDaysFilter(value === "upcoming" ? "10" : "");
    setPage(1);
  };

  const clearRenewalFilters = () => {
    setSelectedPolicyType("All");
    setSelectedCompany("All");
    setActiveTab("all");
    setDaysFilter("");
    setQ("");
    setPage(1);
  };

  const handleWhatsApp = async (policy) => {
    if (!policy.contactNumber || !policy.contactNumber.trim()) {
      showToastMsg("WhatsApp reminder failed: No contact number exists for this customer.");
      return;
    }
    try {
      const res = await fetch("/api/renewals/whatsapp-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyId: policy.id })
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, "_blank");
        showToastMsg("WhatsApp reminder link generated.");
        fetchTodayWorkReport();
      } else {
        showToastMsg(data.error || "Failed to generate WhatsApp reminder.");
      }
    } catch {
      showToastMsg("Network error generating WhatsApp link.");
    }
  };

  const handleMarkLost = (policy) => {
    setLostPolicy(policy);
    setLostReason("");
    setLostRemarks("");
    setLostModalOpen(true);
  };

  const handleAddRemark = (policy) => {
    setRemarkPolicy(policy);
    setRemarkForm({
      remark: "",
      nextFollowUpDate: policy.nextFollowUpDate || "",
      followUpStatus: policy.followUpStatus || "Pending",
      followUpMode: policy.followUpMode || "Call",
      priority: policy.priority || "Normal",
      nextAction: policy.nextAction || ""
    });
    setRemarkModalOpen(true);
  };

  const handleFollowUpLater = (policy) => {
    handleAddRemark(policy);
    setRemarkForm((current) => ({
      ...current,
      followUpStatus: "Pending",
      nextAction: "Follow up later"
    }));
  };

  const handleReassign = async (policy) => {
    if (!policy?.id) return;
    setAssignPolicy(policy);
    setAssignNote("");
    setAssignModalOpen(true);
    const members = teamMembers.length ? teamMembers : await loadTeamMembers();
    setAssignUserId(resolveAssigneeId(policy, members));
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setAssignPolicy(null);
    setAssignUserId("");
    setAssignNote("");
    setTeamError("");
  };

  const isSameAssigneeSelection = () => {
    if (!assignPolicy || !assignUserId) return false;
    if (assignPolicy.assignedToId && assignUserId === assignPolicy.assignedToId) return true;
    const selected = teamMembers.find((member) => member.id === assignUserId);
    const assignedText = String(assignPolicy.assignedTo || "").trim().toLowerCase();
    if (!selected || !assignedText) return false;
    return (
      String(selected.name || "").trim().toLowerCase() === assignedText ||
      String(selected.email || "").trim().toLowerCase() === assignedText
    );
  };

  const submitReassign = async () => {
    if (!assignPolicy?.id) return;
    if (!assignUserId) {
      showToastMsg("Please select a user to assign.");
      return;
    }
    if (isSameAssigneeSelection()) {
      showToastMsg("This policy is already assigned to the selected user.");
      return;
    }
    setSavingAssign(true);
    try {
      const res = await fetch("/api/renewals/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: assignPolicy.id,
          assignedToUserId: assignUserId,
          note: assignNote.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToastMsg(data.error || "Failed to reassign policy.");
        return;
      }
      const nextRecord = {
        ...assignPolicy,
        assignedTo: data.assignedTo,
        assignedToId: data.assignedToId,
        assignedDate: data.assignedDate,
        updatedBy: data.updatedBy || assignPolicy.updatedBy,
        updatedAt: data.updatedAt || assignPolicy.updatedAt,
        latestRemark: data.latestRemark || data.remark?.text,
        latestRemarkBy: data.latestRemarkBy || data.updatedBy,
        latestRemarkAt: data.latestRemarkAt || data.assignedDate,
        renewalRemarks: [data.remark, ...(Array.isArray(assignPolicy.renewalRemarks) ? assignPolicy.renewalRemarks : [])]
      };
      patchPolicyRecord(assignPolicy.id, nextRecord);
      closeAssignModal();
      fetchTodayWorkReport();
      showToastMsg(`Assigned to ${data.assignedTo}.`);
    } catch {
      showToastMsg("Network error reassigning policy.");
    } finally {
      setSavingAssign(false);
    }
  };

  const submitQuickRemark = async (policy, remark, extra = {}) => {
    if (!policy?.id) return;
    try {
      const res = await fetch("/api/renewals/remarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: policy.id,
          remark,
          followUpStatus: extra.followUpStatus || "Completed",
          followUpMode: extra.followUpMode || "Phone Call",
          priority: extra.priority || policy.priority || "Normal",
          nextAction: extra.nextAction || ""
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToastMsg(data.error || "Failed to save quick update.");
        return;
      }
      const nextRecord = {
        ...policy,
        latestRemark: data.remark?.text || remark,
        latestRemarkBy: data.remark?.createdBy || policy.latestRemarkBy,
        latestRemarkAt: data.remark?.createdAt || policy.latestRemarkAt,
        renewalFollowUp: data.followUp,
        renewalRemarks: [data.remark, ...(Array.isArray(policy.renewalRemarks) ? policy.renewalRemarks : [])]
      };
      patchPolicyRecord(policy.id, nextRecord);
      fetchTodayWorkReport();
      showToastMsg("Renewal updated.");
    } catch {
      showToastMsg("Network error saving quick update.");
    }
  };

  const submitQuickLostStatus = async (policy, reason) => {
    if (!policy?.id) return;
    try {
      const res = await fetch("/api/renewals/lost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: policy.id,
          lostReason: reason,
          remarks: reason
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToastMsg(data.error || "Failed to update renewal status.");
        return;
      }
        showToastMsg(`Marked as ${reason}.`);
        fetchPoliciesList();
        fetchTodayWorkReport();
    } catch {
      showToastMsg("Network error updating renewal status.");
    }
  };

  const submitRemark = async () => {
    const remark = remarkForm.remark.trim();
    if (!remarkPolicy || !remark) {
      showToastMsg("Please enter a remark.");
      return;
    }
    setSavingRemark(true);
    try {
      const res = await fetch("/api/renewals/remarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: remarkPolicy.id,
          remark,
          nextFollowUpDate: remarkForm.nextFollowUpDate,
          followUpStatus: remarkForm.followUpStatus,
          followUpMode: remarkForm.followUpMode,
          priority: remarkForm.priority,
          nextAction: remarkForm.nextAction
        })
      });
      const data = await res.json();
      if (res.ok) {
        const nextRecord = {
          ...remarkPolicy,
          remark,
          latestRemark: data.remark?.text || remark,
          latestRemarkBy: data.remark?.createdBy || remarkPolicy.latestRemarkBy,
          latestRemarkAt: data.remark?.createdAt || remarkPolicy.latestRemarkAt,
          nextFollowUpDate: data.followUp?.nextFollowUpDate || remarkForm.nextFollowUpDate,
          followUpStatus: data.followUp?.followUpStatus || remarkForm.followUpStatus,
          followUpMode: data.followUp?.followUpMode || remarkForm.followUpMode,
          priority: data.followUp?.priority || remarkForm.priority,
          nextAction: data.followUp?.nextAction || remarkForm.nextAction,
          renewalFollowUp: data.followUp,
          renewalRemarks: [data.remark, ...(Array.isArray(remarkPolicy.renewalRemarks) ? remarkPolicy.renewalRemarks : [])]
        };
        patchPolicyRecord(remarkPolicy.id, nextRecord);
        fetchTodayWorkReport();
        setRemarkModalOpen(false);
        setRemarkPolicy(null);
        setRemarkForm({
          remark: "",
          nextFollowUpDate: "",
          followUpStatus: "Follow-up Scheduled",
          followUpMode: "Phone Call",
          priority: "Normal",
          nextAction: ""
        });
        showToastMsg("Remark saved.");
      } else {
        showToastMsg(data.error || "Failed to save remark.");
      }
    } catch {
      showToastMsg("Network error saving remark.");
    } finally {
      setSavingRemark(false);
    }
  };

  const submitMarkLost = async () => {
    if (!lostPolicy) return;
    if (!lostReason) {
      showToastMsg("Please select a reason for marking as lost.");
      return;
    }
    try {
      const res = await fetch("/api/renewals/lost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          policyId: lostPolicy.id, 
          lostReason, 
          remarks: lostRemarks 
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToastMsg("Policy marked as Lost.");
        setLostModalOpen(false);
        fetchPoliciesList();
        fetchTodayWorkReport();
      } else {
        showToastMsg(data.error || "Failed to mark policy as lost.");
      }
    } catch {
      showToastMsg("Network error marking policy as lost.");
    }
  };

  const handleRenew = (policy) => {
    setRenewPolicy(policy);
    setPdfUploaded(false);
    setPdfInfo(null);
    setRenewForm({
      policyNumber: "",
      startDate: "",
      expiryDate: "",
      premium: "",
      sumInsured: "",
      modeOfPayment: "",
      collectedAmount: "",
      dueCollection: "",
      remark: "",
      insuredName: policy.insuredName || "",
      vehicleNumber: policy.vehicleNumber || "",
      engineNumber: policy.engineNumber || "",
      chassisNumber: policy.chassisNumber || ""
    });
    setRenewModalOpen(true);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExtractingPdf(true);
    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/renewals/extract-pdf", {
        method: "POST",
        body
      });
      const data = await res.json();

      if (res.ok) {
        showToastMsg("PDF uploaded and parsed successfully.");
        setPdfInfo({
          storageResult: data.storageResult,
          rawText: data.rawText,
          fileName: data.fileName,
          fileType: data.fileType,
          fileSize: data.fileSize
        });
        setPdfUploaded(true);

        // Overlay values from PDF extraction
        const ext = data.extractedData || {};
        setRenewForm((prev) => ({
          ...prev,
          policyNumber: ext.policyNumber || prev.policyNumber,
          startDate: ext.startDate || prev.startDate,
          expiryDate: ext.expiryDate || prev.expiryDate,
          premium: ext.premium || prev.premium,
          sumInsured: ext.sumInsured || prev.sumInsured,
          insuredName: ext.insuredName || prev.insuredName,
          vehicleNumber: ext.vehicleNumber || prev.vehicleNumber,
          engineNumber: ext.engineNumber || prev.engineNumber,
          chassisNumber: ext.chassisNumber || prev.chassisNumber
        }));
      } else {
        showToastMsg(data.error || "PDF extraction failed. Please try again.");
      }
    } catch {
      showToastMsg("Network error parsing PDF.");
    } finally {
      setExtractingPdf(false);
    }
  };

  const submitRenewal = async () => {
    if (!renewPolicy) return;
    
    // Form validations
    if (!renewForm.policyNumber) {
      showToastMsg("New Policy Number is required.");
      return;
    }
    if (!renewForm.startDate || !renewForm.expiryDate) {
      showToastMsg("Start Date and Expiry Date are required.");
      return;
    }
    
    const start = new Date(renewForm.startDate);
    const expiry = new Date(renewForm.expiryDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(expiry.getTime())) {
      showToastMsg("Start Date and Expiry Date must be valid dates.");
      return;
    }
    if (expiry <= start) {
      showToastMsg("Expiry Date must be after Start Date.");
      return;
    }
    
    if (!renewForm.premium) {
      showToastMsg("Premium is required.");
      return;
    }

    startSaving(async () => {
      try {
        const mergedPayload = {
          ...renewPolicy,
          ...renewForm,
          sourceFile: pdfInfo?.fileName || "Manual Renewal",
          status: "saved"
        };

        const res = await fetch("/api/renewals/renew", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previousPolicyId: renewPolicy.id,
            renewedData: mergedPayload,
            pdfInfo
          })
        });
        const data = await res.json();

        if (res.ok) {
          showToastMsg("Policy successfully renewed!");
          setRenewModalOpen(false);
          fetchPoliciesList();
          fetchTodayWorkReport();
        } else {
          showToastMsg(data.error || "Failed to renew policy.");
        }
      } catch {
        showToastMsg("Network error renewing policy.");
      }
    });
  };

  const getDaysRemainingText = (record = {}) => {
    if (record.daysStatus) return record.daysStatus;
    const expiryDateStr = record.expiryDate;
    if (record.expiryState === "missing" || !String(expiryDateStr || "").trim()) {
      return "Missing Expiry Date";
    }
    if (record.expiryState === "invalid") return "Invalid Expiry Date";

    let expiry = null;
    const text = String(expiryDateStr).trim();
    const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (match) {
      const [, day, month, year] = match;
      const fullYear = year.length === 2 ? `20${year}` : year;
      expiry = new Date(Number(fullYear), Number(month) - 1, Number(day));
    } else {
      expiry = new Date(text);
    }

    if (Number.isNaN(expiry.getTime())) return "Invalid Expiry Date";

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfExpiry = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
    const diffDays = Math.ceil((startOfExpiry.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Overdue ${Math.abs(diffDays)} Day${Math.abs(diffDays) === 1 ? "" : "s"}`;
    }
    if (diffDays === 0) return "Due Today";
    if (diffDays <= 7) return `Due Soon (${diffDays} Day${diffDays === 1 ? "" : "s"})`;
    return `${diffDays} Day${diffDays === 1 ? "" : "s"} Left`;
  };

  const activeTableKey = getPolicyTableKey(selectedPolicyType);
  const tableColumns = RENEWAL_WORKDESK_COLUMNS;

  const getExpiryDisplay = (record) => {
    if (record.expiryState === "missing" || !String(record.expiryDate || "").trim()) return "Missing Expiry Date";
    if (record.expiryState === "invalid") return "Invalid Date";
    return firstPresent(record.expiryDate);
  };

  const renderCustomerCell = (record, showContactPerson = true) => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <strong className="record-primary">{record.insuredName?.trim() ? record.insuredName : "-"}</strong>
      {showContactPerson && record.contactPerson && record.contactPerson !== record.insuredName && (
        <small style={{ color: "var(--text-secondary)", fontSize: "11px" }}>Contact Person: {record.contactPerson}</small>
      )}
    </div>
  );

  const renderStatusBadge = (record) => (
    <span style={{
      padding: "4px 8px",
      borderRadius: "12px",
      fontSize: "11px",
      fontWeight: "600",
      backgroundColor: /LOST|NOT_INTERESTED|WRONG_NUMBER|RENEWED_ELSEWHERE/.test(record.renewalStatus || "") ? "rgba(220,38,38,0.1)" : record.renewalStatus === "RENEWED" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
      color: /LOST|NOT_INTERESTED|WRONG_NUMBER|RENEWED_ELSEWHERE/.test(record.renewalStatus || "") ? "#dc2626" : record.renewalStatus === "RENEWED" ? "#10b981" : "#f59e0b"
    }}>
      {record.renewalStatus || "ACTIVE"}
    </span>
  );

  const renderActionMenu = (record) => (
    <div className="renewal-row-actions">
      <button
        type="button"
        onClick={() => setSelectedRecord(record)}
        className="renewal-action-trigger"
        aria-label="Open renewal actions"
        title="Actions"
      >
        <span aria-hidden="true">...</span>
      </button>
      <div className="renewal-action-menu" role="menu" aria-label="Renewal actions">
        <button type="button" onClick={() => setSelectedRecord(record)} role="menuitem">
          <Eye size={14} /> View
        </button>
        {record.contactNumber ? (
          <button type="button" onClick={() => handleWhatsApp(record)} role="menuitem">
            <MessageSquare size={14} /> WhatsApp
          </button>
        ) : null}
        <button type="button" onClick={() => handleAddRemark(record)} role="menuitem">
          <FileText size={14} /> Add Remark
        </button>
        <button type="button" onClick={() => handleReassign(record)} role="menuitem">
          <UserPlus size={14} /> Reassign User
        </button>
        {record.renewalStatus === "ACTIVE" ? (
          <>
            <button type="button" onClick={() => submitQuickRemark(record, "Call completed.", { followUpStatus: "Completed" })} role="menuitem">
              <CheckCircle size={14} /> Call Done
            </button>
            <button type="button" onClick={() => handleFollowUpLater(record)} role="menuitem">
              <RefreshCw size={14} /> Follow-up Later
            </button>
            <button type="button" onClick={() => handleRenew(record)} role="menuitem">
              <RefreshCw size={14} /> Renew
            </button>
            <button type="button" onClick={() => handleMarkLost(record)} className="danger" role="menuitem">
              <Trash2 size={14} /> Lost
            </button>
            <button type="button" onClick={() => submitQuickLostStatus(record, "Not Interested")} className="danger" role="menuitem">
              <Trash2 size={14} /> Not Interested
            </button>
            <button type="button" onClick={() => submitQuickLostStatus(record, "Wrong Number")} className="danger" role="menuitem">
              <Trash2 size={14} /> Wrong Number
            </button>
            <button type="button" onClick={() => submitQuickLostStatus(record, "Renewed Elsewhere")} className="danger" role="menuitem">
              <Trash2 size={14} /> Renewed Elsewhere
            </button>
          </>
        ) : (
          <button type="button" disabled role="menuitem">
            Closed
          </button>
        )}
      </div>
    </div>
  );

  const renderRenewalCell = (record, column) => {
    const daysText = getDaysRemainingText(record);
    const isOverdue = String(daysText).startsWith("Overdue");
    const isDueToday = daysText === "Due Today";

    if (column.key === "customer") {
      return renderCustomerCell(record, activeTableKey === "all");
    }
    if (column.key === "policyNumber") return <span className="record-code">{firstPresent(record.policyNumber)}</span>;
    if (column.key === "assetDetails") return firstPresent(getRenewalVehicleNumber(record), record.makeModel, record.riskLocation, record.description);
    if (column.key === "policyType") return firstPresent(record.displayPolicyType, record.policyType);
    if (column.key === "insuranceCompany") return firstPresent(record.insuranceCompany);
    if (column.key === "vehicleNumber") return <span className="record-code">{firstPresent(getRenewalVehicleNumber(record))}</span>;
    if (column.key === "contactNumber") return <span className="record-code">{firstPresent(record.contactNumber)}</span>;
    if (column.key === "expiryDate") return getExpiryDisplay(record);
    if (column.key === "daysRemaining") {
      return (
        <span style={{
          color: isOverdue ? "#dc2626" : isDueToday ? "#f59e0b" : "var(--text-primary)",
          fontWeight: (isOverdue || isDueToday) ? "600" : "normal"
        }}>
          {daysText}
        </span>
      );
    }
    if (column.key === "renewalStatus") return renderStatusBadge(record);
    if (column.key === "assignedTo") return firstPresent(record.assignedTo);
    if (column.key === "updatedBy") return firstPresent(record.updatedBy, record.latestRemarkBy, record.createdBy);
    if (column.key === "latestRemark") {
      const value = firstPresent(record.latestRemark, record.remark);
      return <span title={value === "-" ? "" : value}>{value.length > 70 ? `${value.slice(0, 70)}...` : value}</span>;
    }
    if (column.key === "nextFollowUpDate") return firstPresent(record.nextFollowUpDate);
    if (column.key === "priority") return firstPresent(record.priority);
    if (column.key === "actions") return renderActionMenu(record);
    if (column.key === "planName") return firstPresent(record.planName, record.policyCoverType, record.description, record.displayPolicyType, record.policyType);
    if (column.key === "sumInsured") return firstPresent(record.sumInsured);
    if (column.key === "sumAssured") return firstPresent(record.sumAssured, record.sumInsured);
    if (column.key === "riskLocation") return firstPresent(record.riskLocation, record.description);
    if (column.key === "cargoDescription") return firstPresent(record.cargoDescription, record.description, record.policyCoverType);
    if (column.key === "destination") return firstPresent(record.destination, record.validIn, record.description);
    if (column.key === "travelPeriod") return firstPresent(record.travelPeriod, record.duration, record.startDate && record.expiryDate ? `${record.startDate} - ${record.expiryDate}` : "");
    if (column.key === "businessName") return firstPresent(record.businessName, record.groupName, record.insuredName);
    if (column.key === "coverageName") return firstPresent(record.coverageName, record.policyCoverType, record.description, record.displayPolicyType, record.policyType);
    return "-";
  };

  return (
    <>
      <PageHeader 
        title="Policy Renewals" 
        subtitle="Manage upcoming renewals, send WhatsApp notices, record lost business, or upload new policies to renew."
        showRecordSaveActions={false}
      />

      {/* Renewal Counters Grid */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "16px",
        marginBottom: "20px"
      }}>
        {[
          { label: "Total Renewals", value: summaryCounts.total, color: "var(--accent)", tab: "all", days: "" },
          { label: "Due Today", value: summaryCounts.dueToday, color: "#f59e0b", tab: "due_today", days: "" },
          { label: "Due in 7 Days", value: summaryCounts.due7, color: "#d97706", tab: "due_7", days: "" },
          { label: "Due in 15 Days", value: summaryCounts.due15, color: "#d97706", tab: "due_15", days: "" },
          { label: "Due in 30 Days", value: summaryCounts.due30, color: "var(--accent)", tab: "due_30", days: "" },
          { label: "Overdue", value: summaryCounts.overdue, color: "#dc2626", tab: "overdue", days: "" },
          { label: "Today's Work", value: summaryCounts.todayWork, color: "#0f766e", tab: "today_work", days: "", onClickExtra: openTodayWorkReport },
          { label: "Follow-up Today", value: summaryCounts.followUpToday, color: "#2563eb", tab: "followup_today", days: "" },
          { label: "Missed Follow-ups", value: summaryCounts.missedFollowUps, color: "#dc2626", tab: "missed_followup", days: "" },
          { label: "Renewed", value: summaryCounts.renewed, color: "#10b981", tab: "renewed", days: "" },
          { label: "Lost / Not Interested", value: summaryCounts.lost, color: "#6b7280", tab: "lost", days: "" },
          { label: "Missing Expiry Date", value: summaryCounts.missingExpiry + summaryCounts.invalidExpiry, color: "#7c3aed", tab: "bad_expiry", days: "" }
        ].map((item) => (
          <article
            key={item.label}
            onClick={() => {
              setActiveTab(item.tab);
              if (item.days) {
                setDaysFilter(item.days);
              } else {
                setDaysFilter("");
              }
              setPage(1);
            }}
            style={{
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              cursor: "pointer",
              transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
              position: "relative",
              overflow: "hidden",
              boxShadow: "var(--shadow-soft)"
            }}
            className="customer-card clickable-card"
          >
            <div style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "6px",
              backgroundColor: item.color
            }} />
            <strong style={{
              display: "block",
              fontSize: "28px",
              fontWeight: "800",
              color: item.color,
              marginBottom: "4px"
            }}>{item.value}</strong>
            <p style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: "700",
              color: "var(--text-primary)"
            }}>{item.label}</p>
            {item.onClickExtra ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  item.onClickExtra();
                }}
                style={{
                  marginTop: "10px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid #99f6e4",
                  background: "rgba(15, 118, 110, 0.08)",
                  color: "#0f766e",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                View Report
              </button>
            ) : null}
          </article>
        ))}
      </section>

      {error ? (
        <section className="glass-panel" style={{ padding: "16px", borderColor: "#dc2626", color: "#dc2626", background: "rgba(220, 38, 38, 0.05)", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        </section>
      ) : null}

      {/* Policy Type and Company Selection */}
      <section className="glass-panel renewal-selection-panel">
        <div className="renewal-policy-row">
          <span>Policy Type</span>
          <div className="renewal-type-tabs" aria-label="Policy type filters">
            {POLICY_TYPE_OPTIONS.map((type) => (
              <button
                key={type.value}
                type="button"
                className={selectedPolicyType === type.value ? "active" : ""}
                onClick={() => {
                  setSelectedPolicyType(selectedPolicyType === type.value ? "All" : type.value);
                  setSelectedCompany("All");
                  setPage(1);
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="renewal-filter-row">
          <label>
            <span>Insurance Company</span>
            <select
              value={selectedCompany}
              onChange={(event) => {
                setSelectedCompany(event.target.value);
                setPage(1);
              }}
            >
              <option value="All">Select Company</option>
              {companies.map((company) => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Status</span>
            <select
              value={activeTab}
              onChange={(event) => handleStatusChange(event.target.value)}
            >
              <option value="all">All Status</option>
              <option value="due_today">Due Today</option>
              <option value="today_work">Today&apos;s Work</option>
              <option value="upcoming">Due Soon</option>
              <option value="due_7">Due in 7 Days</option>
              <option value="due_15">Due in 15 Days</option>
              <option value="due_30">Due in 30 Days</option>
              <option value="overdue">Overdue</option>
              <option value="bad_expiry">Missing / Invalid Expiry</option>
              <option value="missing_expiry">Missing Expiry</option>
              <option value="invalid_expiry">Invalid Expiry</option>
              <option value="followup_today">Follow-up Today</option>
              <option value="missed_followup">Missed Follow-up</option>
              <option value="renewed">Renewed Policies</option>
              <option value="lost">Lost Policies</option>
              <option value="assigned_to_me">Assigned To Me</option>
              <option value="updated_by_me">Updated By Me</option>
              <option value="created_by_me">Created By Me</option>
              <option value="priority_high">Priority High</option>
              <option value="priority_medium">Priority Medium</option>
              <option value="priority_low">Priority Low</option>
            </select>
          </label>

          <div className="search-box renewal-search-box">
            <Search size={18} style={{ color: "var(--outline)", marginLeft: "12px", marginRight: "8px" }} />
            <input
              type="text"
              value={q}
              placeholder="Search name, mobile, policy no., vehicle, company, assigned user..."
              onChange={(event) => setQ(event.target.value)}
            />
          </div>

          <button className="renewal-clear-btn" type="button" onClick={clearRenewalFilters}>
            Clear Filters
          </button>

          <button
            className="renewal-clear-btn renewal-report-btn"
            type="button"
            onClick={openTodayWorkReport}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <ClipboardList size={16} />
            Today&apos;s Report
          </button>
        </div>
      </section>

      {/* Main Content Pane */}
      <section className="glass-panel table-panel" style={{ padding: "24px" }}>
        
        {/* Navigation Tabs */}
        <div className="record-view-tabs" style={{ marginBottom: "20px" }} aria-label="Renewal list views">
          {[
            { key: "all", label: "All Policies" },
            { key: "upcoming", label: "Upcoming (10 Days)" },
            { key: "due_today", label: "Due Today" },
            { key: "today_work", label: "Today's Work" },
            { key: "overdue", label: "Overdue" },
            { key: "followup_today", label: "Follow-up Today" },
            { key: "missed_followup", label: "Missed Follow-up" },
            { key: "renewed", label: "Renewed Policies" },
            { key: "lost", label: "Lost Policies" }
          ].map((tab) => (
            <button
              key={tab.key}
              className={activeTab === tab.key ? "active" : ""}
              type="button"
              onClick={() => {
                handleStatusChange(tab.key);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="skeleton-panel" style={{ padding: "12px" }}>
            <div className="skeleton table-head-line" style={{ marginBottom: "12px" }} />
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton table-row-line" style={{ marginBottom: "8px" }} />
            ))}
          </div>
        ) : policies.length ? (
          <>
            <div className="table-wrap">
              <table className="records-table renewal-policy-table">
                <colgroup>
                  {tableColumns.map((column) => (
                    <col key={column.key} className={column.className} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {tableColumns.map((column) => (
                      <th
                        key={column.key}
                        className={column.className}
                        style={column.key === "actions" ? { textAlign: "right" } : undefined}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p) => (
                    <tr key={p.id}>
                      {tableColumns.map((column) => (
                        <td
                          key={column.key}
                          className={`${column.className || ""}${column.key === "actions" ? " renewal-action-cell" : ""}`}
                        >
                          {renderRenewalCell(p, column)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="table-pagination" style={{ marginTop: "20px" }}>
                <span>Showing {page} of {totalPages} pages ({totalCount} policies found)</span>
                <div className="table-page-list">
                  <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    Prev
                  </button>
                  {getPageNumbers(page, totalPages).map((pNum, index) => (
                    pNum === "..." ? (
                      <span
                        key={`ellipsis-${index}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: "34px",
                          minHeight: "32px",
                          color: "var(--text-secondary, #64748b)",
                          fontSize: "14px",
                          fontWeight: "700",
                          userSelect: "none"
                        }}
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={pNum}
                        type="button"
                        className={page === pNum ? "active" : ""}
                        onClick={() => setPage(pNum)}
                      >
                        {pNum}
                      </button>
                    )
                  ))}
                  <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState>No policies found matching filters.</EmptyState>
        )}
      </section>

      {/* MODAL: Today's Work Report */}
      {typeof window !== "undefined" && reportModalOpen && createPortal(
        <div className="tb-modal-backdrop renewal-assign-backdrop" onClick={() => setReportModalOpen(false)}>
          <div className="tb-modal-card renewal-assign-modal renewal-today-report-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="renewal-remark-header">
              <div className="renewal-remark-title">
                <span className="renewal-remark-icon"><ClipboardList size={18} /></span>
                <div>
                  <p>Daily activity</p>
                  <h3>Today&apos;s Renewal Work</h3>
                </div>
              </div>
              <button type="button" className="renewal-remark-close" onClick={() => setReportModalOpen(false)} aria-label="Close report">
                <X size={18} />
              </button>
            </div>

            <div className="renewal-remark-body">
              <div className="renewal-today-report-meta">
                <div>
                  <span>User</span>
                  <strong>{todayWorkReport.user?.name || todayWorkReport.user?.email || "You"}</strong>
                </div>
                <div>
                  <span>Date</span>
                  <strong>{todayWorkReport.reportDate ? formatDate(todayWorkReport.reportDate) : formatDate(new Date())}</strong>
                </div>
                <div>
                  <span>Activities</span>
                  <strong>{todayWorkReport.summary?.total || 0}</strong>
                </div>
                <div>
                  <span>Policies Touched</span>
                  <strong>{todayWorkReport.summary?.uniquePolicies || 0}</strong>
                </div>
              </div>

              <div className="renewal-today-report-chips">
                <span>Remarks {todayWorkReport.summary?.remarks || 0}</span>
                <span>Renewed {todayWorkReport.summary?.renewed || 0}</span>
                <span>Lost {todayWorkReport.summary?.lost || 0}</span>
                <span>Reassigned {todayWorkReport.summary?.reassigned || 0}</span>
                <span>WhatsApp {todayWorkReport.summary?.whatsapp || 0}</span>
              </div>

              {reportLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                  <Loader2 className="spin" size={28} style={{ color: "var(--accent)" }} />
                </div>
              ) : (
                <div className="table-wrap renewal-today-report-table-wrap">
                  <table className="records-table renewal-today-report-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Action</th>
                        <th>Customer</th>
                        <th>Policy No.</th>
                        <th>Mobile</th>
                        <th>Company</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(todayWorkReport.activities || []).length ? todayWorkReport.activities.map((row) => (
                        <tr key={row.id}>
                          <td>{formatDateTime(row.time)}</td>
                          <td>{row.actionLabel || "-"}</td>
                          <td>{row.customerName || "-"}</td>
                          <td>{row.policyNumber || "-"}</td>
                          <td>{row.mobile || "-"}</td>
                          <td>{row.company || "-"}</td>
                          <td title={row.detail || ""}>{row.detail && row.detail.length > 80 ? `${row.detail.slice(0, 80)}...` : (row.detail || "-")}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={7}>No renewal activity recorded for you today yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="renewal-remark-footer">
              <button type="button" className="renewal-remark-secondary" onClick={() => setReportModalOpen(false)}>
                Close
              </button>
              <button
                type="button"
                className="renewal-remark-secondary"
                onClick={() => {
                  setActiveTab("today_work");
                  setPage(1);
                  setReportModalOpen(false);
                }}
              >
                Open in List
              </button>
              <button type="button" className="renewal-remark-primary" onClick={handlePrintTodayReport} disabled={reportLoading}>
                <Printer size={16} />
                Print Report
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* MODAL: Reassign User */}
      {typeof window !== "undefined" && assignModalOpen && assignPolicy && createPortal(
        <div className="tb-modal-backdrop renewal-assign-backdrop" onClick={closeAssignModal}>
          <div className="tb-modal-card renewal-assign-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="renewal-assign-title">
            <div className="renewal-remark-header">
              <div className="renewal-remark-title">
                <span className="renewal-remark-icon"><UserPlus size={18} /></span>
                <div>
                  <p>Ownership update</p>
                  <h3 id="renewal-assign-title">Reassign Renewal</h3>
                </div>
              </div>
              <button
                type="button"
                className="renewal-remark-close"
                onClick={closeAssignModal}
                aria-label="Close reassign modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="renewal-remark-body">
              <div className="renewal-remark-summary">
                <div>
                  <span>Customer</span>
                  <strong>{assignPolicy.insuredName?.trim() ? assignPolicy.insuredName : "-"}</strong>
                </div>
                <div>
                  <span>Policy Number</span>
                  <strong>{assignPolicy.policyNumber || "-"}</strong>
                </div>
                <div>
                  <span>Expiry Date</span>
                  <strong>{getExpiryDisplay(assignPolicy)}</strong>
                </div>
                <div>
                  <span>Renewal Status</span>
                  <strong>{assignPolicy.renewalStatus || "ACTIVE"}</strong>
                </div>
              </div>

              <div className="renewal-assign-current">
                <UserPlus size={16} />
                <span>
                  Currently assigned to <strong>{assignPolicy.assignedTo?.trim() ? assignPolicy.assignedTo : "Unassigned"}</strong>
                  {assignPolicy.assignedDate ? ` · since ${formatDate(assignPolicy.assignedDate)}` : ""}
                </span>
              </div>

              {teamError ? (
                <div className="renewal-assign-error">
                  {teamError}
                  <button type="button" onClick={loadTeamMembers} style={{ marginLeft: "8px", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700 }}>
                    Retry
                  </button>
                </div>
              ) : null}

              <label className="renewal-remark-field renewal-remark-wide">
                <span>Assign To *</span>
                {teamLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 0", color: "#64748b", fontSize: "13px" }}>
                    <Loader2 className="spin" size={16} />
                    Loading team members...
                  </div>
                ) : (
                  <select
                    value={assignUserId}
                    onChange={(event) => setAssignUserId(event.target.value)}
                    disabled={!teamMembers.length}
                  >
                    <option value="">{teamMembers.length ? "Select team member" : "No team members available"}</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}{member.email && member.name !== member.email ? ` (${member.email})` : ""}
                        {member.role ? ` · ${member.role.replace(/_/g, " ")}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </label>

              <label className="renewal-remark-field renewal-remark-wide">
                <span>Assignment Note (optional)</span>
                <textarea
                  value={assignNote}
                  onChange={(event) => setAssignNote(event.target.value)}
                  placeholder="Example: Handover to motor desk, client prefers Hindi calls..."
                  rows={3}
                />
              </label>
            </div>

            <div className="renewal-remark-footer">
              <button type="button" onClick={closeAssignModal} className="renewal-remark-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReassign}
                disabled={savingAssign || teamLoading || !assignUserId || isSameAssigneeSelection()}
                className="renewal-remark-primary"
              >
                {savingAssign && <Loader2 className="spin" size={16} />}
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* MODAL: Mark Policy as Lost */}
      {lostModalOpen && lostPolicy && (
        <div className="tb-modal-backdrop" onClick={() => setLostModalOpen(false)}>
          <div className="tb-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="tb-modal-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
              <h3 className="tb-status-title tb-modal-title" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#dc2626" }}>
                <Trash2 size={20} /> Lost Renewal Confirmation
              </h3>
            </div>
            <div className="tb-modal-body" style={{ marginTop: "12px" }}>
              <p style={{ color: "var(--text-primary)", fontSize: "14px", lineHeight: "1.5", marginBottom: "16px" }}>
                Are you sure you want to mark this policy as Lost Renewal?
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "0 0 16px" }}>
                Policy Number: <strong>{lostPolicy.policyNumber}</strong><br/>
                Customer: <strong>{lostPolicy.insuredName}</strong>
              </p>
              
              <label style={{ display: "block", marginBottom: "12px" }}>
                <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Reason for Loss *</span>
                <select
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--surface)",
                    color: "var(--text-primary)",
                    fontSize: "14px"
                  }}
                >
                  {LOST_REASON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Remarks</span>
                <textarea
                  value={lostRemarks}
                  onChange={(e) => setLostRemarks(e.target.value)}
                  placeholder="Provide detailed remarks about why the policy was lost..."
                  style={{
                    width: "100%",
                    minHeight: "80px",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--surface)",
                    color: "var(--text-primary)",
                    fontSize: "14px"
                  }}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", paddingTop: "16px", marginTop: "16px", borderTop: "1px solid var(--border)" }}>
              <button 
                type="button" 
                onClick={() => setLostModalOpen(false)}
                className="tb-modal-done-btn"
                style={{ background: "var(--surface-variant)", color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={submitMarkLost}
                className="tb-modal-done-btn"
                style={{ background: "#dc2626", color: "white" }}
              >
                Mark Lost
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Renewal Remark */}
      {typeof window !== "undefined" && remarkModalOpen && remarkPolicy && createPortal(
        <div className="tb-modal-backdrop renewal-remark-backdrop renewal-remark-backdrop--sheet" onClick={() => setRemarkModalOpen(false)}>
          <div className="tb-modal-card renewal-remark-modal" onClick={(e) => e.stopPropagation()}>
            <div className="renewal-remark-header">
              <div className="renewal-remark-title">
                <span className="renewal-remark-icon"><FileText size={18} /></span>
                <div>
                  <p>Add follow-up note</p>
                  <h3>Add Renewal Remark</h3>
                </div>
              </div>
              <button
                type="button"
                className="renewal-remark-close"
                onClick={() => setRemarkModalOpen(false)}
                aria-label="Close remark modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="renewal-remark-body">
              <div className="renewal-remark-summary">
                <div>
                  <span>Customer</span>
                  <strong>{remarkPolicy.insuredName || "Unnamed"}</strong>
                </div>
                <div>
                  <span>Policy Number</span>
                  <strong>{remarkPolicy.policyNumber || "-"}</strong>
                </div>
              </div>

              <div className="renewal-remark-grid">
                <label className="renewal-remark-field">
                  <span>Follow-up Status</span>
                  <select
                    value={remarkForm.followUpStatus}
                    onChange={(event) => setRemarkForm((current) => ({ ...current, followUpStatus: event.target.value }))}
                  >
                    {FOLLOW_UP_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="renewal-remark-field">
                  <span>Next Follow-up Date</span>
                  <input
                    type="date"
                    value={remarkForm.nextFollowUpDate}
                    onChange={(event) => setRemarkForm((current) => ({ ...current, nextFollowUpDate: event.target.value }))}
                  />
                </label>

                <label className="renewal-remark-field">
                  <span>Contact Mode</span>
                  <select
                    value={remarkForm.followUpMode}
                    onChange={(event) => setRemarkForm((current) => ({ ...current, followUpMode: event.target.value }))}
                  >
                    {FOLLOW_UP_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="renewal-remark-field">
                  <span>Priority</span>
                  <select
                    value={remarkForm.priority}
                    onChange={(event) => setRemarkForm((current) => ({ ...current, priority: event.target.value }))}
                  >
                    {FOLLOW_UP_PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="renewal-remark-field renewal-remark-wide">
                <span>Next Action</span>
                <input
                  type="text"
                  value={remarkForm.nextAction}
                  onChange={(event) => setRemarkForm((current) => ({ ...current, nextAction: event.target.value }))}
                  placeholder="Example: Share quote, collect payment, call again, collect document"
                />
              </label>

              <label className="renewal-remark-field renewal-remark-wide">
                <span>Remark *</span>
                <textarea
                  value={remarkForm.remark}
                  onChange={(event) => setRemarkForm((current) => ({ ...current, remark: event.target.value }))}
                  placeholder="Type client response, call summary, discussion notes, payment update..."
                  autoFocus
                />
              </label>
            </div>

            <div className="renewal-remark-footer">
              <button
                type="button"
                onClick={() => setRemarkModalOpen(false)}
                className="renewal-remark-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRemark}
                disabled={savingRemark}
                className="renewal-remark-primary"
              >
                {savingRemark && <Loader2 className="spin" size={16} />}
                Save Remark
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* MODAL: Renew Policy */}
      {renewModalOpen && renewPolicy && (
        <div className="tb-modal-backdrop" onClick={() => setRenewModalOpen(false)}>
          <div className="tb-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px", width: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="tb-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
              <h3 className="tb-status-title tb-modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <RefreshCw size={20} /> Renew Policy: {renewPolicy.insuredName}
              </h3>
              <button type="button" onClick={() => setRenewModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={20} />
              </button>
            </div>

            <div className="tb-modal-body" style={{ marginTop: "16px" }}>
              
              {/* PDF upload for auto extraction (Mandatory Screen First) */}
              {!pdfUploaded ? (
                <div style={{
                  border: "2px dashed var(--border)",
                  borderRadius: "12px",
                  padding: "40px 20px",
                  textAlign: "center",
                  background: "rgba(var(--accent-rgb), 0.02)",
                  marginBottom: "20px"
                }}>
                  {extractingPdf ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                      <Loader2 className="spin" size={32} style={{ color: "var(--accent)" }} />
                      <p style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>Extracting data from new policy PDF...</p>
                    </div>
                  ) : (
                    <div>
                      <Upload size={32} style={{ color: "var(--text-secondary)", margin: "0 auto 12px" }} />
                      <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>Upload New Policy PDF to Proceed</h4>
                      <p style={{ margin: "0 0 20px", fontSize: "12px", color: "var(--text-secondary)", maxWidth: "400px", marginLeft: "auto", marginRight: "auto" }}>
                        You must upload the new policy PDF. The system will run the extraction engine and auto-populate all renewal details for your review.
                      </p>
                      <label className="browse-button" style={{ display: "inline-block" }}>
                        Choose PDF File
                        <input type="file" accept="application/pdf" onChange={handlePdfUpload} />
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* File Attached Success Badge */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    backgroundColor: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid #10b981",
                    borderRadius: "8px",
                    marginBottom: "20px"
                  }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", color: "#10b981", fontSize: "13px" }}>
                      <FileText size={16} />
                      <span>Attached: <strong>{pdfInfo?.fileName}</strong></span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setPdfUploaded(false)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                        fontSize: "11px",
                        fontWeight: "600",
                        textDecoration: "underline"
                      }}
                    >
                      Change PDF
                    </button>
                  </div>

                  {/* Renewal Form Fields */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <label>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>New Policy Number *</span>
                      <input
                        value={renewForm.policyNumber}
                        onChange={(e) => setRenewForm({...renewForm, policyNumber: e.target.value})}
                        placeholder="Enter new policy number"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                      />
                    </label>

                    <label>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>New Premium *</span>
                      <input
                        value={renewForm.premium}
                        onChange={(e) => setRenewForm({...renewForm, premium: e.target.value})}
                        placeholder="e.g. 10474"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                      />
                    </label>

                    <label>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>New Start Date *</span>
                      <input
                        type="date"
                        value={renewForm.startDate}
                        onChange={(e) => setRenewForm({...renewForm, startDate: e.target.value})}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                      />
                    </label>

                    <label>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>New Expiry Date *</span>
                      <input
                        type="date"
                        value={renewForm.expiryDate}
                        onChange={(e) => setRenewForm({...renewForm, expiryDate: e.target.value})}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                      />
                    </label>

                    <label>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>New Sum Insured / IDV *</span>
                      <input
                        value={renewForm.sumInsured}
                        onChange={(e) => setRenewForm({...renewForm, sumInsured: e.target.value})}
                        placeholder="e.g. 946241"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                      />
                    </label>

                    <label>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>Payment Mode</span>
                      <select
                        value={renewForm.modeOfPayment}
                        onChange={(e) => setRenewForm({...renewForm, modeOfPayment: e.target.value})}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                      >
                        {PAYMENT_MODE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>Collected Amount</span>
                      <input
                        value={renewForm.collectedAmount}
                        onChange={(e) => setRenewForm({...renewForm, collectedAmount: e.target.value})}
                        placeholder="e.g. 10474"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                      />
                    </label>

                    <label>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>Due Collection</span>
                      <input
                        value={renewForm.dueCollection}
                        onChange={(e) => setRenewForm({...renewForm, dueCollection: e.target.value})}
                        placeholder="e.g. 0"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                      />
                    </label>
                  </div>

                  {/* Remarks */}
                  <label style={{ display: "block", marginTop: "16px" }}>
                    <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>Remarks</span>
                    <textarea
                      value={renewForm.remark}
                      onChange={(e) => setRenewForm({...renewForm, remark: e.target.value})}
                      placeholder="Renewal remarks..."
                      style={{ width: "100%", minHeight: "60px", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                    />
                  </label>

                  {/* Manual Correction Fields */}
                  <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "12px" }}>
                      {isMotorRenewalPolicy(renewPolicy) ? "Insured Details & vehicle info (Verify & Correct)" : "Insured Details (Verify & Correct)"}
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <label style={{ gridColumn: isMotorRenewalPolicy(renewPolicy) ? undefined : "span 2" }}>
                        <span style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Insured Name</span>
                        <input
                          value={renewForm.insuredName}
                          onChange={(e) => setRenewForm({...renewForm, insuredName: e.target.value})}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                        />
                      </label>

                      {isMotorRenewalPolicy(renewPolicy) && (
                        <>
                          <label>
                            <span style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Vehicle Registration No.</span>
                            <input
                              value={renewForm.vehicleNumber}
                              onChange={(e) => setRenewForm({...renewForm, vehicleNumber: e.target.value})}
                              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                            />
                          </label>

                          <label>
                            <span style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Engine Number</span>
                            <input
                              value={renewForm.engineNumber}
                              onChange={(e) => setRenewForm({...renewForm, engineNumber: e.target.value})}
                              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                            />
                          </label>

                          <label>
                            <span style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Chassis Number</span>
                            <input
                              value={renewForm.chassisNumber}
                              onChange={(e) => setRenewForm({...renewForm, chassisNumber: e.target.value})}
                              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px" }}
                            />
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", paddingTop: "16px", marginTop: "24px", borderTop: "1px solid var(--border)" }}>
              <button 
                type="button" 
                onClick={() => setRenewModalOpen(false)}
                className="tb-modal-done-btn"
                style={{ background: "var(--surface-variant)", color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              {pdfUploaded && (
                <button 
                  type="button" 
                  onClick={submitRenewal}
                  disabled={isSaving}
                  className="tb-modal-done-btn"
                  style={{ background: "var(--accent)", color: "white", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {isSaving && <Loader2 className="spin" size={16} />}
                  Save Renewal
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Policy Details */}
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
                <DetailField label="Assigned To" value={selectedRecord.assignedTo} />
                <DetailField label="Assigned Date" value={selectedRecord.assignedDate ? formatDateTime(selectedRecord.assignedDate) : ""} />
                <DetailField label="Renewal Status" value={selectedRecord.renewalStatus || "ACTIVE"} />
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

              {isMotorRenewalPolicy(selectedRecord) && (
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
              )}

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

              <DetailSection title="Latest Follow-up">
                <RenewalFollowUpSummary followUp={selectedRecord.renewalFollowUp} />
              </DetailSection>

              <DetailSection title="Renewal Remark History">
                <RenewalRemarkHistory remarks={selectedRecord.renewalRemarks} />
              </DetailSection>

              <DetailSection title="Ownership & Tracking">
                <DetailField label="Assigned To" value={selectedRecord.assignedTo} />
                <DetailField label="Assigned Date" value={selectedRecord.assignedDate ? formatDateTime(selectedRecord.assignedDate) : ""} />
                <DetailField label="Created By" value={selectedRecord.createdBy || selectedRecord.uploadedByEmail || selectedRecord.uploadedBy} />
                <DetailField label="Created At" value={selectedRecord.createdAt ? formatDateTime(selectedRecord.createdAt) : selectedRecord.savedAt ? formatDateTime(selectedRecord.savedAt) : ""} />
                <DetailField label="Updated By" value={selectedRecord.updatedBy || selectedRecord.latestRemarkBy} />
                <DetailField label="Updated At" value={selectedRecord.updatedAt ? formatDateTime(selectedRecord.updatedAt) : ""} />
                <DetailField label="Renewal Status" value={selectedRecord.renewalStatus || "ACTIVE"} />
                <DetailField label="Source PDF File" value={selectedRecord.sourceFile} wide />
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
                onClick={() => handleReassign(selectedRecord)}
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
                  gap: "8px"
                }}
              >
                <UserPlus size={16} />
                Reassign
              </button>
              {selectedRecord.contactNumber?.trim() ? (
                <button
                  onClick={() => handleWhatsApp(selectedRecord)}
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
                    gap: "8px"
                  }}
                >
                  <MessageSquare size={16} />
                  WhatsApp
                </button>
              ) : null}
              <button
                onClick={() => handleAddRemark(selectedRecord)}
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
              >
                <FileText size={16} />
                Add Remark
              </button>
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

      {/* Toast notifications */}
      {toast ? (
        <button className="toast" type="button" onClick={() => setToast("")} style={{ zIndex: 1000 }}>
          <CheckCircle size={20} />
          <span>{toast}</span>
        </button>
      ) : null}
    </>
  );
}

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

function RenewalRemarkHistory({ remarks }) {
  const items = Array.isArray(remarks) ? remarks : [];
  return (
    <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "10px" }}>
      {items.length ? (
        items.map((remark) => (
          <div
            key={remark.id || `${remark.createdAt}-${remark.text}`}
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "#f8fafc"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "6px", flexWrap: "wrap" }}>
              <strong style={{ fontSize: "12px", color: "#0f172a" }}>{remark.createdBy || "User"}</strong>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                {remark.type ? `${remark.type} · ` : ""}{remark.createdAt ? formatDateTime(remark.createdAt) : ""}
              </span>
            </div>
            {remark.oldStatus && remark.newStatus && remark.oldStatus !== remark.newStatus ? (
              <p style={{ margin: "0 0 8px", fontSize: "11px", color: "#475569" }}>
                Status: <strong>{remark.oldStatus}</strong> → <strong>{remark.newStatus}</strong>
                {remark.lostReason ? ` · ${remark.lostReason}` : ""}
              </p>
            ) : null}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
              {remark.followUpStatus ? <FollowUpPill label={remark.followUpStatus} /> : null}
              {remark.nextFollowUpDate ? <FollowUpPill label={`Next: ${formatDate(remark.nextFollowUpDate)}`} /> : null}
              {remark.followUpMode ? <FollowUpPill label={remark.followUpMode} /> : null}
              {remark.priority ? <FollowUpPill label={`Priority: ${remark.priority}`} /> : null}
            </div>
            <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: 1.45, color: "#334155" }}>
              {remark.text}
            </p>
            {remark.nextAction ? (
              <p style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", fontSize: "12px", lineHeight: 1.4, color: "#475569" }}>
                <strong>Next action:</strong> {remark.nextAction}
              </p>
            ) : null}
          </div>
        ))
      ) : (
        <div style={{ padding: "12px", borderRadius: "8px", background: "#f8fafc", color: "#64748b", fontSize: "13px" }}>
          No renewal remarks saved yet.
        </div>
      )}
    </div>
  );
}

function RenewalFollowUpSummary({ followUp }) {
  if (!followUp || typeof followUp !== "object") {
    return (
      <div style={{ gridColumn: "1 / -1", padding: "12px", borderRadius: "8px", background: "#f8fafc", color: "#64748b", fontSize: "13px" }}>
        No follow-up scheduled yet.
      </div>
    );
  }

  return (
    <>
      <DetailField label="Follow-up Status" value={followUp.followUpStatus} />
      <DetailField label="Next Follow-up Date" value={followUp.nextFollowUpDate ? formatDate(followUp.nextFollowUpDate) : ""} />
      <DetailField label="Contact Mode" value={followUp.followUpMode} />
      <DetailField label="Priority" value={followUp.priority} />
      <DetailField label="Next Action" value={followUp.nextAction} wide />
      <DetailField label="Last Updated By" value={followUp.lastRemarkBy} />
      <DetailField label="Last Updated At" value={followUp.lastRemarkAt ? formatDateTime(followUp.lastRemarkAt) : ""} />
    </>
  );
}

function FollowUpPill({ label }) {
  return (
    <span style={{
      borderRadius: "999px",
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      color: "#475569",
      fontSize: "11px",
      fontWeight: 700,
      padding: "3px 8px"
    }}>
      {label}
    </span>
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

function getPageNumbers(currentPage, totalPages) {
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);
    if (currentPage <= 4) {
      end = 5;
    } else if (currentPage >= totalPages - 3) {
      start = totalPages - 4;
    }
    if (start > 2) {
      pages.push("...");
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (end < totalPages - 1) {
      pages.push("...");
    }
    pages.push(totalPages);
  }
  return pages;
}
