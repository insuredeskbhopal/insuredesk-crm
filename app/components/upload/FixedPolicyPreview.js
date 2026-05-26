import { CheckCircle, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import PreviewField from "../shared/PreviewField";
import EmptyState from "../shared/EmptyState";
import {
  FIELD_SETUP,
  FIELD_GROUPS,
  inferUploadSchema,
  getMissingRequiredFields,
  reviewStatusLabel,
  hasValue
} from "@/app/lib/dashboard-helpers";

export default function FixedPolicyPreview({ upload, isSaving, onFieldChange, onClear, onSave }) {
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
