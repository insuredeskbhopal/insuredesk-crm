"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle, MessageSquare, Phone, UserRound } from "lucide-react";

const PROFILE_STATUS = ["New Lead", "Follow-up Required", "Interested", "Not Interested", "Converted", "Lost"];
const FOLLOW_UP_OUTCOMES = ["", "Interested", "Call Back Later", "Not Interested", "Converted", "Wrong Number", "Not Reachable"];

export default function CustomerProfileDetailPage({ params }) {
  const router = useRouter();
  const [profileId, setProfileId] = useState("");
  const [profile, setProfile] = useState(null);
  const [followUpForm, setFollowUpForm] = useState({ status: "Follow-up Required", outcome: "", nextFollowUpDate: "", remark: "" });
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
      setFollowUpForm({
        status: payload.status || "Follow-up Required",
        outcome: payload.followUpOutcome || "",
        nextFollowUpDate: toInputDate(payload.nextFollowUpDate || payload.followUpDate),
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
    const now = new Date().toISOString();
    const existingFollowUps = Array.isArray(profile.lobDetails?.followUps) ? profile.lobDetails.followUps : [];
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
            nextFollowUpDate: followUpForm.nextFollowUpDate
          },
          ...existingFollowUps
        ]
      : existingFollowUps;

    const payload = {
      ...profile,
      status: followUpForm.status,
      followUpOutcome: followUpForm.outcome,
      followUpRemark: followUpForm.remark.trim() || profile.followUpRemark || "",
      lastFollowUpDate: now,
      nextFollowUpDate: followUpForm.nextFollowUpDate || null,
      lobDetails: {
        ...(profile.lobDetails || {}),
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
              <label className="wide">
                <span>Remark</span>
                <textarea value={followUpForm.remark} onChange={(event) => setFollowUpForm((current) => ({ ...current, remark: event.target.value }))} placeholder="Add latest conversation note..." />
              </label>
            </div>
            <div className="customer-portfolio-save-row">
              <button type="button" onClick={saveFollowUp} disabled={isPending}>{isPending ? "Saving..." : "Save Follow-up"}</button>
            </div>
          </section>
        </main>
      </div>
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
      remark: item.rawRemark || item.remark || "-",
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
