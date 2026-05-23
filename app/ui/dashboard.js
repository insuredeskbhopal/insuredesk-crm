"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import "./dashboard.css";
import { getRecordSearchText } from "@/lib/search";
import { buildAnalytics, formatMoney, parseMoney } from "@/lib/analytics";
import AppShell from "@/app/components/layout/AppShell";
import KpiCard from "@/app/components/analytics/KpiCard";
import PageHeader from "@/app/components/layout/PageHeader";
import ReportPanel from "@/app/components/analytics/ReportPanel";
import ReportRow from "@/app/components/analytics/ReportRow";
import SideNav from "@/app/components/layout/SideNav";
import TopBar from "@/app/components/layout/TopBar";
import RecordsTable from "@/app/components/RecordsTable";
import AlertCard from "@/app/components/shared/AlertCard";
import EmptyState from "@/app/components/shared/EmptyState";
import PdfLink from "@/app/components/shared/PdfLink";
import SearchBox from "@/app/components/shared/SearchBox";
import {
  BarChart3,
  CheckCircle,
  Download,
  Edit3,
  FileCog,
  FileText,
  LoaderCircle,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  Users
} from "lucide-react";

const DASHBOARD_VIEW_KEY = "insurcrm.dashboard.view";

const NAV_ITEMS = [
  { id: "bulk-entry", label: "Bulk PDF Upload", icon: Upload },
  { id: "manual-entry", label: "Manual Policy Entry", icon: Edit3 },
  { id: "records", label: "Policy Records", icon: FileText },
  { id: "customers", label: "Customer Management", icon: Users },
  { id: "analytics", label: "Analytics & Reports", icon: BarChart3 },
  { id: "field-setup", label: "Field Setup", icon: FileCog },
  { id: "settings", label: "Settings", icon: Settings }
];

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
  validIn: ""
};

const FIELD_SETUP = [
  ["Sr No", "srNo"],
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
  ["Valid In", "validIn"]
];

export default function Dashboard({ initialRecords }) {
  const [activePage, setActivePage] = useState("bulk-entry");
  const [records, setRecords] = useState(initialRecords);
  const [query, setQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedClientName, setSelectedClientName] = useState("");
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [hasLoadedView, setHasLoadedView] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState("");
  const [alert, setAlert] = useState(null);
  const [isSaving, startSaving] = useTransition();
  const [isUploading, startUploading] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const router = useRouter();
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
        setSelectedClientName(policy.insuredName || "");
        setSelectedPolicyId(policy.id);
        setActivePage("customers");
        return;
      }
    }

    router.push(`/analytics/${report.id}`);
  };
  const selectedPolicy = selectedClient
    ? selectedClient.policies.find((record) => record.id === selectedPolicyId)
    : null;

  const showRecordSaveActions = activePage === "bulk-entry" || activePage === "dashboard" || activePage === "manual-entry";

  useEffect(() => {
    const savedView = loadDashboardView();
    setActivePage(savedView.activePage || "bulk-entry");
    setSelectedClientName(savedView.selectedClientName || "");
    setSelectedPolicyId(savedView.selectedPolicyId || "");
    setHasLoadedView(true);
  }, []);

  useEffect(() => {
    if (activePage !== "customers" && (selectedClientName || selectedPolicyId)) {
      setSelectedClientName("");
      setSelectedPolicyId("");
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
    setSelectedFiles(files.map((file) => ({
      name: file.name,
      status: "extracting"
    })));

    startUploading(async () => {
      try {
        const body = new FormData();
        files.forEach((file) => body.append("files", file));

        const response = await fetch("/api/records/upload", {
          method: "POST",
          body
        });

        if (!response.ok && response.status !== 422) {
          let message = "PDF extraction failed";
          try {
            const payload = await response.json();
            if (payload?.error) message = payload.error;
          } catch {}
          setSelectedFiles(files.map((file) => ({
            name: file.name,
            status: "failed"
          })));
          setAlert({ type: "error", title: "Upload failed", message });
          setToast(message);
          return;
        }

        const payload = await response.json();
        const extracted = Array.isArray(payload) ? payload : payload.records || [];
        const failed = Array.isArray(payload?.failed) ? payload.failed : [];

        if (extracted.length) {
          setRecords((current) => [...extracted, ...current]);
          setForm(extracted[0]);
        } else {
          setForm(EMPTY_FORM);
        }

        setSelectedFiles([
          ...extracted.map((record) => ({
            name: record.sourceFile,
            status: "saved"
          })),
          ...failed.map((item) => ({
            name: item.sourceFile,
            status: "failed",
            message: item.error
          }))
        ]);

        if (extracted.length && failed.length) {
          const message = `Saved ${extracted.length} PDF${extracted.length === 1 ? "" : "s"}; ${failed.length} failed`;
          setAlert({ type: "warning", title: "Upload partially completed", message });
          setToast(message);
        } else if (extracted.length) {
          const message = `Extracted and saved ${extracted.length} PDF${extracted.length === 1 ? "" : "s"}`;
          setAlert({ type: "success", title: "Upload complete", message });
          setToast(message);
        } else {
          const message = `No PDFs saved. ${failed.length} failed extraction`;
          setAlert({ type: "error", title: "No records were saved", message });
          setToast(message);
        }
      } catch (error) {
        const message = error?.message || "The upload request could not be completed.";
        setSelectedFiles(files.map((file) => ({
          name: file.name,
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

  function saveRecord() {
    startSaving(async () => {
      try {
        setAlert(null);
        const response = await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
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
        setSelectedFiles([]);
        setForm(EMPTY_FORM);
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
    <AppShell>
      <TopBar query={query} onQueryChange={setQuery} />
      <SideNav activePage={activePage} navItems={NAV_ITEMS} onPageChange={setActivePage} />

      <section className="content-canvas">
        <div className="page-inner">
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
                      <p>Upload one or many policy PDFs. Files are queued here, and the extracted data can be saved directly into Postgres.</p>
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
                        <span className="status-pill">{isUploading ? "Extracting" : selectedFiles.length ? "Saved to database" : "No files"}</span>
                      </div>
                    </div>
                    <div className="queue-list">
                      {selectedFiles.length ? selectedFiles.map((file) => (
                        <div className={`queue-card ${file.status === "failed" ? "failed" : ""}`} key={file.name}>
                          <div className="file-icon"><FileText size={20} /></div>
                          <div>
                            <div className="queue-line">
                              <p>{file.name}</p>
                              <span>{queueLabel(file.status)}</span>
                            </div>
                            {file.message ? <small className="queue-error">{file.message}</small> : null}
                            <div className="mini-progress"><i style={{ width: file.status === "saved" ? "100%" : file.status === "failed" ? "100%" : "65%" }} /></div>
                          </div>
                        </div>
                      )) : (
                        <EmptyState>No files selected yet.</EmptyState>
                      )}
                    </div>
                  </section>
                </div>

                <section className="glass-panel preview-panel">
                  <div className="preview-head">
                    <div>
                      <h4>Data Preview</h4>
                      <p>Editing: <span>{form.sourceFile || "No file selected"}</span></p>
                    </div>
                    <strong><CheckCircle size={15} /> Database Ready</strong>
                  </div>

                  <div className="preview-body">
                    <div className="preview-form">
                      <PreviewField label="Sr No" value={form.srNo} onChange={(value) => updateField("srNo", value)} />
                      <PreviewField label="Source File" value={form.sourceFile} onChange={(value) => updateField("sourceFile", value)} wide />
                      <PreviewField label="Insured Name" value={form.insuredName} onChange={(value) => updateField("insuredName", value)} />
                      <PreviewField label="Contact No." value={form.contactNumber} onChange={(value) => updateField("contactNumber", value)} />
                      <PreviewField label="Contact Person Name" value={form.contactPerson} onChange={(value) => updateField("contactPerson", value)} />
                      <PreviewField label="Group Name" value={form.groupName} onChange={(value) => updateField("groupName", value)} />
                      <PreviewField label="Policy No." value={form.policyNumber} onChange={(value) => updateField("policyNumber", value)} />
                      <PreviewField label="Policy Type" value={form.policyType} onChange={(value) => updateField("policyType", value)} />
                      <PreviewField label="Sum Insured" value={form.sumInsured} onChange={(value) => updateField("sumInsured", value)} />
                      <PreviewField label="Premium" value={form.premium} onChange={(value) => updateField("premium", value)} />
                      <PreviewField label="Start Date" value={form.startDate} onChange={(value) => updateField("startDate", value)} />
                      <PreviewField label="Expiry Date" value={form.expiryDate} onChange={(value) => updateField("expiryDate", value)} />
                      <PreviewField label="Duration" value={form.duration} onChange={(value) => updateField("duration", value)} />
                      <PreviewField label="Risk Location" value={form.riskLocation} onChange={(value) => updateField("riskLocation", value)} wide />
                      <PreviewField label="District" value={form.district} onChange={(value) => updateField("district", value)} />
                      <PreviewField label="Tehsil" value={form.tehsil} onChange={(value) => updateField("tehsil", value)} />
                      <PreviewField label="Insurance Company" value={form.insuranceCompany} onChange={(value) => updateField("insuranceCompany", value)} wide />
                      <PreviewField label="Description / Non Declaration" value={form.description} onChange={(value) => updateField("description", value)} wide />
                      <PreviewField label="PPT / MPWLC" value={form.pptMpwlc} onChange={(value) => updateField("pptMpwlc", value)} />
                      <PreviewField label="Occupancy" value={form.occupancy} onChange={(value) => updateField("occupancy", value)} wide />
                      <PreviewField label="Valid In" value={form.validIn} onChange={(value) => updateField("validIn", value)} />
                    </div>
                  </div>

                  <div className="preview-actions">
                    <button type="button" onClick={() => setForm(EMPTY_FORM)}><Trash2 size={18} /> Clear</button>
                    <button className="secondary-action" type="button" onClick={saveRecord} disabled={isSaving}>
                      {isSaving ? <LoaderCircle size={18} className="spin" /> : <CheckCircle size={18} />}
                      Verify & Save
                    </button>
                  </div>
                </section>
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
            <section className="glass-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Configuration</p>
                  <h2>Prisma-backed field setup</h2>
                </div>
                <button type="button"><ShieldCheck size={17} /> Prisma Schema Active</button>
              </div>
              <div className="setup-list">
                {FIELD_SETUP.map(([label, key]) => (
                  <div className="field-row" key={key}>
                    <label>
                      <span>Field Name</span>
                      <input value={label} readOnly />
                    </label>
                    <label>
                      <span>Prisma Key</span>
                      <input value={key} readOnly />
                    </label>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activePage === "manual-entry" && (
            <section className="glass-panel manual-grid">
              {FIELD_SETUP.slice(0, 8).map(([label, key]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input value={form[key] || ""} onChange={(event) => updateField(key, event.target.value)} />
                </label>
              ))}
              <button className="secondary-action" type="button" onClick={saveRecord} disabled={isSaving}>
                {isSaving ? <LoaderCircle size={18} className="spin" /> : <CheckCircle size={18} />}
                Save Manual Entry
              </button>
            </section>
          )}

          {activePage === "customers" && (
            <section className="glass-panel customer-panel">
              {!selectedPolicy ? (
                <SearchBox value={query} placeholder="Search customers..." onChange={(event) => setQuery(event.target.value)} />
              ) : null}
              {selectedClient && selectedPolicy ? (
                <PolicyDetail client={selectedClient} record={selectedPolicy} onBack={() => setSelectedPolicyId("")} />
              ) : selectedClient ? (
                <ClientProfile
                  client={selectedClient}
                  onBack={() => {
                    setSelectedPolicyId("");
                    setSelectedClientName("");
                  }}
                  onPolicySelect={setSelectedPolicyId}
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
                        setSelectedPolicyId("");
                        setSelectedClientName(client.name);
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
                setSelectedPolicyId("");
                setSelectedClientName(clientName);
                setActivePage("customers");
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
        </div>
      </section>

      {toast ? (
        <button className="toast" type="button" onClick={() => setToast("")}>
          <CheckCircle size={20} />
          <span>{toast}</span>
        </button>
      ) : null}
    </AppShell>
  );
}

function PreviewField({ label, value, onChange, type = "text", wide }) {
  return (
    <label className={wide ? "wide" : ""}>
      <span>{label}</span>
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
  return (
    <div className="analytics-workspace">
      <section className="report-kpi-grid">
        {analytics.kpis.map((item) => (
          <KpiCard key={item.id} item={item} onClick={() => onSelectReport(item.report)} />
        ))}
      </section>

      <section className="analytics-chart-grid">
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
          title="District Performance"
          subtitle="Policy count by district. Click a bar for records."
          items={analytics.districts}
          max={analytics.maxDistrictCount}
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
          title="Premium by District"
          subtitle="Premium value behind each district."
          items={analytics.districtPremium}
          max={analytics.maxDistrictPremium}
          valueType="money"
          onSelect={onSelectReport}
        />
        <BarReport
          title="Policy Type Mix"
          subtitle="Product/type distribution."
          items={analytics.policyTypes}
          max={analytics.maxPolicyTypeCount}
          onSelect={onSelectReport}
        />
      </section>

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
    extracting: "Extracting",
    saved: "Saved",
    failed: "Failed"
  }[status] || "Queued";
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
