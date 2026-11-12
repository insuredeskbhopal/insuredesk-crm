import Link from "next/link";
import { AlertTriangle, CheckCircle, FileText, Layers, LoaderCircle, ShieldCheck, Sparkles, Trash2, X, Zap } from "lucide-react";
import { normalizeUploadStatus, UPLOAD_STATUS } from "@/lib/uploads/status";
import PreviewField from "../shared/PreviewField";
import { applyAiSuggestionToReviewField, getEligibleAiSuggestion } from "./aiSuggestionHelpers";
import { validateContactPerson, validateContactNumber } from "@/lib/records/validation";
import EmptyState from "../shared/EmptyState";
import InsurerLogo from "@/app/components/brand/InsurerLogo";
import {
  FIELD_GROUPS,
  FIELD_SETUP,
  FUEL_TYPE_OPTIONS,
  PAYMENT_MODE_OPTIONS,
  getReviewValidation,
  canSaveWithPendingClientId,
  getReviewFieldValue,
  reviewStatusLabel,
  hasValue,
  isFieldManualForUpload,
  isManualRequiredField,
  shouldUseExtractedVariant,
} from "@/app/lib/dashboard-helpers";

import { buildDuration } from "@/lib/policies/pdf/utils/dates.cjs";

const FIELD_OPTIONS = {
  fuelType: FUEL_TYPE_OPTIONS,
  modeOfPayment: PAYMENT_MODE_OPTIONS,
  newOrRenewal: [
    { value: "", label: "Select New / Renewal" },
    { value: "New", label: "New" },
    { value: "Renewal", label: "Renewal" },
  ],
};

export default function FixedPolicyPreview({
  upload,
  isSaving,
  onFieldChange,
  onClear,
  onSave,
  reviewError = "",
  reviewFieldErrors = {},
  isEndorsementMode = false,
  endorsementPolicyNo = "",
  endorsementInsuredName = "",
  endorsementInsurer = "",
  endorsementPolicyType = "",
  onCancelEndorsementMode,
}) {
  const validation = getReviewValidation(upload);
  const { resolvedSchema, requiredKeys, missingRequired } = validation;
  const visibleFields = validation.visibleFields || FIELD_SETUP;
  const clientIdRequestId =
    upload?.reviewedData?.clientIdRequestId || upload?.extractedData?.clientIdRequestId || "";
  const pendingClientIdOnly = canSaveWithPendingClientId(validation, clientIdRequestId);
  const displayedMissingRequired = pendingClientIdOnly ? [] : missingRequired;
  const isMotorPreview = resolvedSchema?.groupId === "motor";
  const isHealthPreview = resolvedSchema?.groupId === "health";
  const insuredMembers = Array.isArray(upload?.extractedData?.insuredMembers)
    ? upload.extractedData.insuredMembers
    : [];
  const manualFields = upload?.manualFields || [];
  const getPreviewValue = (key) => {
    if (isManualRequiredField(key)) return getReviewFieldValue(upload, key);
    if (key === "duration") {
      const currentDuration = upload?.extractedData?.duration || getReviewFieldValue(upload, "duration") || "";
      if (currentDuration) return currentDuration;
      const startVal = getReviewFieldValue(upload, "startDate") || upload?.extractedData?.startDate || "";
      const expiryVal = getReviewFieldValue(upload, "expiryDate") || upload?.extractedData?.expiryDate || "";
      return buildDuration(startVal, expiryVal) || "";
    }
    if (
      isMotorPreview &&
      key === "variant" &&
      !manualFields.includes(key) &&
      !shouldUseExtractedVariant(upload?.extractedData, upload)
    )
      return "";
    return upload?.extractedData?.[key] || "";
  };
  const getFieldMeta = (key) => {
    if (key === "clientId" && pendingClientIdOnly) return "Pending approval";
    const hasPreviewValue = hasValue(getPreviewValue(key));
    const isRequired = requiredKeys?.includes(key);
    const isManual = manualFields.includes(key) || isFieldManualForUpload(upload, key);

    if (!hasPreviewValue && isRequired) return "Required";
    if (isManual) return "Manual";
    return "";
  };
  const filledFieldCount = visibleFields.filter(([, key]) => hasValue(getPreviewValue(key))).length;
  const uploadStatus = normalizeUploadStatus(upload?.status);

  const groupedFields = FIELD_GROUPS.map((group) => {
    const fieldsInGroup = group.fields
      .filter((key) => key !== "insuredMembers")
      .map((key) => visibleFields.find(([, visibleKey]) => visibleKey === key))
      .filter(Boolean);
    return {
      title: group.title,
      fields: fieldsInGroup,
    };
  }).filter((group) => group.fields.length > 0);

  return (
    <section className="glass-panel preview-panel">
      <div className="preview-head">
        <div>
          <h4>Policy Intake Data Preview</h4>
        </div>
      </div>

      {!upload ? (
        <div className="preview-body">
          {isEndorsementMode ? (
            <div
              style={{
                position: "relative",
                padding: "24px 20px",
                textAlign: "center",
                borderRadius: "12px",
                background: "#eff6ff",
                border: "1.5px dashed #3b82f6",
              }}
            >
              {onCancelEndorsementMode && (
                <button
                  type="button"
                  onClick={onCancelEndorsementMode}
                  title="Cancel Endorsement Mode"
                  aria-label="Cancel Endorsement Mode"
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    zIndex: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 9px",
                    borderRadius: "12px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#64748b",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#dc2626";
                    e.currentTarget.style.borderColor = "#fca5a5";
                    e.currentTarget.style.backgroundColor = "#fef2f2";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#64748b";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  Cancel <X size={12} strokeWidth={2.5} />
                </button>
              )}
              <div style={{ marginBottom: "8px" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#1d4ed8",
                    background: "#dbeafe",
                    padding: "3px 10px",
                    borderRadius: "6px",
                    border: "1px solid #93c5fd",
                  }}
                >
                  Endorsement Review Target
                </span>
              </div>
              <h4 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                Upload Endorsement PDF for Policy #{endorsementPolicyNo || "Target Policy"}
              </h4>
              {endorsementInsuredName && (
                <p style={{ margin: "0 0 4px 0", fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                  Insured Name: <strong>{endorsementInsuredName}</strong>
                </p>
              )}
              {endorsementInsurer && (
                <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#64748b" }}>
                  {endorsementInsurer} {endorsementPolicyType ? `• ${endorsementPolicyType}` : ""}
                </p>
              )}
              <p style={{ margin: 0, fontSize: "11.5px", color: "#2563eb", fontWeight: "600" }}>
                Upload a PDF file above to extract endorsement changes automatically for your review & approval.
              </p>
            </div>
          ) : (
            <EmptyState>Upload a policy PDF to load its dynamic preview.</EmptyState>
          )}
        </div>
      ) : (
        <>
          {isEndorsementMode && (
            <div
              style={{
                margin: "12px 16px 0 16px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#1d4ed8" }}>
                Endorsement Review linked to Policy #{endorsementPolicyNo || upload.extractedData?.policyNumber}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {endorsementInsuredName && (
                  <span style={{ fontSize: "11px", color: "#475569" }}>
                    Insured: <strong>{endorsementInsuredName}</strong>
                  </span>
                )}
                {onCancelEndorsementMode && (
                  <button
                    type="button"
                    onClick={onCancelEndorsementMode}
                    title="Exit Endorsement Mode"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#64748b",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="preview-toolbar-redesign">
            <div className="preview-top-hero">
              <div className="insurer-brand-box">
                <InsurerLogo company={upload.extractedData?.insuranceCompany} />
                {upload.extractedData?.policyType && (
                  <span className="hero-policy-type-pill">{upload.extractedData.policyType}</span>
                )}
              </div>
              <div className="preview-status-box">
                <div className="progress-mini-pill" title={`${filledFieldCount} of ${visibleFields.length} fields filled`}>
                  <span className="progress-num">{filledFieldCount}/{visibleFields.length} Filled</span>
                  <div className="progress-track">
                    <div
                      className="progress-bar"
                      style={{ width: `${Math.round((filledFieldCount / visibleFields.length) * 100)}%` }}
                    />
                  </div>
                </div>
                <strong className={`status-pill status-${uploadStatus}`}>
                  <CheckCircle size={13} /> {reviewStatusLabel(upload, displayedMissingRequired)}
                </strong>
              </div>
            </div>

            <div className="preview-sub-toolbar">
              <span className="sub-meta-pill" title={upload.sourceFile}>
                <FileText size={12} /> <span>{upload.sourceFile || "No file"}</span>
              </span>
              <span
                className="sub-meta-pill"
                title={
                  resolvedSchema
                    ? `${resolvedSchema.groupLabel} / ${resolvedSchema.policyName}`
                    : "General Review"
                }
              >
                <Layers size={12} />{" "}
                <span>
                  {resolvedSchema
                    ? `${resolvedSchema.groupLabel} / ${resolvedSchema.policyName}`
                    : "General Review"}
                </span>
              </span>
              <span className="sub-meta-pill" title={upload.extractionMethod}>
                <Zap size={12} /> <span>{upload.extractionMethod || "standard"}</span>
              </span>
              {(displayedMissingRequired.length > 0 || uploadStatus === UPLOAD_STATUS.FAILED) && upload?.id ? (
                <Link
                  href={`/operations/pdf-training?uploadId=${encodeURIComponent(upload.id)}`}
                  className="sub-meta-pill"
                  prefetch={false}
                  title="Open this PDF in Training Studio to teach missing fields"
                >
                  <Sparkles size={12} /> <span>Train Layout</span>
                </Link>
              ) : null}
            </div>

            {displayedMissingRequired.length ? (
              <div className="preview-inline-warning-bar">
                <ShieldCheck size={13} className="warning-bar-icon" />
                <span className="warning-bar-title">Required inputs needed:</span>
                <span className="warning-bar-list">{displayedMissingRequired.join(", ")}</span>
              </div>
            ) : null}
          </div>

          <div className="preview-body">
            {reviewError ? (
              <section className="alert-card error preview-inline-error">
                <div className="alert-icon">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <strong>Save failed</strong>
                  <p>{reviewError}</p>
                </div>
              </section>
            ) : null}
            <div className="preview-form-grouped">
              {isHealthPreview && insuredMembers.length ? (
                <HealthInsuredMembersFields
                  members={insuredMembers}
                  onChange={(members) => onFieldChange("insuredMembers", members)}
                />
              ) : null}
              {groupedFields.map((group) => (
                <fieldset key={group.title} className="preview-fieldset">
                  <legend className="preview-legend">{group.title}</legend>
                  <div className="preview-form">
                    {group.fields.map(([label, key]) => {
                      const isContactNumber = key === "contactNumber";
                      const isContactPerson = key === "contactPerson";

                      let fieldError = "";
                      let isDisabled = false;

                      if (isContactPerson) {
                        fieldError = validateContactPerson(getPreviewValue(key));
                      } else if (isContactNumber) {
                        fieldError = validateContactNumber(getPreviewValue(key));
                        const personVal = getPreviewValue("contactPerson");
                        isDisabled = !personVal || !!validateContactPerson(personVal);
                      }
                      fieldError = reviewFieldErrors[key] || fieldError;

                      return (
                        <PreviewField
                          key={key === "clientId" ? `${upload.id}-${key}` : key}
                          fieldKey={key}
                          label={label}
                          meta={getFieldMeta(key)}
                          value={getPreviewValue(key)}
                          onChange={(value) => onFieldChange(key, value)}
                          options={FIELD_OPTIONS[key]}
                          wide={[
                            "riskLocation",
                            "description",
                            "occupancy",
                            "remark",
                            "mailingAddress",
                            "servicingBranchAddress",
                          ].includes(key)}
                          error={fieldError}
                          disabled={isDisabled}
                          suggestion={getEligibleAiSuggestion(upload, key)}
                          onApplySuggestion={(suggestion) =>
                            applyAiSuggestionToReviewField({ fieldKey: key, suggestion, onFieldChange })
                          }
                          insuredName={getPreviewValue("insuredName")}
                          contactNumber={getPreviewValue("contactNumber")}
                          email={getPreviewValue("email")}
                          clientIdRequestId={clientIdRequestId}
                          onClientIdRequestChange={(requestId) =>
                            onFieldChange("clientIdRequestId", requestId)
                          }
                        />
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          </div>

          <div className="preview-actions">
            <button type="button" onClick={onClear}>
              <Trash2 size={18} /> Clear
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={onSave}
              disabled={
                isSaving ||
                uploadStatus === UPLOAD_STATUS.APPROVED ||
                (!validation.valid && !pendingClientIdOnly)
              }
            >
              {isSaving ? <LoaderCircle size={18} className="spin" /> : <CheckCircle size={18} />}
              Verify & Save
            </button>
          </div>
        </>
      )}
    </section>
  );
}

const HEALTH_MEMBER_FIELDS = [
  ["Insured Name", "name"],
  ["Date of Birth", "dateOfBirth"],
  ["Age", "age"],
  ["Gender", "gender"],
  ["Relationship with Policyholder", "relationship"],
  ["ABHA ID", "abhaId"],
  ["Pre-Existing Diseases", "preExistingDiseases"],
  ["First Policy Inception Date", "firstPolicyInceptionDate"],
  ["Specific Conditions", "specificConditions"],
];

function HealthInsuredMembersFields({ members, onChange }) {
  const updateMember = (index, key, value) => {
    onChange(members.map((member, memberIndex) =>
      memberIndex === index ? { ...member, [key]: value } : member,
    ));
  };

  return (
    <fieldset className="preview-fieldset">
      <legend className="preview-legend">Insured Members ({members.length})</legend>
      <div className="preview-form-grouped">
        {members.map((member, index) => (
          <fieldset key={`${member.name || "member"}-${index}`} className="preview-fieldset">
            <legend className="preview-legend">Member {index + 1}</legend>
            <div className="preview-form">
              {HEALTH_MEMBER_FIELDS.map(([label, key]) => {
                const rawMemberVal = member?.[key];
                const memberVal =
                  typeof rawMemberVal === "object" && rawMemberVal !== null
                    ? Array.isArray(rawMemberVal)
                      ? rawMemberVal.map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item))).join(", ")
                      : JSON.stringify(rawMemberVal)
                    : rawMemberVal || "";
                return (
                  <PreviewField
                    key={key}
                    fieldKey={key}
                    label={label}
                    value={memberVal}
                    onChange={(val) => updateMember(index, key, val)}
                  />
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </fieldset>
  );
}
