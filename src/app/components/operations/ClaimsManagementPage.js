"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
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
  EMPTY_CLAIM,
  FILTERS,
  SURVEYOR_FIELDS,
} from "./claims/config";
import { ClaimField, DocumentList } from "./claims/components";
import { ClaimDeleteModal, ClaimRemarkModal } from "./claims/modals";
import {
  createClaimId,
  createEmptyClaim,
  createInternalId,
  formatDate,
  getClaimSpecificFields,
  getMissingFieldsForStep,
  getStatusTone,
  readFileAsDataUrl,
  readJsonResponse,
} from "./claims/utils";

const PAGE_SIZE = 25;

export default function ClaimsManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const urlFilter = searchParams.get("filter") || "all";
  const urlPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const initialFilter = FILTERS.some((item) => item.id === urlFilter) ? urlFilter : "all";
  const [claim, setClaim] = useState(EMPTY_CLAIM);
  const [claims, setClaims] = useState([]);
  const [query, setQuery] = useState(urlQuery);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formStep, setFormStep] = useState(0);
  const [editingId, setEditingId] = useState("");
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [selectedClaimDetail, setSelectedClaimDetail] = useState(null);
  const [activeFilter, setActiveFilter] = useState(initialFilter);
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
  const [page, setPage] = useState(urlPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterCounts, setFilterCounts] = useState({});
  const listRequestRef = useRef(null);
  const detailRequestRef = useRef(null);

  const handlePrint = async (record) => {
    const { printClaim } = await import("./claims/print");
    printClaim(record);
  };

  useEffect(() => {
    setQuery(urlQuery);
    setActiveFilter(initialFilter);
    setPage(urlPage);
  }, [urlQuery, initialFilter, urlPage]);

  function syncListUrl({ filter = activeFilter, q = query, nextPage = page } = {}) {
    const params = new window.URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (q.trim()) params.set("q", q.trim());
    if (nextPage > 1) params.set("page", String(nextPage));
    router.replace(params.size ? `?${params}` : "?", { scroll: false });
  }

  function changeListFilter(filter) {
    setActiveFilter(filter);
    setPage(1);
    syncListUrl({ filter, nextPage: 1 });
  }

  function changeListQuery(value) {
    setQuery(value);
    setPage(1);
    syncListUrl({ q: value, nextPage: 1 });
  }

  function changeListPage(nextPage) {
    setPage(nextPage);
    syncListUrl({ nextPage });
  }

  useEffect(() => {
    const timer = window.setTimeout(loadClaims, query ? 300 : 0);
    return () => {
      window.clearTimeout(timer);
      listRequestRef.current?.abort();
    };
  }, [activeFilter, page, query]);

  useEffect(
    () => () => {
      listRequestRef.current?.abort();
      detailRequestRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!selectedClaimId) {
      detailRequestRef.current?.abort();
      detailRequestRef.current = null;
      setSelectedClaimDetail(null);
    }
  }, [selectedClaimId]);

  const filteredClaims = claims;
  const selectedClaim = selectedClaimDetail?.id === selectedClaimId ? selectedClaimDetail : null;

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

  async function fetchClaimDetail(id) {
    detailRequestRef.current?.abort();
    const controller = new window.AbortController();
    detailRequestRef.current = controller;
    try {
      const response = await fetch(`/api/claims/${id}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      return await readJsonResponse(response);
    } finally {
      if (detailRequestRef.current === controller) detailRequestRef.current = null;
    }
  }

  async function openClaimDetails(item) {
    setSelectedClaimId(item.id);
    setSelectedClaimDetail(null);
    setOpenMenuId("");
    setErrorMessage("");
    try {
      setSelectedClaimDetail(await fetchClaimDetail(item.id));
    } catch (error) {
      if (error?.name === "AbortError") return;
      setSelectedClaimId("");
      setErrorMessage(getUserFacingErrorMessage(error, "Claim details could not be loaded. Please try again."));
    }
  }

  async function openEditForm(item) {
    let detail = item;
    if (item.isSummary) {
      try {
        detail = await fetchClaimDetail(item.id);
      } catch (error) {
        if (error?.name === "AbortError") return;
        setErrorMessage(getUserFacingErrorMessage(error, "Claim details could not be loaded for editing."));
        return;
      }
    }
    setClaim({
      ...createEmptyClaim(),
      ...detail,
      internalClaimId: detail.internalClaimId || detail.id || createInternalId("CLM"),
      customerId: detail.customerId || createInternalId("CUST"),
      claimDetails: detail.claimDetails || {},
      surveyorDetails: { ...EMPTY_CLAIM.surveyorDetails, ...(detail.surveyorDetails || {}) },
      documents: detail.documents || [],
      remarks: detail.remarks || [],
    });
    setFormStep(0);
    setEditingId(detail.id);
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
    listRequestRef.current?.abort();
    const controller = new window.AbortController();
    listRequestRef.current = controller;
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new window.URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        filter: activeFilter,
      });
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/claims?${params}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = await readJsonResponse(response);
      setClaims(Array.isArray(payload.claims) ? payload.claims : []);
      setTotalCount(Number(payload.total || 0));
      setTotalPages(Math.max(1, Number(payload.totalPages || 1)));
      setFilterCounts(payload.filterCounts || {});
      if (page > Number(payload.totalPages || 1)) setPage(Math.max(1, Number(payload.totalPages || 1)));
      return payload;
    } catch (error) {
      if (error?.name !== "AbortError") {
        setErrorMessage(getUserFacingErrorMessage(error, "Claims could not be loaded. Please try again."));
        setClaims([]);
      }
      return null;
    } finally {
      if (listRequestRef.current === controller) {
        listRequestRef.current = null;
        if (!controller.signal.aborted) setIsLoading(false);
      }
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
      if (selectedClaimId === savedClaim.id) setSelectedClaimDetail(savedClaim);
      closeForm();
      await loadClaims();
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
      if (selectedClaimId === updatedClaim.id) setSelectedClaimDetail(updatedClaim);
      setRemarkTarget(null);
      setRemarkDraft("");
      setFollowUpDraft("");
      await loadClaims();
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
      if (selectedClaimId === id) setSelectedClaimId("");
      setDeleteCandidate(null);
      setDeleteConfirmText("");
      setOpenMenuId("");
      await loadClaims();
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

  if (selectedClaimId && !selectedClaim) {
    return (
      <div className="operations-module-page claims-management-page">
        <button className="customer-portfolio-back" type="button" onClick={() => setSelectedClaimId("")}>
          <ArrowLeft size={15} /> Back to Claims
        </button>
        <section className="claims-register-panel">
          <p className="claims-empty-row">Loading claim details...</p>
        </section>
      </div>
    );
  }

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
            onClick={() => changeListFilter(filter.id)}
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
            <strong>{totalCount.toLocaleString("en-IN")} records</strong>
          </div>
          <label className="operations-search claims-search">
            <Search size={18} />
            <input
              type="search"
              value={query}
              placeholder="Search claims..."
              onChange={(event) => changeListQuery(event.target.value)}
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
                    <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td>{item.insuredName || "-"}</td>
                    <td>{item.mobileNo || "-"}</td>
                    <td>{item.contactPerson || "-"}</td>
                    <td>{item.claimNo || "-"}</td>
                    <td>{formatDate(item.claimDate)}</td>
                    <td>{item.claimType || "-"}</td>
                    <td>{item.claimStatus || "Open"}</td>
                    <td>{formatDate(item.followUpDate)}</td>
                    <td>{item.currentRemark || "-"}</td>
                    <td>{Number(item.documentCount || 0).toLocaleString("en-IN")}</td>
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
                                openClaimDetails(item);
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
        {totalPages > 1 ? (
          <div className="table-pagination" aria-label="Claims pagination">
            <span>
              Page {page} of {totalPages} ({totalCount} claims)
            </span>
            <div className="table-page-list">
              <button
                type="button"
                onClick={() => changeListPage(Math.max(1, page - 1))}
                disabled={page <= 1 || isLoading}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => changeListPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || isLoading}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {claimActionModals}
    </div>
  );
}
