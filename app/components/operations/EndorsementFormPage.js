"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  Expand,
  FileCheck2,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";
import { generateEndorsementSchedulePdf, getMissingScheduleFields } from "@/lib/endorsements/schedule-pdf";
import { EndorsementTemplatePreview } from "@/app/components/endorsements/templates/EndorsementTemplatePreview";
import {
  buildEndorsementScheduleData,
  buildFinalReviewedData,
  generateEndorsementWording,
  INSURER_TEMPLATES,
  resolveInsurerTemplateId,
} from "@/lib/endorsements/template-data";

const ENDORSEMENT_TYPES = [
  "Change in Address",
  "Increase in Sum Insured",
  "Decrease in Sum Insured",
  "Change in Situation / Location",
  "Addition of Warehouse / Property",
  "Deletion of Warehouse / Property",
  "Change in Occupancy",
  "Change in Stock Description",
  "Change in Hypothecation / Bank Details",
  "Correction in Insured Name",
  "Correction in Policy Details",
  "Other Endorsement",
];

const STATUS_OPTIONS = [
  "Draft",
  "Letter Generated",
  "Sent to Customer",
  "Pending Insurance Company Letter",
  "Insurance Company Letter Received",
  "Approved",
  "Rejected",
  "Cancelled",
];

const EMPTY_FORM = {
  endorsementNo: "",
  policyId: "",
  customerId: "",
  uploadedPolicyFileId: "",
  policyNo: "",
  insuredName: "",
  customerName: "",
  mailingAddress: "",
  insuranceCompany: "",
  policyType: "",
  policyStartDate: "",
  policyExpiryDate: "",
  sumInsured: "",
  address: "",
  warehouseDetails: "",
  endorsementType: "Change in Address",
  endorsementDate: today(),
  effectiveDate: today(),
  effectiveFrom: today(),
  effectiveTo: "",
  customerRequestDate: today(),
  dateOfIssue: today(),
  issuedOffice: "",
  financerDetails: "",
  premium: "",
  description: "",
  internalRemark: "",
  customerRemark: "",
  remark: "",
  oldValues: {},
  newValues: {},
  extractedPolicyData: {},
  rawExtractedData: {},
  finalReviewedData: {},
  generatedLetterPdfUrl: "",
  generatedLetterFileName: "",
  insuranceCompanyLetterPdfUrl: "",
  insuranceCompanyLetterFileName: "",
  status: "Draft",
};

export default function EndorsementFormPage({ endorsementId = "" }) {
  const isEdit = Boolean(endorsementId);
  const [form, setForm] = useState(EMPTY_FORM);
  const [policyFile, setPolicyFile] = useState(null);
  const [policyPreviewUrl, setPolicyPreviewUrl] = useState("");
  const [savedRecords, setSavedRecords] = useState([]);
  const [companyLetterName, setCompanyLetterName] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [extracting, setExtracting] = useState(false);
  const [lastExtractedFileName, setLastExtractedFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const previewRef = useRef(null);
  const lastGeneratedDescriptionRef = useRef("");

  useEffect(() => {
    loadSavedRecords();
    if (!isEdit) {
      setForm((current) => ({ ...current, endorsementNo: makeEndorsementNo() }));
      return;
    }
    let cancelled = false;
    async function loadRecord() {
      setLoading(true);
      try {
        const response = await fetch(`/api/endorsements/${endorsementId}`, { cache: "no-store" });
        const payload = await readJsonResponse(response);
        if (!cancelled) setForm({ ...EMPTY_FORM, ...payload });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Endorsement could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRecord();
    return () => {
      cancelled = true;
    };
  }, [endorsementId, isEdit]);

  useEffect(() => {
    if (!policyFile) {
      setPolicyPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(policyFile);
    setPolicyPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [policyFile]);

  useEffect(() => {
    if (!policyFile || extracting || lastExtractedFileName === policyFile.name) return;
    extractPolicy(policyFile);
  }, [policyFile]);

  const relevantFields = useMemo(() => getRelevantFields(form.endorsementType), [form.endorsementType]);
  const generatedDescription = useMemo(() => {
    const wordingData = buildEndorsementScheduleData({ ...form, description: "", endorsementWording: "" });
    return generateEndorsementWording(wordingData);
  }, [
    form.endorsementType,
    form.effectiveDate,
    form.effectiveFrom,
    form.oldValues,
    form.newValues,
    form.premium,
    form.extractedPolicyData,
  ]);
  const scheduleData = useMemo(() => buildEndorsementScheduleData(form), [form]);
  const selectedTemplateId = useMemo(
    () => resolveInsurerTemplateId(form.insuranceCompany),
    [form.insuranceCompany],
  );

  useEffect(() => {
    if (!generatedDescription) return;
    setForm((current) => {
      const currentWasGenerated =
        !current.description || current.description === lastGeneratedDescriptionRef.current;
      lastGeneratedDescriptionRef.current = generatedDescription;
      if (!currentWasGenerated || current.description === generatedDescription) return current;
      return { ...current, description: generatedDescription };
    });
  }, [generatedDescription]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateValue(bucket, key, value) {
    setForm((current) => ({
      ...current,
      [bucket]: {
        ...(current[bucket] || {}),
        [key]: value,
      },
    }));
  }

  function handlePolicyFile(file) {
    if (!file) return;
    if (file.type && file.type !== "application/pdf") {
      setError("Upload policy files as PDF only.");
      return;
    }
    setError("");
    setLastExtractedFileName("");
    setPolicyFile(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    handlePolicyFile(event.dataTransfer.files?.[0]);
  }

  async function loadSavedRecords() {
    try {
      const response = await fetch("/api/endorsements?limit=5", { cache: "no-store" });
      const payload = await readJsonResponse(response);
      setSavedRecords(Array.isArray(payload.endorsements) ? payload.endorsements.slice(0, 5) : []);
    } catch {
      setSavedRecords([]);
    }
  }

  async function extractPolicy(file = policyFile) {
    if (!file) {
      setError("Upload a policy PDF before extraction.");
      return;
    }
    setExtracting(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/endorsements/extract-policy", { method: "POST", body: formData });
      const payload = await readJsonResponse(response);
      if (!payload.extractedData) throw new Error("No extracted policy data was returned.");
      const extracted = normalizeExtractedPolicy(payload.extractedData, payload);
      setForm((current) => ({
        ...current,
        policyNo: extracted.policyNo || current.policyNo,
        insuredName: extracted.insuredName || current.insuredName,
        customerName: extracted.insuredName || current.customerName,
        mailingAddress: extracted.mailingAddress || current.mailingAddress,
        insuranceCompany: extracted.insuranceCompany || current.insuranceCompany,
        policyType: extracted.policyType || current.policyType,
        policyStartDate: extracted.policyStartDate || current.policyStartDate,
        policyExpiryDate: extracted.policyExpiryDate || current.policyExpiryDate,
        sumInsured: extracted.sumInsured || current.sumInsured,
        address: extracted.address || current.address,
        warehouseDetails: extracted.warehouseDetails || current.warehouseDetails,
        issuedOffice: extracted.issuedAt || current.issuedOffice,
        financerDetails: extracted.financerDetails || current.financerDetails,
        premium: extracted.premium || current.premium,
        extractedPolicyData: extracted.raw || payload.extractedData,
        rawExtractedData: extracted.raw || payload.extractedData,
        finalReviewedData: buildFinalReviewedData({ ...current, ...extracted }),
        oldValues: seedOldValues(current.endorsementType, extracted, current.oldValues),
      }));
      setLastExtractedFileName(file.name);
      setMessage("Policy data extracted. Review and correct the values before saving.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Policy extraction failed.");
    } finally {
      setExtracting(false);
    }
  }

  async function generatePdf(nextStatus = "Letter Generated") {
    setError("");
    try {
      const missing = getMissingScheduleFields(scheduleData);
      if (missing.length) {
        setError(`Enter required schedule fields before generating PDF: ${missing.join(", ")}.`);
        return null;
      }
      const reviewed = buildFinalReviewedData(form);
      const generated = await generateEndorsementSchedulePdf(form, scheduleData, previewRef.current);
      setForm((current) => ({
        ...current,
        finalReviewedData: reviewed,
        generatedLetterPdfUrl: generated.dataUrl,
        generatedLetterFileName: generated.fileName,
        status: nextStatus,
      }));
      setMessage("Insurer-style endorsement schedule draft generated and attached.");
      return generated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Endorsement schedule PDF could not be generated.");
      return null;
    }
  }

  async function saveEndorsement(status) {
    setSaving(true);
    setError("");
    setMessage("");
    const reviewed = buildFinalReviewedData(form);
    const rawData = form.extractedPolicyData?.raw || form.extractedPolicyData || {};
    let nextForm = {
      ...form,
      status,
      finalReviewedData: reviewed,
      rawExtractedData: rawData,
    };
    if (status !== "Draft" && !nextForm.generatedLetterPdfUrl) {
      const generated = await generatePdf(
        status === "Letter Generated" ? "Letter Generated" : "Pending Insurance Company Letter",
      );
      if (generated) {
        nextForm = {
          ...nextForm,
          generatedLetterPdfUrl: generated.dataUrl,
          generatedLetterFileName: generated.fileName,
          status: status === "Letter Generated" ? "Letter Generated" : "Pending Insurance Company Letter",
          finalReviewedData: reviewed,
          rawExtractedData: rawData,
        };
      }
    }

    try {
      const response = await fetch(isEdit ? `/api/endorsements/${endorsementId}` : "/api/endorsements", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextForm),
      });
      const saved = await readJsonResponse(response);
      setForm({ ...EMPTY_FORM, ...saved });
      setMessage(isEdit ? "Endorsement updated." : "Endorsement saved.");
      await loadSavedRecords();
      if (!isEdit) window.location.href = `/dashboard/endorsements/${saved.id}?mode=edit`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Endorsement could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadCompanyLetter(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type && file.type !== "application/pdf") {
      setError("Upload the insurance company letter as a PDF.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setCompanyLetterName(file.name);
    setForm((current) => ({
      ...current,
      insuranceCompanyLetterPdfUrl: dataUrl,
      insuranceCompanyLetterFileName: file.name,
      status: "Insurance Company Letter Received",
    }));
  }

  if (loading) return <div className="endorsement-empty">Loading endorsement...</div>;

  return (
    <div className="endorsement-page">
      <header className="endorsement-page-head">
        <div>
          <p>Endorsements &gt; {isEdit ? "View / Edit Endorsement" : "Create Endorsement"}</p>
          <h1>{isEdit ? form.endorsementNo : "Create Endorsement"}</h1>
          <span>
            Upload policy PDF, extract details, choose endorsement type, and generate customer letter.
          </span>
        </div>
        <div className="endorsement-head-actions">
          <Link className="endorsement-secondary-btn" href="/dashboard/endorsements">
            <ArrowLeft size={17} /> Back
          </Link>
          <Link className="endorsement-primary-btn" href="/dashboard/endorsements">
            <FileText size={17} /> View Endorsement Records
          </Link>
        </div>
      </header>

      {error ? <div className="endorsement-alert error">{error}</div> : null}
      {message ? <div className="endorsement-alert success">{message}</div> : null}

      <div className="endorsement-workflow">
        <div className="endorsement-create-left">
          <section className="endorsement-form-panel">
            <div className="endorsement-section-head">
              <span>1</span>
              <div>
                <h2>Upload & Extract Policy</h2>
                <p>Use a real policy PDF, then correct extracted values before saving.</p>
              </div>
            </div>
            <div
              className="endorsement-dropzone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <UploadCloud size={42} />
              <strong>Drag or drop PDF files here</strong>
              <span>
                Upload a policy PDF. It will be extracted automatically after you click Extract Data.
              </span>
              <label className="endorsement-browse-btn">
                Browse Files
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => handlePolicyFile(event.target.files?.[0])}
                />
              </label>
            </div>
            {policyFile ? (
              <div className="endorsement-selected-file">
                <div>
                  <strong>{policyFile.name}</strong>
                  <span>{formatFileSize(policyFile.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPolicyFile(null);
                    setLastExtractedFileName("");
                  }}
                  aria-label="Remove selected policy PDF"
                >
                  <X size={16} />
                </button>
              </div>
            ) : null}
            <div className="endorsement-upload-row">
              <button type="button" disabled={extracting || !policyFile} onClick={() => extractPolicy()}>
                {extracting ? <Loader2 className="spin" size={16} /> : <Upload size={16} />} Extract Data
              </button>
              <span className="endorsement-upload-state">
                {extracting
                  ? "Extracting policy details..."
                  : policyFile
                    ? "Ready to extract"
                    : "Waiting for PDF"}
              </span>
            </div>
            <div className="endorsement-field-grid">
              <TextField
                label="Policy No."
                value={form.policyNo}
                onChange={(value) => update("policyNo", value)}
              />
              <TextField
                label="Insured Name"
                value={form.insuredName}
                required
                onChange={(value) => update("insuredName", value)}
              />
              <TextField
                label="Mailing Address"
                value={form.mailingAddress}
                onChange={(value) => update("mailingAddress", value)}
              />
              <label>
                <span>Insurance Company *</span>
                <select
                  value={selectedTemplateId}
                  onChange={(event) =>
                    update(
                      "insuranceCompany",
                      INSURER_TEMPLATES.find((item) => item.id === event.target.value)?.label || "",
                    )
                  }
                >
                  <option value="">Select insurer</option>
                  {INSURER_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.label}
                    </option>
                  ))}
                </select>
              </label>
              <TextField
                label="Policy Type"
                value={form.policyType}
                onChange={(value) => update("policyType", value)}
              />
              <TextField
                label="Policy Start Date"
                type="date"
                value={form.policyStartDate}
                onChange={(value) => update("policyStartDate", value)}
              />
              <TextField
                label="Policy Expiry Date"
                type="date"
                value={form.policyExpiryDate}
                onChange={(value) => update("policyExpiryDate", value)}
              />
              <TextField
                label="Sum Insured"
                value={form.sumInsured}
                onChange={(value) => update("sumInsured", value)}
              />
              <TextField
                label="Address"
                value={form.address}
                onChange={(value) => update("address", value)}
              />
            </div>
            <label className="endorsement-wide-field">
              <span>Warehouse / Property Details</span>
              <textarea
                rows={3}
                value={form.warehouseDetails}
                onChange={(event) => update("warehouseDetails", event.target.value)}
              />
            </label>
          </section>

          <section className="endorsement-form-panel">
            <div className="endorsement-section-head">
              <span>2</span>
              <div>
                <h2>Select Endorsement Type</h2>
                <p>Only relevant old/new value fields are shown.</p>
              </div>
            </div>
            <div className="endorsement-field-grid">
              <label>
                <span>Endorsement Type *</span>
                <select
                  value={form.endorsementType}
                  onChange={(event) => update("endorsementType", event.target.value)}
                >
                  {ENDORSEMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <TextField
                label="Endorsement No."
                value={form.endorsementNo}
                onChange={(value) => update("endorsementNo", value)}
              />
            </div>
            <div className="endorsement-field-grid">
              {relevantFields.map((field) => (
                <TextField
                  key={`${field.bucket}-${field.key}`}
                  label={field.label}
                  type={field.type || "text"}
                  value={(form[field.bucket] || {})[field.key] || ""}
                  onChange={(value) => updateValue(field.bucket, field.key, value)}
                />
              ))}
            </div>
          </section>

          <section className="endorsement-form-panel">
            <div className="endorsement-section-head">
              <span>3</span>
              <div>
                <h2>Fill Endorsement Details</h2>
                <p>Dates, remarks, and customer/internal description.</p>
              </div>
            </div>
            <div className="endorsement-field-grid">
              <TextField
                label="Endorsement Date"
                type="date"
                value={form.endorsementDate}
                onChange={(value) => update("endorsementDate", value)}
              />
              <TextField
                label="Effective From"
                type="date"
                value={form.effectiveFrom}
                onChange={(value) => {
                  update("effectiveFrom", value);
                  update("effectiveDate", value);
                }}
              />
              <TextField
                label="Effective To"
                type="date"
                value={form.effectiveTo}
                onChange={(value) => update("effectiveTo", value)}
              />
              <TextField
                label="Customer Request Date"
                type="date"
                value={form.customerRequestDate}
                onChange={(value) => update("customerRequestDate", value)}
              />
              <TextField
                label="Date of Issue"
                type="date"
                value={form.dateOfIssue}
                onChange={(value) => update("dateOfIssue", value)}
              />
              <TextField
                label="Issued Office"
                value={form.issuedOffice}
                onChange={(value) => update("issuedOffice", value)}
              />
              <TextField
                label="Financer Details"
                value={form.financerDetails}
                onChange={(value) => update("financerDetails", value)}
              />
              <TextField
                label="Premium"
                value={form.premium}
                onChange={(value) => update("premium", value)}
              />
              <label>
                <span>Status</span>
                <select value={form.status} onChange={(event) => update("status", event.target.value)}>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="endorsement-wide-field">
              <span>Description / Details</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
              />
            </label>
            <div className="endorsement-field-grid">
              <label className="endorsement-wide-field">
                <span>Internal Remark</span>
                <textarea
                  rows={3}
                  value={form.internalRemark}
                  onChange={(event) => update("internalRemark", event.target.value)}
                />
              </label>
              <label className="endorsement-wide-field">
                <span>Customer Remark</span>
                <textarea
                  rows={3}
                  value={form.customerRemark}
                  onChange={(event) => update("customerRemark", event.target.value)}
                />
              </label>
            </div>
          </section>
        </div>
        <aside className="endorsement-preview-stack">
          <section className="endorsement-form-panel endorsement-preview-panel">
            <div className="endorsement-preview-head">
              <h2>Policy PDF Preview</h2>
              <span>{policyFile || form.uploadedPolicyFileId ? "PDF Uploaded" : "Waiting"}</span>
            </div>
            <div className="endorsement-pdf-frame">
              {policyPreviewUrl ? (
                <iframe title="Policy PDF preview" src={policyPreviewUrl} />
              ) : (
                <div>
                  <FileText size={28} />
                  <strong>No policy PDF selected</strong>
                  <small>Upload a PDF to preview it here.</small>
                </div>
              )}
            </div>
          </section>

          <section className="endorsement-form-panel">
            <div className="endorsement-preview-head">
              <h2>Endorsement Schedule Preview</h2>
              <span>{form.generatedLetterPdfUrl ? "PDF Ready" : "Live Preview"}</span>
              <button
                type="button"
                onClick={() => generatePdf("Letter Generated")}
                aria-label="Refresh letter preview"
              >
                <RefreshCw size={15} />
              </button>
              <button type="button" aria-label="Expand letter preview">
                <Expand size={15} />
              </button>
            </div>
            <div className="endorsement-schedule-preview-shell">
              <div className="endorsement-schedule-preview-scale">
                <div>
                  <EndorsementTemplatePreview
                    templateId={selectedTemplateId}
                    data={scheduleData}
                    previewRef={previewRef}
                  />
                </div>
              </div>
            </div>
            <div className="endorsement-actions-row">
              <button type="button" onClick={() => generatePdf("Letter Generated")}>
                <FileText size={16} /> Refresh Preview Data
              </button>
              <button type="button" onClick={() => generatePdf("Letter Generated")}>
                <FileCheck2 size={16} /> Print / Generate PDF
              </button>
              {form.generatedLetterPdfUrl ? (
                <a
                  className="endorsement-secondary-btn"
                  href={form.generatedLetterPdfUrl}
                  download={form.generatedLetterFileName || `${form.endorsementNo}.pdf`}
                >
                  <Download size={16} /> Download Generated PDF
                </a>
              ) : null}
            </div>
          </section>
        </aside>

        {isEdit ? (
          <section className="endorsement-form-panel">
            <div className="endorsement-section-head">
              <span>5</span>
              <div>
                <h2>Upload Insurance Company Endorsement Letter</h2>
                <p>Attach the insurer letter when it is received later.</p>
              </div>
            </div>
            <div className="endorsement-field-grid">
              <input type="file" accept="application/pdf" onChange={uploadCompanyLetter} />
              <TextField
                label="Company Letter File"
                value={companyLetterName || form.insuranceCompanyLetterFileName}
                onChange={setCompanyLetterName}
              />
            </div>
            <label className="endorsement-wide-field">
              <span>Remark</span>
              <textarea
                rows={3}
                value={form.remark}
                onChange={(event) => update("remark", event.target.value)}
              />
            </label>
            {form.insuranceCompanyLetterPdfUrl ? (
              <a
                className="endorsement-secondary-btn"
                href={form.insuranceCompanyLetterPdfUrl}
                download={form.insuranceCompanyLetterFileName || "insurance-company-letter.pdf"}
              >
                <Download size={16} /> Download uploaded insurance company letter
              </a>
            ) : null}
          </section>
        ) : null}

        <section className="endorsement-form-panel endorsement-saved-panel">
          <div className="endorsement-section-head">
            <div>
              <h2>Saved Endorsements</h2>
              <p>Recent endorsement records from the database.</p>
            </div>
          </div>
          <SavedEndorsementsTable records={savedRecords} />
        </section>

        <footer className="endorsement-sticky-actions">
          <Link className="endorsement-secondary-btn" href="/dashboard/endorsements">
            Cancel
          </Link>
          <button type="button" disabled={saving} onClick={() => saveEndorsement("Draft")}>
            <Save size={16} /> Save as Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => saveEndorsement("Pending Insurance Company Letter")}
          >
            <Save size={16} /> Save Endorsement
          </button>
        </footer>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, type = "text", required = false }) {
  return (
    <label>
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        required={required}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SavedEndorsementsTable({ records }) {
  if (!records.length) {
    return <div className="endorsement-empty compact">No saved endorsements yet.</div>;
  }

  return (
    <div className="endorsement-table-scroll">
      <table className="endorsement-table compact">
        <thead>
          <tr>
            <th>Date</th>
            <th>Endorsement No.</th>
            <th>Policy No.</th>
            <th>Customer Name</th>
            <th>Insurance Company</th>
            <th>Endorsement Type</th>
            <th>Status</th>
            <th>Created By</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>{displayDate(record.endorsementDate)}</td>
              <td>
                <Link href={`/dashboard/endorsements/${record.id}`}>{record.endorsementNo}</Link>
              </td>
              <td>{record.policyNo || "-"}</td>
              <td>{record.customerName || record.insuredName || "-"}</td>
              <td>{record.insuranceCompany || "-"}</td>
              <td>{record.endorsementType}</td>
              <td>
                <span
                  className={`endorsement-status ${String(record.status || "")
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")}`}
                >
                  {record.status}
                </span>
              </td>
              <td>{record.createdBy?.name || record.createdBy?.email || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getRelevantFields(type) {
  if (type === "Increase in Sum Insured" || type === "Decrease in Sum Insured") {
    return [
      { bucket: "oldValues", key: "sumInsured", label: "Old Sum Insured" },
      { bucket: "newValues", key: "sumInsured", label: "New Sum Insured" },
      { bucket: "newValues", key: "differenceAmount", label: "Difference Amount" },
      { bucket: "newValues", key: "reason", label: "Reason / Description" },
    ];
  }
  if (type === "Change in Situation / Location") {
    return [
      { bucket: "oldValues", key: "location", label: "Old Location" },
      { bucket: "newValues", key: "location", label: "New Location" },
      { bucket: "newValues", key: "reason", label: "Reason / Description" },
    ];
  }
  if (type === "Change in Address") {
    return [
      { bucket: "oldValues", key: "address", label: "Old Address" },
      { bucket: "newValues", key: "address", label: "New Address" },
      { bucket: "newValues", key: "reason", label: "Reason / Description" },
    ];
  }
  if (type.includes("Warehouse") || type.includes("Property")) {
    return [
      { bucket: "oldValues", key: "propertyDetails", label: "Old Warehouse / Property" },
      { bucket: "newValues", key: "propertyDetails", label: "New Warehouse / Property" },
      { bucket: "newValues", key: "reason", label: "Reason / Description" },
    ];
  }
  if (type.includes("Bank") || type.includes("Hypothecation")) {
    return [
      { bucket: "oldValues", key: "bankDetails", label: "Old Bank Details" },
      { bucket: "newValues", key: "bankDetails", label: "New Bank Details" },
      { bucket: "newValues", key: "reason", label: "Reason / Description" },
    ];
  }
  return [
    { bucket: "oldValues", key: "value", label: "Old Value" },
    { bucket: "newValues", key: "value", label: "New Value" },
    { bucket: "newValues", key: "reason", label: "Reason / Description" },
  ];
}

function normalizeExtractedPolicy(data, upload) {
  return {
    policyNo: data.policyNumber || data.policyNo || "",
    insuredName: data.insuredName || data.customerName || "",
    insuranceCompany: data.insuranceCompany || upload?.selected?.companyName || "",
    policyType: data.productName || data.policyType || upload?.selected?.policyTypeName || "",
    policyStartDate: toDateInput(data.policyStartDate || data.startDate),
    policyExpiryDate: toDateInput(data.policyEndDate || data.expiryDate),
    sumInsured: data.sumInsured || data.contentsSumInsured || data.idv || "",
    mailingAddress: data.mailingAddress || data.communicationAddress || "",
    address: data.riskLocation || data.premisesAddress || data.address || data.propertyAddress || "",
    warehouseDetails: data.warehouseDetails || data.propertyDetails || data.description || "",
    issuedAt: data.issuedAt || data.validIn || "",
    financerDetails: data.hypothecationDetails || data.financerName || "",
    premium: data.premiumIncludingGst || data.totalPremium || data.premium || "",
    raw: data,
  };
}

function seedOldValues(type, extracted, existing) {
  if (Object.keys(existing || {}).length) return existing;
  if (type.includes("Address")) return { address: extracted.address || "" };
  if (type.includes("Situation") || type.includes("Location")) return { location: extracted.address || "" };
  if (type.includes("Sum Insured")) return { sumInsured: extracted.sumInsured || "" };
  if (type.includes("Warehouse") || type.includes("Property"))
    return { propertyDetails: extracted.warehouseDetails || "" };
  return {};
}

function displayDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
}

function toDateInput(value) {
  if (!value) return "";
  const text = String(value).trim();
  const slashDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashDate) {
    return `${slashDate[3]}-${slashDate[2].padStart(2, "0")}-${slashDate[1].padStart(2, "0")}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function makeEndorsementNo() {
  const now = new Date();
  return `END-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function formatFileSize(size) {
  if (!size) return "0 KB";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new window.FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload;
}
