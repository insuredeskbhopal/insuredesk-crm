"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle, X } from "lucide-react";
import PageHeader from "@/app/components/layout/PageHeader";

const PROFILE_STATUS = ["New Lead", "Follow-up Required", "Interested", "Not Interested", "Converted", "Lost"];
const FOLLOW_UP_OUTCOMES = ["", "Interested", "Call Back Later", "Not Interested", "Converted", "Wrong Number", "Not Reachable"];
const LOB_OPTIONS = ["Motor Insurance", "Health Insurance", "Life Insurance", "Warehouse Insurance", "Fire Insurance", "Marine Insurance", "Travel Insurance", "Cyber Insurance", "Shop / Office Insurance", "Business Insurance", "Other"];

const LOB_FIELDS = {
  "Motor Insurance": [["vehicleType", "Vehicle Type"], ["vehicleNumber", "Vehicle Number"], ["existingPolicyAvailable", "Existing Policy Available?"], ["renewalDate", "Renewal Date", "date"]],
  "Warehouse Insurance": [["warehouseLocation", "Warehouse Location"], ["stockValue", "Stock Value"], ["existingInsuranceAvailable", "Existing Insurance Available?"], ["renewalDate", "Renewal Date", "date"]],
  "Life Insurance": [["age", "Age"], ["incomeRange", "Income Range"], ["familyMembers", "Family Members"], ["existingLifeCover", "Existing Life Cover?"]],
  "Health Insurance": [["familySize", "Family Size"], ["existingHealthCover", "Existing Health Cover?"], ["sumInsuredNeed", "Expected Sum Insured"], ["renewalDate", "Renewal Date", "date"]],
  "Fire Insurance": [["riskLocation", "Risk Location"], ["propertyValue", "Property Value"], ["occupancy", "Occupancy"], ["renewalDate", "Renewal Date", "date"]],
  "Marine Insurance": [["cargoType", "Cargo Type"], ["route", "Route"], ["annualTransitValue", "Annual Transit Value"], ["existingInsuranceAvailable", "Existing Insurance Available?"]],
  "Travel Insurance": [["destination", "Destination"], ["travelDate", "Travel Date", "date"], ["travellers", "Travellers"], ["tripDuration", "Trip Duration"]],
  "Cyber Insurance": [["businessWebsite", "Business Website"], ["dataExposure", "Customer/Data Exposure"], ["employeeCount", "Employee Count"], ["existingInsuranceAvailable", "Existing Insurance Available?"]],
  "Shop / Office Insurance": [["shopLocation", "Shop / Office Location"], ["assetValue", "Asset Value"], ["stockValue", "Stock Value"], ["renewalDate", "Renewal Date", "date"]],
  "Business Insurance": [["businessCategory", "Business Category"], ["turnoverRange", "Turnover Range"], ["employeeCount", "Employee Count"], ["keyRisk", "Key Risk"]],
  Other: [["insuranceNeed", "Insurance Need"], ["estimatedValue", "Estimated Value"], ["notes", "Notes"]]
};

export default function CustomerProfileDetailPage({ params }) {
  const router = useRouter();
  const [profileId, setProfileId] = useState("");
  const [form, setForm] = useState(null);
  const [convertType, setConvertType] = useState("");
  const [alert, setAlert] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [conversionModalData, setConversionModalData] = useState(null);

  useEffect(() => {
    Promise.resolve(params).then((resolved) => setProfileId(resolved.id));
  }, [params]);

  useEffect(() => {
    if (!profileId) return;
    startTransition(async () => {
      const response = await fetch(`/api/customer-profiles/${profileId}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAlert({ type: "error", message: payload.error || "Customer profile could not be loaded." });
        return;
      }
      setForm(toForm(payload));
    });
  }, [profileId]);

  const selectedTypes = form?.selectedLOBs || [];

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleLob(lob) {
    setForm((current) => {
      const selected = new Set(current.selectedLOBs || []);
      if (selected.has(lob)) selected.delete(lob);
      else selected.add(lob);
      return { ...current, selectedLOBs: [...selected] };
    });
  }

  function updateLobField(lob, key, value) {
    setForm((current) => ({
      ...current,
      lobDetails: {
        ...(current.lobDetails || {}),
        [lob]: {
          ...(current.lobDetails?.[lob] || {}),
          [key]: value
        }
      }
    }));
  }

  function saveProfile() {
    startTransition(async () => {
      setAlert(null);
      const response = await fetch(`/api/customer-profiles/${profileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAlert({ type: "error", message: payload.error || "Customer profile could not be saved." });
        return;
      }
      setForm(toForm(payload));
      setAlert({ type: "success", message: "Customer profile updated." });
    });
  }

  const generateMessageText = (profile, conversionType, handoffRemark) => {
    if (!profile) return "";
    let lines = [];
    
    // 1. Which policy the client asked for
    lines.push(`*We need this policy*: ${conversionType || "General Insurance"}`);
    lines.push(``);
    
    // 2. Handoff Instruction
    if (handoffRemark) {
      lines.push(`*Handoff Instruction (for Agent/Team)*: ${handoffRemark}`);
      lines.push(``);
    }
    
    // 3. Client details
    lines.push(`*CLIENT DETAILS*`);
    lines.push(`- *Name*: ${profile.name || "-"}`);
    lines.push(`- *Phone*: ${profile.phone || "-"}`);
    if (profile.email) lines.push(`- *Email*: ${profile.email}`);
    if (profile.city || profile.state) lines.push(`- *Location*: ${[profile.city, profile.state].filter(Boolean).join(", ")}`);
    if (profile.address) lines.push(`- *Address*: ${profile.address}`);
    
    // 4. LOB Specific Details
    if (conversionType && LOB_FIELDS[conversionType]) {
      lines.push(``);
      lines.push(`*Policy Interest Details*:`);
      LOB_FIELDS[conversionType].forEach(([key, label, type]) => {
        const val = profile.lobDetails?.[conversionType]?.[key];
        let displayVal = val || "-";
        if (type === "date" && val) {
          displayVal = formatDate(val);
        }
        lines.push(`- ${label}: ${displayVal}`);
      });
    }

    // 5. Last two conversation follow-ups
    const followUps = profile.lobDetails?.followUps || [];
    if (followUps.length > 0) {
      lines.push(``);
      lines.push(`*Last 2 Conversations*:`);
      const lastTwo = followUps.slice(-2);
      lastTwo.forEach((entry, idx) => {
        const dateStr = entry.createdAt ? formatDateTime(entry.createdAt) : "-";
        const author = entry.createdBy || "Agent";
        const cleanRemark = entry.rawRemark || entry.remark || "-";
        lines.push(`[${idx + 1}] *Date*: ${dateStr} | *By*: ${author}`);
        lines.push(`*Remark*: ${cleanRemark}`);
      });
    } else if (profile.followUpRemark) {
      lines.push(``);
      lines.push(`*Last Conversation*:`);
      lines.push(`*Remark*: ${profile.followUpRemark}`);
    }

    if (profile.remarks) {
      lines.push(``);
      lines.push(`*General Remarks*: ${profile.remarks}`);
    }

    return lines.join("\n");
  };

  const handlePrintProfile = (profile, conversionType, handoffRemark) => {
    if (!profile) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.alert("Please allow popups to print lead details.");
      return;
    }

    const renderPrintSection = (title, fields) => {
      const validFields = fields.filter(([_, val]) => val !== undefined && val !== null && String(val).trim() !== "");
      if (validFields.length === 0) return "";
      return `
        <div class="section">
          <h3>${title}</h3>
          <div class="grid">
            ${validFields.map(([lbl, val]) => `
              <div class="field">
                <span class="label">${lbl}</span>
                <span class="value">${val}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    };

    const generalFields = [
      ["Name", profile.name],
      ["Phone", profile.phone],
      ["Alternate Phone", profile.alternatePhone],
      ["Email", profile.email],
      ["State", profile.state],
      ["City", profile.city],
      ["Address", profile.address],
      ["Occupation", profile.occupation],
      ["Business Type", profile.businessType],
      ["Assigned To", profile.assignedTo],
      ["Reference Source", profile.referenceSource],
      ["Status", "Converted"],
      ["Conversion Target LOB", conversionType]
    ];

    const lobFields = [];
    if (conversionType && LOB_FIELDS[conversionType]) {
      LOB_FIELDS[conversionType].forEach(([key, label, type]) => {
        const val = profile.lobDetails?.[conversionType]?.[key];
        let displayVal = val;
        if (type === "date" && val) {
          displayVal = formatDate(val);
        }
        lobFields.push([label, displayVal]);
      });
    }

    let followUpsHtml = "";
    const followUps = profile.lobDetails?.followUps || [];
    if (followUps.length > 0) {
      const lastTwo = followUps.slice(-2);
      followUpsHtml = `
        <div class="section">
          <h3>Last 2 Conversations</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${lastTwo.map((entry, idx) => {
              const dateStr = entry.createdAt ? formatDateTime(entry.createdAt) : "-";
              const author = entry.createdBy || "Agent";
              const cleanRemark = entry.rawRemark || entry.remark || "-";
              return `
                <div class="field" style="background: #ffffff; border-color: #e2e8f0;">
                  <span class="label" style="font-size: 8px; font-weight: 700; color: #64748b; margin-bottom: 4px;">Conversation #${idx + 1} - ${dateStr} by ${author}</span>
                  <span class="value" style="font-size: 11px; font-weight: 500; color: #334155; display: block; white-space: pre-wrap;">${cleanRemark}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    } else if (profile.followUpRemark) {
      followUpsHtml = `
        <div class="section">
          <h3>Last Conversation</h3>
          <div class="field" style="background: #ffffff; border-color: #e2e8f0;">
            <span class="value" style="font-size: 11px; font-weight: 500; color: #334155; display: block; white-space: pre-wrap;">${profile.followUpRemark}</span>
          </div>
        </div>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Converted Lead - ${profile.name || "Details"}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              padding: 24px;
              line-height: 1.4;
              margin: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .header-left h1 {
              margin: 0;
              font-size: 20px;
              font-weight: 800;
              color: #1e3a8a;
            }
            .header-left p {
              margin: 4px 0 0;
              color: #64748b;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 700;
            }
            .print-logo {
              height: 48px;
              width: auto;
              object-fit: contain;
            }
            .section {
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            .section h3 {
              margin: 0 0 10px;
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
            }
            .field {
              padding: 8px 12px;
              background: #f8fafc;
              border: 1px solid #f1f5f9;
              border-radius: 6px;
            }
            .label {
              font-size: 9px;
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
              display: block;
              margin-bottom: 2px;
            }
            .value {
              font-size: 11px;
              font-weight: 600;
              color: #0f172a;
            }
            @media print {
              .field {
                background: #f8fafc !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <h1>Lead Converted Successfully</h1>
              <p>We need this policy: ${conversionType}</p>
            </div>
            <img src="${window.location.origin}/brand/main-logo-wide.png" alt="Logo" class="print-logo" />
          </div>
          
          ${handoffRemark ? `
            <div class="section">
              <h3>Handoff Instruction / Team Remark</h3>
              <div class="field" style="background: #eff6ff; border-color: #bfdbfe;">
                <span class="value" style="font-weight: 600; color: #1e3a8a; display: block; white-space: pre-wrap;">${handoffRemark}</span>
              </div>
            </div>
          ` : ""}

          ${renderPrintSection("General Client Information", generalFields)}
          ${lobFields.length ? renderPrintSection(`${conversionType} Details`, lobFields) : ""}
          ${followUpsHtml}
          
          ${profile.remarks ? `
            <div class="section">
              <h3>Remarks</h3>
              <div class="field" style="background: #fffbeb; border-color: #fef3c7;">
                <span class="value" style="font-weight: 500; white-space: pre-wrap;">${profile.remarks}</span>
              </div>
            </div>
          ` : ""}

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  function convertProfile() {
    const conversionType = convertType || selectedTypes[0] || "General Insurance";
    if (!profileId) {
      setAlert({ type: "error", message: "Customer profile not loaded." });
      return;
    }
    if (!form?.name || !form?.phone || !form?.assignedTo) {
      setAlert({ type: "error", message: "Complete Name, Phone, and Assigned To fields before converting." });
      return;
    }

    setConversionModalData({
      profile: form,
      conversionType: conversionType,
      handoffRemark: "",
      step: "remark",
      error: ""
    });
  }

  async function submitConversion(remark) {
    if (!remark || !remark.trim()) {
      setConversionModalData(current => ({ ...current, error: "Handoff remark is required to convert the lead." }));
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/customer-profiles/${profileId}/convert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ insuranceType: conversionModalData.conversionType })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setConversionModalData(current => ({ ...current, error: payload.error || "Conversion could not be started." }));
          return;
        }
        setConversionModalData(current => ({
          ...current,
          handoffRemark: remark.trim(),
          step: "options",
          error: ""
        }));
        setForm((current) => ({ ...current, status: "Converted" }));
        setAlert({ type: "success", message: "Customer profile converted successfully!" });
      } catch (err) {
        setConversionModalData(current => ({ ...current, error: err.message || "An error occurred." }));
      }
    });
  }

  if (!form) {
    return (
      <div className="customer-profiling-page">
        <PageHeader eyebrow="Customer Profiling" title="Customer Profile" subtitle="Loading profile details." />
      </div>
    );
  }

  return (
    <div className="customer-profiling-page">
      <PageHeader eyebrow="Customer Profiling" title={form.name || "Customer Profile"} subtitle="Call the client, capture policy interest, and update follow-up status." />

      {alert ? (
        <div className={`customer-profile-alert ${alert.type}`}>
          {alert.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{alert.message}</span>
        </div>
      ) : null}

      <section className="customer-profile-card">
        <div className="customer-profile-section-head">
          <div>
            <h2>Basic Profile</h2>
            <p>These fields can be corrected while speaking with the client.</p>
          </div>
        </div>
        <div className="customer-profile-grid">
          <Field label="Customer Name" value={form.name} onChange={(value) => updateField("name", value)} />
          <Field label="Phone" value={form.phone} onChange={(value) => updateField("phone", value)} />
          <Field label="Alternate Phone" value={form.alternatePhone} onChange={(value) => updateField("alternatePhone", value)} />
          <Field label="Email" value={form.email} onChange={(value) => updateField("email", value)} />
          <Field label="State" value={form.state} onChange={(value) => updateField("state", value)} />
          <Field label="City" value={form.city} onChange={(value) => updateField("city", value)} />
          <Field label="Occupation / Business Type" value={form.occupation} onChange={(value) => updateField("occupation", value)} />
          <Field label="Assigned To" value={form.assignedTo} onChange={(value) => updateField("assignedTo", value)} />
          <Field label="Address" wide value={form.address} onChange={(value) => updateField("address", value)} />
          <Field label="Remark" wide value={form.remarks} onChange={(value) => updateField("remarks", value)} />
        </div>
      </section>

      <section className="customer-profile-card">
        <div className="customer-profile-section-head">
          <div>
            <h2>Policy Need Discussed</h2>
            <p>Select what the client wants after the call, then fill the relevant details.</p>
          </div>
        </div>
        <div className="lob-checklist">
          {LOB_OPTIONS.map((lob) => (
            <label key={lob}>
              <input type="checkbox" checked={selectedTypes.includes(lob)} onChange={() => toggleLob(lob)} />
              <span>{lob}</span>
            </label>
          ))}
        </div>
        {selectedTypes.map((lob) => (
          <fieldset key={lob} className="lob-detail-card">
            <legend>{lob}</legend>
            <div className="customer-profile-grid">
              {(LOB_FIELDS[lob] || LOB_FIELDS.Other).map(([key, label, type]) => (
                <Field key={key} label={label} type={type || "text"} value={form.lobDetails?.[lob]?.[key] || ""} onChange={(value) => updateLobField(lob, key, value)} />
              ))}
            </div>
          </fieldset>
        ))}
      </section>

      <section className="customer-profile-card">
        <div className="customer-profile-section-head">
          <div>
            <h2>Follow-up Stage</h2>
            <p>Use this after the customer conversation.</p>
          </div>
        </div>
        <div className="customer-profile-grid">
          <SelectField label="Status" value={form.status} options={PROFILE_STATUS} onChange={(value) => updateField("status", value)} />
          <Field label="Last Follow-up Date" type="date" value={form.lastFollowUpDate} onChange={(value) => updateField("lastFollowUpDate", value)} />
          <Field label="Next Follow-up Date" type="date" value={form.nextFollowUpDate} onChange={(value) => updateField("nextFollowUpDate", value)} />
          <SelectField label="Follow-up Outcome" value={form.followUpOutcome} options={FOLLOW_UP_OUTCOMES} onChange={(value) => updateField("followUpOutcome", value)} />
          <Field label="Follow-up Note" wide value={form.followUpRemark} onChange={(value) => updateField("followUpRemark", value)} />
        </div>
      </section>

      <section className="customer-profile-actions">
        <button type="button" onClick={saveProfile} disabled={isPending}>Save Details</button>
        <select value={convertType} onChange={(event) => setConvertType(event.target.value)}>
          <option value="">Select converted policy type</option>
          {selectedTypes.map((lob) => <option key={lob} value={lob}>{lob}</option>)}
        </select>
        <button className="secondary-action" type="button" onClick={convertProfile} disabled={isPending}>Convert Lead</button>
        <button type="button" onClick={() => router.push("/dashboard/manual-entry/customer-profiling")}>Back</button>
      </section>

      {typeof window !== "undefined" && conversionModalData && createPortal(
        <div
          className="tb-modal-backdrop"
          onClick={() => setConversionModalData(null)}
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
            padding: "24px"
          }}
        >
          <div
            className="tb-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              boxShadow: "0 25px 70px -10px rgba(0, 0, 0, 0.08), 0 10px 30px -15px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.03)",
              width: "100%",
              maxWidth: "600px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "none",
              animation: "modal-pop 320ms cubic-bezier(0.2, 0, 0, 1) both"
            }}
          >
            {conversionModalData.step === "remark" ? (
              <>
                {/* Step 1: Collect Handoff Remark */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "20px 24px",
                    borderBottom: "1px solid #f1f5f9"
                  }}
                >
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", color: "var(--primary)" }}>Lead Conversion</span>
                    <h2 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: "850", color: "#0f172a" }}>
                      Enter Handoff Instructions
                    </h2>
                  </div>
                  <button
                    onClick={() => setConversionModalData(null)}
                    aria-label="Close"
                    style={{
                      background: "rgba(15, 23, 42, 0.05)",
                      border: "none",
                      color: "#64748b",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      transition: "background-color 0.2s"
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <p style={{ margin: 0, fontSize: "14px", color: "#475569", lineHeight: "1.5" }}>
                    Please enter the handoff remark or instructions for the relevant team who will be handling this converted lead.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Handoff Remark / Instructions (Required)</span>
                    <textarea
                      placeholder="Type the remark for the team here..."
                      value={conversionModalData.handoffRemark || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConversionModalData(current => ({ ...current, handoffRemark: val, error: "" }));
                      }}
                      style={{
                        width: "100%",
                        height: "120px",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        fontSize: "14px",
                        color: "#334155",
                        resize: "none"
                      }}
                    />
                  </div>

                  {conversionModalData.error ? (
                    <div style={{ color: "#ef4444", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                      <AlertTriangle size={16} />
                      <span>{conversionModalData.error}</span>
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    padding: "16px 24px",
                    borderTop: "1px solid #f1f5f9",
                    gap: "12px"
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setConversionModalData(null)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "12px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      color: "#475569",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => submitConversion(conversionModalData.handoffRemark)}
                    disabled={isPending}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "12px",
                      border: "none",
                      backgroundColor: "var(--primary)",
                      color: "#ffffff",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    {isPending ? "Converting..." : "Convert Lead"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Step 2: Converted options */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "20px 24px",
                    borderBottom: "1px solid #f1f5f9"
                  }}
                >
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", color: "var(--primary)" }}>Lead Converted</span>
                    <h2 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: "850", color: "#0f172a" }}>
                      Team Handoff Options
                    </h2>
                  </div>
                  <button
                    onClick={() => setConversionModalData(null)}
                    aria-label="Close"
                    style={{
                      background: "rgba(15, 23, 42, 0.05)",
                      border: "none",
                      color: "#64748b",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      transition: "background-color 0.2s"
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                  <p style={{ margin: 0, fontSize: "14px", color: "#475569", lineHeight: "1.5" }}>
                    This lead has been successfully marked as <strong>Converted</strong>. You can now format a message for WhatsApp / team share, or print a summary for handoff.
                  </p>

                  {/* Message Preview Textarea */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Message Summary Preview</span>
                    <textarea
                      readOnly
                      value={generateMessageText(conversionModalData.profile, conversionModalData.conversionType, conversionModalData.handoffRemark)}
                      style={{
                        width: "100%",
                        height: "180px",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        color: "#334155",
                        resize: "none"
                      }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const text = generateMessageText(conversionModalData.profile, conversionModalData.conversionType, conversionModalData.handoffRemark);
                        if (typeof window !== "undefined" && window.navigator && window.navigator.clipboard) {
                          window.navigator.clipboard.writeText(text);
                          alert("Message summary copied to clipboard!");
                        } else {
                          alert("Clipboard copy not supported in this browser. Please copy the preview manually.");
                        }
                      }}
                      style={{
                        padding: "12px",
                        borderRadius: "12px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        color: "#0f172a",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px"
                      }}
                    >
                      Copy Message
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const text = generateMessageText(conversionModalData.profile, conversionModalData.conversionType, conversionModalData.handoffRemark);
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                      }}
                      style={{
                        padding: "12px",
                        borderRadius: "12px",
                        border: "none",
                        backgroundColor: "#25D366",
                        color: "#ffffff",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px"
                      }}
                    >
                      Send on WhatsApp
                    </button>
                  </div>
                </div>

                {/* Modal Footer */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 24px",
                    borderTop: "1px solid #f1f5f9"
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handlePrintProfile(conversionModalData.profile, conversionModalData.conversionType, conversionModalData.handoffRemark)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "12px",
                      border: "1px solid var(--primary)",
                      backgroundColor: "#ffffff",
                      color: "var(--primary)",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    Print Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => setConversionModalData(null)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "12px",
                      border: "none",
                      backgroundColor: "var(--primary)",
                      color: "#ffffff",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      , document.body)}
    </div>
  );
}

function toForm(profile) {
  return {
    ...profile,
    followUpDate: profile.followUpDate ? new Date(profile.followUpDate).toISOString().slice(0, 10) : "",
    lastFollowUpDate: profile.lastFollowUpDate ? new Date(profile.lastFollowUpDate).toISOString().slice(0, 10) : "",
    nextFollowUpDate: profile.nextFollowUpDate ? new Date(profile.nextFollowUpDate).toISOString().slice(0, 10) : "",
    selectedLOBs: profile.selectedLOBs || [],
    lobDetails: profile.lobDetails || {}
  };
}

function Field({ label, value, onChange, type = "text", wide = false }) {
  const input = wide ? (
    <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} />
  ) : (
    <input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} />
  );

  return (
    <label className={wide ? "wide" : ""}>
      <span>{label}</span>
      {input}
    </label>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN");
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}
