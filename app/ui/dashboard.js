"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "./dashboard.css";
import { getRecordSearchText } from "@/lib/search";
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
  LoaderCircle,
  Trash2,
  Upload
} from "lucide-react";
import { EMPTY_FORM } from "@/app/ui/dashboard/constants";
import {
  FIELD_SETUP,
  POLICY_SCHEMA_LIBRARY,
  FIELD_GROUPS,
  getReviewCounts,
  queueSummaryLabel,
  getMissingRequiredFields,
  pageTitle,
  pageSubtitle,
  buildClientProfiles,
  loadDashboardView,
  saveDashboardView,
  queueLabel,
  progressWidth,
  uniqueValues,
  download
} from "@/app/lib/dashboard-helpers";
import PreviewField from "@/app/components/shared/PreviewField";
import FixedPolicyPreview from "@/app/components/upload/FixedPolicyPreview";
import FieldSetupPanel from "@/app/components/field-setup/FieldSetupPanel";
import ClientProfile from "@/app/components/customers/ClientProfile";
import PolicyDetail from "@/app/components/policies/PolicyDetail";
import AnalyticsReports from "@/app/components/analytics/AnalyticsReports";

const DASHBOARD_VIEW_KEY = "bimaheadquarter.dashboard.view";

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
  const clientProfiles = buildClientProfiles(filteredRecords, parseMoney);
  const selectedClient = selectedClientName
    ? buildClientProfiles(records, parseMoney).find((client) => client.name === selectedClientName)
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


