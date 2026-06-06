"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Download,
  Eye,
  FilePlus2,
  Paperclip,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  X
} from "lucide-react";
import OperationsBackLink from "@/app/components/operations/OperationsBackLink";

const STORAGE_KEY = "bimaheadquarter:manual-claims";

const CLAIM_FIELDS = [
  { key: "insuredName", label: "Insured Name", placeholder: "Enter insured name", required: true },
  { key: "mobileNo", label: "Mobile No.", placeholder: "Enter mobile number", inputMode: "tel" },
  { key: "contactPerson", label: "Contact Person", placeholder: "Enter contact person" },
  { key: "policyNo", label: "Policy No.", placeholder: "Enter policy number" },
  { key: "claimNo", label: "Claim No.", placeholder: "Enter claim number", required: true },
  { key: "groupName", label: "Group Name", placeholder: "Enter group name" },
  { key: "claimDate", label: "Claim Date", type: "date" },
  { key: "claimType", label: "Claim Type", type: "select", options: ["Motor", "Health", "Life", "Fire", "Marine", "Travel", "Other"] }
];

const EMPTY_CLAIM = {
  insuredName: "",
  mobileNo: "",
  contactPerson: "",
  policyNo: "",
  claimNo: "",
  groupName: "",
  claimDescription: "",
  claimDate: "",
  claimType: "Motor",
  currentRemark: "",
  documents: []
};

const DETAIL_FIELDS = [
  ["Insured Name", "insuredName"],
  ["Mobile No.", "mobileNo"],
  ["Contact Person", "contactPerson"],
  ["Policy No.", "policyNo"],
  ["Claim No.", "claimNo"],
  ["Group Name", "groupName"],
  ["Claim Date", "claimDate"],
  ["Claim Type", "claimType"],
  ["Claim Description", "claimDescription"],
  ["Current Remark", "currentRemark"]
];

export default function ClaimsManagementPage() {
  const [claim, setClaim] = useState(EMPTY_CLAIM);
  const [claims, setClaims] = useState([]);
  const [query, setQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentError, setDocumentError] = useState("");

  useEffect(() => {
    try {
      const savedClaims = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(savedClaims)) setClaims(savedClaims);
    } catch {
      setClaims([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
  }, [claims]);

  const filteredClaims = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return claims;
    return claims.filter((item) =>
      [
        item.insuredName,
        item.mobileNo,
        item.contactPerson,
        item.policyNo,
        item.claimNo,
        item.groupName,
        item.claimDescription,
        item.claimType,
        item.currentRemark
      ].join(" ").toLowerCase().includes(normalized)
    );
  }, [claims, query]);

  const selectedClaim = claims.find((item) => item.id === selectedClaimId) || null;

  function openAddForm() {
    setClaim(EMPTY_CLAIM);
    setEditingId("");
    setSelectedClaimId("");
    setDocumentName("");
    setDocumentError("");
    setIsFormOpen(true);
  }

  function openEditForm(item) {
    setClaim({ ...EMPTY_CLAIM, ...item, documents: item.documents || [] });
    setEditingId(item.id);
    setSelectedClaimId("");
    setDocumentName("");
    setDocumentError("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setClaim(EMPTY_CLAIM);
    setEditingId("");
    setDocumentName("");
    setDocumentError("");
    setIsFormOpen(false);
  }

  function updateClaim(key, value) {
    setClaim((current) => ({ ...current, [key]: value }));
  }

  function saveClaim(event) {
    event.preventDefault();
    const now = new Date().toISOString();
    const record = {
      ...claim,
      id: editingId || createClaimId(),
      createdAt: claim.createdAt || now,
      updatedAt: now,
      documents: claim.documents || []
    };

    setClaims((current) => {
      if (editingId) return current.map((item) => item.id === editingId ? record : item);
      return [record, ...current];
    });
    closeForm();
  }

  async function uploadClaimDocument(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setDocumentError("");

    if (!file) return;
    if (!documentName.trim()) {
      setDocumentError("Enter document name before upload.");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    const document = {
      id: createClaimId(),
      name: documentName.trim(),
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      size: file.size,
      dataUrl,
      uploadedAt: new Date().toISOString()
    };

    setClaim((current) => ({
      ...current,
      documents: [...(current.documents || []), document]
    }));
    setDocumentName("");
  }

  function removeDraftDocument(id) {
    setClaim((current) => ({
      ...current,
      documents: (current.documents || []).filter((item) => item.id !== id)
    }));
  }

  function deleteClaim(id) {
    setClaims((current) => current.filter((item) => item.id !== id));
    if (selectedClaimId === id) setSelectedClaimId("");
  }

  return (
    <div className="operations-module-page claims-management-page">
      <OperationsBackLink />

      <section className="operations-module-detail accent-red claims-entry-shell">
        <div className="claims-module-header">
          <div className="operations-module-detail-head">
            <span><ShieldCheck size={26} /></span>
            <div>
              <p>Operations Module</p>
              <h2>Claims Management</h2>
            </div>
          </div>
          <button type="button" className="primary-action" onClick={openAddForm}>
            <Plus size={17} /> Add Claim
          </button>
        </div>
        <p className="operations-module-detail-copy">
          Track claims with generic servicing fields first, then open View More for full details and supporting documents.
        </p>
      </section>

      {isFormOpen ? (
        <section className="claims-register-panel claims-form-panel">
          <div className="claims-register-head">
            <div>
              <span><FilePlus2 size={18} /> {editingId ? "Edit Claim" : "Add Claim"}</span>
              <strong>Enter generic claim details and upload named supporting documents.</strong>
            </div>
            <button type="button" className="claims-icon-action" onClick={closeForm} aria-label="Close claim form">
              <X size={18} />
            </button>
          </div>

          <form className="claims-entry-form" onSubmit={saveClaim}>
            <div className="claims-form-grid">
              {CLAIM_FIELDS.map((field) => (
                <label key={field.key}>
                  <span>{field.label}{field.required ? " *" : ""}</span>
                  {field.type === "select" ? (
                    <select value={claim[field.key]} onChange={(event) => updateClaim(field.key, event.target.value)}>
                      {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type || "text"}
                      inputMode={field.inputMode}
                      value={claim[field.key]}
                      placeholder={field.placeholder}
                      required={field.required}
                      onChange={(event) => updateClaim(field.key, event.target.value)}
                    />
                  )}
                </label>
              ))}
            </div>

            <label className="claims-wide-field">
              <span>Claim Description</span>
              <textarea
                value={claim.claimDescription}
                placeholder="Enter claim description"
                rows={3}
                onChange={(event) => updateClaim("claimDescription", event.target.value)}
              />
            </label>

            <label className="claims-wide-field">
              <span>Current Remark</span>
              <textarea
                value={claim.currentRemark}
                placeholder="Enter current remark or claim follow-up note"
                rows={3}
                onChange={(event) => updateClaim("currentRemark", event.target.value)}
              />
            </label>

            <div className="claims-document-uploader">
              <div>
                <span><Paperclip size={17} /> Supporting Documents</span>
                <strong>Name every file before upload, for example Aadhaar Card, PAN Card, FIR, claim form, invoice.</strong>
              </div>
              <div className="claims-document-controls">
                <input
                  type="text"
                  value={documentName}
                  placeholder="Document name"
                  onChange={(event) => setDocumentName(event.target.value)}
                />
                <label>
                  <Paperclip size={16} /> Upload
                  <input type="file" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" onChange={uploadClaimDocument} />
                </label>
              </div>
              {documentError ? <p className="claims-document-error">{documentError}</p> : null}
              <DocumentList documents={claim.documents || []} onRemove={removeDraftDocument} />
            </div>

            <div className="claims-form-actions">
              <button type="button" className="secondary-action" onClick={() => setClaim(EMPTY_CLAIM)}>
                <RotateCcw size={17} /> Reset
              </button>
              <button type="submit" className="primary-action">
                <FilePlus2 size={17} /> {editingId ? "Update Claim" : "Save Claim"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="claims-register-panel">
        <div className="claims-register-head">
          <div>
            <span><ClipboardList size={18} /> Claim Register</span>
            <strong>{claims.length.toLocaleString("en-IN")} records</strong>
          </div>
          <label className="operations-search claims-search">
            <Search size={18} />
            <input
              type="search"
              value={query}
              placeholder="Search claims..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="claims-table-wrap">
          <table className="claims-register-table claims-generic-table">
            <thead>
              <tr>
                <th>S.NO.</th>
                <th>INSURED NAME</th>
                <th>MOBILE NO.</th>
                <th>CONTACT PERSON</th>
                <th>CLAIM NO.</th>
                <th>CLAIM DATE</th>
                <th>CLAIM TYPE</th>
                <th>CURRENT REMARK</th>
                <th>DOCUMENTS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.length ? filteredClaims.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.insuredName || "-"}</td>
                  <td>{item.mobileNo || "-"}</td>
                  <td>{item.contactPerson || "-"}</td>
                  <td>{item.claimNo || "-"}</td>
                  <td>{formatDate(item.claimDate)}</td>
                  <td>{item.claimType || "-"}</td>
                  <td>{item.currentRemark || "-"}</td>
                  <td>{(item.documents || []).length.toLocaleString("en-IN")}</td>
                  <td>
                    <div className="claims-row-actions">
                      <button type="button" onClick={() => setSelectedClaimId(item.id)} aria-label="View claim">
                        <Eye size={15} />
                      </button>
                      <button type="button" onClick={() => openEditForm(item)} aria-label="Edit claim">
                        <Pencil size={15} />
                      </button>
                      <button type="button" onClick={() => deleteClaim(item.id)} aria-label="Delete claim">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="claims-empty-row" colSpan={10}>No claim records added yet. Click Add Claim to create one.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedClaim ? (
        <section className="claims-register-panel claims-detail-panel">
          <div className="claims-register-head">
            <div>
              <span><Eye size={18} /> Claim Details</span>
              <strong>{selectedClaim.claimNo || selectedClaim.insuredName || "Claim record"}</strong>
            </div>
            <div className="claims-row-actions">
              <button type="button" onClick={() => openEditForm(selectedClaim)} aria-label="Edit selected claim">
                <Pencil size={15} />
              </button>
              <button type="button" onClick={() => setSelectedClaimId("")} aria-label="Close claim details">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="claims-detail-grid">
            {DETAIL_FIELDS.map(([label, key]) => (
              <div key={key}>
                <span>{label}</span>
                <strong>{key === "claimDate" ? formatDate(selectedClaim[key]) : selectedClaim[key] || "-"}</strong>
              </div>
            ))}
          </div>

          <div className="claims-document-uploader view-only">
            <div>
              <span><Paperclip size={17} /> Uploaded Documents</span>
              <strong>{(selectedClaim.documents || []).length.toLocaleString("en-IN")} files available for download.</strong>
            </div>
            <DocumentList documents={selectedClaim.documents || []} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DocumentList({ documents, onRemove }) {
  if (!documents.length) {
    return <p className="claims-document-empty">No supporting documents uploaded.</p>;
  }

  return (
    <div className="claims-document-list">
      {documents.map((document) => (
        <div key={document.id} className="claims-document-item">
          <div>
            <strong>{document.name}</strong>
            <span>{document.fileName} - {formatFileSize(document.size)}</span>
          </div>
          <div className="claims-row-actions">
            <a href={document.dataUrl} download={document.fileName} aria-label={`Download ${document.name}`}>
              <Download size={15} />
            </a>
            {onRemove ? (
              <button type="button" onClick={() => onRemove(document.id)} aria-label={`Remove ${document.name}`}>
                <Trash2 size={15} />
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new window.FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
}

function formatFileSize(size) {
  if (!size) return "0 KB";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function createClaimId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
