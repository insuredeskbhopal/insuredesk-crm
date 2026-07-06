"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { X, Printer, Pencil, LoaderCircle, CheckCircle } from "lucide-react";
import {
  FIELD_GROUPS,
  FUEL_TYPE_OPTIONS,
  PAYMENT_MODE_OPTIONS,
  getReviewValidation,
} from "@/app/lib/dashboard-helpers";
import { validateContactPerson, validateContactNumber } from "@/lib/records/validation";
import PreviewField from "@/app/components/shared/PreviewField";


const FIELD_OPTIONS = {
  fuelType: FUEL_TYPE_OPTIONS,
  modeOfPayment: PAYMENT_MODE_OPTIONS,
  newOrRenewal: [
    { value: "", label: "Select New / Renewal" },
    { value: "New", label: "New" },
    { value: "Renewal", label: "Renewal" },
  ],
};

const formatDate = (dateVal) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (dateVal) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function DetailField({ label, value, wide }) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "8px 12px",
        background: "#f8fafc",
        borderRadius: "8px",
        border: "1px solid #f1f5f9",
        gridColumn: wide ? "span 2" : undefined,
      }}
    >
      <span
        style={{
          fontSize: "10px",
          fontWeight: "600",
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", wordBreak: "break-all" }}>
        {String(value)}
      </span>
    </div>
  );
}

function DetailSection({ title, children }) {
  const validChildren = React.Children.toArray(children).filter((child) => child !== null);
  if (validChildren.length === 0) return null;

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: "14px",
          fontWeight: "700",
          color: "#1e3a8a",
          borderBottom: "2px solid #f1f5f9",
          paddingBottom: "8px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {title}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {children}
      </div>
    </div>
  );
}

export default function PolicyDetailCard({
  mode = "view",
  record,
  onClose,
  // Edit mode specific props:
  editForm,
  updateEditField,
  onSave,
  isSaving = false,
  // View mode specific props:
  onPrint,
}) {
  const validation = useMemo(() => {
    return getReviewValidation({
      sourceFile: record?.sourceFile || "",
      extractedData: mode === "edit" ? editForm : record,
    });
  }, [record, editForm, mode]);

  const fieldGroups = useMemo(() => {
    return FIELD_GROUPS.map((group) => {
      const fieldsInGroup = validation.visibleFields.filter(([, key]) => group.fields.includes(key));
      return {
        title: group.title,
        fields: fieldsInGroup,
      };
    }).filter((group) => group.fields.length > 0);
  }, [validation.visibleFields]);

  if (!record) return null;

  const resolvedSchema = validation.resolvedSchema;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.3)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={onClose}
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
          maxWidth: "800px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "none",
          animation: "modal-pop 320ms cubic-bezier(0.2, 0, 0, 1) both",
        }}
      >
        {/* Header */}
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
                {mode === "edit"
                  ? (resolvedSchema ? `${resolvedSchema.groupLabel} / ${resolvedSchema.policyName}` : "Edit lead data")
                  : "Policy Record Details"}
              </span>
              <h2
                style={{
                  margin: "4px 0 0",
                  fontSize: "20px",
                  fontWeight: "800",
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {mode === "edit" && <Pencil size={18} style={{ color: "#64748b" }} />}
                {mode === "edit" ? "Edit lead data" : (record.policyNumber || "No Policy Number")}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
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

        {/* Body */}
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
          {mode === "view" ? (
            <>
              {fieldGroups.map((group) => {
                const fieldsWithValue = group.fields.filter(([, key]) => {
                  const val = record[key];
                  return val !== undefined && val !== null && String(val).trim() !== "";
                });

                if (fieldsWithValue.length === 0) return null;

                return (
                  <DetailSection key={group.title} title={group.title}>
                    {fieldsWithValue.map(([label, key]) => {
                      const isDate = [
                        "startDate",
                        "expiryDate",
                        "registrationDate",
                        "savedAt",
                        "createdAt",
                      ].includes(key);
                      const displayVal = isDate ? formatDate(record[key]) : record[key];
                      return (
                        <DetailField
                          key={key}
                          label={label}
                          value={displayVal}
                          wide={["riskLocation", "description", "occupancy", "remark", "insuredName", "insuranceCompany", "makeModel"].includes(key)}
                        />
                      );
                    })}
                  </DetailSection>
                );
              })}

              <DetailSection title="Metadata">
                <DetailField label="Source PDF File" value={record.sourceFile} wide />
                <DetailField
                  label="Created By"
                  value={record.uploadedByEmail || record.uploadedBy || record.createdByEmail || record.createdBy}
                />
                <DetailField
                  label="Saved Date"
                  value={record.savedAt ? formatDateTime(record.savedAt) : ""}
                />
                <DetailField label="Renewal Status" value={record.renewalStatus} />
              </DetailSection>
            </>
          ) : (
            <div className="preview-form-grouped" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {fieldGroups.map((group) => (
                <fieldset
                  key={group.title}
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    margin: 0,
                  }}
                >
                  <legend
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#1e3a8a",
                      padding: "0 8px",
                    }}
                  >
                    {group.title}
                  </legend>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {group.fields.map(([label, key]) => {
                      const contactPersonError = validateContactPerson(editForm.contactPerson);
                      const isContactNumber = key === "contactNumber";
                      const error =
                        key === "contactPerson"
                          ? contactPersonError
                          : isContactNumber
                            ? validateContactNumber(editForm.contactNumber)
                            : "";
                      return (
                        <PreviewField
                          key={key}
                          label={label}
                          value={editForm[key] || ""}
                          onChange={(value) => updateEditField(key, value)}
                          options={FIELD_OPTIONS[key]}
                          wide={["riskLocation", "description", "occupancy", "remark"].includes(key)}
                          error={error}
                          disabled={isContactNumber && Boolean(contactPersonError)}
                        />
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
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
          {mode === "view" ? (
            <>
              <button
                onClick={() => onPrint && onPrint(record)}
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
                onClick={onClose}
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
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
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
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
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
                {isSaving ? <LoaderCircle size={16} className="spin" /> : <CheckCircle size={16} />}
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
