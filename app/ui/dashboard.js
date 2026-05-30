"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "./dashboard.css";
import { getRecordSearchText } from "@/lib/search";
import { normalizeUploadStatus, UPLOAD_STATUS } from "@/lib/upload-status";
import { buildAnalytics, formatMoney, parseMoney } from "@/lib/analytics";
import PageHeader from "@/app/components/layout/PageHeader";
import RecordsTable from "@/app/components/RecordsTable";
import AlertCard from "@/app/components/shared/AlertCard";
import EmptyState from "@/app/components/shared/EmptyState";
import SearchBox from "@/app/components/shared/SearchBox";
import {
  CheckCircle,
  Download,
  FileText,
  Pencil,
  X,
  SlidersHorizontal,
  LoaderCircle,
  Trash2,
  Upload,
  LayoutGrid,
  List
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
  download
} from "@/app/lib/dashboard-helpers";
import PreviewField from "@/app/components/shared/PreviewField";
import FixedPolicyPreview from "@/app/components/upload/FixedPolicyPreview";
import FieldSetupPanel from "@/app/components/field-setup/FieldSetupPanel";
import ClientProfile from "@/app/components/customers/ClientProfile";
import PolicyDetail from "@/app/components/policies/PolicyDetail";
import AnalyticsReports from "@/app/components/analytics/AnalyticsReports";

const DASHBOARD_VIEW_KEY = "bimaheadquarter.dashboard.view";
const FIELD_OPTIONS = {
  fuelType: FUEL_TYPE_OPTIONS,
  modeOfPayment: PAYMENT_MODE_OPTIONS
};

export default function Dashboard({
  initialRecords,
  activePage: routeActivePage,
  selectedClientName: routeClientName,
  selectedPolicyId: routePolicyId
}) {
  const [activePage, setActivePage] = useState(routeActivePage || "bulk-entry");
  const [records, setRecords] = useState(initialRecords);
  const [renewalCounts, setRenewalCounts] = useState({
    due30: 0,
    due60: 0,
    due90: 0,
    expired: 0,
    renewed: 0,
    lost: 0
  });

  useEffect(() => {
    async function fetchHeaderData() {
      try {
        const res = await fetch("/api/dashboard/header-data");
        const data = await res.json();
        if (data.success && data.renewalCounts) {
          setRenewalCounts(data.renewalCounts);
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
  const [selectedClientName, setSelectedClientName] = useState(routeClientName || "");
  const [selectedPolicyId, setSelectedPolicyId] = useState(routePolicyId || "");
  const [hasLoadedView, setHasLoadedView] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerViewType, setCustomerViewType] = useState("grid");
  const [toast, setToast] = useState("");
  const [alert, setAlert] = useState(null);
  const [isRecordFilterOpen, setIsRecordFilterOpen] = useState(false);
  const [recordFilterField, setRecordFilterField] = useState("");
  const [recordFilterValue, setRecordFilterValue] = useState("");
  const [recordPdfFilter, setRecordPdfFilter] = useState("all");
  const [recordViewCategory, setRecordViewCategory] = useState("all");
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSaving, startSaving] = useTransition();
  const [isUploading, startUploading] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const [manualGroupId, setManualGroupId] = useState(POLICY_SCHEMA_LIBRARY[0]?.id || "");
  const manualGroup = POLICY_SCHEMA_LIBRARY.find((group) => group.id === manualGroupId) || POLICY_SCHEMA_LIBRARY[0];
  const [manualPolicyId, setManualPolicyId] = useState(manualGroup?.policies?.[0]?.id || "");
  const manualPolicy = manualGroup?.policies.find((policy) => policy.id === manualPolicyId) || manualGroup?.policies?.[0];

  const manualVisibleFields = manualPolicy?.fields?.length
    ? FIELD_SETUP.filter(([, key]) => manualPolicy.fields.includes(key) || MANUAL_REQUIRED_FIELDS.includes(key) || COMMON_REVIEW_FIELDS.includes(key))
    : FIELD_SETUP;

  const manualGroupedFields = FIELD_GROUPS.map(group => {
    const fieldsInGroup = manualVisibleFields.filter(([, key]) => group.fields.includes(key));
    return {
      title: group.title,
      fields: fieldsInGroup
    };
  }).filter(group => group.fields.length > 0);

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
        status: "saved"
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
    let ignore = false;
    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
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
    [records]
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
      const matchesField = recordFilterField && normalizedFilterValue
        ? String(record[recordFilterField] || "").toLowerCase().includes(normalizedFilterValue)
        : true;
      const matchesPdf =
        recordPdfFilter === "all" ||
        (recordPdfFilter === "with" && record.hasPdf) ||
        (recordPdfFilter === "missing" && !record.hasPdf);

      return matchesField && matchesPdf;
    });
  }, [filteredRecords, recordFilterField, recordFilterValue, recordPdfFilter]);
  const recordsWithSchema = useMemo(() => policyRecordResults.map((record) => ({
    record,
    validation: getReviewValidation({
      sourceFile: record.sourceFile || "",
      extractedData: record
    })
  })), [policyRecordResults]);
  const recordViewOptions = useMemo(() => {
    const categories = new Map();
    recordsWithSchema.forEach(({ validation }) => {
      const key = validation.resolvedSchema?.groupId || "general";
      const label = validation.resolvedSchema?.groupLabel || "General";
      const existing = categories.get(key) || { key, label, count: 0 };
      categories.set(key, { ...existing, count: existing.count + 1 });
    });
    return [{ key: "all", label: "All Records", count: policyRecordResults.length }, ...Array.from(categories.values())];
  }, [policyRecordResults.length, recordsWithSchema]);
  const visiblePolicyRecordResults = useMemo(() => {
    if (recordViewCategory === "all") return policyRecordResults;
    return recordsWithSchema
      .filter(({ validation }) => (validation.resolvedSchema?.groupId || "general") === recordViewCategory)
      .map(({ record }) => record);
  }, [policyRecordResults, recordViewCategory, recordsWithSchema]);
  const recordViewColumns = useMemo(() => {
    if (recordViewCategory === "all") return undefined;

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
      sourceFile: "col-source"
    };
    const selectedSchemas = recordsWithSchema
      .filter(({ validation }) => (validation.resolvedSchema?.groupId || "general") === recordViewCategory)
      .map(({ validation }) => validation);
    const visibleKeys = new Set(["customerId", "savedAt", "uploadedAt", "uploadedBy", "insuredName"]);
    selectedSchemas.forEach((validation) => {
      validation.visibleFields.forEach(([, key]) => visibleKeys.add(key));
    });
    visibleKeys.add("sourceFile");

    return ["customerId", "savedAt", "uploadedAt", "uploadedBy", ...FIELD_SETUP.map(([, key]) => key), "sourceFile"]
      .filter((key, index, list) => visibleKeys.has(key) && list.indexOf(key) === index)
      .map((key) => ({
        key,
        label: key === "savedAt" ? "Saved At" : key === "uploadedAt" ? "Uploaded At" : key === "uploadedBy" ? "Uploaded By" : fieldLabels.get(key) || key,
        className: classNames[key] || "col-default",
        format: key === "savedAt" || key === "uploadedAt" ? "dateTime" : undefined,
        primary: key === "insuredName",
        code: key === "policyNumber"
      }));
  }, [recordViewCategory, recordsWithSchema]);
  const activeRecordFilterCount = (recordFilterField && recordFilterValue.trim() ? 1 : 0) + (recordPdfFilter !== "all" ? 1 : 0);
  const clientProfiles = buildClientProfiles(filteredRecords, parseMoney);
  const CUSTOMERS_PER_PAGE = 12;
  const customerPageCount = Math.max(1, Math.ceil(clientProfiles.length / CUSTOMERS_PER_PAGE));
  const customerStartIndex = (customerPage - 1) * CUSTOMERS_PER_PAGE;
  const paginatedClients = useMemo(() => {
    return clientProfiles.slice(customerStartIndex, customerStartIndex + CUSTOMERS_PER_PAGE);
  }, [clientProfiles, customerStartIndex]);
  const customerPageNumbers = useMemo(
    () => Array.from({ length: customerPageCount }, (_, index) => index + 1),
    [customerPageCount]
  );
  const goToPage = (page) => {
    setCustomerPage(Math.min(Math.max(1, page), customerPageCount));
  };

  const selectedClient = selectedClientName
    ? buildClientProfiles(records, parseMoney).find((client) => client.name === selectedClientName)
    : null;

  const analytics = useMemo(() => buildAnalytics(filteredRecords), [filteredRecords]);
  const canEditPolicyRecords = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(currentUserRole);
  const editValidation = useMemo(() => getReviewValidation({
    sourceFile: editingRecord?.sourceFile || "",
    extractedData: editForm
  }), [editingRecord, editForm]);
  const editFieldGroups = useMemo(() => FIELD_GROUPS.map((group) => {
    const fieldsInGroup = editValidation.visibleFields.filter(([, key]) => group.fields.includes(key));
    return {
      title: group.title,
      fields: fieldsInGroup
    };
  }).filter((group) => group.fields.length > 0), [editValidation.visibleFields]);

  const handleSelectReport = (report) => {
    if (!report) return;
    router.push(`/analytics-reports/${encodeURIComponent(report.id)}`);
  };
  const selectedPolicy = selectedClient
    ? selectedClient.policies.find((record) => record.id === selectedPolicyId)
    : null;
  const selectedUpload = selectedFiles.find((file) => file.id === selectedUploadId) || selectedFiles.find((file) => normalizeUploadStatus(file.status) !== UPLOAD_STATUS.FAILED) || null;
  const reviewCounts = getReviewCounts(selectedFiles);

  const showRecordSaveActions = activePage === "bulk-entry" || activePage === "dashboard" || activePage === "manual-entry";

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
      message: `${files.length} file${files.length === 1 ? "" : "s"} selected. Keep this page open while the records are prepared.`
    });
    const queuedFiles = files.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}`,
      name: file.name,
      sourceFile: file.name,
      fileObject: file,
      status: UPLOAD_STATUS.PENDING
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
          body
        });

        if (!response.ok && response.status !== 422) {
          let message = "PDF extraction failed";
          try {
            const payload = await response.json();
            if (payload?.error) message = payload.error;
          } catch {}
          setSelectedFiles(queuedFiles.map((file) => ({
            ...file,
            status: UPLOAD_STATUS.FAILED
          })));
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
            manualFields: []
          })),
          ...failed.map((item) => ({
            id: item.id,
            name: item.sourceFile,
            sourceFile: item.sourceFile,
            fileObject: queuedFiles.find((file) => file.name === item.sourceFile)?.fileObject,
            status: UPLOAD_STATUS.FAILED,
            message: item.error
          }))
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
        setSelectedFiles(queuedFiles.map((file) => ({
          ...file,
          status: UPLOAD_STATUS.FAILED,
          message
        })));
        setAlert({ type: "error", title: "Upload failed", message });
        setToast(message);
      }
    });
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateSelectedUpload(updates) {
    setSelectedFiles((current) => current.map((file) => (
      file.id === selectedUpload?.id ? { ...file, ...updates } : file
    )));
  }

  function removeQueuedUpload(fileId) {
    const nextFiles = selectedFiles.filter((file) => file.id !== fileId);
    setSelectedFiles(nextFiles);

    if (selectedUploadId === fileId) {
      const nextSelected = nextFiles.find((file) => normalizeUploadStatus(file.status) !== UPLOAD_STATUS.FAILED) || nextFiles[0] || null;
      setSelectedUploadId(nextSelected?.id || "");
    }
  }

  function updateExtractedField(key, value) {
    if (!selectedUpload) return;
    updateSelectedUpload({
      extractedData: {
        ...(selectedUpload.extractedData || {}),
        [key]: value
      },
      manualFields: uniqueValues([...(selectedUpload.manualFields || []), key])
    });
  }

  function startEditRecord(record) {
    if (!canEditPolicyRecords) {
      setAlert({ type: "error", title: "Edit unavailable", message: "Only admin, super admin, and manager roles can edit policy records." });
      return;
    }
    const nextForm = FIELD_SETUP.reduce((payload, [, key]) => ({
      ...payload,
      [key]: record?.[key] ?? ""
    }), {});
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
        const reviewedData = editValidation.visibleFields.reduce((payload, [, key]) => ({
          ...payload,
          [key]: editForm[key] ?? ""
        }), {});
        const response = await fetch(`/api/policy-records/${editingRecord.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewedData
          })
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
        setRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
        setEditingRecord(null);
        setEditForm({});
        setAlert({ type: "success", title: "Record updated", message: updated.policyNumber || updated.insuredName || "Policy record updated successfully." });
        setToast("Policy record updated");
      } catch (error) {
        const message = error?.message || "Policy record could not be updated.";
        setAlert({ type: "error", title: "Update failed", message });
        setToast(message);
      }
    });
  }

  function retryUpload(file) {
    if (!file?.fileObject) {
      setAlert({ type: "error", title: "Retry unavailable", message: "Choose the PDF again to retry this failed file." });
      return;
    }
    handleFilePick([file.fileObject]);
  }

  function saveRecord() {
    startSaving(async () => {
      try {
        setAlert(null);
        const isDynamicPolicySave = (activePage === "bulk-entry" || activePage === "dashboard") && selectedUpload?.id;
        if ((activePage === "bulk-entry" || activePage === "dashboard") && !selectedUpload?.id) {
          setAlert({ type: "info", title: "No PDF selected", message: "Upload a policy PDF before saving a reviewed record." });
          return;
        }
        if (isDynamicPolicySave) {
          const uploadStatus = normalizeUploadStatus(selectedUpload.status);
          if (uploadStatus === UPLOAD_STATUS.FAILED) {
            setAlert({ type: "error", title: "Save failed", message: "This PDF failed extraction. Retry it before saving." });
            return;
          }
          if (uploadStatus === UPLOAD_STATUS.APPROVED) {
            setAlert({ type: "info", title: "Already saved", message: `${selectedUpload.sourceFile} is already saved.` });
            return;
          }
          const { missingRequired } = getReviewValidation(selectedUpload);
          if (missingRequired.length) {
            const message = formatReviewValidationError(missingRequired);
            setAlert({ type: "error", title: "Review incomplete", message });
            setToast("Fill required fields before saving");
            return;
          }
        } else if (activePage === "manual-entry") {
          const resolvedSchema = resolvePolicySchema(manualGroup?.id, manualPolicy?.id);
          const { missingRequired } = getReviewValidation(
            { sourceFile: form.sourceFile, extractedData: form },
            { resolvedSchema }
          );
          if (missingRequired.length) {
            const message = formatReviewValidationError(missingRequired);
            setAlert({ type: "error", title: "Review incomplete", message });
            setToast("Fill required fields before saving");
            return;
          }
        }
        const reviewedUploadData = isDynamicPolicySave ? prepareUploadReviewData(selectedUpload) : null;
        const response = await fetch(isDynamicPolicySave ? "/api/policy-records" : "/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isDynamicPolicySave ? {
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
            policySchemaId: ""
          } : form)
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
          const updatedFiles = selectedFiles.map((file) => (
            file.id === selectedUpload.id ? { ...file, status: UPLOAD_STATUS.APPROVED, savedRecordId: saved.id } : file
          ));
          const allUploadsSaved = updatedFiles.length > 0 && updatedFiles.every((file) => normalizeUploadStatus(file.status) === UPLOAD_STATUS.APPROVED);

          if (allUploadsSaved) {
            setSelectedFiles([]);
            setSelectedUploadId("");
          } else {
            setSelectedFiles(updatedFiles);
          }

          const nextUpload = updatedFiles.find((file) => {
            const status = normalizeUploadStatus(file.status);
            return file.id !== selectedUpload.id && status !== UPLOAD_STATUS.FAILED && status !== UPLOAD_STATUS.APPROVED;
          });
          if (nextUpload) {
            setSelectedUploadId(nextUpload.id);
          } else if (!allUploadsSaved) {
            const fallbackUpload = updatedFiles.find((file) => normalizeUploadStatus(file.status) === UPLOAD_STATUS.FAILED) || null;
            setSelectedUploadId(fallbackUpload?.id || "");
          }
        } else {
          setSelectedFiles([]);
          setForm(EMPTY_FORM);
        }
        setAlert({ type: "success", title: "Record saved", message: saved.sourceFile || "Policy record saved successfully." });
        setToast(`Saved ${saved.sourceFile}`);
      } catch (error) {
        const message = error?.message || "Record could not be saved.";
        setAlert({ type: "error", title: "Save failed", message });
        setToast(message);
      }
    });
  }

  function deleteAllRecords() {
    startSaving(async () => {
      try {
        const response = await fetch("/api/records", {
          method: "DELETE",
          headers: {
            "x-confirm-delete": "DELETE_ALL_POLICY_RECORDS"
          }
        });
        if (!response.ok) {
          setAlert({ type: "error", title: "Delete failed", message: "Policy records could not be deleted." });
          return;
        }
        setRecords([]);
        setAlert({ type: "success", title: "Records deleted", message: "All policy records were removed." });
        setToast("All policy records deleted");
      } catch (error) {
        setAlert({ type: "error", title: "Delete failed", message: error?.message || "Policy records could not be deleted." });
      }
    });
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

          {(activePage === "bulk-entry" || activePage === "dashboard") && (
            <>
              {/* Renewal Counters Grid */}
              <section style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "16px",
                marginBottom: "24px"
              }}>
                {[
                  { label: "Due in 30 Days", count: renewalCounts.due30, color: "#f59e0b", tab: "upcoming", days: "30" },
                  { label: "Due in 60 Days", count: renewalCounts.due60, color: "#d97706", tab: "upcoming", days: "60" },
                  { label: "Due in 90 Days", count: renewalCounts.due90, color: "var(--accent)", tab: "upcoming", days: "90" },
                  { label: "Expired Renewals", count: renewalCounts.expired, color: "#dc2626", tab: "expired", days: "" },
                  { label: "Renewed Policies", count: renewalCounts.renewed, color: "#10b981", tab: "renewed", days: "" },
                  { label: "Lost Renewals", count: renewalCounts.lost, color: "#6b7280", tab: "lost", days: "" }
                ].map((item) => (
                  <article
                    key={item.label}
                    onClick={() => {
                      let url = `/dashboard/renewals?tab=${item.tab}`;
                      if (item.days) {
                        url += `&days=${item.days}`;
                      }
                      router.push(url);
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
                    <p style={{
                      margin: 0,
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>{item.label}</p>
                    <strong style={{
                      display: "block",
                      fontSize: "28px",
                      fontWeight: "800",
                      color: "var(--text-primary)",
                      marginTop: "8px"
                    }}>{item.count}</strong>
                  </article>
                ))}
              </section>

              <section className="bento-grid">
                <div className="left-stack">
                  <section className="upload-zone">
                    <div className="zone-glow glow-a" />
                    <div className="zone-glow glow-b" />
                    <div className="zone-content">
                      <div className="zone-icon">
                        <Upload size={40} />
                      </div>
                      <h3>Drop PDF files here</h3>
                      <p>Upload one or many policy PDFs. Each file is classified, reviewed one by one, then saved after missing details are added.</p>
                      <label className="browse-button">
                        Browse Files
                        <input type="file" accept="application/pdf" multiple onChange={(event) => handleFilePick(event.target.files)} />
                      </label>
                    </div>
                  </section>

                  <section className="glass-panel queue-panel">
                    <div className="queue-head">
                      <h4>In-Queue <span>({selectedFiles.length} Files)</span></h4>
                      <div>
                        <span className="status-pill">{queueSummaryLabel({ isUploading, selectedFiles, reviewCounts })}</span>
                      </div>
                    </div>
                    <div className="queue-list">
                      {selectedFiles.length ? selectedFiles.map((file) => (
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
                          <div className="file-icon"><FileText size={20} /></div>
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
                            {file.detection?.policyType ? (
                              <small className="policy-detect-badge">
                                {file.detection.bankSource?.name || "Unknown Source"} / {file.detection.company?.name || "Unknown"} / {file.detection.serviceCategory?.name || "Uncategorized"} / {file.detection.policyType?.name}
                                {" "}({Math.round((file.detection.confidenceScore || 0) * 100)}%)
                              </small>
                            ) : null}
                            {file.message ? <small className="queue-error">{file.message}</small> : null}
                            {normalizeUploadStatus(file.status) === UPLOAD_STATUS.FAILED ? (
                              <button className="queue-retry" type="button" onClick={(event) => {
                                event.stopPropagation();
                                retryUpload(file);
                              }}>
                                Retry extraction
                              </button>
                            ) : null}
                            <div className="mini-progress"><i style={{ width: progressWidth(file.status) }} /></div>
                          </div>
                        </article>
                      )) : (
                        <EmptyState>No files selected yet.</EmptyState>
                      )}
                    </div>
                  </section>
                </div>

                <FixedPolicyPreview
                  upload={selectedUpload}
                  isSaving={isSaving}
                  onFieldChange={updateExtractedField}
                  onClear={() => selectedUpload ? updateSelectedUpload({ extractedData: {}, manualFields: [] }) : null}
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
                <SearchBox value={query} placeholder="Search policy, insured, district..." onChange={(event) => setQuery(event.target.value)} />
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
                  <button type="button" disabled={!records.length} onClick={() => download("policy-records.json", JSON.stringify(records, null, 2), "application/json")}>
                    <Download size={17} /> JSON
                  </button>
                  <button type="button" disabled={!records.length || isSaving} onClick={deleteAllRecords}>
                    <Trash2 size={17} /> Delete All
                  </button>
                </div>
              </div>
              <div className="records-search-row">
                <SearchBox value={query} placeholder="Search policy, insured, district..." onChange={(event) => setQuery(event.target.value)} />
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
                    <select value={recordFilterField} onChange={(event) => setRecordFilterField(event.target.value)}>
                      <option value="">Any field</option>
                      {FIELD_SETUP.map(([label, key]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Custom Data</span>
                    <input
                      value={recordFilterValue}
                      placeholder="Type value to find..."
                      onChange={(event) => setRecordFilterValue(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>PDF Status</span>
                    <select value={recordPdfFilter} onChange={(event) => setRecordPdfFilter(event.target.value)}>
                      <option value="all">All records</option>
                      <option value="with">With PDF</option>
                      <option value="missing">Missing PDF</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecordFilterField("");
                      setRecordFilterValue("");
                      setRecordPdfFilter("all");
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
                    onClick={() => setRecordViewCategory(option.key)}
                  >
                    {option.label}
                    <span>{option.count}</span>
                  </button>
                ))}
              </div>
              <RecordsTable
                records={visiblePolicyRecordResults}
                columns={recordViewColumns}
                canEdit={canEditPolicyRecords}
                onEdit={startEditRecord}
              />
            </section>
          )}

          {editingRecord ? (
            <div className="record-edit-backdrop" onClick={() => setEditingRecord(null)}>
              <section className="record-edit-modal" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
                <div className="record-edit-head">
                  <div>
                    <p className="eyebrow">{editValidation.resolvedSchema ? `${editValidation.resolvedSchema.groupLabel} / ${editValidation.resolvedSchema.policyName}` : "Policy Record"}</p>
                    <h2><Pencil size={18} /> Edit lead data</h2>
                  </div>
                  <button aria-label="Close edit form" className="record-edit-close" type="button" onClick={() => setEditingRecord(null)}>
                    <X size={18} />
                  </button>
                </div>
                <div className="record-edit-body">
                  <div className="preview-form-grouped">
                    {editFieldGroups.map((group) => (
                      <fieldset key={group.title} className="preview-fieldset">
                        <legend className="preview-legend">{group.title}</legend>
                        <div className="preview-form">
                          {group.fields.map(([label, key]) => (
                            <PreviewField
                              key={key}
                              label={label}
                              value={editForm[key] || ""}
                              onChange={(value) => updateEditField(key, value)}
                              options={FIELD_OPTIONS[key]}
                              wide={["riskLocation", "description", "occupancy", "remark"].includes(key)}
                            />
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                </div>
                <div className="record-edit-actions">
                  <button type="button" onClick={() => setEditingRecord(null)} disabled={isSaving}>
                    Cancel
                  </button>
                  <button className="secondary-action" type="button" onClick={saveEditedRecord} disabled={isSaving}>
                    {isSaving ? <LoaderCircle size={18} className="spin" /> : <CheckCircle size={18} />}
                    Save Changes
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {activePage === "field-setup" && (
            <FieldSetupPanel />
          )}

          {activePage === "manual-entry" && (
            <section className="glass-panel manual-entry-container">
              <div className="manual-selectors">
                <label>
                  <span>Policy Family</span>
                  <select value={manualGroupId} onChange={(e) => setManualGroupId(e.target.value)}>
                    {POLICY_SCHEMA_LIBRARY.map((group) => (
                      <option key={group.id} value={group.id}>{group.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Policy Type</span>
                  <select value={manualPolicyId} onChange={(e) => setManualPolicyId(e.target.value)}>
                    {manualGroup?.policies.map((policy) => (
                      <option key={policy.id} value={policy.id}>{policy.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="preview-form-grouped">
                {manualGroupedFields.map((group) => (
                  <fieldset key={group.title} className="preview-fieldset">
                    <legend className="preview-legend">{group.title}</legend>
                    <div className="preview-form">
                      {group.fields.map(([label, key]) => (
                        <PreviewField
                          key={key}
                          label={label}
                          value={form[key] || ""}
                          onChange={(value) => updateField(key, value)}
                          options={FIELD_OPTIONS[key]}
                          wide={["riskLocation", "description", "occupancy", "remark"].includes(key)}
                        />
                      ))}
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
                <SearchBox value={query} placeholder="Search customers..." onChange={(event) => setQuery(event.target.value)} />
              ) : null}
              {selectedClient && selectedPolicy ? (
                <PolicyDetail client={selectedClient} record={selectedPolicy} onBack={() => router.push(`/customer-management/${encodeURIComponent(selectedClient.name)}`)} />
              ) : selectedClient ? (
                <ClientProfile
                  client={selectedClient}
                  onBack={() => {
                    router.push("/customer-management");
                  }}
                  onPolicySelect={(policyId) => {
                    router.push(`/customer-management/${encodeURIComponent(selectedClient.name)}/policy/${policyId}`);
                  }}
                />
              ) : (
                <>
                  <div className="customer-controls-row">
                    <span className="customer-count-label">
                      Showing {clientProfiles.length ? customerStartIndex + 1 : 0}-{Math.min(customerStartIndex + CUSTOMERS_PER_PAGE, clientProfiles.length)} of {clientProfiles.length} customers
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
                                <div className="customer-avatar">
                                  {firstLetter}
                                </div>
                                <div className="customer-title-block">
                                  <h3 title={client.name}>{client.name}</h3>
                                  <p className="customer-contact-text">{client.contactNumber || "No contact recorded"}</p>
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
                              <small>{client.contactNumber || "No contact recorded"}</small>
                            </div>
                            <span>{client.policies.length} polic{client.policies.length === 1 ? "y" : "ies"}</span>
                            <span>{client.district || "-"}</span>
                            <span>{client.tehsil || "-"}</span>
                            <span title={formatClientVehicleNumbers(client)}>{formatClientVehicleNumbers(client)}</span>
                            <span>{formatMoney(client.premiumTotal)}</span>
                            <span>{formatMoney(client.sumInsuredTotal)}</span>
                            <button type="button" onClick={() => {
                              router.push(`/customer-management/${encodeURIComponent(client.name)}`);
                            }}>
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
                        Showing {customerStartIndex + 1}-{Math.min(customerStartIndex + CUSTOMERS_PER_PAGE, clientProfiles.length)} of {clientProfiles.length}
                      </span>
                      <div className="table-page-list">
                        <button type="button" onClick={() => goToPage(customerPage - 1)} disabled={customerPage === 1}>
                          Prev
                        </button>
                        {customerPageNumbers.map((page) => (
                          <button
                            aria-current={customerPage === page ? "page" : undefined}
                            className={customerPage === page ? "active" : ""}
                            key={page}
                            type="button"
                            onClick={() => goToPage(page)}
                          >
                            {page}
                          </button>
                        ))}
                        <button type="button" onClick={() => goToPage(customerPage + 1)} disabled={customerPage === customerPageCount}>
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
            <AnalyticsReports
              analytics={analytics}
              onSelectReport={handleSelectReport}
            />
          )}

          {activePage === "settings" && (
            <section className="settings-grid">
              <section className="glass-panel">
                <p className="eyebrow">Database</p>
                <h2>Prisma + Neon</h2>
                <div className="settings-list">
                  <div><span>Stack</span><strong>Next.js App Router</strong></div>
                  <div><span>ORM</span><strong>Prisma</strong></div>
                  <div><span>Database</span><strong>Neon PostgreSQL</strong></div>
                </div>
              </section>
              <section className="glass-panel">
                <p className="eyebrow">Status</p>
                <h2>Current environment</h2>
                <div className="settings-list">
                  <div><span>Records loaded</span><strong>{records.length}</strong></div>
                  <div><span>Uploads queued</span><strong>{selectedFiles.length}</strong></div>
                  <div><span>Mock seed data</span><strong>Removed</strong></div>
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
  const values = Array.from(new Set(
    (client?.policies || [])
      .map((record) => record.vehicleNumber || record.registrationNumber || "")
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  ));

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
    /\b(motor|private\s+car|two\s+wheeler|commercial\s+vehicle)\b/i.test(data.policyType || "")
  );
}
