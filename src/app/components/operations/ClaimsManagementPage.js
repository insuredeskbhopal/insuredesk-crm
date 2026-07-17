"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Eye,
  FilePlus2,
  LayoutGrid,
  MessageSquare,
  MessageSquarePlus,
  MoreVertical,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  User,
  X,
} from "lucide-react";
import OperationsBackLink from "@/app/components/operations/OperationsBackLink";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";
import {
  CLAIM_WIZARD_STEPS,
  CLIENT_DETAIL_FIELDS,
  COMMON_CLAIM_FIELDS,
  DETAIL_FIELDS,
  EMPTY_CLAIM,
  FILTERS,
  SURVEYOR_FIELDS,
} from "./claims/config";
import { ClaimField, DocumentList, RemarkList } from "./claims/components";
import { ClaimDeleteModal, ClaimRemarkModal } from "./claims/modals";
import { printClaim } from "./claims/print";
import {
  createClaimId,
  createEmptyClaim,
  createInternalId,
  formatDate,
  getClaimSpecificFields,
  getFilterCounts,
  getMissingFieldsForStep,
  getStatusTone,
  matchesClaimFilter,
  readFileAsDataUrl,
  readJsonResponse,
} from "./claims/utils";

export default function ClaimsManagementPage() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [claim, setClaim] = useState(EMPTY_CLAIM);
  const [claims, setClaims] = useState([]);
  const [query, setQuery] = useState(urlQuery);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formStep, setFormStep] = useState(0);
  const [editingId, setEditingId] = useState("");
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [openMenuId, setOpenMenuId] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [remarkTarget, setRemarkTarget] = useState(null);
  const [remarkDraft, setRemarkDraft] = useState("");
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handlePrint = printClaim;

  useEffect(() => {
    loadClaims();
  }, []);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const filteredClaims = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return claims.filter(
      (item) =>
        matchesClaimFilter(item, activeFilter) &&
        (!normalized ||
          [
            item.insuredName,
            item.mobileNo,
            item.contactPerson,
            item.policyNo,
            item.claimNo,
            item.groupName,
            item.claimDescription,
            item.claimType,
            item.claimStatus,
            item.currentRemark,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalized)),
    );
  }, [activeFilter, claims, query]);

  const filterCounts = useMemo(() => getFilterCounts(claims), [claims]);

  const selectedClaim = claims.find((item) => item.id === selectedClaimId) || null;

  function openAddForm() {
    setClaim(createEmptyClaim());
    setFormStep(0);
    setEditingId("");
    setSelectedClaimId("");
    setDocumentName("");
    setDocumentError("");
    setOpenMenuId("");
    setIsFormOpen(true);
  }

  function openEditForm(item) {
    setClaim({
      ...createEmptyClaim(),
      ...item,
      internalClaimId: item.internalClaimId || item.id || createInternalId("CLM"),
      customerId: item.customerId || createInternalId("CUST"),
      claimDetails: item.claimDetails || {},
      surveyorDetails: { ...EMPTY_CLAIM.surveyorDetails, ...(item.surveyorDetails || {}) },
      documents: item.documents || [],
      remarks: item.remarks || [],
    });
    setFormStep(0);
    setEditingId(item.id);
    setDocumentName("");
    setDocumentError("");
    setOpenMenuId("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setClaim(createEmptyClaim());
    setFormStep(0);
    setEditingId("");
    setDocumentName("");
    setDocumentError("");
    setIsFormOpen(false);
  }

  function updateClaim(key, value) {
    setClaim((current) => ({ ...current, [key]: value }));
  }

  function updateClaimDetail(key, value) {
    setClaim((current) => ({
      ...current,
      claimDetails: { ...(current.claimDetails || {}), [key]: value },
    }));
  }

  function updateSurveyorDetail(key, value) {
    setClaim((current) => ({
      ...current,
      surveyorDetails: { ...(current.surveyorDetails || {}), [key]: value },
    }));
  }

  function resetDraftClaim() {
    setClaim(createEmptyClaim());
    setDocumentName("");
    setDocumentError("");
    setFormStep(0);
  }

  function goToPreviousStep() {
    setErrorMessage("");
    setFormStep((current) => Math.max(0, current - 1));
  }

  function goToNextStep() {
    const missing = getMissingFieldsForStep(claim, formStep);
    if (missing.length) {
      setErrorMessage(`Please complete required fields: ${missing.join(", ")}.`);
      return;
    }
    setErrorMessage("");
    setFormStep((current) => Math.min(CLAIM_WIZARD_STEPS.length - 1, current + 1));
  }

  async function loadClaims() {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/claims?limit=500", { cache: "no-store" });
      const payload = await readJsonResponse(response);
      setClaims(Array.isArray(payload.claims) ? payload.claims : []);
    } catch (error) {
      setErrorMessage(getUserFacingErrorMessage(error, "Claims could not be loaded. Please try again."));
      setClaims([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveClaim(event) {
    event.preventDefault();
    const missing = [0, 1].flatMap((step) => getMissingFieldsForStep(claim, step));
    if (missing.length) {
      setErrorMessage(`Please complete required fields: ${missing.join(", ")}.`);
      setFormStep(missing.some((label) => ["Insured Name", "Mobile Number", "Policy Number", "Insurance Company", "Claim Type"].includes(label)) ? 0 : 1);
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    try {
      const response = await fetch(editingId ? `/api/claims/${editingId}` : "/api/claims", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(claim),
      });
      const savedClaim = await readJsonResponse(response);
      setClaims((current) => {
        if (editingId) return current.map((item) => (item.id === editingId ? savedClaim : item));
        return [savedClaim, ...current];
      });
      closeForm();
    } catch (error) {
      setErrorMessage(getUserFacingErrorMessage(error, "Claim could not be saved. Please try again."));
    } finally {
      setIsSaving(false);
    }
  }

  function openRemarkForm(item) {
    setRemarkTarget(item);
    setRemarkDraft("");
    setFollowUpDraft(item.followUpDate || "");
    setOpenMenuId("");
  }

  async function saveRemark(event) {
    event.preventDefault();
    if (!remarkTarget || !remarkDraft.trim()) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/claims/${remarkTarget.id}/remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: remarkDraft.trim(), followUpDate: followUpDraft }),
      });
      const updatedClaim = await readJsonResponse(response);
      setClaims((current) => current.map((item) => (item.id === updatedClaim.id ? updatedClaim : item)));
      setRemarkTarget(null);
      setRemarkDraft("");
      setFollowUpDraft("");
    } catch (error) {
      setErrorMessage(
        getUserFacingErrorMessage(error, "Claim remark could not be saved. Please try again."),
      );
    } finally {
      setIsSaving(false);
    }
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
      uploadedAt: new Date().toISOString(),
    };

    setClaim((current) => ({
      ...current,
      documents: [...(current.documents || []), document],
    }));
    setDocumentName("");
  }

  function removeDraftDocument(id) {
    setClaim((current) => ({
      ...current,
      documents: (current.documents || []).filter((item) => item.id !== id),
    }));
  }

  async function deleteClaim(id) {
    setIsSaving(true);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/claims/${id}`, { method: "DELETE" });
      if (!response.ok) await readJsonResponse(response);
      setClaims((current) => current.filter((item) => item.id !== id));
      if (selectedClaimId === id) setSelectedClaimId("");
      setDeleteCandidate(null);
      setDeleteConfirmText("");
      setOpenMenuId("");
    } catch (error) {
      setErrorMessage(getUserFacingErrorMessage(error, "Claim could not be deleted. Please try again."));
    } finally {
      setIsSaving(false);
    }
  }

  const claimFormPortal =
    typeof window !== "undefined" && isFormOpen
      ? createPortal(
          <div className="claims-add-modal-backdrop" onClick={closeForm}>
            <section className="claims-add-modal" onClick={(event) => event.stopPropagation()}>
              <div className="claims-add-modal-header">
                <div className="claims-add-modal-titlebar">
                  <Image
                    src="/brand/main-logo-wide.webp"
                    alt="Bima Headquarter"
                    width={133}
                    height={74}
                    className="claims-add-modal-logo"
                  />
                  <div className="claims-add-modal-titlecopy">
                    <span>Claim Record Details</span>
                    <h2>{editingId ? "Edit Claim" : "Add Claim"}</h2>
                    <p>{CLAIM_WIZARD_STEPS[formStep]}</p>
                  </div>
                </div>
                <button type="button" onClick={closeForm} aria-label="Close claim form">
                  <X size={20} />
                </button>
              </div>

              <form className="claims-add-modal-form" onSubmit={saveClaim} noValidate>
                <div className="claims-add-modal-progress" aria-label="Claim creation progress">
                  <div className="claims-add-modal-progress-top">
                    <span>{CLAIM_WIZARD_STEPS[formStep]}</span>
                    <strong>
                      Step {formStep + 1} of {CLAIM_WIZARD_STEPS.length}
                    </strong>
                  </div>
                  <div className="claims-add-modal-progress-track">
                    <div
                      className="claims-add-modal-progress-fill"
                      style={{ width: `${(formStep / (CLAIM_WIZARD_STEPS.length - 1)) * 100}%` }}
                    />
                    {CLAIM_WIZARD_STEPS.map((step, index) => (
                      <span
                        key={step}
                        className={index <= formStep ? "is-active" : ""}
                        style={{ left: `${(index / (CLAIM_WIZARD_STEPS.length - 1)) * 100}%` }}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <div className="claims-add-modal-progress-steps">
                    {CLAIM_WIZARD_STEPS.map((step, index) => (
                      <span key={step} className={index <= formStep ? "is-active" : ""}>
                        {step}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="claims-add-modal-section">
                  <div className="claims-add-modal-section-head">
                    <h3>{CLAIM_WIZARD_STEPS[formStep]}</h3>
                  </div>

                  {formStep === 0 ? (
                    <div className="claims-add-modal-grid">
                      {CLIENT_DETAIL_FIELDS.map((field) => (
                        <ClaimField
                          key={field.key}
                          field={field}
                          value={claim[field.key] || ""}
                          onChange={(value) => updateClaim(field.key, value)}
                        />
                      ))}
                    </div>
                  ) : null}

                  {formStep === 1 ? (
                    <>
                      <div className="claims-add-modal-grid">
                        {COMMON_CLAIM_FIELDS.map((field) => (
                          <ClaimField
                            key={field.key}
                            field={field}
                            value={claim[field.key] || ""}
                            onChange={(value) => updateClaim(field.key, value)}
                          />
                        ))}
                      </div>
                      <div className="claims-add-modal-grid">
                        {getClaimSpecificFields(claim.claimType).map((field) => (
                          <ClaimField
                            key={field.key}
                            field={field}
                            value={(claim.claimDetails || {})[field.key] || ""}
                            onChange={(value) => updateClaimDetail(field.key, value)}
                          />
                        ))}
                      </div>
                    </>
                  ) : null}

                  {formStep === 2 ? (
                    <div className="claims-add-modal-grid">
                      {SURVEYOR_FIELDS.map((field) => (
                        <ClaimField
                          key={field.key}
                          field={field}
                          value={(claim.surveyorDetails || {})[field.key] || ""}
                          onChange={(value) => updateSurveyorDetail(field.key, value)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>

                {formStep === 3 ? (
                <div className="claims-add-modal-docs">
                  <div>
                    <span>
                      <Paperclip size={17} /> Supporting Documents
                    </span>
                    <strong>
                      Name every file before upload, for example Aadhaar Card, PAN Card, FIR, claim form,
                      invoice.
                    </strong>
                  </div>
                  <div className="claims-add-modal-upload">
                    <input
                      type="text"
                      value={documentName}
                      placeholder="Document name"
                      onChange={(event) => setDocumentName(event.target.value)}
                    />
                    <label>
                      <Paperclip size={16} /> Upload
                      <input
                        type="file"
                        accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
                        onChange={uploadClaimDocument}
                      />
                    </label>
                  </div>
                  {documentError ? <p className="claims-document-error">{documentError}</p> : null}
                  <DocumentList documents={claim.documents || []} onRemove={removeDraftDocument} />
                </div>
                ) : null}

                <div className="claims-add-modal-actions">
                  {formStep > 0 ? (
                    <button type="button" className="secondary-action" onClick={goToPreviousStep}>
                      <ArrowLeft size={17} /> Back
                    </button>
                  ) : null}
                  {formStep === 3 ? (
                    <button type="button" className="secondary-action" onClick={resetDraftClaim}>
                      <RotateCcw size={17} /> Reset
                    </button>
                  ) : null}
                  {formStep < 3 ? (
                    <button type="button" className="primary-action" onClick={goToNextStep}>
                      Save & Next
                    </button>
                  ) : (
                    <button type="submit" className="primary-action" disabled={isSaving}>
                      <FilePlus2 size={17} />{" "}
                      {isSaving ? "Saving..." : editingId ? "Update Claim" : "Save Claim"}
                    </button>
                  )}
                </div>
              </form>
            </section>
          </div>,
          document.body,
        )
      : null;

  const claimActionModals = (
    <>
      <ClaimRemarkModal
        claim={remarkTarget}
        remark={remarkDraft}
        followUpDate={followUpDraft}
        isSaving={isSaving}
        onRemarkChange={setRemarkDraft}
        onFollowUpDateChange={setFollowUpDraft}
        onClose={() => setRemarkTarget(null)}
        onSave={saveRemark}
      />
      <ClaimDeleteModal
        claim={deleteCandidate}
        confirmation={deleteConfirmText}
        isSaving={isSaving}
        onConfirmationChange={setDeleteConfirmText}
        onClose={() => {
          setDeleteCandidate(null);
          setDeleteConfirmText("");
        }}
        onDelete={deleteClaim}
      />
    </>
  );

  if (selectedClaim) {
    return (
      <div
        className="customer-profiling-page customer-portfolio-page"
        style={{
          background: "#f4f6f8",
          padding: "28px 24px 36px",
          margin: "-28px -24px -36px -24px",
          minHeight: "calc(100vh - 48px)",
        }}
      >
        {/* Back Link and Action Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <button
            className="customer-portfolio-back"
            type="button"
            onClick={() => setSelectedClaimId("")}
            style={{ boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}
          >
            <ArrowLeft size={15} /> Back to Claims
          </button>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="customer-portfolio-back"
              onClick={() => openEditForm(selectedClaim)}
              style={{ boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}
            >
              <Pencil size={14} /> Edit Claim
            </button>
            <button
              type="button"
              className="customer-portfolio-back"
              onClick={() => handlePrint(selectedClaim)}
              style={{ boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}
            >
              <Printer size={14} /> Print
            </button>
            <button
              type="button"
              className="customer-portfolio-back"
              style={{ borderColor: "#fee2e2", background: "#fef2f2", color: "#b91c1c", boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}
              onClick={() => setDeleteCandidate(selectedClaim)}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

        <div className="customer-portfolio-layout">
          {/* Left Column (Sidebar) */}
          <aside
            className="customer-portfolio-sidebar"
            style={{ border: "none", background: "transparent", boxShadow: "none", padding: 0 }}
          >
            {/* Header section with avatar, name, and badge */}
            <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "8px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  border: "1px solid rgba(25, 28, 29, 0.08)",
                  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                  fontWeight: "900",
                  fontSize: "20px"
                }}
              >
                {selectedClaim.insuredName
                  ? selectedClaim.insuredName
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "CL"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <h1
                  style={{
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "#0f172a",
                    margin: 0,
                    lineHeight: "1.2",
                  }}
                >
                  {selectedClaim.insuredName || "Unnamed Claimant"}
                </h1>
                <span
                  className={`customer-portfolio-pill ${getStatusTone(selectedClaim.claimStatus)}`}
                  style={{
                    textTransform: "uppercase",
                    fontSize: "11px",
                    fontWeight: "800",
                    marginTop: "2px",
                    width: "fit-content",
                  }}
                >
                  {selectedClaim.claimStatus || "Open"}
                </span>
              </div>
            </div>

            {/* Quick Action buttons (Call & WhatsApp) */}
            {selectedClaim.mobileNo ? (
              <div style={{ display: "flex", gap: "12px", marginBottom: "8px", marginTop: "8px" }}>
                <button type="button" className="sidebar-action-btn" onClick={() => window.open(`tel:${selectedClaim.mobileNo}`)} style={{ background: "#ffffff", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}>
                  <Phone size={16} /> Call
                </button>
                <button type="button" className="sidebar-action-btn" onClick={async () => {
                  const cleanPhone = selectedClaim.mobileNo.replace(/\D/g, "");
                  const formattedPhone = cleanPhone.startsWith("91") ? cleanPhone : "91" + cleanPhone;
                  const message = `Hello ${selectedClaim.insuredName || "Customer"}, this is InsureDesk support. We are following up regarding your claim ${selectedClaim.claimNumber || ""}.`;
                  try {
                    const res = await fetch("/api/operations/whatsapp/test-message", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ phone: formattedPhone, message }),
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      window.alert(`WhatsApp message sent successfully to ${selectedClaim.insuredName || "Customer"}!`);
                    } else {
                      window.alert(`Failed to send WhatsApp message: ${data.error || "Unknown error"}`);
                    }
                  } catch {
                    window.alert("Failed to connect to the CRM WhatsApp API.");
                  }
                }} style={{ background: "#ffffff", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}>
                  <MessageSquare size={16} /> WhatsApp
                </button>
              </div>
            ) : null}

            {/* 1. CLAIM INFORMATION CARD */}
            <div className="sidebar-section-card" style={{ background: "#ffffff", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.03)", border: "1px solid rgba(25, 28, 29, 0.08)" }}>
              <div className="sidebar-section-header" style={{ background: "#fafbfc", borderBottom: "1px solid rgba(25, 28, 29, 0.06)" }}>
                <LayoutGrid size={15} />
                <span>Claim Information</span>
              </div>
              <div className="sidebar-grid-row">
                <div className="sidebar-grid-cell" style={{ background: "#ffffff" }}>
                  <span className="sidebar-cell-label">Claim Date</span>
                  <span className="sidebar-cell-value">{formatDate(selectedClaim.claimDate)}</span>
                </div>
                <div className="sidebar-grid-cell" style={{ background: "#fafbfc" }}>
                  <span className="sidebar-cell-label">Claim Type</span>
                  <span className="sidebar-cell-value">{selectedClaim.claimType || "-"}</span>
                </div>
              </div>
              <div className="sidebar-grid-row">
                <div className="sidebar-grid-cell" style={{ background: "#fafbfc" }}>
                  <span className="sidebar-cell-label">Policy No</span>
                  <span className="sidebar-cell-value">{selectedClaim.policyNo || "-"}</span>
                </div>
                <div className="sidebar-grid-cell" style={{ background: "#ffffff" }}>
                  <span className="sidebar-cell-label">Follow-up Date</span>
                  <span className="sidebar-cell-value">{formatDate(selectedClaim.followUpDate)}</span>
                </div>
              </div>
            </div>

            {/* 2. CONTACT INFORMATION CARD */}
            <div className="sidebar-section-card" style={{ background: "#ffffff", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.03)", border: "1px solid rgba(25, 28, 29, 0.08)" }}>
              <div className="sidebar-section-header" style={{ background: "#fafbfc", borderBottom: "1px solid rgba(25, 28, 29, 0.06)" }}>
                <User size={15} />
                <span>Contact Information</span>
              </div>
              <div className="sidebar-full-cell" style={{ background: "#ffffff", borderBottom: "1px solid rgba(25, 28, 29, 0.04)" }}>
                <span className="sidebar-cell-label">Mobile Number</span>
                <span className="sidebar-cell-value">{selectedClaim.mobileNo || "-"}</span>
              </div>
              <div className="sidebar-full-cell" style={{ background: "#fafbfc", borderBottom: "1px solid rgba(25, 28, 29, 0.04)" }}>
                <span className="sidebar-cell-label">Contact Person Name</span>
                <span className="sidebar-cell-value">{selectedClaim.contactPerson || "-"}</span>
              </div>
              <div className="sidebar-full-cell" style={{ background: "#ffffff" }}>
                <span className="sidebar-cell-label">Group Name</span>
                <span className="sidebar-cell-value">{selectedClaim.groupName || "-"}</span>
              </div>
            </div>
          </aside>

          {/* Right Column (Main) */}
          <main className="customer-portfolio-main">
            {/* Card 1: Description */}
            <section className="customer-portfolio-card" style={{ boxShadow: "0 4px 16px rgba(15, 23, 42, 0.03)", border: "1px solid rgba(25, 28, 29, 0.08)" }}>
              <h2 style={{ background: "#fafbfc", borderBottom: "1px solid rgba(25, 28, 29, 0.06)" }}>Claim Description</h2>
              <div style={{ padding: "20px", background: "#ffffff" }}>
                <div
                  className="claim-desc-well"
                  style={{
                    background: "#fafbfc",
                    border: "1px solid rgba(25, 28, 29, 0.08)",
                    padding: "16px 20px",
                    borderRadius: "12px",
                    color: "#334155",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    fontWeight: "600"
                  }}
                >
                  {selectedClaim.claimDescription || "No description provided for this claim."}
                </div>
              </div>
            </section>

            {/* Card 2: Supporting Documents */}
            <section className="customer-portfolio-card" style={{ boxShadow: "0 4px 16px rgba(15, 23, 42, 0.03)", border: "1px solid rgba(25, 28, 29, 0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(25, 28, 29, 0.06)", background: "#fafbfc" }}>
                <h2 style={{ borderBottom: "none" }}>Supporting Documents</h2>
                <button
                  type="button"
                  className="customer-portfolio-back"
                  onClick={() => openEditForm(selectedClaim)}
                  style={{ minHeight: "30px", height: "30px", padding: "0 10px", margin: "10px 18px 10px 0", background: "#ffffff", boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}
                >
                  <Paperclip size={13} /> Add / Manage Documents
                </button>
              </div>
              <div style={{ padding: "20px", background: "#ffffff" }}>
                <div className="claims-document-uploader view-only" style={{ border: "none", padding: 0, background: "transparent" }}>
                  <DocumentList documents={selectedClaim.documents || []} />
                </div>
              </div>
            </section>

            {/* Card 3: Timeline & Remarks */}
            <section className="customer-portfolio-card" style={{ boxShadow: "0 4px 16px rgba(15, 23, 42, 0.03)", border: "1px solid rgba(25, 28, 29, 0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(25, 28, 29, 0.06)", background: "#fafbfc" }}>
                <h2 style={{ borderBottom: "none" }}>Follow-up Timeline & Remarks</h2>
                <button
                  type="button"
                  className="customer-portfolio-back"
                  onClick={() => openRemarkForm(selectedClaim)}
                  style={{ minHeight: "30px", height: "30px", padding: "0 10px", margin: "10px 18px 10px 0", background: "#ffffff", boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}
                >
                  <MessageSquarePlus size={13} /> Add Remark
                </button>
              </div>
              <div style={{ padding: "20px", background: "#ffffff" }}>
                {selectedClaim.remarks && selectedClaim.remarks.length ? (
                  <div className="customer-portfolio-timeline-scroll claims-timeline-scroll">
                    <div className="customer-portfolio-timeline">
                      {selectedClaim.remarks.map((item) => (
                        <div key={item.id} className="customer-portfolio-timeline-item" style={{ paddingLeft: "28px" }}>
                          <div className="customer-portfolio-timeline-dot" style={{ background: "#ffffff", border: "2px solid #2563eb", left: "-6px" }} />
                          <div
                            className="customer-portfolio-timeline-content"
                            style={{
                              background: "#f8fafc",
                              border: "1px solid rgba(25, 28, 29, 0.08)",
                              borderRadius: "12px",
                              padding: "16px",
                              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.01)"
                            }}
                          >
                            <div className="customer-portfolio-timeline-head" style={{ marginBottom: "6px" }}>
                              <strong>Agent</strong>
                              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>{formatDate(item.createdAt)}</span>
                            </div>
                            <div className="customer-portfolio-timeline-body">
                              <p style={{ margin: 0, fontSize: "14px", color: "#0f172a", lineHeight: "1.5" }}>{item.text}</p>
                              {item.followUpDate ? (
                                <em style={{ display: "block", marginTop: "8px", fontSize: "12px", color: "#92400e", fontWeight: "700" }}>
                                  Next Follow-Up: {formatDate(item.followUpDate)}
                                </em>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="customer-portfolio-empty">No remarks added yet.</p>
                )}
              </div>
            </section>
          </main>
        </div>

        {claimFormPortal}

        {claimActionModals}
      </div>
    );
  }

  return (
    <div className="operations-module-page claims-management-page">
      <OperationsBackLink />

      <section className="operations-module-detail accent-red claims-entry-shell">
        <div className="claims-module-header">
          <div className="operations-module-detail-head">
            <span>
              <ShieldCheck size={26} />
            </span>
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
          Track claims with generic servicing fields first, then open View More for full details and
          supporting documents.
        </p>
      </section>

      {errorMessage ? (
        <section className="claims-status-banner error">
          <span>{errorMessage}</span>
          <button type="button" onClick={loadClaims}>
            Retry
          </button>
        </section>
      ) : null}

      {claimFormPortal}

      <section className="claims-filter-grid">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`claims-filter-card accent-${filter.accent}${activeFilter === filter.id ? " active" : ""}`}
            onClick={() => setActiveFilter(filter.id)}
          >
            <strong>{(filterCounts[filter.id] || 0).toLocaleString("en-IN")}</strong>
            <span>{filter.label}</span>
          </button>
        ))}
      </section>

      <section className="claims-register-panel">
        <div className="claims-register-head">
          <div>
            <span>
              <ClipboardList size={18} /> Claim Register
            </span>
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
                <th>STATUS</th>
                <th>FOLLOW UP</th>
                <th>CURRENT REMARK</th>
                <th>DOCUMENTS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="claims-empty-row" colSpan={12}>
                    Loading claims from database...
                  </td>
                </tr>
              ) : filteredClaims.length ? (
                filteredClaims.map((item, index) => (
                  <tr key={item.id} className={openMenuId === item.id ? "row-has-open-menu" : ""}>
                    <td>{index + 1}</td>
                    <td>{item.insuredName || "-"}</td>
                    <td>{item.mobileNo || "-"}</td>
                    <td>{item.contactPerson || "-"}</td>
                    <td>{item.claimNo || "-"}</td>
                    <td>{formatDate(item.claimDate)}</td>
                    <td>{item.claimType || "-"}</td>
                    <td>{item.claimStatus || "Open"}</td>
                    <td>{formatDate(item.followUpDate)}</td>
                    <td>{item.currentRemark || "-"}</td>
                    <td>{(item.documents || []).length.toLocaleString("en-IN")}</td>
                    <td>
                      <div className="claims-action-menu">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === item.id ? "" : item.id)}
                          aria-label="Open claim actions"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {openMenuId === item.id ? (
                          <div className="claims-action-popover">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClaimId(item.id);
                                setOpenMenuId("");
                              }}
                            >
                              <Eye size={15} /> View More
                            </button>
                            <button type="button" onClick={() => openEditForm(item)}>
                              <Pencil size={15} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                openEditForm(item);
                              }}
                            >
                              <Paperclip size={15} /> Upload Document
                            </button>

                            <button
                              type="button"
                              className="danger"
                              onClick={() => {
                                setDeleteCandidate(item);
                                setOpenMenuId("");
                              }}
                            >
                              <Trash2 size={15} /> Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="claims-empty-row" colSpan={12}>
                    No claim records found in database. Click Add Claim to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {typeof window !== "undefined" &&
        selectedClaim &&
        createPortal(
          <div
            className="tb-modal-backdrop"
            onClick={() => setSelectedClaimId("")}
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
                maxWidth: "1040px",
                maxHeight: "85vh",
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
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <Image
                    src="/brand/main-logo-wide.webp"
                    alt="Bima Headquarter"
                    width={133}
                    height={74}
                    style={{ height: "74px", width: "auto", objectFit: "contain" }}
                  />
                  <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "16px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        color: "#64748b",
                      }}
                    >
                      Claim Details
                    </span>
                    <h2 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>
                      {selectedClaim.claimNo || "No Claim Number"}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClaimId("")}
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
                    transition: "background-color 0.2s, color 0.2s",
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
                  backgroundColor: "#ffffff",
                }}
              >
                <div className="claims-detail-grid">
                  {DETAIL_FIELDS.map(([label, key]) => (
                    <div key={key}>
                      <span>{label}</span>
                      <strong>
                        {["claimDate", "followUpDate", "dateOfLoss", "policyStartDate", "policyExpiryDate"].includes(key)
                          ? formatDate(selectedClaim[key])
                          : selectedClaim[key] || "-"}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="claims-detail-grid">
                  {getClaimSpecificFields(selectedClaim.claimType).map((field) => (
                    <div key={field.key}>
                      <span>{field.label}</span>
                      <strong>
                        {field.type === "date"
                          ? formatDate((selectedClaim.claimDetails || {})[field.key])
                          : (selectedClaim.claimDetails || {})[field.key] || "-"}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="claims-detail-grid">
                  {SURVEYOR_FIELDS.map((field) => (
                    <div key={field.key}>
                      <span>{field.label}</span>
                      <strong>
                        {field.type === "date"
                          ? formatDate((selectedClaim.surveyorDetails || {})[field.key])
                          : (selectedClaim.surveyorDetails || {})[field.key] || "-"}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="claims-document-uploader view-only">
                  <div>
                    <span>
                      <Paperclip size={17} /> Uploaded Documents
                    </span>
                    <strong>
                      {(selectedClaim.documents || []).length.toLocaleString("en-IN")} files available for
                      download.
                    </strong>
                  </div>
                  <DocumentList documents={selectedClaim.documents || []} />
                </div>

                <div className="claims-document-uploader view-only">
                  <div>
                    <span>
                      <MessageSquarePlus size={17} /> Remarks & Follow-up
                    </span>
                    <strong>
                      {(selectedClaim.remarks || []).length.toLocaleString("en-IN")} saved remarks.
                    </strong>
                  </div>
                  <RemarkList remarks={selectedClaim.remarks || []} />
                </div>
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
                  onClick={() => openEditForm(selectedClaim)}
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
                    transition: "background-color 0.2s, border-color 0.2s",
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
                  <Pencil size={15} />
                  Edit Claim
                </button>
                <button
                  onClick={() => openRemarkForm(selectedClaim)}
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
                    transition: "background-color 0.2s, border-color 0.2s",
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
                  <MessageSquarePlus size={15} />
                  Add Remark
                </button>
                <button
                  onClick={() => handlePrint(selectedClaim)}
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
                    transition: "background-color 0.2s, border-color 0.2s",
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
                  onClick={() => setSelectedClaimId("")}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    transition: "background-color 0.2s, border-color 0.2s",
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
          </div>,
          document.body,
        )}

      {claimActionModals}
    </div>
  );
}
