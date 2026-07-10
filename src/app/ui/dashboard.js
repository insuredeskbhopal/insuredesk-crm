"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import "./dashboard.css";
import { cachedJson } from "@/app/lib/client-api";
import { getRecordSearchText } from "@/lib/records/search";
import { validateContactNumber, validateContactPerson } from "@/lib/records/validation";
import { normalizeUploadStatus, UPLOAD_STATUS } from "@/lib/uploads/status";
import { buildAnalytics, formatMoney, parseMoney } from "@/lib/records/analytics";
import PageHeader from "@/app/components/layout/PageHeader";
import RecordsTable from "@/app/components/RecordsTable";
import AlertCard from "@/app/components/shared/AlertCard";
import EmptyState from "@/app/components/shared/EmptyState";
import SearchBox from "@/app/components/shared/SearchBox";
import {
  CheckCircle,
  Download,
  FileText,
  X,
  SlidersHorizontal,
  LoaderCircle,
  Upload,
  LayoutGrid,
  List,
} from "lucide-react";
import { EMPTY_FORM } from "@/app/ui/dashboard/constants";
import {
  FIELD_SETUP,
  COMMON_REVIEW_FIELDS,
  FUEL_TYPE_OPTIONS,
  MANUAL_REQUIRED_FIELDS,
  PAYMENT_MODE_OPTIONS,
  POLICY_SCHEMA_LIBRARY,
  FIELD_GROUPS,
  getReviewCounts,
  queueSummaryLabel,
  getReviewValidation,
  formatReviewValidationError,
  resolvePolicySchema,
  pageTitle,
  pageSubtitle,
  buildClientProfiles,
  loadDashboardView,
  saveDashboardView,
  queueLabel,
  progressWidth,
  uniqueValues,
  shouldUseExtractedVariant,
  shouldUseExtractedFuelType,
  download,
} from "@/app/lib/dashboard-helpers";
import { hasUploadDetection } from "@/lib/uploads/detection";
import PreviewField from "@/app/components/shared/PreviewField";
import FixedPolicyPreview from "@/app/components/upload/FixedPolicyPreview";
import FieldSetupPanel from "@/app/components/field-setup/FieldSetupPanel";
import ClientProfile from "@/app/components/customers/ClientProfile";
import PolicyDetail from "@/app/components/policies/PolicyDetail";
import AnalyticsReports from "@/app/components/analytics/AnalyticsReports";
import PolicyDetailCard from "@/app/components/shared/PolicyDetailCard";

const DASHBOARD_VIEW_KEY = "bimaheadquarter.dashboard.view";
const FIELD_OPTIONS = {
  fuelType: FUEL_TYPE_OPTIONS,
  modeOfPayment: PAYMENT_MODE_OPTIONS,
  newOrRenewal: [
    { value: "", label: "Select New / Renewal" },
    { value: "New", label: "New" },
    { value: "Renewal", label: "Renewal" },
  ],
};

export default function Dashboard({
  initialRecords,
  activePage: routeActivePage,
  selectedClientName: routeClientName,
  selectedPolicyId: routePolicyId,
  totalCount = 0,
  currentPage = 1,
  limit: _limit = 20,
  totalPages = 1,
  initialQ: _initialQ = "",
  initialFilterField = "",
  initialFilterValue = "",
  initialPdfFilter = "all",
  initialViewCategory = "all",
  initialStartDate = "",
  initialEndDate = "",
  initialDatePreset = "all",
  tabCounts = null,
  serverLoadError = "",
}) {
  const [activePage, setActivePage] = useState(routeActivePage || "bulk-entry");
  const [records, setRecords] = useState(initialRecords);

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  const [renewalCounts, setRenewalCounts] = useState({
    eodPremium: 0,
    eodCount: 0,
    mtdPremium: 0,
    mtdCount: 0,
    ytdPremium: 0,
    ytdCount: 0,
    expired: 0,
    expiredPremium: 0,
    renewed: 0,
    renewedPremium: 0,
    lost: 0,
    lostPremium: 0,
  });
  const [agentWiseStats, setAgentWiseStats] = useState([]);

  useEffect(() => {
    async function fetchHeaderData() {
      try {
        const data = await cachedJson("/api/dashboard/header-data", { ttlMs: 5000 });
        if (data.success) {
          if (data.renewalCounts) {
            setRenewalCounts(data.renewalCounts);
          }
          if (data.agentWise) {
            setAgentWiseStats(data.agentWise);
          }
        }
      } catch (err) {
        console.error("Failed to fetch renewal counts:", err);
      }
    }
    fetchHeaderData();
  }, [records]);

  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedUploadId, setSelectedUploadId] = useState("");
  const [isUploadDragging, setIsUploadDragging] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState(routeClientName || "");
  const [selectedPolicyId, setSelectedPolicyId] = useState(routePolicyId || "");
  const [hasLoadedView, setHasLoadedView] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerViewType, setCustomerViewType] = useState("grid");
  const [toast, setToast] = useState("");
  const [alert, setAlert] = useState(
    serverLoadError
      ? {
          type: "error",
          title: "Database temporarily unavailable",
          message: serverLoadError,
        }
      : null,
  );
  const [isRecordFilterOpen, setIsRecordFilterOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("xlsx");
  const [exportCategory, setExportCategory] = useState("all");
  const [exportDuration, setExportDuration] = useState("all");
  const [exportCustomStart, setExportCustomStart] = useState("");
  const [exportCustomEnd, setExportCustomEnd] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [recordFilterField, setRecordFilterField] = useState(initialFilterField);
  const [recordFilterValue, setRecordFilterValue] = useState(initialFilterValue);
  const [recordPdfFilter, setRecordPdfFilter] = useState(initialPdfFilter);
  const [recordViewCategory, setRecordViewCategory] = useState(initialViewCategory);
  const [recordStartDate, setRecordStartDate] = useState(initialStartDate);
  const [recordEndDate, setRecordEndDate] = useState(initialEndDate);
  const [recordDatePreset, setRecordDatePreset] = useState(initialDatePreset);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSaving, startSaving] = useTransition();
  const [isUploading, startUploading] = useTransition();
  const [isNavigating, startNavigation] = useTransition();
  const deferredQuery = useDeferredValue(query);
  const canExportRecords = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(currentUserRole);

  const updateRecordQueryParams = (newParams = {}) => {
    const params = new window.URLSearchParams(window.location.search);
    const qVal = newParams.q !== undefined ? newParams.q : query;
    const fieldVal = newParams.filterField !== undefined ? newParams.filterField : recordFilterField;
    const valueVal = newParams.filterValue !== undefined ? newParams.filterValue : recordFilterValue;
    const pdfVal = newParams.pdfFilter !== undefined ? newParams.pdfFilter : recordPdfFilter;
    const catVal = newParams.viewCategory !== undefined ? newParams.viewCategory : recordViewCategory;
    const startVal = newParams.startDate !== undefined ? newParams.startDate : recordStartDate;
    const endVal = newParams.endDate !== undefined ? newParams.endDate : recordEndDate;
    const presetVal = newParams.datePreset !== undefined ? newParams.datePreset : recordDatePreset;
    const pageVal = newParams.page !== undefined ? newParams.page : 1;

    if (qVal.trim()) params.set("q", qVal.trim());
    else params.delete("q");
    if (fieldVal) params.set("filterField", fieldVal);
    else params.delete("filterField");
    if (valueVal.trim()) params.set("filterValue", valueVal.trim());
    else params.delete("filterValue");
    if (pdfVal && pdfVal !== "all") params.set("pdfFilter", pdfVal);
    else params.delete("pdfFilter");
    if (catVal && catVal !== "all") params.set("viewCategory", catVal);
    else params.delete("viewCategory");
    if (startVal) params.set("startDate", startVal);
    else params.delete("startDate");
    if (endVal) params.set("endDate", endVal);
    else params.delete("endDate");
    if (presetVal && presetVal !== "all") params.set("datePreset", presetVal);
    else params.delete("datePreset");
    if (pageVal > 1) params.set("page", pageVal);
    else params.delete("page");

    startNavigation(() => {
      router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    });
  };

  useEffect(() => {
    if (!hasLoadedView) {
      setHasLoadedView(true);
      return;
    }
    const handler = window.setTimeout(() => {
      updateRecordQueryParams({ q: query });
    }, 450);
    return () => window.clearTimeout(handler);
  }, [query]);

  const handleRecordPageChange = (pNum) => {
    updateRecordQueryParams({ page: pNum });
  };

  const [manualGroupId, setManualGroupId] = useState(POLICY_SCHEMA_LIBRARY[0]?.id || "");
  const manualGroup =
    POLICY_SCHEMA_LIBRARY.find((group) => group.id === manualGroupId) || POLICY_SCHEMA_LIBRARY[0];
  const [manualPolicyId, setManualPolicyId] = useState(manualGroup?.policies?.[0]?.id || "");
  const manualPolicy =
    manualGroup?.policies.find((policy) => policy.id === manualPolicyId) || manualGroup?.policies?.[0];

  const manualVisibleFields = manualPolicy?.fields?.length
    ? FIELD_SETUP.filter(
        ([, key]) =>
          manualPolicy.fields.includes(key) ||
          MANUAL_REQUIRED_FIELDS.includes(key) ||
          COMMON_REVIEW_FIELDS.includes(key) ||
          key === "newOrRenewal",
      )
    : FIELD_SETUP;

  const manualGroupedFields = FIELD_GROUPS.map((group) => {
    const fieldsInGroup = manualVisibleFields.filter(([, key]) => group.fields.includes(key));
    return {
      title: group.title,
      fields: fieldsInGroup,
    };
  }).filter((group) => group.fields.length > 0);

  useEffect(() => {
    if (manualGroup?.policies) {
      setManualPolicyId(manualGroup.policies[0]?.id || "");
    }
  }, [manualGroupId]);

  useEffect(() => {
    if (manualPolicy) {
      setForm((current) => ({
        ...current,
        policyType: manualPolicy.name,
        sourceFile: "Manual Entry",
        status: "saved",
      }));
    }
  }, [manualPolicyId]);

  const router = useRouter();

  useEffect(() => {
    if (routeActivePage) {
      setActivePage(routeActivePage);
    }
  }, [routeActivePage]);

  useEffect(() => {
    setSelectedClientName(routeClientName || "");
  }, [routeClientName]);

  useEffect(() => {
    setSelectedPolicyId(routePolicyId || "");
  }, [routePolicyId]);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    setRecordViewCategory(initialViewCategory);
  }, [initialViewCategory]);

  useEffect(() => {
    setRecordFilterField(initialFilterField);
  }, [initialFilterField]);

  useEffect(() => {
    setRecordFilterValue(initialFilterValue);
  }, [initialFilterValue]);

  useEffect(() => {
    setRecordPdfFilter(initialPdfFilter);
  }, [initialPdfFilter]);

  useEffect(() => {
    setRecordStartDate(initialStartDate);
  }, [initialStartDate]);

  useEffect(() => {
    setRecordEndDate(initialEndDate);
  }, [initialEndDate]);

  useEffect(() => {
    setRecordDatePreset(initialDatePreset);
  }, [initialDatePreset]);

  useEffect(() => {
    if (serverLoadError) {
      setAlert({
        type: "error",
        title: "Database temporarily unavailable",
        message: serverLoadError,
      });
    }
  }, [serverLoadError]);

  useEffect(() => {
    let ignore = false;
    async function loadCurrentUser() {
      try {
        const payload = await cachedJson("/api/auth/me", {
          ttlMs: 10000,
          fetchOptions: { cache: "no-store" },
        });
        if (!payload?.success) return;
        if (!ignore) setCurrentUserRole(payload?.user?.role || "");
      } catch {}
    }
    loadCurrentUser();
    return () => {
      ignore = true;
    };
  }, []);

  const indexedRecords = useMemo(
    () => records.map((record) => ({ record, searchText: getRecordSearchText(record) })),
    [records],
  );
  const filteredRecords = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) return records;
    return indexedRecords
      .filter((item) => item.searchText.includes(normalizedQuery))
      .map((item) => item.record);
  }, [deferredQuery, indexedRecords, records]);
  const policyRecordResults = useMemo(() => {
    const normalizedFilterValue = recordFilterValue.trim().toLowerCase();

    return filteredRecords.filter((record) => {
      const matchesField =
        recordFilterField && normalizedFilterValue
          ? String(record[recordFilterField] || "")
              .toLowerCase()
              .includes(normalizedFilterValue)
          : true;
      const matchesPdf =
        recordPdfFilter === "all" ||
        (recordPdfFilter === "with" && record.hasPdf) ||
        (recordPdfFilter === "missing" && !record.hasPdf);

      return matchesField && matchesPdf;
    });
  }, [filteredRecords, recordFilterField, recordFilterValue, recordPdfFilter]);
  const recordsWithSchema = useMemo(
    () =>
      policyRecordResults.map((record) => ({
        record,
        validation: getReviewValidation({
          sourceFile: record.sourceFile || "",
          extractedData: record,
        }),
      })),
    [policyRecordResults],
  );
  const duplicateRecordIds = useMemo(() => {
    const groups = new Map();
    policyRecordResults.forEach((record) => {
      const key = getDuplicatePolicyKey(record);
      if (!key) return;
      const group = groups.get(key) || [];
      group.push(record.id);
      groups.set(key, group);
    });

    const ids = new Set();
    groups.forEach((group) => {
      if (group.length > 1) {
        group.forEach((id) => ids.add(id));
      }
    });
    return ids;
  }, [policyRecordResults]);
  const recordViewOptions = useMemo(() => {
    if (activePage === "records" && tabCounts) {
      const dynamicTabs = (tabCounts.categories || []).map((cat) => ({
        key: cat.key,
        label: cat.label,
        count: cat.count,
      }));
      return [
        { key: "all", label: "All Records", count: tabCounts.all || 0 },
        { key: "duplicates", label: "Duplicate Policies", count: tabCounts.duplicates || 0 },
        ...dynamicTabs,
      ];
    }

    const categories = new Map();
    recordsWithSchema.forEach(({ validation }) => {
      const key = validation.resolvedSchema?.groupId || "general";
      const label = validation.resolvedSchema?.groupLabel || "General";
      const existing = categories.get(key) || { key, label, count: 0 };
      categories.set(key, { ...existing, count: existing.count + 1 });
    });
    return [
      { key: "all", label: "All Records", count: policyRecordResults.length },
      { key: "duplicates", label: "Duplicate Policies", count: duplicateRecordIds.size },
      ...Array.from(categories.values()),
    ];
  }, [duplicateRecordIds.size, policyRecordResults.length, recordsWithSchema, activePage, tabCounts]);
  const visiblePolicyRecordResults = useMemo(() => {
    if (activePage === "records") return records;
    if (recordViewCategory === "all") return policyRecordResults;
    if (recordViewCategory === "duplicates") {
      return policyRecordResults.filter((record) => duplicateRecordIds.has(record.id));
    }
    return recordsWithSchema
      .filter(({ validation }) => (validation.resolvedSchema?.groupId || "general") === recordViewCategory)
      .map(({ record }) => record);
  }, [activePage, records, recordViewCategory, policyRecordResults, duplicateRecordIds, recordsWithSchema]);
  const recordViewColumns = useMemo(() => {
    if (recordViewCategory === "all") return undefined;
    if (recordViewCategory === "duplicates") {
      return [
        { key: "policyNumber", label: "Policy No.", className: "col-policy", code: true },
        { key: "insuredName", label: "Insured Name", className: "col-insured", primary: true },
        { key: "insuranceCompany", label: "Insurance Company", className: "col-company" },
        { key: "vehicleNumber", label: "Vehicle / Risk Location", className: "col-default" },
        { key: "expiryDate", label: "Expiry Date", className: "col-date", format: "date" },
        { key: "savedAt", label: "Saved At", className: "col-saved", format: "dateTime" },
        { key: "uploadedBy", label: "Uploaded By", className: "col-uploader" },
        { key: "sourceFile", label: "Source File", className: "col-source" },
      ];
    }

    const fieldLabels = new Map(FIELD_SETUP.map(([label, key]) => [key, label]));
    const classNames = {
      customerId: "col-customer",
      savedAt: "col-saved",
      uploadedAt: "col-saved",
      uploadedBy: "col-uploader",
      insuredName: "col-insured",
      contactNumber: "col-contact",
      contactPerson: "col-contact-person",
      whatsappGroupName: "col-group",
      groupName: "col-group",
      policyNumber: "col-policy",
      policyType: "col-type",
      sumInsured: "col-money",
      premium: "col-money",
      totalPremium: "col-money",
      netPremium: "col-money",
      tpDriverOwner: "col-money",
      odPremium: "col-money",
      dueCollection: "col-money",
      collectedAmount: "col-money",
      modeOfPayment: "col-default",
      remark: "col-description",
      startDate: "col-date",
      expiryDate: "col-date",
      duration: "col-duration",
      riskLocation: "col-location",
      district: "col-district",
      tehsil: "col-tehsil",
      insuranceCompany: "col-company",
      description: "col-description",
      pptMpwlc: "col-ppt",
      occupancy: "col-occupancy",
      validIn: "col-valid",
      sourceFile: "col-source",
    };
    const selectedSchemas = recordsWithSchema
      .filter(({ validation }) => (validation.resolvedSchema?.groupId || "general") === recordViewCategory)
      .map(({ validation }) => validation);
    const visibleKeys = new Set(["customerId", "savedAt", "uploadedAt", "uploadedBy", "insuredName"]);
    selectedSchemas.forEach((validation) => {
      validation.visibleFields.forEach(([, key]) => visibleKeys.add(key));
    });
    visibleKeys.add("sourceFile");

    return [
      "customerId",
      "savedAt",
      "uploadedAt",
      "uploadedBy",
      ...FIELD_SETUP.map(([, key]) => key),
      "sourceFile",
    ]
      .filter((key, index, list) => visibleKeys.has(key) && list.indexOf(key) === index)
      .map((key) => ({
        key,
        label:
          key === "savedAt"
            ? "Saved At"
            : key === "uploadedAt"
              ? "Uploaded At"
              : key === "uploadedBy"
                ? "Uploaded By"
                : fieldLabels.get(key) || key,
        className: classNames[key] || "col-default",
        format: key === "savedAt" || key === "uploadedAt" ? "dateTime" : undefined,
        primary: key === "insuredName",
        code: key === "policyNumber",
      }));
  }, [recordViewCategory, recordsWithSchema]);
  const activeRecordFilterCount =
    (recordFilterField && recordFilterValue.trim() ? 1 : 0) +
    (recordPdfFilter !== "all" ? 1 : 0) +
    (recordDatePreset !== "all" ? 1 : 0) +
    (recordDatePreset === "custom" && recordStartDate ? 1 : 0) +
    (recordDatePreset === "custom" && recordEndDate ? 1 : 0);
  const clientProfiles = buildClientProfiles(filteredRecords, parseMoney);
  const CUSTOMERS_PER_PAGE = 12;
  const customerPageCount = Math.max(1, Math.ceil(clientProfiles.length / CUSTOMERS_PER_PAGE));
  const customerStartIndex = (customerPage - 1) * CUSTOMERS_PER_PAGE;
  const paginatedClients = useMemo(() => {
    return clientProfiles.slice(customerStartIndex, customerStartIndex + CUSTOMERS_PER_PAGE);
  }, [clientProfiles, customerStartIndex]);
  const customerPageNumbers = useMemo(
    () => getPageNumbers(customerPage, customerPageCount),
    [customerPage, customerPageCount],
  );
  const goToPage = (page) => {
    setCustomerPage(Math.min(Math.max(1, page), customerPageCount));
  };

  const selectedClient = selectedClientName
    ? buildClientProfiles(records, parseMoney).find((client) => client.name === selectedClientName)
    : null;

  const analytics = useMemo(() => buildAnalytics(filteredRecords), [filteredRecords]);
  const canEditPolicyRecords = ["SUPER_ADMIN", "ADMIN", "MANAGER", "AGENT"].includes(currentUserRole);
  const canDeletePolicyRecords = currentUserRole === "SUPER_ADMIN";
  const editValidation = useMemo(
    () =>
      getReviewValidation({
        sourceFile: editingRecord?.sourceFile || "",
        extractedData: editForm,
      }),
    [editingRecord, editForm],
  );

  const handleSelectReport = (report) => {
    if (!report) return;
    router.push(`/analytics-reports/${encodeURIComponent(report.id)}`);
  };
  const selectedPolicy = selectedClient
    ? selectedClient.policies.find((record) => record.id === selectedPolicyId)
    : null;
  const selectedUpload =
    selectedFiles.find((file) => file.id === selectedUploadId) ||
    selectedFiles.find((file) => normalizeUploadStatus(file.status) !== UPLOAD_STATUS.FAILED) ||
    null;
  const reviewCounts = getReviewCounts(selectedFiles);

  const showRecordSaveActions =
    activePage === "bulk-entry" || activePage === "dashboard" || activePage === "manual-entry";

  useEffect(() => {
    const savedView = loadDashboardView(DASHBOARD_VIEW_KEY);
    if (!routeActivePage) {
      setActivePage(savedView.activePage || "bulk-entry");
      setSelectedClientName(savedView.selectedClientName || "");
      setSelectedPolicyId(savedView.selectedPolicyId || "");
    }
    setHasLoadedView(true);
  }, [routeActivePage]);

  useEffect(() => {
    if (activePage !== "customers" && (selectedClientName || selectedPolicyId)) {
      return;
    }

    if (!hasLoadedView) return;
    saveDashboardView(DASHBOARD_VIEW_KEY, { activePage, selectedClientName, selectedPolicyId });
  }, [activePage, hasLoadedView, selectedClientName, selectedPolicyId]);

  useEffect(() => {
    if (!recordViewOptions.some((option) => option.key === recordViewCategory)) {
      setRecordViewCategory("all");
    }
  }, [recordViewCategory, recordViewOptions]);

  useEffect(() => {
    setCustomerPage(1);
  }, [query]);

  function handleFilePick(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setAlert({
      type: "info",
      title: "Extracting policy PDFs",
      message: `${files.length} file${files.length === 1 ? "" : "s"} selected. Keep this page open while the records are prepared.`,
    });
    const queuedFiles = files.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}`,
      name: file.name,
      sourceFile: file.name,
      fileObject: file,
      status: UPLOAD_STATUS.PENDING,
    }));
    setSelectedFiles(queuedFiles);
    setSelectedUploadId(queuedFiles[0]?.id || "");

    startUploading(async () => {
      try {
        const body = new FormData();
        files.forEach((file) => body.append("files", file));
        setSelectedFiles((current) => current.map((file) => ({ ...file, status: UPLOAD_STATUS.PROCESSING })));

        const response = await fetch("/api/uploads", {
          method: "POST",
          body,
        });

        if (!response.ok && response.status !== 422) {
          let message = "PDF extraction failed";
          try {
            const payload = await response.json();
            if (payload?.error) message = payload.error;
          } catch {}
          setSelectedFiles(
            queuedFiles.map((file) => ({
              ...file,
              status: UPLOAD_STATUS.FAILED,
            })),
          );
          setAlert({ type: "error", title: "Upload failed", message });
          setToast(message);
          return;
        }

        const payload = await response.json();
        const extracted = Array.isArray(payload?.files) ? payload.files : [];
        const failed = Array.isArray(payload?.failed) ? payload.failed : [];

        setSelectedFiles([
          ...extracted.map((record) => ({
            ...record,
            name: record.sourceFile,
            status: normalizeUploadStatus(record.status || UPLOAD_STATUS.REVIEW_REQUIRED),
            manualFields: [],
          })),
          ...failed.map((item) => ({
            id: item.id,
            name: item.sourceFile,
            sourceFile: item.sourceFile,
            fileObject: queuedFiles.find((file) => file.name === item.sourceFile)?.fileObject,
            status: UPLOAD_STATUS.FAILED,
            message: item.error,
          })),
        ]);
        setSelectedUploadId(extracted[0]?.id || failed[0]?.id || "");

        if (extracted.length && failed.length) {
          const message = `Prepared ${extracted.length} PDF${extracted.length === 1 ? "" : "s"} for review; ${failed.length} failed`;
          setAlert({ type: "warning", title: "Upload partially completed", message });
          setToast(message);
        } else if (extracted.length) {
          const message = `Classified ${extracted.length} PDF${extracted.length === 1 ? "" : "s"} for review`;
          setAlert({ type: "success", title: "Upload ready", message });
          setToast(message);
        } else {
          const message = `No PDFs could be prepared. ${failed.length} failed extraction`;
          setAlert({ type: "error", title: "No files ready", message });
          setToast(message);
        }
      } catch (error) {
        const message = error?.message || "The upload request could not be completed.";
        setSelectedFiles(
          queuedFiles.map((file) => ({
            ...file,
            status: UPLOAD_STATUS.FAILED,
            message,
          })),
        );
        setAlert({ type: "error", title: "Upload failed", message });
        setToast(message);
      }
    });
  }

  function handleUploadDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!isUploadDragging) setIsUploadDragging(true);
  }

  function handleUploadDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsUploadDragging(false);
  }

  function handleUploadDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsUploadDragging(false);
    handleFilePick(event.dataTransfer?.files);
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateSelectedUpload(updates) {
    setSelectedFiles((current) =>
      current.map((file) => (file.id === selectedUpload?.id ? { ...file, ...updates } : file)),
    );
  }

  function removeQueuedUpload(fileId) {
    const nextFiles = selectedFiles.filter((file) => file.id !== fileId);
    setSelectedFiles(nextFiles);

    if (selectedUploadId === fileId) {
      const nextSelected =
        nextFiles.find((file) => normalizeUploadStatus(file.status) !== UPLOAD_STATUS.FAILED) ||
        nextFiles[0] ||
        null;
      setSelectedUploadId(nextSelected?.id || "");
    }
  }

  function updateExtractedField(key, value) {
    if (!selectedUpload) return;
    updateSelectedUpload({
      extractedData: {
        ...(selectedUpload.extractedData || {}),
        [key]: value,
      },
      manualFields: uniqueValues([...(selectedUpload.manualFields || []), key]),
    });
  }

  function startEditRecord(record) {
    if (!canEditPolicyRecords) {
      setAlert({
        type: "error",
        title: "Edit unavailable",
        message: "Viewer role cannot edit policy records.",
      });
      return;
    }
    const nextForm = FIELD_SETUP.reduce(
      (payload, [, key]) => ({
        ...payload,
        [key]: record?.[key] ?? "",
      }),
      {},
    );
    setEditingRecord(record);
    setEditForm(nextForm);
    setAlert(null);
  }

  function updateEditField(key, value) {
    setEditForm((current) => ({ ...current, [key]: value }));
  }

  function saveEditedRecord() {
    if (!editingRecord) return;
    startSaving(async () => {
      try {
        setAlert(null);
        if (!editForm.clientId) {
          setAlert({
            type: "error",
            title: "Client ID Required",
            message: "You must link this policy to a Client ID before saving. Please use the search assistant under 'Client ID' to link an existing client, or request the admin to create a new client first.",
          });
          setToast("Client ID is required");
          return;
        }
        if (!editValidation.valid) {
          const message = formatReviewValidationError(
            editValidation.missingRequired,
            editValidation.contactErrors,
          );
          setAlert({ type: "error", title: "Review incomplete", message });
          setToast("Fix contact details before saving");
          return;
        }
        const reviewedData = editValidation.visibleFields.reduce(
          (payload, [, key]) => ({
            ...payload,
            [key]: editForm[key] ?? "",
          }),
          {},
        );
        const response = await fetch(`/api/policy-records/${editingRecord.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewedData,
          }),
        });

        if (!response.ok) {
          let message = "Policy record could not be updated.";
          try {
            const payload = await response.json();
            if (payload?.error) message = payload.error;
          } catch {}
          setAlert({ type: "error", title: "Update failed", message });
          setToast(message);
          return;
        }

        const updated = await response.json();
        setRecords((current) => current.map((record) => (record.id === updated.id ? updated : record)));
        setEditingRecord(null);
        setEditForm({});
        setAlert({
          type: "success",
          title: "Record updated",
          message: updated.policyNumber || updated.insuredName || "Policy record updated successfully.",
        });
        setToast("Policy record updated");
      } catch (error) {
        const message = error?.message || "Policy record could not be updated.";
        setAlert({ type: "error", title: "Update failed", message });
        setToast(message);
      }
    });
  }

  function deletePolicyRecord(recordsToDelete) {
    if (!canDeletePolicyRecords) {
      setAlert({
        type: "error",
        title: "Delete unavailable",
        message: "Only super admin can delete policy records.",
      });
      return;
    }

    const isArray = Array.isArray(recordsToDelete);
    const items = isArray ? recordsToDelete : [recordsToDelete];
    if (items.length === 0) return;

    let confirmation = "";
    if (isArray) {
      confirmation = window.prompt(`Type "DELETE" to delete all ${items.length} selected policy records.`);
      if (confirmation !== "DELETE") {
        setAlert({
          type: "info",
          title: "Delete cancelled",
          message: "Confirmation did not match. No policy records were deleted.",
        });
        return;
      }
    } else {
      const record = items[0];
      if (!record?.id) return;
      const deleteLabel = record.policyNumber || record.id;
      const expectedConfirmation = `DELETE ${deleteLabel}`;
      confirmation = window.prompt(`Type "${expectedConfirmation}" to delete this policy record.`);
      if (confirmation !== expectedConfirmation) {
        setAlert({
          type: "info",
          title: "Delete cancelled",
          message: "Typed confirmation did not match. No policy record was deleted.",
        });
        return;
      }
    }

    startSaving(async () => {
      try {
        let deletedCount = 0;
        let failedCount = 0;
        let lastErrorMessage = "";
        const deletedIds = [];

        for (const record of items) {
          const deleteLabel = record.policyNumber || record.id;
          const payloadConfirmation = `DELETE ${deleteLabel}`;
          try {
            const response = await fetch(`/api/policy-records/${record.id}`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ confirmation: payloadConfirmation }),
            });
            if (response.ok) {
              deletedCount++;
              deletedIds.push(record.id);
            } else {
              failedCount++;
              try {
                const payload = await response.json();
                if (payload?.error) lastErrorMessage = payload.error;
              } catch {}
            }
          } catch (e) {
            failedCount++;
            lastErrorMessage = e.message;
          }
        }

        if (deletedCount > 0) {
          const deletedSet = new Set(deletedIds);
          setRecords((current) => current.filter((item) => !deletedSet.has(item.id)));
        }

        if (failedCount === 0) {
          setAlert({
            type: "success",
            title: isArray ? "Records deleted" : "Record deleted",
            message: isArray
              ? `${deletedCount} policy records were deleted.`
              : `${items[0].policyNumber || items[0].insuredName || "this policy record"} was removed.`,
          });
          setToast(isArray ? `${deletedCount} records deleted` : "Policy record deleted");
        } else {
          setAlert({
            type: "warning",
            title: "Delete completed with errors",
            message: `Successfully deleted ${deletedCount} records. Failed to delete ${failedCount} records. Last error: ${lastErrorMessage || "Unknown error"}`,
          });
          setToast(`Deleted ${deletedCount} records, ${failedCount} failed`);
        }
      } catch (error) {
        const message = error?.message || "Policy records could not be deleted.";
        setAlert({ type: "error", title: "Delete failed", message });
        setToast(message);
      }
    });
  }

  function retryUpload(file) {
    if (!file?.fileObject) {
      setAlert({
        type: "error",
        title: "Retry unavailable",
        message: "Choose the PDF again to retry this failed file.",
      });
      return;
    }
    handleFilePick([file.fileObject]);
  }

  function saveRecord() {
    startSaving(async () => {
      try {
        setAlert(null);
        const isDynamicPolicySave =
          (activePage === "bulk-entry" || activePage === "dashboard") && selectedUpload?.id;

        const targetClientId = isDynamicPolicySave
          ? (selectedUpload?.reviewedData?.clientId || selectedUpload?.extractedData?.clientId)
          : form.clientId;

        if (!targetClientId) {
          setAlert({
            type: "error",
            title: "Client ID Required",
            message: "You must link this policy to a Client ID before saving. Please use the search assistant under 'Client ID' to link an existing client, or request the admin to create a new client first.",
          });
          setToast("Client ID is required");
          return;
        }

        if ((activePage === "bulk-entry" || activePage === "dashboard") && !selectedUpload?.id) {
          setAlert({
            type: "info",
            title: "No PDF selected",
            message: "Upload a policy PDF before saving a reviewed record.",
          });
          return;
        }
        if (isDynamicPolicySave) {
          const uploadStatus = normalizeUploadStatus(selectedUpload.status);
          if (uploadStatus === UPLOAD_STATUS.FAILED) {
            setAlert({
              type: "error",
              title: "Save failed",
              message: "This PDF failed extraction. Retry it before saving.",
            });
            return;
          }
          if (uploadStatus === UPLOAD_STATUS.APPROVED) {
            setAlert({
              type: "info",
              title: "Already saved",
              message: `${selectedUpload.sourceFile} is already saved.`,
            });
            return;
          }
          const validation = getReviewValidation(selectedUpload);
          if (!validation.valid) {
            const message = formatReviewValidationError(validation.missingRequired, validation.contactErrors);
            setAlert({ type: "error", title: "Review incomplete", message });
            setToast("Fix contact details before saving");
            return;
          }
        } else if (activePage === "manual-entry") {
          const resolvedSchema = resolvePolicySchema(manualGroup?.id, manualPolicy?.id);
          const validation = getReviewValidation(
            { sourceFile: form.sourceFile, extractedData: form },
            { resolvedSchema },
          );
          if (!validation.valid) {
            const message = formatReviewValidationError(validation.missingRequired, validation.contactErrors);
            setAlert({ type: "error", title: "Review incomplete", message });
            setToast("Fix contact details before saving");
            return;
          }
        }
        const reviewedUploadData = isDynamicPolicySave ? prepareUploadReviewData(selectedUpload) : null;
        const response = await fetch(isDynamicPolicySave ? "/api/policy-records" : "/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isDynamicPolicySave
              ? {
                  uploadedFileId: selectedUpload.id,
                  sourceFile: selectedUpload.sourceFile,
                  detectedBankSource: "",
                  detectedCompany: selectedUpload.extractedData?.insuranceCompany || "",
                  detectedServiceCategory: "",
                  detectedPolicyType: selectedUpload.extractedData?.policyType || "",
                  selectedBankSource: "",
                  selectedCompany: selectedUpload.extractedData?.insuranceCompany || "",
                  selectedServiceCategory: "",
                  selectedPolicyType: selectedUpload.extractedData?.policyType || "",
                  confidenceScore: 0,
                  extractedData: selectedUpload.extractedData || {},
                  reviewedData: reviewedUploadData,
                  extractionMethod: selectedUpload.extractionMethod,
                  extractionQuality: {},
                  extractionLog: selectedUpload.extractionLog,
                  schemaVersion: 1,
                  policySchemaId: "",
                }
              : form,
          ),
        });

        if (!response.ok) {
          let message = "Record could not be saved.";
          try {
            const payload = await response.json();
            if (payload?.error) message = payload.error;
          } catch {}
          setAlert({ type: "error", title: "Save failed", message });
          setToast(message);
          return;
        }

        const saved = await response.json();
        setRecords((current) => [saved, ...current]);
        if (isDynamicPolicySave) {
          const updatedFiles = selectedFiles.map((file) =>
            file.id === selectedUpload.id
              ? { ...file, status: UPLOAD_STATUS.APPROVED, savedRecordId: saved.id }
              : file,
          );
          const allUploadsSaved =
            updatedFiles.length > 0 &&
            updatedFiles.every((file) => normalizeUploadStatus(file.status) === UPLOAD_STATUS.APPROVED);

          if (allUploadsSaved) {
            setSelectedFiles([]);
            setSelectedUploadId("");
          } else {
            setSelectedFiles(updatedFiles);
          }

          const nextUpload = updatedFiles.find((file) => {
            const status = normalizeUploadStatus(file.status);
            return (
              file.id !== selectedUpload.id &&
              status !== UPLOAD_STATUS.FAILED &&
              status !== UPLOAD_STATUS.APPROVED
            );
          });
          if (nextUpload) {
            setSelectedUploadId(nextUpload.id);
          } else if (!allUploadsSaved) {
            const fallbackUpload =
              updatedFiles.find((file) => normalizeUploadStatus(file.status) === UPLOAD_STATUS.FAILED) ||
              null;
            setSelectedUploadId(fallbackUpload?.id || "");
          }
        } else {
          setSelectedFiles([]);
          setForm(EMPTY_FORM);
        }
        setAlert({
          type: "success",
          title: "Record saved",
          message: saved.sourceFile || "Policy record saved successfully.",
        });
        setToast(`Saved ${saved.sourceFile}`);
      } catch (error) {
        const message = error?.message || "Record could not be saved.";
        setAlert({ type: "error", title: "Save failed", message });
        setToast(message);
      }
    });
  }

  async function handleExportSubmit() {
    if (!canExportRecords) {
      setAlert({
        type: "error",
        title: "Export restricted",
        message: "You do not have permission to export records.",
      });
      setToast("Export restricted");
      return;
    }
    setIsExporting(true);
    try {
      const exportSource = activePage === "records" ? await fetchAllPolicyRecordsForExport() : records;
      let list = applyExportFilters(exportSource);

      if (!list.length) {
        setAlert({
          type: "error",
          title: "No records",
          message: "No records found matching the selected export filters.",
        });
        setIsExporting(false);
        return;
      }

      if (exportFormat === "csv") {
        const headers = FIELD_SETUP.map(([label]) => label);
        const keys = FIELD_SETUP.map(([, key]) => key);
        const csvRows = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",")];

        list.forEach((record) => {
          const rowValues = keys.map((key) => {
            const val = record[key] ?? "";
            if (key === "policyNumber" && val) {
              return `="` + String(val).replace(/"/g, '""') + `"`;
            }
            return `"${String(val).replace(/"/g, '""')}"`;
          });
          csvRows.push(rowValues.join(","));
        });

        const csvContent = "\ufeff" + csvRows.join("\n");
        download("policy-records-export.csv", csvContent, "text/csv;charset=utf-8;");
        setToast("CSV exported successfully");
      } else if (exportFormat === "xlsx") {
        const XLSXModule = await import("xlsx");
        const XLSX = XLSXModule.default || XLSXModule;
        const data = list.map((record) => {
          const obj = {};
          FIELD_SETUP.forEach(([label, key]) => {
            obj[label] = record[key] ?? "";
          });
          return obj;
        });

        const worksheet = XLSX.utils.json_to_sheet(data);

        // Force Policy Number column to treat values as text/string cells
        let policyNumberColIndex = -1;
        const headersList = FIELD_SETUP.map(([label]) => label);
        policyNumberColIndex = headersList.indexOf("Policy Number");

        if (policyNumberColIndex !== -1) {
          const range = XLSX.utils.decode_range(worksheet["!ref"]);
          for (let r = range.s.r + 1; r <= range.e.r; r++) {
            const cellAddress = XLSX.utils.encode_cell({ r, c: policyNumberColIndex });
            if (worksheet[cellAddress]) {
              worksheet[cellAddress].t = "s";
              worksheet[cellAddress].v = String(worksheet[cellAddress].v);
              delete worksheet[cellAddress].z;
            }
          }
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Policy Records");

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "policy-records-export.xlsx";
        link.click();
        URL.revokeObjectURL(url);
        setToast("Excel exported successfully");
      } else if (exportFormat === "pdf") {
        const jspdfModule = await import("jspdf");
        const jsPDF = jspdfModule.jsPDF || jspdfModule.default || jspdfModule;

        const autoTableModule = await import("jspdf-autotable");
        const autoTable = autoTableModule.default || autoTableModule;

        const doc = new jsPDF("l", "mm", "a4");
        doc.setFontSize(16);
        doc.text("Policy Records Export", 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, 14, 22);

        const selectedColumns = FIELD_SETUP.map(([label, key]) => ({
          header: label,
          dataKey: key,
        }));

        const tableData = list.map((record) => {
          const row = {};
          selectedColumns.forEach((col) => {
            let val = record[col.dataKey] ?? "";
            if (["startDate", "expiryDate"].includes(col.dataKey) && val) {
              const d = new Date(val);
              if (!Number.isNaN(d.getTime())) {
                val = d.toLocaleDateString("en-IN");
              }
            }
            row[col.dataKey] = val;
          });
          return row;
        });

        autoTable(doc, {
          columns: selectedColumns,
          body: tableData,
          startY: 28,
          theme: "striped",
          styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
          margin: { top: 25, bottom: 20 },
          horizontalPageBreak: true,
          horizontalPageBreakRepeat: "customerId",
        });

        doc.save("policy-records-export.pdf");
        setToast("PDF exported successfully");
      }

      setIsExportModalOpen(false);
    } catch (err) {
      console.error("Export error:", err);
      setAlert({
        type: "error",
        title: "Export failed",
        message: err.message || "An error occurred during export.",
      });
    } finally {
      setIsExporting(false);
    }
  }

  async function fetchAllPolicyRecordsForExport() {
    const pageSize = 500;
    const firstParams = buildPolicyRecordExportParams(1, pageSize);
    const firstResponse = await fetch(`/api/policy-records?${firstParams.toString()}`, { cache: "no-store" });
    if (!firstResponse.ok) {
      const payload = await firstResponse.json().catch(() => ({}));
      throw new Error(payload.error || "Could not load policy records for export.");
    }

    const firstPayload = await firstResponse.json();
    const allRecords = Array.isArray(firstPayload.records) ? [...firstPayload.records] : [];
    const pages = Number(firstPayload.totalPages || 1);

    for (let page = 2; page <= pages; page += 1) {
      const params = buildPolicyRecordExportParams(page, pageSize);
      const response = await fetch(`/api/policy-records?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Could not load export page ${page}.`);
      }
      const payload = await response.json();
      if (Array.isArray(payload.records)) allRecords.push(...payload.records);
    }

    return allRecords;
  }

  function buildPolicyRecordExportParams(page, pageSize) {
    const params = new window.URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    if (query.trim()) params.set("q", query.trim());
    if (recordFilterField) params.set("filterField", recordFilterField);
    if (recordFilterValue.trim()) params.set("filterValue", recordFilterValue.trim());
    if (recordPdfFilter && recordPdfFilter !== "all") params.set("pdfFilter", recordPdfFilter);
    if (recordViewCategory && recordViewCategory !== "all") params.set("viewCategory", recordViewCategory);
    if (recordDatePreset && recordDatePreset !== "all") params.set("datePreset", recordDatePreset);
    if (recordDatePreset === "custom" && recordStartDate) params.set("startDate", recordStartDate);
    if (recordDatePreset === "custom" && recordEndDate) params.set("endDate", recordEndDate);
    return params;
  }

  function applyExportFilters(sourceRecords) {
    let list = Array.isArray(sourceRecords) ? sourceRecords : [];

    if (exportCategory !== "all") {
      list = list.filter((record) => {
        const isMotor = isMotorPolicyData(record);
        if (exportCategory === "motor") return isMotor;
        if (exportCategory === "non-motor") return !isMotor;

        const policyType = (record.policyType || "").toLowerCase();
        const remark = (record.remark || "").toLowerCase();
        const riskLocation = (record.riskLocation || "").toLowerCase();
        const description = (record.description || "").toLowerCase();
        const insuredName = (record.insuredName || "").toLowerCase();

        if (exportCategory === "fire") {
          return (
            policyType.includes("fire") || policyType.includes("sfsp") || policyType.includes("burglary")
          );
        }
        if (exportCategory === "warehouse") {
          return (
            policyType.includes("warehouse") ||
            remark.includes("warehouse") ||
            riskLocation.includes("warehouse") ||
            description.includes("warehouse") ||
            insuredName.includes("warehouse")
          );
        }
        return true;
      });
    }

    if (exportDuration !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      list = list.filter((record) => {
        const dateVal = getExportRecordDate(record);
        if (!dateVal) return false;

        if (exportDuration === "today") {
          return dateVal >= today && dateVal < addDays(today, 1);
        }
        if (exportDuration === "custom") {
          const start = parseDateInputStart(exportCustomStart);
          const end = parseDateInputEnd(exportCustomEnd);
          if (start && dateVal < start) return false;
          if (end && dateVal > end) return false;
          return true;
        }

        const durationDays = {
          "past-3-days": 3,
          "past-week": 7,
          "past-month": 30,
          "past-3-months": 90,
          "past-6-months": 180,
          "past-year": 365,
        }[exportDuration];
        if (!durationDays) return true;

        const cutoff = addDays(now, -durationDays);
        return dateVal >= cutoff && dateVal <= now;
      });
    }

    return list;
  }

  function getExportRecordDate(record) {
    const value = record?.savedAt || record?.uploadedAt || record?.createdAt;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function parseDateInputStart(value) {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function parseDateInputEnd(value) {
    if (!value) return null;
    const date = new Date(`${value}T23:59:59.999`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  return (
    <>
      <PageHeader
        title={pageTitle(activePage)}
        subtitle={pageSubtitle(activePage)}
        showRecordSaveActions={showRecordSaveActions}
        isSaving={isSaving}
        isUploading={isUploading}
        onSaveRecord={saveRecord}
      />

      {alert ? <AlertCard alert={alert} onDismiss={() => setAlert(null)} /> : null}

      {(activePage === "bulk-entry" || activePage === "dashboard") && currentUserRole !== "VIEWER" && (
        <>
          {/* Renewal Counters Grid */}
          <section
            className="rn-counters-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            {[
              {
                label: "EOD Total Premium",
                value: renewalCounts.eodPremium ? formatMoney(renewalCounts.eodPremium) : "₹0",
                subtext: `${renewalCounts.eodCount} polic${renewalCounts.eodCount === 1 ? "y" : "ies"} saved today`,
                color: "#f59e0b",
                reportPeriod: "eod",
              },
              {
                label: "MTD Total Premium",
                value: renewalCounts.mtdPremium ? formatMoney(renewalCounts.mtdPremium) : "₹0",
                subtext: `${renewalCounts.mtdCount} polic${renewalCounts.mtdCount === 1 ? "y" : "ies"} saved this month`,
                color: "#d97706",
                reportPeriod: "mtd",
              },
              {
                label: "YTD Total Premium",
                value: renewalCounts.ytdPremium ? formatMoney(renewalCounts.ytdPremium) : "₹0",
                subtext: `${renewalCounts.ytdCount} polic${renewalCounts.ytdCount === 1 ? "y" : "ies"} saved this year`,
                color: "var(--accent)",
                reportPeriod: "ytd",
              },
              {
                label: "Expired Premium",
                value: renewalCounts.expiredPremium ? formatMoney(renewalCounts.expiredPremium) : "₹0",
                subtext: `${renewalCounts.expired} expired polic${renewalCounts.expired === 1 ? "y" : "ies"}`,
                color: "#dc2626",
                reportPeriod: "expired",
              },
              {
                label: "Renewed Premium",
                value: renewalCounts.renewedPremium ? formatMoney(renewalCounts.renewedPremium) : "₹0",
                subtext: `${renewalCounts.renewed} renewed polic${renewalCounts.renewed === 1 ? "y" : "ies"}`,
                color: "#10b981",
                reportPeriod: "renewed",
              },
              {
                label: "Lost Premium",
                value: renewalCounts.lostPremium ? formatMoney(renewalCounts.lostPremium) : "₹0",
                subtext: `${renewalCounts.lost} lost polic${renewalCounts.lost === 1 ? "y" : "ies"}`,
                color: "#6b7280",
                reportPeriod: "lost",
              },
            ].map((item) => (
              <article
                key={item.label}
                onClick={() => {
                  router.push(`/premium-reports/${item.reportPeriod}`);
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
                  boxShadow: "var(--shadow-soft)",
                }}
                className="customer-card clickable-card"
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "6px",
                    backgroundColor: item.color,
                  }}
                />
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {item.label}
                </p>
                <strong
                  style={{
                    display: "block",
                    fontSize: "24px",
                    fontWeight: "800",
                    color: "var(--text-primary)",
                    marginTop: "8px",
                  }}
                >
                  {item.value}
                </strong>
                <small
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "var(--text-secondary)",
                    marginTop: "4px",
                  }}
                >
                  {item.subtext}
                </small>
              </article>
            ))}
          </section>



          <section className="bento-grid">
            <div className="left-stack">
              <section
                className={`upload-zone ${isUploadDragging ? "drag-active" : ""}`}
                onDragEnter={handleUploadDragOver}
                onDragOver={handleUploadDragOver}
                onDragLeave={handleUploadDragLeave}
                onDrop={handleUploadDrop}
              >
                <div className="zone-glow glow-a" />
                <div className="zone-glow glow-b" />
                <div className="zone-content">
                  <div className="zone-icon">
                    <Upload size={40} />
                  </div>
                  <h3>Drag or drop PDF files here</h3>
                  <p>
                    Upload one or many policy PDFs. Each file is classified, reviewed one by one, then saved
                    after missing details are added.
                  </p>
                  <label className="browse-button">
                    Browse Files
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={(event) => {
                        handleFilePick(event.target.files);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </section>

              <section className="glass-panel queue-panel">
                <div className="queue-head">
                  <h4>
                    In-Queue <span>({selectedFiles.length} Files)</span>
                  </h4>
                  <div>
                    <span className="status-pill">
                      {queueSummaryLabel({ isUploading, selectedFiles, reviewCounts })}
                    </span>
                  </div>
                </div>
                <div className="queue-list">
                  {selectedFiles.length ? (
                    selectedFiles.map((file) => (
                      <article
                        className={`queue-card ${normalizeUploadStatus(file.status) === UPLOAD_STATUS.FAILED ? "failed" : ""} ${selectedUpload?.id === file.id ? "active" : ""}`}
                        key={file.id || file.name}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedUploadId(file.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") setSelectedUploadId(file.id);
                        }}
                      >
                        <div className="file-icon">
                          <FileText size={20} />
                        </div>
                        <div>
                          <div className="queue-line">
                            <p>{file.name}</p>
                            <div className="queue-card-actions">
                              <span>{queueLabel(file.status)}</span>
                              <button
                                aria-label={`Remove ${file.name} from queue`}
                                className="queue-remove"
                                title="Remove from queue"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeQueuedUpload(file.id);
                                }}
                              >
                                <X size={15} />
                              </button>
                            </div>
                          </div>
                          {hasUploadDetection(file.detection) ? (
                            <small className="policy-detect-badge">
                              {file.detection.bankSource?.name || "Unknown Source"} /{" "}
                              {file.detection.company?.name || "Unknown"} /{" "}
                              {file.detection.serviceCategory?.name || "Uncategorized"} /{" "}
                              {file.detection.policyType?.name || "Policy"} (
                              {Math.round((file.detection.confidenceScore || 0) * 100)}%)
                            </small>
                          ) : null}
                          {file.message ? <small className="queue-error">{file.message}</small> : null}
                          {normalizeUploadStatus(file.status) === UPLOAD_STATUS.FAILED ? (
                            <button
                              className="queue-retry"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                retryUpload(file);
                              }}
                            >
                              Retry extraction
                            </button>
                          ) : null}
                          <div className="mini-progress">
                            <i style={{ width: progressWidth(file.status) }} />
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <EmptyState>No files selected yet.</EmptyState>
                  )}
                </div>
              </section>
            </div>

            <FixedPolicyPreview
              upload={selectedUpload}
              isSaving={isSaving}
              onFieldChange={updateExtractedField}
              onClear={() =>
                selectedUpload ? updateSelectedUpload({ extractedData: {}, manualFields: [] }) : null
              }
              onSave={saveRecord}
            />
          </section>

          <section className="glass-panel table-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Saved Data</p>
                <h2>Extracted policy table</h2>
              </div>
            </div>
            <SearchBox
              value={query}
              placeholder="Search policy, insured, district..."
              onChange={(event) => setQuery(event.target.value)}
            />
            <RecordsTable records={filteredRecords} />
          </section>
        </>
      )}

      {activePage === "records" && (
        <section className="glass-panel table-panel records-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Admin Database</p>
              <h2>Saved policy records</h2>
            </div>
            <div className="actions">
              {canExportRecords ? (
                <>
                  <button type="button" disabled={!records.length} onClick={() => setIsExportModalOpen(true)}>
                    <Download size={17} /> Export As
                  </button>
                  <button
                    type="button"
                    disabled={!records.length}
                    onClick={() =>
                      download("policy-records.json", JSON.stringify(records, null, 2), "application/json")
                    }
                  >
                    <Download size={17} /> JSON
                  </button>
                </>
              ) : null}
            </div>
          </div>
          <div className="records-search-row">
            <SearchBox
              value={query}
              placeholder="Search policy, insured, district..."
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              className={activeRecordFilterCount ? "record-filter-toggle active" : "record-filter-toggle"}
              type="button"
              onClick={() => setIsRecordFilterOpen((open) => !open)}
            >
              <SlidersHorizontal size={17} />
              Filter{activeRecordFilterCount ? ` (${activeRecordFilterCount})` : ""}
            </button>
          </div>
          {isRecordFilterOpen ? (
            <div className="record-filter-panel">
              <label>
                <span>Filter Field</span>
                <select
                  value={recordFilterField}
                  onChange={(event) => {
                    setRecordFilterField(event.target.value);
                    updateRecordQueryParams({ filterField: event.target.value, page: 1 });
                  }}
                >
                  <option value="">Any field</option>
                  {FIELD_SETUP.map(([label, key]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Custom Data</span>
                <input
                  value={recordFilterValue}
                  placeholder="Type value to find..."
                  onChange={(event) => setRecordFilterValue(event.target.value)}
                  onBlur={() => updateRecordQueryParams({ filterValue: recordFilterValue, page: 1 })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      updateRecordQueryParams({ filterValue: recordFilterValue, page: 1 });
                    }
                  }}
                />
              </label>
              <label>
                <span>PDF Status</span>
                <select
                  value={recordPdfFilter}
                  onChange={(event) => {
                    setRecordPdfFilter(event.target.value);
                    updateRecordQueryParams({ pdfFilter: event.target.value, page: 1 });
                  }}
                >
                  <option value="all">All records</option>
                  <option value="with">With PDF</option>
                  <option value="missing">Missing PDF</option>
                </select>
              </label>
              <label>
                <span>Date Filter</span>
                <select
                  value={recordDatePreset}
                  onChange={(event) => {
                    setRecordDatePreset(event.target.value);
                    const isCustom = event.target.value === "custom";
                    if (!isCustom) {
                      setRecordStartDate("");
                      setRecordEndDate("");
                    }
                    updateRecordQueryParams({
                      datePreset: event.target.value,
                      startDate: isCustom ? recordStartDate : "",
                      endDate: isCustom ? recordEndDate : "",
                      page: 1,
                    });
                  }}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last-3-days">Last 3 Days</option>
                  <option value="this-week">This Week</option>
                  <option value="last-week">Last Week</option>
                  <option value="this-month">This Month</option>
                  <option value="last-month">Last Month</option>
                  <option value="last-3-months">Last 3 Months</option>
                  <option value="last-6-months">Last 6 Months</option>
                  <option value="this-year">This Year</option>
                  <option value="last-year">Last Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </label>
              {recordDatePreset === "custom" && (
                <>
                  <label>
                    <span>Start Date</span>
                    <input
                      type="date"
                      value={recordStartDate}
                      onChange={(event) => {
                        setRecordStartDate(event.target.value);
                        updateRecordQueryParams({ startDate: event.target.value, page: 1 });
                      }}
                    />
                  </label>
                  <label>
                    <span>End Date</span>
                    <input
                      type="date"
                      value={recordEndDate}
                      onChange={(event) => {
                        setRecordEndDate(event.target.value);
                        updateRecordQueryParams({ endDate: event.target.value, page: 1 });
                      }}
                    />
                  </label>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setRecordFilterField("");
                  setRecordFilterValue("");
                  setRecordPdfFilter("all");
                  setRecordStartDate("");
                  setRecordEndDate("");
                  setRecordDatePreset("all");
                  updateRecordQueryParams({
                    filterField: "",
                    filterValue: "",
                    pdfFilter: "all",
                    startDate: "",
                    endDate: "",
                    datePreset: "all",
                    page: 1,
                  });
                }}
              >
                Clear
              </button>
              <button
                aria-label="Close filter panel"
                className="record-filter-close"
                type="button"
                onClick={() => setIsRecordFilterOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
          ) : null}
          <div className="record-view-tabs" aria-label="Policy record views">
            {recordViewOptions.map((option) => (
              <button
                key={option.key}
                className={recordViewCategory === option.key ? "active" : ""}
                type="button"
                onClick={() => {
                  setRecordViewCategory(option.key);
                  updateRecordQueryParams({ viewCategory: option.key, page: 1 });
                }}
              >
                {option.label}
                <span>{option.count}</span>
              </button>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            {isNavigating && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255, 255, 255, 0.4)",
                  backdropFilter: "blur(4px)",
                  zIndex: 10,
                  borderRadius: "12px",
                  transition: "all 0.2s ease-in-out",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                    padding: "24px 36px",
                    borderRadius: "16px",
                    background: "var(--surface)",
                    boxShadow: "var(--shadow-soft)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <LoaderCircle className="spin" size={36} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                    Loading policies...
                  </span>
                </div>
              </div>
            )}
            <RecordsTable
              records={visiblePolicyRecordResults}
              columns={recordViewColumns}
              canEdit={canEditPolicyRecords}
              onEdit={startEditRecord}
              canDelete={canDeletePolicyRecords}
              onDelete={deletePolicyRecord}
              paginate={false}
            />
          </div>

          {/* Pagination Controls */}
          {activePage === "records" && totalPages > 1 && (
            <div
              className="table-pagination"
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "14px", color: "var(--text-secondary, #64748b)" }}>
                Showing page {currentPage} of {totalPages} ({totalCount} records found)
              </span>
              <div className="table-page-list" style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => handleRecordPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border, #cbd5e1)",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  Prev
                </button>
                {getPageNumbers(currentPage, totalPages).map((pNum, index) =>
                  pNum === "..." ? (
                    <span
                      key={`ellipsis-${index}`}
                      style={{ padding: "0 8px", color: "var(--text-secondary, #64748b)" }}
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={pNum}
                      type="button"
                      className={currentPage === pNum ? "active" : ""}
                      onClick={() => handleRecordPageChange(pNum)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border, #cbd5e1)",
                        background: currentPage === pNum ? "var(--primary, #1e3a8a)" : "#ffffff",
                        color: currentPage === pNum ? "#ffffff" : "var(--text-primary, #0f172a)",
                        cursor: "pointer",
                        fontWeight: currentPage === pNum ? "bold" : "normal",
                      }}
                    >
                      {pNum}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => handleRecordPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border, #cbd5e1)",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {typeof window !== "undefined" &&
        isExportModalOpen &&
        createPortal(
          <div
            className="tb-modal-backdrop"
            onClick={() => setIsExportModalOpen(false)}
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
              padding: "24px",
            }}
          >
            <div
              className="tb-modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#ffffff",
                borderRadius: "24px",
                boxShadow:
                  "0 25px 70px -10px rgba(0, 0, 0, 0.08), 0 10px 30px -15px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.03)",
                width: "100%",
                maxWidth: "480px",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                border: "none",
                animation: "modal-pop 320ms cubic-bezier(0.2, 0, 0, 1) both",
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
                  color: "#0f172a",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      color: "#64748b",
                    }}
                  >
                    Data Export
                  </span>
                  <h2 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>
                    Export Policy Records
                  </h2>
                </div>
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  aria-label="Close export dialog"
                  style={{
                    background: "rgba(15, 23, 42, 0.05)",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.05)")}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div
                style={{
                  padding: "24px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                  backgroundColor: "#ffffff",
                }}
              >
                {/* Format selection */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>Export Format</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                    {[
                      { value: "xlsx", label: "Excel (.xlsx)" },
                      { value: "csv", label: "CSV (.csv)" },
                      { value: "pdf", label: "PDF Tabular (.pdf)" },
                    ].map((fmt) => (
                      <button
                        key={fmt.value}
                        type="button"
                        onClick={() => setExportFormat(fmt.value)}
                        style={{
                          padding: "12px 8px",
                          borderRadius: "12px",
                          border: exportFormat === fmt.value ? "2px solid #0f172a" : "1px solid #cbd5e1",
                          backgroundColor: exportFormat === fmt.value ? "#f8fafc" : "#ffffff",
                          color: exportFormat === fmt.value ? "#0f172a" : "#475569",
                          fontWeight: "700",
                          fontSize: "13px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category selection */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    htmlFor="export-category-select"
                    style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}
                  >
                    Policy Category
                  </label>
                  <select
                    id="export-category-select"
                    value={exportCategory}
                    onChange={(e) => setExportCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "12px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      color: "#0f172a",
                      fontWeight: "600",
                      outline: "none",
                    }}
                  >
                    <option value="all">All Categories</option>
                    <option value="fire">Fire Policy</option>
                    <option value="warehouse">Warehouse Policy</option>
                    <option value="motor">Motor Policy</option>
                    <option value="non-motor">Non Motor Policy</option>
                  </select>
                </div>

                {/* Time duration selection */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    htmlFor="export-duration-select"
                    style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}
                  >
                    Time Duration
                  </label>
                  <select
                    id="export-duration-select"
                    value={exportDuration}
                    onChange={(e) => setExportDuration(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "12px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      color: "#0f172a",
                      fontWeight: "600",
                      outline: "none",
                    }}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="past-3-days">Past 3 Days</option>
                    <option value="past-week">Past Week</option>
                    <option value="past-month">Past Month</option>
                    <option value="past-3-months">Past 3 Months</option>
                    <option value="past-6-months">Past 6 Months</option>
                    <option value="past-year">Past Year</option>
                    <option value="custom">Custom Range...</option>
                  </select>
                </div>

                {/* Custom date pickers */}
                {exportDuration === "custom" && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      animation: "fade-in 0.2s ease-out",
                    }}
                  >
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>
                        Start Date
                      </span>
                      <input
                        type="date"
                        value={exportCustomStart}
                        onChange={(e) => setExportCustomStart(e.target.value)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13px",
                          color: "#0f172a",
                          fontWeight: "600",
                        }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>End Date</span>
                      <input
                        type="date"
                        value={exportCustomEnd}
                        onChange={(e) => setExportCustomEnd(e.target.value)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13px",
                          color: "#0f172a",
                          fontWeight: "600",
                        }}
                      />
                    </label>
                  </div>
                )}
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
                  backgroundColor: "#ffffff",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExportSubmit}
                  disabled={isExporting}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                    cursor: "pointer",
                    fontWeight: "700",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    opacity: isExporting ? 0.7 : 1,
                    transition: "background-color 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isExporting) {
                      e.currentTarget.style.backgroundColor = "#f8fafc";
                      e.currentTarget.style.borderColor = "#0f172a";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isExporting) {
                      e.currentTarget.style.backgroundColor = "#ffffff";
                      e.currentTarget.style.borderColor = "#cbd5e1";
                    }
                  }}
                >
                  {isExporting ? <LoaderCircle size={16} className="spin" /> : <Download size={16} />}
                  {isExporting ? "Exporting..." : "Download Export"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {editingRecord && (
        <PolicyDetailCard
          mode="edit"
          record={editingRecord}
          editForm={editForm}
          updateEditField={updateEditField}
          onClose={() => setEditingRecord(null)}
          onSave={saveEditedRecord}
          isSaving={isSaving}
        />
      )}

      {activePage === "field-setup" && <FieldSetupPanel />}

      {activePage === "manual-entry" && (
        <section className="glass-panel manual-entry-container">
          <div className="manual-selectors">
            <label>
              <span>Policy Family</span>
              <select value={manualGroupId} onChange={(e) => setManualGroupId(e.target.value)}>
                {POLICY_SCHEMA_LIBRARY.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Policy Type</span>
              <select value={manualPolicyId} onChange={(e) => setManualPolicyId(e.target.value)}>
                {manualGroup?.policies.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="preview-form-grouped">
            {manualGroupedFields.map((group) => (
              <fieldset key={group.title} className="preview-fieldset">
                <legend className="preview-legend">{group.title}</legend>
                <div className="preview-form">
                  {group.fields.map(([label, key]) => {
                    const contactPersonError = validateContactPerson(form.contactPerson);
                    const isContactNumber = key === "contactNumber";
                    const error =
                      key === "contactPerson"
                        ? contactPersonError
                        : isContactNumber
                          ? validateContactNumber(form.contactNumber)
                          : "";
                    return (
                      <PreviewField
                        key={key}
                        label={label}
                        value={form[key] || ""}
                        onChange={(value) => updateField(key, value)}
                        options={FIELD_OPTIONS[key]}
                        wide={["riskLocation", "description", "occupancy", "remark"].includes(key)}
                        error={error}
                        disabled={isContactNumber && Boolean(contactPersonError)}
                        insuredName={form.insuredName}
                        contactNumber={form.contactNumber}
                        email={form.email}
                      />
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="manual-actions">
            <button className="secondary-action" type="button" onClick={saveRecord} disabled={isSaving}>
              {isSaving ? <LoaderCircle size={18} className="spin" /> : <CheckCircle size={18} />}
              Save Manual Entry
            </button>
          </div>
        </section>
      )}

      {activePage === "customers" && (
        <section className="glass-panel customer-panel">
          {!selectedPolicy ? (
            <SearchBox
              value={query}
              placeholder="Search customers..."
              onChange={(event) => setQuery(event.target.value)}
            />
          ) : null}
          {selectedClient && selectedPolicy ? (
            <PolicyDetail
              client={selectedClient}
              record={selectedPolicy}
              onBack={() => router.push(`/customer-management/${encodeURIComponent(selectedClient.name)}`)}
            />
          ) : selectedClient ? (
            <ClientProfile
              client={selectedClient}
              onBack={() => {
                router.push("/customer-management");
              }}
              onPolicySelect={(policyId) => {
                router.push(
                  `/customer-management/${encodeURIComponent(selectedClient.name)}/policy/${policyId}`,
                );
              }}
            />
          ) : (
            <>
              <div className="customer-controls-row">
                <span className="customer-count-label">
                  Showing {clientProfiles.length ? customerStartIndex + 1 : 0}-
                  {Math.min(customerStartIndex + CUSTOMERS_PER_PAGE, clientProfiles.length)} of{" "}
                  {clientProfiles.length} customers
                </span>
                <div className="view-type-toggles">
                  <button
                    type="button"
                    className={customerViewType === "grid" ? "active" : ""}
                    onClick={() => setCustomerViewType("grid")}
                    title="Grid View"
                  >
                    <LayoutGrid size={18} /> Grid
                  </button>
                  <button
                    type="button"
                    className={customerViewType === "list" ? "active" : ""}
                    onClick={() => setCustomerViewType("list")}
                    title="List View"
                  >
                    <List size={18} /> List
                  </button>
                </div>
              </div>

              {clientProfiles.length ? (
                customerViewType === "grid" ? (
                  <div className="customer-grid">
                    {paginatedClients.map((client) => {
                      const firstLetter = client.name ? client.name.charAt(0).toUpperCase() : "?";
                      const vehicleNumbers = formatClientVehicleNumbers(client);

                      return (
                        <article className="customer-card" key={client.name}>
                          <div className="customer-card-header">
                            <div className="customer-avatar">{firstLetter}</div>
                            <div className="customer-title-block">
                              <h3 title={client.name}>{client.name}</h3>
                              <p className="customer-contact-text">
                                {client.customerId ? `ID: ${client.customerId} · ` : ""}
                                {client.contactNumber || "No contact recorded"}
                              </p>
                            </div>
                          </div>
                          <div className="customer-card-stats">
                            <div className="stat-item">
                              <span className="stat-label">Policies</span>
                              <strong className="stat-value">{client.policies.length}</strong>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Premium</span>
                              <strong className="stat-value">{formatMoney(client.premiumTotal)}</strong>
                            </div>
                          </div>
                          <div className="customer-card-details">
                            <div>
                              <span>District</span>
                              <p title={client.district || "-"}>{client.district || "-"}</p>
                            </div>
                            <div>
                              <span>Tehsil</span>
                              <p title={client.tehsil || "-"}>{client.tehsil || "-"}</p>
                            </div>
                            <div className="wide">
                              <span>Sum Insured</span>
                              <p>{formatMoney(client.sumInsuredTotal)}</p>
                            </div>
                            <div className="wide">
                              <span>Vehicle No.</span>
                              <p title={vehicleNumbers}>{vehicleNumbers}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="view-profile-btn"
                            onClick={() => {
                              router.push(`/customer-management/${encodeURIComponent(client.name)}`);
                            }}
                          >
                            View Profile
                          </button>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="customer-directory">
                    <div className="customer-directory-head">
                      <span>Customer</span>
                      <span>Policies</span>
                      <span>District</span>
                      <span>Tehsil</span>
                      <span>Vehicle No.</span>
                      <span>Premium</span>
                      <span>Sum Insured</span>
                      <span>Action</span>
                    </div>
                    {paginatedClients.map((client) => (
                      <article className="customer-row" key={client.name}>
                        <div className="customer-name-cell">
                          <strong>{client.name}</strong>
                          <small>
                            {client.customerId ? `ID: ${client.customerId} · ` : ""}
                            {client.contactNumber || "No contact recorded"}
                          </small>
                        </div>
                        <span>
                          {client.policies.length} polic{client.policies.length === 1 ? "y" : "ies"}
                        </span>
                        <span>{client.district || "-"}</span>
                        <span>{client.tehsil || "-"}</span>
                        <span title={formatClientVehicleNumbers(client)}>
                          {formatClientVehicleNumbers(client)}
                        </span>
                        <span>{formatMoney(client.premiumTotal)}</span>
                        <span>{formatMoney(client.sumInsuredTotal)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            router.push(`/customer-management/${encodeURIComponent(client.name)}`);
                          }}
                        >
                          View Profile
                        </button>
                      </article>
                    ))}
                  </div>
                )
              ) : (
                <EmptyState>No saved customers yet.</EmptyState>
              )}

              {clientProfiles.length > CUSTOMERS_PER_PAGE ? (
                <div className="table-pagination customer-pagination" aria-label="Customer pagination">
                  <span>
                    Showing {customerStartIndex + 1}-
                    {Math.min(customerStartIndex + CUSTOMERS_PER_PAGE, clientProfiles.length)} of{" "}
                    {clientProfiles.length}
                  </span>
                  <div className="table-page-list">
                    <button
                      type="button"
                      onClick={() => goToPage(customerPage - 1)}
                      disabled={customerPage === 1}
                    >
                      Prev
                    </button>
                    {customerPageNumbers.map((page, index) =>
                      page === "..." ? (
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
                            userSelect: "none",
                          }}
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          aria-current={customerPage === page ? "page" : undefined}
                          className={customerPage === page ? "active" : ""}
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
                      onClick={() => goToPage(customerPage + 1)}
                      disabled={customerPage === customerPageCount}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      )}

      {activePage === "analytics" && (
        <AnalyticsReports records={records} onEditRecord={startEditRecord} />
      )}

      {activePage === "settings" && (
        <section className="settings-grid">
          <section className="glass-panel">
            <p className="eyebrow">Database</p>
            <h2>Prisma + Neon</h2>
            <div className="settings-list">
              <div>
                <span>Stack</span>
                <strong>Next.js App Router</strong>
              </div>
              <div>
                <span>ORM</span>
                <strong>Prisma</strong>
              </div>
              <div>
                <span>Database</span>
                <strong>Neon PostgreSQL</strong>
              </div>
            </div>
          </section>
          <section className="glass-panel">
            <p className="eyebrow">Status</p>
            <h2>Current environment</h2>
            <div className="settings-list">
              <div>
                <span>Records loaded</span>
                <strong>{records.length}</strong>
              </div>
              <div>
                <span>Uploads queued</span>
                <strong>{selectedFiles.length}</strong>
              </div>
              <div>
                <span>Mock seed data</span>
                <strong>Removed</strong>
              </div>
            </div>
          </section>
        </section>
      )}
      {toast ? (
        <button className="toast" type="button" onClick={() => setToast("")}>
          <CheckCircle size={20} />
          <span>{toast}</span>
        </button>
      ) : null}
    </>
  );
}

function prepareUploadReviewData(upload) {
  const data = { ...(upload?.extractedData || {}) };
  const manualFields = upload?.manualFields || [];

  if (!manualFields.includes("contactNumber")) {
    data.contactNumber = "";
  }
  if (!manualFields.includes("contactPerson")) {
    data.contactPerson = "";
  }

  if (!isMotorPolicyData(data)) return data;

  data.riskLocation = "";
  data.district = "";
  data.tehsil = "";
  data.validIn = "";
  data.nomineeName = "";
  data.financerName = "";
  if (!manualFields.includes("fuelType") && !shouldUseExtractedFuelType(data)) {
    data.fuelType = "";
  }

  if (!manualFields.includes("variant") && !shouldUseExtractedVariant(data, upload)) {
    data.variant = "";
  }

  return data;
}

function formatClientVehicleNumbers(client) {
  const values = Array.from(
    new Set(
      (client?.policies || [])
        .map((record) => record.vehicleNumber || record.registrationNumber || "")
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );

  if (!values.length) return "-";
  if (values.length <= 2) return values.join(", ");
  return `${values.slice(0, 2).join(", ")} +${values.length - 2}`;
}

function isMotorPolicyData(data) {
  return Boolean(
    data.vehicleNumber ||
    data.registrationNumber ||
    data.engineNumber ||
    data.chassisNumber ||
    /\b(motor|private\s+car|two\s+wheeler|commercial\s+vehicle)\b/i.test(data.policyType || ""),
  );
}

function getDuplicatePolicyKey(record = {}) {
  const policyNumber = compactDuplicateValue(record.policyNumber);
  if (policyNumber) return `policy:${policyNumber}`;

  const fallbackParts = [
    record.insuranceCompany,
    record.insuredName,
    record.vehicleNumber || record.registrationNumber,
    record.expiryDate,
  ].map(compactDuplicateValue);

  if (fallbackParts.filter(Boolean).length < 3) return "";
  return `fallback:${fallbackParts.join("|")}`;
}

function compactDuplicateValue(value = "") {
  return String(value || "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
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
