"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AlertTriangle, ArrowLeft, CheckCircle, MessageSquare, Phone, Printer, Send, UserRound, X } from "lucide-react";

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
  const [profile, setProfile] = useState(null);
  const [followUpForm, setFollowUpForm] = useState({ status: "Follow-up Required", outcome: "", nextFollowUpDate: "", policyInterest: "", policyDetails: {}, remark: "" });
  const [conversionModal, setConversionModal] = useState(null);
  const [alert, setAlert] = useState(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    Promise.resolve(params).then((resolved) => setProfileId(resolved.id));
  }, [params]);

  useEffect(() => {
    if (!profileId) return;
    startTransition(async () => {
      const response = await fetch(`/api/customer-profiles/${profileId}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAlert({ type: "error", message: payload.error || "Customer profile could not be loaded." });
        return;
      }
      setProfile(payload);
      const policyInterest = payload.selectedLOBs?.[0] || "";
      setFollowUpForm({
        status: payload.status || "Follow-up Required",
        outcome: payload.followUpOutcome || "",
        nextFollowUpDate: toInputDate(payload.nextFollowUpDate || payload.followUpDate),
        policyInterest,
        policyDetails: policyInterest ? (payload.lobDetails?.[policyInterest] || {}) : {},
        remark: ""
      });
    });
  }, [profileId]);

  const viewModel = useMemo(() => buildProfileView(profile), [profile]);

  function callCustomer() {
    if (!profile?.phone) {
      window.alert("No mobile number available.");
      return;
    }
    window.open(`tel:${profile.phone}`);
  }

  function whatsappCustomer() {
    if (!profile?.phone) {
      window.alert("No mobile number available.");
      return;
    }
    const message = `Hello ${profile.name || "Customer"}, following up regarding your insurance requirement.`;
    window.open(`https://wa.me/91${profile.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
  }

  function saveFollowUp() {
    if (!profile) return;
    if (!followUpForm.policyInterest) {
      setAlert({ type: "error", message: "Select interested policy type before updating follow-up." });
      return;
    }
    const now = new Date().toISOString();
    const existingFollowUps = Array.isArray(profile.lobDetails?.followUps) ? profile.lobDetails.followUps : [];
    const policyDetails = followUpForm.policyDetails || {};
    const nextFollowUps = followUpForm.remark.trim()
      ? [
          {
            id: `${Date.now()}`,
            createdAt: now,
            createdBy: profile.updatedBy || profile.assignedTo || "User",
            rawRemark: followUpForm.remark.trim(),
            remark: followUpForm.remark.trim(),
            status: followUpForm.status,
            outcome: followUpForm.outcome,
            nextFollowUpDate: followUpForm.nextFollowUpDate,
            policyInterest: followUpForm.policyInterest,
            policyDetails
          },
          ...existingFollowUps
        ]
      : existingFollowUps;
    const selectedLOBs = unique([...(profile.selectedLOBs || []), followUpForm.policyInterest]);

    const payload = {
      ...profile,
      selectedLOBs,
      status: followUpForm.status,
      followUpOutcome: followUpForm.outcome,
      followUpRemark: followUpForm.remark.trim() || profile.followUpRemark || "",
      lastFollowUpDate: now,
      nextFollowUpDate: followUpForm.nextFollowUpDate || null,
      lobDetails: {
        ...(profile.lobDetails || {}),
        [followUpForm.policyInterest]: policyDetails,
        followUps: nextFollowUps
      }
    };

    startTransition(async () => {
      setAlert(null);
      const response = await fetch(`/api/customer-profiles/${profileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const updated = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAlert({ type: "error", message: updated.error || "Customer profile could not be updated." });
        return;
      }
      setProfile(updated);
      setFollowUpForm((current) => ({ ...current, remark: "" }));
      setAlert({ type: "success", message: "Customer profile updated." });
    });
  }

  function updatePolicyInterest(value) {
    setFollowUpForm((current) => ({
      ...current,
      policyInterest: value,
      policyDetails: value ? (profile?.lobDetails?.[value] || {}) : {}
    }));
  }

  function updatePolicyDetail(key, value) {
    setFollowUpForm((current) => ({
      ...current,
      policyDetails: {
        ...(current.policyDetails || {}),
        [key]: value
      }
    }));
  }

  function openConvertModal() {
    if (!followUpForm.policyInterest) {
      setAlert({ type: "error", message: "Select interested policy type before converting." });
      return;
    }
    setConversionModal({ step: "remark", agentRemark: "", error: "", converted: false });
  }

  async function submitConversion() {
    if (!conversionModal?.agentRemark?.trim()) {
      setConversionModal((current) => ({ ...current, error: "Agent remark is required before converting." }));
      return;
    }

    const remark = conversionModal.agentRemark.trim();
    const now = new Date().toISOString();
    const nextFollowUps = [
      {
        id: `convert-${Date.now()}`,
        createdAt: now,
        createdBy: profile.updatedBy || profile.assignedTo || "User",
        rawRemark: remark,
        remark,
        status: "Converted",
        outcome: "Converted",
        policyInterest: followUpForm.policyInterest,
        policyDetails: followUpForm.policyDetails || {}
      },
      ...(Array.isArray(profile.lobDetails?.followUps) ? profile.lobDetails.followUps : [])
    ];

    const savePayload = {
      ...profile,
      status: "Converted",
      followUpOutcome: "Converted",
      followUpRemark: remark,
      lastFollowUpDate: now,
      selectedLOBs: unique([...(profile.selectedLOBs || []), followUpForm.policyInterest]),
      lobDetails: {
        ...(profile.lobDetails || {}),
        [followUpForm.policyInterest]: followUpForm.policyDetails || {},
        followUps: nextFollowUps
      }
    };

    startTransition(async () => {
      const saveResponse = await fetch(`/api/customer-profiles/${profileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savePayload)
      });
      const saved = await saveResponse.json().catch(() => ({}));
      if (!saveResponse.ok) {
        setConversionModal((current) => ({ ...current, error: saved.error || "Agent remark could not be saved." }));
        return;
      }

      const convertResponse = await fetch(`/api/customer-profiles/${profileId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insuranceType: followUpForm.policyInterest })
      });
      const converted = await convertResponse.json().catch(() => ({}));
      if (!convertResponse.ok) {
        setConversionModal((current) => ({ ...current, error: converted.error || "Customer could not be converted." }));
        return;
      }

      setProfile({ ...saved, status: "Converted", convertedToCustomer: true });
      setFollowUpForm((current) => ({ ...current, status: "Converted", outcome: "Converted", remark: "" }));
      setConversionModal({ step: "options", agentRemark: remark, error: "", redirectUrl: converted.redirectUrl });
      setAlert({ type: "success", message: "Customer converted. Share or print the handoff message." });
    });
  }

  function conversionMessage() {
    if (!profile) return "";
    const fields = formatPolicyDetails(followUpForm.policyInterest, followUpForm.policyDetails || {});
    return [
      `Customer Profiling Handoff`,
      ``,
      `Policy Needed: ${followUpForm.policyInterest || "-"}`,
      `Agent Remark: ${conversionModal?.agentRemark || "-"}`,
      ``,
      `Customer: ${profile.name || "-"}`,
      `Mobile: ${profile.phone || "-"}`,
      `Address: ${[profile.address, profile.city, profile.state].filter(Boolean).join(", ") || "-"}`,
      `Assigned Agent: ${profile.assignedTo || profile.createdBy || "-"}`,
      ``,
      `Policy Fields:`,
      fields || "-"
    ].join("\n");
  }

  function sendConversionWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(conversionMessage())}`, "_blank");
  }

  function printConversion() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.alert("Please allow popups to print handoff details.");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Customer Profiling Handoff</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #111827; }
            h1 { font-size: 22px; margin: 0 0 16px; }
            pre { white-space: pre-wrap; font-size: 13px; line-height: 1.6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
          </style>
        </head>
        <body>
          <h1>Customer Profiling Handoff</h1>
          <pre>${escapeHtml(conversionMessage())}</pre>
          <script>window.onload = function(){ window.print(); setTimeout(function(){ window.close(); }, 500); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (!profile && !alert) {
    return (
      <div className="customer-profiling-page">
        <p style={{ margin: 0, color: "#64748b" }}>Loading customer profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="customer-profiling-page">
        <button className="customer-portfolio-back" type="button" onClick={() => router.push("/dashboard/manual-entry/customer-profiling")}>
          <ArrowLeft size={15} /> Back to Profiles
        </button>
        <div className="customer-profile-alert error">
          <AlertTriangle size={18} />
          <span>{alert.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-profiling-page customer-portfolio-page">
      <button className="customer-portfolio-back" type="button" onClick={() => router.push("/dashboard/manual-entry/customer-profiling")}>
        <ArrowLeft size={15} /> Back to Profiles
      </button>

      {alert ? (
        <div className={`customer-profile-alert ${alert.type}`}>
          {alert.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{alert.message}</span>
        </div>
      ) : null}

      <div className="customer-portfolio-layout">
        <aside className="customer-portfolio-sidebar">
          <div className="customer-portfolio-title-row">
            <div className="customer-portfolio-avatar"><UserRound size={22} /></div>
            <div>
              <h1>{profile.name || "Unnamed Customer"}</h1>
              <span className={`customer-portfolio-pill ${profile.status === "Converted" ? "success" : profile.status === "Lost" ? "danger" : ""}`}>
                {profile.status || "New Lead"}
              </span>
            </div>
          </div>

          <div className="customer-portfolio-actions">
            <button type="button" onClick={callCustomer}><Phone size={15} /> Call</button>
            <button type="button" onClick={whatsappCustomer}><MessageSquare size={15} /> WhatsApp</button>
          </div>

          <ProfileMeta label="Mobile Number" value={profile.phone} />
          <ProfileMeta label="Contact Person Name" value={profile.contactPersonName || profile.name} />
          <ProfileMeta label="Email Address" value={profile.email} />
          <ProfileMeta label="Address" value={[profile.address, profile.city, profile.state].filter(Boolean).join(", ")} />
          <ProfileMeta label="Assigned Agent" value={profile.assignedTo || profile.createdBy} />
          <ProfileMeta label="Customer Type" value={profile.customerType} />
          <ProfileMeta label="Reference Source" value={profile.referenceSource} />

          <div className="customer-portfolio-divider" />

          <ProfileMeta label="Total Companies" value={viewModel.companies.length} strong />
          <ProfileMeta label="Total Premium Potential" value={formatMoney(viewModel.totalPremium)} strong />
          <ProfileMeta label="Total Sum Insured" value={formatMoney(viewModel.totalSumInsured)} strong />
          <ProfileMeta label="Total Policy Interests" value={`${viewModel.policies.length} (${viewModel.dueCount} due)`} />
        </aside>

        <main className="customer-portfolio-main">
          <section className="customer-portfolio-card">
            <h2>Associated Companies</h2>
            <div className="customer-portfolio-chip-row">
              {viewModel.companies.length ? viewModel.companies.map((company) => (
                <span key={company}>{company}</span>
              )) : <p className="customer-portfolio-empty">No associated company captured.</p>}
            </div>
          </section>

          <section className="customer-portfolio-card">
            <h2>Associated Policy Interests</h2>
            <div className="customer-portfolio-table-wrap">
              <table className="customer-portfolio-table">
                <thead>
                  <tr>
                    <th>Policy / Lead Ref</th>
                    <th>Company Name</th>
                    <th>Policy Type</th>
                    <th>Premium</th>
                    <th>Sum Insured</th>
                    <th>Renewal / Follow-up</th>
                    <th>Days Left</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModel.policies.length ? viewModel.policies.map((policy) => (
                    <tr key={policy.id}>
                      <td>{policy.policyNumber || "-"}</td>
                      <td>{policy.company || "-"}</td>
                      <td>{policy.policyType || "-"}</td>
                      <td>{formatMoney(policy.premium)}</td>
                      <td>{formatMoney(policy.sumInsured)}</td>
                      <td>{formatDate(policy.renewalDate || profile.nextFollowUpDate)}</td>
                      <td>{formatDaysLeft(policy.renewalDate || profile.nextFollowUpDate)}</td>
                      <td><span className={`customer-portfolio-pill ${profile.status === "Converted" ? "success" : profile.status === "Lost" ? "danger" : ""}`}>{profile.status || "-"}</span></td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="customer-portfolio-empty-cell">No policy interests captured.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="customer-portfolio-card">
            <h2>Update Follow-up</h2>
            <div className="customer-portfolio-update-grid">
              <label>
                <span>Status</span>
                <select value={followUpForm.status} onChange={(event) => setFollowUpForm((current) => ({ ...current, status: event.target.value }))}>
                  {PROFILE_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label>
                <span>Outcome</span>
                <select value={followUpForm.outcome} onChange={(event) => setFollowUpForm((current) => ({ ...current, outcome: event.target.value }))}>
                  {FOLLOW_UP_OUTCOMES.map((outcome) => <option key={outcome} value={outcome}>{outcome || "Select outcome"}</option>)}
                </select>
              </label>
              <label>
                <span>Next Follow-up Date</span>
                <input type="date" value={followUpForm.nextFollowUpDate} onChange={(event) => setFollowUpForm((current) => ({ ...current, nextFollowUpDate: event.target.value }))} />
              </label>
              <label>
                <span>Interested Policy Type</span>
                <select value={followUpForm.policyInterest} onChange={(event) => updatePolicyInterest(event.target.value)}>
                  <option value="">Select policy type</option>
                  {LOB_OPTIONS.map((lob) => <option key={lob} value={lob}>{lob}</option>)}
                </select>
              </label>
              {followUpForm.policyInterest ? (
                <div className="customer-portfolio-policy-fields">
                  {(LOB_FIELDS[followUpForm.policyInterest] || LOB_FIELDS.Other).map(([key, label, type]) => (
                    <label key={key}>
                      <span>{label}</span>
                      <input
                        type={type || "text"}
                        value={followUpForm.policyDetails?.[key] || ""}
                        onChange={(event) => updatePolicyDetail(key, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              ) : null}
              <label className="wide">
                <span>Remark</span>
                <textarea value={followUpForm.remark} onChange={(event) => setFollowUpForm((current) => ({ ...current, remark: event.target.value }))} placeholder="Add latest conversation note..." />
              </label>
            </div>
            <div className="customer-portfolio-save-row">
              <button type="button" className="secondary" onClick={openConvertModal} disabled={isPending}>Convert Lead</button>
              <button type="button" onClick={saveFollowUp} disabled={isPending}>{isPending ? "Saving..." : "Save Follow-up"}</button>
            </div>
          </section>

          <section className="customer-portfolio-card">
            <h2>Follow-up Timeline & Remarks</h2>
            {viewModel.timeline.length ? (
              <div className="customer-portfolio-timeline">
                {viewModel.timeline.map((item) => (
                  <div key={item.id} className="customer-portfolio-timeline-item">
                    <div>
                      <strong>{item.title}</strong>
                      <span>{formatDateTime(item.createdAt)}</span>
                    </div>
                    <p>{item.remark}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="customer-portfolio-empty">No comments or timeline logs recorded.</p>
            )}
          </section>
        </main>
      </div>

      {typeof document !== "undefined" && conversionModal && createPortal(
        <div className="tb-modal-backdrop" onClick={() => setConversionModal(null)}>
          <div className="tb-modal-card customer-portfolio-convert-modal" onClick={(event) => event.stopPropagation()}>
            <div className="customer-portfolio-modal-head">
              <h3>{conversionModal.step === "remark" ? "Convert Lead" : "Share Converted Lead"}</h3>
              <button type="button" onClick={() => setConversionModal(null)} aria-label="Close"><X size={18} /></button>
            </div>
            {conversionModal.step === "remark" ? (
              <>
                <div className="customer-portfolio-modal-body">
                  <p>Enter the agent handoff remark before converting this customer for <strong>{followUpForm.policyInterest}</strong>.</p>
                  <textarea
                    value={conversionModal.agentRemark}
                    onChange={(event) => setConversionModal((current) => ({ ...current, agentRemark: event.target.value, error: "" }))}
                    placeholder="Mention what the agent needs to do next..."
                  />
                  {conversionModal.error ? <p className="customer-portfolio-modal-error">{conversionModal.error}</p> : null}
                </div>
                <div className="customer-portfolio-modal-actions">
                  <button type="button" onClick={() => setConversionModal(null)}>Cancel</button>
                  <button type="button" className="primary" onClick={submitConversion} disabled={isPending}>{isPending ? "Converting..." : "Convert"}</button>
                </div>
              </>
            ) : (
              <>
                <div className="customer-portfolio-modal-body">
                  <textarea readOnly value={conversionMessage()} />
                </div>
                <div className="customer-portfolio-modal-actions split">
                  <button type="button" onClick={printConversion}><Printer size={15} /> Print</button>
                  <button type="button" onClick={sendConversionWhatsApp}><Send size={15} /> Send Message</button>
                  <button type="button" className="primary" onClick={() => setConversionModal(null)}>Done</button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function ProfileMeta({ label, value, strong = false }) {
  return (
    <div className="customer-portfolio-meta">
      <span>{label}</span>
      <strong className={strong ? "strong" : ""}>{value || "-"}</strong>
    </div>
  );
}

function buildProfileView(profile) {
  if (!profile) return { companies: [], policies: [], timeline: [], totalPremium: 0, totalSumInsured: 0, dueCount: 0 };

  const selectedLOBs = profile.selectedLOBs || [];
  const lobDetails = profile.lobDetails || {};
  const companies = unique([
    profile.sourceCompany,
    profile.businessType,
    ...selectedLOBs.map((lob) => lobDetails[lob]?.companyName || lobDetails[lob]?.insuranceCompany)
  ]);

  const policies = selectedLOBs.map((lob, index) => {
    const details = lobDetails[lob] || {};
    const premium = numberFrom(details.premium || details.expectedPremium || details.estimatedValue);
    const sumInsured = numberFrom(details.sumInsured || details.sumInsuredNeed || details.stockValue || details.propertyValue || details.assetValue);
    return {
      id: `${lob}-${index}`,
      policyNumber: profile.sourcePolicyNumber || details.policyNumber || `Lead-${index + 1}`,
      company: profile.sourceCompany || details.companyName || details.insuranceCompany || profile.name,
      policyType: profile.sourcePolicyType || lob,
      premium,
      sumInsured,
      renewalDate: details.renewalDate || details.travelDate || profile.nextFollowUpDate
    };
  });

  if (!policies.length && (profile.sourcePolicyNumber || profile.sourcePolicyType || profile.sourceCompany)) {
    policies.push({
      id: "source-policy",
      policyNumber: profile.sourcePolicyNumber,
      company: profile.sourceCompany || profile.name,
      policyType: profile.sourcePolicyType || "Policy Interest",
      premium: 0,
      sumInsured: 0,
      renewalDate: profile.nextFollowUpDate
    });
  }

  const followUps = Array.isArray(lobDetails.followUps) ? lobDetails.followUps : [];
  const timeline = [
    ...followUps.map((item, index) => ({
      id: item.id || `followup-${index}`,
      title: item.status || item.outcome || "Follow-up",
      remark: formatTimelineRemark(item),
      createdAt: item.createdAt
    })),
    profile.followUpRemark ? {
      id: "latest-followup",
      title: profile.followUpOutcome || "Latest Follow-up",
      remark: profile.followUpRemark,
      createdAt: profile.lastFollowUpDate || profile.updatedAt
    } : null,
    profile.remarks ? {
      id: "general-remarks",
      title: "General Remark",
      remark: profile.remarks,
      createdAt: profile.updatedAt
    } : null
  ].filter(Boolean);

  const totalPremium = policies.reduce((sum, item) => sum + item.premium, 0);
  const totalSumInsured = policies.reduce((sum, item) => sum + item.sumInsured, 0);
  const dueCount = policies.filter((item) => item.renewalDate && new Date(item.renewalDate) <= new Date()).length;

  return {
    companies: companies.length ? companies : unique([profile.name]),
    policies,
    timeline,
    totalPremium,
    totalSumInsured,
    dueCount
  };
}

function formatTimelineRemark(item = {}) {
  const parts = [];
  if (item.outcome) parts.push(`Outcome: ${item.outcome}`);
  if (item.status) parts.push(`Lead Status: ${item.status}`);
  if (item.policyInterest) parts.push(`Policy Interest: ${item.policyInterest}`);
  const fields = formatPolicyDetails(item.policyInterest, item.policyDetails);
  if (fields) parts.push(fields.replace(/\n/g, " "));
  if (item.nextFollowUpDate) parts.push(`Next Follow-up Date: ${formatDate(item.nextFollowUpDate)}`);
  if (item.rawRemark || item.remark) parts.push(`Remark: ${item.rawRemark || item.remark}`);
  return parts.join(" ") || "-";
}

function formatPolicyDetails(policyType, details = {}) {
  if (!policyType || !details) return "";
  const fields = LOB_FIELDS[policyType] || LOB_FIELDS.Other;
  return fields
    .map(([key, label, type]) => {
      const value = details[key];
      if (!value) return "";
      return `${label}: ${type === "date" ? formatDate(value) : value}`;
    })
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean).map((item) => String(item).trim()).filter(Boolean)));
}

function numberFrom(value) {
  const num = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function toInputDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function formatMoney(value) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(num);
}

function formatDaysLeft(value) {
  if (!value) return "-";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "-";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (days < 0) return `${days} days`;
  if (days === 0) return "Today";
  return `${days} days`;
}
