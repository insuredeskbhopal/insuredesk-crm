"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "./dashboard.css";
import { getRecordSearchText } from "@/lib/search";
import { buildAnalytics, formatMoney, parseMoney } from "@/lib/analytics";
import KpiCard from "@/app/components/analytics/KpiCard";
import PageHeader from "@/app/components/layout/PageHeader";
import ReportPanel from "@/app/components/analytics/ReportPanel";
import ReportRow from "@/app/components/analytics/ReportRow";
import RecordsTable from "@/app/components/RecordsTable";
import AlertCard from "@/app/components/shared/AlertCard";
import EmptyState from "@/app/components/shared/EmptyState";
import PdfLink from "@/app/components/shared/PdfLink";
import SearchBox from "@/app/components/shared/SearchBox";
import {
  CheckCircle,
  Download,
  FileText,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  Upload,
  Users
} from "lucide-react";

const DASHBOARD_VIEW_KEY = "insurcrm.dashboard.view";

const EMPTY_FORM = {
  srNo: "",
  sourceFile: "",
  status: "pending",
  insuredName: "",
  policyNumber: "",
  contactNumber: "",
  contactPerson: "",
  groupName: "",
  policyType: "",
  premium: "",
  sumInsured: "",
  startDate: "",
  expiryDate: "",
  duration: "",
  riskLocation: "",
  district: "",
  tehsil: "",
  insuranceCompany: "",
  description: "",
  pptMpwlc: "",
  occupancy: "",
  validIn: "",
  vehicleNumber: "",
  registrationNumber: "",
  makeModel: "",
  variant: "",
  manufacturingYear: "",
  registrationDate: "",
  engineNumber: "",
  chassisNumber: "",
  fuelType: "",
  cubicCapacity: "",
  seatingCapacity: "",
  grossVehicleWeight: "",
  idv: "",
  ncb: "",
  policyCoverType: "",
  rtoLocation: "",
  nomineeName: "",
  financerName: ""
};

const FIELD_SETUP = [
  ["Sr No", "srNo"],
  ["Source File", "sourceFile"],
  ["Insured Name", "insuredName"],
  ["Policy Number", "policyNumber"],
  ["Contact Number", "contactNumber"],
  ["Contact Person", "contactPerson"],
  ["Group Name", "groupName"],
  ["Policy Type", "policyType"],
  ["Premium", "premium"],
  ["Sum Insured", "sumInsured"],
  ["Start Date", "startDate"],
  ["Expiry Date", "expiryDate"],
  ["Duration", "duration"],
  ["Risk Location", "riskLocation"],
  ["District", "district"],
  ["Tehsil", "tehsil"],
  ["Insurance Company", "insuranceCompany"],
  ["Description", "description"],
  ["PPT / MPWLC", "pptMpwlc"],
  ["Occupancy", "occupancy"],
  ["Valid In", "validIn"],
  ["Vehicle Number", "vehicleNumber"],
  ["Registration Number", "registrationNumber"],
  ["Make / Model", "makeModel"],
  ["Variant", "variant"],
  ["Manufacturing Year", "manufacturingYear"],
  ["Registration Date", "registrationDate"],
  ["Engine Number", "engineNumber"],
  ["Chassis Number", "chassisNumber"],
  ["Fuel Type", "fuelType"],
  ["Cubic Capacity", "cubicCapacity"],
  ["Seating Capacity", "seatingCapacity"],
  ["Gross Vehicle Weight", "grossVehicleWeight"],
  ["IDV", "idv"],
  ["NCB", "ncb"],
  ["Cover Type", "policyCoverType"],
  ["RTO Location", "rtoLocation"],
  ["Nominee Name", "nomineeName"],
  ["Financer Name", "financerName"]
];

const MOTOR_COMMON_FIELDS = [
  "insuredName",
  "policyNumber",
  "policyType",
  "policyCoverType",
  "vehicleNumber",
  "registrationNumber",
  "makeModel",
  "variant",
  "manufacturingYear",
  "registrationDate",
  "engineNumber",
  "chassisNumber",
  "fuelType",
  "insuranceCompany",
  "premium",
  "idv",
  "startDate",
  "expiryDate",
  "duration",
  "ncb",
  "rtoLocation",
  "contactNumber",
  "financerName",
  "nomineeName",
  "validIn"
];

const POLICY_SCHEMA_LIBRARY = [
  {
    id: "fire",
    label: "Fire Policy",
    description: "Property and stock protection policies.",
    policies: [
      { id: "fire-standard", name: "Standard Fire", fields: ["insuredName", "policyNumber", "policyType", "sumInsured", "premium", "startDate", "expiryDate", "riskLocation", "district", "tehsil", "insuranceCompany", "description", "occupancy", "validIn"] },
      { id: "fire-sfsp", name: "SFSP", fields: ["insuredName", "policyNumber", "policyType", "sumInsured", "premium", "startDate", "expiryDate", "duration", "riskLocation", "district", "tehsil", "insuranceCompany", "description", "occupancy"] },
      { id: "fire-burglary", name: "Burglary", fields: ["insuredName", "policyNumber", "policyType", "sumInsured", "premium", "startDate", "expiryDate", "riskLocation", "district", "tehsil", "insuranceCompany", "description"] }
    ]
  },
  {
    id: "motor",
    label: "Motor Policy",
    description: "Car, bike, and commercial vehicle cover.",
    policies: [
      { id: "motor-private-car-package", name: "Private Car - Package", fields: [...MOTOR_COMMON_FIELDS, "sumInsured", "seatingCapacity"] },
      { id: "motor-private-car-third-party", name: "Private Car - Third Party", fields: MOTOR_COMMON_FIELDS.filter((key) => key !== "idv" && key !== "ncb").concat(["seatingCapacity"]) },
      { id: "motor-two-wheeler-package", name: "Two Wheeler - Package", fields: [...MOTOR_COMMON_FIELDS, "sumInsured", "cubicCapacity"] },
      { id: "motor-two-wheeler-third-party", name: "Two Wheeler - Third Party", fields: MOTOR_COMMON_FIELDS.filter((key) => key !== "idv" && key !== "ncb").concat(["cubicCapacity"]) },
      { id: "motor-goods-carrying", name: "Goods Carrying Vehicle", fields: [...MOTOR_COMMON_FIELDS, "grossVehicleWeight", "riskLocation", "sumInsured"] },
      { id: "motor-passenger-carrying", name: "Passenger Carrying Vehicle", fields: [...MOTOR_COMMON_FIELDS, "seatingCapacity", "grossVehicleWeight", "riskLocation", "sumInsured"] },
      { id: "motor-taxi-cab", name: "Taxi / Cab", fields: [...MOTOR_COMMON_FIELDS, "seatingCapacity", "sumInsured", "riskLocation"] },
      { id: "motor-school-bus", name: "School Bus", fields: [...MOTOR_COMMON_FIELDS, "seatingCapacity", "grossVehicleWeight", "groupName", "riskLocation"] },
      { id: "motor-fleet", name: "Fleet Policy", fields: [...MOTOR_COMMON_FIELDS, "groupName", "contactPerson", "riskLocation", "sumInsured"] }
    ]
  },
  {
    id: "life",
    label: "Life Policy",
    description: "Term, endowment, and savings-linked life policies.",
    policies: [
      { id: "life-term", name: "Term Life", fields: ["insuredName", "policyNumber", "contactNumber", "contactPerson", "policyType", "premium", "startDate", "expiryDate", "duration", "insuranceCompany", "description"] },
      { id: "life-endowment", name: "Endowment", fields: ["insuredName", "policyNumber", "contactNumber", "groupName", "policyType", "premium", "startDate", "expiryDate", "duration", "insuranceCompany", "validIn"] }
    ]
  },
  {
    id: "health",
    label: "Health Policy",
    description: "Individual, family, and group mediclaim.",
    policies: [
      { id: "health-individual", name: "Individual Health", fields: ["insuredName", "policyNumber", "contactNumber", "contactPerson", "policyType", "sumInsured", "premium", "startDate", "expiryDate", "duration", "insuranceCompany"] },
      { id: "health-family", name: "Family Floater", fields: ["insuredName", "policyNumber", "contactNumber", "groupName", "policyType", "sumInsured", "premium", "startDate", "expiryDate", "duration", "insuranceCompany", "description"] }
    ]
  },
  {
    id: "home",
    label: "Home Policy",
    description: "Home building and contents cover.",
    policies: [
      { id: "home-building", name: "Home Building", fields: ["insuredName", "policyNumber", "policyType", "sumInsured", "premium", "startDate", "expiryDate", "riskLocation", "district", "tehsil", "insuranceCompany", "description"] },
      { id: "home-contents", name: "Home Contents", fields: ["insuredName", "policyNumber", "policyType", "sumInsured", "premium", "startDate", "expiryDate", "riskLocation", "district", "tehsil", "insuranceCompany", "occupancy"] }
    ]
  },
  {
    id: "cyber",
    label: "Cyber Policy",
    description: "Cyber liability and breach response cover.",
    policies: [
      { id: "cyber-sme", name: "Cyber SME", fields: ["insuredName", "policyNumber", "contactNumber", "contactPerson", "policyType", "premium", "startDate", "expiryDate", "duration", "insuranceCompany", "description", "validIn"] },
      { id: "cyber-enterprise", name: "Cyber Enterprise", fields: ["insuredName", "policyNumber", "groupName", "policyType", "premium", "startDate", "expiryDate", "duration", "riskLocation", "insuranceCompany", "description"] }
    ]
  },
  {
    id: "misc",
    label: "Other Policies",
    description: "Marine, travel, liability, and custom formats.",
    policies: [
      { id: "marine", name: "Marine", fields: ["insuredName", "policyNumber", "policyType", "sumInsured", "premium", "startDate", "expiryDate", "insuranceCompany", "description", "validIn"] },
      { id: "travel", name: "Travel", fields: ["insuredName", "policyNumber", "contactNumber", "policyType", "premium", "startDate", "expiryDate", "duration", "insuranceCompany", "validIn"] },
      { id: "liability", name: "Liability", fields: ["insuredName", "policyNumber", "groupName", "policyType", "sumInsured", "premium", "startDate", "expiryDate", "insuranceCompany", "description"] }
    ]
  }
];

export default function Dashboard({
  initialRecords,
  activePage: routeActivePage,
  selectedClientName: routeClientName,
  selectedPolicyId: routePolicyId
}) {
  const [activePage, setActivePage] = useState(routeActivePage || "bulk-entry");
  const [records, setRecords] = useState(initialRecords);
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedUploadId, setSelectedUploadId] = useState("");
  const [selectedClientName, setSelectedClientName] = useState(routeClientName || "");
  const [selectedPolicyId, setSelectedPolicyId] = useState(routePolicyId || "");
  const [hasLoadedView, setHasLoadedView] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState("");
  const [alert, setAlert] = useState(null);
  const [isSaving, startSaving] = useTransition();
  const [isUploading, startUploading] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const [manualGroupId, setManualGroupId] = useState(POLICY_SCHEMA_LIBRARY[0]?.id || "");
  const manualGroup = POLICY_SCHEMA_LIBRARY.find((group) => group.id === manualGroupId) || POLICY_SCHEMA_LIBRARY[0];
  const [manualPolicyId, setManualPolicyId] = useState(manualGroup?.policies?.[0]?.id || "");
  const manualPolicy = manualGroup?.policies.find((policy) => policy.id === manualPolicyId) || manualGroup?.policies?.[0];

  const manualVisibleFields = manualPolicy?.fields?.length
    ? FIELD_SETUP.filter(([, key]) => manualPolicy.fields.includes(key))
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
  const clientProfiles = buildClientProfiles(filteredRecords);
  const selectedClient = selectedClientName
    ? buildClientProfiles(records).find((client) => client.name === selectedClientName)
    : null;

  const analytics = useMemo(() => buildAnalytics(filteredRecords), [filteredRecords]);

  const handleSelectReport = (report) => {
    if (!report) return;

    if (report.id && report.id.startsWith("high-value-")) {
      const policyId = report.value?.[0];
      const policy = records.find((r) => r.id === policyId);
      if (policy) {
        router.push(`/customer-management/${encodeURIComponent(policy.insuredName || "")}/policy/${policy.id}`);
        return;
      }
    }

    router.push(`/analytics-reports/${report.id}`);
  };
  const selectedPolicy = selectedClient
    ? selectedClient.policies.find((record) => record.id === selectedPolicyId)
    : null;
  const selectedUpload = selectedFiles.find((file) => file.id === selectedUploadId) || selectedFiles.find((file) => file.status !== "failed") || null;
  const reviewCounts = getReviewCounts(selectedFiles);

  const showRecordSaveActions = activePage === "bulk-entry" || activePage === "dashboard" || activePage === "manual-entry";

  useEffect(() => {
    const savedView = loadDashboardView();
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
    saveDashboardView({ activePage, selectedClientName, selectedPolicyId });
  }, [activePage, hasLoadedView, selectedClientName, selectedPolicyId]);

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
      status: "uploaded"
    }));
    setSelectedFiles(queuedFiles);
    setSelectedUploadId(queuedFiles[0]?.id || "");

    startUploading(async () => {
      try {
        const body = new FormData();
        files.forEach((file) => body.append("files", file));
        setSelectedFiles((current) => current.map((file) => ({ ...file, status: "extracting" })));

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
            status: "failed"
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
            status: record.status || "ready_for_review"
          })),
          ...failed.map((item) => ({
            id: item.id,
            name: item.sourceFile,
            sourceFile: item.sourceFile,
            fileObject: queuedFiles.find((file) => file.name === item.sourceFile)?.fileObject,
            status: "failed",
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
          status: "failed",
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
          if (selectedUpload.status === "failed") {
            setAlert({ type: "error", title: "Save failed", message: "This PDF failed extraction. Retry it before saving." });
            return;
          }
          if (selectedUpload.status === "saved") {
            setAlert({ type: "info", title: "Already saved", message: `${selectedUpload.sourceFile} is already saved.` });
            return;
          }
          const missingRequired = getMissingRequiredFields(selectedUpload);
          if (missingRequired.length) {
            const message = `Fill required field${missingRequired.length === 1 ? "" : "s"} before saving: ${missingRequired.join(", ")}.`;
            setAlert({ type: "error", title: "Review incomplete", message });
            setToast("Fill required fields before saving");
            return;
          }
        }
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
            reviewedData: selectedUpload.extractedData || {},
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
          updateSelectedUpload({ status: "saved", savedRecordId: saved.id });
          const nextUpload = selectedFiles.find((file) => file.id !== selectedUpload.id && file.status !== "failed" && file.status !== "saved");
          if (nextUpload) {
            setSelectedUploadId(nextUpload.id);
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
                          className={`queue-card ${file.status === "failed" ? "failed" : ""} ${selectedUpload?.id === file.id ? "active" : ""}`}
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
                              <span>{queueLabel(file.status)}</span>
                            </div>
                            {file.detection?.policyType ? (
                              <small className="policy-detect-badge">
                                {file.detection.bankSource?.name || "Unknown Source"} / {file.detection.company?.name || "Unknown"} / {file.detection.serviceCategory?.name || "Uncategorized"} / {file.detection.policyType?.name}
                                {" "}({Math.round((file.detection.confidenceScore || 0) * 100)}%)
                              </small>
                            ) : null}
                            {file.message ? <small className="queue-error">{file.message}</small> : null}
                            {file.status === "failed" ? (
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
              <SearchBox value={query} placeholder="Search policy, insured, district..." onChange={(event) => setQuery(event.target.value)} />
              <RecordsTable records={filteredRecords} />
            </section>
          )}

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
                          wide={["riskLocation", "description", "occupancy"].includes(key)}
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
                <div className="customer-directory">
                  <div className="customer-directory-head">
                    <span>Customer</span>
                    <span>Policies</span>
                    <span>District</span>
                    <span>Tehsil</span>
                    <span>Premium</span>
                    <span>Sum Insured</span>
                    <span>Action</span>
                  </div>
                  {clientProfiles.length ? clientProfiles.map((client) => (
                    <article className="customer-row" key={client.name}>
                      <div className="customer-name-cell">
                        <strong>{client.name}</strong>
                        <small>{client.contactNumber || "No contact recorded"}</small>
                      </div>
                      <span>{client.policies.length} polic{client.policies.length === 1 ? "y" : "ies"}</span>
                      <span>{client.district || "-"}</span>
                      <span>{client.tehsil || "-"}</span>
                      <span>{formatMoney(client.premiumTotal)}</span>
                      <span>{formatMoney(client.sumInsuredTotal)}</span>
                      <button type="button" onClick={() => {
                        router.push(`/customer-management/${encodeURIComponent(client.name)}`);
                      }}>
                        View Profile
                      </button>
                    </article>
                  )) : <EmptyState>No saved customers yet.</EmptyState>}
                </div>
              )}
            </section>
          )}

          {activePage === "analytics" && (
            <AnalyticsReports
              analytics={analytics}
              onSelectReport={handleSelectReport}
              onClientSelect={(clientName) => {
                router.push(`/customer-management/${encodeURIComponent(clientName)}`);
              }}
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

const FIELD_GROUPS = [
  {
    title: "Policy Details",
    fields: [
      "insuredName", "policyNumber", "insuranceCompany", "policyType", "premium", 
      "sumInsured", "startDate", "expiryDate", "duration", "policyCoverType", "pptMpwlc"
    ]
  },
  {
    title: "Vehicle Details",
    fields: [
      "vehicleNumber", "registrationNumber", "makeModel", "variant", "manufacturingYear", 
      "registrationDate", "engineNumber", "chassisNumber", "fuelType", "cubicCapacity", 
      "seatingCapacity", "grossVehicleWeight", "idv", "ncb", "rtoLocation"
    ]
  },
  {
    title: "Contact & Parties",
    fields: [
      "contactNumber", "contactPerson", "groupName", "nomineeName", "financerName"
    ]
  },
  {
    title: "Risk & Locations",
    fields: [
      "riskLocation", "district", "tehsil", "occupancy", "description", "validIn"
    ]
  }
];

function FixedPolicyPreview({ upload, isSaving, onFieldChange, onClear, onSave }) {
  const resolvedSchema = inferUploadSchema(upload);
  const visibleFields = resolvedSchema?.fields?.length
    ? FIELD_SETUP.filter(([, key]) => resolvedSchema.fields.includes(key))
    : FIELD_SETUP;
  const requiredKeys = resolvedSchema?.requiredFields?.length ? resolvedSchema.requiredFields : undefined;
  const missingRequired = getMissingRequiredFields(upload, visibleFields, requiredKeys);
  const filledFieldCount = visibleFields.filter(([, key]) => hasValue(upload?.extractedData?.[key])).length;

  const groupedFields = FIELD_GROUPS.map(group => {
    const fieldsInGroup = visibleFields.filter(([, key]) => group.fields.includes(key));
    return {
      title: group.title,
      fields: fieldsInGroup
    };
  }).filter(group => group.fields.length > 0);

  return (
    <section className="glass-panel preview-panel">
      <div className="preview-head">
        <div>
          <h4>Data Preview</h4>
          <p>Editing: <span>{upload?.sourceFile || "No file selected"}</span></p>
        </div>
        <strong><CheckCircle size={15} /> {reviewStatusLabel(upload, missingRequired)}</strong>
      </div>

      {!upload ? (
        <div className="preview-body">
          <EmptyState>Upload a policy PDF to load its dynamic preview.</EmptyState>
        </div>
      ) : (
        <>
          <div className="detection-summary">
            <div><span>Source File</span><strong>{upload.sourceFile || "-"}</strong></div>
            <div><span>Policy Type</span><strong>{upload.extractedData?.policyType || "-"}</strong></div>
            <div><span>Insurance Company</span><strong>{upload.extractedData?.insuranceCompany || "-"}</strong></div>
            <div><span>Schema</span><strong>{resolvedSchema ? `${resolvedSchema.groupLabel} / ${resolvedSchema.policyName}` : "General Review"}</strong></div>
            <div><span>Extraction</span><strong>{upload.extractionMethod || "unknown"}</strong></div>
            <div><span>Fields Filled</span><strong>{`${filledFieldCount}/${visibleFields.length}`}</strong></div>
            <div><span>Status</span><strong>{upload.status === "saved" ? "Database Ready" : "Ready for Review"}</strong></div>
          </div>

          {missingRequired.length ? (
            <section className="alert-card warning">
              <div className="alert-icon"><ShieldCheck size={18} /></div>
              <div>
                <strong>Manual details needed.</strong>
                <p>{missingRequired.join(", ")}</p>
              </div>
            </section>
          ) : null}

          <div className="preview-body">
            <div className="preview-form-grouped">
              {groupedFields.map((group) => (
                <fieldset key={group.title} className="preview-fieldset">
                  <legend className="preview-legend">{group.title}</legend>
                  <div className="preview-form">
                    {group.fields.map(([label, key]) => (
                      <PreviewField
                        key={key}
                        label={label}
                        meta={
                          hasValue(upload.extractedData?.[key])
                            ? ((upload.manualFields || []).includes(key) ? "Manual" : "")
                            : (requiredKeys?.includes(key) ? "Required" : "")
                        }
                        value={upload.extractedData?.[key] || ""}
                        onChange={(value) => onFieldChange(key, value)}
                        wide={["riskLocation", "description", "occupancy"].includes(key)}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </div>

          <div className="preview-actions">
            <button type="button" onClick={onClear}><Trash2 size={18} /> Clear</button>
            <button className="secondary-action" type="button" onClick={onSave} disabled={isSaving || upload.status === "saved" || Boolean(missingRequired.length)}>
              {isSaving ? <LoaderCircle size={18} className="spin" /> : <CheckCircle size={18} />}
              Verify & Save
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function FieldSetupPanel() {
  const [selectedGroupId, setSelectedGroupId] = useState(POLICY_SCHEMA_LIBRARY[0]?.id || "");
  const selectedGroup = POLICY_SCHEMA_LIBRARY.find((group) => group.id === selectedGroupId) || POLICY_SCHEMA_LIBRARY[0];
  const [selectedPolicyId, setSelectedPolicyId] = useState(selectedGroup?.policies?.[0]?.id || "");
  const selectedPolicy = selectedGroup?.policies.find((policy) => policy.id === selectedPolicyId) || selectedGroup?.policies?.[0];
  const visibleFields = FIELD_SETUP.filter(([, key]) => selectedPolicy?.fields.includes(key));

  useEffect(() => {
    if (!selectedGroup?.policies.some((policy) => policy.id === selectedPolicyId)) {
      setSelectedPolicyId(selectedGroup?.policies?.[0]?.id || "");
    }
  }, [selectedGroup, selectedPolicyId]);

  return (
    <section className="glass-panel field-setup-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2>Prisma-backed field setup</h2>
        </div>
        <button type="button"><ShieldCheck size={17} /> Prisma Schema Active</button>
      </div>
      <div className="schema-browser">
        <aside className="schema-groups">
          <p className="schema-title">Policy Families</p>
          <div className="schema-group-list">
            {POLICY_SCHEMA_LIBRARY.map((group) => (
              <button
                key={group.id}
                type="button"
                className={`schema-group-card ${group.id === selectedGroup?.id ? "active" : ""}`}
                onClick={() => setSelectedGroupId(group.id)}
              >
                <strong>{group.label}</strong>
                <span>{group.description}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="schema-catalog">
          <div className="schema-catalog-head">
            <div>
              <p className="schema-title">Schemas</p>
              <h3>{selectedGroup?.label}</h3>
            </div>
            <span>{selectedGroup?.policies.length || 0} formats</span>
          </div>
          <div className="schema-chip-list">
            {selectedGroup?.policies.map((policy) => (
              <button
                key={policy.id}
                type="button"
                className={`schema-chip ${policy.id === selectedPolicy?.id ? "active" : ""}`}
                onClick={() => setSelectedPolicyId(policy.id)}
              >
                {policy.name}
              </button>
            ))}
          </div>
          <div className="schema-meta">
            <div>
              <span>Selected Schema</span>
              <strong>{selectedPolicy?.name || "-"}</strong>
            </div>
            <div>
              <span>Mapped Fields</span>
              <strong>{visibleFields.length}</strong>
            </div>
          </div>
          <div className="table-wrap schema-table-wrap">
            <table className="schema-table">
              <colgroup>
                <col style={{ width: "34%" }} />
                <col style={{ width: "66%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Field Name</th>
                  <th>Prisma Key</th>
                </tr>
              </thead>
              <tbody>
                {visibleFields.map(([label, key]) => (
                  <tr key={key}>
                    <td>{label}</td>
                    <td><span className="record-code">{key}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

function PreviewField({ label, meta, value, onChange, type = "text", wide }) {
  const metaClass = meta ? `meta-${meta.toLowerCase().replace(" ", "-")}` : "";
  const labelEl = (
    <span>
      {label}
      {meta ? <em className={metaClass}>{meta}</em> : null}
    </span>
  );

  if (wide) {
    return (
      <label className="wide">
        {labelEl}
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  }

  return (
    <label>
      {labelEl}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ClientProfile({ client, onBack, onPolicySelect }) {
  return (
    <div className="client-profile">
      <div className="profile-head">
        <div className="profile-title-block">
          <div className="profile-avatar"><Users size={20} /></div>
          <div>
            <p className="eyebrow">Client Profile</p>
            <h2>{client.name}</h2>
            <span>
              {client.policies.length} linked polic{client.policies.length === 1 ? "y" : "ies"}
              {client.district ? ` · ${client.district}` : ""}
              {client.contactNumber ? ` · ${client.contactNumber}` : ""}
            </span>
          </div>
        </div>
        <button type="button" onClick={onBack}>Back to Clients</button>
      </div>

      <section className="profile-metrics">
        <Metric label="Total premium" value={formatMoney(client.premiumTotal)} />
        <Metric label="Total sum insured" value={formatMoney(client.sumInsuredTotal)} />
        <Metric label="District" value={client.district || "-"} />
        <Metric label="Contact" value={client.contactNumber || "-"} />
      </section>

      <div className="policy-table-card">
        <div className="policy-table-head">
          <h3>Linked Policies ({client.policies.length})</h3>
        </div>
        <div className="table-wrap compact-table">
          <table>
            <thead>
              <tr>
                <th>Policy No.</th>
                <th>Type</th>
                <th>Premium</th>
                <th>Sum Insured</th>
                <th>Effective Dates</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {client.policies.map((record) => (
                <tr key={record.id}>
                  <td>
                    <button className="policy-number-link" type="button" onClick={() => onPolicySelect(record.id)}>
                      {record.policyNumber || "No policy number"}
                    </button>
                  </td>
                  <td>{record.policyType || record.sourceFile || "Policy document"}</td>
                  <td>{formatMoney(record.premium)}</td>
                  <td>{formatMoney(record.sumInsured)}</td>
                  <td>{record.startDate || "-"} - {record.expiryDate || "-"}</td>
                  <td>
                    {record.hasPdf ? (
                      <PdfLink href={`/api/records/${record.id}/pdf`} title="Download PDF" ariaLabel="Download PDF" />
                    ) : (
                      <span className="missing-pdf compact">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PolicyDetail({ client, record, onBack }) {
  return (
    <div className="policy-detail-page">
      <div className="profile-head">
        <div className="profile-title-block">
          <div className="profile-avatar"><FileText size={20} /></div>
          <div>
            <p className="eyebrow">Policy Detail</p>
            <h2>{record.policyNumber || "No policy number"}</h2>
            <span>{client.name} {record.policyType ? `- ${record.policyType}` : ""}</span>
          </div>
        </div>
        <button type="button" onClick={onBack}>Back to Profile</button>
      </div>

      <section className="profile-metrics">
        <Metric label="Client" value={client.name} />
        <Metric label="Premium" value={formatMoney(record.premium)} />
        <Metric label="Sum insured" value={formatMoney(record.sumInsured)} />
        <Metric label="Validity" value={`${record.startDate || "-"} - ${record.expiryDate || "-"}`} />
      </section>

      <section className="policy-detail-grid">
        <DetailGroup title="Client Details" items={[
          ["Insured Name", client.name],
          ["Contact", client.contactNumber || record.contactNumber || "-"],
          ["District", record.district || client.district || "-"],
          ["Tehsil", record.tehsil || client.tehsil || "-"],
          ["Group Name", record.groupName || "-"],
          ["Contact Person", record.contactPerson || "-"]
        ]} />
        <DetailGroup title="Policy Details" items={[
          ["Policy No.", record.policyNumber || "-"],
          ["Policy Type", record.policyType || "-"],
          ["Insurance Company", record.insuranceCompany || "-"],
          ["Duration", record.duration || "-"],
          ["PPT / MPWLC", record.pptMpwlc || "-"],
          ["Valid In", record.validIn || "-"]
        ]} />
        <DetailGroup title="Risk & Description" wide items={[
          ["Risk Location", record.riskLocation || "-"],
          ["Occupancy", record.occupancy || "-"],
          ["Description / Non Declaration", record.description || "-"],
          ["Source File", record.sourceFile || record.pdfFileName || "-"]
        ]} />
      </section>

      {record.hasPdf ? (
        <PdfLink className="pdf-link policy-detail-pdf" href={`/api/records/${record.id}/pdf`}>
          <Download size={14} /> Download PDF
        </PdfLink>
      ) : null}
    </div>
  );
}

function DetailGroup({ title, items, wide }) {
  return (
    <section className={`detail-group ${wide ? "wide" : ""}`}>
      <h3>{title}</h3>
      <dl>
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}


function AnalyticsReports({ analytics, onSelectReport, onClientSelect }) {
  const [activeTab, setActiveTab] = useState("overview");

  const motorItem = analytics.policyFamilies.find((f) => f.label === "Motor Policy");
  const motorCount = motorItem ? motorItem.count : 0;

  const fireItem = analytics.policyFamilies.find((f) => f.label === "Fire Policy");
  const fireCount = fireItem ? fireItem.count : 0;

  const totalCount = analytics.policyFamilies.reduce((sum, item) => sum + item.count, 0);

  useEffect(() => {
    if (activeTab === "motor" && motorCount === 0) {
      setActiveTab("overview");
    } else if (activeTab === "fire" && fireCount === 0) {
      setActiveTab("overview");
    }
  }, [motorCount, fireCount, activeTab]);

  return (
    <div className="analytics-workspace">
      <div className="analytics-tabs">
        <button
          className={`analytics-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
          type="button"
        >
          General Overview
          <span className="tab-badge">{totalCount}</span>
        </button>
        {motorCount > 0 && (
          <button
            className={`analytics-tab-btn ${activeTab === "motor" ? "active" : ""}`}
            onClick={() => setActiveTab("motor")}
            type="button"
          >
            Motor Portfolio
            <span className="tab-badge">{motorCount}</span>
          </button>
        )}
        {fireCount > 0 && (
          <button
            className={`analytics-tab-btn ${activeTab === "fire" ? "active" : ""}`}
            onClick={() => setActiveTab("fire")}
            type="button"
          >
            Fire Portfolio
            <span className="tab-badge">{fireCount}</span>
          </button>
        )}
      </div>

      {activeTab === "overview" && (
        <>
          <section className="report-kpi-grid">
            {analytics.kpis.map((item) => (
              <KpiCard key={item.id} item={item} onClick={() => onSelectReport(item.report)} />
            ))}
          </section>

          <section className="analytics-chart-grid">
            <DonutReport
              title="Policy Families"
              subtitle="Distribution of policies by family type."
              items={analytics.policyFamilies}
              onSelect={onSelectReport}
            />
            <BarReport
              title="Premium by Family"
              subtitle="Premium value across policy families."
              items={analytics.familyPremium}
              max={analytics.maxFamilyPremium}
              valueType="money"
              onSelect={onSelectReport}
            />
            <DonutReport
              title="PDF Document Status"
              subtitle="With PDF vs missing PDF."
              items={analytics.pdfDistribution}
              onSelect={onSelectReport}
            />
            <DonutReport
              title="Renewal Buckets"
              subtitle="Upcoming and expired policies."
              items={analytics.renewals}
              onSelect={onSelectReport}
            />
            <BarReport
              title="Insurance Company"
              subtitle="Policy count by insurer. Click a bar for records."
              items={analytics.insurers}
              max={analytics.maxInsurerCount}
              onSelect={onSelectReport}
            />
            <BarReport
              title="Policy Type Mix"
              subtitle="Product/type distribution across all lines."
              items={analytics.policyTypes}
              max={analytics.maxPolicyTypeCount}
              onSelect={onSelectReport}
            />
          </section>
        </>
      )}

      {activeTab === "motor" && (
        <section className="analytics-chart-grid">
          <BarReport
            title="Vehicle Make"
            subtitle="Policy count by manufacturer/make."
            items={analytics.makeModels}
            max={analytics.maxMakeModelCount}
            onSelect={onSelectReport}
          />
          <BarReport
            title="Vehicle Type Mix"
            subtitle="Distribution of motor policy types."
            items={analytics.vehicleTypes}
            max={analytics.maxVehicleTypeCount}
            onSelect={onSelectReport}
          />
          <BarReport
            title="NCB Distribution"
            subtitle="No Claim Bonus bracket distribution."
            items={analytics.ncbBrackets}
            max={analytics.maxNcbBracketCount}
            onSelect={onSelectReport}
          />
        </section>
      )}

      {activeTab === "fire" && (
        <section className="analytics-chart-grid">
          <BarReport
            title="District Performance"
            subtitle="Policy count by district."
            items={analytics.districts}
            max={analytics.maxDistrictCount}
            onSelect={onSelectReport}
          />
          <BarReport
            title="Tehsil Performance"
            subtitle="Policy count by tehsil."
            items={analytics.tehsils}
            max={analytics.maxTehsilCount}
            onSelect={onSelectReport}
          />
          <BarReport
            title="Premium by District"
            subtitle="Premium value behind each district."
            items={analytics.districtPremium}
            max={analytics.maxDistrictPremium}
            valueType="money"
            onSelect={onSelectReport}
          />
        </section>
      )}

      <section className="report-grid">
        <ReportPanel title="Top Customers" subtitle="Click a customer to open their profile.">
          {analytics.customers.map((item) => (
            <button className="report-row" type="button" key={item.id} onClick={() => onClientSelect(item.name)}>
              <span>{item.name}</span>
              <strong>{formatMoney(item.premiumTotal)}</strong>
              <small>{item.policies.length} polic{item.policies.length === 1 ? "y" : "ies"}</small>
            </button>
          ))}
        </ReportPanel>

        <ReportPanel title="High Value Policies" subtitle="Largest sum insured policies.">
          {analytics.highValuePolicies.map((item) => (
            <ReportRow key={item.id} item={item} onClick={() => onSelectReport(item.report)} />
          ))}
        </ReportPanel>

        <ReportPanel title="Data Quality" subtitle="Find records your team should clean.">
          {analytics.quality.map((item) => (
            <ReportRow key={item.id} item={item} onClick={() => onSelectReport(item.report)} />
          ))}
        </ReportPanel>
      </section>
    </div>
  );
}

function DonutReport({ title, subtitle, items, onSelect }) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const gradient = buildDonutGradient(items);

  return (
    <section className="glass-panel report-panel chart-panel">
      <div>
        <p className="eyebrow">Pie Report</p>
        <h2>{title}</h2>
        <span>{subtitle}</span>
      </div>
      <div className="donut-report">
        <div className="donut-chart" style={{ background: gradient }}>
          <strong>{total}</strong>
          <span>Policies</span>
        </div>
        <div className="donut-legend">
          {items.map((item, index) => (
            <button type="button" key={item.id} onClick={() => onSelect(item.report)}>
              <i className={`chart-swatch swatch-${(index % 6) + 1}`} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function BarReport({ title, subtitle, items, max, valueType = "count", onSelect }) {
  return (
    <section className="glass-panel report-panel chart-panel">
      <div>
        <p className="eyebrow">Bar Report</p>
        <h2>{title}</h2>
        <span>{subtitle}</span>
      </div>
      <div className="report-list">
        {items.map((item) => (
          <ReportBar key={item.id} item={item} max={max} valueType={valueType} onClick={() => onSelect(item.report)} />
        ))}
      </div>
    </section>
  );
}

function ReportBar({ item, max, valueType = "count", onClick }) {
  const measure = valueType === "money" ? item.amount : item.count;
  const width = `${Math.max(4, (measure / Math.max(1, max)) * 100)}%`;

  return (
    <button className="report-bar-row" type="button" onClick={onClick}>
      <span>{item.label}</span>
      <div><i style={{ width }} /></div>
      <strong>{valueType === "money" ? formatMoney(item.amount) : item.count}</strong>
      <small>{item.hint}</small>
    </button>
  );
}

function buildDonutGradient(items) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!total) return "conic-gradient(var(--surface-highest) 0 100%)";

  const colors = ["#191c1d", "#74777f", "#c4c6cf", "#e1e3e4", "#a7abb3", "#5f6368"];
  let start = 0;
  const parts = items.map((item, index) => {
    const end = start + (Number(item.value || 0) / total) * 100;
    const part = `${colors[index % colors.length]} ${start}% ${end}%`;
    start = end;
    return part;
  });

  return `conic-gradient(${parts.join(", ")})`;
}

function getReviewCounts(files) {
  return files.reduce((counts, file) => {
    if (file.status === "saved") counts.saved += 1;
    else if (file.status === "failed") counts.failed += 1;
    else if (file.status === "extracting" || file.status === "uploaded") counts.processing += 1;
    else counts.pending += 1;
    return counts;
  }, { pending: 0, saved: 0, failed: 0, processing: 0 });
}

function queueSummaryLabel({ isUploading, selectedFiles, reviewCounts }) {
  if (isUploading) return "Extracting";
  if (!selectedFiles.length) return "No files";
  if (reviewCounts.pending) return `${reviewCounts.pending} ready for review`;
  if (reviewCounts.failed && !reviewCounts.saved) return `${reviewCounts.failed} failed`;
  if (reviewCounts.failed) return `${reviewCounts.saved} saved, ${reviewCounts.failed} failed`;
  return `${reviewCounts.saved} saved`;
}

function getMissingRequiredFields(upload, visibleFields = FIELD_SETUP, requiredKeys) {
  const visibleKeys = new Set(visibleFields.map(([, key]) => key));
  const requiredFieldPairs = [
    ["Insured Name", "insuredName"],
    ["Policy Number", "policyNumber"],
    ["Insurance Company", "insuranceCompany"],
    ["Premium", "premium"],
    ["Start Date", "startDate"],
    ["Expiry Date", "expiryDate"],
    ["Vehicle Number", "vehicleNumber"],
    ["Engine Number", "engineNumber"],
    ["Chassis Number", "chassisNumber"],
    ["IDV", "idv"],
    ["Cover Type", "policyCoverType"]
  ];
  const activeRequiredKeys = new Set(requiredKeys?.length ? requiredKeys : ["insuredName", "policyNumber"]);
  return requiredFieldPairs
    .filter(([, key]) => activeRequiredKeys.has(key) && visibleKeys.has(key) && !hasValue(upload?.extractedData?.[key]))
    .map(([label]) => label);
}

function reviewStatusLabel(upload, missingRequired) {
  if (!upload) return "Waiting";
  if (upload.status === "saved") return "Saved";
  if (upload.status === "failed") return "Failed";
  if (upload.status === "extracting" || upload.status === "uploaded") return "Extracting";
  if (missingRequired.length) return "Needs manual input";
  return "Ready for Review";
}

function hasValue(value) {
  if (typeof value === "boolean") return true;
  return String(value ?? "").trim().length > 0;
}

function inferUploadSchema(upload) {
  if (!upload) return null;

  const extracted = upload.extractedData || {};
  const haystack = [
    upload.sourceFile,
    extracted.policyType,
    extracted.insuranceCompany,
    extracted.description,
    extracted.vehicleNumber,
    extracted.registrationNumber,
    extracted.makeModel,
    extracted.riskLocation
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const family = inferPolicyFamily(haystack, extracted);
  if (!family) return null;

  const group = POLICY_SCHEMA_LIBRARY.find((item) => item.id === family);
  if (!group) return null;

  const policy = inferPolicySchemaWithinGroup(group, haystack, extracted);
  return {
    groupId: group.id,
    groupLabel: group.label,
    policyId: policy?.id || group.policies?.[0]?.id || "",
    policyName: policy?.name || group.policies?.[0]?.name || group.label,
    fields: policy?.fields || group.policies?.[0]?.fields || [],
    requiredFields: inferRequiredFields(group.id, policy?.id)
  };
}

function inferRequiredFields(groupId, policyId) {
  if (groupId === "motor") {
    const base = ["insuredName", "policyNumber", "insuranceCompany", "premium", "startDate", "expiryDate", "vehicleNumber", "engineNumber", "chassisNumber"];

    if (policyId === "motor-private-car-package" || policyId === "motor-two-wheeler-package") {
      return [...base, "idv"];
    }

    if (policyId === "motor-goods-carrying" || policyId === "motor-passenger-carrying" || policyId === "motor-taxi-cab" || policyId === "motor-school-bus") {
      return [...base, "policyCoverType"];
    }

    return base;
  }

  if (groupId === "fire") {
    return ["insuredName", "policyNumber", "insuranceCompany", "premium", "startDate", "expiryDate", "riskLocation"];
  }

  if (groupId === "health" || groupId === "life" || groupId === "home" || groupId === "cyber" || groupId === "misc") {
    return ["insuredName", "policyNumber", "insuranceCompany", "premium", "startDate", "expiryDate"];
  }

  return ["insuredName", "policyNumber"];
}

function inferPolicyFamily(haystack, extracted) {
  const hasMotorSignals =
    hasValue(extracted.vehicleNumber) ||
    hasValue(extracted.registrationNumber) ||
    hasValue(extracted.engineNumber) ||
    hasValue(extracted.chassisNumber) ||
    hasValue(extracted.idv) ||
    /\b(motor|private car|two wheeler|bike|scooter|commercial vehicle|taxi|cab|bus|chassis|engine)\b/.test(haystack);
  if (hasMotorSignals) return "motor";

  if (/\b(sfsp|fire|burglary|msme|warehouse|stock|property|contents)\b/.test(haystack)) return "fire";
  if (/\b(health|mediclaim|hospital|family floater|tpa)\b/.test(haystack)) return "health";
  if (/\b(term life|endowment|life policy|life assured|nominee)\b/.test(haystack)) return "life";
  if (/\b(home building|home contents|home policy)\b/.test(haystack)) return "home";
  if (/\b(cyber|ransomware|data breach|network security)\b/.test(haystack)) return "cyber";
  if (/\b(marine|travel|liability)\b/.test(haystack)) return "misc";

  return null;
}

function inferPolicySchemaWithinGroup(group, haystack, extracted) {
  if (group.id !== "motor") {
    if (group.id === "fire") {
      if (/\bburglary\b/.test(haystack)) return group.policies.find((item) => item.id === "fire-burglary");
      if (/\bsfsp\b/.test(haystack)) return group.policies.find((item) => item.id === "fire-sfsp");
    }
    return group.policies?.[0] || null;
  }

  if (/\b(two wheeler|bike|scooter)\b/.test(haystack) || hasValue(extracted.cubicCapacity)) {
    if (/\b(liability only|third party)\b/.test(haystack)) {
      return group.policies.find((item) => item.id === "motor-two-wheeler-third-party");
    }
    return group.policies.find((item) => item.id === "motor-two-wheeler-package");
  }
  if (/\bprivate car\b/.test(haystack) || hasValue(extracted.seatingCapacity) || hasValue(extracted.makeModel)) {
    if (/\b(liability only|third party)\b/.test(haystack)) {
      return group.policies.find((item) => item.id === "motor-private-car-third-party");
    }
    return group.policies.find((item) => item.id === "motor-private-car-package");
  }
  if (/\bschool bus\b/.test(haystack)) {
    return group.policies.find((item) => item.id === "motor-school-bus");
  }
  if (/\b(taxi|cab)\b/.test(haystack)) {
    return group.policies.find((item) => item.id === "motor-taxi-cab");
  }
  if (/\b(passenger carrying|passenger)\b/.test(haystack)) {
    return group.policies.find((item) => item.id === "motor-passenger-carrying");
  }
  if (/\b(goods carrying|commercial vehicle|goods vehicle)\b/.test(haystack) || hasValue(extracted.grossVehicleWeight)) {
    return group.policies.find((item) => item.id === "motor-goods-carrying");
  }
  if (/\bfleet\b/.test(haystack) || hasValue(extracted.groupName)) {
    return group.policies.find((item) => item.id === "motor-fleet");
  }

  return group.policies?.[0] || null;
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function pageTitle(page) {
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

function pageSubtitle(page) {
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

function buildClientProfiles(records) {
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

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function queueLabel(status) {
  return {
    uploaded: "Uploaded",
    extracting: "Extracting",
    ready_for_review: "Ready for review",
    needs_manual_classification: "Needs review",
    saved: "Saved",
    failed: "Failed"
  }[status] || "Classified";
}

function progressWidth(status) {
  return {
    uploaded: "20%",
    extracting: "50%",
    classified: "70%",
    ready_for_review: "90%",
    needs_manual_classification: "80%",
    saved: "100%",
    failed: "100%"
  }[status] || "65%";
}

function loadDashboardView() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(DASHBOARD_VIEW_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDashboardView(view) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(DASHBOARD_VIEW_KEY, JSON.stringify(view));
  } catch {}
}
