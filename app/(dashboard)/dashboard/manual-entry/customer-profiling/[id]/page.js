"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle } from "lucide-react";
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
  const canConvert = useMemo(() => {
    return Boolean(form?.name && form?.phone && form?.assignedTo && form?.remarks && selectedTypes.length && convertType);
  }, [form, selectedTypes.length, convertType]);

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

  function convertAndUpload() {
    if (!canConvert) {
      setAlert({ type: "error", message: "Select policy type and complete name, phone, assigned to, remark, and LOB before conversion." });
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/customer-profiles/${profileId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insuranceType: convertType })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAlert({ type: "error", message: payload.error || "Conversion could not be started." });
        return;
      }
      router.push(payload.redirectUrl || `/bulk-upload?profileId=${profileId}`);
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
        <button className="secondary-action" type="button" onClick={convertAndUpload} disabled={isPending}>Converted - Upload Policy</button>
        <button type="button" onClick={() => router.push("/dashboard/manual-entry/customer-profiling")}>Back</button>
      </section>
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
