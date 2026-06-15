"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AlertTriangle, ArrowLeft, CheckCircle, MessageSquare, Phone, UserRound, X } from "lucide-react";

const PROFILE_STATUS = ["New Lead", "Follow-up Required", "Interested", "Not Interested", "Converted", "Lost"];
const FOLLOW_UP_OUTCOMES = ["Interested", "Call Back Later", "Not Interested", "Converted", "Wrong Number", "Not Reachable"];
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
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [remarkForm, setRemarkForm] = useState({
    status: "New Lead",
    outcome: "Call Back Later",
    nextFollowUpDate: "",
    policyInterest: "",
    policyDetails: {},
    remark: ""
  });
  const [timelineFilters, setTimelineFilters] = useState({ q: "", status: "", policy: "", date: "" });
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
    });
  }, [profileId]);

  const viewModel = useMemo(() => buildProfileView(profile), [profile]);
  const timelinePolicyOptions = useMemo(() => unique(viewModel.timeline.map((item) => item.policyInterest)), [viewModel.timeline]);
  const filteredTimeline = useMemo(() => (
    viewModel.timeline.filter((item) => {
      const searchText = [item.createdBy, item.title, item.remark, item.policyInterest, item.policyLabel, item.statusBadge].filter(Boolean).join(" ").toLowerCase();
      const matchesQuery = !timelineFilters.q || searchText.includes(timelineFilters.q.toLowerCase());
      const matchesStatus = !timelineFilters.status || item.tone === timelineFilters.status;
      const matchesPolicy = !timelineFilters.policy || item.policyInterest === timelineFilters.policy;
      const matchesDate = !timelineFilters.date || toInputDate(item.createdAt) === timelineFilters.date;
      return matchesQuery && matchesStatus && matchesPolicy && matchesDate;
    })
  ), [viewModel.timeline, timelineFilters]);

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

  function openRemarkModal(policy) {
    const policyInterest = normalizePolicyInterest(policy?.lob || policy?.policyType || profile.selectedLOBs?.[0] || profile.sourcePolicyType);
    setRemarkForm({
      status: profile.status || "New Lead",
      outcome: profile.followUpOutcome || "Call Back Later",
      nextFollowUpDate: profile.nextFollowUpDate ? new Date(profile.nextFollowUpDate).toISOString().slice(0, 10) : "",
      policyInterest,
      policyDetails: policyInterest ? (profile.lobDetails?.[policyInterest] || {}) : {},
      remark: ""
    });
    setRemarkModalOpen(true);
  }

  function updateRemarkPolicyInterest(value) {
    setRemarkForm((current) => ({
      ...current,
      policyInterest: value,
      policyDetails: value ? (profile?.lobDetails?.[value] || {}) : {}
    }));
  }

  function updateRemarkPolicyDetail(key, value) {
    setRemarkForm((current) => ({
      ...current,
      policyDetails: {
        ...(current.policyDetails || {}),
        [key]: value
      }
    }));
  }

  async function saveRemark({ convert = false } = {}) {
    const text = remarkForm.remark.trim();
    if (!text) {
      setAlert({ type: "error", message: "Remark is required." });
      return null;
    }
    if (!remarkForm.policyInterest) {
      setAlert({ type: "error", message: "Select interested policy type." });
      return null;
    }

    const now = new Date().toISOString();
    const selectedLOBs = unique([...(profile.selectedLOBs || []), remarkForm.policyInterest]);
    const entry = {
      id: `${Date.now()}`,
      remark: text,
      rawRemark: text,
      outcome: convert ? "Converted" : remarkForm.outcome,
      mode: "Customer Profiling",
      priority: "Normal",
      nextFollowUpDate: remarkForm.nextFollowUpDate,
      policyInterest: remarkForm.policyInterest,
      policyDetails: remarkForm.policyDetails || {},
      status: convert ? "Converted" : remarkForm.status,
      createdAt: now,
      createdBy: profile.assignedTo || profile.createdBy || "Agent"
    };
    const payload = {
      ...profile,
      selectedLOBs,
      status: convert ? "Converted" : remarkForm.status,
      followUpOutcome: convert ? "Converted" : remarkForm.outcome,
      followUpRemark: text,
      lastFollowUpDate: now,
      nextFollowUpDate: remarkForm.nextFollowUpDate || null,
      lobDetails: {
        ...(profile.lobDetails || {}),
        [remarkForm.policyInterest]: remarkForm.policyDetails || {},
        followUps: [entry, ...(Array.isArray(profile.lobDetails?.followUps) ? profile.lobDetails.followUps : [])]
      }
    };

    const response = await fetch(`/api/customer-profiles/${profile.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const updated = await response.json().catch(() => ({}));
    if (!response.ok) {
      setAlert({ type: "error", message: updated.error || "Customer profile remark could not be saved." });
      return null;
    }
    setProfile(updated);
    return updated;
  }

  function submitRemark() {
    startTransition(async () => {
      const updated = await saveRemark();
      if (!updated) return;
      setRemarkModalOpen(false);
      setAlert({ type: "success", message: "Follow-up remark saved." });
    });
  }

  function convertFromRemarkModal() {
    startTransition(async () => {
      const updated = await saveRemark({ convert: true });
      if (!updated) return;
      const response = await fetch(`/api/customer-profiles/${profile.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insuranceType: remarkForm.policyInterest })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAlert({ type: "error", message: payload.error || "Customer profile could not be converted." });
        return;
      }
      setRemarkModalOpen(false);
      setAlert({ type: "success", message: "Customer converted. You can share or print from the converted customer workflow." });
    });
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
              <span className={`customer-portfolio-pill ${getStatusTone(profile.status)}`}>
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
                <span key={company} className="company-theme-chip">{company}</span>
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
                    <th>Actions</th>
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
                      <td><span className={`customer-portfolio-pill ${getStatusTone(profile.status)}`}>{profile.status || "-"}</span></td>
                      <td><button type="button" className="customer-portfolio-table-action" onClick={() => openRemarkModal(policy)}>Add Remark</button></td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={9} className="customer-portfolio-empty-cell">No policy interests captured.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="customer-portfolio-card">
            <h2>Follow-up Timeline & Remarks</h2>
            {viewModel.timeline.length ? (
              <>
                <div className="customer-portfolio-timeline-filters">
                  <input value={timelineFilters.q} placeholder="Search remarks" onChange={(event) => setTimelineFilters((current) => ({ ...current, q: event.target.value }))} />
                  <select value={timelineFilters.status} onChange={(event) => setTimelineFilters((current) => ({ ...current, status: event.target.value }))}>
                    <option value="">All Status</option>
                    <option value="info">New / Interested</option>
                    <option value="warning">Follow-up</option>
                    <option value="success">Converted / Active</option>
                    <option value="danger">Lost / Not Interested</option>
                    <option value="neutral">General</option>
                  </select>
                  <select value={timelineFilters.policy} onChange={(event) => setTimelineFilters((current) => ({ ...current, policy: event.target.value }))}>
                    <option value="">All Policy Types</option>
                    {timelinePolicyOptions.map((policy) => <option key={policy} value={policy}>{policy}</option>)}
                  </select>
                  <input type="date" value={timelineFilters.date} onChange={(event) => setTimelineFilters((current) => ({ ...current, date: event.target.value }))} />
                </div>
                {filteredTimeline.length ? (
                  <div className="customer-portfolio-timeline-scroll">
                    <div className="customer-portfolio-timeline">
                      {filteredTimeline.map((item) => (
                        <div key={item.id} className="customer-portfolio-timeline-item">
                          <div className="customer-portfolio-timeline-dot" />
                          <div className="customer-portfolio-timeline-content">
                            <div className="customer-portfolio-timeline-head">
                              <strong>{item.createdBy || item.title}</strong>
                              <span>{formatDateTime(item.createdAt)}</span>
                            </div>
                            <div className="customer-portfolio-timeline-body">
                              {item.policyLabel ? <small>{item.policyLabel}</small> : null}
                              <p>{item.remark}</p>
                              {item.nextFollowUpDate ? <em>Next Follow-Up scheduled for: {formatDate(item.nextFollowUpDate)} via {item.mode || "Call"}</em> : null}
                              {item.statusBadge ? <b className={`tone-${item.tone}`}>{item.statusBadge}</b> : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="customer-portfolio-empty timeline-filter-empty">No timeline records match selected filters.</p>
                )}
              </>
            ) : (
              <p className="customer-portfolio-empty">No comments or timeline logs recorded.</p>
            )}
          </section>
        </main>
      </div>

      {typeof window !== "undefined" && remarkModalOpen && createPortal(
        <div className="tb-modal-backdrop customer-profile-remark-backdrop" onClick={() => setRemarkModalOpen(false)}>
          <div className="customer-profile-remark-card" onClick={(event) => event.stopPropagation()}>
            <div className="customer-profile-remark-head">
              <h3>Add Follow-up Remark</h3>
              <button type="button" onClick={() => setRemarkModalOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="customer-profile-remark-body">
              <div className="customer-profile-remark-grid">
                <label>
                  <span>Status</span>
                  <select value={remarkForm.status} onChange={(event) => setRemarkForm((current) => ({ ...current, status: event.target.value }))}>
                    {PROFILE_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <label>
                  <span>Outcome</span>
                  <select value={remarkForm.outcome} onChange={(event) => setRemarkForm((current) => ({ ...current, outcome: event.target.value }))}>
                    {FOLLOW_UP_OUTCOMES.map((outcome) => <option key={outcome} value={outcome}>{outcome}</option>)}
                  </select>
                </label>
                <label>
                  <span>Next Follow-up Date</span>
                  <input type="date" value={remarkForm.nextFollowUpDate} onChange={(event) => setRemarkForm((current) => ({ ...current, nextFollowUpDate: event.target.value }))} />
                </label>
                <label>
                  <span>Interested Policy Type</span>
                  <select value={remarkForm.policyInterest} onChange={(event) => updateRemarkPolicyInterest(event.target.value)}>
                    <option value="">Select policy type</option>
                    {LOB_OPTIONS.map((lob) => <option key={lob} value={lob}>{lob}</option>)}
                  </select>
                </label>
              </div>

              {remarkForm.policyInterest ? (
                <div className="customer-profile-remark-policy-grid">
                  {(LOB_FIELDS[remarkForm.policyInterest] || LOB_FIELDS.Other).map(([key, label, type]) => (
                    <label key={key}>
                      <span>{label}</span>
                      <input
                        type={type || "text"}
                        value={remarkForm.policyDetails?.[key] || ""}
                        onChange={(event) => updateRemarkPolicyDetail(key, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              ) : null}

              <label className="customer-profile-remark-textarea">
                <span>Remark Text *</span>
                <textarea value={remarkForm.remark} onChange={(event) => setRemarkForm((current) => ({ ...current, remark: event.target.value }))} placeholder="Enter details of conversation..." />
              </label>
            </div>

            <div className="customer-profile-remark-footer">
              <button type="button" onClick={() => setRemarkModalOpen(false)}>Cancel</button>
              <button type="button" onClick={convertFromRemarkModal} disabled={isPending}>Convert Lead</button>
              <button type="button" className="primary" onClick={submitRemark} disabled={isPending}>{isPending ? "Saving..." : "Save Remark"}</button>
            </div>
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
      lob,
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
  const hasLatestFollowUpLog = followUps.some((item) => (
    (item.rawRemark || item.remark || "") === profile.followUpRemark
    && (!profile.lastFollowUpDate || item.createdAt === profile.lastFollowUpDate)
  ));
  const timeline = [
    ...followUps.map((item, index) => ({
      id: item.id || `followup-${index}`,
      title: item.status || item.outcome || "Follow-up",
      remark: formatTimelineRemark(item),
      createdAt: item.createdAt,
      createdBy: item.createdBy,
      mode: item.mode,
      nextFollowUpDate: item.nextFollowUpDate,
      policyLabel: item.policyInterest ? `POLICY: ${item.policyInterest}${profile.sourcePolicyNumber ? ` (${profile.sourcePolicyNumber})` : ""}` : "",
      statusBadge: item.status ? `${profile.status || item.status} -> ${item.status}` : "",
      tone: getStatusTone(item.status || item.outcome)
    })),
    profile.followUpRemark && !hasLatestFollowUpLog ? {
      id: "latest-followup",
      title: profile.followUpOutcome || "Latest Follow-up",
      remark: profile.followUpRemark,
      createdAt: profile.lastFollowUpDate || profile.updatedAt,
      createdBy: profile.assignedTo || profile.createdBy || "Agent",
      policyLabel: profile.sourcePolicyType ? `POLICY: ${profile.sourcePolicyType}${profile.sourcePolicyNumber ? ` (${profile.sourcePolicyNumber})` : ""}` : "",
      statusBadge: profile.status ? `${profile.status} -> ${profile.status}` : "",
      tone: getStatusTone(profile.status)
    } : null,
    profile.remarks ? {
      id: "general-remarks",
      title: "General Remark",
      remark: profile.remarks,
      createdAt: profile.updatedAt,
      createdBy: profile.assignedTo || profile.createdBy || "Agent",
      policyLabel: profile.sourcePolicyType ? `POLICY: ${profile.sourcePolicyType}${profile.sourcePolicyNumber ? ` (${profile.sourcePolicyNumber})` : ""}` : "",
      tone: "neutral"
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

function normalizePolicyInterest(value = "") {
  if (!value) return "";
  const direct = LOB_OPTIONS.find((lob) => lob.toLowerCase() === String(value).toLowerCase());
  if (direct) return direct;
  const loose = LOB_OPTIONS.find((lob) => lob.toLowerCase().includes(String(value).toLowerCase()));
  return loose || value;
}

function getStatusTone(value = "") {
  const status = String(value).toLowerCase();
  if (status.includes("renew") || status.includes("convert") || status.includes("active")) return "success";
  if (status.includes("lost") || status.includes("wrong") || status.includes("not interested") || status.includes("expired") || status.includes("overdue")) return "danger";
  if (status.includes("follow") || status.includes("call") || status.includes("due")) return "warning";
  if (status.includes("new") || status.includes("interest")) return "info";
  return "neutral";
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean).map((item) => String(item).trim()).filter(Boolean)));
}

function numberFrom(value) {
  const num = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
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

function toInputDate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}
