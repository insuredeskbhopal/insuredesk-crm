import { CheckCircle, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import { normalizeUploadStatus, UPLOAD_STATUS } from "@/lib/uploads/status";
import PreviewField from "../shared/PreviewField";
import { applyAiSuggestionToReviewField, getEligibleAiSuggestion } from "./aiSuggestionHelpers";
import { validateContactPerson, validateContactNumber } from "@/lib/records/validation";
import EmptyState from "../shared/EmptyState";
import InsurerLogo from "@/app/components/brand/InsurerLogo";
import {
  FIELD_GROUPS,
  FUEL_TYPE_OPTIONS,
  PAYMENT_MODE_OPTIONS,
  getReviewValidation,
  getReviewFieldValue,
  reviewStatusLabel,
  hasValue,
  isFieldManualForUpload,
  isManualRequiredField,
  shouldUseExtractedVariant,
} from "@/app/lib/dashboard-helpers";

const FIELD_OPTIONS = {
  fuelType: FUEL_TYPE_OPTIONS,
  modeOfPayment: PAYMENT_MODE_OPTIONS,
};

export default function FixedPolicyPreview({ upload, isSaving, onFieldChange, onClear, onSave }) {
  const validation = getReviewValidation(upload);
  const { resolvedSchema, visibleFields, requiredKeys, missingRequired } = validation;
  const isMotorPreview = resolvedSchema?.groupId === "motor";
  const manualFields = upload?.manualFields || [];
  const getPreviewValue = (key) => {
    if (isManualRequiredField(key)) return getReviewFieldValue(upload, key);
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
    const fieldsInGroup = visibleFields.filter(([, key]) => group.fields.includes(key));
    return {
      title: group.title,
      fields: fieldsInGroup,
    };
  }).filter((group) => group.fields.length > 0);

  return (
    <section className="glass-panel preview-panel">
      <div className="preview-head">
        <div>
          <h4>Data Preview</h4>
          <p>
            Editing: <span>{upload?.sourceFile || "No file selected"}</span>
          </p>
        </div>
        <strong>
          <CheckCircle size={15} /> {reviewStatusLabel(upload, missingRequired)}
        </strong>
      </div>

      {!upload ? (
        <div className="preview-body">
          <EmptyState>Upload a policy PDF to load its dynamic preview.</EmptyState>
        </div>
      ) : (
        <>
          <div className="detection-summary">
            <div>
              <span>Source File</span>
              <strong>{upload.sourceFile || "-"}</strong>
            </div>
            <div>
              <span>Policy Type</span>
              <strong>{upload.extractedData?.policyType || "-"}</strong>
            </div>
            <div>
              <span>Insurance Company</span>
              <strong>
                <InsurerLogo company={upload.extractedData?.insuranceCompany} />
              </strong>
            </div>
            <div>
              <span>Schema</span>
              <strong>
                {resolvedSchema
                  ? `${resolvedSchema.groupLabel} / ${resolvedSchema.policyName}`
                  : "General Review"}
              </strong>
            </div>
            <div>
              <span>Extraction</span>
              <strong>{upload.extractionMethod || "unknown"}</strong>
            </div>
            <div>
              <span>Fields Filled</span>
              <strong>{`${filledFieldCount}/${visibleFields.length}`}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>
                {uploadStatus === UPLOAD_STATUS.APPROVED ? "Database Ready" : "Ready for Review"}
              </strong>
            </div>
          </div>

          {missingRequired.length ? (
            <section className="alert-card warning">
              <div className="alert-icon">
                <ShieldCheck size={18} />
              </div>
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

                      return (
                        <PreviewField
                          key={key}
                          label={label}
                          meta={getFieldMeta(key)}
                          value={getPreviewValue(key)}
                          onChange={(value) => onFieldChange(key, value)}
                          options={FIELD_OPTIONS[key]}
                          wide={["riskLocation", "description", "occupancy", "remark"].includes(key)}
                          error={fieldError}
                          disabled={isDisabled}
                          suggestion={getEligibleAiSuggestion(upload, key)}
                          onApplySuggestion={(suggestion) =>
                            applyAiSuggestionToReviewField({ fieldKey: key, suggestion, onFieldChange })
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
              disabled={isSaving || uploadStatus === UPLOAD_STATUS.APPROVED || !validation.valid}
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
